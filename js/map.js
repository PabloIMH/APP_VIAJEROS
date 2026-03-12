// map.js
// Lógica para el mapa del itinerario usando Leaflet.js

let itineraryMap = null;
let routingControl = null;
let mapMarkers = [];
let routeLines = [];
let markerClusterGroup = null;

// === OSRM Throttle Queue + Route Cache ===
const OSRM_REQUEST_DELAY = 1500; // ms entre peticiones OSRM
let osrmQueue = [];              // Cola de peticiones pendientes
let osrmProcessing = false;      // ¿Está procesando la cola?

// Cache de rutas: persistente en localStorage
let routeCache = {};
try {
    const savedCache = localStorage.getItem('trip_route_cache');
    if (savedCache) routeCache = JSON.parse(savedCache);
} catch (e) {
    console.warn("🗺️ Error cargando caché de rutas:", e);
}

function saveRouteCache() {
    try {
        // Limitar tamaño de caché para evitar QuotaExceededError
        const keys = Object.keys(routeCache);
        if (keys.length > 100) {
            // Eliminar las 20 entradas más antiguas si la caché es muy grande
            keys.slice(0, 20).forEach(k => delete routeCache[k]);
        }
        localStorage.setItem('trip_route_cache', JSON.stringify(routeCache));
    } catch (e) {
        console.warn("🗺️ Error guardando caché de rutas:", e);
        if (e.name === 'QuotaExceededError') {
            localStorage.removeItem('trip_route_cache'); // Reset si está lleno
        }
    }
}

