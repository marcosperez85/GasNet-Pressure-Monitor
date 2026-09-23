function initMap() {
    // Dark mode styling for Google Maps
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

    const map = new google.maps.Map(DOM.map, {
        center: { lat: -37.35, lng: -59.09 },
        zoom: 7,
        styles: darkMapStyle,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true
    });

    loadPipelineSegments(map);
}

async function loadPipelineSegments(map) {
    try {
        const response = await fetch('./data/Gasoductos_y_ramales_CGP_05per.json');
        if (!response.ok) {
            throw new Error(`No se pudo cargar el GeoJSON (HTTP ${response.status}).`);
        }

        const geoJson = await response.json();
        const pointsById = new Map(
            Object.values(MEASUREMENT_POINTS).flat()
                .filter(point => point.id)
                .map(point => [String(point.id).trim(), point])
        );
        const findPoint = feature => {
            // El KMZ convertido guarda el código del tramo en properties.name.
            for (const value of [feature.getProperty('name'), feature.getProperty('id'), feature.getId()]) {
                const point = pointsById.get(String(value ?? '').trim());
                if (point) return point;
            }
        };

        // Conservar los IDs originales evita perder geometrías con el mismo name.
        const features = map.data.addGeoJson(geoJson);
        if (!features.length) throw new Error('El GeoJSON no contiene tramos.');

        map.data.setStyle(feature => {
            const configured = Boolean(findPoint(feature));
            return {
                strokeColor: configured ? '#00ff51' : '#64b5f6',
                strokeWeight: configured ? 3 : 1.5,
                strokeOpacity: 0.9,
                zIndex: configured ? 2 : 1
            };
        });

        const configuredFeatures = features.filter(feature => findPoint(feature));
        const bounds = new google.maps.LatLngBounds();
        const visibleFeatures = configuredFeatures.length ? configuredFeatures : features;
        visibleFeatures.forEach(feature => {
            feature.getGeometry()?.forEachLatLng(position => bounds.extend(position));
        });
        if (!bounds.isEmpty()) map.fitBounds(bounds, 40);

        const infoWindow = new google.maps.InfoWindow();
        AppState.highlightPipelinePoint = point => {
            infoWindow.close();
            map.data.revertStyle();
            if (!point) return;
            features.filter(feature => findPoint(feature) === point).forEach(feature => {
                map.data.overrideStyle(feature, { strokeWeight: 6, zIndex: 3 });
            });
        };
        // Aplicar también una selección realizada antes de terminar la carga.
        AppState.highlightPipelinePoint(AppState.selectedMeasurementPoint);
        map.data.addListener('click', event => {
            const point = findPoint(event.feature);
            if (point) selectMeasurementPoint(point);
            const content = document.createElement('div');
            content.style.color = '#333';
            content.textContent = point
                ? `${point.title} — ${point.subtitle || point.id}`
                : `Tramo ${event.feature.getProperty('name') || event.feature.getId()}`;
            infoWindow.setContent(content);
            infoWindow.setPosition(event.latLng);
            infoWindow.open({ map });
        });
    } catch (error) {
        console.error('Error al dibujar los gasoductos:', error);
        const message = document.createElement('div');
        message.setAttribute('role', 'alert');
        message.textContent = 'No se pudieron cargar los tramos del mapa. Revisá la conexión y serví el proyecto mediante HTTP (no file://).';
        DOM.map.insertAdjacentElement('afterend', message);
    }
}

function loadMap() {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${CONFIG.GOOGLE_MAPS_API_KEY}&callback=initMap`;
    script.async = true;
    window.initMap = initMap;
    document.head.appendChild(script);
}
