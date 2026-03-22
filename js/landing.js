// =========================
// CONFIG
// =========================
if (typeof CONFIG === 'undefined' || !CONFIG.GOOGLE_MAPS_API_KEY) {
    console.error('Falta config.js');
    alert('Falta config.js');
}

const DATA_URL = './data/dataset_2022-2025.json';

// =========================
// STATE
// =========================
const AppState = {
    dataset: [],
    selectedDateTime: null,
    minimoContractual: 42,
    trendChart: null,
};

// =========================
// DOM CACHE
// =========================
const DOM = {
    segmentList: document.getElementById('segmentList'),
    noSelection: document.getElementById('noSelectionMessage'),

    chart: document.getElementById('trendChart'),
    map: document.getElementById('map')
};

// =========================
// DATA
// =========================
const MEASUREMENT_POINTS = {
    // UNIDADES DE NEGOCIO Y PUNTOS DE MEDICIÓN DE DISTRIBUIDORA PAMPEANA
    'Bahía Blanca': [
        { title: 'Bahía Blanca', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Pigüé', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Industrias', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' },
        { title: 'TGS', subtitle: 'Distribución urbana', linepack: '6.4 Sm3', pressure: '44.1 bar' }
    ],
    'Buenos Aires Centro': [
        { title: 'Puntos TGS', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Plantas Propias', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Industrias', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' },
        { title: 'Compresora El Chourrón', subtitle: 'Distribución urbana', linepack: '6.4 Sm3', pressure: '44.1 bar' }
    ],
    'Buenos Aires Norte': [
        { title: 'CO Chivilcoy', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'CO Lobos', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' }
    ],
    'Buenos Aires Sur': [
        { title: 'CO Necochea', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'CO Tres Arroyos', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' }
    ],
    'La Pampa': [
        { title: 'Pampeano Norte', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Pampeano Sur', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Medanito', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' }
    ],
    'La Plata': [
        { title: 'Sistema Tandil - MDP', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Sistema de la Costa', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Sistema Balcarce', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' },
        { title: 'Sistema MDP Ciudad', subtitle: 'Distribución urbana', linepack: '6.4 Sm3', pressure: '44.1 bar' }
    ],
    'Mar del Plata': [
        { title: 'Despacho Pantalla 1', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Despacho Pantalla 2', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' }
    ],

    // UNIDADES DE NEGOCIO Y PUNTOS DE MEDICIÓN DE DISTRIBUIDORA DEL SUR
    'Andina': [
        { title: '088 - Cordillerano', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' }
    ],
    'Comodoro Rivadavia': [
        { title: 'Comodoro Rivadavia', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Despacho Comodoro Rivadavia', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' }
    ],
    'De los Lagos': [
        { title: 'Cordillero Patagónico', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Región Sur', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Puntos de Medición Iridium', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' }
    ],
    'Del Comahue': [
        { title: 'Del Comahue 1- Zona 1 - Neuquén', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Del Comahue 1 - Zona 2 - Río Negro', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Del Comahue 2', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' },
        { title: 'Del Comahue 3', subtitle: 'Distribución urbana', linepack: '6.4 Sm3', pressure: '44.1 bar' },
        { title: 'Del Comahue 4', subtitle: 'Distribución urbana', linepack: '3.4 Sm3', pressure: '40.3 bar' }
    ],
    'Patagonia Norte': [
        { title: 'Patagonia Norte', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' }
    ],
    'Península': [
        { title: 'Península', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' }
    ],
    'Santa Cruz Sur': [
        { title: 'Santa Cruz Sur', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' }
    ],
    'Tierra del Fuego': [
        { title: 'Sistema Fueguino', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' }
    ],
};

// =========================
// DATA LOAD
// =========================
async function cargarDatos() {
    const res = await fetch(DATA_URL);
    AppState.dataset = await res.json();
}

// =========================
// SIDEBAR
// =========================
function createSegmentItem(point) {
    const item = document.createElement('div');
    item.className = 'segmentItem';

    const title = document.createElement('div');
    title.className = 'segmentTitle';
    title.textContent = point.title;

    const subtitle = document.createElement('div');
    subtitle.className = 'segmentSubtitle';
    subtitle.textContent = point.subtitle;

    const metrics = document.createElement('div');
    metrics.className = 'segmentMetrics';

    const lp = document.createElement('div');
    lp.innerHTML = `<div class="metricLabel">Line Pack</div><div class="metricValue">${point.linepack}</div>`;

    const pr = document.createElement('div');
    pr.innerHTML = `<div class="metricLabel">Pressure</div><div class="metricValue">${point.pressure}</div>`;

    metrics.append(lp, pr);
    item.append(title, subtitle, metrics);

    setTimeout(() => item.style.opacity = 1, 50);

    return item;
}

function updateMeasurementPoints(unit) {
    if (MEASUREMENT_POINTS[unit]) {
        DOM.noSelection.classList.add('hidden');
        DOM.segmentList.classList.remove('hidden');
        DOM.segmentList.innerHTML = '';

        MEASUREMENT_POINTS[unit].forEach(p => {
            DOM.segmentList.appendChild(createSegmentItem(p));
        });
    } else {
        DOM.noSelection.classList.remove('hidden');
        DOM.segmentList.classList.add('hidden');
    }
}

// =========================
// DISTRIBUTION UI
// =========================
function setupDistributionZones() {
    // Toggle functionality for distribution buttons
    const pampeanaButton = document.getElementById('camuzziGasPampeana');
    const surButton = document.getElementById('camuzziGasDelSur');
    const pampeanaSegments = document.querySelector('.pampeana-segments');
    const surSegments = document.querySelector('.sur-segments');

    if (pampeanaButton) {
        pampeanaButton.addEventListener('click', function () {
            pampeanaSegments.classList.toggle('active');
            // Update chevron icon
            const icon = this.querySelector('i');
            if (pampeanaSegments.classList.contains('active')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        });
    }

    if (surButton) {
        surButton.addEventListener('click', function () {
            surSegments.classList.toggle('active');
            // Update chevron icon
            const icon = this.querySelector('i');
            if (surSegments.classList.contains('active')) {
                icon.classList.remove('fa-chevron-down');
                icon.classList.add('fa-chevron-up');
            } else {
                icon.classList.remove('fa-chevron-up');
                icon.classList.add('fa-chevron-down');
            }
        });
    }

    // Zone segment click handlers
    document.querySelectorAll('.zoneSegment').forEach(seg => {
        seg.addEventListener('click', function () {
            document.querySelectorAll('.zoneSegment').forEach(s => s.classList.remove('active'));
            this.classList.add('active');

            updateMeasurementPoints(this.textContent.trim());
        });
    });
}

// =========================
// CHART (ECHARTS)
// =========================
function generarDatos() {
    const data = { x: [], up: [], down: [], min: [] };

    for (let i = 0; i < 24; i++) {
        data.x.push(i);
        data.up.push(45 + Math.random() * 2);
        data.down.push(40 + Math.random() * 2);
        data.min.push(AppState.minimoContractual);
    }

    return data;
}

function initChart() {
    AppState.trendChart = echarts.init(DOM.chart);

    const d = generarDatos();

    AppState.trendChart.setOption({
        xAxis: { type: 'category', data: d.x },
        yAxis: { type: 'value' },
        series: [
            { data: d.up, type: 'line' },
            { data: d.down, type: 'line' },
            { data: d.min, type: 'line' }
        ]
    });
}

// =========================
// MAP
// =========================

function initMap() {
    // Dark mode styling for Google Maps
    const darkMapStyle = [
        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
        {
            featureType: "administrative.locality",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "poi.park",
            elementType: "geometry",
            stylers: [{ color: "#263c3f" }],
        },
        {
            featureType: "poi.park",
            elementType: "labels.text.fill",
            stylers: [{ color: "#6b9a76" }],
        },
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [{ color: "#38414e" }],
        },
        {
            featureType: "road",
            elementType: "geometry.stroke",
            stylers: [{ color: "#212a37" }],
        },
        {
            featureType: "road",
            elementType: "labels.text.fill",
            stylers: [{ color: "#9ca5b3" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry",
            stylers: [{ color: "#746855" }],
        },
        {
            featureType: "road.highway",
            elementType: "geometry.stroke",
            stylers: [{ color: "#1f2835" }],
        },
        {
            featureType: "road.highway",
            elementType: "labels.text.fill",
            stylers: [{ color: "#f3d19c" }],
        },
        {
            featureType: "transit",
            elementType: "geometry",
            stylers: [{ color: "#2f3948" }],
        },
        {
            featureType: "transit.station",
            elementType: "labels.text.fill",
            stylers: [{ color: "#d59563" }],
        },
        {
            featureType: "water",
            elementType: "geometry",
            stylers: [{ color: "#17263c" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.fill",
            stylers: [{ color: "#515c6d" }],
        },
        {
            featureType: "water",
            elementType: "labels.text.stroke",
            stylers: [{ color: "#17263c" }],
        },
    ];

    const map = new google.maps.Map(DOM.map, {
        center: { lat: -37.35, lng: -59.09 },
        zoom: 7,
        styles: darkMapStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
    });

    const locations = [
        { lat: -38.006, lng: -57.551, title: "Mar del Plata", icon: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png' },
        { lat: -38.715, lng: -62.265, title: "Bahía Blanca", icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
        { lat: -34.921, lng: -57.954, title: "La Plata", icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
    ];

    // Create an info window to share between markers
    const infoWindow = new google.maps.InfoWindow();

    locations.forEach(loc => {
        const marker = new google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map: map,
            title: loc.title,
            icon: loc.icon || 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });

        marker.addListener('click', () => {
            // Set content and open info window
            infoWindow.setContent(`<div style="color: #333; padding: 5px;"><b>${loc.title}</b><br>Distribuidora: Camuzzi Gas Pampeana</div>`);
            infoWindow.open(map, marker);

            // Update measurement points
            updateMeasurementPoints(loc.title);

            // Highlight the corresponding zone segment in the sidebar
            document.querySelectorAll('.zoneSegment').forEach(seg => {
                if (seg.textContent.trim() === loc.title) {
                    document.querySelectorAll('.zoneSegment').forEach(s => s.classList.remove('active'));
                    seg.classList.add('active');

                    // Ensure parent is expanded
                    const parent = seg.closest('.zoneSegments');
                    if (parent && !parent.classList.contains('active')) {
                        parent.classList.add('active');

                        // Update the chevron icon
                        const button = parent.previousElementSibling;
                        if (button) {
                            const icon = button.querySelector('i');
                            if (icon) {
                                icon.classList.remove('fa-chevron-down');
                                icon.classList.add('fa-chevron-up');
                            }
                        }
                    }
                }
            });
        });
    });
}


function loadMap() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initMap`;
    script.async = true;
    window.initMap = initMap;
    document.head.appendChild(script);
}

// =========================
// NAVIGATION
// =========================
function setupNavigation() {
    document.querySelectorAll('.navButton').forEach(btn => {
        btn.addEventListener('click', function () {
            if (this.textContent.includes('Camu')) {
                window.location.href = './chatbot/index.html';
            }
        });
    });
}

// =========================
// INIT
// =========================
document.addEventListener('DOMContentLoaded', async () => {

    await cargarDatos();

    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap();
});