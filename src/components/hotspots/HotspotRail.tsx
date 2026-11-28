import { Link } from 'react-router-dom';
import type { Barangay } from '../../types';
import SeverityBadge from './SeverityBadge';

/* ==========================
   HOTSPOT RAIL
   The selected reading as one flat rail — hero readout, a four-cell
   conditions strip, driver, and a stepper that walks to the neighbouring
   readings on the scale. No nested cards; sections separate on hairlines.
========================== */

interface HotspotRailProps {
    hotspot: Barangay;
    rank: number;
    total: number;
    hotter: Barangay | null;
    cooler: Barangay | null;
    onSelect: (name: string) => void;
}

const PRIMARY_ACTION =
    'inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[10px] border-none bg-gradient-to-r from-primary to-accent p-[9px_16px] text-[13px] font-semibold text-white shadow-[0_6px_20px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_26px_rgba(var(--accent-glow),.4)]';
const SECONDARY_ACTION =
    'inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-[10px] border border-white/[.14] bg-white/5 p-[9px_16px] text-[13px] font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-white/9';

function SectionLabel({ children }: { children: string }) {
    return (
        <span className="block text-[11px] font-semibold uppercase tracking-[.09em] text-[#999]">
            {children}
        </span>
    );
}

export default function HotspotRail({
    hotspot,
    rank,
    total,
    hotter,
    cooler,
    onSelect,
}: HotspotRailProps) {
    const trend = hotspot.trend ?? null;
    const canopyChange = hotspot.canopyChange ?? null;
    const trendUp = trend !== null && trend >= 0;
    const canopyLoss = canopyChange !== null && canopyChange < 0;

    return (
        <div className="flex h-full flex-col" aria-live="polite">
            {/* Keyed so a new selection replays the view entrance. */}
            <div key={hotspot.name} className="animate-view-in flex h-full flex-col">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="text-[19px] font-semibold leading-tight">{hotspot.name}</h3>
                    <SeverityBadge severity={hotspot.severity} />
                    {hotspot.priority ? (
                        <span className="rounded-full border border-[rgba(var(--accent-glow),.4)] bg-[rgba(var(--accent-glow),.16)] px-[10px] py-[3px] text-[10.5px] font-semibold uppercase tracking-[.08em] text-white">
                            Priority
                        </span>
                    ) : null}
                </div>

                <p className="mt-3 font-mono text-[42px] font-bold leading-none tracking-[-.04em]">
                    {hotspot.temp.toFixed(1)}
                    <span className="ml-1 align-top font-sans text-[18px] font-semibold tracking-normal text-white/70">
                        °C
                    </span>
                </p>
                <p className="mt-2 text-[12.5px] text-[#999]">
                    p90 surface reading · rank {rank} of {total} in the city ranking
                </p>

                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 border-y border-white/8 py-4">
                    <div>
                        <SectionLabel>vs previous 8-day</SectionLabel>
                        <strong
                            className={`mt-1 block text-[15px] font-semibold tabular-nums ${
                                trend === null
                                    ? 'text-[#888]'
                                    : trendUp
                                      ? 'text-[#ff5577]'
                                      : 'text-mint'
                            }`}
                        >
                            {trend === null
                                ? '—'
                                : `${trendUp ? '+' : '−'}${Math.abs(trend).toFixed(1)}°C`}
                        </strong>
                    </div>
                    <div>
                        <SectionLabel>Canopy cover</SectionLabel>
                        <strong className="mt-1 block text-[15px] font-semibold tabular-nums">
                            {hotspot.canopy}%
                        </strong>
                    </div>
                    <div>
                        <SectionLabel>Canopy change</SectionLabel>
                        <strong
                            title={
                                canopyChange === null
                                    ? 'Historical canopy change is not part of this pilot yet.'
                                    : undefined
                            }
                            className={`mt-1 block text-[15px] font-semibold tabular-nums ${
                                canopyChange === null
                                    ? 'text-[#888]'
                                    : canopyLoss
                                      ? 'text-[#ff5577]'
                                      : 'text-mint'
                            }`}
                        >
                            {canopyChange === null
                                ? '—'
                                : `${canopyLoss ? '−' : '+'}${Math.abs(canopyChange).toFixed(1)} pts`}
                        </strong>
                    </div>
                    <div>
                        <SectionLabel>Area</SectionLabel>
                        <strong className="mt-1 block text-[15px] font-semibold tabular-nums">
                            {hotspot.area} ha
                        </strong>
                    </div>
                </div>

                <div className="mt-5">
                    <SectionLabel>Primary driver</SectionLabel>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#ccc]">
                        {hotspot.driver}
                    </p>
                </div>

                <div className="mt-5">
                    <SectionLabel>Walk the scale</SectionLabel>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            disabled={!hotter}
                            onClick={() => hotter && onSelect(hotter.name)}
                            className="rounded-[10px] border border-white/10 bg-white/[.04] p-[9px_11px] text-left transition duration-200 enabled:cursor-pointer enabled:hover:bg-white/8 disabled:cursor-default disabled:opacity-45"
                        >
                            <span className="flex items-center gap-[6px] text-[10.5px] font-semibold uppercase tracking-[.09em] text-[#999]">
                                <i className="fa-solid fa-arrow-trend-up text-[10px] text-[#ff8c42]"></i>
                                Hotter
                            </span>
                            <span className="mt-0.5 block truncate text-[12.5px] font-semibold">
                                {hotter ? `${hotter.name} · ${hotter.temp.toFixed(1)}°` : 'City peak'}
                            </span>
                        </button>
                        <button
                            type="button"
                            disabled={!cooler}
                            onClick={() => cooler && onSelect(cooler.name)}
                            className="rounded-[10px] border border-white/10 bg-white/[.04] p-[9px_11px] text-left transition duration-200 enabled:cursor-pointer enabled:hover:bg-white/8 disabled:cursor-default disabled:opacity-45"
                        >
                            <span className="flex items-center gap-[6px] text-[10.5px] font-semibold uppercase tracking-[.09em] text-[#999]">
                                <i className="fa-solid fa-arrow-trend-down text-[10px] text-mint"></i>
                                Cooler
                            </span>
                            <span className="mt-0.5 block truncate text-[12.5px] font-semibold">
                                {cooler
                                    ? `${cooler.name} · ${cooler.temp.toFixed(1)}°`
                                    : 'City coolest'}
                            </span>
                        </button>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/8 pt-4 lg:mt-auto">
                    <Link to="/heatmap" className={PRIMARY_ACTION}>
                        <i className="fa-solid fa-map-location-dot text-[12px]"></i>
                        View on heat map
                    </Link>
                    <Link to="/mitigation" className={SECONDARY_ACTION}>
                        Review mitigation
                    </Link>
                </div>
            </div>
        </div>
    );
}
