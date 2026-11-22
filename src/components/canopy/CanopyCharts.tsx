import { useMemo } from 'react';
import type { ChartConfiguration, Plugin } from 'chart.js';
import type { Barangay, CanopySnapshot, ResolvedTheme } from '../../types';
import { baseChartOptions, chartTheme, ensureTextContrast } from '../../utils/chartTheme';
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

/* ============ Canopy detail: canopy state vs five-year trajectory ============ */

/** Canopy state bands — the same thresholds the coverage bar chart colors
 *  by, so both barangay instruments read as one scale. */
function canopyBandColor(canopy: number, th: ReturnType<typeof chartTheme>): string {
    return canopy < 18 ? th.red : canopy < 30 ? th.orange : th.green;
}

interface TrajectoryFurniture {
    labels: string[];
    threshold: number;
    counts: { thinShrinking: number; thinRecovering: number; losing: number; gaining: number };
    theme: ResolvedTheme;
}

type LabelRect = { x: number; y: number; w: number; h: number };

const CORNER_FONT = '600 10px "Outfit", system-ui, sans-serif';
const NAME_FONT = '600 10.5px "Outfit", system-ui, sans-serif';

/**
 * Draws the quadrant furniture and the barangay name labels, so the chart
 * reads at rest instead of through hover: the critical band (<18% canopy)
 * is shaded with its dashed threshold, the zero-change guide splits
 * shrinking from growing, each quadrant carries its count, and every point
 * gets a collision-aware name label whenever the chart is wide enough.
 */
