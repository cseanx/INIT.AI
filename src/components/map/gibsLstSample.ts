import { gibsLstTileUrl, type LstCadence, type LstMode } from './gibsLst';

/**
 * Sample the real MODIS LST value at a point from the same NASA GIBS raster
 * the map displays. GIBS publishes pre-colorized PNGs; the colormap below
 * decodes each published color back to °C. This is a 1 km color-bin estimate,
 * not a live sensor reading and not a separate point API.
 */

const PALETTE_URL =
    'https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_Land_Surface_Temp.xml';
const SAMPLE_ZOOM = 7; // GIBS GoogleMapsCompatible_Level7 native zoom
const TILE_SIZE = 256;
const TILE_CACHE_LIMIT = 16;
const MAX_MATCH_DISTANCE = 4500;

let palettePromise: Promise<Map<number, number>> | null = null;
const nearestCache = new Map<number, number | null>();
const tileCache = new Map<string, Uint8ClampedArray | null>();
const inflight = new Map<string, Promise<Uint8ClampedArray | null>>();

function createCanvas(width: number, height: number) {
    if (typeof OffscreenCanvas !== 'undefined') {
        const canvas = new OffscreenCanvas(width, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Unable to create OffscreenCanvas 2D context');
        return { canvas, ctx };
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Unable to create canvas 2D context');
    return { canvas, ctx };
}

export function loadGibsLstPalette(): Promise<Map<number, number>> {
    if (palettePromise) return palettePromise;

    palettePromise = (async () => {
        const response = await fetch(PALETTE_URL);
        if (!response.ok) {
            throw new Error(`LST colormap request failed: ${response.status}`);
        }
        const xml = await response.text();
        const palette = new Map<number, number>();
        const entryPattern =
            /<ColorMapEntry\b[^>]*rgb="(\d+),(\d+),(\d+)"[^>]*sourceValue="\[([\d.]+),([\d.]+)\)"/g;
        let match: RegExpExecArray | null;

        while ((match = entryPattern.exec(xml)) !== null) {
            const kelvin =
                ((Number(match[4]) + Number(match[5])) / 2) * 0.02;
            palette.set(
                (Number(match[1]) << 16) |
                    (Number(match[2]) << 8) |
                    Number(match[3]),
                kelvin - 273.15,
            );
        }

        if (!palette.size) throw new Error('LST colormap contained no entries');
        return palette;
    })();

    return palettePromise;
}

/** Decode one published GIBS RGB color to °C (null when off-palette). */
export function decodeGibsLstRgb(
    red: number,
    green: number,
    blue: number,
    palette: Map<number, number>,
): number | null {
    const key = (red << 16) | (green << 8) | blue;
    const exact = palette.get(key);
    if (exact !== undefined) return exact;
    if (nearestCache.has(key)) return nearestCache.get(key) ?? null;

    let bestTemp: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    for (const [paletteKey, temp] of palette) {
        const pr = (paletteKey >> 16) & 255;
        const pg = (paletteKey >> 8) & 255;
        const pb = paletteKey & 255;
        const distance =
            (red - pr) * (red - pr) +
            (green - pg) * (green - pg) +
            (blue - pb) * (blue - pb);
        if (distance < bestDistance) {
            bestDistance = distance;
            bestTemp = temp;
        }
    }

    const result = bestDistance <= MAX_MATCH_DISTANCE ? bestTemp : null;
    nearestCache.set(key, result);
    return result;
}

export type GibsLstSample =
    | { status: 'ok'; tempC: number; tileUrl: string }
    | { status: 'nodata'; tileUrl: string }
    | { status: 'error'; tileUrl: string };

function tileForPoint(lng: number, lat: number) {
    const count = 2 ** SAMPLE_ZOOM;
    const xf = ((lng + 180) / 360) * count;
    const radians = (lat * Math.PI) / 180;
    const yf =
        ((1 - Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) / 2) *
        count;
    const x = Math.floor(xf);
    const y = Math.floor(yf);
    return {
        x,
        y,
        px: Math.min(TILE_SIZE - 1, Math.max(0, Math.floor((xf - x) * TILE_SIZE))),
        py: Math.min(TILE_SIZE - 1, Math.max(0, Math.floor((yf - y) * TILE_SIZE))),
    };
}

function readTile(url: string): Promise<Uint8ClampedArray | null> {
    const cached = tileCache.get(url);
    if (cached !== undefined) return Promise.resolve(cached);
    const pending = inflight.get(url);
    if (pending) return pending;

    const job = (async () => {
        try {
            const response = await fetch(url);
            if (!response.ok) return null;
            const bitmap = await createImageBitmap(
                new Blob([await response.arrayBuffer()], { type: 'image/png' }),
            );
            const { ctx } = createCanvas(TILE_SIZE, TILE_SIZE);
            ctx.drawImage(bitmap, 0, 0, TILE_SIZE, TILE_SIZE);
            const data = ctx.getImageData(0, 0, TILE_SIZE, TILE_SIZE).data;
            bitmap.close();
            tileCache.set(url, data);
            if (tileCache.size > TILE_CACHE_LIMIT) {
                const oldest = tileCache.keys().next().value;
                if (oldest !== undefined) tileCache.delete(oldest);
            }
            return data;
        } catch {
            return null;
        } finally {
            inflight.delete(url);
        }
    })();

    inflight.set(url, job);
    return job;
}

/** Read the real GIBS LST pixel under a coordinate for the active pass. */
export async function sampleGibsLstPoint(
    lng: number,
    lat: number,
    date: string,
    mode: LstMode,
    cadence: LstCadence,
): Promise<GibsLstSample> {
    const { x, y, px, py } = tileForPoint(lng, lat);
    const tileUrl = gibsLstTileUrl(date, mode, cadence).replace(
        '{z}/{y}/{x}',
        `${SAMPLE_ZOOM}/${y}/${x}`,
    );

    const data = await readTile(tileUrl);
    if (!data) return { status: 'error', tileUrl };

    const index = (py * TILE_SIZE + px) * 4;
    if (data[index + 3] === 0) return { status: 'nodata', tileUrl };

    try {
        const palette = await loadGibsLstPalette();
        const temp = decodeGibsLstRgb(data[index], data[index + 1], data[index + 2], palette);
        if (temp === null) return { status: 'nodata', tileUrl };
        return { status: 'ok', tempC: temp, tileUrl };
    } catch {
        return { status: 'error', tileUrl };
    }
}
