import { DOM } from './dom';
import { seleccionarPuntoPorId } from './sidebar';

let mapInstance = null;
let dataPendiente = null;
let polylinesMap = {};
let polylines = [];
let mapScriptLoaded = false;
let geoJsonCargado = false;
let indicadorProgreso = null;

// Registrar todos los IDs para facilitar la depuración
const idRegistry = {
    inGeoJSON: [],
    inDataProcessed: []
};


function limpiarLineas() {
    polylines.forEach(line => line.setMap(null));
    polylines = [];
    polylinesMap = {};
}

// Función para normalizar IDs para comparación
function normalizarID(id) {
    if (!id) return '';
    return String(id).trim().toLowerCase();
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

// Crear y mostrar indicador de carga
function mostrarIndicadorCarga() {
    // Si ya existe, solo actualizar visibilidad
    if (indicadorProgreso) {
        indicadorProgreso.style.display = 'block';
        indicadorProgreso.innerText = 'Cargando GeoJSON...';
        return;
    }

    // Crear nuevo indicador
    indicadorProgreso = document.createElement('div');
    indicadorProgreso.style.position = 'absolute';
    indicadorProgreso.style.top = '10px';
    indicadorProgreso.style.left = '50%';
    indicadorProgreso.style.transform = 'translateX(-50%)';
    indicadorProgreso.style.background = 'rgba(0,0,0,0.7)';
    indicadorProgreso.style.color = 'white';
    indicadorProgreso.style.padding = '5px 10px';
    indicadorProgreso.style.borderRadius = '4px';
    indicadorProgreso.style.zIndex = '1000';
    indicadorProgreso.style.fontSize = '12px';
    indicadorProgreso.innerText = 'Cargando GeoJSON...';
    DOM.map.appendChild(indicadorProgreso);
}

// Actualizar porcentaje del indicador de carga
function actualizarIndicadorCarga(porcentaje) {
    if (indicadorProgreso) {
        indicadorProgreso.innerText = `Aplicando estilos: ${porcentaje}%`;
    }
}

// Ocultar indicador de carga
function ocultarIndicadorCarga() {
    if (indicadorProgreso) {
        setTimeout(() => {
            indicadorProgreso.style.display = 'none';
        }, 500);
    }
}

// Extraer información de HTML en properties
function extraerInfoDeHTML(htmlString) {
    try {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlString;
        
        const infoObj = {};
        const rows = tempDiv.querySelectorAll('tr');
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            if (cells.length >= 2) {
                const key = cells[0].textContent.trim();
                const value = cells[1].textContent.trim();
                if (key && value) {
                    infoObj[key] = value;
                }
            }
        });
        
        return infoObj;
    } catch (error) {
        console.error("Error al extraer info de HTML:", error);
        return {};
    }
}

// NUEVA IMPLEMENTACIÓN: Cargar GeoJSON con caché y carga progresiva
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

    limpiarLineas();
    mostrarIndicadorCarga();
    
    // Verificar caché
    const cacheKey = `gasnet_geojson_${url.split('/').pop()}`;
    const cachedData = localStorage.getItem(cacheKey);
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const ahora = new Date().getTime();
    const cacheTiempoValido = 24 * 60 * 60 * 1000; // 24 horas
    
    // Si hay caché válida, usarla para mostrar algo rápido
    if (cachedData && cachedTimestamp && (ahora - parseInt(cachedTimestamp) < cacheTiempoValido)) {
        console.log("Usando GeoJSON en caché");
        const geojson = JSON.parse(cachedData);
        
        // Mostrar rápidamente en gris
        procesarGeoJSONRapido(geojson);
        
        // Luego comenzar a aplicar colores
        setTimeout(() => {
            aplicarColoresProgresivamente(dataProcesada);
            geoJsonCargado = true;
        }, 100);
        
        // Verificar si necesitamos actualizar en segundo plano
        verificarYActualizarCache(url, cacheKey);
    } else {
        // Si no hay caché o está obsoleta, cargar todo
        cargarDesdeServidor(url, dataProcesada, cacheKey);
    }
}


