import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { Barangay } from '../../types';
import { baseChartOptions, chartTheme } from '../../utils/chartTheme';
import { usePreferences } from '../../preferences/PreferencesContext';
import ChartCanvas from '../common/ChartCanvas';

/** Least-squares fit + Pearson r over the plotted barangays. */
function correlation(data: Barangay[]) {
    const n = data.length;
    if (n < 2) return null;

    const meanX = data.reduce((sum, b) => sum + b.canopy, 0) / n;
    const meanY = data.reduce((sum, b) => sum + b.temp, 0) / n;

    let covariance = 0;
    let varianceX = 0;
    let varianceY = 0;
    for (const b of data) {
        const dx = b.canopy - meanX;
        const dy = b.temp - meanY;
        covariance += dx * dy;
        varianceX += dx * dx;
        varianceY += dy * dy;
    }
    if (varianceX === 0 || varianceY === 0) return null;

    const slope = covariance / varianceX;
    const intercept = meanY - slope * meanX;
    const xs = data.map((b) => b.canopy);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    return {
        r: covariance / Math.sqrt(varianceX * varianceY),
        fit: [
            { x: minX, y: intercept + slope * minX },
            { x: maxX, y: intercept + slope * maxX },
        ],
    };
}

/** Canopy % vs surface temp scatter for the dashboard panel. */
export default function DashboardChart({ data }: { data: Barangay[] }) {
    const { resolvedTheme } = usePreferences();
    const stats = useMemo(() => correlation(data), [data]);

    const config = useMemo<ChartConfiguration>(() => {
        const th = chartTheme(resolvedTheme);
        return {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Barangays',
                        data: data.map((b) => ({ x: b.canopy, y: b.temp })),
                        backgroundColor: th.brand,
                        borderColor:
                            resolvedTheme === 'light'
                                ? 'rgba(255,255,255,.85)'
                                : 'rgba(5,5,5,.55)',
                        borderWidth: 1,
                        pointRadius: 4.5,
                        pointHoverRadius: 6.5,
                        pointHoverBorderWidth: 1.5,
                        pointHitRadius: 14,
                    },
                    ...(stats
                        ? [
                              {
                                  type: 'line' as const,
                                  label: 'Least-squares fit',
                                  data: stats.fit,
                                  borderColor: th.fit,
                                  borderWidth: 1.5,
                                  borderDash: [4, 4],
                                  pointRadius: 0,
                                  pointHoverRadius: 0,
                                  fill: false,
                                  tension: 0,
                              },
                          ]
                        : []),
                ],
            },
            options: {
                ...baseChartOptions(),
                interaction: { mode: 'nearest', intersect: true },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: th.tooltipBg,
                        titleColor: th.tooltipTitle,
                        bodyColor: th.tooltipBody,
                        borderColor: th.tooltipBorder,
                        borderWidth: 1,
                        cornerRadius: 10,
                        padding: 10,
                        displayColors: false,
                        titleFont: { size: 12, weight: 600 },
                        bodyFont: { size: 12 },
                        // The fit line is an annotation, not a point to inspect.
                        filter: (item) => item.datasetIndex === 0,
                        callbacks: {
                            title: (items) =>
                                data[items[0]?.dataIndex ?? -1]?.name ?? '',
                            label: (ctx) =>
                                `${(ctx.parsed.y ?? 0).toFixed(1)}°C at ${ctx.parsed.x}% canopy`,
                        },
                    },
                },
                scales: {
                    x: {
                        min: 0,
                        max: 60,
                        border: { display: false },
                        grid: { color: th.grid, drawTicks: false },
                        ticks: {
                            color: th.text,
                            padding: 8,
                            stepSize: 10,
                            font: { size: 11.5 },
                        },
                        title: {
                            display: true,
                            text: 'Canopy cover (%)',
                            color: th.text,
                            padding: { top: 10 },
                            font: { size: 11.5 },
                        },
                    },
                    y: {
                        min: 28,
                        max: 44,
                        border: { display: false },
                        grid: { color: th.grid, drawTicks: false },
                        ticks: {
                            color: th.text,
                            padding: 8,
                            stepSize: 4,
                            font: { size: 11.5 },
                        },
                        title: {
                            display: true,
                            text: 'Surface temp (°C)',
                            color: th.text,
                            padding: { bottom: 10 },
                            font: { size: 11.5 },
                        },
                    },
                },
            },
        };
    }, [data, resolvedTheme, stats]);

    return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
            <div className="relative min-h-[200px] flex-1">
                <ChartCanvas id="dashMiniChart" config={config} />
            </div>
            <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-white/6 pt-3 text-[12px]">
                <span className="text-[#888]">
                    Inverse correlation across all monitored barangays
                </span>
                {stats ? (
                    <span
                        className="font-semibold tabular-nums text-[#aaa]"
                        title={`Pearson correlation across the ${data.length} barangays in this view`}
                    >
                        r = {stats.r < 0 ? '−' : ''}
                        {Math.abs(stats.r).toFixed(2)}
                    </span>
                ) : null}
            </div>
        </div>
    );
}
