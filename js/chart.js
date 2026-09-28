function generarDatos() {
    const data = { up: [], down: [], min: [] };
    const ahora = AppState.simulationTime;
    const hora = 60 * 60 * 1000;
    const horasHistorial = 72;
    const inicio = ahora - horasHistorial * hora;

    for (let i = 0; i <= horasHistorial; i++) {
        const timestamp = inicio + i * hora;
        data.up.push([timestamp, 45 + Math.random() * 5]);
        data.down.push([timestamp, 35 + Math.random() * 5]);
        data.min.push([timestamp, AppState.minimoContractual]);
    }

    return data;
}

function getMeasurementData(point) {
    // Cada objeto conserva su propia simulación, incluso si no tiene id.
    if (!AppState.pointChartData.has(point)) {
        AppState.pointChartData.set(point, generarDatos());
    }
    return AppState.pointChartData.get(point);
}

function initChart() {
    AppState.trendChart = echarts.init(DOM.chart);
    updateMeasurementChart(AppState.selectedMeasurementPoint);
}

function updatePressureScenarioControl() {
    const button = document.getElementById('pressureDropScenario');
    const status = document.getElementById('pressureScenarioStatus');
    const point = AppState.selectedMeasurementPoint;
    const active = Boolean(point && AppState.normalDownstream.has(point));
    button.disabled = !point || !Number.isFinite(AppState.minimoContractual) || AppState.minimoContractual <= 0;
    button.setAttribute('aria-pressed', String(active));
    button.textContent = active ? 'Restaurar escenario normal' : 'Escenario caída de presión';
    status.textContent = !point ? 'Seleccioná un punto para simular una caída.'
        : active ? `Caída de presión activa en ${point.title}: downstream termina por debajo del mínimo contractual.` : '';
}

function togglePressureDropScenario() {
    const point = AppState.selectedMeasurementPoint;
    const minimum = AppState.minimoContractual;
    if (!point || !Number.isFinite(minimum) || minimum <= 0) return;
    const data = getMeasurementData(point);
    if (AppState.normalDownstream.has(point)) {
        // Restaurar exactamente la serie original, sin nuevos valores aleatorios.
        data.down = AppState.normalDownstream.get(point);
        AppState.normalDownstream.delete(point);
    } else {
        if (data.down.length < 2) return;
        const original = data.down;
        const samples = Math.min(6, original.length - 1);
        const start = original.length - samples;
        const initialPressure = original[start - 1][1];
        const finalPressure = minimum * 0.8;
        AppState.normalDownstream.set(point, original);
        data.down = original.map(([time, pressure], index) => {
            if (index < start) return [time, pressure];
            const progress = (index - start + 1) / samples;
            return [time, initialPressure + (finalPressure - initialPressure) * progress];
        });
    }
    // El gráfico, Line Pack y las futuras consultas comparten esta misma serie.
    AppState.measurementContext = null;
    selectMeasurementPoint(point);
}

function setupPressureScenario() {
    document.getElementById('pressureDropScenario').addEventListener('click', togglePressureDropScenario);
    updatePressureScenarioControl();
}

function updateMeasurementChart(point) {
    updatePressureScenarioControl();
    if (!AppState.trendChart) return;

    const fin = AppState.simulationTime;
    const heading = document.querySelector('.chartHeader h4');
    if (heading) {
        heading.textContent = point
            ? `Tendencia de Presión — ${point.title}`
            : 'Tendencia de Presión — Seleccione un punto de medición';
    }
    // No configurar el eje temporal ni DataZoom hasta tener una serie.
    if (!point) {
        AppState.trendChart.clear();
        return;
    }
    const d = getMeasurementData(point);
    const inicioVisible = fin - 24 * 60 * 60 * 1000;
    const zoomRange = {
        xAxisIndex: 0,
        startValue: inicioVisible,
        endValue: fin,
        minValueSpan: 60 * 60 * 1000,
        filterMode: 'none'
    };

    AppState.trendChart.setOption({
        legend: {
            top: 0,
            type: 'scroll',
            textStyle: { color: '#cbd5e1' }
        },
        grid: { top: 40, right: 20, bottom: 65, left: 15, containLabel: true },
        dataZoom: [
            {
                ...zoomRange,
                type: 'slider',
                bottom: 10,
                height: 25,
                left: 55,
                right: 25,
                textStyle: { color: '#cbd5e1' },
                labelFormatter: value => new Date(value).toLocaleString('es-AR')
            },
            { ...zoomRange, type: 'inside' }
        ],
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                label: {
                    formatter: params => new Date(params.value).toLocaleString('es-AR')
                }
            },
            valueFormatter: value => Number(value).toFixed(2)
        },
        xAxis: {
            type: 'time',
            min: fin - 72 * 60 * 60 * 1000,
            max: fin,
            boundaryGap: [0, 0],
            axisLabel: {
                color: '#cbd5e1',
                formatter: '{dd}/{MM}\n{HH}:{mm}',
                hideOverlap: true
            },
            splitLine: { show: true, lineStyle: { type: 'dashed', color: '#475569' } }
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#cbd5e1' },
            splitLine: { show: true, lineStyle: { type: 'dashed', color: '#475569' } }
        },
        series: [
            { name: 'Presión upstream', data: d.up, type: 'line' },
            { name: 'Presión downstream', data: d.down, type: 'line' },
            { name: 'Mínimo contractual', data: d.min, type: 'line' }
        ]
    }, { notMerge: true });
}
