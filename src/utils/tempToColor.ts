/** Map a temperature (~28–42°C) onto the blue → green → yellow → orange → red scale. */
export function tempToColor(t: number): string {
    const stops = [
        { t: 28, c: [26, 58, 92] },
        { t: 32, c: [47, 111, 78] },
        { t: 35, c: [255, 210, 63] },
        { t: 38, c: [255, 140, 66] },
        { t: 42, c: [255, 45, 85] },
    ];
    let lo = stops[0];
    let hi = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (t >= stops[i].t && t <= stops[i + 1].t) {
            lo = stops[i];
            hi = stops[i + 1];
            break;
        }
    }
    const range = hi.t - lo.t || 1;
    const f = Math.min(1, Math.max(0, (t - lo.t) / range));
    const c = lo.c.map((v, i) => Math.round(v + (hi.c[i] - v) * f));
    return `rgb(${c[0]},${c[1]},${c[2]})`;
}
