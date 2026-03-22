let rootElement = EMBED.getRootElement();
let data = EMBED.getComponent().schema.data;

const GOOGLE_MAPS_API_KEY = data.GOOGLE_MAPS_API_KEY;
const API_GATEWAY_URL = data.API_GATEWAY_URL;


$(document).ready(async function() {
        
    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap();
    
});