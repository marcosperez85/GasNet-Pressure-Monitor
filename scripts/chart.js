import { DOM } from './dom';
import { AppState } from './state';
import {
    inputPEntradaHist,
    startDateGlobal,
    endDateGlobal,
    $boton24h,
    $boton7d,
    $boton14d,
    $boton30d
} from '../src/main.js';

// Función para formatear timestamps
export function formatearTimestampHistorico(arrayTimestamps) {
    return arrayTimestamps.map(ts => {
        if (!ts) return '';
        const d = new Date(ts);
        const dia = String(d.getDate()).padStart(2, '0');
        const mes = String(d.getMonth() + 1).padStart(2, '0');
        const horas = String(d.getHours()).padStart(2, '0');
        const minutos = String(d.getMinutes()).padStart(2, '0');
        return `${dia}/${mes} ${horas}:${minutos}`;
    });
}

// Crear gráfico
function createPressureChart() {
    if (typeof echarts === 'undefined') {
        console.error('ECharts no está cargada.');
        return;
    }

    const chartDom = DOM.chart;
    if (!chartDom) return console.error('No se encontró el DOM del gráfico');

    AppState.trendChart = echarts.init(chartDom);

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: params => {
                const param = params[0];
                const value = param.value;
                return `${param.axisValueLabel}<br/>${param.marker} ${param.seriesName}: <strong>${typeof value === 'number' ? value.toFixed(2) : value}</strong>`;
            }
        },
        legend: { data: ['Presión Entrada'], bottom: '0%' },
        xAxis: { type: 'category', data: [] },
        yAxis: {
            type: 'value',
            name: 'Presión (bar)',
            scale: true,
            axisLabel: { formatter: val => val.toFixed(2) }
        },
        dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { start: 0, end: 100 }
        ],
        series: [{
            name: 'Presión Entrada',
            type: 'line',
            data: [],
            smooth: true,
            markLine: {
                symbol: 'none',
                silent: true,
                lineStyle: { type: 'dashed', color: '#FFA500', width: 2 },
                data: [
                    { yAxis: 80, label: { formatter: 'Alta', position: 'insideEndTop' } },
                    { yAxis: AppState.minimoContractual, label: { formatter: 'Mínimo Contractual', position: 'insideEndTop' } }
                ]
            }
        }]
    };

    AppState.trendChart.setOption(option);
    AppState.trendChart.showLoading();

    // Redimensionar al cambiar tamaño de ventana
    window.addEventListener('resize', () => {
        if (AppState.trendChart) AppState.trendChart.resize();
    });

    console.log('Gráfico de presión inicializado correctamente.');
}

// Actualizar datos
export function updatePressureChart(data) {
    if (!AppState.trendChart) return console.error('Gráfico no inicializado');

    if (Array.isArray(data) && data[0]?.value !== undefined && data[0]?.timestamp !== undefined) {
        const values = data.map(item => parseFloat(item.value));
        const timestamps = formatearTimestampHistorico(data.map(item => item.timestamp));

        const max = Math.max(...values);
        const min = Math.min(...values);
        const y80 = min + (max - min) * 0.8;

        AppState.trendChart.hideLoading();

        AppState.trendChart.setOption({
            xAxis: { data: timestamps },
            series: [{ data: values, markLine: { data: [{ yAxis: y80, label: { formatter: 'Alta' } }, { yAxis: AppState.minimoContractual, label: { formatter: 'Mínimo Contractual' } }] } }]
        });
    } else if (typeof data === 'object' && 'x' in data && 'up' in data) {
        AppState.trendChart.hideLoading();

        AppState.trendChart.setOption({
            xAxis: { data: data.x },
            series: [{
                name: 'Presión Entrada',
                data: data.up,
                markLine: {
                    data: [{ yAxis: Math.max(...data.up) * 0.8, label: { formatter: 'Alta' } }, { yAxis: AppState.minimoContractual, label: { formatter: 'Mínimo Contractual' } }]
                }
            }]
        });
    }
}

// Ajustar rango de tiempo usando EMBED
function setRangoDeTiempo(dias = 1) {
    if (!startDateGlobal || !endDateGlobal) {
        return console.error('startDateGlobal y endDateGlobal necesarios');
    }

    const ahora = new Date();
    const fechaInicio = new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000);

    EMBED.submitTarget(startDateGlobal, fechaInicio.toISOString().split('.')[0]);
    EMBED.submitTarget(endDateGlobal, ahora.toISOString().split('.')[0]);

    console.log(`Rango de tiempo actualizado a ${dias} día(s)`);
}

// Manejo de botones
function actualizarBotonActivo(botonActivo) {
    // Quitar la clase 'active' de todos los botones
    $boton24h.removeClass('active');
    $boton7d.removeClass('active');
    $boton14d.removeClass('active');
    $boton30d.removeClass('active');
    
    // Agregar la clase 'active' solo al botón seleccionado
    $(botonActivo).addClass('active');
}

// Inicializar botones
function inicializarBotones() {
    $boton24h.on('click', function () {
        actualizarBotonActivo(this);
        setRangoDeTiempo(1);
    });

    $boton7d.on('click', function () {
        actualizarBotonActivo(this);
        setRangoDeTiempo(7);
    });

    $boton14d.on('click', function () {
        actualizarBotonActivo(this);
        setRangoDeTiempo(14);
    });

    $boton30d.on('click', function () {
        actualizarBotonActivo(this);
        setRangoDeTiempo(30);
    });

    // Estado inicial CORRECTO
    actualizarBotonActivo($boton24h[0]);
    setRangoDeTiempo(1);
}

// Inicializar gráfico y botones
export function initChart() {
    createPressureChart();
    inicializarBotones();

    // Suscribirse a cambios de datos
    if (inputPEntradaHist && EMBED.fieldTypeIsQuery && EMBED.fieldTypeIsQuery(inputPEntradaHist)) {
        EMBED.subscribeFieldToQueryChange(inputPEntradaHist, queryResult => {
            if (!queryResult) return;
            console.log('Datos de Presión de Entrada recibidos:', queryResult);
            updatePressureChart(queryResult);
        });
    }
}