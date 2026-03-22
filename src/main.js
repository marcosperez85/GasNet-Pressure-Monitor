import { setupDistributionZones } from '../scripts/sidebar.js';
import { setupNavigation } from '../scripts/navigation.js';
import { initChart } from '../scripts/chart.js';
import { loadMap } from '../scripts/map.js';

let rootElement = EMBED.getRootElement();
let data = EMBED.getComponent().schema.data;

export const $GOOGLE_MAPS_API_KEY = data.GOOGLE_MAPS_API_KEY.manual;

$(document).ready(async function() {
        
    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap($GOOGLE_MAPS_API_KEY);
    
});