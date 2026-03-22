import { DOM } from './dom';
import { MEASUREMENT_POINTS } from './data';

function createSegmentItem(point) {
    const $item = $('<div></div>').addClass('segmentItem');

    $item.html(`
        <div class="segmentTitle">${point.title}</div>
        <div class="segmentSubtitle">${point.subtitle}</div>
        <div class="segmentMetrics">
            <div>
                <div class="metricLabel">Line Pack</div>
                <div class="metricValue">${point.linepack}</div>
            </div>
            <div>
                <div class="metricLabel">Pressure</div>
                <div class="metricValue">${point.pressure}</div>
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

        $.each(MEASUREMENT_POINTS[unit], function(i, p) {
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

    $pampeanaButton.on('click', function() {
        $pampeanaSegments.toggleClass('active');
    });

    $surButton.on('click', function() {
        $surSegments.toggleClass('active');
    });

    $('.zoneSegment').on('click', function() {
        $('.zoneSegment').removeClass('active');
        $(this).addClass('active');

        updateMeasurementPoints($(this).text().trim());
    });
}