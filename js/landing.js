if (typeof CONFIG === 'undefined' || !CONFIG.GOOGLE_MAPS_API_KEY) {
    console.error('Error: Archivo config.js no encontrado o API key no definida.');
    alert('Este sitio requiere un archivo de configuración válido. Por favor, crea config.js siguiendo el modelo en config.template.js');
}

const apiKey = CONFIG.GOOGLE_MAPS_API_KEY;

// URL donde está alojado el JSON de datos (puede ser un bucket S3 o ruta local)
const DATA_URL = './data/dataset_2022-2025.json';

// Variable global para almacenar los datos cargados
let datasetCompleto = [];

// Cargar datos JSON al iniciar
async function cargarDatos() {
    try {
        const response = await fetch(DATA_URL);
        if (!response.ok) {
            throw new Error('Error al cargar datos');
        }
        datasetCompleto = await response.json();
        console.log('Datos cargados correctamente:', datasetCompleto.length, 'registros');
    } catch (error) {
        console.error('Error cargando datos:', error);
        alert('No se pudieron cargar los datos. Por favor, verifica la conexión e intenta de nuevo.');
    }
}

// ***** CONFIGURACIÓN DE GOOGLE MAPS *****
const GOOGLE_MAPS_CONFIG = {
    apiKey: apiKey,
    defaultCoords: { lat: -37.354692, lng: -59.093802 },
    initialZoom: 8,
    // Array de ubicaciones con información adicional
    locations: [
        {
            id: 1,
            position: { lat: -36.860255, lng: -59.901936 },
            title: 'PM 203 - El Chourron',
            info: 'Este es el punto principal',
            icon: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' // Opcional: icono personalizado
        },
        {
            id: 2,
            position: { lat: -37.354692, lng: -59.093802 },
            title: 'ERP Invernada L3',
            info: 'Este es un punto secundario',
            icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        },
        {
            id: 3,
            position: { lat: -38.006102, lng: -57.551951 },
            title: 'Mar del Plata',
            info: 'Este es un punto secundario',
            icon: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png'
        }
    ]
};

const $contenedorBannerSuperior = document.getElementById("contenedorBannerSuperior");
const $contenedorColumnas = document.getElementById("contenedorColumnas");

// Lista de variables
const $datetimePicker = document.getElementById("datetimePicker");
const $presionDeEntradaUpstream = document.getElementById("presionDeEntradaUpstream");
const $presionDeEntradaDownstream = document.getElementById("presionDeEntradaDownstream");
const $variacionDePresion = document.getElementById("variacionDePresion");
const $presionFutura = document.getElementById("presionFutura");
const $minimoContractual = document.getElementById("minimoContractual");
const $tiempoRestante = document.getElementById("tiempoRestante");

let inputMinimoContractual = 42;
let selectedDateTime;
let formattedDateTime;

// Cargar fecha y hora actual
// setCurrentDateTimeAsDefault();

// Cargar fecha y hora predefinidos
setSpecificDateTimeAsDefault();

// ***** FUNCIONES PARA MOSTRAR VALORES EN PANTALLA *****

// Mostrar en pantalla el valor de la variable global del mínimo contractual
$minimoContractual.textContent = inputMinimoContractual;
console.log("El minimo contractual es: " + inputMinimoContractual);

// Buscar datos según la fecha seleccionada
function buscarDatosPorFecha() {
    if (!selectedDateTime || datasetCompleto.length === 0) {
        console.warn('No hay fecha seleccionada o datos cargados');
        return null;
    }

    // Convertir a formato ISO para comparar con el dataset
    const fechaSeleccionada = new Date(selectedDateTime).toISOString();
    
    // Buscar el registro más cercano a la fecha seleccionada
    let registroMasCercano = null;
    let menorDiferencia = Infinity;
    
    for (const registro of datasetCompleto) {
        const fechaRegistro = new Date(registro.timestamp);
        const diferencia = Math.abs(new Date(fechaSeleccionada) - fechaRegistro);
        
        if (diferencia < menorDiferencia) {
            menorDiferencia = diferencia;
            registroMasCercano = registro;
        }
    }
    
    return registroMasCercano;
}

