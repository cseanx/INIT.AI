import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * Future-ready map layer registry.
 *
 * The UI (MapLayersPanel) renders purely from these definitions — adding a
 * backend-backed layer later means appending an entry here (and flipping
 * `available` to true once its source/style layers exist). No UI changes.
 */

export type LayerGroupId = 'basemap' | 'environmental' | 'administrative' | 'risk';

export interface LayerGroupDef {
    id: LayerGroupId;
    label: string;
}

export interface MapLayerDef {
    /** Stable id — also the key in the visibility state map. */
    id: string;
    label: string;
    icon: string;
    group: LayerGroupId;
    /** Style layer ids this toggle drives. Omit for not-yet-implemented layers. */
    styleLayers?: string[];
    /** Whether the underlying data source is connected yet. */
    available: boolean;
    /** Placeholder text shown while the data source is missing. */
    pendingNote?: string;
}

export const LAYER_GROUPS: LayerGroupDef[] = [
    { id: 'basemap', label: 'Basemap' },
    { id: 'environmental', label: 'Environmental Layers' },
    { id: 'administrative', label: 'Administrative Layers' },
    { id: 'risk', label: 'Risk Layers' },
];

export const MAP_LAYERS: MapLayerDef[] = [
    {
        id: 'satellite',
        label: 'Satellite Imagery',
        icon: 'fa-satellite',
        group: 'basemap',
        styleLayers: ['satellite-basemap'],
        available: true,
    },
    {
        id: 'lst',
        label: 'Land Surface Temperature',
        icon: 'fa-temperature-half',
        group: 'environmental',
        // Continuous raster XYZ from GET /api/layers/lst/tiles/{z}/{x}/{y}.png (hourly, palette -40→40).
        styleLayers: ['lst-raster'],
        available: true,
    },
    {
        id: 'ndvi',
        label: 'NDVI Vegetation Index',
        icon: 'fa-seedling',
        group: 'environmental',
        available: false,
        pendingNote: 'NDVI raster service is not connected yet.',
    },
    {
        id: 'barangays',
        label: 'Barangay Boundaries',
        icon: 'fa-vector-square',
        group: 'administrative',
        available: false,
        pendingNote: 'Boundary GeoJSON is not connected yet.',
    },
    {
        id: 'hotspots',
        label: 'Heat Hotspots',
        icon: 'fa-fire',
        group: 'risk',
        available: false,
        pendingNote: 'Hotspot overlay ships with the risk engine.',
    },
];

/** Default visibility per layer. LST raster is now hourly realtime so it starts on. */
const LAYER_DEFAULTS: Record<string, boolean> = {
    satellite: true,
    lst: true,
    ndvi: false,
    barangays: false,
    hotspots: false,
};

/** Default visibility for every registered layer. */
export function defaultLayerState(): Record<string, boolean> {
    return Object.fromEntries(
        MAP_LAYERS.map((layer) => [layer.id, LAYER_DEFAULTS[layer.id] ?? false]),
    );
}

/**
 * Apply one layer's visibility to the map instance. Returns false when
 * nothing was applied (layer not implemented / style layers missing) so the
 * UI can show its placeholder state. Never throws for future layers.
 */
export function applyLayerVisibility(
    map: MapLibreMap,
    layer: MapLayerDef,
    visible: boolean,
): boolean {
    if (!layer.available || !layer.styleLayers) return false;
    let applied = false;
    for (const styleLayer of layer.styleLayers) {
        if (map.getLayer(styleLayer)) {
            map.setLayoutProperty(styleLayer, 'visibility', visible ? 'visible' : 'none');
            applied = true;
        }
    }
    return applied;
}