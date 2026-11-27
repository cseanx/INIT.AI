import { addProtocol, type AddProtocolAction } from 'maplibre-gl';
import { lstScaleRgbAt } from './lstScale';

/**
 * Recolor NASA GIBS LST tiles on the client.
 *
 * GIBS publishes pre-colorized PNGs. Their global 200–350 K palette leaves
 * Philippine temperatures in a narrow green/yellow band, and the compact
 * legend needs a local 10–40°C scale. This protocol reads the exact palette
 * color of each pixel back to °C, then applies the same scale as the legend.
 */

const PROTOCOL = 'lst-recolor';
const PALETTE_URL =
    'https://gibs.earthdata.nasa.gov/colormaps/v1.3/MODIS_Land_Surface_Temp.xml';

let registered = false;
let palettePromise: Promise<Map<number, number>> | null = null;
const nearestCache = new Map<number, number | null>();

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

function loadPalette(): Promise<Map<number, number>> {
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

function temperatureForRgb(
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

    const result = bestDistance <= 4500 ? bestTemp : null;
    nearestCache.set(key, result);
    return result;
}

async function recolor(buffer: ArrayBuffer): Promise<ImageBitmap> {
    const bitmap = await createImageBitmap(
        new Blob([buffer], { type: 'image/png' }),
    );
    const { canvas, ctx } = createCanvas(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const palette = await loadPalette();
    const pixels = image.data;

    for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] === 0) continue;

        const temp = temperatureForRgb(
            pixels[index],
            pixels[index + 1],
            pixels[index + 2],
            palette,
        );
        if (temp === null) continue;

        const [red, green, blue] = lstScaleRgbAt(temp);
        pixels[index] = red;
        pixels[index + 1] = green;
        pixels[index + 2] = blue;
    }

    ctx.putImageData(image, 0, 0);
    bitmap.close();
    return createImageBitmap(canvas);
}

const recolorTile: AddProtocolAction = async (params) => {
    const sourceUrl = `https://${params.url.replace(`${PROTOCOL}://`, '')}`;
    const response = await fetch(sourceUrl);
    if (!response.ok) {
        throw new Error(`LST tile request failed: ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    try {
        return { data: await recolor(buffer) };
    } catch (error) {
        console.warn('LST recolor failed; using NASA palette', error);
        return { data: buffer };
    }
};

export function registerLstRecolorProtocol(): void {
    if (registered) return;
    addProtocol(PROTOCOL, recolorTile);
    registered = true;
}

export function lstRecolorUrl(sourceUrl: string): string {
    return `${PROTOCOL}://${sourceUrl.replace(/^https?:\/\//, '')}`;
}