// Actualizar todos los valores en pantalla
function actualizarValoresEnPantalla() {
    const datos = buscarDatosPorFecha();
    
    if (!datos) {
        // Si no hay datos, mostrar mensaje en los campos
        $presionDeEntradaUpstream.textContent = "No disponible";
        $presionDeEntradaDownstream.textContent = "No disponible";
        $variacionDePresion.textContent = "No disponible";
        $presionFutura.textContent = "No disponible";
        $tiempoRestante.textContent = "No disponible";
        return;
    }
    
    // Convertir valores a números y formatear con 2 decimales
    const presionUpstream = parseFloat(datos.upstream_point.value).toFixed(2);
    const presionDownstream = parseFloat(datos.downstream_point.value).toFixed(2);
    const variacion = parseFloat(datos.prediction.value).toFixed(2);
    
    // Calcular presión futura (presión actual + predicción)
    const presionFuturaCalculada = (parseFloat(presionUpstream) + parseFloat(variacion)).toFixed(2);
    
    $presionDeEntradaUpstream.textContent = presionUpstream + " kg/cm²";
    $presionDeEntradaDownstream.textContent = presionDownstream + " kg/cm²";
    $variacionDePresion.textContent = variacion + " kg/cm²";
    $presionFutura.textContent = presionFuturaCalculada + " kg/cm²";
    
    // Calcular tiempo restante para llegar al mínimo contractual
    calcularTiempoRestanteParaUmbral(presionUpstream, variacion);
    
    // Actualizar el gráfico de tendencias con los nuevos datos
    actualizarGraficoTendencias();
}

// Función para calcular el tiempo hasta llegar al mínimo contractual
function calcularTiempoRestanteParaUmbral(presionActual, variacion) {
    presionActual = parseFloat(presionActual);
    variacion = parseFloat(variacion);
    
    // Si no hay variación o es positiva, no hay peligro
    if (variacion >= 0 || isNaN(variacion)) {
        $tiempoRestante.textContent = "No hay riesgo";
        $tiempoRestante.className = "textValue";
        return;
    }
    
    // Calcular horas hasta llegar al mínimo contractual
    const diferencia = presionActual - inputMinimoContractual;
    const horasHastaUmbral = Math.abs(diferencia / variacion) * 48; // Variación es por 48h
    
    // Si ya estamos por debajo del mínimo
    if (presionActual < inputMinimoContractual) {
        $tiempoRestante.textContent = "¡Ya por debajo del mínimo!";
        $tiempoRestante.className = "textValue textoAlerta";
        return;
    }
    
    // Formatear el resultado
    if (horasHastaUmbral > 72) {
        const dias = Math.floor(horasHastaUmbral / 24);
        $tiempoRestante.textContent = `${dias} días`;
        $tiempoRestante.className = "textValue";
    } else {
        $tiempoRestante.textContent = `${Math.floor(horasHastaUmbral)} horas`;
        $tiempoRestante.className = horasHastaUmbral < 24 ? "textValue textoAlerta" : "textValue";
    }
}

// ***** ECHARTS - GRÁFICO DE TENDENCIAS *****
let trendChart;
let currentPeriod = 'day'; // Período predeterminado

