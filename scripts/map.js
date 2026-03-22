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

    const locations = [
        { lat: -38.006, lng: -57.551, title: "Mar del Plata", icon: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png' },
        { lat: -38.715, lng: -62.265, title: "Bahía Blanca", icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' },
        { lat: -34.921, lng: -57.954, title: "La Plata", icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png' }
    ];

    // Create an info window to share between markers
    const infoWindow = new google.maps.InfoWindow();

    $.each(locations, function (i, loc) {
        const marker = new google.maps.Marker({
            position: { lat: loc.lat, lng: loc.lng },
            map: map,
            title: loc.title,
            icon: loc.icon || 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
        });

        marker.addListener('click', () => {
            // Set content and open info window
            infoWindow.setContent(`<div style="color: #333; padding: 5px;"><b>${loc.title}</b><br>Distribuidora: Camuzzi Gas Pampeana</div>`);
            infoWindow.open(map, marker);

            // Update measurement points
            updateMeasurementPoints(loc.title);

            // Highlight the corresponding zone segment in the sidebar
            $('.zoneSegment').each(function () {
                if ($(this).text().trim() === loc.title) {
                    $('.zoneSegment').removeClass('active');
                    $(this).addClass('active');

                    // Ensure parent is expanded
                    const $parent = $(this).closest('.zoneSegments');
                    if ($parent.length && !$parent.hasClass('active')) {
                        $parent.addClass('active');

                        // Update the chevron icon
                        const $button = $parent.prev();
                        if ($button.length) {
                            const $icon = $button.find('i');
                            if ($icon.length) {
                                $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
                            }
                        }
                    }
                }
            });
        });
    });
}

function loadMap() {

    // Defensive check to ensure API key exists
    if (!GOOGLE_MAPS_API_KEY) {
        console.error('Cannot load Google Maps: API key is not available');
        return;
    }

    const script = $('<script></script>');
    script.attr('src', `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&callback=initMap`);
    script.attr('async', true);
    window.initMap = initMap;
    $('head').append(script);
}