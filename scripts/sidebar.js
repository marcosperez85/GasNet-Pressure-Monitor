import { DOM } from './dom';
import { MEASUREMENT_POINTS } from './data';
import { resaltarTramo } from './map';
import { AppState } from './state';
import {
    pEntradaUpGlobal,
    pEntradaDownGlobal,
    caudalGlobal,
    endDateGlobal
} from '../src/main.js';

function createSegmentItem(point) {
    const $item = $('<div></div>').addClass('segmentItem');

    $item.on('click', function () {
        seleccionarPunto(point);
    });

    $item.html(`
    <div class="segmentTitle">${point.title}</div>
    <div class="segmentSubtitle">${point.subtitle}</div>
    <div class="segmentMetrics">
        <div>
            <div class="metricLabel">Line Pack</div>
            <div class="metricValue linepack-value">--</div>
        </div>
        <div>
            <div class="metricLabel">Presión Prom.</div>
            <div class="metricValue pressure-value">--</div>
        </div>
        <div>
            <div class="metricLabel">Autonomía</div>
            <div class="metricValue autonomia-value">--</div>
        </div>
    </div>
`);

    setTimeout(() => $item.css('opacity', 1), 50);
    return $item[0];
}

export function updateMeasurementPoints(unit) {
    if (MEASUREMENT_POINTS[unit]) {
        $(DOM.noSelection).addClass('hidden');
        $(DOM.segmentList).removeClass('hidden');
        $(DOM.segmentList).empty();

        $.each(MEASUREMENT_POINTS[unit], function (i, p) {
            $(DOM.segmentList).append(createSegmentItem(p));
        });
    } else {
        $(DOM.noSelection).removeClass('hidden');
        $(DOM.segmentList).addClass('hidden');
    }
}

export function setupDistributionZones() {
    const $pampeanaButton = $('#camuzziGasPampeana');
    const $surButton = $('#camuzziGasDelSur');
    const $pampeanaSegments = $('.pampeana-segments');
    const $surSegments = $('.sur-segments');

    $pampeanaButton.on('click', function () {
        $pampeanaSegments.toggleClass('active');
    });

    $surButton.on('click', function () {
        $surSegments.toggleClass('active');
    });

    $('.zoneSegment').on('click', function () {
        $('.zoneSegment').removeClass('active');
        $(this).addClass('active');

        updateMeasurementPoints($(this).text().trim());
        forzarRefreshDatos()
    });
}

function seleccionarPunto(point) {
    AppState.selectedPoint = point;

    console.log('Punto seleccionado:', point);

    // 🔥 Setear queries en OpHub
    EMBED.submitTarget(pEntradaUpGlobal, point.queries.pEntradaUp);
    EMBED.submitTarget(pEntradaDownGlobal, point.queries.pEntradaDown);
    EMBED.submitTarget(caudalGlobal, point.queries.caudal);

    // 🔥 Mostrar chart
    const chartPanel = document.querySelector('.chartPanel');
    chartPanel.classList.remove('noExiste');

    // 🔥 Forzar refresh
    if (typeof window.refrescarGrafico === 'function') {
        window.refrescarGrafico();
    }
    resaltarTramo(point.id);
}

export function actualizarSidebarConDatos(dataProcesada) {
    ordenarPorCriticidad(dataProcesada);

    $('.segmentItem').each(function () {
        const title = $(this).find('.segmentTitle').text().trim();
        const d = dataProcesada[title];

        // 🔥 buscar el point real desde data.js para obtener thresholds
        let pointConfig = null;

        for (const unidad in MEASUREMENT_POINTS) {
            const found = MEASUREMENT_POINTS[unidad].find(p => p.title === title);
            if (found) {
                pointConfig = found;
                break;
            }
        }

        // Usar thresholds del punto o valores por defecto solo como fallback
        const thresholds = pointConfig?.config?.thresholds || { green: 50, yellow: 45 };

        if (!d) {
            $(this).find('.linepack-value').text('N/A');
            $(this).find('.pressure-value').text('N/A');
            $(this).find('.autonomia-value').text('N/A');
            return;
        }

        const pressure = d.pressure;
        // 🔥 SCADA COLORS
        let color = 'gray';

        if (pressure > thresholds.green) color = '#4caf50';
        else if (pressure > thresholds.yellow) color = '#ff9800';
        else color = '#f44336';                  // rojo

        $(this).css('border-left', `5px solid ${color}`);

        $(this).find('.linepack-value').text(d.linepack.toFixed(2));
        $(this).find('.pressure-value').text(pressure.toFixed(2));

        // Mostrar autonomía (si existe)
        if (d.autonomia !== null && d.autonomia !== undefined) {
            $(this).find('.autonomia-value').text(`${d.autonomia.toFixed(2)} h`);
        } else {
            $(this).find('.autonomia-value').text('N/A');
        }
    });
}

function ordenarPorCriticidad(dataProcesada) {
    const ordenados = Object.entries(dataProcesada)
        .sort((a, b) => a[1].pressure - b[1].pressure);

    ordenados.forEach(([title], index) => {
        const el = $('.segmentItem').filter(function () {
            return $(this).find('.segmentTitle').text().trim() === title;
        });

        el.css('order', index); // requiere flexbox
    });
}

// Actualizar el endTime cada vez que se presiona en una Unidad de Negocio para forzar un queryChange en el
// query de CurrentValueDataSet.
// Esta función podría eliminarse en el New Layout de Configuration Hub seleccionando un query del tipo
// Current Value en lugar de Historical (current value) y habilitar "Submit Query On Load"
function forzarRefreshDatos() {
    if (!endDateGlobal) return;

    const ahora = new Date();
    const hace1min = new Date(ahora.getTime() - 1 * 60 * 1000);

    // Primero cambiamos a un tiempo anterior para asegurar que el cambio sea detectado
    EMBED.submitTarget(endDateGlobal, hace1min.toISOString().split('.')[0]);
    EMBED.submitTarget(endDateGlobal, ahora.toISOString().split('.')[0]);
}

function buscarPuntoPorId(id) {
    for (const unidad in MEASUREMENT_POINTS) {
        const found = MEASUREMENT_POINTS[unidad].find(p => p.id === id);
        if (found) return { unidad, point: found };
    }
    return null;
}

export function seleccionarPuntoPorId(id) {
    if (!id) return;

    console.log(`Intentando seleccionar punto con ID: ${id}`);
    const idNormalizado = normalizarID(id);

    // Intentar encontrar el punto por ID exacto o normalizado
    let puntoEncontrado = null;
    let unidadEncontrada = null;

    for (const unidad in MEASUREMENT_POINTS) {
        MEASUREMENT_POINTS[unidad].forEach(p => {
            if (p.id) {
                const pIdNormalizado = normalizarID(p.id);

                // Verificar coincidencia exacta o si uno contiene al otro
                if (pIdNormalizado === idNormalizado ||
                    pIdNormalizado.includes(idNormalizado) ||
                    idNormalizado.includes(pIdNormalizado)) {

                    puntoEncontrado = p;
                    unidadEncontrada = unidad;
                }
            }
        });
    }

    if (puntoEncontrado) {
        console.log("Seleccionando punto:", puntoEncontrado);
        seleccionarPunto(puntoEncontrado);
        return true;
    } else {
        console.warn(`No se encontró punto con ID: ${id}`);
        return false;
    }
}

// Función para normalizar IDs para comparación
function normalizarID(id) {
    if (!id) return '';
    return String(id).trim().toLowerCase();
}

// Exponer función para uso global
window.seleccionarPuntoPorId = seleccionarPuntoPorId;