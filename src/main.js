import { setupDistributionZones } from '../scripts/sidebar.js';
import { setupNavigation } from '../scripts/navigation.js';
import { initChart } from '../scripts/chart.js';
import { loadMap } from '../scripts/map.js';

let rootElement = EMBED.getRootElement();
let data = EMBED.getComponent().schema.data;

// Exportar variables directamente para otros módulos
export const $GOOGLE_MAPS_API_KEY = data.GOOGLE_MAPS_API_KEY.manual;
export const inputPEntradaHist = data.inputPEntradaHist;
export const inputCaudalHist = data.inputCaudalHist;
export const startDateGlobal = data.startDateGlobal;
export const endDateGlobal = data.endDateGlobal;

// Botones de rango de tiempo
export const $boton24h = rootElement.find("#boton24h");
export const $boton7d = rootElement.find("#boton7d");
export const $boton14d = rootElement.find("#boton14d");
export const $boton30d = rootElement.find("#boton30d");

$(document).ready(async function () {
    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap($GOOGLE_MAPS_API_KEY);
});