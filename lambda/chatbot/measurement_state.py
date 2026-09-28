"""Single S3 source for the dashboard, scenario and agent tools."""
import copy
import json
import math
import unicodedata
import uuid
from datetime import datetime, timezone

from botocore.exceptions import ClientError


class StateError(Exception):
    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def iso_time(milliseconds):
    return datetime.fromtimestamp(milliseconds / 1000, timezone.utc).isoformat()


def normalized(value):
    return ''.join(c for c in unicodedata.normalize('NFKD', value.casefold())
                   if not unicodedata.combining(c)).strip()


def validate_measurement_context(data):
    if not isinstance(data, dict) or data.get('source') != 'simulated':
        raise ValueError('Falta el contexto de mediciones del dashboard.')
    serialized = json.dumps(data, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
    if len(serialized.encode('utf-8')) > 500_000:
        raise ValueError('El contexto de mediciones es demasiado grande.')
    try:
        datetime.fromisoformat(data['generatedAt'].replace('Z', '+00:00'))
    except (KeyError, AttributeError, TypeError, ValueError):
        raise ValueError('La fecha de la simulación no es válida.') from None
    times, points = data.get('timestamps'), data.get('points')

    def number(value):
        return type(value) in (int, float) and math.isfinite(value)

    if not isinstance(times, list) or not 2 <= len(times) <= 1000:
        raise ValueError('La serie temporal no es válida.')
    if any(not number(t) or not 0 <= t <= 253402214400000 for t in times):
        raise ValueError('Las fechas de las mediciones no son válidas.')
    if any(a >= b for a, b in zip(times, times[1:])):
        raise ValueError('Las fechas deben estar ordenadas.')
    if not isinstance(points, list) or not 1 <= len(points) <= 100:
        raise ValueError('La lista de puntos no es válida.')
    keys = set()
    for point in points:
        if not isinstance(point, dict) or any(
            not isinstance(point.get(field), str) or not 1 <= len(point[field]) <= 300
            for field in ('key', 'unit', 'title')
        ):
            raise ValueError('La identificación del punto no es válida.')
        if point['key'] in keys:
            raise ValueError('Hay puntos duplicados.')
        keys.add(point['key'])
        for field in ('up', 'down', 'min'):
            values = point.get(field)
            if not isinstance(values, list) or len(values) != len(times) or any(
                not number(v) or v <= 0 for v in values
            ):
                raise ValueError('Las presiones no coinciden con la serie temporal.')
    selected = data.get('selectedPointKey')
    if selected is not None and (not isinstance(selected, str) or selected not in keys):
        raise ValueError('El punto seleccionado no existe en el contexto.')
    return serialized


def resolve_asset(state, identifier):
    if not isinstance(identifier, str) or not identifier.strip():
        raise StateError('Indicá el código, nombre y unidad del punto de medición.')
    # Keys are unique even when the catalog has repeated names or no ID.
    exact = [p for p in state['points'] if p['key'] == identifier]
    if exact:
        return exact[0]
    name = normalized(identifier)
    matches = [p for p in state['points'] if name in {
        normalized(str(p.get('id') or '')), normalized(p['title']),
        normalized(p['unit'] + ' / ' + p['title'])
    }]
    if not matches:
        raise StateError('No existe ese punto de medición.', 404)
    if len(matches) != 1:
        raise StateError('El nombre es ambiguo; indicá también la unidad del punto.', 409)
    return matches[0]


def asset_status(state, point):
    current, expected = point['down'][-1], point['normalDown'][-1]
    return {
        'asset_key': point['key'], 'asset_id': point.get('id') or point['key'],
        'asset_name': point['title'], 'unit': point['unit'],
        'sensor_names': point.get('nombres') or {},
        'current_pressure': current, 'expected_pressure': expected,
        'pressure_tag': 'downstream', 'upstream_pressure': point['up'][-1],
        'contractual_minimum': point['min'][-1],
        'deviation_percent': (current - expected) / expected * 100,
        'data_quality': 'SIMULATED',
        'status': 'ALARM' if current < point['min'][-1] else 'NORMAL',
        'active_scenario': point['scenario'],
        'timestamp': iso_time(state['timestamps'][-1]),
        'state_updated_at': state['updatedAt'], 'state_version': state['version'],
    }


def active_alarms(state, points):
    alarms = []
    for point in points:
        status = asset_status(state, point)
        if status['status'] != 'ALARM':
            continue
        # Most recent continuous breach, based on persisted measurements.
        onset = len(point['down']) - 1
        while onset > 0 and point['down'][onset - 1] < point['min'][onset - 1]:
            onset -= 1
        alarms.append({
            'id': 'LOW_PRESSURE-' + (point.get('id') or point['key']),
            'asset_key': point['key'], 'asset': point['title'], 'unit': point['unit'],
            'type': 'LOW_DOWNSTREAM_PRESSURE', 'severity': 'HIGH',
            'message': f"Downstream {point['down'][-1]:.2f} por debajo del mínimo {point['min'][-1]:.2f}.",
            'timestamp': iso_time(state['timestamps'][onset]), 'status': 'ACTIVE',
        })
    return alarms


class MeasurementRepository:
    def __init__(self, s3, bucket, state_key):
        self.s3, self.bucket, self.state_key = s3, bucket, state_key

    def read(self):
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=self.state_key)
        except ClientError as error:
            if error.response['Error']['Code'] in ('AccessDenied', '403'):
                # GetObject may return 403 for a missing key with prefix-scoped ListBucket.
                listing = self.s3.list_objects_v2(Bucket=self.bucket, Prefix=self.state_key, MaxKeys=1)
                if not any(item['Key'] == self.state_key for item in listing.get('Contents', [])):
                    raise StateError('Todavía no hay estado compartido. Abrí el dashboard para inicializarlo.', 404) from error
            if error.response['Error']['Code'] in ('NoSuchKey', '404'):
                raise StateError('Todavía no hay estado compartido. Abrí el dashboard para inicializarlo.', 404) from error
            raise
        state = json.loads(response['Body'].read())
        if state.get('schemaVersion') != 1:
            raise StateError('La versión del estado compartido no es compatible.', 503)
        return state, response['ETag']

    def write(self, state, **condition):
        self.s3.put_object(
            Bucket=self.bucket, Key=self.state_key,
            Body=json.dumps(state, ensure_ascii=False, allow_nan=False).encode('utf-8'),
            ContentType='application/json', CacheControl='no-store', **condition,
        )

    def initialize(self, seed):
        # A subsequent browser must never overwrite the shared state with random data.
        try:
            return self.read()[0]
        except StateError as error:
            if error.status != 404:
                raise
        validate_measurement_context(seed)
        state = {k: copy.deepcopy(seed[k]) for k in ('source', 'generatedAt', 'timestamps', 'points')}
        state.update(schemaVersion=1, version=str(uuid.uuid4()), updatedAt=utc_now(),
                     timezone=seed.get('timezone', 'UTC'))
        state['points'] = [
            {**{k: p.get(k) for k in ('key', 'unit', 'id', 'title', 'nombres', 'up', 'down', 'min')},
             'normalDown': p['down'][:], 'scenario': 'normal', 'scenarioStartedAt': None}
            for p in state['points']
        ]
        try:
            self.write(state, IfNoneMatch='*')
        except ClientError as error:
            if error.response['Error']['Code'] not in ('PreconditionFailed', 'ConditionalRequestConflict', '412', '409'):
                raise
            return self.read()[0]
        return state

    def set_scenario(self, asset_key, enabled, version):
        if type(enabled) is not bool or not isinstance(version, str):
            raise ValueError('Indicá active (booleano) y la versión del estado.')
        state, etag = self.read()
        if version != state['version']:
            raise StateError('Otro usuario modificó la simulación. Se actualizaron los datos; volvé a intentar.', 409)
        point = resolve_asset(state, asset_key)
        original = point['normalDown']
        point['down'] = original[:]
        point['scenario'] = 'pressure_drop' if enabled else 'normal'
        point['scenarioStartedAt'] = None
        if enabled:
            samples = min(6, len(original) - 1)
            start = len(original) - samples
            initial, final = original[start - 1], point['min'][-1] * 0.8
            for i in range(start, len(original)):
                point['down'][i] = initial + (final - initial) * (i - start + 1) / samples
            point['scenarioStartedAt'] = iso_time(state['timestamps'][start])
        state.update(version=str(uuid.uuid4()), updatedAt=utc_now())
        try:
            self.write(state, IfMatch=etag)
        except ClientError as error:
            if error.response['Error']['Code'] in ('PreconditionFailed', 'ConditionalRequestConflict', '412', '409'):
                raise StateError('La simulación cambió durante la operación. Actualizá e intentá nuevamente.', 409) from error
            raise
        return state
