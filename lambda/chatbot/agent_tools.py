"""Read-only simulation tools and an explicitly requested DRAFT report."""
import hashlib
import html
import json
import re
from string import Template

from botocore.exceptions import ClientError
from strands import tool

from measurement_state import StateError, active_alarms, asset_status, iso_time, normalized, resolve_asset, utc_now


def report_requested(query):
    """Conservative write gate: current user turn only, never history/model output."""
    text = normalized(query)
    # Questions about the procedure, negations, quotes and hypothetical instructions
    # do not authorize writes. An unsupported formulation can be rephrased by the user.
    if re.search(r'\b(no|nunca|sin|evita|evitar|como|si|ejemplo|supongamos)\b', text) or any(
        c in text for c in ('"', '“', '”', '`')
    ):
        return False
    return bool(re.search(
        r'^\s*[¿¡]?(?:por favor[, ]+)?(?:ahora[, ]+)?'
        r'(?:(?:quiero|necesito)(?: que)?\s+|(?:podes|podrias|puedes|podrias)\s+)?'
        r'(genera|generar|generame|crea|crear|creame|prepara|preparar|preparame|'
        r'arma|armar|armame|redacta|redactar|redactame)\b[^.!?\n]{0,100}\b(reporte|informe|borrador)\b', text
    ))


class ToolService:
    def __init__(self, repository, template_key, incidents_prefix, request_id,
                 allow_report=False, selected_asset=None, conversation_asset=None):
        self.repository = repository
        self.template_key = template_key
        self.incidents_prefix = incidents_prefix.rstrip('/') + '/'
        self.request_id = request_id
        self.allow_report = allow_report
        self.selected_asset = selected_asset
        self.last_asset = conversation_asset
        self.incidents = []

    def read_asset(self, identifier=None):
        state, _ = self.repository.read()
        identifier = identifier or self.last_asset or self.selected_asset
        if not identifier:
            raise StateError('¿Para qué punto de medición? Indicá su código o nombre y unidad.', 409)
        point = resolve_asset(state, identifier)
        self.last_asset = point['key']
        return state, point

    def get_asset_status(self, asset=None):
        state, _ = self.repository.read()
        points = [resolve_asset(state, asset)] if asset else state['points']
        statuses = [asset_status(state, p) for p in points]
        abnormal = [s for s in statuses if s['status'] == 'ALARM']
        if len(points) == 1:
            self.last_asset = points[0]['key']
        elif len(abnormal) == 1:
            self.last_asset = abnormal[0]['asset_key']
        elif len(abnormal) > 1:
            self.last_asset = None
        return {'assets': statuses}

    def get_active_alarms(self, asset=None):
        state, _ = self.repository.read()
        points = [resolve_asset(state, asset)] if asset else state['points']
        alarms = active_alarms(state, points)
        if len(alarms) == 1:
            self.last_asset = alarms[0]['asset_key']
        elif len(alarms) > 1:
            self.last_asset = None
        return {'alarms': alarms, 'source': 'SIMULATED', 'state_version': state['version']}

    def get_tag_history(self, asset=None, tag='downstream'):
        fields = {'upstream': 'up', 'downstream': 'down', 'minimum': 'min'}
        if not asset and tag not in fields:
            state, _ = self.repository.read()
            candidates = [p for p in state['points'] if any(
                normalized(str(sensor)) == normalized(tag) for sensor in (p.get('nombres') or {}).values())]
            if len(candidates) != 1:
                raise StateError('No se identifica un punto único para ese sensor; indicá el asset y el tag.', 409)
            asset = candidates[0]['key']
        state, point = self.read_asset(asset)
        # Also accept the configured sensor name, without fuzzy asset guessing.
        sensor_tags = {'puntoUpstream': 'upstream', 'puntoDownstream': 'downstream'}
        for name, sensor in (point.get('nombres') or {}).items():
            if normalized(str(sensor)) == normalized(tag) and name in sensor_tags:
                tag = sensor_tags[name]
        if tag not in fields:
            raise StateError('Tag inválido: usá upstream, downstream o minimum.')
        end = state['timestamps'][-1]
        start = end - 3_600_000
        series = [{'timestamp': iso_time(t), 'value': v}
                  for t, v in zip(state['timestamps'], point[fields[tag]]) if start <= t <= end]
        return {'asset_key': point['key'], 'asset': point['title'], 'unit': point['unit'],
                'tag': tag, 'source': 'SIMULATED', 'data_quality': 'SIMULATED',
                'from': iso_time(start), 'to': iso_time(end), 'samples': series,
                'scenario': point['scenario'], 'scenario_started_at': point['scenarioStartedAt'],
                'note': 'Última hora de la simulación persistida; muestreo horario. No son datos en vivo.',
                'state_version': state['version']}

    def create_incident_draft(self, asset=None):
        if not self.allow_report:
            raise StateError('Crear un reporte requiere una solicitud explícita en el mensaje actual.', 403)
        state, point = self.read_asset(asset)
        status = asset_status(state, point)
        alarms = active_alarms(state, [point])
        if not alarms:
            raise StateError('Ese punto no tiene una alarma activa. No se creó un incidente.', 409)
        # Stable per request + asset: retrying after an HTTP timeout cannot duplicate a draft.
        digest = hashlib.sha256((self.request_id + '\0' + point['key']).encode()).hexdigest()[:24]
        incident_id = 'INC-' + digest
        key = self.incidents_prefix + incident_id + '.html'
        template_response = self.repository.s3.get_object(Bucket=self.repository.bucket, Key=self.template_key)
        template = Template(template_response['Body'].read().decode('utf-8'))
        alarm = alarms[0]
        values = {
            'incident_id': incident_id, 'created_at': utc_now(), 'asset': point['title'],
            'asset_id': status['asset_id'], 'unit': point['unit'], 'alarm': alarm['message'],
            'current_pressure': f"{status['current_pressure']:.2f}",
            'expected_pressure': f"{status['expected_pressure']:.2f}",
            'deviation': f"{status['deviation_percent']:.2f}%", 'severity': alarm['severity'],
            'description': 'Caída simulada de presión downstream por debajo del mínimo contractual.',
            'evidence': json.dumps({'status': status, 'alarm': alarm}, ensure_ascii=False, indent=2),
            'recommendations': 'Revisar las series y el mínimo contractual. Validar la evidencia con un responsable. '
                               'Este borrador ficticio no autoriza maniobras ni acciones sobre equipos.',
            'status': 'DRAFT',
        }
        rendered = template.substitute({k: html.escape(str(v), quote=True) for k, v in values.items()})
        try:
            self.repository.s3.put_object(
                Bucket=self.repository.bucket, Key=key, Body=rendered.encode('utf-8'),
                ContentType='text/html; charset=utf-8', CacheControl='no-store',
                Metadata={'status': 'DRAFT', 'incident-id': incident_id}, IfNoneMatch='*',
            )
        except ClientError as error:
            if error.response['Error']['Code'] not in ('PreconditionFailed', '412'):
                raise
        result = {'id': incident_id, 'status': 'DRAFT', 'asset': point['title'],
                  'url': self.repository.s3.generate_presigned_url(
                      'get_object', Params={'Bucket': self.repository.bucket, 'Key': key}, ExpiresIn=900),
                  'expires_in_seconds': 900}
        if not any(item['id'] == incident_id for item in self.incidents):
            self.incidents.append(result)
        return result


