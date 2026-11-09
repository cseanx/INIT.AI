import { LST_MAX_C, LST_MIN_C, paletteHorizontalCSS } from './rasterLST';

/**
 * Fallback legend when the thermal layer is off — same palette and
 * provenance, without the colour ramp interaction.
 */
export default function HeatLegend() {
    return (
        <div className="pointer-events-none absolute bottom-[14px] left-[14px] z-10 flex max-w-[calc(100%-28px)] flex-col gap-[7px] rounded-[14px] border border-white/10 bg-[rgba(10,10,12,.9)] px-[13px] py-[10px] backdrop-blur-[14px]">
            <div className="flex items-center justify-between gap-3 text-[12px] font-semibold uppercase tracking-[.08em] text-[#ddd]">
                <span>Land-surface temp</span>
                <span className="text-[12px] text-[#999]">°C</span>
            </div>
            <div
                className="h-[10px] w-[220px] max-w-full rounded-full border border-white/10"
                style={{ background: paletteHorizontalCSS() }}
            ></div>
            <div className="flex justify-between text-[12px] font-medium tabular-nums text-[#ddd]">
                <span>{LST_MIN_C}</span>
                <span>25</span>
                <span>35</span>
                <span>{LST_MAX_C}</span>
            </div>
        </div>
    );
}