// Generar clave de caché a partir de waypoints
function getRouteCacheKey(waypoints) {
    return waypoints.map(p => `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join('|');
}

// Encolar una petición de ruta OSRM (throttled)
function enqueueRoute(waypoints, styles, fallbackLine) {
    let cacheKey = getRouteCacheKey(waypoints);

    // Cache HIT: dibujar desde caché sin llamar a OSRM
    if (routeCache[cacheKey]) {
        console.log(`🗺️ Cache HIT para ruta: ${cacheKey.substring(0, 40)}...`);
        let cachedLine = L.polyline(routeCache[cacheKey], {
            color: styles[0].color,
            opacity: styles[0].opacity || 0.9,
            weight: styles[0].weight || 6,
            smoothFactor: 3.0 // Optimización: simplifica el trazo para SVG
        }).addTo(itineraryMap);
        routeLines.push(cachedLine);
        // Ocultar fallback si existe
        if (fallbackLine) {
            try { itineraryMap.removeLayer(fallbackLine); } catch (e) { }
        }
        return;
    }

    // Cache MISS: encolar para procesamiento
    console.log(`🗺️ Encolando ruta OSRM: ${cacheKey.substring(0, 40)}...`);
    osrmQueue.push({ waypoints, styles, fallbackLine, cacheKey });
    processOsrmQueue();
}

// Procesar cola de peticiones OSRM una por una
function processOsrmQueue() {
    if (osrmProcessing || osrmQueue.length === 0) return;
    osrmProcessing = true;

    let { waypoints, styles, fallbackLine, cacheKey } = osrmQueue.shift();

    // Verificar que el mapa siga activo (el usuario pudo haber cerrado el mapa)
    if (!itineraryMap) {
        osrmProcessing = false;
        osrmQueue = [];
        return;
    }

    console.log(`🗺️ Procesando ruta OSRM (quedan ${osrmQueue.length} en cola)`);

    let routingCtrl = L.Routing.control({
        waypoints: waypoints,
        show: false,
        addWaypoints: false,
        routeWhileDragging: false,
        fitSelectedRoutes: false,
        lineOptions: { styles: styles },
        createMarker: function () { return null; }
    });

    routingCtrl.on('routesfound', function (e) {
        // Guardar en caché las coordenadas de la ruta
        if (e.routes && e.routes.length > 0) {
            routeCache[cacheKey] = e.routes[0].coordinates;
            saveRouteCache(); // Guardar en localStorage
            console.log(`🗺️ Ruta cacheada: ${cacheKey.substring(0, 40)}...`);
        }
        // Ocultar fallback
        if (fallbackLine) {
            try { itineraryMap.removeLayer(fallbackLine); } catch (e) { }
        }
        // Siguiente petición después del delay
        setTimeout(() => {
            osrmProcessing = false;
            processOsrmQueue();
        }, OSRM_REQUEST_DELAY);
    });

    routingCtrl.on('routingerror', function (e) {
        console.warn('🗺️ OSRM error, manteniendo línea fallback:', e.error);
        // Siguiente petición con delay extra ante error (posible rate limit)
        setTimeout(() => {
            osrmProcessing = false;
            processOsrmQueue();
        }, OSRM_REQUEST_DELAY * 2);
    });

    routingCtrl.addTo(itineraryMap);
    routeLines.push(routingCtrl);
}


// Helper: emoji por categoría de actividad
function getCategoryEmoji(category) {
    const map = {
        'Alojamiento': '🛏️',
        'Vuelo': '✈️',
        'Auto': '🚗',
        'Tren': '🚂',
        'Comida': '🍽️',
        'Actividades': '🎯',
        'Compras': '🛍️',
        'Entretenimiento': '🎉',
        'Salud': '💊',
        'Otro': '📦'
    };
    return map[category] || '📍';
}

// Helper: genera el HTML de un item dentro del popup
function buildPopupItem(index, dayIndex, title, category) {
    let emoji = getCategoryEmoji(category);
    return `<div class="map-popup-item"><span class="map-popup-emoji">${emoji}</span><div><div class="map-popup-text">${title}</div><div class="map-popup-day">Actividad ${index + 1} · Día ${dayIndex}</div></div></div>`;
}

// Función para ampliar o reducir el mapa a pantalla completa
function toggleMapFullscreen() {
    const container = document.getElementById('itinerary-map-container');
    const btn = document.getElementById('map-fullscreen-btn');

    if (container.classList.contains('map-fullscreen')) {
        container.classList.remove('map-fullscreen');
        btn.innerHTML = '⛶ Ampliar';
    } else {
        container.classList.add('map-fullscreen');
        btn.innerHTML = '⛶ Reducir';
    }

    // Forzar Leaflet a recalcular el tamaño del mosaico para evitar zonas grises
    if (itineraryMap) {
        setTimeout(() => {
            itineraryMap.invalidateSize();
        }, 300);
    }
}

// Función para inicializar o mostrar/ocultar mapa
function toggleItineraryMap() {
    const container = document.getElementById('itinerary-map-container');
    const showBtnWrap = document.getElementById('show-map-btn-wrap');

    console.log("🗺️ toggleItineraryMap disparado. Estado actual:", container.style.display);

    if (container.style.display === 'none') {
        // Mostrar
        container.style.display = 'block';
        showBtnWrap.style.display = 'none';

        // Si no está inicializado, crearlo
        if (!itineraryMap) {
            console.log("🗺️ Inicializando mapa de Leaflet...");
            initMap();
        }

        // Un pequeño retraso para asegurar que el DOM aplicó el display: block y Leaflet pueda leer las dimensiones reales
        setTimeout(() => {
            if (itineraryMap) {
                itineraryMap.invalidateSize(); // recalcular tamaño
            }
            // Dibujar marcadores actuales y centrar
            console.log("🗺️ Llamando a updateMap desde el setTimeout...");
            updateMap();
        }, 100);
    } else {
        // Ocultar — también salir de fullscreen si estaba activo
        if (container.classList.contains('map-fullscreen')) {
            container.classList.remove('map-fullscreen');
            const fsBtn = document.getElementById('map-fullscreen-btn');
            if (fsBtn) fsBtn.innerHTML = '⛶ Ampliar';
        }
        container.style.display = 'none';
        showBtnWrap.style.display = 'block';
    }
}

function initMap() {
    // Coordenadas base por defecto (ej. Centro de la pantalla o París)
    itineraryMap = L.map('itinerary-map', {
        preferCanvas: false // Revertido: SVG se sincroniza mejor con el gesto de arrastre en móviles
    }).setView([48.8566, 2.3522], 12);

    // Capa base de OpenStreetMap (Gratuita)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
    }).addTo(itineraryMap);

    // Inicializar grupo de clusters para agrupar pins cercanos
    if (window.L.markerClusterGroup) {
        markerClusterGroup = L.markerClusterGroup({
            maxClusterRadius: 40,
            spiderfyOnMaxZoom: true,
            showCoverageOnHover: false,
            zoomToBoundsOnClick: true,
            disableClusteringAtZoom: 14
        });
        itineraryMap.addLayer(markerClusterGroup);
    }
}

// Función principal para redibujar todo el mapa basándonos en currentTrip.itinerary
function updateMap() {
    console.log("🗺️ updateMap() invocado.");

    const container = document.getElementById('itinerary-map-container');
    if (container && container.style.display === 'none') {
        console.log("🗺️ Abortando updateMap: El contenedor está oculto.");
        return;
    }

    if (!itineraryMap) {
        console.log("🗺️ Abortando updateMap: itineraryMap es null.");
        return;
    }

    if (!window.currentTrip) {
        console.log("🗺️ Abortando updateMap: window.currentTrip es null.");
        return;
    }

    if (!window.currentTrip.itinerary) {
        console.log("🗺️ Abortando updateMap: window.currentTrip.itinerary es null o indefinido.");
        return;
    }

    // Limpiar marcadores y rutas previas
    clearMap();

    let days = window.currentTrip.itinerary;
    console.log("🗺️ Extrayendo itinerario. Días totales:", days.length);
    if (days.length === 0) return;

    let allWaypoints = [];
    let bounds = L.latLngBounds();
    let dayIndex = 1;

    let lastPointOfPrevDay = null; // Para la unión inter-día

    days.forEach((day) => {
        if (!day.items || day.items.length === 0) {
            dayIndex++;
            return;
        }

        let dayPoints = [];
        let firstItemOfThisDay = null; // Para saber si empezó con un Vuelo

        day.items.forEach((item, index) => {
            // Asegurar que forzamos la lectura incluso si Firebase devolvió un texto en lugar de un Float
            let lat = item.lat !== undefined && item.lat !== null ? parseFloat(item.lat) : NaN;
            let lng = item.lng !== undefined && item.lng !== null ? parseFloat(item.lng) : NaN;

            console.log(`🧭 Leaflet evaluando [${item.title}] -> Lat: ${lat}, Lng: ${lng}`);

            // Si falla la conversión a Float, saltamos
            if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
                console.error(`❌ Coordenadas rotas o vacías para: ${item.title}`);
                return;
            }

            // === DEDUPLICACIÓN GLOBAL DE PINES ===
            // Separamos dos conceptos:
            // 1. ¿Es adyacente al punto anterior? (para no rutear 0 metros)
            // 2. ¿Ya existe un pin en esta ubicación? (para no dibujar pins duplicados)

            let point = L.latLng(lat, lng);

            // 1. Verificar si es ADYACENTE al punto inmediatamente anterior
            let isAdjacentDuplicate = false;
            if (dayPoints.length > 0) {
                let prevPoint = dayPoints[dayPoints.length - 1];
                if (Math.abs(prevPoint.lat - lat) < 0.0001 && Math.abs(prevPoint.lng - lng) < 0.0001) {
                    isAdjacentDuplicate = true;
                }
            } else if (lastPointOfPrevDay) {
                if (Math.abs(lastPointOfPrevDay.lat - lat) < 0.0001 && Math.abs(lastPointOfPrevDay.lng - lng) < 0.0001) {
                    isAdjacentDuplicate = true;
                }
            }

            // 2. Buscar si ya existe un MARKER en esta ubicación (en todo el mapa, no solo el anterior)
            let existingMarker = null;
            for (let m of mapMarkers) {
                let mPos = m.getLatLng();
                if (Math.abs(mPos.lat - lat) < 0.0001 && Math.abs(mPos.lng - lng) < 0.0001) {
                    existingMarker = m;
                    break;
                }
            }

            // Si ya hay un pin aquí, fusionar la actividad en su popup
            if (existingMarker) {
                console.log(`📍 Fusionando actividad en pin existente para: ${item.title}`);
                if (item.title && typeof existingMarker.getPopup === 'function') {
                    let popup = existingMarker.getPopup();
                    if (popup) {
                        let currentPopup = popup.getContent();
                        existingMarker.setPopupContent(currentPopup + `<div class="map-popup-separator"></div>` + buildPopupItem(index, dayIndex, item.title, item.category));
                    }
                }

                // Si es Alojamiento, cambiar el icono a 🛏️
                if (item.category === "Alojamiento") {
                    let sleepColor = getColorForDay(dayIndex);
                    let sleepIcon = L.divIcon({
                        className: 'custom-map-marker',
                        html: `<div style="background-color:${sleepColor};width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:50%">🛏️</div>`,
                        iconSize: [28, 28],
                        iconAnchor: [14, 14],
                        popupAnchor: [0, -14]
                    });
                    existingMarker.setIcon(sleepIcon);
                }

                if (index === 0) firstItemOfThisDay = item;

                // Si es adyacente, NO lo añadimos a dayPoints (OSRM odia rutear 0 metros)
                // Si NO es adyacente (ej: volver a Sorrento desde Ravello), SÍ lo necesitamos para la ruta
                if (!isAdjacentDuplicate) {
                    dayPoints.push(point);
                    allWaypoints.push(point);
                    bounds.extend(point);
                }

                return;
            }

            // Si NO existe ningún pin aquí, lo añadimos para dibujar la ruta normal
            dayPoints.push(point);
            allWaypoints.push(point);
            bounds.extend(point);
            if (index === 0) firstItemOfThisDay = item;

        console.log(`✅ Dibujando PIN para: ${item.title}`);

        // === ICONO PERSONALIZADO ===
        // Si es un alojamiento (Dormir), mostrar su icono en vez del numero para diferenciar las noches de hotel de las paradas de carretera
        let pinContent = `${index + 1}`;
        if (item.category === "Alojamiento") {
            pinContent = "🛏️";
        }

        // Usar un divIcon con número ordenado (o emoji) y color asignado por el día
        let markerColor = getColorForDay(dayIndex);
        let customIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div style="background-color:${markerColor};width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:50%">${pinContent}</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
            popupAnchor: [0, -14]
        });

        // Marcador estándar y simple 
        let marker = L.marker([lat, lng], { icon: customIcon });
        if (markerClusterGroup) {
            markerClusterGroup.addLayer(marker);
        } else {
            marker.addTo(itineraryMap);
        }

        // Solo bind popup si hay título
        if (item.title) {
            marker.bindPopup(buildPopupItem(index, dayIndex, item.title, item.category));
        }

        mapMarkers.push(marker);
    });

    // == LÓGICA DE PUENTE INTER-DÍAS ==
    // Si venimos de un día anterior y tenemos puntos hoy, conectarlos
    if (lastPointOfPrevDay && dayPoints.length > 0 && window.L) {
        let bridgePoints = [lastPointOfPrevDay, dayPoints[0]];

        if (firstItemOfThisDay && firstItemOfThisDay.category === "Vuelo") {
            // Trazar un ARCO CURVO estilo aerolínea para vuelos
            let arcPoints = generateFlightArc(bridgePoints[0], bridgePoints[1], 30);
            let flightLine = L.polyline(arcPoints, {
                color: '#a855f7',
                weight: 2.5,
                opacity: 0.75,
                dashArray: window.innerWidth < 768 ? null : '8, 6', // Sin punteado en móvil para evitar jitter
                smoothFactor: 2.5
            }).addTo(itineraryMap);

            // Emoji de avión en el punto medio del arco
            let midPoint = arcPoints[Math.floor(arcPoints.length / 2)];
            let planeIcon = L.divIcon({
                className: 'flight-plane-icon',
                html: '✈️',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            let planeMarker = L.marker(midPoint, { icon: planeIcon, interactive: false }).addTo(itineraryMap);

            flightLine.bringToBack();
            routeLines.push(flightLine);
            routeLines.push(planeMarker);
        } else if (window.L.Routing) {
            // Si es un trayecto normal (Auto, Tren, etc), BUSCAR LA RUTA REAL por carretera
            let bridgeDayColor = getColorForDay(dayIndex);
            enqueueRoute(bridgePoints, [{ color: bridgeDayColor, opacity: 0.9, weight: 6 }], null);
        }
    }

    // LÓGICA DE RUTAS DENTRO DEL DÍA MISMO
    if (dayPoints.length > 1 && window.L) {
        let dayColor = getColorForDay(dayIndex);

        // DIBUJAR SIEMPRE LA BASE INCONDICIONAL: Si OSRM falla brutalmente por CORS o timeout sin diparar el evento 'routingerror', 
        // no nos quedaremos con mapa vacío.
        let fallbackLine = L.polyline(dayPoints, {
            color: dayColor,
            weight: 5,
            opacity: 0.6,
            dashArray: window.innerWidth < 768 ? null : '10, 15', // Solido en móvil
            smoothFactor: 3.0
        }).addTo(itineraryMap);
        routeLines.push(fallbackLine);

        if (window.L.Routing) {
            enqueueRoute(dayPoints, [{ color: dayColor, opacity: 0.9, weight: 6 }], fallbackLine);
        }
    }

    // Guardamos el último punto usable de este día como ancla para el próximo
    if (dayPoints.length > 0) {
        lastPointOfPrevDay = dayPoints[dayPoints.length - 1];
    }

    dayIndex++;
});

/* 
// Dibujar una Ruta Global Continua que una a TODOS los días del viaje
// Mantenemos esta como LINEA RECTA porque calcular una carretera estilo RoadTrip a través de múltiples países (Ej: Chile a Paris) rompería LRM
if (allWaypoints.length > 1 && window.L) {
    let globalLine = L.polyline(allWaypoints, {
        color: '#3b82f6', // Color principal de la App (Azul)
        weight: 3,
        opacity: 0.6,
        dashArray: '5, 10' // Línea Punteada para cruces largos
    }).addTo(itineraryMap);
    
    // Lo añadimos al principio del array visual para que las rutas OSRM destaquen por encima
    globalLine.bringToBack();
    routeLines.push(globalLine);
}
*/

// Ajustar vista para mostrar todos los puntos
if (allWaypoints.length > 0) {
    itineraryMap.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
}

// Generar leyenda de días
buildDayLegend(days);
}

// Construir leyenda de colores por día
function buildDayLegend(days) {
    // Eliminar leyenda anterior si existe
    let existing = document.getElementById('map-day-legend');
    if (existing) existing.remove();

    if (!days || days.length === 0) return;

    let legend = document.createElement('div');
    legend.id = 'map-day-legend';
    legend.className = 'map-day-legend';

    let header = document.createElement('div');
    header.className = 'map-legend-header';
    header.innerHTML = '🗓️ Días';
    header.onclick = () => legend.classList.toggle('collapsed');
    legend.appendChild(header);

    let list = document.createElement('div');
    list.className = 'map-legend-list';

    days.forEach((day, i) => {
        let dayNum = i + 1;
        let color = getColorForDay(dayNum);
        let label = day.date ? new Date(day.date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) : `Día ${dayNum}`;

        let item = document.createElement('div');
        item.className = 'map-legend-item';
        item.innerHTML = `<span class="map-legend-dot" style="background:${color}"></span><span class="map-legend-label">${label}</span>`;
        list.appendChild(item);
    });

    legend.appendChild(list);
    document.getElementById('itinerary-map-container').appendChild(legend);
}

function clearMap() {
    // Cancelar peticiones OSRM pendientes
    osrmQueue = [];
    osrmProcessing = false;

    // Remove markers
    mapMarkers.forEach(m => {
        if (markerClusterGroup) {
            markerClusterGroup.removeLayer(m);
        } else {
            itineraryMap.removeLayer(m);
        }
    });
    mapMarkers = [];

    // Remove lines and routing controls safely
    routeLines.forEach(item => {
        try {
            // Check if it's a Routing Control (it has getPlan) or a Polyline
            if (item.getPlan) {
                // Bugfix LRM: Pre-remove internal route layers BEFORE removeControl
                // LRM crash: it calls this._map.removeLayer(this._line) but _map can be null
                try {
                    if (item._line && itineraryMap) {
                        itineraryMap.removeLayer(item._line);
                        item._line = null;
                    }
                } catch (e) { }

                // Also clean alternative route lines that LRM stores internally
                try {
                    if (item._alternatives && item._alternatives.length) {
                        item._alternatives.forEach(alt => {
                            if (alt && itineraryMap) {
                                try { itineraryMap.removeLayer(alt); } catch (e) { }
                            }
                        });
                        item._alternatives = [];
                    }
                } catch (e) { }

                // Pre-hide the container so if it's null inside min.js it doesn't crash
                let container = null;
                try { container = item.getContainer(); } catch (e) { }
                if (container) container.style.display = 'none';

                // Now safe to call removeControl since internal layers are already gone
                try { itineraryMap.removeControl(item); } catch (e) { }
            } else {
                itineraryMap.removeLayer(item);
            }
        } catch (e) {
            // LRM bugfix: Silenciamos TypeError residual 
            console.log("📍 LRM instance cleared implicitly");
        }
    });
    routeLines = [];

    // Remove routing machine control if used from previous old vars
    if (routingControl && itineraryMap) {
        try { itineraryMap.removeControl(routingControl); } catch (e) { }
        routingControl = null;
    }
}

function getColorForDay(dayIndex) {
    const colors = [
        '#3b82f6', // 1  Azul
        '#ef4444', // 2  Rojo
        '#10b981', // 3  Verde esmeralda
        '#f59e0b', // 4  Naranja/Ámbar
        '#8b5cf6', // 5  Violeta
        '#ec4899', // 6  Rosa
        '#14b8a6', // 7  Teal
        '#f97316', // 8  Naranja fuerte
        '#06b6d4', // 9  Cyan
        '#e11d48', // 10 Rojo rosa
        '#84cc16', // 11 Lima
        '#6366f1', // 12 Índigo
        '#d946ef', // 13 Fucsia
        '#0ea5e9', // 14 Celeste
        '#ca8a04', // 15 Dorado
        '#22d3ee', // 16 Aqua
        '#a855f7', // 17 Púrpura
        '#4ade80', // 18 Verde claro
        '#fb7185', // 19 Coral
        '#38bdf8', // 20 Azul cielo
    ];
    return colors[(dayIndex - 1) % colors.length];
}

// Generar un arco curvo entre dos puntos para visualizar vuelos
function generateFlightArc(start, end, numPoints) {
    let points = [];
    let midLat = (start.lat + end.lat) / 2;
    let midLng = (start.lng + end.lng) / 2;

    // Calcular la distancia para ajustar la curvatura
    let dLat = end.lat - start.lat;
    let dLng = end.lng - start.lng;
    let dist = Math.sqrt(dLat * dLat + dLng * dLng);

    // El punto de control se desplaza perpendicularmente al segmento
    // Curvatura proporcional a la distancia (más lejos = más arco)
    let curvature = dist * 0.15;
    let perpLat = midLat + (dLng * curvature) / dist;
    let perpLng = midLng - (dLat * curvature) / dist;

    for (let i = 0; i <= numPoints; i++) {
        let t = i / numPoints;
        // Bezier cuadrático: B(t) = (1-t)²·P0 + 2(1-t)t·P1 + t²·P2
        let lat = (1 - t) * (1 - t) * start.lat + 2 * (1 - t) * t * perpLat + t * t * end.lat;
        let lng = (1 - t) * (1 - t) * start.lng + 2 * (1 - t) * t * perpLng + t * t * end.lng;
        points.push(L.latLng(lat, lng));
    }
    return points;
}

// Generador de Link a Google Maps con Múltiples Puntos (Waypoints)
function getGoogleMapsDayLink(day) {
    if (!day || !day.items || day.items.length === 0) return '#';

    // Formato de URL de Google Maps para rutas:
    // https://www.google.com/maps/dir/?api=1&origin=Paris&destination=Lyon&waypoints=Versailles|Marseille

    let points = day.items.filter(i => i.lat && i.lng);
    if (points.length === 0) {
        // Si no tienen coordenadas, intentamos por nombre (menos preciso para la URL)
        points = day.items.filter(i => i.title);
    }

    if (points.length === 0) return '#';

    let origin = getPointParam(points[0]);

    if (points.length === 1) {
        // Solo un pin, buscar ese punto
        return `https://www.google.com/maps/search/?api=1&query=${origin}`;
    }

    let destination = getPointParam(points[points.length - 1]);
    let waypoints = '';

    if (points.length > 2) {
        let mids = points.slice(1, points.length - 1);
        waypoints = '&waypoints=' + mids.map(p => getPointParam(p)).join('|');
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypoints}&travelmode=walking`;
}

function getPointParam(item) {
    if (item.lat && item.lng) {
        return `${item.lat},${item.lng}`;
    }
    // Fallback a buscar por cadena de texto
    return encodeURIComponent(item.title);
}

// Make globally available
window.toggleItineraryMap = toggleItineraryMap;
window.toggleMapFullscreen = toggleMapFullscreen;
window.updateMap = updateMap;
window.getGoogleMapsDayLink = getGoogleMapsDayLink;
