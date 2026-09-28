let tecbotSending = false;
let tecbotReturnFocus = null;
let tecbotHistory = [];
let tecbotConversationAsset = null;
let tecbotPendingRequest = null;

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
    if (AppState.sharedStateBusy) {
        appendChatMessage('error', 'Tecbot', 'Esperá a que termine de guardarse el escenario.');
        return;
    }
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
    try {
        await syncSharedSimulation();
        const selectedPointKey = measurementKey(AppState.selectedMeasurementPoint);
        const fingerprint = JSON.stringify([query, selectedPointKey, tecbotConversationAsset]);
        if (tecbotPendingRequest?.fingerprint !== fingerprint) {
            tecbotPendingRequest = { fingerprint, id: crypto.randomUUID() };
        }
        const result = await dashboardRequest({
            query, selectedPointKey, conversationAssetKey: tecbotConversationAsset,
            history: tecbotHistory, requestId: tecbotPendingRequest.id
        });
        if (typeof result.response !== 'string') throw new Error('Respuesta de la API no válida.');
        appendChatMessage('bot', 'Tecbot', result.response);
        appendIncidentLinks(result.incidents || []);
        tecbotConversationAsset = result.conversationAssetKey || null;
        tecbotHistory.push({ role: 'user', text: query }, { role: 'assistant', text: result.response.slice(0, 6000) });
        tecbotHistory = tecbotHistory.slice(-10);
        tecbotPendingRequest = null;
    } catch (error) {
        console.error('Error al consultar Tecbot:', error);
        appendChatMessage('error', 'Error', error.name === 'AbortError'
            ? 'La consulta tardó demasiado. Intentá nuevamente.' : error.message);
        if (!input.value) input.value = query;
    } finally {
        loading.remove();
        send.disabled = false;
        tecbotSending = false;
    }
}

function appendIncidentLinks(incidents) {
    for (const incident of incidents) {
        if (incident.status !== 'DRAFT' || typeof incident.id !== 'string') continue;
        let url;
        try { url = new URL(incident.url); } catch (_) { continue; }
        if (url.protocol !== 'https:') continue;
        const message = appendChatMessage('bot', 'Reporte', `${incident.id} — DRAFT, pendiente de revisión humana. `);
        const link = document.createElement('a');
        link.href = url.href;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Abrir borrador (enlace válido por 15 minutos)';
        message.appendChild(link);
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
