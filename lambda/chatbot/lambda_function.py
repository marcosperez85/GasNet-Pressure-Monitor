"""Existing /chat endpoint: shared simulation actions and the Strands chatbot."""
import base64
import json
import logging
import os
import uuid

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError, ReadTimeoutError, ConnectTimeoutError

from agent_tools import ToolService, report_requested
from chat_agent import AgentBudgetExceeded, run_agent
from measurement_state import MeasurementRepository, StateError

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


def response(status, payload):
    return {'statusCode': status, 'headers': {
        'Content-Type': 'application/json', 'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,x-api-key',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
    }, 'body': json.dumps(payload, ensure_ascii=False, allow_nan=False)}


def make_repository():
    client = boto3.client('s3', region_name=os.environ['AWS_REGION'], config=Config(
        signature_version='s3v4', connect_timeout=2, read_timeout=3, retries={'total_max_attempts': 1}))
    return MeasurementRepository(client, os.environ['STATE_BUCKET'], os.environ['STATE_KEY'])


def validate_history(history):
    if not isinstance(history, list) or len(history) > 10:
        raise ValueError('El historial admite hasta 10 mensajes.')
    for message in history:
        if (not isinstance(message, dict) or message.get('role') not in ('user', 'assistant')
                or not isinstance(message.get('text'), str) or len(message['text']) > 6000):
            raise ValueError('El historial de conversación no es válido.')
    return history


def lambda_handler(event, context):
    service = None
    operation = 'S3'
    try:
        if event.get('httpMethod') == 'OPTIONS':
            return response(200, {})
        if 'body' in event:
            raw = event['body'] or '{}'
            if event.get('isBase64Encoded'):
                raw = base64.b64decode(raw, validate=True).decode('utf-8')
            if len(raw.encode('utf-8')) > 600_000:
                raise ValueError('La solicitud es demasiado grande.')
            body = json.loads(raw)
        else:
            body = event
        if not isinstance(body, dict):
            raise ValueError('La solicitud debe ser un objeto JSON.')
        action = body.get('action', 'chat')
        if action not in ('chat', 'initialize_state', 'get_state', 'set_scenario'):
            raise ValueError('Acción desconocida.')
        if action == 'chat':
            query = body.get('query')
            if not isinstance(query, str) or not query.strip() or len(query) > 4000:
                raise ValueError('La consulta debe contener entre 1 y 4000 caracteres.')
            history = validate_history(body.get('history', []))
            request_id = body.get('requestId') or str(uuid.uuid4())
            try:
                uuid.UUID(request_id)
            except (ValueError, TypeError, AttributeError):
                raise ValueError('requestId debe ser un UUID.') from None
        repository = make_repository()
        if action == 'initialize_state':
            return response(200, {'state': repository.initialize(body.get('measurementContext'))})
        if action == 'get_state':
            return response(200, {'state': repository.read()[0]})
        if action == 'set_scenario':
            return response(200, {'state': repository.set_scenario(
                body.get('assetKey'), body.get('active'), body.get('version'))})

        # Legacy {query, measurementContext} may seed an absent state, never replace it.
        state = repository.initialize(body['measurementContext']) if body.get('measurementContext') else repository.read()[0]
        selected = body.get('selectedPointKey', (body.get('measurementContext') or {}).get('selectedPointKey'))
        previous = body.get('conversationAssetKey')
        keys = {p['key'] for p in state['points']}
        if any(key is not None and (not isinstance(key, str) or key not in keys) for key in (selected, previous)):
            raise ValueError('El punto seleccionado o de la conversación no existe.')
        service = ToolService(repository, os.environ['INCIDENT_TEMPLATE_KEY'], os.environ['INCIDENTS_PREFIX'],
                              request_id, report_requested(query), selected, previous)
        operation = 'Bedrock'
        text = run_agent(query, service, history, state.get('timezone', 'UTC'))
        return response(200, {'response': text, 'incidents': service.incidents,
                              'conversationAssetKey': service.last_asset})
    except StateError as error:
        return response(error.status, {'error': str(error)})
    except (ValueError, TypeError, UnicodeError) as error:
        return response(400, {'error': str(error)})
    except (ClientError, BotoCoreError, AgentBudgetExceeded) as error:
        logger.exception('Error al consultar S3/Bedrock o límite de ejecución del agente')
        return failed_agent_response(service, error, operation)
    except Exception as error:
        logger.exception('Error interno del chatbot')
        return failed_agent_response(service, error, operation)


def failed_agent_response(service, error=None, operation='S3 o Bedrock'):
    if service and service.incidents:
        return response(200, {'response': 'El borrador se guardó en estado DRAFT, pendiente de revisión humana. '
                              'No se pudo completar el resumen del agente.', 'incidents': service.incidents,
                              'conversationAssetKey': service.last_asset})
    # Strands can wrap the original AWS exception in EventLoopException.
    root = error
    seen = set()
    while root is not None and root.__cause__ is not None and id(root) not in seen:
        seen.add(id(root))
        root = root.__cause__
    if isinstance(root, AgentBudgetExceeded):
        return response(503, {'error': 'La consulta necesitó más pasos de los disponibles. Probá uno de los accesos rápidos o consultá un punto específico.', 'code': 'AGENT_BUDGET_EXCEEDED'})
    if isinstance(root, (ReadTimeoutError, ConnectTimeoutError)):
        return response(503, {'error': f'{operation} tardó demasiado en responder. Intentá nuevamente.', 'code': 'UPSTREAM_TIMEOUT'})
    if isinstance(root, ClientError):
        code = root.response.get('Error', {}).get('Code', '')
        if code in ('ThrottlingException', 'TooManyRequestsException', 'SlowDown'):
            return response(503, {'error': 'El servicio está recibiendo demasiadas solicitudes. Esperá unos segundos y volvé a intentar.', 'code': 'UPSTREAM_THROTTLED'})
        if code in ('AccessDenied', 'AccessDeniedException', 'UnauthorizedException'):
            return response(503, {'error': f'El backend no tiene acceso a {operation}. Revisá los permisos del rol de Lambda y el acceso al modelo configurado.', 'code': 'UPSTREAM_ACCESS_DENIED'})
    return response(503, {'error': f'No se pudo completar la operación con {operation}. Intentá nuevamente.', 'code': 'UPSTREAM_ERROR'})
