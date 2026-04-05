import { DOM } from './dom';

let mapInstance = null;
let dataPendiente = null;
let polylinesMap = {};
let polylines = [];
let mapScriptLoaded = false;
let kmlYaCargado = false;

function limpiarLineas() {
    polylines.forEach(line => line.setMap(null));
    polylines = [];
    polylinesMap = {};
}

function initMap() {
    console.log("Inicializando mapa...");

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

    // Inicializar el mapa
    try {
        mapInstance = new google.maps.Map(DOM.map, {
            center: { lat: -37.35, lng: -59.09 },
            zoom: 7,
            styles: darkMapStyle,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true
        });

        console.log("Mapa inicializado correctamente");
    } catch (error) {
        console.error("Error al inicializar el mapa:", error);
        return;
    }

    // Cargar el KML pendiente de forma diferida después de que el mapa esté completamente listo
    google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', () => {
        console.log("Mapa completamente cargado");

        if (dataPendiente) {
            // Usar un setTimeout para dar tiempo al renderizado del mapa
            setTimeout(() => {
                console.log("Cargando KML diferido...");
                cargarKML(dataPendiente.url, dataPendiente.dataProcesada);
                dataPendiente = null;
            }, 500);
        }
    });
}

/**
 * Carga la API de Google Maps con manejo adecuado de async
 * @param {string} apiKey - La clave API para Google Maps
 */

// Solución: cargar el API de Google Maps de forma realmente asíncrona
export function loadMap(apiKey) {
    if (!apiKey) {
        console.error('Cannot load Google Maps: API key is not available');
        return;
    }

    if (mapScriptLoaded) {
        console.warn('Google Maps script already loaded');
        return;
    }

    console.log("Cargando Google Maps API...");
    mapScriptLoaded = true;

    // Configurar la función de callback
    window.initMap = function () {
        console.log("Google Maps API cargada correctamente");
        initMap();
    };

    // Crear el elemento script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;

    script.onerror = function () {
        console.error('Error al cargar Google Maps API');
        mapScriptLoaded = false;
    };

    // Añadirlo al head del documento
    document.head.appendChild(script);
}


export function getMapInstance() {
    return mapInstance;
}

/**
 * Procesa un KML y lo muestra en el mapa
 * @param {string} url - URL del archivo KML
 * @param {object} dataProcesada - Datos procesados con información de presiones
 */
export async function cargarKML(url, dataProcesada) {
    if (!mapInstance) {
        console.warn("Map aún no inicializado → guardo datos");
        dataPendiente = { url, dataProcesada };
        return;
    }

    if (kmlYaCargado) {
        console.log("KML ya cargado → solo actualizo colores");
        actualizarColores(dataProcesada);
        return;
    }

    try {
        // Limpiar líneas existentes
        limpiarLineas();

        // Mostrar progreso
        console.log("Iniciando carga de KML desde:", url);

        // Fetch KML
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const text = await response.text();
        console.log(`KML descargado: ${(text.length / 1024).toFixed(2)} KB`);

        // Parse XML
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, "text/xml");

        // Procesar placemarks
        const placemarks = xml.getElementsByTagName("Placemark");
        console.log(`Placemarks encontrados: ${placemarks.length}`);

        // Variables para el procesamiento por lotes
        const batchSize = 10;
        const totalBatches = Math.ceil(placemarks.length / batchSize);
        let batchesProcessed = 0;

        // Mostrar indicador de progreso
        const progressIndicator = document.createElement('div');
        progressIndicator.style.position = 'absolute';
        progressIndicator.style.top = '10px';
        progressIndicator.style.left = '50%';
        progressIndicator.style.transform = 'translateX(-50%)';
        progressIndicator.style.background = 'rgba(0,0,0,0.7)';
        progressIndicator.style.color = 'white';
        progressIndicator.style.padding = '5px 10px';
        progressIndicator.style.borderRadius = '4px';
        progressIndicator.style.zIndex = '1000';
        progressIndicator.style.fontSize = '12px';
        progressIndicator.innerText = 'Cargando KML: 0%';
        DOM.map.appendChild(progressIndicator);

        // Función para procesar un lote
        const processBatch = (startIndex) => {
            const endIndex = Math.min(startIndex + batchSize, placemarks.length);

            for (let i = startIndex; i < endIndex; i++) {
                // Procesar cada placemark
                const placemark = placemarks[i];
                const id = placemark.getAttribute("id");
                const coordsNode = placemark.getElementsByTagName("coordinates")[0];

                if (!coordsNode) continue;

                // Convertir coordenadas a path
                const coordsText = coordsNode.textContent.trim();
                const path = coordsText
                    .split(/\s+/)
                    .map(coord => {
                        const [lng, lat] = coord.split(",");
                        return { lat: parseFloat(lat), lng: parseFloat(lng) };
                    });

                // Determinar color según presión
                const color = obtenerColorPorPresion(id, dataProcesada);

                // Crear polyline
                const polyline = new google.maps.Polyline({
                    path,
                    geodesic: true,
                    strokeColor: color,
                    strokeOpacity: 1.0,
                    strokeWeight: 3,
                    map: mapInstance
                });

                polylines.push(polyline);
                polylinesMap[id] = polyline;
            }

            // Actualizar progreso
            batchesProcessed++;
            const progress = Math.floor((batchesProcessed / totalBatches) * 100);
            progressIndicator.innerText = `Cargando KML: ${progress}%`;

            // Si hay más por procesar, programar el siguiente lote
            if (endIndex < placemarks.length) {
                requestIdleCallback(() => processBatch(endIndex));
            } else {
                // Completado - eliminar indicador de progreso
                setTimeout(() => {
                    progressIndicator.remove();
                    console.log(`KML procesado completamente: ${polylines.length} líneas`);
                }, 1000);
            }
        };

        // Iniciar el procesamiento
        processBatch(0);

    } catch (error) {
        console.error("Error al cargar o procesar el KML:", error);
    }
    kmlYaCargado = true;
}

/**
 * Determina el color basado en la presión
 * @param {object} dataProcesada - Datos con información de presiones
 * @returns {string} - Color en formato hex
 */
function obtenerColorPorPresion(id, dataProcesada) {
    const punto = dataProcesada[id];

    if (!punto) return "#999";

    const p = punto.pressure;

    if (p > 60) return "#4caf50";
    if (p > 45) return "#ff9800";
    return "#f44336";
}

export function resaltarTramo(id) {
    Object.values(polylinesMap).forEach(line => {
        line.setOptions({ strokeWeight: 3, strokeOpacity: 0.3 });
    });

    const line = polylinesMap[id];

    if (line) {
        line.setOptions({
            strokeWeight: 6,
            strokeOpacity: 1
        });
    }
}

function actualizarColores(dataProcesada) {
    Object.entries(polylinesMap).forEach(([id, line]) => {

        const color = obtenerColorPorPresion(id, dataProcesada);

        line.setOptions({
            strokeColor: color
        });
    });
}

window.resaltarTramo = resaltarTramo;