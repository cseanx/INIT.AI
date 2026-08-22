import { Map as MapLibreMap, Popup } from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { LST_MAX_C, LST_MIN_C, type LSTCollection } from './lstData';

/**
 * LST rendering module. Owns everything MapLibre-specific about the layer:
 * source registration, fill/outline paint, layer ordering, and hover/click
 * inspection. Data comes from lstData.ts (mock today, FastAPI/PostGIS later).
 *
 * Layer order: LST renders above the satellite basemap but below the
 * place-label reference layer (and any future hotspot markers/popups).
 */

const SOURCE_ID = 'lst-source';
const FILL_LAYER_ID = 'lst-fill';
const OUTLINE_LAYER_ID = 'lst-outline';
/** Everything LST-related inserts before this existing style layer. */
const INSERT_BEFORE_LAYER_ID = 'place-labels';

/** Same ramp as the HeatLegend: blue → cyan → green → yellow → orange → red. */
function temperatureColorExpression(): unknown {
    return [
        'case',
        ['==', ['typeof', ['get', 'temperature_c']], 'null'],
        'rgba(0,0,0,0)',
        [
            'interpolate',
            ['linear'],
            ['to-number', ['get', 'temperature_c']],
            LST_MIN_C,
            '#3b82f6',
            30,
            '#00d4ff',
            33,
            '#00ff84',
            36,
            '#ffd23f',
            40,
            '#ff8c42',
            LST_MAX_C,
            '#ff2d55',
        ],
    ];
}

export function isLSTAttached(map: MapLibreMap): boolean {
    return !!map.getSource(SOURCE_ID);
}

/**
 * Register the LST source + layers. Idempotent. Returns false if the
 * insertion point is missing (style not loaded yet), in which case callers
 * may retry once the style layers exist.
 */
export function attachLSTLayer(map: MapLibreMap, data: LSTCollection): boolean {
    if (!map.getLayer(INSERT_BEFORE_LAYER_ID)) return false;
    if (!isLSTAttached(map)) {
        map.addSource(SOURCE_ID, {
            type: 'geojson',
            data: data as never,
        });
    }
    if (!map.getLayer(FILL_LAYER_ID)) {
        map.addLayer(
            {
                id: FILL_LAYER_ID,
                type: 'fill',
                source: SOURCE_ID,
                paint: {
                    'fill-color': temperatureColorExpression() as never,
                    // Semi-transparent so the satellite imagery stays visible.
                    'fill-opacity': 0.55,
                },
            },
            INSERT_BEFORE_LAYER_ID,
        );
    }
    if (!map.getLayer(OUTLINE_LAYER_ID)) {
        map.addLayer(
            {
                id: OUTLINE_LAYER_ID,
                type: 'line',
                source: SOURCE_ID,
                paint: {
                    // Subtle light border so adjacent cells stay distinguishable.
                    'line-color': 'rgba(255,255,255,.45)',
                    'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.2],
                },
            },
            INSERT_BEFORE_LAYER_ID,
        );
    }
    return true;
}

/** Format a temperature for display: `34.5°C`, or an em dash when absent. */
export function formatTemperature(value: unknown): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
    return `${value.toFixed(1)}°C`;
}

/**
 * Hover + click inspection. A single shared popup shows name, province,
 * region, temperature, timestamp and data source; cells without a reading
 * render "No data". Returns a cleanup function.
 */
export function bindLSTInteractions(map: MapLibreMap): () => void {
    const popup = new Popup({
        closeButton: false,
        closeOnClick: false,
        offset: 12,
        className: 'lst-popup-wrapper',
        maxWidth: '280px',
    });

    function popupHtml(properties: Record<string, unknown> | null | undefined): string {
        const p = properties ?? {};
        const name = typeof p.name === 'string' ? p.name : 'Unnamed area';
        const province = typeof p.province === 'string' ? p.province : null;
        const region = typeof p.region === 'string' ? p.region : null;
        const location = [province, region].filter(Boolean).join(' · ');
        const temp = formatTemperature(p.temperature_c);
        const hasReading = temp !== '—';
        const ts =
            typeof p.timestamp === 'string' && !Number.isNaN(Date.parse(p.timestamp))
                ? new Date(p.timestamp).toLocaleString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                  })
                : '—';
        const source = typeof p.source === 'string' ? p.source : 'Unknown source';
        return `
            <div class="lst-popup">
                <div class="lst-popup-title">${name}</div>
                ${location ? `<div class="lst-popup-sub">${location}</div>` : ''}
                <div class="lst-popup-temp${hasReading ? '' : ' empty'}">${hasReading ? temp : 'No data'}</div>
                <div class="lst-popup-meta">Observed ${ts}</div>
                <div class="lst-popup-meta">Source: ${source}</div>
            </div>`;
    }

    function show(e: MapLayerMouseEvent) {
        const props = e.features?.[0]?.properties as Record<string, unknown> | undefined;
        if (!props) return;
        popup.setLngLat(e.lngLat).setHTML(popupHtml(props)).addTo(map);
    }

    const onEnter = () => {
        map.getCanvas().style.cursor = 'pointer';
    };
    const onLeave = () => {
        map.getCanvas().style.cursor = '';
        popup.remove();
    };

    map.on('mouseenter', FILL_LAYER_ID, onEnter);
    map.on('mousemove', FILL_LAYER_ID, show);
    map.on('mouseleave', FILL_LAYER_ID, onLeave);
    map.on('click', FILL_LAYER_ID, show);

    return () => {
        map.off('mouseenter', FILL_LAYER_ID, onEnter);
        map.off('mousemove', FILL_LAYER_ID, show);
        map.off('mouseleave', FILL_LAYER_ID, onLeave);
        map.off('click', FILL_LAYER_ID, show);
        popup.remove();
        map.getCanvas().style.cursor = '';
    };
}