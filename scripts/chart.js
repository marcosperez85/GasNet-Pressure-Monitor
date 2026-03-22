import { DOM } from './dom';
import { AppState } from './state';

// Objeto para mantener las instancias de los gráficos
let charts = {};

// Función para formatear timestamps
function formatearTimestampHistorico(arrayTimestamps) {
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

// Función para crear un gráfico de presión
function createPressureChart() {
    if (typeof echarts === 'undefined') {
        console.error('La librería ECharts no está cargada.');
        return;
    }

    const chartDom = DOM.chart;
    if (!chartDom) {
        console.error('No se encontró el elemento del DOM para el gráfico.');
        return;
    }

    AppState.trendChart = echarts.init(chartDom);

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function (params) {
                const param = params[0];
                const timestamp = param.axisValueLabel;
                const value = param.value;
                
                let formattedValue = 
                    typeof value === 'number' ? value.toFixed(2) : value;

                return `${timestamp}<br/>${param.marker} ${param.seriesName}: <strong>${formattedValue}</strong>`;
            }
        },
        legend: { data: ['Presión Entrada'], bottom: '0%' },
        
        xAxis: { type: 'category', data: [] },
        
        yAxis: {
            type: 'value',
            name: 'Presión (bar)',
            scale: true,
            axisLabel: {
                formatter: (value) => value.toFixed(2)
            }
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
                lineStyle: {
                    type: 'dashed',
                    color: '#FFA500'
                },
                data: [
                    {
                        yAxis: 80,
                        label: { formatter: 'Alta', position: 'insideEndTop' }
                    },
                    {
                        yAxis: AppState.minimoContractual,
                        label: { formatter: 'Mínimo Contractual', position: 'insideEndTop' }
                    }
                ]
            }
        }]
    };

    AppState.trendChart.setOption(option);
    AppState.trendChart.showLoading();
    
    console.log('Gráfico de presión inicializado correctamente.');
    
    // Asegurar que el gráfico se redimensione cuando cambia el tamaño de la ventana
    window.addEventListener('resize', () => {
        if (AppState.trendChart) {
            AppState.trendChart.resize();
        }
    });
}

// Función para actualizar los datos del gráfico
export function updatePressureChart(data) {
    if (!AppState.trendChart) {
        console.error('El gráfico no está inicializado.');
        return;
    }
    
    // Si recibimos datos en formato de consulta
    if (Array.isArray(data) && data[0] && 'value' in data[0] && 'timestamp' in data[0]) {
        const values = data.map(item => parseFloat(item.value));
        const timestamps = formatearTimestampHistorico(data.map(item => item.timestamp));
        
        const max = Math.max(...values);
        const min = Math.min(...values);
        
        const y20 = min + (max - min) * 0.2;
        const y80 = min + (max - min) * 0.8;
        
        AppState.trendChart.hideLoading();
        
        AppState.trendChart.setOption({
            xAxis: { data: timestamps },
            series: [{
                data: values,
                markLine: {
                    data: [
                        { yAxis: y80, label: { formatter: 'Alta' } },
                        { yAxis: AppState.minimoContractual, label: { formatter: 'Mínimo Contractual' } }
                    ]
                }
            }]
        });
    }
    // Si recibimos datos ya procesados en formato {x, up, down, min}
    else if (typeof data === 'object' && 'x' in data && 'up' in data) {
        AppState.trendChart.hideLoading();
        
        AppState.trendChart.setOption({
            xAxis: { data: data.x },
            series: [
                { 
                    name: 'Presión Entrada',
                    data: data.up,
                    markLine: {
                        data: [
                            { 
                                yAxis: Math.max(...data.up) * 0.8, 
                                label: { formatter: 'Alta' } 
                            },
                            { 
                                yAxis: AppState.minimoContractual, 
                                label: { formatter: 'Mínimo Contractual' } 
                            }
                        ]
                    }
                }
            ]
        });
    }
}

// Función para generar datos de ejemplo
export function generarDatos() {
    const data = { x: [], up: [], down: [], min: [] };
    
    for (let i = 0; i < 24; i++) {
        const hora = i.toString().padStart(2, '0') + ':00';
        data.x.push(hora);
        data.up.push(45 + Math.random() * 2);
        data.down.push(40 + Math.random() * 2);
        data.min.push(AppState.minimoContractual);
    }
    
    return data;
}

// Dado que toISOString devuelve en Zulu (UTC+0), esta función ajusta la fecha a la hora local
function obtenerFechaLocalISO(date) {
    const offset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - offset);
    const isoLocalSinMs = localDate.toISOString().split('.')[0];
    return isoLocalSinMs;
}

// Función para establecer un rango de tiempo (24h por defecto)
function setRangoDeTiempo(startDateField, endDateField, dias = 1) {
    if (!startDateField || !endDateField) {
        console.error('Los campos de fecha de inicio y fin son necesarios');
        return;
    }

    const ahora = new Date();
    const fechaInicio = new Date(ahora.getTime() - (dias * 24 * 60 * 60 * 1000));

    // Envía las nuevas fechas de inicio y fin a la plataforma
    EMBED.submitTarget(startDateField, obtenerFechaLocalISO(fechaInicio));
    EMBED.submitTarget(endDateField, obtenerFechaLocalISO(ahora));
    console.log(`Rango de tiempo actualizado a ${dias} día(s): ${obtenerFechaLocalISO(fechaInicio)} -> ${obtenerFechaLocalISO(ahora)}`);
}

// Función principal para inicializar el gráfico
export function initChart() {
    // Importamos de main.js
    const { inputPEntradaHist, startDateGlobal, endDateGlobal } = require('../src/main.js');
    
    createPressureChart();
    
    // Establecemos un periodo inicial de 24h
    if (startDateGlobal && endDateGlobal) {
        setRangoDeTiempo(startDateGlobal, endDateGlobal);
    }
    
    // Suscribirse a cambios en el query de históricos de presión de entrada
    if (inputPEntradaHist && EMBED.fieldTypeIsQuery && EMBED.fieldTypeIsQuery(inputPEntradaHist)) {
        EMBED.subscribeFieldToQueryChange(inputPEntradaHist, function (queryResult) {
            console.log("Datos de Presión de Entrada recibidos:", queryResult);
            if (!queryResult) return;
            
            updatePressureChart(queryResult);
        });
    } else {
        // Si no hay datos reales disponibles, cargamos datos de ejemplo
        const datosEjemplo = generarDatos();
        updatePressureChart(datosEjemplo);
    }
}

// Exportamos las funciones necesarias
export { formatearTimestampHistorico };