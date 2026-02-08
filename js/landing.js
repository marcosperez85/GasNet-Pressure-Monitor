if (typeof CONFIG === 'undefined' || !CONFIG.GOOGLE_MAPS_API_KEY) {
    console.error('Error: Archivo config.js no encontrado o API key no definida.');
    alert('Este sitio requiere un archivo de configuración válido. Por favor, crea config.js siguiendo el modelo en config.template.js');
}

const apiKey = CONFIG.GOOGLE_MAPS_API_KEY;

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

// let inputResultSet = data.inputResultSet;
let inputMinimoContractual = 42;
// let outputFechaHora = data.outputFechaHora;
let selectedDateTime;
let formattedDateTime;

setCurrentDateTimeAsDefault();

// Mostrar en pantalla el valor de la variable global del mínimo contractual
$minimoContractual.textContent = inputMinimoContractual;
console.log("El minimo contractual es: " + inputMinimoContractual);

// Función para mostrar valores en pantalla

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

$datetimePicker.addEventListener('change', function () {
    selectedDateTime = this.value;

    // Convertir a objeto Date
    let dateObject = new Date(selectedDateTime);

    // Formatear la fecha en el formato deseado: MM-DD-YYYY HH:MM:SS
    let month = String(dateObject.getMonth() + 1).padStart(2, '0');
    let day = String(dateObject.getDate()).padStart(2, '0');
    let year = dateObject.getFullYear();
    let hours = String(dateObject.getHours()).padStart(2, '0');
    let minutes = String(dateObject.getMinutes()).padStart(2, '0');
    let seconds = '00'; // Los datetime-local inputs no incluyen segundos, así que ponemos 00

    // Formato: MM-DD-YYYY HH:MM:SS
    formattedDateTime = `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;

    console.log("Fecha y hora original:", selectedDateTime);
    console.log("Fecha y hora formateada:", formattedDateTime);
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
    // Por ejemplo: 30 de junio de 2025 a las 11:59
    formattedDateTime = "2025-06-30 11:59:59";

    // Establecer el valor
    if ($datetimePicker) {
        $datetimePicker.value = formattedDateTime;
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