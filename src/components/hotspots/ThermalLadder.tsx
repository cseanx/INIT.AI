import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Barangay } from '../../types';
import {
    SCALE_MAX_C,
    SCALE_MIN_C,
    thermalGradientCSS,
} from '../common/HeatScale';
import { SEVERITY_HEX, SEVERITY_TEXT } from '../../utils/toneClasses';

/* ==========================
   THERMAL LADDER
   The city on one thermometer: every barangay is a dot at its true peak
   temperature on a shared thermal spine, annotated with a callout label.
   Dense clusters fan into lanes so dots never overlap; labels spread
   evenly beside them and connect with leader lines, anatomical-chart
   style. Selection, severity filtering and sort order all re-flow the
   instrument with one glide.
========================== */

const PLOT_HEIGHT = 520;
const EDGE_PAD = 18;
const SPINE_X = 46;
const SPINE_WIDTH = 12;
/** Lane-0 dot centre: spine right edge + breathing room. */
const DOT_ZONE_X = SPINE_X + SPINE_WIDTH + 10;
const LANE_STEP = 11;
const DOT_MIN_GAP = 15;
const GUTTER_DESKTOP = 224;
const GUTTER_COMPACT = 152;
const LABEL_HEIGHT = 26;
const USABLE_HEIGHT = PLOT_HEIGHT - EDGE_PAD * 2;

interface LadderScale {
    min: number;
    max: number;
    ticks: number[];
    decimals: number;
    zoomed: boolean;
}

const FULL_SCALE: LadderScale = {
    min: SCALE_MIN_C,
    max: SCALE_MAX_C,
    ticks: [28, 30, 32, 34, 36, 38, 40, 42],
    decimals: 0,
    zoomed: false,
};

function roundTick(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
}

/**
 * Real p90 readings cluster tightly (usually a few tenths of a degree), so a
 * fixed 28–42°C window would stack every dot and label into one band. When the
 * spread is narrow, zoom the window to the data and print the zoom explicitly.
 * The dots still sit at their true temperature within that window.
 */
function ladderScale(barangays: Barangay[]): LadderScale {
    if (barangays.length === 0) return FULL_SCALE;
    const temps = barangays.map((b) => b.temp);
    const dataMin = Math.min(...temps);
    const dataMax = Math.max(...temps);
    const range = Math.max(0.1, dataMax - dataMin);
    if (range >= 6) return FULL_SCALE;

    // Enough dot span that consecutive labels clear LABEL_HEIGHT; cap the
    // window so the dots do not spread wider than the real data warrants.
    const neededDotSpan = Math.max(1, (barangays.length - 1) * LABEL_HEIGHT - 88);
    const preferred = (range * USABLE_HEIGHT) / neededDotSpan;
    const span = Math.min(Math.max(preferred, range * 1.05), range * 1.6 + 0.15);
    const center = (dataMin + dataMax) / 2;
    let min = Math.max(SCALE_MIN_C, center - span / 2);
    let max = Math.min(SCALE_MAX_C, min + span);
    min = Math.max(SCALE_MIN_C, max - span);

    const actualSpan = max - min;
    const step =
        actualSpan <= 0.6
            ? 0.05
            : actualSpan <= 1.2
              ? 0.1
              : actualSpan <= 2.5
                ? 0.25
                : actualSpan <= 5
                  ? 0.5
                  : 1;
    const decimals = step < 0.1 ? 2 : step < 1 ? 1 : 0;
    const ticks: number[] = [];
    const first = Math.ceil((min - 1e-9) / step) * step;
    for (let value = first; value <= max + 1e-9; value += step) {
        ticks.push(roundTick(value, decimals));
    }
    return {
        min,
        max,
        ticks,
        decimals,
        zoomed: actualSpan < SCALE_MAX_C - SCALE_MIN_C - 0.001,
    };
}

/** Temperature → vertical position. Descending reads hottest-at-top, like a ranking. */
function tempY(temp: number, order: 'asc' | 'desc', scale: LadderScale): number {
    const frac = (temp - scale.min) / (scale.max - scale.min);
    const clamped = Math.min(1, Math.max(0, frac));
    return order === 'desc'
        ? EDGE_PAD + (1 - clamped) * USABLE_HEIGHT
        : EDGE_PAD + clamped * USABLE_HEIGHT;
}

interface PlottedItem {
    barangay: Barangay;
    lane: number;
    dotX: number;
    dotY: number;
    labelY: number;
}

