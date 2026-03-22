document.addEventListener('DOMContentLoaded', async () => {

    await cargarDatos();

    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap();

});