// Cargar GeoJSON directamente desde el servidor
function cargarDesdeServidor(url, dataProcesada, cacheKey) {
    console.log("Cargando GeoJSON desde servidor:", url);
    
    fetch(url)
        .then(res => {
            if (!res.ok) {
                throw new Error(`Error HTTP: ${res.status}`);
            }
            return res.json();
        })
        .then(geojson => {
            console.log("GeoJSON descargado, features:", geojson.features?.length || 0);
            
            // Guardar en caché
            try {
                localStorage.setItem(cacheKey, JSON.stringify(geojson));
                localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
                console.log("GeoJSON guardado en caché local");
            } catch(e) {
                console.warn("No se pudo guardar GeoJSON en caché:", e);
            }
            
            // Mostrar rápido en gris
            procesarGeoJSONRapido(geojson);
            
            // Luego aplicar colores
            setTimeout(() => {
                aplicarColoresProgresivamente(dataProcesada);
                geoJsonCargado = true;
            }, 100);
        })
        .catch(err => {
            console.error("Error al cargar o procesar GeoJSON:", err);
            ocultarIndicadorCarga();
            
            // Mostrar error en mapa
            const errorMsg = document.createElement('div');
            errorMsg.style.position = 'absolute';
            errorMsg.style.top = '50%';
            errorMsg.style.left = '50%';
            errorMsg.style.transform = 'translate(-50%, -50%)';
            errorMsg.style.background = 'rgba(244, 67, 54, 0.8)';
            errorMsg.style.color = 'white';
            errorMsg.style.padding = '15px';
            errorMsg.style.borderRadius = '4px';
            errorMsg.style.zIndex = '1000';
            errorMsg.innerText = `Error al cargar datos: ${err.message}`;
            DOM.map.appendChild(errorMsg);
            
            setTimeout(() => errorMsg.remove(), 5000);
        });
}


// Verificar si es necesario actualizar la caché y hacerlo en segundo plano
function verificarYActualizarCache(url, cacheKey) {
    const cachedTimestamp = localStorage.getItem(`${cacheKey}_timestamp`);
    const ahora = new Date().getTime();
    
    // Si la caché tiene más de 6 horas, actualizarla en segundo plano
    if (!cachedTimestamp || (ahora - parseInt(cachedTimestamp) > 6 * 60 * 60 * 1000)) {
        console.log("Actualizando caché en segundo plano...");
        
        setTimeout(() => {
            fetch(url)
                .then(res => res.json())
                .then(geojson => {
                    try {
                        localStorage.setItem(cacheKey, JSON.stringify(geojson));
                        localStorage.setItem(`${cacheKey}_timestamp`, new Date().getTime().toString());
                        console.log("Caché actualizada en segundo plano");
                    } catch(e) {
                        console.warn("No se pudo actualizar caché:", e);
                    }
                })
                .catch(err => console.warn("Error actualizando caché:", err));
        }, 5000); // Esperar 5 segundos
    }
}


// Procesar GeoJSON rápidamente en gris
function procesarGeoJSONRapido(geojson) {
    console.log("Procesando GeoJSON rápidamente (vista gris)");
    
    // Recolectar todos los IDs disponibles para depuración
    idRegistry.inGeoJSON = [];
    
    if (!geojson.features || !geojson.features.length) {
        console.warn("GeoJSON no contiene features");
        return;
    }
    
    geojson.features.forEach((feature, index) => {
        if (!feature.geometry) return;
        
        // Extraer ID
        const id = feature.id || 
                  feature.properties?.id || 
                  feature.properties?.ID || 
                  feature.properties?.BUDI || 
                  `feature_${index}`;
        
        // Registrar ID
        if (id && !id.toString().startsWith('feature_')) {
            idRegistry.inGeoJSON.push(id);
        }
        
        // Extraer nombre
        const name = feature.properties?.name || 
                    feature.properties?.NAME || 
                    id;
        
        // Extraer información adicional
        let infoAdicional = {};
        if (feature.properties?.description?.value) {
            infoAdicional = extraerInfoDeHTML(feature.properties.description.value);
        }
        
        // Procesar geometría
        if (feature.geometry.type === "LineString") {
            const path = feature.geometry.coordinates.map(c => ({
                lng: c[0],
                lat: c[1]
            }));
            
            if (path.length > 0) {
                crearLineaRapida(path, id, normalizarID(id), name, infoAdicional);
            }
        } else if (feature.geometry.type === "MultiLineString") {
            feature.geometry.coordinates.forEach((segment, segIndex) => {
                const segmentId = `${id}_segment_${segIndex}`;
                const segmentName = `${name} - Segmento ${segIndex}`;
                
                const subPath = segment.map(c => ({
                    lng: c[0],
                    lat: c[1]
                }));
                
                if (subPath.length > 0) {
                    crearLineaRapida(subPath, segmentId, normalizarID(segmentId), segmentName, infoAdicional);
                }
            });
        }
    });
    
    console.log(`Procesado rápido completado: ${polylines.length} líneas`);
    console.log("IDs encontrados en GeoJSON:", idRegistry.inGeoJSON);
}

