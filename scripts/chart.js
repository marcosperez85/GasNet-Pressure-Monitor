import { DOM } from './dom';
import { AppState } from './state';
import {
    inputPEntradaUpHist,
    inputPEntradaDownHist,
    inputCaudalHist,
    startDateGlobal,
    endDateGlobal,
    $boton24h,
    $boton7d,
    $boton14d,
    $boton30d
} from '../src/main.js';

// ==============================
// 🧠 CÁLCULOS
// ==============================

function calcularArea(D) {
    return Math.PI * Math.pow(D, 2) / 4;
}

function calcularLinepack(P, config) {
    const { D, L, Z, T, R } = config;
    const A = calcularArea(D);

    return (P * A * L) / (Z * R * T);
}

function calcularAutonomia(LP, Q) {
    if (!Q || Q === 0) return null;
    return LP / Q;
}

// ==============================
// 🕒 FORMATOS
// ==============================

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

// ==============================
// 📊 GRÁFICO
// ==============================

function createLinepackChart() {
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
            formatter: function (params) {
                // Arreglamos el tooltip para mostrar ambas series
                let result = params[0].axisValueLabel + '<br/>';

                // Iteramos sobre cada serie en el tooltip
                params.forEach(param => {
                    let value = param.value;
                    let formattedValue = value !== null && value !== undefined
                        ? value.toFixed(2)
                        : 'N/A';

                    result += `${param.marker} ${param.seriesName}: <strong>${formattedValue}</strong><br/>`;
                });

                return result;
            }
        },
        legend: {
            data: ['Linepack', 'Autonomía'],
            top: '10px', // Movemos la leyenda a la parte superior
            right: '10%',  // La alineamos a la derecha
            textStyle: {
                color: '#e0e0e0' // Mejor contraste
            },
            backgroundColor: 'rgba(42, 46, 53, 0.7)', // Fondo semi-transparente
            borderRadius: 4,
            padding: 5
        },
        xAxis: {
            type: 'category',
            data: [],
            axisLine: {
                lineStyle: { color: '#e0e0e0' }
            },
            axisLabel: {
                color: '#e0e0e0',
                fontSize: 12
            },
            nameTextStyle: {
                color: '#e0e0e0'
            }
        },
        yAxis: [
            {
                type: 'value',
                name: 'Linepack',
                scale: true,
                axisLine: {
                    lineStyle: { color: '#e0e0e0' }
                },
                axisLabel: {
                    color: '#e0e0e0',
                    fontSize: 12
                },
                nameTextStyle: {
                    color: '#ff8c00',
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        color: '#ff8c00' // Color para líneas de Linepack
                    }
                }
            },
            {
                type: 'value',
                name: 'Autonomía',
                scale: true,
                axisLine: {
                    lineStyle: { color: '#e0e0e0' }
                },
                axisLabel: {
                    color: '#e0e0e0',
                    fontSize: 12
                },
                nameTextStyle: {
                    color: '#4caf50',
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        color: '#4caf50' // Color para líneas de Autonomía
                    }
                }
            }
        ],
        dataZoom: [
            { type: 'inside', start: 0, end: 100 },
            { start: 0, end: 100 }
        ],
        series: [
            {
                name: 'Linepack',
                type: 'line',
                data: [],
                smooth: true,
                itemStyle: {
                    color: '#ff8c00' // Color para Linepack
                }
            },
            {
                name: 'Autonomía',
                type: 'line',
                yAxisIndex: 1,
                data: [],
                smooth: true,
                itemStyle: {
                    color: '#4caf50' // Color para Autonomía
                }
            }
        ]
    };

    AppState.trendChart.setOption(option);
    AppState.trendChart.showLoading();

    window.addEventListener('resize', () => {
        if (AppState.trendChart) AppState.trendChart.resize();
    });

    console.log('Gráfico de Linepack inicializado.');
}

// ==============================
// 🔄 ACTUALIZACIÓN
// ==============================

let bufferPresionUp = null;
let bufferPresionDown = null;
let bufferCaudal = null;

function intentarActualizarGrafico() {
    if (!bufferPresionUp || !bufferPresionDown || !bufferCaudal) return;

    const presionesUp = bufferPresionUp;
    const presionesDown = bufferPresionDown;
    const caudales = bufferCaudal;

    const timestamps = formatearTimestampHistorico(
        presionesUp.map(p => p.timestamp)
    );

    const linepackValues = [];
    const autonomiaValues = [];

    for (let i = 0; i < presionesUp.length; i++) {
        const P_up = parseFloat(presionesUp[i]?.value);
        const P_down = parseFloat(presionesDown[i]?.value);
        const Q = parseFloat(caudales[i]?.value);

        // 🔥 Promedio correcto
        const P_prom = (P_up + P_down) / 2;

        if (!AppState.selectedPoint) return;
        const config = AppState.selectedPoint.config;
        const LP = calcularLinepack(P_prom, config);
        const t = calcularAutonomia(LP, Q);

        linepackValues.push(LP);
        autonomiaValues.push(t);
    }

    AppState.trendChart.hideLoading();

    AppState.trendChart.setOption({
        xAxis: { data: timestamps },
        series: [
            { name: 'Linepack', data: linepackValues },
            { name: 'Autonomía', data: autonomiaValues }
        ]
    });
}

// ==============================
// ⏱ RANGO DE TIEMPO
// ==============================

function setRangoDeTiempo(dias = 1) {
    if (!startDateGlobal || !endDateGlobal) return;

    const ahora = new Date();
    const inicio = new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000);

    EMBED.submitTarget(startDateGlobal, inicio.toISOString().split('.')[0]);
    EMBED.submitTarget(endDateGlobal, ahora.toISOString().split('.')[0]);
}

function actualizarBotonActivo(botonActivo) {
    $boton24h.removeClass('active');
    $boton7d.removeClass('active');
    $boton14d.removeClass('active');
    $boton30d.removeClass('active');
    $(botonActivo).addClass('active');
}

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

    actualizarBotonActivo($boton24h[0]);
    setRangoDeTiempo(1);
}

// ==============================
// 🚀 INIT
// ==============================

export function initChart() {
    createLinepackChart();
    inicializarBotones();

    // Inicialmente el chart está invisible hasta que se selecciona un punto
    toggleChartVisibility(false);

    // Presión upstream
    if (inputPEntradaUpHist && EMBED.fieldTypeIsQuery(inputPEntradaUpHist)) {
        EMBED.subscribeFieldToQueryChange(inputPEntradaUpHist, data => {
            bufferPresionUp = data;
            intentarActualizarGrafico();
         });
    }

    // Presión downstream
    if (inputPEntradaDownHist && EMBED.fieldTypeIsQuery(inputPEntradaDownHist)) {
        EMBED.subscribeFieldToQueryChange(inputPEntradaDownHist, data => {
            bufferPresionDown = data;
            intentarActualizarGrafico();
        });
    }

    // Caudal
    if (inputCaudalHist && EMBED.fieldTypeIsQuery(inputCaudalHist)) {
        EMBED.subscribeFieldToQueryChange(inputCaudalHist, data => {
            bufferCaudal = data;
            intentarActualizarGrafico();
        });
    }
}

// ==============================
// 🚀 VISIBILIDAD DEL CHART
// ==============================

function toggleChartVisibility(show) {
    const chartPanel = document.querySelector('.chartPanel');

    if (show) {
        chartPanel.classList.remove('noExiste');
    } else {
        chartPanel.classList.add('noExiste');
    }
}

window.refrescarGrafico = () => {
    intentarActualizarGrafico();
};