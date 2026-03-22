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
    currentPeriod: 'day'
};

// =========================
// DOM CACHE
// =========================
const DOM = {
    datetimePicker: document.getElementById("datetimePicker"),
    presionUpstream: document.getElementById("presionDeEntradaUpstream"),
    presionDownstream: document.getElementById("presionDeEntradaDownstream"),
    variacion: document.getElementById("variacionDePresion"),
    presionFutura: document.getElementById("presionFutura"),
    minimo: document.getElementById("minimoContractual"),
    tiempoRestante: document.getElementById("tiempoRestante"),

    segmentList: document.getElementById('segmentList'),
    noSelection: document.getElementById('noSelectionMessage'),

    chart: document.getElementById('trendChart'),
    map: document.getElementById('map')
};

// =========================
// DATA
// =========================
const MEASUREMENT_POINTS = {
    'Mar del Plata': [
        { title: 'Sistema Tandil - MDP', subtitle: 'Conexión regional', linepack: '7.2 Sm3', pressure: '46.3 bar' },
        { title: 'Sistema de la Costa', subtitle: 'Distribución costera', linepack: '5.8 Sm3', pressure: '42.5 bar' },
        { title: 'Sistema Balcarce', subtitle: 'Nodo secundario', linepack: '4.9 Sm3', pressure: '38.7 bar' },
        { title: 'Sistema MDP Ciudad', subtitle: 'Distribución urbana', linepack: '6.4 Sm3', pressure: '44.1 bar' }
    ]
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
// DATA LOGIC
// =========================
function buscarDatosPorFecha() {
    if (!AppState.selectedDateTime) return null;

    let closest = null;
    let diffMin = Infinity;

    AppState.dataset.forEach(reg => {
        const diff = Math.abs(new Date(AppState.selectedDateTime) - new Date(reg.timestamp));
        if (diff < diffMin) {
            diffMin = diff;
            closest = reg;
        }
    });

    return closest;
}

function actualizarValores() {
    const d = buscarDatosPorFecha();
    if (!d) return;

    const up = +d.upstream_point.value;
    const down = +d.downstream_point.value;
    const varp = +d.prediction.value;

    DOM.presionUpstream.textContent = up.toFixed(2) + " kg/cm²";
    DOM.presionDownstream.textContent = down.toFixed(2) + " kg/cm²";
    DOM.variacion.textContent = varp.toFixed(2) + " kg/cm²";
    DOM.presionFutura.textContent = (up + varp).toFixed(2) + " kg/cm²";
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

    DOM.minimo.textContent = AppState.minimoContractual;

    await cargarDatos();

    setupDistributionZones();
    setupNavigation();
    initChart();
    loadMap();

    DOM.datetimePicker.addEventListener('change', function () {
        AppState.selectedDateTime = this.value;
        actualizarValores();
    });
});