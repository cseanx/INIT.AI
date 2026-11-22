/* Shared Chart.js palette. Dark matches the app's dark glass theme; light
   adapts the same accents for light backgrounds. `brand` is the INIT.AI red
   (used by the dashboard scatter, inspector sparkline, and canopy trend
   line); the red/orange/yellow/green/blue data scale stays semantic so
   heat/severity charts keep their meaning. */

export function chartTheme(theme: 'dark' | 'light' = 'dark') {
    return {
        grid: theme === 'light' ? 'rgba(15,20,30,.08)' : 'rgba(255,255,255,.06)',
        text: theme === 'light' ? '#5a5f69' : '#888',
        axis: theme === 'light' ? '#3a3f47' : '#ddd',
        brand: '#ff2d55',
        brandRgb: '255, 45, 85',
        red: '#ff2d55',
        orange: '#ff8c42',
        yellow: '#ffd23f',
        green: '#00ff84',
        blue: '#5aa9ff',
        /* Annotation (least-squares fit) and tooltip chrome, per theme. */
        fit: theme === 'light' ? 'rgba(24,26,32,.24)' : 'rgba(255,255,255,.22)',
        tooltipBg: theme === 'light' ? 'rgba(255,255,255,.98)' : 'rgba(14,14,16,.96)',
        tooltipBorder: theme === 'light' ? 'rgba(20,25,35,.12)' : 'rgba(255,255,255,.12)',
        tooltipTitle: theme === 'light' ? '#181a20' : '#ffffff',
        tooltipBody: theme === 'light' ? '#5a5f69' : '#b8b8b8',
    };
}

/* ---------- WCAG contrast helper for SVG chart furniture ---------- */

function srgbChannel(v: number): number {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relLuminance(r: number, g: number, b: number): number {
    return 0.2126 * srgbChannel(r) + 0.7152 * srgbChannel(g) + 0.0722 * srgbChannel(b);
}

/**
 * Blend a text color toward black (light background) or white (dark
 * background) until it clears `target` contrast against `bg`. Data hues stay
 * recognizable while text built from them stays legible in both themes.
 */
export function ensureTextContrast(hex: string, bg: string, target = 4.6): string {
    const parse = (h: string): [number, number, number] => {
        const n = h.replace('#', '');
        const s = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
        return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
    };
    const [r, g, b] = parse(hex);
    const [br, bgc, bb] = parse(bg);
    const towardBlack = relLuminance(br, bgc, bb) > relLuminance(r, g, b);
    for (let t = 0; t <= 0.72; t += 0.02) {
        const f = 1 - t;
        const rr = Math.round(towardBlack ? r * f : r + (255 - r) * t);
        const gr = Math.round(towardBlack ? g * f : g + (255 - g) * t);
        const br2 = Math.round(towardBlack ? b * f : b + (255 - b) * t);
        const lum = relLuminance(rr, gr, br2);
        const ratio =
            (Math.max(lum, relLuminance(br, bgc, bb)) + 0.05) /
            (Math.min(lum, relLuminance(br, bgc, bb)) + 0.05);
        if (ratio >= target) return `rgb(${rr}, ${gr}, ${br2})`;
    }
    return towardBlack ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)';
}

/**
 * Shared chart options for the dashboard: staggered entrance animation
 * where each data point/bar/slice pops in with a slight overshoot
 * (easeOutBack) instead of the whole dataset animating in lockstep.
 * Resizes stay instant because the default 'resize' transition duration is 0.
 *
 * Note: do NOT add `devicePixelRatio` here — it forces an immediate
 * full-resolution draw that bypasses the entrance animation.
 *
 * See https://www.chartjs.org/docs/latest/configuration/animations.html
 */
export function baseChartOptions() {
    // Respect the OS motion preference: render charts instantly, no stagger.
    const reducedMotion =
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
        } as const;
    }

    let delayed = false;

    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 900,
            easing: 'easeOutQuart',
            // Stagger: each dataIndex/datasetIndex kicks off a beat later,
            // so bars/points/slices cascade in instead of snapping together.
            delay: (ctx: any) => {
                let delay = 0;
                if (ctx.type === 'data' && ctx.mode === 'default' && !delayed) {
                    delay = ctx.dataIndex * 40 + ctx.datasetIndex * 100;
                }
                return delay;
            },
            onComplete: () => {
                // After the first paint, disable the stagger so tooltip/hover
                // redraws (and live data updates) don't re-trigger the cascade.
                delayed = true;
            },
        },
        animations: {
            // Points/bars/arcs scale up with a slight overshoot for a
            // punchier, more "alive" feel than a linear grow.
            radius: {
                easing: 'easeOutBack',
                duration: 600,
            },
            scale: {
                easing: 'easeOutBack',
                duration: 700,
            },
        },
    } as const;
}