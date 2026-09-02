/**
 * Thermal raster — GEE Landsat LST (A) primary, TiTiler COG (B fallback).
 * Global overlay, no PH crop — entire MapLibre. Honest LST (30m), not OpenWeather air temp.
 * Frontend just consumes backend proxy `/api/layers/lst/tiles/{z}/{x}/{y}.png?date=...`
 * which internally tries GEE → TiTiler → synthetic (all via same URL).
 */

export const LST_RASTER_SOURCE_ID = 'lst';
export const LST_RASTER_LAYER_ID = 'lst-raster';

// INIT.AI thermal palette for legend — real LST 15→45°C (spec §4)
export const RASTER_PALETTE_STOPS: Array<{ temp: number; color: string }> = [
    { temp: 15, color: '#1a3a8f' },
    { temp: 20, color: '#2a7fff' },
    { temp: 25, color: '#00d4ff' },
    { temp: 28, color: '#00e676' },
    { temp: 32, color: '#a0ff00' },
    { temp: 35, color: '#ffd23f' },
    { temp: 38, color: '#ff8c42' },
    { temp: 42, color: '#ff2d55' },
    { temp: 45, color: '#b0003a' },
];

export const LST_MIN_C = 15;
export const LST_MAX_C = 45;

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';
function apiUrl(path: string): string {
    if (import.meta.env.DEV) return path;
    return API_BASE ? `${API_BASE}${path}` : path;
}

export function lstTileUrl(date: string = '2023-12-06'): string {
    // Entire MapLibre, no crop. Backend internally: GEE (A) → TiTiler (B) → synthetic.
    return apiUrl(`/api/layers/lst/tiles/{z}/{x}/{y}.png?date=${encodeURIComponent(date)}`);
}

export function lstSourceLabel(): string {
    return 'GEE Landsat LST (30m) → TiTiler fallback';
}
export const HAS_OPENWEATHER_KEY = false; // kept for legend compatibility, not used for tiles now

// CSS for vertical/horizontal bar — smooth, not discrete boxes
export function paletteVerticalCSS(): string {
    const stops = RASTER_PALETTE_STOPS.map(s => s.color).join(', ');
    return `linear-gradient(to top, ${stops})`;
}

export function paletteHorizontalCSS(): string {
    const stops = RASTER_PALETTE_STOPS.map(s => s.color).join(', ');
    return `linear-gradient(90deg, ${stops})`;
}

/** Fetch single-point temperature from backend GEE (honest LST). */
export async function fetchLSTPoint(
    lat: number,
    lng: number,
    date: string = '2023-12-06',
): Promise<{ temperature_c: number | null; timestamp: string } | null> {
    try {
        const res = await fetch(apiUrl(`/api/layers/lst/point?lat=${lat}&lng=${lng}&date=${encodeURIComponent(date)}`));
        if (!res.ok) return null;
        return (await res.json()) as { temperature_c: number | null; timestamp: string };
    } catch {
        return null;
    }
}

export async function fetchLSTInfo(): Promise<{ min: number; max: number; timestamp: string } | null> {
    // OpenWeather tiles have no per-tile min/max API; legend is static visual guide.
    return { min: LST_MIN_C, max: LST_MAX_C, timestamp: new Date().toISOString() };
}
