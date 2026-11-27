import type { Severity } from '../../types';
import { SEVERITY_HEX } from '../../utils/toneClasses';

/* ==========================
   CITY THERMAL SCALE
   One fixed 28–42°C window used by every temperature instrument on the
   dashboard and hotspot views, so a reading means the same thing wherever
   it is drawn. The map uses NASA's own GIBS colormap instead.
========================== */

export const SCALE_MIN_C = 28;
export const SCALE_MAX_C = 42;

const THERMAL_STOPS: Array<[number, string]> = [
    [28, '#00e676'],
    [32, '#a0ff00'],
    [35, '#ffd23f'],
    [38, '#ff8c42'],
    [42, '#ff2d55'],
];

/** CSS gradient over the fixed city window (28–42°C). */
export function thermalGradientCSS(
    dir: 'to top' | 'to bottom' | 'to right' = 'to right',
): string {
    const span = SCALE_MAX_C - SCALE_MIN_C;
    const stops = THERMAL_STOPS.map(
        ([temp, color]) => `${color} ${(((temp - SCALE_MIN_C) / span) * 100).toFixed(1)}%`,
    );
    return `linear-gradient(${dir}, ${stops.join(', ')})`;
}

export interface HeatScaleMarker {
    temp: number;
    severity: Severity;
    title?: string;
}

interface HeatScaleProps {
    markers?: HeatScaleMarker[];
    caption?: string;
    className?: string;
}

/** Compact horizontal heat scale: gradient bar, severity markers, end ticks. */
export default function HeatScale({
    markers = [],
    caption = 'City surface temp',
    className = '',
}: HeatScaleProps) {
    const span = SCALE_MAX_C - SCALE_MIN_C;
    return (
        <div className={`w-full ${className}`}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[.1em] text-[#999]">
                    {caption}
                </span>
                <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10.5px] font-semibold text-[#aaa]">
                    °C
                </span>
            </div>
            <div
                className="relative mt-2 h-[10px] rounded-full border border-white/12"
                style={{ background: thermalGradientCSS('to right') }}
            >
                {markers.map((marker) => (
                    <span
                        key={marker.temp}
                        title={marker.title ?? `${marker.temp.toFixed(1)}°C`}
                        className="absolute top-1/2 z-10 h-[14px] w-[14px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80"
                        style={{
                            left: `${((marker.temp - SCALE_MIN_C) / span) * 100}%`,
                            background: SEVERITY_HEX[marker.severity],
                            boxShadow: `0 0 12px ${SEVERITY_HEX[marker.severity]}`,
                        }}
                    />
                ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] font-medium tabular-nums text-[#888]">
                <span>{SCALE_MIN_C}°</span>
                <span>{SCALE_MAX_C}°</span>
            </div>
        </div>
    );
}
