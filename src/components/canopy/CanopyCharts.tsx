import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { CanopySnapshot, ResolvedTheme } from '../../types';
import { baseChartOptions, chartTheme } from '../../utils/chartTheme';
import { usePreferences } from '../../preferences/PreferencesContext';
import ChartCanvas from '../common/ChartCanvas';

function useBarConfig(
    data: CanopySnapshot,
    resolvedTheme: ResolvedTheme,
) {
    return useMemo<ChartConfiguration<'bar'>>(() => {
        const th = chartTheme(resolvedTheme);
        return {
            type: 'bar',
            data: {
                labels: data.barData.map((d) => d.name),
                datasets: [
                    {
                        label: 'Canopy %',
                        data: data.barData.map((d) => d.value),
                        backgroundColor: data.barData.map((d) =>
                            d.value < 18 ? th.red : d.value < 30 ? th.orange : th.green,
                        ),
                        borderRadius: 6,
                        barThickness: 20,
                    },
                ],
            },
            options: {
                indexAxis: 'y',
                ...baseChartOptions(),
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.parsed.x}% canopy cover`,
                        },
                    },
                },
                scales: {
                    x: {
                        min: 0,
                        max: 50,
                        ticks: { color: th.text, callback: (v) => `${v}%` },
                        grid: { color: th.grid },
                    },
                    y: { ticks: { color: th.axis, font: { size: 12.5 } }, grid: { display: false } },
                },
            },
        };
    }, [data, resolvedTheme]);
}

function useLineConfig(
    data: CanopySnapshot,
    resolvedTheme: ResolvedTheme,
) {
    return useMemo<ChartConfiguration<'line'>>(() => {
        const th = chartTheme(resolvedTheme);
        return {
            type: 'line',
            data: {
                labels: data.trend.labels,
                datasets: [
                    {
                        label: 'Canopy %',
                        data: data.trend.values,
                        borderColor: th.brand,
                        backgroundColor: `rgba(${th.brandRgb},.12)`,
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: th.brand,
                    },
                ],
            },
            options: {
                ...baseChartOptions(),
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.parsed.y}% canopy`,
                        },
                    },
                },
                scales: {
                    x: { ticks: { color: th.text }, grid: { display: false } },
                    y: { ticks: { color: th.text, callback: (v) => `${v}%` }, grid: { color: th.grid } },
                },
            },
        };
    }, [data, resolvedTheme]);
}

function useDoughnutConfig(
    data: CanopySnapshot,
    resolvedTheme: ResolvedTheme,
) {
    return useMemo<ChartConfiguration<'doughnut'>>(() => {
        const th = chartTheme(resolvedTheme);
        return {
            type: 'doughnut',
            data: {
                labels: data.landCover.map((d) => d.label),
                datasets: [
                    {
                        data: data.landCover.map((d) => d.value),
                        backgroundColor: data.landCover.map((d) => d.color),
                        borderColor: '#0d0d0d',
                        borderWidth: 3,
                    },
                ],
            },
            options: {
                cutout: '62%',
                ...baseChartOptions(),
                // Override the inherited per-slice stagger: a doughnut/pie
                // reads best as one continuous sweep completing the ring,
                // not each wedge popping in independently.
                animation: {
                    // animateRotate sweeps the whole arc set from 0° like a
                    // clock filling in; animateScale grows it from the
                    // center at the same time for a bit more presence.
                    animateRotate: true,
                    animateScale: true,
                    duration: 1300,
                    easing: 'easeOutQuart',
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: th.text, boxWidth: 10, font: { size: 10.5 }, padding: 12 },
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label}: ${ctx.parsed}%`,
                        },
                    },
                },
            },
        };
    }, [data, resolvedTheme]);
}

export function CanopyBarChart({ data }: { data: CanopySnapshot }) {
    const { resolvedTheme } = usePreferences();
    return <ChartCanvas id="canopyBarChart" config={useBarConfig(data, resolvedTheme)} />;
}

export function CanopyTrendChart({ data }: { data: CanopySnapshot }) {
    const { resolvedTheme } = usePreferences();
    return <ChartCanvas id="canopyLineChart" config={useLineConfig(data, resolvedTheme)} />;
}

export function LandCoverChart({ data }: { data: CanopySnapshot }) {
    const { resolvedTheme } = usePreferences();
    return <ChartCanvas id="landCoverChart" config={useDoughnutConfig(data, resolvedTheme)} />;
}