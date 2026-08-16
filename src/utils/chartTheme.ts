/* Shared Chart.js palette, matching the app's dark glass theme. */
export function chartTheme() {
    return {
        grid: 'rgba(255,255,255,.06)',
        text: '#888',
        red: '#ff2d55',
        orange: '#ff8c42',
        yellow: '#ffd23f',
        green: '#00ff84',
        blue: '#5aa9ff',
    };
}

/**
 * Shared chart options for the dashboard:
 * entrance animation per the Chart.js docs (options.animation); resizes
 * stay instant because the default 'resize' transition duration is 0.
 *
 * Note: do NOT add `devicePixelRatio` here — it forces an immediate
 * full-resolution draw that bypasses the entrance animation.
 *
 * See https://www.chartjs.org/docs/latest/configuration/animations.html
 */
export function baseChartOptions() {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 800,
            easing: 'easeOutQuart',
        },
    } as const;
}
