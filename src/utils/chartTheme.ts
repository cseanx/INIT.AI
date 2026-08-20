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
    };
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