function plotLadder(
    barangays: Barangay[],
    order: 'asc' | 'desc',
    scale: LadderScale,
    maxLanes: number,
): PlottedItem[] {
    const sorted = [...barangays].sort((a, b) =>
        order === 'desc' ? b.temp - a.temp : a.temp - b.temp,
    );
    if (sorted.length === 0) return [];

    // Dots sit at their true temperature; near-neighbours fan into lanes.
    const placed: Array<{ y: number; lane: number }> = [];
    const dots = sorted.map((b) => {
        const y = tempY(b.temp, order, scale);
        let lane = 0;
        while (placed.some((p) => p.lane === lane && Math.abs(p.y - y) < DOT_MIN_GAP)) {
            lane += 1;
        }
        lane %= maxLanes;
        placed.push({ y, lane });
        return { y, lane };
    });

    // Labels spread evenly across the span their dots occupy, then expand
    // around the cluster until every label has a clear row. Without this a
    // tight real-world cluster would print all names on top of each other.
    const dotYs = dots.map((d) => d.y);
    const n = sorted.length;
    let top = Math.max(EDGE_PAD, Math.min(...dotYs) - 44);
    let bottom = Math.min(PLOT_HEIGHT - EDGE_PAD, Math.max(...dotYs) + 44);
    const neededSpan = Math.max(0, (n - 1) * LABEL_HEIGHT);
    if (bottom - top < neededSpan) {
        const center = (top + bottom) / 2;
        top = Math.max(
            EDGE_PAD,
            Math.min(center - neededSpan / 2, PLOT_HEIGHT - EDGE_PAD - neededSpan),
        );
        bottom = top + neededSpan;
    }

    return sorted.map((b, i) => ({
        barangay: b,
        lane: dots[i].lane,
        dotX: DOT_ZONE_X + dots[i].lane * LANE_STEP,
        dotY: dots[i].y,
        labelY: n === 1 ? dots[i].y : top + ((bottom - top) * i) / (n - 1),
    }));
}

/** Tracks the rendered width of an element (the ladder re-spaces when its column narrows). */
function useElementWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
    const ref = useRef<T | null>(null);
    const [width, setWidth] = useState(1024);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) setWidth(entry.contentRect.width);
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);
    return [ref, width];
}

interface ThermalLadderProps {
    barangays: Barangay[];
    order: 'asc' | 'desc';
    selected: string | null;
    onSelect: (name: string) => void;
}

