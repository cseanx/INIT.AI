/**
 * INIT.AI thermal scale for the LST map.
 *
 * NASA's GIBS LST tiles are pre-colorized with a global 200–350 K palette,
 * which leaves Philippine temperatures in a narrow green/yellow band. The map
 * reads those published color bins back into °C (the palette colors are exact)
 * and applies this local 10–40°C scale so the legend and the map agree.
 *
 * The ramp follows the familiar purple → cyan/blue → green → yellow →
 * orange → red heat transition.
 */

export const LST_SCALE_MIN_C = 10;
export const LST_SCALE_MAX_C = 40;

export const LST_SCALE_STOPS: Array<{ c: number; color: string }> = [
    { c: 10, color: '#8d7bd8' },
    { c: 14, color: '#72b8dd' },
    { c: 18, color: '#4f8fce' },
    { c: 22, color: '#6fb56a' },
    { c: 26, color: '#b8cc3f' },
    { c: 30, color: '#e3c73c' },
    { c: 34, color: '#e69a3a' },
    { c: 37, color: '#d95f39' },
    { c: 40, color: '#a92335' },
];

/** Ticks are evenly spaced across the 10–40°C window. */
export const LST_SCALE_TICKS = [10, 20, 30, 40];

export function lstScaleGradientCSS(): string {
    const span = LST_SCALE_MAX_C - LST_SCALE_MIN_C;
    return `linear-gradient(90deg, ${LST_SCALE_STOPS.map(
        (stop) => `${stop.color} ${(((stop.c - LST_SCALE_MIN_C) / span) * 100).toFixed(2)}%`,
    ).join(', ')})`;
}

function hexToRgb(hex: string): [number, number, number] {
    const value = Number.parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/** RGB for a temperature, clamped to the scale ends. */
export function lstScaleRgbAt(tempC: number): [number, number, number] {
    const clamped = Math.min(LST_SCALE_MAX_C, Math.max(LST_SCALE_MIN_C, tempC));

    for (let index = 0; index < LST_SCALE_STOPS.length - 1; index += 1) {
        const left = LST_SCALE_STOPS[index];
        const right = LST_SCALE_STOPS[index + 1];
        if (clamped <= right.c) {
            const ratio = (clamped - left.c) / (right.c - left.c);
            const [lr, lg, lb] = hexToRgb(left.color);
            const [rr, rg, rb] = hexToRgb(right.color);
            return [
                Math.round(lr + (rr - lr) * ratio),
                Math.round(lg + (rg - lg) * ratio),
                Math.round(lb + (rb - lb) * ratio),
            ];
        }
    }

    return hexToRgb(LST_SCALE_STOPS[LST_SCALE_STOPS.length - 1].color);
}
