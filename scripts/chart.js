import { DOM } from './dom';
import { AppState } from './state';
import {
    calcularPresionPromedio,
    calcularLinepack,
    calcularAutonomia,
    escalarLinepack
} from './calcularLinepack';
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
                let result = params[0].axisValueLabel + '<br/>';

                params.forEach(p => {
                    let value = p.value !== null && p.value !== undefined
                        ? p.value.toFixed(2)
                        : 'N/A';

                    result += `${p.marker} ${p.seriesName}: <strong>${value}</strong><br/>`;
                });

                return result;
            }
        },
        legend: {
            data: ['Linepack', 'Autonomía'],
            top: '10px',
            right: '10%',
            textStyle: {
                color: '#e0e0e0'
            },
            backgroundColor: 'rgba(42, 46, 53, 0.7)',
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
                name: 'Linepack (Sm³ x 10⁷)',
                scale: true,
                axisLine: {
                    lineStyle: { color: '#e0e0e0' }
                },
                axisLabel: {
                    color: '#e0e0e0',
                    fontSize: 12
                },
                nameTextStyle: {
                    color: '#e0e0e0',
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                splitLine: {
                    lineStyle: {
                        type: 'dashed',
                        color: '#a1a1a1'
                    }
                }
            },
            {
                type: 'value',
                name: 'Autonomía (h)',
                scale: true,
                axisLine: {
                    lineStyle: { color: '#a1a1a1' }
                },
                axisLabel: {
                    color: '#a1a1a1',
                    fontSize: 12
                },
                nameTextStyle: {
                    color: '#a1a1a1',
                    fontSize: 14,
                    fontWeight: 'bold'
                },
                splitLine: {
                    show: false
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
                yAxisIndex: 0,
                itemStyle: { color: '#356dfa' },

                markLine: {
                    silent: true,
                    symbol: 'none',
                    lineStyle: {
                        width: 2
                    },
                    data: [
                        {
                            yAxis: 4.7,
                            lineStyle: { color: '#4caf50' },
                            label: {
                                formatter: 'LP Medio',
                                color: '#e0e0e0',
                                position: 'start',   // Separación del eje Y
                                distance: 25   // Separación del eje Y
                            }
                        },
                        {
                            yAxis: 3.8,
                            lineStyle: { color: '#f44336' },
                            label: {
                                formatter: 'LP Crítico',
                                color: '#e0e0e0',
                                position: 'start',
                                distance: 25   // Separación del eje Y
                            }
                        }
                    ]
                }
            },
            {
                name: 'Autonomía',
                type: 'line',
                data: [],
                smooth: true,
                yAxisIndex: 1,
                itemStyle: { color: '#be3e2d' }
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

    const timestamps = formatearTimestampHistorico(
        presionesUp.map(p => p.timestamp)
    );

    const linepackValues = [];
    const autonomiaValues = [];

    for (let i = 0; i < presionesUp.length; i++) {
        const P_up = parseFloat(presionesUp[i]?.value);
        const P_down = parseFloat(presionesDown[i]?.value);
        const Q = parseFloat(bufferCaudal[i]?.value);

        if (!AppState.selectedPoint) return;
        const config = AppState.selectedPoint.config;

        // Linepack (igual que antes)
        const P_prom = calcularPresionPromedio(P_up, P_down);
        const LP = calcularLinepack(P_prom, config);

        linepackValues.push(escalarLinepack(LP));

        // 🔥 NUEVO: Autonomía
        const autonomia = calcularAutonomia(LP, Q);

        // manejar nulls para el chart
        autonomiaValues.push(
            autonomia !== null ? autonomia : null
        );
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

    // Caudal (seguimos necesitando los datos para otros cálculos)
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