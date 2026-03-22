function generarDatos() {
    const data = { x: [], up: [], down: [], min: [] };

    for (let i = 0; i < 24; i++) {
        data.x.push(i);
        data.up.push(45 + Math.random() * 2);
        data.down.push(40 + Math.random() * 2);
        data.min.push(AppState.minimoContractual);
    }

    return data;
}

function initChart() {
    AppState.trendChart = echarts.init(DOM.chart);

    const d = generarDatos();

    AppState.trendChart.setOption({
        xAxis: { type: 'category', data: d.x },
        yAxis: { type: 'value' },
        series: [
            { data: d.up, type: 'line' },
            { data: d.down, type: 'line' },
            { data: d.min, type: 'line' }
        ]
    });
}