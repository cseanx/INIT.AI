import type { Feature, FeatureCollection, Polygon } from 'geojson';

export type LSTFeature = Feature<Polygon, LSTFeatureProperties>;
export type LSTCollection = FeatureCollection<Polygon, LSTFeatureProperties>;

/**
 * LST (Land Surface Temperature) data loading.
 *
 * Rendering lives in lstLayer.ts; this module only produces GeoJSON so the
 * source can be swapped without touching map code:
 *
 *   Today:  LST_DATA_SOURCE = { type: 'mock' }  → bundled sample grid
 *   Future: LST_DATA_SOURCE = { type: 'api', url: '/api/layers/lst' }
 *           → GET /api/layers/lst?date=YYYY-MM-DD&region=...&province=...
 *             returning a GeoJSON FeatureCollection with the same
 *             feature properties as LSTFeatureProperties.
 */

export interface LSTFeatureProperties {
    id: string;
    name: string;
    province?: string;
    region?: string;
    /** °C. May be null/undefined — the renderer must degrade gracefully. */
    temperature_c: number | null;
    /** ISO timestamp of the satellite pass. */
    timestamp: string;
    source: string;
}

export interface LSTDataSource {
    type: 'mock' | 'api';
    url?: string;
}

/** Swap to { type: 'api', url: '/api/layers/lst' } once the FastAPI/PostGIS
 *  endpoint exists — nothing else in the app needs to change. */
export const LST_DATA_SOURCE: LSTDataSource = { type: 'mock' };

/** Color-ramp bounds shared by the layer paint and the legend. */
export const LST_MIN_C = 25;
export const LST_MAX_C = 45;

interface MockCellSpec {
    id: string;
    name: string;
    province: string;
    region: string;
    /** [minLng, minLat, maxLng, maxLat] rough grid cell around the area. */
    box: [number, number, number, number];
    temperature_c: number | null;
}

/** Sample grid across the five MIMAROPA provinces. Values are plausible
 *  mid-afternoon surface temperatures (urban cores run hottest). One cell
 *  carries no reading (persistent cloud cover) to exercise graceful
 *  handling of missing values. */
const MOCK_CELLS: MockCellSpec[] = [
    // Occidental Mindoro
    { id: 'lst-001', name: 'Mamburao Urban Core', province: 'Occidental Mindoro', region: 'MIMAROPA', box: [120.55, 13.18, 120.65, 13.27], temperature_c: 37.4 },
    { id: 'lst-002', name: 'San Jose Agricultural Plain', province: 'Occidental Mindoro', region: 'MIMAROPA', box: [120.95, 12.30, 121.10, 12.45], temperature_c: 35.8 },
    { id: 'lst-003', name: 'Sablayan Coastal', province: 'Occidental Mindoro', region: 'MIMAROPA', box: [120.70, 12.75, 120.85, 12.90], temperature_c: 34.6 },
    // Oriental Mindoro
    { id: 'lst-004', name: 'Calapan City Core', province: 'Oriental Mindoro', region: 'MIMAROPA', box: [121.14, 13.37, 121.24, 13.47], temperature_c: 38.1 },
    { id: 'lst-005', name: 'Naujan Lake', province: 'Oriental Mindoro', region: 'MIMAROPA', box: [121.25, 13.12, 121.45, 13.27], temperature_c: 32.9 },
    { id: 'lst-006', name: 'Puerto Galera Coast', province: 'Oriental Mindoro', region: 'MIMAROPA', box: [120.92, 13.47, 121.03, 13.55], temperature_c: 33.7 },
    // Marinduque
    { id: 'lst-007', name: 'Boac Town Core', province: 'Marinduque', region: 'MIMAROPA', box: [121.80, 13.41, 121.89, 13.49], temperature_c: 36.2 },
    { id: 'lst-008', name: 'Gasan Coast', province: 'Marinduque', region: 'MIMAROPA', box: [121.84, 13.28, 121.93, 13.36], temperature_c: 34.8 },
    { id: 'lst-009', name: 'Santa Cruz Uplands', province: 'Marinduque', region: 'MIMAROPA', box: [122.00, 13.33, 122.12, 13.45], temperature_c: 32.6 },
    // Romblon
    { id: 'lst-010', name: 'Romblon Town', province: 'Romblon', region: 'MIMAROPA', box: [122.24, 12.55, 122.31, 12.62], temperature_c: 35.6 },
    { id: 'lst-011', name: 'Odiongan', province: 'Romblon', region: 'MIMAROPA', box: [121.97, 12.38, 122.06, 12.47], temperature_c: 34.9 },
    { id: 'lst-012', name: 'Sibuyan Interior', province: 'Romblon', region: 'MIMAROPA', box: [122.40, 12.30, 122.60, 12.50], temperature_c: 31.8 },
    // Palawan
    { id: 'lst-013', name: 'Puerto Princesa Core', province: 'Palawan', region: 'MIMAROPA', box: [118.70, 9.70, 118.82, 9.82], temperature_c: 39.0 },
    { id: 'lst-014', name: 'El Nido', province: 'Palawan', region: 'MIMAROPA', box: [119.35, 11.14, 119.45, 11.24], temperature_c: 35.1 },
    { id: 'lst-015', name: 'Coron', province: 'Palawan', region: 'MIMAROPA', box: [120.15, 11.95, 120.25, 12.05], temperature_c: 34.4 },
    { id: 'lst-016', name: "Brooke's Point", province: 'Palawan', region: 'MIMAROPA', box: [117.78, 8.75, 117.88, 8.85], temperature_c: 33.9 },
    { id: 'lst-017', name: 'Taytay Cloud Cover', province: 'Palawan', region: 'MIMAROPA', box: [119.45, 10.75, 119.60, 10.90], temperature_c: null },
];

const MOCK_TIMESTAMP = '2026-11-02T14:30:00+08:00';
const MOCK_SOURCE = 'INIT.AI mock composite (MIMAROPA demo)';

function boxToRing([minLng, minLat, maxLng, maxLat]: [number, number, number, number]): number[][] {
    return [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
    ];
}

/** Bundled mock FeatureCollection — clearly isolated behind loadLSTData(). */
function buildMockCollection(): LSTCollection {
    return {
        type: 'FeatureCollection',
        features: MOCK_CELLS.map((cell) => ({
            type: 'Feature',
            geometry: { type: 'Polygon', coordinates: [boxToRing(cell.box)] },
            properties: {
                id: cell.id,
                name: cell.name,
                province: cell.province,
                region: cell.region,
                temperature_c: cell.temperature_c,
                timestamp: MOCK_TIMESTAMP,
                source: MOCK_SOURCE,
            },
        })),
    };
}

/** Fetch LST GeoJSON from the configured source. Throws on network failure —
 *  callers decide how to degrade (the map simply ships without the layer). */
export async function loadLSTData(
    params: { date?: string; region?: string; province?: string } = {},
): Promise<LSTCollection> {
    if (LST_DATA_SOURCE.type === 'api') {
        const base = LST_DATA_SOURCE.url ?? '/api/layers/lst';
        const query = new URLSearchParams();
        if (params.date) query.set('date', params.date);
        if (params.region) query.set('region', params.region);
        if (params.province) query.set('province', params.province);
        const qs = query.toString();
        const response = await fetch(qs ? `${base}?${qs}` : base);
        if (!response.ok) {
            throw new Error(`LST endpoint returned ${response.status}`);
        }
        return (await response.json()) as LSTCollection;
    }
    return buildMockCollection();
}