export default function ThermalLadder({
    barangays,
    order,
    selected,
    onSelect,
}: ThermalLadderProps) {
    const [containerRef, width] = useElementWidth<HTMLDivElement>();
    const [hovered, setHovered] = useState<string | null>(null);
    const labelRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const gutter = width < 620 ? GUTTER_COMPACT : GUTTER_DESKTOP;
    const maxLanes = width < 620 ? 3 : 10;
    const scale = useMemo(() => ladderScale(barangays), [barangays]);
    const items = useMemo(
        () => plotLadder(barangays, order, scale, maxLanes),
        [barangays, order, scale, maxLanes],
    );
    const maxLane = items.reduce((max, item) => Math.max(max, item.lane), 0);
    // Keep labels clear of the fanned dot zone on every viewport.
    const labelLeft = Math.max(
        gutter,
        DOT_ZONE_X + maxLane * LANE_STEP + 18,
    );

    // Arrow keys walk the ranking while a label has focus.
    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        const target = items[next];
        if (!target) return;
        onSelect(target.barangay.name);
        labelRefs.current[next]?.focus();
    }

    return (
        <div ref={containerRef} className="min-w-0">
            <div
                className="relative h-[520px]"
                role="group"
                aria-label="Hotspots ranked on the city thermal scale"
            >
                {/* Thermal spine — cool at the bottom, hot at the top. The
                    gradient is a slice of the fixed 28–42°C window so a
                    zoomed ladder still carries absolute color meaning. */}
                <div
                    aria-hidden="true"
                    className="absolute bottom-0 top-0 w-[12px] overflow-hidden rounded-full border border-white/10 transition-transform duration-500 motion-reduce:transition-none"
                    style={{
                        left: SPINE_X,
                        transform: order === 'asc' ? 'scaleY(-1)' : 'none',
                        transformOrigin: 'center',
                    }}
                >
                    <div
                        className="absolute inset-x-0"
                        style={{
                            height: `${((SCALE_MAX_C - SCALE_MIN_C) / (scale.max - scale.min)) * 100}%`,
                            bottom: `${(-(scale.min - SCALE_MIN_C) / (scale.max - scale.min)) * 100}%`,
                            background: thermalGradientCSS('to top'),
                        }}
                    />
                </div>

                {/* Isotherm gridlines: temperature reads across the whole field */}
                {scale.ticks.map((tick) => (
                    <div
                        key={tick}
                        aria-hidden="true"
                        className="absolute left-[58px] right-0 h-px bg-white/[.04] transition-transform duration-500 motion-reduce:transition-none"
                        style={{ transform: `translateY(${tempY(tick, order, scale)}px)` }}
                    />
                ))}

                {/* Temperature ticks */}
                {scale.ticks.map((tick) => (
                    <div
                        key={tick}
                        aria-hidden="true"
                        className="absolute left-0 flex w-[36px] items-center justify-end gap-[6px] transition-transform duration-500 motion-reduce:transition-none"
                        style={{
                            transform: `translateY(${tempY(tick, order, scale)}px) translateY(-50%)`,
                        }}
                    >
                        <span className="text-[11px] font-medium tabular-nums text-[#888]">
                            {tick.toFixed(scale.decimals)}
                        </span>
                        <span className="h-px w-[5px] bg-white/25" />
                    </div>
                ))}

                {/* Leader line — drawn only for the reading in focus */}
                {items.map(({ barangay, dotX, dotY, labelY }) => {
                    const isFocus = barangay.name === selected || barangay.name === hovered;
                    if (!isFocus) return null;
                    const dx = labelLeft - 6 - (dotX + 7);
                    const dy = labelY - dotY;
                    return (
                        <span
                            key={`leader-${barangay.name}`}
                            aria-hidden="true"
                            className="absolute left-0 top-0 h-px transition-all duration-500 motion-reduce:transition-none"
                            style={{
                                width: Math.hypot(dx, dy),
                                transform: `translate(${dotX + 7}px, ${dotY}px) rotate(${Math.atan2(dy, dx)}rad)`,
                                transformOrigin: '0 50%',
                                background:
                                    barangay.name === selected
                                        ? 'rgba(255,45,85,.55)'
                                        : 'rgba(255,255,255,.3)',
                            }}
                        />
                    );
                })}

                {/* Dots at their true temperature */}
                {items.map(({ barangay, dotX, dotY }) => {
                    const isSelected = barangay.name === selected;
                    const isHovered = barangay.name === hovered;
                    return (
                        <button
                            key={`dot-${barangay.name}`}
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            onClick={() => onSelect(barangay.name)}
                            onMouseEnter={() => setHovered(barangay.name)}
                            onMouseLeave={() => setHovered(null)}
                            className="absolute left-0 top-0 h-3 w-3 cursor-pointer rounded-full border-none p-0 transition-transform duration-500 motion-reduce:transition-none"
                            style={{
                                background: SEVERITY_HEX[barangay.severity],
                                transform: `translate(${dotX}px, ${dotY}px) translate(-50%, -50%) scale(${isSelected ? 1.4 : isHovered ? 1.2 : 1})`,
                                boxShadow: `0 0 ${isSelected ? 16 : 9}px ${SEVERITY_HEX[barangay.severity]}${
                                    isSelected ? ', 0 0 0 3px rgba(255,255,255,.3)' : ''
                                }`,
                            }}
                        />
                    );
                })}

                {/* Callout labels (the accessible controls) */}
                {items.map(({ barangay, labelY }, index) => {
                    const isSelected = barangay.name === selected;
                    const isHovered = barangay.name === hovered;
                    return (
                        <button
                            key={barangay.name}
                            ref={(el) => {
                                labelRefs.current[index] = el;
                            }}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelect(barangay.name)}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            onMouseEnter={() => setHovered(barangay.name)}
                            onMouseLeave={() => setHovered(null)}
                            onFocus={() => setHovered(barangay.name)}
                            onBlur={() => setHovered(null)}
                            className={`absolute top-0 right-0 flex items-center justify-between gap-3 rounded-full border px-[10px] text-left transition-[transform,background-color,border-color,color] duration-500 motion-reduce:transition-none max-[640px]:text-[12px] ${
                                isSelected
                                    ? 'chip-btn active'
                                    : isHovered
                                      ? 'border-transparent bg-white/[.06] text-white'
                                      : 'border-transparent bg-transparent text-[#ccc] hover:bg-white/[.06] hover:text-white'
                            }`}
                            style={{
                                left: labelLeft,
                                height: LABEL_HEIGHT,
                                transform: `translateY(${labelY}px) translateY(-50%)`,
                            }}
                        >
                            <span className="truncate text-[13px] font-medium">
                                {barangay.name}
                            </span>
                            <span
                                className={`shrink-0 text-[12.5px] font-semibold tabular-nums ${SEVERITY_TEXT[barangay.severity]}`}
                            >
                                {barangay.temp.toFixed(1)}°
                            </span>
                        </button>
                    );
                })}
            </div>
            <p className="mt-1.5 text-right text-[10.5px] text-[#777]">
                {scale.zoomed
                    ? `Scale zoomed to ${scale.min.toFixed(scale.decimals)}–${scale.max.toFixed(scale.decimals)}°C · fixed city window 28–42°C`
                    : 'Fixed city window 28–42°C'}
            </p>
        </div>
    );
}
