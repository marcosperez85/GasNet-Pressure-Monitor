import { setupDistributionZones } from '../scripts/sidebar.js';
import { setupNavigation } from '../scripts/navigation.js';
import { initChart } from '../scripts/chart.js';
import { loadMap } from '../scripts/map.js';

let rootElement = EMBED.getRootElement();
let data = EMBED.getComponent().schema.data;

// Variables traidas del manifest
export const $GOOGLE_MAPS_API_KEY = data.GOOGLE_MAPS_API_KEY.manual;
export const inputPEntradaHist = data.inputPEntradaHist;
export const inputCaudalHist = data.inputCaudalHist;
export const startDateGlobal = data.startDateGlobal;
export const endDateGlobal = data.endDateGlobal;

$(document).ready(async function () {

    // Exportar variables al objeto global para evitar importaciones circulares
    window.GasNetConfig = {
        inputPEntradaHist,
        inputCaudalHist,
        startDateGlobal,
        endDateGlobal
    };

    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap($GOOGLE_MAPS_API_KEY);

});