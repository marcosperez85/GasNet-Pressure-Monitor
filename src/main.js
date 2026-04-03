import {
    setupDistributionZones,
    actualizarSidebarConDatos
} from '../scripts/sidebar.js';
import { setupNavigation } from '../scripts/navigation.js';
import { initChart } from '../scripts/chart.js';
import { loadMap } from '../scripts/map.js';
import { crearURLs } from '../scripts/crearStringURL.js';
import { limpiarURLs } from '../scripts/limpiarURLs.js';
import { procesarCurrentValues } from '../scripts/processCurrentValues.js';

let rootElement = EMBED.getRootElement();
let data = EMBED.getComponent().schema.data;

// Exportar variables directamente para otros módulos
export const $GOOGLE_MAPS_API_KEY = data.GOOGLE_MAPS_API_KEY.manual;
export const inputPEntradaUpHist = data.inputPEntradaUpHist;
export const inputPEntradaDownHist = data.inputPEntradaDownHist;
export const inputCaudalHist = data.inputCaudalHist;
export const currentValueDataset = data.currentValueDataset;
export const pEntradaUpGlobal = data.pEntradaUpGlobal;
export const pEntradaDownGlobal = data.pEntradaDownGlobal;
export const caudalGlobal = data.caudalGlobal;
export const stringURLsGlobal = data.stringURLsGlobal;
export const startDateGlobal = data.startDateGlobal;
export const endDateGlobal = data.endDateGlobal;

// Botones de rango de tiempo
export const $boton24h = rootElement.find("#boton24h");
export const $boton7d = rootElement.find("#boton7d");
export const $boton14d = rootElement.find("#boton14d");
export const $boton30d = rootElement.find("#boton30d");

// Variable global para las URLs generadas
export let stringURLs;

$(document).ready(async function () {
    setupDistributionZones();
    setupNavigation();

    // Generamos las URLs y las asignamos a la variable global
    const urlsGeneradas = crearURLs();
    stringURLs = limpiarURLs(urlsGeneradas);
    
    console.log("URLs generadas y limpiadas:", stringURLs);

    if (stringURLsGlobal) {
        EMBED.submitTarget(stringURLsGlobal, stringURLs);
    } else {
        console.log("No se pudo enviar el query de current values");
    }

    if (currentValueDataset && EMBED.fieldTypeIsQuery(currentValueDataset)) {
        EMBED.subscribeFieldToQueryChange(currentValueDataset, data => {
            console.log("SUBSCRIPCIÓN OK");

            if (!data) {
                console.log("No hay datos recibidos");
                return;
            }

            // Forma correcta de inspeccionar objetos en la consola
            console.log("La variable DATA en crudo es:", data);
                        
            // Para ver la estructura exacta del objeto
            console.log("Estructura completa de DATA[0]:", JSON.stringify(data[0], null, 2));
            
            // Si necesitas ver propiedades específicas
            if (data[0]) {
                console.log("Propiedades disponibles en DATA[0]:", Object.keys(data[0]));
            }

            try {
                const processed = procesarCurrentValues(data);
                console.log("Los datos procesados son:", processed);
                actualizarSidebarConDatos(processed);
            } catch (error) {
                console.error("Error al procesar los datos:", error);
                console.log("Datos que causaron el error:", data);
            }
        });
    }
    initChart();
    loadMap($GOOGLE_MAPS_API_KEY);
});