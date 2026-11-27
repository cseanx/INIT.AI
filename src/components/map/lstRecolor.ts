import { addProtocol, type AddProtocolAction } from 'maplibre-gl';
import { lstScaleRgbAt } from './lstScale';
import { decodeGibsLstRgb, loadGibsLstPalette } from './gibsLstSample';

/**
 * Recolor NASA GIBS LST tiles on the client.
 *
 * GIBS publishes pre-colorized PNGs. Their global 200–350 K palette leaves
 * Philippine temperatures in a narrow green/yellow band, and the compact
 * legend needs a local 10–40°C scale. This protocol reads the exact palette
 * color of each pixel back to °C, then applies the same scale as the legend.
 * The palette decoder is shared with the map's click-to-sample popup.
 */

const PROTOCOL = 'lst-recolor';
let registered = false;

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

async function recolor(buffer: ArrayBuffer): Promise<ImageBitmap> {
    const bitmap = await createImageBitmap(
        new Blob([buffer], { type: 'image/png' }),
    );
    const { canvas, ctx } = createCanvas(bitmap.width, bitmap.height);
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
    const palette = await loadGibsLstPalette();
    const pixels = image.data;

    for (let index = 0; index < pixels.length; index += 4) {
        if (pixels[index + 3] === 0) continue;

        const temp = decodeGibsLstRgb(
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
