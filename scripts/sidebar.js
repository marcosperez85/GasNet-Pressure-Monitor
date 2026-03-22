function createSegmentItem(point) {
    const item = document.createElement('div');
    item.className = 'segmentItem';

    item.innerHTML = `
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
    `;

    setTimeout(() => item.style.opacity = 1, 50);
    return item;
}

function updateMeasurementPoints(unit) {
    if (MEASUREMENT_POINTS[unit]) {
        DOM.noSelection.classList.add('hidden');
        DOM.segmentList.classList.remove('hidden');
        DOM.segmentList.innerHTML = '';

        MEASUREMENT_POINTS[unit].forEach(p => {
            DOM.segmentList.appendChild(createSegmentItem(p));
        });
    } else {
        DOM.noSelection.classList.remove('hidden');
        DOM.segmentList.classList.add('hidden');
    }
}

function setupDistributionZones() {
    const pampeanaButton = document.getElementById('camuzziGasPampeana');
    const surButton = document.getElementById('camuzziGasDelSur');
    const pampeanaSegments = document.querySelector('.pampeana-segments');
    const surSegments = document.querySelector('.sur-segments');

    pampeanaButton?.addEventListener('click', () => {
        pampeanaSegments.classList.toggle('active');
    });

    surButton?.addEventListener('click', () => {
        surSegments.classList.toggle('active');
    });

    document.querySelectorAll('.zoneSegment').forEach(seg => {
        seg.addEventListener('click', function () {
            document.querySelectorAll('.zoneSegment').forEach(s => s.classList.remove('active'));
            this.classList.add('active');

            updateMeasurementPoints(this.textContent.trim());
        });
    });
}