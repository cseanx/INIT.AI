import { useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { ChartConfiguration } from 'chart.js';
import type { ResolvedTheme } from '../../types';
import { usePreferences } from '../../preferences/PreferencesContext';
import { useCity } from '../../contexts/CityContext';
import { baseChartOptions, chartTheme } from '../../utils/chartTheme';
import { SEVERITY_DOTS } from '../../utils/toneClasses';
import ChartCanvas from '../common/ChartCanvas';
import {
    HOURLY_LABELS,
    HOURLY_TEMPS,
    HOTSPOTS,
    RECOMMENDATIONS,
    SELECTED,
    TREND_LOW,
    TREND_PEAK,
    TREND_PEAK_LABEL,
    heatRisk,
} from './inspectorData';

/* ==========================
   INSPECTOR PANEL — the selected area's dossier beside the heat map.
========================== */

function SectionTitle({
    icon,
    children,
    action,
}: {
    icon: string;
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="mb-[12px] flex items-center justify-between gap-3">
            <h4 className="flex min-w-0 items-center gap-[7px] text-[11.5px] font-semibold uppercase tracking-[.12em] text-[#999]">
                <i className={`fa-solid ${icon} text-[11.5px] text-[#777]`} aria-hidden="true"></i>
                {children}
            </h4>
            {action}
        </div>
    );
}

function Condition({
    icon,
    value,
    label,
    tone = 'neutral',
}: {
    icon: string;
    value: string;
    label: string;
    tone?: 'neutral' | 'sky' | 'gold';
}) {
    const toneClass = { neutral: 'text-[#888]', sky: 'text-sky', gold: 'text-gold' }[tone];
    return (
        <div className="min-w-0 px-[12px] py-[10px]">
            <div className="flex items-center gap-[6px]">
                <i className={`fa-solid ${icon} text-[11px] ${toneClass}`} aria-hidden="true"></i>
                <span className="text-[13.5px] font-semibold leading-none tabular-nums">{value}</span>
            </div>
            <span className="mt-[6px] block truncate text-[11.5px] text-[#888]">{label}</span>
        </div>
    );
}

function MetricBar({
    label,
    value,
    unit,
    verdict,
    tone,
}: {
    label: string;
    value: number;
    unit: string;
    verdict: string;
    tone: 'red' | 'orange';
}) {
    const barColor = { red: 'bg-[#ff2d55]', orange: 'bg-[#ff8c42]' }[tone];
    const verdictColor = { red: 'text-[#ff5577]', orange: 'text-orange' }[tone];
    return (
        <div>
            <div className="mb-[7px] flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[13px] text-[#ccc]">{label}</span>
                <span className="flex shrink-0 items-baseline gap-[7px] text-[13px] font-semibold tabular-nums">
                    {value}
                    {unit}
                    <span
                        className={`text-[10.5px] font-semibold uppercase tracking-[.06em] ${verdictColor}`}
                    >
                        {verdict}
                    </span>
                </span>
            </div>
            <div className="h-[5px] overflow-hidden rounded-full bg-white/8">
                <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${value}%` }}
                ></div>
            </div>
        </div>
    );
}

function useSparklineConfig(resolvedTheme: ResolvedTheme) {
    return useMemo<ChartConfiguration<'line'>>(() => {
        const th = chartTheme(resolvedTheme);
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
                            gradient.addColorStop(0, `rgba(${th.brandRgb}, .28)`);
                            gradient.addColorStop(1, `rgba(${th.brandRgb}, 0)`);
                            return gradient;
                        },
                        fill: true,
                        tension: 0.4,
                        // The final point is "now"; the rest stay clean.
                        pointRadius: HOURLY_TEMPS.map((_, i) =>
                            i === HOURLY_TEMPS.length - 1 ? 3 : 0,
                        ),
                        pointBackgroundColor: th.brand,
                        pointBorderColor: th.tooltipTitle,
                        pointBorderWidth: 2,
                        pointHoverRadius: 4,
                        pointHoverBackgroundColor: th.brand,
                    },
                ],
            },
            options: {
                ...baseChartOptions(),
                interaction: { mode: 'index', intersect: false },
                layout: { padding: { top: 4 } },
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
                        callbacks: {
                            label: (ctx) => `${ctx.parsed.y?.toFixed(1) ?? ''}°C surface`,
                        },
                    },
                },
                scales: {
                    x: {
                        display: true,
                        grid: { display: false },
                        border: { display: false },
                        ticks: {
                            autoSkip: false,
                            maxRotation: 0,
                            color: th.text,
                            font: { size: 10.5 },
                            callback: (_value, index) =>
                                index === 0 || index === 12 || index === HOURLY_LABELS.length - 1
                                    ? HOURLY_LABELS[index].slice(0, 5)
                                    : '',
                        },
                    },
                    y: { display: false },
                },
            },
        };
    }, [resolvedTheme]);
}

const PRIMARY_BTN_CLASSES =
    'flex h-[42px] w-full cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[11px] border-none bg-gradient-to-r from-primary to-accent px-[10px] text-[12px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';
const SECONDARY_BTN_CLASSES =
    'flex h-[42px] w-full cursor-pointer items-center justify-center gap-[7px] whitespace-nowrap rounded-[11px] border border-white/[.14] bg-white/5 px-[10px] text-[12px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/9';

/**
 * Right-hand inspector / telemetry rail for the heat map. Lives inside the
 * map workspace card (the page provides the divider), so it carries no
 * surface of its own. Pinned header, pinned actions; only the evidence in
 * the middle scrolls on desktop. Frontend-only.
 */
export default function InspectorPanel() {
    const { resolvedTheme } = usePreferences();
    const { selected: city } = useCity();
    const navigate = useNavigate();
    const sparklineConfig = useSparklineConfig(resolvedTheme);
    const risk = heatRisk(SELECTED.surfaceTemp);

    return (
        <aside
            aria-labelledby="inspector-title"
            className="relative flex h-full min-h-0 w-full flex-col"
        >
            {/* Pinned header */}
            <div className="flex h-[48px] shrink-0 items-center justify-between gap-3 border-b border-white/8 px-[18px] min-[1100px]:h-[60px]">
                <div className="flex min-w-0 items-center gap-[8px]">
                    <h2 id="inspector-title" className="text-[13px] font-semibold">
                        Inspector
                    </h2>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[.04] px-[8px] py-[2px] text-[10px] font-semibold uppercase tracking-[.07em] text-[#999]">
                        Demo area
                    </span>
                </div>
            </div>

            {/* Scrollable evidence */}
            <div
                id="inspector-body"
                className="inspector-scroll flex min-h-0 flex-1 select-text flex-col overflow-y-auto px-[18px] pb-[18px] pt-[16px] max-[1099px]:overflow-visible min-[700px]:max-[1099px]:grid min-[700px]:max-[1099px]:grid-cols-2 min-[700px]:max-[1099px]:gap-x-[20px]"
            >
                {/* Selected area — one reading, no card-in-card */}
                <section
                    className="min-[700px]:max-[1099px]:col-span-2"
                    aria-labelledby="inspector-area"
                >
                    <div className="flex items-start justify-between gap-[12px]">
                        <div className="min-w-0">
                            <h3
                                id="inspector-area"
                                className="text-[15px] font-semibold leading-tight"
                            >
                                {SELECTED.name}
                            </h3>
                            <p className="mt-[3px] text-[12px] text-[#888]">{city}</p>
                        </div>
                        <span
                            className={`mt-[1px] shrink-0 rounded-full px-[9px] py-[4px] text-[10px] font-bold uppercase tracking-[.07em] ${risk.className}`}
                        >
                            {risk.label}
                        </span>
                    </div>

                    <div className="mt-[15px] flex flex-wrap items-end gap-x-[20px] gap-y-[10px]">
                        <div>
                            <div className="flex items-baseline gap-[5px]">
                                <span className="font-mono text-[40px] font-bold leading-none tracking-[-.02em] tabular-nums">
                                    {SELECTED.surfaceTemp.toFixed(1)}
                                </span>
                                <span className="text-[20px] font-semibold leading-none text-[#ccc]">
                                    °C
                                </span>
                            </div>
                            <span className="mt-[7px] block text-[11px] text-[#888]">
                                Modeled surface temp
                            </span>
                        </div>
                        <div className="pb-[2px]">
                            <span className="text-[15px] font-semibold tabular-nums text-[#ccc]">
                                {SELECTED.airTemp.toFixed(1)}°C
                            </span>
                            <span className="mt-[6px] block text-[11px] text-[#888]">
                                Ambient air
                            </span>
                        </div>
                    </div>

                    <p className="mt-[13px] flex items-start gap-[6px] text-[11.5px] leading-snug text-[#888]">
                        <i
                            className="fa-solid fa-clock mt-[2px] text-[10px]"
                            aria-hidden="true"
                        ></i>
                        <span>
                            Demo observation · updated {SELECTED.updated} ·{' '}
                            <span className="text-[#aaa]">not a sensor reading</span>
                        </span>
                    </p>
                </section>

                {/* Conditions — one strip, not three floating pills */}
                <div className="mt-[14px] grid grid-cols-3 divide-x divide-white/6 rounded-[12px] border border-white/6 bg-white/[.03] min-[700px]:max-[1099px]:col-span-2">
                    <Condition
                        icon="fa-droplet"
                        value={`${SELECTED.humidity}%`}
                        label="Humidity"
                    />
                    <Condition
                        icon="fa-wind"
                        value={`${SELECTED.wind} km/h`}
                        label="Wind"
                        tone="sky"
                    />
                    <Condition
                        icon="fa-sun"
                        value={`${SELECTED.uvIndex}`}
                        label="UV index"
                        tone="gold"
                    />
                </div>

                {/* 24-hour trend */}
                <section
                    className="mt-[18px] min-w-0 border-t border-white/8 pt-[15px]"
                    aria-labelledby="inspector-trend"
                >
                    <SectionTitle icon="fa-temperature-half">
                        <span id="inspector-trend">Surface temperature · 24 h</span>
                    </SectionTitle>
                    <div
                        className="relative h-[104px]"
                        role="img"
                        aria-label={`24-hour surface temperature, low ${TREND_LOW.toFixed(1)} degrees Celsius, peaking at ${TREND_PEAK.toFixed(1)} at ${TREND_PEAK_LABEL}`}
                    >
                        <ChartCanvas id="inspector-sparkline" config={sparklineConfig} />
                    </div>
                    <p className="mt-[5px] text-[11.5px] text-[#888]">
                        Range{' '}
                        <b className="font-semibold tabular-nums text-[#ccc]">
                            {TREND_LOW.toFixed(1)}°–{TREND_PEAK.toFixed(1)}°
                        </b>{' '}
                        · peak at {TREND_PEAK_LABEL}
                    </p>
                </section>

                {/* Key drivers */}
                <section
                    className="mt-[18px] min-w-0 border-t border-white/8 pt-[15px]"
                    aria-labelledby="inspector-drivers"
                >
                    <SectionTitle icon="fa-map-location-dot">
                        <span id="inspector-drivers">Key drivers</span>
                    </SectionTitle>
                    <div className="flex flex-col gap-[13px]">
                        <MetricBar
                            label="Tree canopy coverage"
                            value={SELECTED.canopy}
                            unit="%"
                            verdict="Critical"
                            tone="red"
                        />
                        <MetricBar
                            label="Impervious surface"
                            value={SELECTED.impervious}
                            unit="%"
                            verdict="High"
                            tone="orange"
                        />
                        <div className="flex items-center justify-between gap-3 border-t border-white/6 pt-[11px]">
                            <span className="flex min-w-0 items-center gap-[7px] text-[12.5px] text-[#aaa]">
                                <i
                                    className="fa-solid fa-people-group text-[11px] text-sky"
                                    aria-hidden="true"
                                ></i>
                                Pop. exposed to high heat
                            </span>
                            <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                                ≈ {SELECTED.exposedPopulation}
                                <span className="ml-[4px] text-[11px] font-medium text-[#888]">
                                    residents
                                </span>
                            </span>
                        </div>
                    </div>
                </section>

                {/* Recommended actions — what to do with the reading */}
                <section
                    className="mt-[18px] min-w-0 border-t border-white/8 pt-[15px]"
                    aria-labelledby="inspector-actions"
                >
                    <SectionTitle icon="fa-lightbulb">
                        <span id="inspector-actions">Recommended actions</span>
                    </SectionTitle>
                    <div className="flex flex-col gap-[11px]">
                        {RECOMMENDATIONS.map((rec) => (
                            <div key={rec.text} className="flex items-start gap-[10px]">
                                <span className="mt-[1px] flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-[8px] bg-white/[.05] text-[11px] text-[#ccc]">
                                    <i
                                        className={`fa-solid ${rec.icon}`}
                                        aria-hidden="true"
                                    ></i>
                                </span>
                                <div className="min-w-0">
                                    <strong className="block text-[13px] font-medium leading-[1.45]">
                                        {rec.text}
                                    </strong>
                                    <small className="mt-[3px] flex items-center gap-[4px] text-[11.5px] text-mint">
                                        <i
                                            className="fa-solid fa-temperature-arrow-down text-[9px]"
                                            aria-hidden="true"
                                        ></i>
                                        {rec.note}
                                    </small>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* City context, kept last: it is navigation, not the area reading */}
                <section
                    className="mt-[18px] min-w-0 border-t border-white/8 pt-[15px]"
                    aria-labelledby="inspector-hotspots"
                >
                    <SectionTitle
                        icon="fa-fire-flame-curved"
                        action={
                            <Link
                                to="/hotspots"
                                className="text-[12px] font-medium text-[#888] transition hover:text-white"
                            >
                                View all
                            </Link>
                        }
                    >
                        <span id="inspector-hotspots">Top hotspots</span>
                    </SectionTitle>
                    <ul className="-mx-[8px] flex flex-col">
                        {HOTSPOTS.map((hotspot, i) => (
                            <li key={hotspot.name}>
                                <button
                                    type="button"
                                    title={`Open ${hotspot.name} in Hotspots`}
                                    aria-label={`Open ${hotspot.name} in Hotspots`}
                                    onClick={() => navigate('/hotspots')}
                                    className="group flex w-full cursor-pointer items-center gap-[9px] rounded-[8px] px-[8px] py-[6px] text-left transition duration-200 hover:bg-white/[.04]"
                                >
                                    <span className="w-[11px] shrink-0 text-[11px] font-semibold tabular-nums text-[#888]">
                                        {i + 1}
                                    </span>
                                    <span
                                        className={`h-[6px] w-[6px] shrink-0 rounded-full ${SEVERITY_DOTS[hotspot.severity]}`}
                                    ></span>
                                    <span className="min-w-0 flex-1 truncate text-[13px] text-[#ccc]">
                                        {hotspot.name}
                                    </span>
                                    <span className="shrink-0 text-[13px] font-semibold tabular-nums">
                                        {hotspot.temp.toFixed(1)}°
                                    </span>
                                    <i
                                        className="fa-solid fa-arrow-right w-[10px] shrink-0 text-[10px] text-[#888] opacity-0 transition group-hover:opacity-100"
                                        aria-hidden="true"
                                    ></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            </div>

            {/* Pinned actions — the inspector's job is to end in a decision */}
            <div className="shrink-0 border-t border-white/8 bg-white/[.03] p-[12px]">
                <div className="grid grid-cols-2 gap-[8px]">
                    <button
                        type="button"
                        onClick={() => navigate('/reports/new')}
                        className={PRIMARY_BTN_CLASSES}
                    >
                        <i className="fa-solid fa-file-lines" aria-hidden="true"></i>
                        Generate Heat Report
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/mitigation')}
                        className={SECONDARY_BTN_CLASSES}
                    >
                        <i className="fa-solid fa-bullseye" aria-hidden="true"></i>
                        View Mitigation Plan
                    </button>
                </div>
            </div>
        </aside>
    );
}
