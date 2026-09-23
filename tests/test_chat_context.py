"""Pruebas locales del contexto; no invocan AWS."""
import copy
import importlib.util
import io
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import Mock, patch


class ChatContextTests(unittest.TestCase):
    def setUp(self):
        self.boto = Mock()
        self.client = self.boto.client.return_value
        self.client.invoke_model.return_value = {
            'body': io.BytesIO(b'{"content":[{"text":"47.88 (simulado)"}]}')
        }
        path = Path(__file__).resolve().parents[1] / 'lambda/chatbot/lambda_function.py'
        spec = importlib.util.spec_from_file_location('chat_lambda', path)
        self.module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {'boto3': self.boto}):
            spec.loader.exec_module(self.module)
        self.context = {
            'source': 'simulated', 'generatedAt': '2026-09-23T12:00:00Z',
            'timezone': 'America/Buenos_Aires', 'selectedPointKey': 'a',
            'timestamps': [1790157600000, 1790161200000],
            'points': [{'key': 'a', 'unit': 'Mar del Plata', 'id': '037-001',
                        'title': 'Sistema Tandil - MDP', 'up': [46.125, 47.875],
                        'down': [36, 37], 'min': [34, 34]}]
        }

    def request(self, context):
        return self.module.lambda_handler({'body': json.dumps({
            'query': 'Presión de este punto', 'measurementContext': context
        })}, None)

    def test_exact_context_reaches_bedrock(self):
        self.assertEqual(self.request(self.context)['statusCode'], 200)
        payload = json.loads(self.client.invoke_model.call_args.kwargs['body'])
        self.assertEqual(json.loads(payload['messages'][0]['content'])['measurementContext'], self.context)
        self.assertIn('SIMULADAS', payload['system'])

    def test_missing_context_rejected_without_aws_call(self):
        self.assertEqual(self.request(None)['statusCode'], 400)
        self.client.invoke_model.assert_not_called()

    def test_bad_series_and_selection(self):
        mutations = [
            lambda d: d['points'][0]['up'].pop(),
            lambda d: d['timestamps'].reverse(),
            lambda d: d.update(selectedPointKey='missing'),
            lambda d: d['points'].append(copy.deepcopy(d['points'][0])),
            lambda d: d['points'][0]['up'].__setitem__(0, float('nan')),
        ]
        for mutate in mutations:
            data = copy.deepcopy(self.context)
            mutate(data)
            self.assertEqual(self.request(data)['statusCode'], 400)
        self.client.invoke_model.assert_not_called()

    def test_preflight_and_invalid_json(self):
        self.assertEqual(self.module.lambda_handler({'httpMethod': 'OPTIONS'}, None)['statusCode'], 200)
        self.assertEqual(self.module.lambda_handler({'body': '{'}, None)['statusCode'], 400)
        self.client.invoke_model.assert_not_called()


if __name__ == '__main__':
    unittest.main()
