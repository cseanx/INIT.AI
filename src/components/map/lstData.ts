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

/** Sample grid across Luzon / Visayas / Mindanao. Values are plausible
 *  mid-afternoon surface temperatures (urban cores run hottest). One cell
 *  carries no reading (persistent cloud cover) to exercise graceful
 *  handling of missing values. */
const MOCK_CELLS: MockCellSpec[] = [
    // Luzon
    { id: 'lst-001', name: 'Metro Manila Core', province: 'Metro Manila', region: 'NCR', box: [120.90, 14.45, 121.15, 14.70], temperature_c: 42.3 },
    { id: 'lst-002', name: 'Quezon City Plateau', province: 'Metro Manila', region: 'NCR', box: [121.00, 14.62, 121.18, 14.78], temperature_c: 40.1 },
    { id: 'lst-003', name: 'Manila Bay Coastal', province: 'Metro Manila', region: 'NCR', box: [120.85, 14.48, 121.00, 14.58], temperature_c: 33.6 },
    { id: 'lst-004', name: 'Baguio Highlands', province: 'Benguet', region: 'CAR', box: [120.52, 16.36, 120.68, 16.48], temperature_c: 24.9 },
    { id: 'lst-005', name: 'Ilocos Coastal Plain', province: 'Ilocos Norte', region: 'Region I', box: [120.35, 17.90, 120.75, 18.30], temperature_c: 34.8 },
    { id: 'lst-006', name: 'Cagayan Valley', province: 'Isabela', region: 'Region II', box: [121.40, 16.60, 122.10, 17.20], temperature_c: 37.2 },
    { id: 'lst-007', name: 'Bicol Pacific Slope', province: 'Albay', region: 'Region V', box: [123.20, 13.05, 123.70, 13.45], temperature_c: 35.4 },
    { id: 'lst-008', name: 'Sierra Madre Range', province: 'Aurora', region: 'Region III', box: [121.50, 15.60, 122.00, 16.20], temperature_c: 28.7 },
    { id: 'lst-009', name: 'Polillo Cloud Cover', province: 'Quezon', region: 'Region IV-A', box: [121.80, 14.70, 122.20, 14.95], temperature_c: null },
    // Visayas
    { id: 'lst-010', name: 'Cebu Metro Corridor', province: 'Cebu', region: 'Region VII', box: [123.70, 10.20, 124.05, 10.55], temperature_c: 38.9 },
    { id: 'lst-011', name: 'Iloilo Basin', province: 'Iloilo', region: 'Region VI', box: [122.40, 10.55, 122.75, 10.85], temperature_c: 36.1 },
    { id: 'lst-012', name: 'Western Negros Fields', province: 'Negros Occidental', region: 'Region VI', box: [122.80, 10.20, 123.30, 10.80], temperature_c: 32.4 },
    { id: 'lst-013', name: 'Leyte Gulf Shore', province: 'Leyte', region: 'Region VIII', box: [124.80, 10.90, 125.15, 11.25], temperature_c: 31.8 },
    { id: 'lst-014', name: 'Bohol Interior', province: 'Bohol', region: 'Region VII', box: [124.00, 9.60, 124.60, 10.10], temperature_c: 34.0 },
    // Mindanao
    { id: 'lst-015', name: 'Davao Urban Spread', province: 'Davao del Sur', region: 'Region XI', box: [125.45, 7.00, 125.80, 7.30], temperature_c: 35.2 },
    { id: 'lst-016', name: 'Bukidnon Highlands', province: 'Bukidnon', region: 'Region X', box: [124.80, 7.80, 125.40, 8.40], temperature_c: 27.5 },
    { id: 'lst-017', name: 'Zamboanga Peninsula', province: 'Zamboanga del Sur', region: 'Region IX', box: [122.90, 7.40, 123.40, 7.90], temperature_c: 33.3 },
    { id: 'lst-018', name: 'Socsksargen Flatlands', province: 'South Cotabato', region: 'Region XII', box: [124.60, 6.20, 125.20, 6.70], temperature_c: 36.8 },
];

const MOCK_TIMESTAMP = '2026-08-19T14:30:00+08:00';
const MOCK_SOURCE = 'INIT.AI mock composite (pre-deployment)';

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