function trajectoryPlugin(): Plugin<'scatter', TrajectoryFurniture> {
    return {
        id: 'trajectoryFurniture',
        beforeDraw(chart, _args, opts) {
            const o = opts as TrajectoryFurniture | undefined;
            if (!o?.theme) return;
            const light = o.theme === 'light';
            const { ctx, chartArea, scales } = chart;
            const xT = scales.x.getPixelForValue(o.threshold);
            ctx.save();
            // Critical canopy band: where the replanting queue lives.
            ctx.fillStyle = light ? 'rgba(255, 45, 85, .07)' : 'rgba(255, 45, 85, .055)';
            ctx.fillRect(
                chartArea.left,
                chartArea.top,
                xT - chartArea.left,
                chartArea.bottom - chartArea.top,
            );
            ctx.restore();
        },
        beforeDatasetsDraw(chart, _args, opts) {
            const o = opts as TrajectoryFurniture | undefined;
            if (!o?.theme) return;
            const light = o.theme === 'light';
            const { ctx, chartArea, scales } = chart;
            const xT = scales.x.getPixelForValue(o.threshold);
            const y0 = scales.y.getPixelForValue(0);
            ctx.save();
            // Threshold edge with its marker.
            ctx.strokeStyle = light ? 'rgba(190, 24, 55, .55)' : 'rgba(255, 85, 119, .45)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(xT, chartArea.top);
            ctx.lineTo(xT, chartArea.bottom);
            ctx.stroke();
            ctx.fillStyle = ensureTextContrast('#ff5577', light ? '#eef1f6' : '#121214');
            ctx.font = CORNER_FONT;
            ctx.textAlign = 'right';
            ctx.textBaseline = 'alphabetic';
            // The marker reads only where it can't collide with the corner
            // labels; on narrow charts the dashed line + axis carry it.
            if (chartArea.width >= 620) {
                ctx.fillText('18%', xT - 5, chartArea.top + 12);
            }
            // Zero-change guide: the shrinking/growing boundary.
            ctx.setLineDash([]);
            ctx.strokeStyle = light ? 'rgba(15, 20, 30, .18)' : 'rgba(255, 255, 255, .16)';
            ctx.beginPath();
            ctx.moveTo(chartArea.left, y0);
            ctx.lineTo(chartArea.right, y0);
            ctx.stroke();
            ctx.restore();
        },
        afterDatasetsDraw(chart, _args, opts) {
            const o = opts as TrajectoryFurniture | undefined;
            if (!o?.theme) return;
            const light = o.theme === 'light';
            const { ctx, chartArea } = chart;
            const muted = light ? '#5a5f69' : '#9f9f9f';
            const ink = light ? '#181a20' : '#ffffff';
            const occupied: LabelRect[] = [];

            ctx.save();
            ctx.font = CORNER_FONT;
            ctx.textBaseline = 'alphabetic';
            const corners = [
                { text: 'THIN & SHRINKING', count: o.counts.thinShrinking, x: chartArea.left + 10, y: chartArea.bottom - 10, align: 'left' as CanvasTextAlign },
                { text: 'THIN, RECOVERING', count: o.counts.thinRecovering, x: chartArea.left + 10, y: chartArea.top + 20, align: 'left' as CanvasTextAlign },
                { text: 'LOSING CANOPY', count: o.counts.losing, x: chartArea.right - 10, y: chartArea.bottom - 10, align: 'right' as CanvasTextAlign },
                { text: 'GAINING CANOPY', count: o.counts.gaining, x: chartArea.right - 10, y: chartArea.top + 20, align: 'right' as CanvasTextAlign },
            ];
            for (const c of corners) {
                ctx.textAlign = c.align;
                ctx.fillStyle = muted;
                ctx.fillText(c.text, c.x, c.y);
                const w = ctx.measureText(c.text).width;
                const countText = `· ${c.count}`;
                const cx = c.align === 'left' ? c.x + w + 5 : c.x - w - 5;
                ctx.fillStyle = ink;
                ctx.fillText(countText, cx, c.y);
                const totalW = w + 5 + ctx.measureText(countText).width;
                occupied.push({
                    x: c.align === 'left' ? c.x - 2 : c.x - totalW - 2,
                    y: c.y - 10,
                    w: totalW + 4,
                    h: 14,
                });
            }
            ctx.restore();

            // Barangay names beside their points, placed greedily so labels
            // never collide with each other or a point. On narrow charts the
            // tooltips carry the names instead.
            if (chartArea.width < 620) return;
            const meta = chart.getDatasetMeta(0) as {
                data: Array<{ x: number; y: number; options?: { pointRadius?: number } }>;
            };
            ctx.save();
            ctx.textBaseline = 'middle';
            for (let i = 0; i < o.labels.length; i++) {
                const el = meta.data[i];
                if (!el || Number.isNaN(el.x)) continue;
                const r = el.options?.pointRadius ?? 5;
                const name = o.labels[i];
                ctx.save();
                ctx.font = NAME_FONT;
                const w = ctx.measureText(name).width;
                const halo = light ? 'rgba(238, 241, 246, .9)' : 'rgba(8, 8, 10, .9)';
                const candidates = [
                    { dx: r + 4, dy: 0, align: 'left' as CanvasTextAlign },
                    { dx: -(r + 4), dy: 0, align: 'right' as CanvasTextAlign },
                    { dx: r + 4, dy: 13, align: 'left' as CanvasTextAlign },
                    { dx: -(r + 4), dy: 13, align: 'right' as CanvasTextAlign },
                    { dx: r + 4, dy: -13, align: 'left' as CanvasTextAlign },
                    { dx: -(r + 4), dy: -13, align: 'right' as CanvasTextAlign },
                    { dx: r + 4, dy: 26, align: 'left' as CanvasTextAlign },
                    { dx: -(r + 4), dy: 26, align: 'right' as CanvasTextAlign },
                    { dx: r + 4, dy: -26, align: 'left' as CanvasTextAlign },
                    { dx: -(r + 4), dy: -26, align: 'right' as CanvasTextAlign },
                ];
                for (const c of candidates) {
                    const tx = el.x + c.dx;
                    const ty = el.y + c.dy;
                    const rect: LabelRect = {
                        x: c.align === 'left' ? tx - 2 : tx - w - 2,
                        y: ty - 7,
                        w: w + 4,
                        h: 14,
                    };
                    if (
                        rect.x < chartArea.left + 2 ||
                        rect.x + rect.w > chartArea.right - 2 ||
                        rect.y < chartArea.top + 2 ||
                        rect.y + rect.h > chartArea.bottom - 2
                    ) {
                        continue;
                    }
                    if (
                        occupied.some(
                            (p) =>
                                rect.x < p.x + p.w &&
                                p.x < rect.x + rect.w &&
                                rect.y < p.y + p.h &&
                                p.y < rect.y + rect.h,
                        )
                    ) {
                        continue;
                    }
                    occupied.push(rect);
                    ctx.textAlign = c.align;
                    ctx.shadowColor = halo;
                    ctx.shadowBlur = 3;
                    ctx.fillStyle = light ? '#33363c' : '#d6d6d6';
                    ctx.fillText(name, tx, ty);
                    break;
                }
                ctx.restore();
            }
            ctx.restore();
        },
    };
}

