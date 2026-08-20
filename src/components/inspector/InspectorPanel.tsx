import { useMemo, useState, type ReactNode } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { AccentName, ResolvedTheme } from '../../types';
import { barangays } from '../../data/mockData';
import { usePreferences } from '../../preferences/PreferencesContext';
import { baseChartOptions, chartTheme } from '../../utils/chartTheme';
import { SEVERITY_DOTS } from '../../utils/toneClasses';
import ChartCanvas from '../common/ChartCanvas';
import { useBentoFx } from '../common/BentoCard';

/* ==========================
   INSPECTOR PANEL — frontend only.
   Static mock observations for the selected area; to be wired to the
   backend API / live map selection later.
========================== */

const SELECTED = {
    name: 'Brgy. Batasan Hills, Quezon City, NCR',
    surfaceTemp: 38.4,
    airTemp: 32.1,
    updated: '4h ago',
    humidity: 61,
    wind: 12,
    uvIndex: 8,
    canopy: 16,
    impervious: 78,
    exposedPopulation: '214K',
};

const HOURLY_LABELS = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, '0')}:00`,
);

const HOURLY_TEMPS = [
    34.6, 34.9, 35.2, 35.8, 36.3, 36.9, 37.4, 37.9, 38.2, 38.5, 38.9, 38.7,
    38.4, 38.2, 38.0, 37.8, 38.1, 38.4, 38.6, 38.9, 39.1, 38.8, 38.5, 38.4,
];

const HOTSPOTS = [...barangays].sort((a, b) => b.temp - a.temp).slice(0, 5);

const RECOMMENDATIONS = [
    {
        icon: 'fa-seedling',
        text: 'Prioritize urban tree planting along Commonwealth Ave corridor',
        note: '-2.1°C projected local drop',
    },
    {
        icon: 'fa-road',
        text: 'Deploy cool pavement on the Batasan–Sauyo road section',
        note: '-0.9°C projected local drop',
    },
];

const RISK_CLASSES: Record<'danger' | 'extreme' | 'caution' | 'safe', string> = {
    danger: 'bg-[rgba(255,45,85,.15)] text-[#ff5577]',
    extreme: 'bg-[rgba(255,140,66,.15)] text-[#ff8c42]',
    caution: 'bg-[rgba(255,210,63,.15)] text-[#ffd23f]',
    safe: 'bg-[rgba(0,255,132,.14)] text-[#00ff84]',
};

function heatRisk(temp: number): { label: string; className: string } {
    if (temp >= 39) return { label: 'Danger', className: RISK_CLASSES.danger };
    if (temp >= 36) return { label: 'Extreme Caution', className: RISK_CLASSES.extreme };
    if (temp >= 33) return { label: 'Caution', className: RISK_CLASSES.caution };
    return { label: 'Safe', className: RISK_CLASSES.safe };
}

function SectionTitle({ icon, children }: { icon: string; children: ReactNode }) {
    return (
        <h4 className="mb-[12px] flex items-center gap-[8px] text-[10.5px] font-semibold uppercase tracking-[.14em] text-[#888]">
            <i className={`fa-solid ${icon} text-[11px] text-accent`}></i>
            {children}
        </h4>
    );
}

function Pill({ icon, value, label }: { icon: string; value: string; label: string }) {
    return (
        <span className="flex items-center gap-[8px] rounded-full border border-white/6 bg-white/[.04] px-[12px] py-[6px]">
            <i className={`fa-solid ${icon} text-[10.5px] text-accent`}></i>
            <span className="text-[12px] font-semibold">{value}</span>
            <span className="text-[10.5px] text-[#888]">{label}</span>
        </span>
    );
}

function MetricBar({
    label,
    value,
    unit,
    note,
    tone,
}: {
    label: string;
    value: number;
    unit: string;
    note: string;
    tone: 'red' | 'orange' | 'blue';
}) {
    const barColor = { red: 'bg-[#ff2d55]', orange: 'bg-[#ff8c42]', blue: 'bg-[#5aa9ff]' }[tone];
    return (
        <div>
            <div className="mb-[6px] flex items-baseline justify-between gap-3">
                <span className="text-[12.5px] text-[#bbb]">{label}</span>
                <span className="shrink-0 text-[12.5px] font-bold">
                    {value}
                    {unit}
                    <span className="ml-[6px] text-[10.5px] font-medium text-[#888]">· {note}</span>
                </span>
            </div>
            <div className="h-[6px] overflow-hidden rounded-full bg-white/8">
                <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${value}%` }}
                ></div>
            </div>
        </div>
    );
}

