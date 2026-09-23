function createSegmentItem(point) {
    const data = getMeasurementData(point);
    const pressure = data.up[data.up.length - 1][1];
    const item = document.createElement('div');
    item.className = 'segmentItem';
    item.tabIndex = 0;
    item.setAttribute('role', 'button');
    item.addEventListener('click', () => selectMeasurementPoint(point));
    item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectMeasurementPoint(point);
            DOM.segmentList.querySelector('.segmentItem.active')?.focus({ preventScroll: true });
        }
    });

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
                <div class="metricValue">${pressure.toFixed(2)}</div>
            </div>
        </div>
    `;

    setTimeout(() => item.style.opacity = 1, 50);
    return item;
}

function updateMeasurementPoints(unit, selectedPoint = MEASUREMENT_POINTS[unit]?.[0] ?? null) {
    AppState.selectedMeasurementPoint = selectedPoint;
    updateChatbotSelection();
    if (MEASUREMENT_POINTS[unit]) {
        DOM.noSelection.classList.add('hidden');
        DOM.segmentList.classList.remove('hidden');
        DOM.segmentList.innerHTML = '';

        MEASUREMENT_POINTS[unit].forEach(p => {
            const item = createSegmentItem(p);
            DOM.segmentList.appendChild(item);
            if (p === selectedPoint) {
                item.classList.add('active');
                item.setAttribute('aria-current', 'true');
            }
        });
        DOM.segmentList.querySelector('.segmentItem.active')
            ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        DOM.noSelection.classList.remove('hidden');
        DOM.segmentList.classList.add('hidden');
    }
    // Renderizar las tarjetas primero: su presión no depende de ECharts.
    updateMeasurementChart(selectedPoint);
    AppState.highlightPipelinePoint?.(selectedPoint);
}

function selectMeasurementPoint(point) {
    const entry = Object.entries(MEASUREMENT_POINTS)
        .find(([, points]) => points.includes(point));
    if (!entry) return;

    const [unit] = entry;
    document.querySelectorAll('.zoneSegment').forEach(segment => {
        segment.classList.toggle('active', segment.textContent.trim() === unit);
    });
    updateMeasurementPoints(unit, point);
}

function setupDistributionZones() {
    document.querySelectorAll('.zoneSegment').forEach(seg => {
        seg.addEventListener('click', function () {
            document.querySelectorAll('.zoneSegment').forEach(s => s.classList.remove('active'));
            this.classList.add('active');

            updateMeasurementPoints(this.textContent.trim());
        });
    });
}
