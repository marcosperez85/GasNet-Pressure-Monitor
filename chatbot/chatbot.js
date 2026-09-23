let tecbotSending = false;
let tecbotReturnFocus = null;

function openChatbot() {
    tecbotReturnFocus = document.activeElement;
    document.getElementById('tecbotWindow').hidden = false;
    document.getElementById('tecbotLauncher').hidden = true;
    for (const id of ['openTecbot', 'tecbotLauncher']) {
        document.getElementById(id).setAttribute('aria-expanded', 'true');
    }
    updateChatbotSelection();
    document.getElementById('tecbotInput').focus();
}

function closeChatbot() {
    document.getElementById('tecbotWindow').hidden = true;
    document.getElementById('tecbotLauncher').hidden = false;
    for (const id of ['openTecbot', 'tecbotLauncher']) {
        document.getElementById(id).setAttribute('aria-expanded', 'false');
    }
    tecbotReturnFocus?.focus();
}

function updateChatbotSelection() {
    const label = document.getElementById('tecbotContext');
    if (!label) return;
    const point = AppState.selectedMeasurementPoint;
    label.textContent = point
        ? 'Punto seleccionado: ' + point.title + (point.id ? ' (' + point.id + ')' : '') + '. Datos simulados.'
        : 'Sin punto seleccionado. Podés consultar por nombre, unidad o código. Datos simulados.';
}

function buildMeasurementContext() {
    const points = [];
    let selectedPointKey = null;
    let timestamps = [];
    Object.entries(MEASUREMENT_POINTS).forEach(([unit, entries]) => {
        entries.forEach((point, index) => {
            // Reutilizar exactamente las series de Pressure y ECharts.
            const data = getMeasurementData(point);
            const key = JSON.stringify([unit, point.id || point.title, index]);
            if (point === AppState.selectedMeasurementPoint) selectedPointKey = key;
            if (!timestamps.length) timestamps = data.up.map(([time]) => time);
            points.push({
                key, unit, id: point.id || null, title: point.title,
                nombres: point.nombres || null,
                up: data.up.map(([, value]) => value),
                down: data.down.map(([, value]) => value),
                min: data.min.map(([, value]) => value)
            });
        });
    });
    AppState.measurementContext = {
        source: 'simulated',
        generatedAt: new Date(AppState.simulationTime).toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        selectedPointKey, timestamps, points
    };
    return AppState.measurementContext;
}

function appendChatMessage(kind, author, text) {
    const log = document.getElementById('tecbotMessages');
    const message = document.createElement('p');
    message.className = 'tecbotMessage ' + kind;
    const label = document.createElement('strong');
    label.textContent = author + ': ';
    message.append(label, document.createTextNode(text));
    log.appendChild(message);
    log.scrollTop = log.scrollHeight;
    return message;
}

async function sendMessage() {
    const input = document.getElementById('tecbotInput');
    const query = input.value.trim();
    if (!query || tecbotSending) return;
    if (query.length > 4000) {
        appendChatMessage('error', 'Error', 'La consulta puede tener hasta 4000 caracteres.');
        return;
    }
    if (typeof CONFIG === 'undefined' || !CONFIG.API_GATEWAY_URL) {
        appendChatMessage('error', 'Error', 'Falta configurar la URL de la API del chatbot.');
        return;
    }
    tecbotSending = true;
    const send = document.getElementById('tecbotSend');
    send.disabled = true;
    input.value = '';
    appendChatMessage('user', 'Vos', query);
    const loading = appendChatMessage('loading', 'Tecbot', 'Consultando las mediciones…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
        const base = CONFIG.API_GATEWAY_URL.replace(/\/+$/, '');
        const endpoint = base.endsWith('/chat') ? base : base + '/chat';
        const headers = { 'Content-Type': 'application/json' };
        // En CloudFront la clave se agrega en el origen; solo se usa aquí en desarrollo local.
        if (CONFIG.API_GATEWAY_KEY) headers['x-api-key'] = CONFIG.API_GATEWAY_KEY;
        // El contexto solo vive en memoria y en esta solicitud; no se persiste.
        const response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({ query, measurementContext: buildMeasurementContext() }),
            signal: controller.signal
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'No se pudo obtener respuesta.');
        if (typeof result.response !== 'string') throw new Error('Respuesta de la API no válida.');
        appendChatMessage('bot', 'Tecbot', result.response);
    } catch (error) {
        console.error('Error al consultar Tecbot:', error);
        appendChatMessage('error', 'Error', error.name === 'AbortError'
            ? 'La consulta tardó demasiado. Intentá nuevamente.' : error.message);
        if (!input.value) input.value = query;
    } finally {
        clearTimeout(timeout);
        loading.remove();
        send.disabled = false;
        tecbotSending = false;
    }
}

function setupChatbot() {
    document.getElementById('tecbotLauncher').addEventListener('click', openChatbot);
    document.getElementById('closeTecbot').addEventListener('click', closeChatbot);
    document.getElementById('tecbotWindow').addEventListener('keydown', event => {
        if (event.key === 'Escape') closeChatbot();
    });
    document.getElementById('tecbotForm').addEventListener('submit', event => {
        event.preventDefault();
        sendMessage();
    });
    appendChatMessage('bot', 'Tecbot', 'Podés consultarme las presiones simuladas del mapa. Seleccioná un punto o indicá su nombre o código en tu pregunta.');
    updateChatbotSelection();
    if (window.location.hash === '#tecbot') openChatbot();
}
