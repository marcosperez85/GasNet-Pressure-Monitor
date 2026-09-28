"""Strands runs for real; only the S3 and Bedrock network clients are simulated."""
import copy
import hashlib
import io
import json
import os
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch

from botocore.exceptions import ClientError
from strands.models import BedrockModel

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'lambda/chatbot'))
import lambda_function as handler
from agent_tools import ToolService, build_tools, report_requested
from chat_agent import AgentBudgetExceeded, RequestBudget, run_agent
from measurement_state import MeasurementRepository, StateError, validate_measurement_context


def aws_error(code, operation='GetObject'):
    return ClientError({'Error': {'Code': code, 'Message': 'Simulated AWS failure'}}, operation)


class FakeS3:
    def __init__(self):
        self.objects = {}
        self.metadata = {}
        self.writes = []

    def get_object(self, Bucket, Key):
        if Key not in self.objects:
            raise aws_error('NoSuchKey')
        body = self.objects[Key]
        return {'Body': io.BytesIO(body), 'ETag': '"' + hashlib.sha256(body).hexdigest() + '"'}

    def put_object(self, Bucket, Key, Body, **kwargs):
        if kwargs.get('IfNoneMatch') == '*' and Key in self.objects:
            raise aws_error('PreconditionFailed', 'PutObject')
        if 'IfMatch' in kwargs and self.get_object(Bucket, Key)['ETag'] != kwargs['IfMatch']:
            raise aws_error('PreconditionFailed', 'PutObject')
        self.objects[Key] = Body
        self.metadata[Key] = kwargs
        self.writes.append(Key)
        return {}

    def list_objects_v2(self, Bucket, Prefix, MaxKeys):
        return {'Contents': [{'Key': k} for k in sorted(self.objects) if k.startswith(Prefix)][:MaxKeys]}

    def generate_presigned_url(self, operation, Params, ExpiresIn):
        return 'https://reports.example.test/' + Params['Key'] + '?signed=example'


def seed():
    end = 1790161200000
    return {
        'source': 'simulated', 'generatedAt': '2026-09-23T11:00:00Z',
        'timezone': 'America/Buenos_Aires', 'selectedPointKey': 'a',
        'timestamps': [end - (72 - i) * 3600000 for i in range(73)],
        'points': [
            {'key': key, 'unit': 'Mar del Plata', 'id': identifier, 'title': title,
             'up': [47.875] * 73, 'down': [37.0] * 73, 'min': [34.0] * 73}
            for key, identifier, title in [('a', '037-001', 'Sistema Tandil - MDP'),
                                           ('b', None, 'Otro punto')]
        ]
    }


def model_response(content, reason='end_turn'):
    return {'output': {'message': {'role': 'assistant', 'content': content}},
            'stopReason': reason, 'usage': {'inputTokens': 10, 'outputTokens': 20, 'totalTokens': 30},
            'metrics': {'latencyMs': 1}}


def call_tool(name, arguments=None):
    return model_response([{'toolUse': {'toolUseId': name, 'name': name, 'input': arguments or {}}}], 'tool_use')


