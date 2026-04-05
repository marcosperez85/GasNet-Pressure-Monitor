import { DOM } from './dom';
// Asegurémonos de que esta función exista o modifiquemos la importación
import { seleccionarPuntoPorId } from './sidebar';

let mapInstance = null;
let dataPendiente = null;
let polylinesMap = {};
let polylines = [];
let mapScriptLoaded = false;
let geoJsonCargado = false;

function limpiarLineas() {
    polylines.forEach(line => line.setMap(null));
    polylines = [];
    polylinesMap = {};
}

function initMap() {
    console.log("Inicializando mapa...");

    // Restauramos el estilo completo para mejor visibilidad
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
    } catch (e) {
        console.error("Error al inicializar el mapa:", e);
        return;
    }

    google.maps.event.addListenerOnce(mapInstance, 'tilesloaded', () => {
        console.log("Mapa completamente cargado (tiles loaded)");
        if (dataPendiente) {
            console.log("Detectado GeoJSON pendiente, cargando en 300ms...");
            setTimeout(() => {
                cargarGeoJSON(dataPendiente.url, dataPendiente.dataProcesada);
                dataPendiente = null;
            }, 300);
        }
    });
}

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

    window.initMap = function () {
        console.log("Google Maps API cargada correctamente");
        initMap();
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initMap&loading=async`;
    script.async = true;
    script.defer = true;

    script.onerror = function () {
        console.error('Error al cargar Google Maps API');
        mapScriptLoaded = false;
    };

    document.head.appendChild(script);
}

export function cargarGeoJSON(url, dataProcesada) {
    if (!mapInstance) {
        console.warn("Mapa aún no inicializado → guardo datos");
        dataPendiente = { url, dataProcesada };
        return;
    }

    if (geoJsonCargado) {
        console.log("GeoJSON ya cargado → solo actualizo colores");
        actualizarColores(dataProcesada);
        return;
    }

    // Limpiar líneas existentes
    limpiarLineas();
    
    console.log("Iniciando carga de GeoJSON desde:", url);
    
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
    progressIndicator.innerText = 'Cargando GeoJSON...';
    DOM.map.appendChild(progressIndicator);

    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Error HTTP: ${res.status}`);
            }
            return res.json();
        })
        .then(geojson => {
            console.log("GeoJSON descargado:", geojson);
            
            if (!geojson.features || !geojson.features.length) {
                console.warn("GeoJSON no contiene features");
                progressIndicator.remove();
                return;
            }
            
            console.log(`Procesando ${geojson.features.length} features`);

            // Procesar en lotes para evitar bloquear el navegador
            const batchSize = 10;
            const totalFeatures = geojson.features.length;
            let processedFeatures = 0;

            function processBatch(startIndex) {
                const endIndex = Math.min(startIndex + batchSize, totalFeatures);
                
                for (let i = startIndex; i < endIndex; i++) {
                    const feature = geojson.features[i];
                    
                    if (!feature.geometry) {
                        console.warn("Feature sin geometría:", feature);
                        continue;
                    }

                    const id = feature.properties?.id || feature.properties?.ID || `feature_${i}`;
                    const name = feature.properties?.name || feature.properties?.NAME || `Feature ${i}`;

                    console.log(`Procesando feature: ${name} (ID: ${id}), tipo: ${feature.geometry.type}`);

                    let path = [];

                    if (feature.geometry.type === "LineString") {
                        path = feature.geometry.coordinates.map(c => ({
                            lng: c[0],
                            lat: c[1]
                        }));
                        
                        if (path.length > 0) {
                            crearLinea(path, id, dataProcesada, name);
                        }
                    }

                    if (feature.geometry.type === "MultiLineString") {
                        feature.geometry.coordinates.forEach((segment, segIndex) => {
                            const segmentId = `${id}_segment_${segIndex}`;
                            const subPath = segment.map(c => ({
                                lng: c[0],
                                lat: c[1]
                            }));
                            
                            if (subPath.length > 0) {
                                crearLinea(subPath, segmentId, dataProcesada, `${name} - Segment ${segIndex}`);
                            }
                        });
                    }
                }

                processedFeatures += (endIndex - startIndex);
                const progress = Math.floor((processedFeatures / totalFeatures) * 100);
                progressIndicator.innerText = `Cargando GeoJSON: ${progress}%`;

                if (endIndex < totalFeatures) {
                    // Programar el siguiente lote
                    setTimeout(() => processBatch(endIndex), 0);
                } else {
                    // Terminado
                    setTimeout(() => {
                        progressIndicator.remove();
                        console.log(`GeoJSON procesado: ${polylines.length} líneas creadas`);
                        geoJsonCargado = true;
                    }, 500);
                }
            }

            // Iniciar procesamiento por lotes
            processBatch(0);
        })
        .catch(err => {
            console.error("Error al cargar o procesar GeoJSON:", err);
            progressIndicator.innerText = `Error: ${err.message}`;
            setTimeout(() => progressIndicator.remove(), 3000);
        });
}

function crearLinea(path, id, dataProcesada, name) {
    if (!path || path.length < 2) {
        console.warn(`Path inválido para línea ID: ${id}`, path);
        return;
    }

    const color = obtenerColorPorPresion(id, dataProcesada);

    try {
        const polyline = new google.maps.Polyline({
            path,
            strokeColor: color,
            strokeWeight: 3,
            strokeOpacity: 1,
            map: mapInstance
        });

        polylines.push(polyline);
        polylinesMap[id] = polyline;

        // Añadir tooltip con el nombre
        const tooltip = new google.maps.InfoWindow({
            content: `<div style="color: #333; padding: 5px;">${name || id}</div>`
        });

        polyline.addListener('click', () => {
            console.log("Click en tramo:", id);
            
            // Mostrar tooltip
            tooltip.setPosition(path[Math.floor(path.length / 2)]);
            tooltip.open(mapInstance);
            
            // Resaltar la línea
            resaltarTramo(id);
            
            // Si existe la función, llamarla
            if (typeof window.seleccionarPuntoPorId === 'function') {
                window.seleccionarPuntoPorId(id);
            }
        });
    } catch (error) {
        console.error(`Error al crear polyline para ID: ${id}`, error);
    }
}

function obtenerColorPorPresion(id, dataProcesada) {
    const punto = dataProcesada[id];
    if (!punto) {
        console.log(`No hay datos de presión para ID: ${id}`);
        return "#999"; // gris
    }

    const p = punto.pressure;
    if (!p && p !== 0) {
        console.log(`Presión inválida para ID: ${id}: ${p}`);
        return "#999"; // gris
    }

    if (p > 60) return "#4caf50";
    if (p > 45) return "#ff9800";
    return "#f44336";
}

function actualizarColores(dataProcesada) {
    Object.entries(polylinesMap).forEach(([id, line]) => {
        const color = obtenerColorPorPresion(id, dataProcesada);
        line.setOptions({ strokeColor: color });
    });
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
    } else {
        console.warn(`No se encontró el tramo con ID: ${id}`);
    }
}

// Exponer funciones necesarias globalmente
window.resaltarTramo = resaltarTramo;