// Inicializar el gráfico de tendencias
function initTrendChart() {
    const chartDom = document.getElementById('trendChart');
    if (!chartDom) {
        console.error('Elemento del gráfico no encontrado');
        return;
    }
    
    // Configurar tema oscuro para ECharts
    const darkTheme = {
        backgroundColor: '#2a2e35',
        textStyle: {
            color: '#e0e0e0',
        },
        title: {
            textStyle: {
                color: '#e0e0e0'
            }
        },
        legend: {
            textStyle: {
                color: '#a0a0a0'
            }
        },
        xAxis: {
            axisLine: {
                lineStyle: {
                    color: '#3a3f48'
                }
            },
            axisLabel: {
                color: '#a0a0a0'
            },
            splitLine: {
                lineStyle: {
                    color: '#3a3f48'
                }
            }
        },
        yAxis: {
            axisLine: {
                lineStyle: {
                    color: '#3a3f48'
                }
            },
            axisLabel: {
                color: '#a0a0a0'
            },
            splitLine: {
                lineStyle: {
                    color: '#3a3f48'
                }
            }
        },
        series: []
    };
    
    // Inicializar el gráfico con el tema oscuro
    trendChart = echarts.init(chartDom);
    trendChart.setOption(darkTheme);
    
    // Actualizar el gráfico con los datos iniciales
    actualizarGraficoTendencias();
    
    // Agregar listeners para los botones de período
    document.querySelectorAll('.chartButton').forEach(button => {
        button.addEventListener('click', function() {
            // Remover la clase active de todos los botones
            document.querySelectorAll('.chartButton').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Agregar la clase active al botón clickeado
            this.classList.add('active');
            
            // Actualizar el período actual y actualizar el gráfico
            currentPeriod = this.getAttribute('data-period');
            actualizarGraficoTendencias();
        });
    });
    
    // Manejar el redimensionamiento
    window.addEventListener('resize', function() {
        trendChart.resize();
    });
}

// Función para generar datos de ejemplo para el gráfico
function generarDatosDePrueba() {
    const now = new Date();
    const datos = {
        fechas: [],
        presionUpstream: [],
        presionDownstream: [],
        minimoContractual: []
    };
    
    let numPoints;
    let intervalo;
    
    // Ajustar la cantidad de puntos e intervalo según el período seleccionado
    switch (currentPeriod) {
        case 'day':
            numPoints = 24;
            intervalo = 60 * 60 * 1000; // 1 hora en milisegundos
            break;
        case 'week':
            numPoints = 7;
            intervalo = 24 * 60 * 60 * 1000; // 1 día en milisegundos
            break;
        case 'month':
            numPoints = 30;
            intervalo = 24 * 60 * 60 * 1000; // 1 día en milisegundos
            break;
        default:
            numPoints = 24;
            intervalo = 60 * 60 * 1000;
    }
    
    // Generar datos aleatorios para el gráfico
    for (let i = 0; i < numPoints; i++) {
        const fecha = new Date(now.getTime() - (numPoints - i) * intervalo);
        datos.fechas.push(fecha.toLocaleString());
        
        // Presiones con variación realista
        const baseUpstream = 45 + (Math.random() * 3) - 1.5;
        datos.presionUpstream.push(baseUpstream);
        
        const baseDownstream = 40 + (Math.random() * 3) - 1.5;
        datos.presionDownstream.push(baseDownstream);
        
        // Línea constante para el mínimo contractual
        datos.minimoContractual.push(inputMinimoContractual);
    }
    
    return datos;
}

// Actualizar el gráfico con nuevos datos
function actualizarGraficoTendencias() {
    if (!trendChart) return;
    
    // Obtener datos (en un escenario real, estos vendrían de la API o dataset)
    const datos = generarDatosDePrueba();
    
    // Configuración del gráfico
    const option = {
        tooltip: {
            trigger: 'axis',
            backgroundColor: 'rgba(42, 46, 53, 0.9)',
            borderColor: '#3a3f48',
            textStyle: {
                color: '#e0e0e0'
            },
            axisPointer: {
                type: 'cross',
                label: {
                    backgroundColor: '#6a7985'
                }
            }
        },
        legend: {
            data: ['Presión Upstream', 'Presión Downstream', 'Mínimo Contractual'],
            top: 'bottom'
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '60px',
            top: '20px',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            boundaryGap: false,
            data: datos.fechas
        },
        yAxis: {
            type: 'value',
            name: 'Presión (kg/cm²)',
            nameLocation: 'middle',
            nameGap: 50
        },
        series: [
            {
                name: 'Presión Upstream',
                type: 'line',
                data: datos.presionUpstream,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#ff8c00'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0,
                            color: 'rgba(255, 140, 0, 0.5)'
                        }, {
                            offset: 1,
                            color: 'rgba(255, 140, 0, 0.05)'
                        }]
                    }
                }
            },
            {
                name: 'Presión Downstream',
                type: 'line',
                data: datos.presionDownstream,
                smooth: true,
                lineStyle: {
                    width: 3,
                    color: '#4caf50'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0,
                            color: 'rgba(76, 175, 80, 0.5)'
                        }, {
                            offset: 1,
                            color: 'rgba(76, 175, 80, 0.05)'
                        }]
                    }
                }
            },
            {
                name: 'Mínimo Contractual',
                type: 'line',
                data: datos.minimoContractual,
                symbol: 'none',
                lineStyle: {
                    width: 2,
                    type: 'dashed',
                    color: '#f44336'
                }
            }
        ]
    };
    
    // Aplicar la configuración al gráfico
    trendChart.setOption(option);
}