// Crear línea rápidamente con color gris
function crearLineaRapida(path, id, idNormalizado, name, infoAdicional = {}) {
    if (!path || path.length < 2) return;
    
    try {
        const polyline = new google.maps.Polyline({
            path,
            strokeColor: "#999", // Color gris uniforme
            strokeWeight: 3,
            strokeOpacity: 1,
            map: mapInstance
        });

        polylines.push(polyline);
        polylinesMap[id] = polyline;
        
        // Guardar también con ID normalizado
        if (idNormalizado !== id) {
            polylinesMap[idNormalizado] = polyline;
        }
        
        // Guardar también con BUDI si existe
        if (infoAdicional.BUDI) {
            polylinesMap[infoAdicional.BUDI] = polyline;
            polylinesMap[normalizarID(infoAdicional.BUDI)] = polyline;
        }

        // Preparar tooltip
        let tooltipContent = `<div style="color: #333; padding: 5px;"><strong>${name}</strong>`;
        
        // Agregar info adicional relevante
        if (infoAdicional.BUDI) tooltipContent += `<br>ID: ${infoAdicional.BUDI}`;
        if (infoAdicional.d_Sistema) tooltipContent += `<br>Sistema: ${infoAdicional.d_Sistema}`;
        if (infoAdicional.Diametro) tooltipContent += `<br>Diámetro: ${infoAdicional.Diametro}`;
        if (infoAdicional.Longitud) tooltipContent += `<br>Longitud: ${infoAdicional.Longitud}m`;
        tooltipContent += '</div>';

        const tooltip = new google.maps.InfoWindow({
            content: tooltipContent
        });

        // Añadir eventos
        polyline.addListener('click', () => {
            tooltip.setPosition(path[Math.floor(path.length / 2)]);
            tooltip.open(mapInstance);
            resaltarTramo(id);
            
            if (typeof seleccionarPuntoPorId === 'function') {
                seleccionarPuntoPorId(id);
            }
        });
    } catch (error) {
        console.error(`Error al crear polyline para ID: ${id}`, error);
    }
}

// Aplicar colores progresivamente a las líneas ya creadas
function aplicarColoresProgresivamente(dataProcesada) {
    // Registrar los IDs de datos procesados para depuración
    idRegistry.inDataProcessed = Object.keys(dataProcesada);
    console.log("IDs en dataProcesada:", idRegistry.inDataProcessed);
    
    const ids = Object.keys(polylinesMap);
    const batchSize = 50; // Procesar 50 líneas por lote
    let index = 0;
    
    console.log(`Aplicando colores progresivamente a ${ids.length} líneas`);
    
    function procesarLote() {
        const end = Math.min(index + batchSize, ids.length);
        
        for (let i = index; i < end; i++) {
            const id = ids[i];
            const line = polylinesMap[id];
            
            // Solo procesar si es una línea primaria (no duplicada por normalización)
            if (line && polylines.includes(line)) {
                const color = obtenerColorPorPresion(id, normalizarID(id), dataProcesada);
                line.setOptions({ strokeColor: color });
            }
        }
        
        // Actualizar progreso
        const progreso = Math.round((end / ids.length) * 100);
        actualizarIndicadorCarga(progreso);
        
        // Continuar con el siguiente lote
        index = end;
        if (index < ids.length) {
            setTimeout(procesarLote, 0);
        } else {
            console.log("Aplicación de colores completada");
            ocultarIndicadorCarga();
        }
    }
    
    // Iniciar el proceso
    procesarLote();
}

