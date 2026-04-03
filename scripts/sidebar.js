import { DOM } from './dom';
import { MEASUREMENT_POINTS } from './data';
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
            <div class="metricLabel">Pressure</div>
            <div class="metricValue pressure-value">--</div>
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
}

export function actualizarSidebarConDatos(dataProcesada) {
    $('.segmentItem').each(function () {
        const title = $(this).find('.segmentTitle').text().trim();
        const d = dataProcesada[title];

        if (!d) {
            $(this).find('.linepack-value').text('N/A');
            $(this).find('.pressure-value').text('N/A');
            return;
        }

        const pressure = d.pressure;

        // 🔥 SCADA COLORS
        let color = 'gray';

        if (pressure > 60) color = '#4caf50';       // verde
        else if (pressure > 45) color = '#ff9800';  // amarillo
        else color = '#f44336';                     // rojo

        $(this).css('border-left', `5px solid ${color}`);

        $(this).find('.linepack-value').text(d.linepack.toFixed(2));
        $(this).find('.pressure-value').text(pressure.toFixed(2));

        console.log('Processed:', dataProcesada);
    });
}

function ordenarPorCriticidad(dataProcesada) {
    return Object.entries(dataProcesada)
        .sort((a, b) => a[1].pressure - b[1].pressure); // menor presión = más crítico
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