// Inicializar la carga de datos
document.addEventListener('DOMContentLoaded', function () {
    // Cargar los datos después de un pequeño delay
    setTimeout(async function () {
        await cargarDatos();
        // Después de cargar los datos, establecer la hora actual y actualizar la pantalla
        // setCurrentDateTimeAsDefault();
        setSpecificDateTimeAsDefault();
        actualizarValoresEnPantalla();
        
        // Inicializar el gráfico de tendencias
        initTrendChart();
    }, 600);
});



// ***** FUNCIONES DE GOOGLE MAPS *****
function initMap() {
    const mapElement = document.getElementById("map"); // Obtener el elemento DOM nativo

    if (!mapElement) {
        console.error('Elemento del mapa no encontrado');
        return;
    }

    // Configuración del mapa
    const map = new google.maps.Map(mapElement, {
        zoom: GOOGLE_MAPS_CONFIG.initialZoom,
        center: GOOGLE_MAPS_CONFIG.defaultCoords,
        styles: [
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
        ]
    });

    // Para mostrar información cuando se hace clic en un marcador
    const infoWindow = new google.maps.InfoWindow();

    // Crear un marcador para cada ubicación
    GOOGLE_MAPS_CONFIG.locations.forEach(location => {
        const marker = new google.maps.Marker({
            position: location.position,
            map: map,
            title: location.title,
            icon: location.icon || null // Usar icono personalizado si está definido
        });

        // Agregar evento de clic al marcador
        marker.addListener('click', function () {
            // Mostrar ventana de información
            infoWindow.setContent(`
                <div>
                    <h3>${location.title}</h3>
                    <p>${location.info}</p>
                </div>
            `);
            infoWindow.open(map, marker);

            // Ejecutar función personalizada cuando se hace clic en un marcador
            handleMarkerClick(location);
        });
    });

    console.log('Mapa de Google inicializado correctamente');
}

// Función para cargar dinámicamente el script de Google Maps
function loadGoogleMapsScript() {
    // Verificar si Google Maps ya está cargado
    if (typeof google !== 'undefined' && google.maps) {
        initMap();
        return;
    }

    // Crear y configurar el script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_CONFIG.apiKey}&callback=initMap`;
    script.async = true;
    script.defer = true;

    // Manejar errores de carga
    script.onerror = function () {
        console.error('Error al cargar Google Maps API');
    };

    // Agregar el script al head del documento
    document.head.appendChild(script);
}

// ***** INICIALIZACIÓN *****
// Cargar Google Maps cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function () {
    // Agregar event listeners para la navegación
    setupNavigation();
    
    // Pequeño delay para asegurar que todos los elementos del DOM estén listos
    setTimeout(function () {
        loadGoogleMapsScript();
    }, 500);
});

// Hacer initMap global para que Google Maps pueda acceder a ella
window.initMap = initMap;

