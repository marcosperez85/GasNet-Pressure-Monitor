// The same /chat endpoint and Lambda own simulation state and agent requests.
async function dashboardRequest(payload) {
    if (typeof CONFIG === 'undefined' || !CONFIG.API_GATEWAY_URL) {
        throw new Error('Falta configurar la URL de la API del chatbot.');
    }
    const base = CONFIG.API_GATEWAY_URL.replace(/\/+$/, '');
    const endpoint = base.endsWith('/chat') ? base : base + '/chat';
    const headers = { 'Content-Type': 'application/json' };
    if (CONFIG.API_GATEWAY_KEY) headers['x-api-key'] = CONFIG.API_GATEWAY_KEY;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);
    try {
        const response = await fetch(endpoint, {
            method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) {
            if (payload.action && payload.action !== 'chat' && response.status === 400 &&
                result.error === 'La consulta debe contener entre 1 y 4000 caracteres.') {
                throw new Error('La API configurada no reconoce la sincronización de escenarios. Desplegá el backend actualizado con Terraform y verificá API_GATEWAY_URL en config.js. Instalar dependencias o ejecutar build_lambda.py no actualiza la Lambda de AWS.');
            }
            const error = new Error(result.error || 'No se pudo completar la operación.');
            error.status = response.status;
            throw error;
        }
        return result;
    } finally {
        clearTimeout(timeout);
    }
}

function measurementEntries() {
    return Object.entries(MEASUREMENT_POINTS).flatMap(([unit, entries]) =>
        entries.map((point, index) => ({ point, key: JSON.stringify([unit, point.id || point.title, index]) })));
}

function measurementKey(point) {
    return measurementEntries().find(entry => entry.point === point)?.key || null;
}

function applySharedSimulation(state) {
    if (state?.schemaVersion !== 1 || !Array.isArray(state.points) || !Array.isArray(state.timestamps)) {
        throw new Error('El estado compartido recibido no es válido.');
    }
    const byKey = new Map(state.points.map(point => [point.key, point]));
    const entries = measurementEntries();
    if (entries.length !== byKey.size || entries.some(({ key }) => !byKey.has(key))) {
        throw new Error('El catálogo de puntos cambió respecto del estado guardado. Revisá la migración del estado en S3.');
    }
    if (AppState.sharedStateReady && AppState.sharedStateVersion === state.version) {
        // A background refresh must not reset the user's ECharts DataZoom.
        AppState.sharedStateError = '';
        updatePressureScenarioControl();
        return;
    }
    for (const { point, key } of entries) {
        const stored = byKey.get(key);
        const data = Object.fromEntries(['up', 'down', 'min'].map(field =>
            [field, stored[field].map((value, i) => [state.timestamps[i], value])]));
        AppState.pointChartData.set(point, data);
        if (stored.scenario === 'pressure_drop') {
            AppState.normalDownstream.set(point, stored.normalDown.map((value, i) => [state.timestamps[i], value]));
        } else {
            AppState.normalDownstream.delete(point);
        }
    }
    AppState.simulationTime = state.timestamps.at(-1);
    AppState.sharedStateVersion = state.version;
    AppState.sharedStateReady = true;
    AppState.sharedStateError = '';
    AppState.measurementContext = null;
    if (AppState.selectedMeasurementPoint) selectMeasurementPoint(AppState.selectedMeasurementPoint);
    else updatePressureScenarioControl();
}

let simulationSync = null;
async function syncSharedSimulation() {
    if (simulationSync) return simulationSync;
    simulationSync = (async () => {
        try {
            let result;
            try {
                result = await dashboardRequest({ action: 'get_state' });
            } catch (error) {
                if (error.status !== 404) throw error;
                result = await dashboardRequest({ action: 'initialize_state', measurementContext: buildMeasurementContext() });
            }
            // A scenario write owns the UI until its response has been applied.
            if (!AppState.sharedStateBusy) applySharedSimulation(result.state);
        } catch (error) {
            AppState.sharedStateReady = false;
            AppState.sharedStateError = 'No se pudo sincronizar la simulación: ' + error.message;
            updatePressureScenarioControl();
            throw error;
        }
    })();
    try { await simulationSync; } finally { simulationSync = null; }
}

function setupSharedSimulation() {
    const refresh = () => {
        if (!AppState.sharedStateBusy && !document.hidden) syncSharedSimulation().catch(console.error);
    };
    refresh();
    window.addEventListener('focus', refresh);
    window.setInterval(refresh, 30000);
}