def build_tools(service):
    # Keep domain functions callable without an agent, with one shared repository.
    @tool
    def get_asset_status(asset: str | None = None) -> dict:
        """Read persisted simulated pressures, baseline, deviation, quality and scenario.

        Args:
            asset: Unique key, ID or exact name (unit / name if ambiguous). Omit for all assets.
        """
        return service.get_asset_status(asset)

    @tool
    def get_active_alarms(asset: str | None = None) -> dict:
        """Read active persisted low-downstream alarms; omit asset for the whole site.

        Args:
            asset: Unique key, ID or exact asset name. Omit for all assets.
        """
        return service.get_active_alarms(asset)

    @tool
    def get_tag_history(asset: str | None = None, tag: str = 'downstream') -> dict:
        """Read the last hour of the persisted simulation, never invent samples.

        Args:
            asset: Asset key, ID or exact name; omit to use the conversation or selected asset.
            tag: downstream, upstream, minimum, or the exact configured sensor name.
        """
        return service.get_tag_history(asset, tag)

    @tool
    def create_incident_draft(asset: str | None = None) -> dict:
        """Create only an explicitly requested DRAFT for an active alarm using S3 facts/template.

        Args:
            asset: Asset key, ID or exact name; omit to use the conversation or selected asset.
        """
        return service.create_incident_draft(asset)

    tools = [get_asset_status, get_active_alarms, get_tag_history]
    if service.allow_report:
        tools.append(create_incident_draft)
    return tools