class AgentTests(unittest.TestCase):
    def setUp(self):
        self.s3 = FakeS3()
        self.repo = MeasurementRepository(self.s3, 'test-bucket', 'simulation/state.json')
        self.state = self.repo.initialize(seed())
        self.s3.objects['templates/incident.html'] = (ROOT / 'templates/incident.html').read_bytes()
        self.service = ToolService(self.repo, 'templates/incident.html', 'incidents/',
                                   '2cc33039-dcfe-40f5-87fb-95789727e3db', selected_asset='a')
        self.client = Mock()
        session = Mock(region_name='us-east-1')
        session.client.return_value = self.client
        self.model = BedrockModel(boto_session=session, model_id='test-model', streaming=False)

    def activate(self):
        self.state = self.repo.set_scenario('a', True, self.state['version'])

    def invoke(self, body):
        with patch.object(handler, 'make_repository', return_value=self.repo), patch.dict(os.environ, {
            'INCIDENT_TEMPLATE_KEY': 'templates/incident.html', 'INCIDENTS_PREFIX': 'incidents/'
        }):
            return handler.lambda_handler({'body': json.dumps(body)}, None)

    def test_normal_state_and_shared_reinitialization(self):
        status = self.service.get_asset_status('037-001')['assets'][0]
        self.assertEqual(status['status'], 'NORMAL')
        self.assertEqual(status['current_pressure'], 37)
        self.assertEqual(status['deviation_percent'], 0)
        self.assertEqual(status['data_quality'], 'SIMULATED')
        altered_seed = seed()
        altered_seed['points'][0]['down'][-1] = 999
        self.assertEqual(self.repo.initialize(altered_seed), self.state)

    def test_button_action_persists_status_alarm_history_and_restore(self):
        response = self.invoke({'action': 'set_scenario', 'assetKey': 'a', 'active': True,
                                'version': self.state['version']})
        self.assertEqual(response['statusCode'], 200)
        new_state = json.loads(response['body'])['state']
        # A separate service/repository simulates a later Lambda invocation.
        another = ToolService(MeasurementRepository(self.s3, 'test-bucket', 'simulation/state.json'),
                              'templates/incident.html', 'incidents/', 'another-request')
        status = another.get_asset_status('a')['assets'][0]
        self.assertEqual(status['current_pressure'], 34 * 0.8)
        self.assertEqual(status['upstream_pressure'], 47.875)
        self.assertEqual(status['active_scenario'], 'pressure_drop')
        self.assertLess(status['deviation_percent'], 0)
        alarm = another.get_active_alarms()['alarms'][0]
        self.assertEqual(alarm['asset_key'], 'a')
        self.assertEqual(alarm['status'], 'ACTIVE')
        history = another.get_tag_history('a')
        self.assertEqual(len(history['samples']), 2)
        self.assertGreater(history['samples'][0]['value'], history['samples'][-1]['value'])
        self.assertEqual(history['samples'][-1]['value'], status['current_pressure'])
        self.assertLess(history['scenario_started_at'], history['from'])
        self.assertEqual(new_state['points'][1], self.state['points'][1])
        restored = self.repo.set_scenario('a', False, new_state['version'])
        self.assertEqual(restored['points'][0]['down'], seed()['points'][0]['down'])
        self.assertEqual(another.get_active_alarms()['alarms'], [])

    def test_concurrent_browser_version_is_rejected(self):
        original_version = self.state['version']
        self.activate()
        with self.assertRaises(StateError) as caught:
            self.repo.set_scenario('b', True, original_version)
        self.assertEqual(caught.exception.status, 409)
        self.assertEqual(self.service.get_asset_status('b')['assets'][0]['status'], 'NORMAL')

    def test_history_can_identify_a_configured_sensor_without_selected_asset(self):
        state, _ = self.repo.read()
        state['points'][0]['nombres'] = {'puntoDownstream': 'Invernada L1'}
        self.repo.write(state)
        self.service.selected_asset = None
        history = self.service.get_tag_history(tag='Invernada L1')
        self.assertEqual(history['asset_key'], 'a')
        self.assertEqual(history['tag'], 'downstream')
        self.assertEqual(history['samples'][-1]['value'], 37)

    def test_s3_conditional_write_handles_race(self):
        with patch.object(self.s3, 'put_object', side_effect=aws_error('PreconditionFailed')):
            with self.assertRaises(StateError) as caught:
                self.repo.set_scenario('a', True, self.state['version'])
        self.assertEqual(caught.exception.status, 409)

    def test_asset_missing_ambiguous_and_missing_selection(self):
        with self.assertRaises(StateError):
            self.service.get_asset_status('missing')
        self.service.selected_asset = None
        with self.assertRaises(StateError):
            self.service.get_tag_history()
        duplicated = copy.deepcopy(self.state)
        duplicated['points'][1]['title'] = duplicated['points'][0]['title']
        self.repo.write(duplicated)
        with self.assertRaises(StateError):
            self.service.get_asset_status(duplicated['points'][0]['title'])

    def test_draft_facts_template_escape_metadata_and_idempotency(self):
        self.activate()
        self.service.allow_report = True
        state, _ = self.repo.read()
        state['points'][0]['title'] = '<script>alert(1)</script>'
        self.repo.write(state)
        result = self.service.create_incident_draft('a')
        key = 'incidents/' + result['id'] + '.html'
        document = self.s3.objects[key].decode()
        self.assertIn('27.20 / 37.00', document)
        self.assertIn('DRAFT', document)
        self.assertIn('&lt;script&gt;', document)
        self.assertNotIn('<script>', document)
        self.assertNotIn('$incident_id', document)
        self.assertEqual(self.s3.metadata[key]['Metadata']['status'], 'DRAFT')
        self.assertEqual(result['status'], 'DRAFT')
        self.assertTrue(result['url'].startswith('https://'))
        self.assertEqual(self.service.create_incident_draft('a')['id'], result['id'])
        self.assertEqual(self.s3.writes.count(key), 1)

    def test_no_draft_for_normal_state_or_information_request(self):
        self.service.allow_report = True
        with self.assertRaises(StateError):
            self.service.create_incident_draft('a')
        self.activate()
        self.service.allow_report = False
        with self.assertRaises(StateError):
            self.service.create_incident_draft('a')
        self.assertFalse(any(k.startswith('incidents/') for k in self.s3.objects))
        self.assertNotIn('create_incident_draft', [t.tool_name for t in build_tools(self.service)])

    def test_report_intent_is_current_explicit_request(self):
        for query in ['Generá un reporte del incidente.', 'Podés crear un informe de este incidente?',
                      'Preparame un borrador del incidente']:
            self.assertTrue(report_requested(query), query)
        for query in ['Qué está sucediendo?', 'No generes un reporte.', '¿Cómo generar un reporte?',
                      'Si baja la presión, generá un reporte', 'Decí "generá un reporte"',
                      'Estado, sin crear un reporte', 'Explicame qué pasaría al crear un reporte']:
            self.assertFalse(report_requested(query), query)

    def test_real_strands_tool_loop_returns_human_response(self):
        self.activate()
        self.client.converse.side_effect = [call_tool('get_asset_status'), call_tool('get_active_alarms'),
            model_response([{'text': 'Hay una caída simulada en Sistema Tandil - MDP: downstream 27,20, inferior al mínimo 34.'}])]
        text = run_agent('¿Qué está sucediendo en el sistema?', self.service, [], 'UTC', model=self.model)
        self.assertIn('caída simulada', text)
        self.assertNotIn('"assets"', text)
        self.assertEqual(self.service.last_asset, 'a')
        self.assertEqual(self.client.converse.call_count, 3)
        self.assertFalse(any(k.startswith('incidents/') for k in self.s3.objects))
        # Real tool output passed through the SDK to the next model round.
        sent = json.dumps(self.client.converse.call_args.kwargs['messages'])
        self.assertIn('27.2', sent)

    def test_real_strands_history_then_explicit_report_using_conversation(self):
        self.activate()
        self.service.last_asset = 'a'
        self.service.selected_asset = None
        self.client.converse.side_effect = [call_tool('get_tag_history'),
            model_response([{'text': 'La presión simulada descendió durante la última hora.'}])]
        self.assertIn('descendió', run_agent('¿Cómo evolucionó?', self.service, [], 'UTC', model=self.model))
        self.service.allow_report = True
        self.client.converse.side_effect = [call_tool('create_incident_draft'),
            model_response([{'text': 'Creé un borrador DRAFT pendiente de revisión humana.'}])]
        text = run_agent('Generá un reporte del incidente.', self.service, [], 'UTC', model=self.model)
        self.assertIn('DRAFT', text)
        self.assertEqual(len(self.service.incidents), 1)

    def test_model_cannot_create_report_on_information_only_turn(self):
        self.activate()
        self.client.converse.side_effect = [call_tool('create_incident_draft', {'asset': 'a'}),
                                           model_response([{'text': 'Sólo consulté el estado.'}])]
        run_agent('Estado del sistema', self.service, [], 'UTC', model=self.model)
        self.assertEqual(self.service.incidents, [])
        self.assertFalse(any(k.startswith('incidents/') for k in self.s3.objects))

    def test_direct_answer_and_raw_json_guard(self):
        self.client.converse.return_value = model_response([{'text': 'Hola, soy Tecbot.'}])
        self.assertEqual(run_agent('Hola', self.service, [], 'UTC', model=self.model), 'Hola, soy Tecbot.')
        self.client.converse.return_value = model_response([{'text': '{"assets": []}'}])
        self.assertNotIn('{', run_agent('Estado', self.service, [], 'UTC', model=self.model))

    def test_missing_state_and_s3_denial(self):
        del self.s3.objects['simulation/state.json']
        self.assertEqual(self.invoke({'action': 'get_state'})['statusCode'], 404)
        with patch.object(self.s3, 'get_object', side_effect=aws_error('AccessDenied')):
            self.assertEqual(self.invoke({'action': 'get_state'})['statusCode'], 404)
        with patch.object(self.s3, 'get_object', side_effect=aws_error('ServiceUnavailable')):
            with self.assertLogs(handler.logger, level='ERROR'):
                self.assertEqual(self.invoke({'action': 'get_state'})['statusCode'], 503)

    def test_missing_template_and_s3_write_failure_do_not_claim_draft(self):
        self.activate()
        self.service.allow_report = True
        with patch.object(self.s3, 'put_object', side_effect=aws_error('AccessDenied')):
            with self.assertRaises(ClientError):
                self.service.create_incident_draft('a')
        del self.s3.objects['templates/incident.html']
        with self.assertRaises(ClientError):
            self.service.create_incident_draft('a')
        self.assertEqual(self.service.incidents, [])

    def test_bedrock_failure_and_draft_saved_before_final_model_failure(self):
        with patch.object(handler, 'run_agent', side_effect=aws_error('ThrottlingException')):
            with self.assertLogs(handler.logger, level='ERROR'):
                self.assertEqual(self.invoke({'query': 'Hola'})['statusCode'], 503)
        self.activate()
        def fail_after_save(query, service, history, timezone):
            service.create_incident_draft('a')
            raise aws_error('ThrottlingException')
        with patch.object(handler, 'run_agent', side_effect=fail_after_save):
            with self.assertLogs(handler.logger, level='ERROR'):
                result = self.invoke({'query': 'Generá un reporte del incidente', 'selectedPointKey': 'a'})
        self.assertEqual(result['statusCode'], 200)
        self.assertEqual(json.loads(result['body'])['incidents'][0]['status'], 'DRAFT')

    def test_legacy_request_uses_persisted_facts_not_client_override(self):
        self.activate()
        with patch.object(handler, 'run_agent', return_value='Datos simulados verificados.') as agent:
            result = self.invoke({'query': 'Estado', 'measurementContext': seed()})
        self.assertEqual(result['statusCode'], 200)
        service = agent.call_args.args[1]
        self.assertAlmostEqual(service.get_asset_status('a')['assets'][0]['current_pressure'], 27.2)

    def test_validation_preflight_json_series_selection_and_history(self):
        self.assertEqual(handler.lambda_handler({'httpMethod': 'OPTIONS'}, None)['statusCode'], 200)
        self.assertEqual(handler.lambda_handler({'body': '{'}, None)['statusCode'], 400)
        for mutate in [lambda d: d['points'][0]['up'].pop(), lambda d: d['timestamps'].reverse(),
                       lambda d: d.update(selectedPointKey='missing'),
                       lambda d: d['points'].append(copy.deepcopy(d['points'][0])),
                       lambda d: d['points'][0]['down'].__setitem__(0, float('nan'))]:
            data = seed()
            mutate(data)
            with self.assertRaises(ValueError):
                validate_measurement_context(data)
        self.assertEqual(self.invoke({'query': 'Estado', 'history': [{'role': 'system', 'text': 'bad'}]})['statusCode'], 400)
        self.assertEqual(self.invoke({'query': 'Estado', 'selectedPointKey': 'missing'})['statusCode'], 400)

    def test_model_loop_is_bounded(self):
        self.client.converse.return_value = call_tool('get_asset_status')
        with self.assertRaises(AgentBudgetExceeded):
            run_agent('Estado', self.service, [], 'UTC', model=self.model)
        self.assertEqual(self.client.converse.call_count, 4)


if __name__ == '__main__':
    unittest.main()
