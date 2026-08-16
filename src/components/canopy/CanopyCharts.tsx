import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { CanopySnapshot } from '../../types';
import { baseChartOptions, chartTheme } from '../../utils/chartTheme';
import ChartCanvas from '../common/ChartCanvas';

function useBarConfig(data: CanopySnapshot) {
    return useMemo<ChartConfiguration<'bar'>>(() => {
        const th = chartTheme();
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
                    y: { ticks: { color: '#ddd', font: { size: 12.5 } }, grid: { display: false } },
                },
            },
        };
    }, [data]);
}

function useLineConfig(data: CanopySnapshot) {
    return useMemo<ChartConfiguration<'line'>>(() => {
        const th = chartTheme();
        return {
            type: 'line',
            data: {
                labels: data.trend.labels,
                datasets: [
                    {
                        label: 'Canopy %',
                        data: data.trend.values,
                        borderColor: th.red,
                        backgroundColor: 'rgba(255,45,85,.12)',
                        fill: true,
                        tension: 0.35,
                        pointRadius: 3,
                        pointBackgroundColor: th.red,
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
    }, [data]);
}

function useDoughnutConfig(data: CanopySnapshot) {
    return useMemo<ChartConfiguration<'doughnut'>>(() => {
        const th = chartTheme();
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
    }, [data]);
}

export function CanopyBarChart({ data }: { data: CanopySnapshot }) {
    return <ChartCanvas id="canopyBarChart" config={useBarConfig(data)} />;
}

export function CanopyTrendChart({ data }: { data: CanopySnapshot }) {
    return <ChartCanvas id="canopyLineChart" config={useLineConfig(data)} />;
}

export function LandCoverChart({ data }: { data: CanopySnapshot }) {
    return <ChartCanvas id="landCoverChart" config={useDoughnutConfig(data)} />;
}
