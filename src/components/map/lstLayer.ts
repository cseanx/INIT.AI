import type {
    FillLayerSpecification,
    LineLayerSpecification,
    Map as MapLibreMap,
} from 'maplibre-gl';
import { Popup } from 'maplibre-gl';
import type { MapLayerMouseEvent } from 'maplibre-gl';
import { LST_MAX_C, LST_MIN_C, type LSTCollection } from './lstData';

/**
 * LST rendering module. Owns everything MapLibre-specific about the layer:
 * source/style-layer specs, paint ramp, and hover/click inspection.
 * Data comes exclusively from lstData.ts (bundled mock today; swap that
 * single module over to Google Earth Engine → FastAPI → PostGIS later).
 *
 * The source + fill/outline layers are declared in MapView's base style
 * (between the satellite imagery and the place labels) seeded with an
 * EMPTY collection; real/mock data is pushed in at runtime via
 * pushLSTData(). Declaring them up front means the existing Layers-panel
 * toggle always targets layers that exist — no attach-timing races.
 */

export const LST_SOURCE_ID = 'lst-source';
export const LST_FILL_LAYER_ID = 'lst-fill';
export const LST_OUTLINE_LAYER_ID = 'lst-outline';

/** Seed payload so the declared source starts out empty/invisible. */
export function emptyLSTCollection(): LSTCollection {
    return { type: 'FeatureCollection', features: [] };
}

/** Same ramp as the legend: blue → cyan → green → yellow → orange → red
 *  across 25–45 °C. Cells without a numeric reading render transparent. */
function temperatureRamp(): never {
    return [
        'interpolate',
        ['linear'],
        ['number', ['coalesce', ['get', 'temperature_c'], LST_MIN_C]],
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
    ] as never;
}

export function lstFillLayerSpec(): FillLayerSpecification {
    return {
        id: LST_FILL_LAYER_ID,
        type: 'fill',
        source: LST_SOURCE_ID,
        paint: {
            // Cells lacking a reading stay fully transparent. NOTE: the
            // empty branch must be an ['rgba', …] expression — a string
            // literal would make `case` mix string/color types and the
            // whole expression fails to parse (layer never renders).
            'fill-color': [
                'case',
                ['==', ['typeof', ['get', 'temperature_c']], 'null'],
                ['rgba', 0, 0, 0, 0],
                temperatureRamp(),
            ] as never,
            // …and the rest stays translucent so satellite shows through.
            'fill-opacity': 0.6,
        },
    };
}

export function lstOutlineLayerSpec(): LineLayerSpecification {
    return {
        id: LST_OUTLINE_LAYER_ID,
        type: 'line',
        source: LST_SOURCE_ID,
        paint: {
            // Subtle light border so adjacent cells remain distinguishable.
            'line-color': 'rgba(255,255,255,.45)',
            'line-width': ['interpolate', ['linear'], ['zoom'], 5, 0.6, 10, 1.2] as never,
        },
    };
}

/** Push a (mock or future API) collection into the declared source. */
export function pushLSTData(map: MapLibreMap, data: LSTCollection): void {
    const source = map.getSource(LST_SOURCE_ID) as
        | { setData: (d: LSTCollection) => void }
        | undefined;
    if (!source) return;
    source.setData(data);
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

    map.on('mouseenter', LST_FILL_LAYER_ID, onEnter);
    map.on('mousemove', LST_FILL_LAYER_ID, show);
    map.on('mouseleave', LST_FILL_LAYER_ID, onLeave);
    map.on('click', LST_FILL_LAYER_ID, show);

    return () => {
        map.off('mouseenter', LST_FILL_LAYER_ID, onEnter);
        map.off('mousemove', LST_FILL_LAYER_ID, show);
        map.off('mouseleave', LST_FILL_LAYER_ID, onLeave);
        map.off('click', LST_FILL_LAYER_ID, show);
        popup.remove();
        map.getCanvas().style.cursor = '';
    };
}