export function CanopyTrajectoryChart({ data }: { data: Barangay[] }) {
    const { resolvedTheme } = usePreferences();
    const config = useMemo<ChartConfiguration<'scatter'>>(() => {
        const th = chartTheme(resolvedTheme);
        const light = resolvedTheme === 'light';
        return {
            type: 'scatter',
            plugins: [trajectoryPlugin()],
            data: {
                datasets: [
                    {
                        label: 'Barangays',
                        data: data.map((b) => ({ x: b.canopy, y: b.canopyChange })),
                        backgroundColor: data.map((b) => canopyBandColor(b.canopy, th)),
                        borderColor: light ? 'rgba(255,255,255,.9)' : 'rgba(5,5,5,.55)',
                        borderWidth: 1,
                        pointRadius: data.map(
                            (b) => 4.5 + (Math.sqrt(b.area) / Math.sqrt(640)) * 4.5,
                        ),
                        pointHoverRadius: 7,
                        pointHoverBorderWidth: 1.5,
                        pointHitRadius: 12,
                    },
                ],
            },
            options: {
                ...baseChartOptions(),
                interaction: { mode: 'nearest', intersect: false },
                plugins: {
                    legend: { display: false },
                    trajectoryFurniture: {
                        labels: data.map((b) => b.name),
                        threshold: 18,
                        counts: {
                            thinShrinking: data.filter((b) => b.canopy < 18 && b.canopyChange < 0).length,
                            thinRecovering: data.filter((b) => b.canopy < 18 && b.canopyChange >= 0).length,
                            losing: data.filter((b) => b.canopy >= 18 && b.canopyChange < 0).length,
                            gaining: data.filter((b) => b.canopy >= 18 && b.canopyChange >= 0).length,
                        },
                        theme: resolvedTheme,
                    } satisfies TrajectoryFurniture,
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
                        callbacks: {
                            title: (items) =>
                                data[items[0]?.dataIndex ?? -1]?.name ?? '',
                            label: (ctx) => {
                                const b = data[ctx.dataIndex];
                                if (!b) return '';
                                const change = b.canopyChange;
                                return `${b.canopy}% canopy · ${change >= 0 ? '+' : '−'}${Math.abs(change).toFixed(1)} pts in 5 yrs · ${b.area.toLocaleString()} ha`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        // 56 keeps the 52% UP Campus point inside the plot
                        // without printing a cramped edge tick at 55%.
                        min: 0,
                        max: 56,
                        border: { display: false },
                        grid: { color: th.grid, drawTicks: false },
                        ticks: {
                            color: th.text,
                            padding: 8,
                            stepSize: 10,
                            font: { size: 11.5 },
                            // Chart.js prints a tick at the scale max even
                            // when it's off the step grid — keep 0–50% only.
                            callback: (v) => (Number(v) >= 56 ? '' : `${v}%`),
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
                        min: -5,
                        max: 2,
                        border: { display: false },
                        grid: { color: th.grid, drawTicks: false },
                        ticks: {
                            color: th.text,
                            padding: 8,
                            stepSize: 1,
                            font: { size: 11.5 },
                            // Typographic minus, matching the app's numeric voice.
                            callback: (v) => {
                                const n = Number(v);
                                return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : `${n}`;
                            },
                        },
                        title: {
                            display: true,
                            text: '5-yr change (pp)',
                            color: th.text,
                            padding: { bottom: 10 },
                            font: { size: 11.5 },
                        },
                    },
                },
            },
        };
    }, [data, resolvedTheme]);

    return <ChartCanvas id="canopyTrajectoryChart" config={config} />;
}

export function CanopyBarChart({ data }: { data: CanopySnapshot }) {
    const { resolvedTheme } = usePreferences();
    return <ChartCanvas id="canopyBarChart" config={useBarConfig(data, resolvedTheme)} />;
}

export function CanopyTrendChart({ data }: { data: CanopySnapshot }) {
    const { resolvedTheme } = usePreferences();
    return <ChartCanvas id="canopyLineChart" config={useLineConfig(data, resolvedTheme)} />;
}
