/* Run with `node tests/test_simulation.js`. No npm dependencies or AWS calls. */
async function runSimulationTests(sources) {
    const checks = [];
    function assert(condition, message) {
        if (!condition) throw new Error(message);
        checks.push(message);
    }
    const elements = new Map();
    function element() {
        return { textContent: '', children: [], disabled: false, attributes: {},
            append(...items) { this.children.push(...items); },
            appendChild(item) { this.children.push(item); },
            setAttribute(key, value) { this.attributes[key] = value; },
            addEventListener(type, callback) { this[type] = callback; },
            remove() {}, focus() {} };
    }
    const document = {
        getElementById(id) { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); },
        createElement: element, createTextNode: text => ({ textContent: text })
    };
    let failWrite = false;
    let fetchCount = 0;
    const requests = [];
    let remote;
    const fetch = async (url, options) => {
        fetchCount++;
        const request = JSON.parse(options.body);
        requests.push(request);
        if (request.action === 'set_scenario' && failWrite) {
            return { ok: false, status: 503, json: async () => ({ error: 'S3 no disponible' }) };
        }
        if (request.action === 'set_scenario') {
            const point = remote.points.find(p => p.key === request.assetKey);
            point.scenario = request.active ? 'pressure_drop' : 'normal';
            point.down = request.active ? [33, 27.2] : [...point.normalDown];
            remote.version = 'version-' + fetchCount;
        }
        return { ok: true, json: async () => ({ state: JSON.parse(JSON.stringify(remote)) }) };
    };
    const factory = new Function('document', 'fetch', 'setTimeout', 'clearTimeout', 'AbortController', 'URL', `
        const CONFIG = { API_GATEWAY_URL: '/chat' };
        const MEASUREMENT_POINTS = { Test: [{ id: '037-001', title: 'Punto A' }, { title: 'Punto B' }] };
        ${sources['js/state.js']}
        ${sources['js/chart.js']}
        ${sources['js/simulation-api.js']}
        ${sources['chatbot/chatbot.js']}
        let repaints = 0;
        function selectMeasurementPoint(point) { AppState.selectedMeasurementPoint = point; repaints++; }
        return { AppState, points: MEASUREMENT_POINTS.Test, measurementEntries, applySharedSimulation,
                 togglePressureDropScenario, setupPressureScenario, appendIncidentLinks, syncSharedSimulation,
                 getMeasurementData, getRepaints: () => repaints };
    `);
    const app = factory(document, fetch, () => 1, () => {}, class { abort() {} }, URL);
    const entries = app.measurementEntries();
    remote = { schemaVersion: 1, version: 'version-0', timestamps: [1000, 3601000],
        points: entries.map(({ point, key }) => ({ key, title: point.title, scenario: 'normal',
            up: [46, 47], down: [36, 37], min: [34, 34], normalDown: [36, 37] })) };
    app.AppState.selectedMeasurementPoint = app.points[0];
    app.setupPressureScenario();
    const button = document.getElementById('pressureDropScenario');
    assert(button.disabled, 'Scenario button waits for persisted state');
    app.applySharedSimulation(remote);
    app.setupPressureScenario();
    assert(!button.disabled, 'Scenario button enabled after synchronization');
    const initialRepaints = app.getRepaints();
    await app.syncSharedSimulation();
    assert(app.getRepaints() === initialRepaints, 'Unchanged state does not reset chart zoom');
    await button.click();
    assert(requests.at(-1).action === 'set_scenario', 'Button sends scenario action to existing endpoint');
    assert(requests.at(-1).assetKey === entries[0].key, 'Button identifies the selected measurement point');
    assert(requests.at(-1).version === 'version-0', 'Button includes concurrency version');
    assert(app.getMeasurementData(app.points[0]).down.at(-1)[1] < 34, 'Chart uses the persisted downstream drop');
    assert(app.getMeasurementData(app.points[1]).down.at(-1)[1] === 37, 'Other point stays unchanged');
    assert(button.attributes['aria-pressed'] === 'true', 'Scenario button shows active state');
    await button.click();
    assert(app.getMeasurementData(app.points[0]).down.at(-1)[1] === 37, 'Restore uses the persisted original series');
    const repaints = app.getRepaints();
    failWrite = true;
    await button.click();
    assert(app.getMeasurementData(app.points[0]).down.at(-1)[1] === 37, 'Failed write does not apply a local anomaly');
    assert(document.getElementById('pressureScenarioStatus').textContent.includes('S3'), 'Write failure is visible');
    assert(requests.at(-1).action === 'get_state', 'Failed write re-reads the server for uncertain outcomes');
    remote.points[0].scenario = 'pressure_drop';
    remote.points[0].down = [33, 27.2];
    remote.version = 'changed-in-another-browser';
    await app.syncSharedSimulation();
    assert(app.getMeasurementData(app.points[0]).down.at(-1)[1] === 27.2, 'Changes from another browser refresh the graph');
    app.appendIncidentLinks([{ id: 'INC-test', status: 'DRAFT', url: 'https://example.test/signed-report' }]);
    const report = document.getElementById('tecbotMessages').children.at(-1);
    const link = report.children.at(-1);
    assert(link.href === 'https://example.test/signed-report', 'Report link opens returned persisted draft');
    assert(link.rel === 'noopener noreferrer', 'Report opens without exposing the original window');
    const count = document.getElementById('tecbotMessages').children.length;
    app.appendIncidentLinks([{ id: 'bad', status: 'DRAFT', url: 'javascript:alert(1)' }]);
    assert(document.getElementById('tecbotMessages').children.length === count, 'Unsafe report URL is rejected');
    return checks;
}

if (typeof require === 'function' && typeof module !== 'undefined' && require.main === module) {
    const fs = require('node:fs');
    const path = require('node:path');
    const sources = Object.fromEntries(['js/state.js', 'js/chart.js', 'js/simulation-api.js', 'chatbot/chatbot.js']
        .map(file => [file, fs.readFileSync(path.join(__dirname, '..', file), 'utf8')]));
    runSimulationTests(sources).then(checks => console.log(`${checks.length} frontend checks passed`))
        .catch(error => { console.error(error); process.exitCode = 1; });
}