// Actualizar colores de las líneas existentes
function actualizarColores(dataProcesada) {
    console.log("Actualizando colores con nuevos datos");
    aplicarColoresProgresivamente(dataProcesada);
}

// Resaltar un tramo específico
export function resaltarTramo(id) {
    if (!id) return;
    
    const idNormalizado = normalizarID(id);
    
    // Restaurar todas las líneas a su estado normal
    polylines.forEach(line => {
        if (line && line.setOptions) {
            line.setOptions({ strokeWeight: 3, strokeOpacity: 0.3 });
        }
    });

    // Intentar encontrar la línea por varias coincidencias
    let line = polylinesMap[id] || polylinesMap[idNormalizado];
    
    // Si no se encuentra, buscar por coincidencia parcial
    if (!line) {
        let bestMatchKey = null;
        let bestMatchScore = 0;
        
        Object.keys(polylinesMap).forEach(key => {
            const keyNorm = normalizarID(key);
            let score = 0;
            
            if (keyNorm === idNormalizado) {
                score = 100;
            } else if (keyNorm.includes(idNormalizado) || idNormalizado.includes(keyNorm)) {
                score = Math.min(keyNorm.length, idNormalizado.length) / 
                       Math.max(keyNorm.length, idNormalizado.length) * 90;
            }
            
            if (score > bestMatchScore) {
                bestMatchScore = score;
                bestMatchKey = key;
            }
        });
        
        if (bestMatchKey && bestMatchScore > 50) {
            console.log(`Usando coincidencia parcial para ID ${id}: ${bestMatchKey} (puntaje: ${bestMatchScore})`);
            line = polylinesMap[bestMatchKey];
        }
    }

    if (line) {
        // Resaltar la línea encontrada
        line.setOptions({
            strokeWeight: 6,
            strokeOpacity: 1
        });
        
        // Centrar el mapa en esta línea
        if (mapInstance && line.getPath && line.getPath().getLength() > 0) {
            const path = line.getPath();
            const midIndex = Math.floor(path.getLength() / 2);
            mapInstance.panTo(path.getAt(midIndex));
        }
    } else {
        console.warn(`No se encontró el tramo con ID: ${id} (normalizado: ${idNormalizado})`);
    }
}

function obtenerColorPorPresion(id, idNormalizado, dataProcesada) {
    // Si es un ID autogenerado, usar color predeterminado
    if (id.toString().startsWith('feature_')) {
        return "#999"; // gris para features sin ID específico
    }

    // Intentar encontrar datos por ID o ID normalizado
    let punto = null;

    // Búsqueda directa
    if (dataProcesada[id]) {
        punto = dataProcesada[id];
    }
    // Búsqueda por ID normalizado
    else if (dataProcesada[idNormalizado]) {
        punto = dataProcesada[idNormalizado];
    }
    // Búsqueda por coincidencia parcial
    else {
        // Comprobar si hay algún ID en dataProcesada que contenga el ID actual
        // o si el ID actual contiene algún ID en dataProcesada
        Object.keys(dataProcesada).forEach(key => {
            const keyNormalizado = normalizarID(key);
            if (keyNormalizado.includes(idNormalizado) || idNormalizado.includes(keyNormalizado)) {
                punto = dataProcesada[key];
                // Registrar la coincidencia para depuración
                // console.log(`Coincidencia parcial: ${id} con ${key}`);
            }
        });
    }

    if (!punto) {
        // Solo log para IDs no autogenerados
        if (!id.toString().startsWith('feature_')) {
            // console.log(`No hay datos de presión para ID: ${id}`);
        }
        return "#999"; // gris
    }

    const p = punto.pressure;
    if (!p && p !== 0) {
        return "#999"; // gris
    }

    if (p > 50) return "#4caf50";  // verde
    if (p > 45) return "#ff9800";  // amarillo
    return "#f44336";              // rojo
}



// Exponer funciones necesarias globalmente
window.resaltarTramo = resaltarTramo;