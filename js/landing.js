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

const $botonConsultarChatbot = document.getElementById("botonConsultarChatbot");

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

// Inicializar la carga de datos
document.addEventListener('DOMContentLoaded', function () {
    // Cargar los datos después de un pequeño delay
    setTimeout(async function () {
        await cargarDatos();
        // Después de cargar los datos, establecer la hora actual y actualizar la pantalla
        // setCurrentDateTimeAsDefault();
        setSpecificDateTimeAsDefault();
        actualizarValoresEnPantalla();
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
    // Pequeño delay para asegurar que todos los elementos del DOM estén listos
    setTimeout(function () {
        loadGoogleMapsScript();
    }, 500);
});

// Hacer initMap global para que Google Maps pueda acceder a ella
window.initMap = initMap;

// Agregar event listeners para los elementos interactivos
$botonConsultarChatbot.addEventListener('click', function () {
    console.log("Botón presionado");
    window.location.href = './chatbot/index.html';
});

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
    // Por ejemplo:
}