/** Smoothly collapsible section (grid-rows animation keeps the height tween). */
function Accordion({
    icon,
    title,
    defaultOpen = true,
    children,
}: {
    icon: string;
    title: string;
    defaultOpen?: boolean;
    children: ReactNode;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="rounded-[16px] border border-white/6 bg-white/[.03]">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex w-full items-center justify-between gap-3 p-[12px_14px] text-left"
            >
                <span className="flex items-center gap-[8px] text-[12.5px] font-semibold">
                    <i className={`fa-solid ${icon} text-[12px] text-accent`}></i>
                    {title}
                </span>
                <i
                    className={`fa-solid fa-chevron-down text-[10px] text-[#777] transition-transform duration-300 ${
                        open ? '' : '-rotate-90'
                    }`}
                ></i>
            </button>
            <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                    open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
            >
                <div className="min-h-0 overflow-hidden">
                    <div className="flex flex-col gap-[12px] p-[14px] pt-0">{children}</div>
                </div>
            </div>
        </div>
    );
}

function useSparklineConfig(resolvedTheme: ResolvedTheme, accent: AccentName) {
    return useMemo<ChartConfiguration<'line'>>(() => {
        const th = chartTheme(resolvedTheme, accent);
        return {
            type: 'line',
            data: {
                labels: HOURLY_LABELS,
                datasets: [
                    {
                        data: HOURLY_TEMPS,
                        borderColor: th.brand,
                        borderWidth: 2,
                        backgroundColor: (context: any) => {
                            const { ctx, chartArea } = context.chart;
                            if (!chartArea) return 'rgba(0,0,0,0)';
                            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                            gradient.addColorStop(0, `rgba(${th.brandRgb}, .32)`);
                            gradient.addColorStop(1, `rgba(${th.brandRgb}, 0)`);
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: th.brand,
                    },
                ],
            },
            options: {
                ...baseChartOptions(),
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.label} — ${ctx.parsed.y?.toFixed(1) ?? ''}°C`,
                        },
                    },
                },
                scales: {
                    x: { display: false },
                    y: { display: false },
                },
            },
        };
    }, [resolvedTheme, accent]);
}

const PRIMARY_BTN_CLASSES =
    'w-full cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[13px_20px] text-center text-[13.5px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';
const SECONDARY_BTN_CLASSES =
    'w-full cursor-pointer rounded-[14px] border border-white/[.14] bg-white/5 p-[13px_20px] text-center text-[13.5px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/9';

/**
 * Right-hand inspector / telemetry panel for the heat map. Stays mounted —
 * the parent clips it with an animated width while collapsed. Pinned header
 * and footer; only the middle content scrolls. Frontend-only.
 */
export default function InspectorPanel({
    onToggle,
}: {
    onToggle: () => void;
}) {
    const { resolvedTheme, preferences } = usePreferences();
    const sparklineConfig = useSparklineConfig(resolvedTheme, preferences.accent);
    const risk = heatRisk(SELECTED.surfaceTemp);
    const bentoFx = useBentoFx();

    return (
        <div
            ref={bentoFx.ref}
            style={bentoFx.style}
            className={`${bentoFx.className} relative flex h-full flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/5 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)]`}
        >
            {/* Pinned header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 p-[15px_18px]">
                <h3 className="text-[14.5px] font-semibold">Inspector</h3>
                <button
                    type="button"
                    onClick={onToggle}
                    title="Collapse panel"
                    className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border border-white/8 bg-white/5 text-[12px] text-[#999] transition duration-200 hover:bg-white/9 hover:text-white"
                >
                    <i className="fa-solid fa-angles-right"></i>
                </button>
            </div>

            {/* Scrollable middle */}
            <div className="inspector-scroll flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto p-[16px]">
                {/* Selected area */}
                <div className="rounded-[16px] border border-white/6 bg-white/[.03] p-[16px]">
                    <div className="mb-[12px] flex items-start justify-between gap-3">
                        <strong className="min-w-0 text-[13.5px] font-semibold leading-snug">
                            {SELECTED.name}
                        </strong>
                        <span
                            className={`shrink-0 rounded-full px-[11px] py-[5px] text-[10.5px] font-bold uppercase tracking-[.08em] ${risk.className}`}
                        >
                            {risk.label}
                        </span>
                    </div>
                    <div className="flex items-end gap-[18px]">
                        <div>
                            <span className="text-[34px] font-bold leading-none">
                                {SELECTED.surfaceTemp.toFixed(1)}°C
                            </span>
                            <span className="mt-[6px] block text-[11px] text-[#888]">
                                Surface temp
                            </span>
                        </div>
                        <div className="pb-[3px]">
                            <span className="text-[20px] font-semibold text-[#bbb]">
                                {SELECTED.airTemp.toFixed(1)}°C
                            </span>
                            <span className="mt-[4px] block text-[11px] text-[#888]">
                                Ambient air
                            </span>
                        </div>
                    </div>
                    <span className="mt-[12px] block text-[10.5px] text-[#666]">
                        <i className="fa-solid fa-clock mr-[5px]"></i>
                        Updated {SELECTED.updated} · AI-derived estimate
                    </span>
                </div>

                {/* 24-hour trend */}
                <div className="rounded-[16px] border border-white/6 bg-white/[.03] p-[14px_16px]">
                    <SectionTitle icon="fa-temperature-half">24-Hour Surface Trend</SectionTitle>
                    <div className="relative h-[88px]">
                        <ChartCanvas id="inspector-sparkline" config={sparklineConfig} />
                    </div>
                    <div className="mt-[14px] flex flex-wrap gap-[8px]">
                        <Pill icon="fa-droplet" value={`${SELECTED.humidity}%`} label="Humidity" />
                        <Pill icon="fa-wind" value={`${SELECTED.wind} km/h`} label="Wind" />
                        <Pill icon="fa-sun" value={`${SELECTED.uvIndex}`} label="UV Index" />
                    </div>
                </div>

                {/* Key drivers */}
                <Accordion icon="fa-map-location-dot" title="Key Drivers">
                    <MetricBar
                        label="Tree Canopy Coverage"
                        value={SELECTED.canopy}
                        unit="%"
                        note="Critical"
                        tone="red"
                    />
                    <MetricBar
                        label="Impervious Surface"
                        value={SELECTED.impervious}
                        unit="%"
                        note="High"
                        tone="orange"
                    />
                    <div className="flex items-center justify-between rounded-[12px] border border-white/6 bg-white/[.02] p-[10px_12px]">
                        <span className="flex items-center gap-[8px] text-[12.5px] text-[#bbb]">
                            <i className="fa-solid fa-people-group text-sky"></i>
                            Pop. exposed to high heat
                        </span>
                        <span className="text-[13px] font-bold">
                            ≈ {SELECTED.exposedPopulation}
                            <small className="ml-[4px] text-[10px] font-medium text-[#888]">
                                residents
                            </small>
                        </span>
                    </div>
                </Accordion>

                {/* Hotspot rankings */}
                <Accordion icon="fa-fire-flame-curved" title="Top Hotspots">
                    {HOTSPOTS.map((hotspot, i) => (
                        <button
                            key={hotspot.name}
                            type="button"
                            title={`Jump to ${hotspot.name}`}
                            className="group flex w-full items-center gap-[10px] rounded-[12px] border border-white/6 bg-white/[.02] p-[9px_12px] text-left transition duration-200 hover:bg-white/6"
                        >
                            <span className="w-[16px] shrink-0 text-[11px] font-bold text-[#666]">
                                {i + 1}
                            </span>
                            <span
                                className={`h-[8px] w-[8px] shrink-0 rounded-full ${SEVERITY_DOTS[hotspot.severity]}`}
                            ></span>
                            <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium">
                                {hotspot.name}
                            </span>
                            <span className="shrink-0 text-[12.5px] font-bold text-[#ff8c42]">
                                {hotspot.temp.toFixed(1)}°
                            </span>
                            <i className="fa-solid fa-location-crosshairs shrink-0 text-[11px] text-[#555] transition duration-200 group-hover:text-accent"></i>
                        </button>
                    ))}
                </Accordion>

                {/* Recommended actions */}
                <div className="rounded-[16px] border border-white/6 bg-white/[.03] p-[14px]">
                    <h4 className="mb-[10px] flex items-center gap-[8px] text-[10.5px] font-semibold uppercase tracking-[.14em] text-[#888]">
                        <i className="fa-solid fa-lightbulb text-[11px] text-accent"></i>
                        Recommended Actions
                    </h4>
                    {RECOMMENDATIONS.map((rec) => (
                        <div
                            key={rec.text}
                            className="flex items-start gap-[10px] rounded-[12px] border border-white/6 bg-white/[.03] p-[11px_12px]"
                        >
                            <span className="flex h-[28px] w-[28px] shrink-0 items-center justify-center rounded-[9px] bg-[rgba(var(--accent-glow),.15)] text-[12px] text-accent">
                                <i className={`fa-solid ${rec.icon}`}></i>
                            </span>
                            <div className="min-w-0">
                                <strong className="block text-[12.5px] font-semibold leading-snug">
                                    {rec.text}
                                </strong>
                                <small className="mt-[3px] block text-[11px] text-[#888]">
                                    {rec.note}
                                </small>
                            </div>
                        </div>
                    ))}
                    <div className="mt-[12px] flex flex-col gap-[10px]">
                        <button type="button" className={PRIMARY_BTN_CLASSES}>
                            <i className="fa-solid fa-file-lines mr-[8px]"></i>
                            Generate Heat Report
                        </button>
                        <button type="button" className={SECONDARY_BTN_CLASSES}>
                            <i className="fa-solid fa-bullseye mr-[8px]"></i>
                            View Mitigation Plan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}