// Función para configurar la navegación
function setupNavigation() {
    // Agregar event listeners para los botones de navegación
    document.querySelectorAll('.navButton').forEach(button => {
        button.addEventListener('click', function() {
            if (this.textContent.includes('AI Assistant')) {
                window.location.href = './chatbot/index.html';
            }
            // Aquí se pueden agregar más navegaciones para otros botones si es necesario
        });
    });
}

// Event listener del datetimePicker para actualizar los valores
$datetimePicker.addEventListener('change', function () {
    selectedDateTime = this.value;

    // Convertir a objeto Date (código existente)
    let dateObject = new Date(selectedDateTime);

    // Formatear la fecha (código existente)
    let month = String(dateObject.getMonth() + 1).padStart(2, '0');
    let day = String(dateObject.getDate()).padStart(2, '0');
    let year = dateObject.getFullYear();
    let hours = String(dateObject.getHours()).padStart(2, '0');
    let minutes = String(dateObject.getMinutes()).padStart(2, '0');
    let seconds = '00'; 

    // Formato: MM-DD-YYYY HH:MM:SS (código existente)
    formattedDateTime = `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;

    console.log("Fecha y hora original:", selectedDateTime);
    console.log("Fecha y hora formateada:", formattedDateTime);
    
    // Actualizar la pantalla con los datos correspondientes
    actualizarValoresEnPantalla();
});

// Método 1: Establecer fecha actual como valor por defecto
// 4-2-26: Por el momento no uso esta función dado que los datos llegan hasta el 31-12-25
function setCurrentDateTimeAsDefault() {
    const now = new Date();

    // Formatear al formato requerido por el input datetime-local: YYYY-MM-DDThh:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const formattedDateTime = `${year}-${month}-${day}T${hours}:${minutes}`;

    // Establecer el valor
    if ($datetimePicker) {
        $datetimePicker.value = formattedDateTime;
    }
}

// Método 2: Establecer una fecha específica como valor por defecto
function setSpecificDateTimeAsDefault() {
    // Fecha específica: 1 de enero de 2025 a las 00:00
    const fechaPredeterminada = new Date(2025, 0, 1, 0, 0); // Año, mes (0-11), día, hora, minutos
    
    // Formatear al formato requerido por el input datetime-local: YYYY-MM-DDThh:mm
    const year = fechaPredeterminada.getFullYear();
    const month = String(fechaPredeterminada.getMonth() + 1).padStart(2, '0');
    const day = String(fechaPredeterminada.getDate()).padStart(2, '0');
    const hours = String(fechaPredeterminada.getHours()).padStart(2, '0');
    const minutes = String(fechaPredeterminada.getMinutes()).padStart(2, '0');
    
    const formattedDateTimeForInput = `${year}-${month}-${day}T${hours}:${minutes}`;
    
    // Establecer el valor y actualizar la variable global
    if ($datetimePicker) {
        $datetimePicker.value = formattedDateTimeForInput;
        selectedDateTime = formattedDateTimeForInput;
        formattedDateTime = `${month}-${day}-${year} ${hours}:${minutes}:00`;
    }
}

// Función para manejar el clic en un marcador
function handleMarkerClick(location) {
    console.log(`Marcador clickeado: ${location.title} (ID: ${location.id})`);

    // Aquí puedes agregar cualquier acción que quieras ejecutar al hacer clic en un marcador
    // Por ejemplo:

    // 1. Actualizar información en otro panel
    const infoPanelTitle = document.getElementById("infoPanelTitle");
    if (infoPanelTitle) {
        infoPanelTitle.textContent = location.title;
    }

    // 2. Cargar datos específicos del punto
    loadDataForLocation(location.id);

    // 3. Disparar una acción personalizada
}

// Ejemplo de función para cargar datos específicos para una ubicación
function loadDataForLocation(locationId) {
    // Puedes hacer una consulta específica basada en el ID de la ubicación
    console.log(`Cargando datos para la ubicación ID: ${locationId}`);

    // Aquí podría ir una llamada a una API, una consulta a tu base de datos, etc.
}