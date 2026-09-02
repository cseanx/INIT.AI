import { LST_MAX_C, LST_MIN_C, paletteHorizontalCSS } from './rasterLST';

/**
 * Fallback legend when thermal is off — same palette, honest LST.
 */
export default function HeatLegend() {
    return (
        <div className="pointer-events-none absolute bottom-[18px] left-[18px] z-10 flex flex-col gap-[8px] rounded-[14px] border border-white/10 bg-[rgba(10,10,12,.88)] px-[14px] py-[10px] backdrop-blur-[14px]">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.08em] text-[#999]">
                <span>Temperature</span>
                <span className="text-[#777]">°C</span>
            </div>
            <div className="h-[10px] w-[220px] rounded-full border border-white/10" style={{ background: paletteHorizontalCSS() }}></div>
            <div className="flex justify-between text-[10px] font-medium tabular-nums text-[#bbb]">
                <span>{LST_MIN_C}</span>
                <span>25</span>
                <span>35</span>
                <span>{LST_MAX_C}</span>
            </div>
        </div>
    );
}