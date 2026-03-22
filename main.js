let rootElement = EMBED.getRootElement();
let data = EMBED.getComponent().schema.data;

$(document).ready(async function() {
    
    await cargarDatos();
    
    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap();
    
});