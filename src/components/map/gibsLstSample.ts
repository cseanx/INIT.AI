import {
    gibsLstTileUrl,
    shiftLstDate,
    type LstMode,
    type LstSourceId,
} from './gibsLst';

/**
 * Sample the real land-surface temperature at a point from the same NASA GIBS
 * raster the map displays. GIBS publishes pre-colorized PNGs; the colormap
 * below decodes each published color back to °C. This is a ~1 km color-bin
 * estimate, not a live sensor reading and not a separate point API.
 *
 * The caller supplies the tile template, so every platform and cadence shares
 * the same decoder and cache while keeping the sampled pixel aligned with the
 * visible layer.
 */

const PALETTE_URL =
    'https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_Land_Surface_Temp.xml';
const SAMPLE_ZOOM = 7; // GIBS GoogleMapsCompatible_Level7 native zoom
const TILE_SIZE = 256;
const TILE_CACHE_LIMIT = 16;
const MAX_MATCH_DISTANCE = 4500;
/** Physical gate: MODIS LST bins run 200–350 K; fill/below-range colors must not decode. */
const MIN_VALID_LST_C = -90;
const MAX_VALID_LST_C = 80;
const MIN_PALETTE_KELVIN = 180;

let palettePromise: Promise<Map<number, number>> | null = null;
const nearestCache = new Map<number, number | null>();
const tileCache = new Map<string, Uint8ClampedArray | null>();
const inflight = new Map<string, Promise<Uint8ClampedArray | null>>();
const latestDateCache = new Map<string, string>();

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
        const entryPattern = /<ColorMapEntry\b([^>]*)>/g;
        let match: RegExpExecArray | null;

        while ((match = entryPattern.exec(xml)) !== null) {
            const attributes = match[1];
            // The colormap starts with a transparent fill entry whose
            // sourceValue maps to 0 K. Never treat it as a temperature.
            if (
                /transparent="true"/.test(attributes) ||
                /nodata="true"/.test(attributes)
            ) {
                continue;
            }

            const rgb = /rgb="(\d+),(\d+),(\d+)"/.exec(attributes);
            const source = /sourceValue="\[([\d.]+),([\d.]+)\)"/.exec(attributes);
            if (!rgb || !source) continue;

            const kelvin =
                ((Number(source[1]) + Number(source[2])) / 2) * 0.02;
            const tempC = kelvin - 273.15;
            if (
                kelvin < MIN_PALETTE_KELVIN ||
                tempC < MIN_VALID_LST_C ||
                tempC > MAX_VALID_LST_C
            ) {
                continue;
            }

            palette.set(
                (Number(rgb[1]) << 16) |
                    (Number(rgb[2]) << 8) |
                    Number(rgb[3]),
                tempC,
            );
        }

        if (!palette.size) throw new Error('LST colormap contained no entries');
        return palette;
    })();

    return palettePromise;
}

function isPlausibleLst(tempC: number): boolean {
    return tempC >= MIN_VALID_LST_C && tempC <= MAX_VALID_LST_C;
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
    if (exact !== undefined) return isPlausibleLst(exact) ? exact : null;
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

    const result =
        bestDistance <= MAX_MATCH_DISTANCE &&
        bestTemp !== null &&
        isPlausibleLst(bestTemp)
            ? bestTemp
            : null;
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

/**
 * Walk back from the newest processed date until the city has real coverage.
 * A tile can be mostly data while the city is cloud or water, so this checks a
 * five-point cross around the city center and prefers the latest date with
 * broad coverage. It only falls back to the newest date when every day is
 * mostly cloudy.
 */
const PROBE_OFFSETS_SURROUNDING: Array<[number, number]> = [
    [0.02, 0],
    [-0.02, 0],
    [0, 0.02],
    [0, -0.02],
];

export async function findLatestLstDate(
    center: [number, number],
    sourceId: LstSourceId,
    mode: LstMode,
    maxDate: string,
    attempts = 14,
): Promise<string> {
    const cacheKey = `${sourceId}:${mode}:${center[0].toFixed(3)}:${center[1].toFixed(3)}:${maxDate}`;
    const cached = latestDateCache.get(cacheKey);
    if (cached) return cached;

    let date = maxDate;
    let bestDate = maxDate;
    let bestScore = -1;

    for (let index = 0; index < attempts; index += 1) {
        const tileTemplate = gibsLstTileUrl(sourceId, date, mode, 'daily');
        const centerSample = await sampleGibsLstPoint(
            center[0],
            center[1],
            tileTemplate,
        );

        // The map opens on the city center; a date with no pixel there is a
        // blank first impression even if the surrounding ring is clear.
        if (centerSample.status !== 'ok') {
            date = shiftLstDate(date, -1);
            continue;
        }

        let score = 1;
        for (const [dLng, dLat] of PROBE_OFFSETS_SURROUNDING) {
            const sample = await sampleGibsLstPoint(
                center[0] + dLng,
                center[1] + dLat,
                tileTemplate,
            );
            if (sample.status === 'ok') score += 1;
        }

        if (score > bestScore) {
            bestScore = score;
            bestDate = date;
        }
        if (score >= 4) {
            latestDateCache.set(cacheKey, date);
            return date;
        }

        date = shiftLstDate(date, -1);
    }

    const result = bestScore > 0 ? bestDate : maxDate;
    latestDateCache.set(cacheKey, result);
    if (latestDateCache.size > 32) {
        const oldest = latestDateCache.keys().next().value;
        if (oldest !== undefined) latestDateCache.delete(oldest);
    }
    return result;
}

/** Read the real GIBS LST pixel under a coordinate for the supplied layer. */
export async function sampleGibsLstPoint(
    lng: number,
    lat: number,
    tileTemplate: string,
): Promise<GibsLstSample> {
    const { x, y, px, py } = tileForPoint(lng, lat);
    const tileUrl = tileTemplate.replace(
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
