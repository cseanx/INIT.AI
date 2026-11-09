import { paletteHorizontalCSS, LST_MIN_C, LST_MAX_C } from './rasterLST';

/**
 * Thermal legend — continuous gradient with honest provenance.
 * The backend uses Landsat LST 30 m where a scene is available and a
 * labelled synthetic fallback otherwise. 16-day revisit, never "live".
 */
export default function LstLegend() {
    return (
        <div className="pointer-events-none absolute bottom-[14px] left-[14px] z-10 flex min-w-[220px] max-w-[calc(100%-28px)] flex-col gap-[7px] rounded-[14px] border border-white/10 bg-[rgba(10,10,12,.9)] px-[13px] py-[10px] backdrop-blur-[14px] shadow-[0_8px_24px_rgba(0,0,0,.4)]">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#ddd]">
                    Land-surface temp
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[12px] font-semibold uppercase tracking-wide text-[#ccc]">
                    °C
                </span>
            </div>
            <div className="flex items-center gap-2 text-[12px] font-medium text-[#bbb]">
                <span>COOL</span>
                <div
                    className="h-[12px] flex-1 rounded-full border border-white/10"
                    style={{ background: paletteHorizontalCSS() }}
                ></div>
                <span>HOT</span>
            </div>
            <div className="flex justify-between text-[12px] font-medium tabular-nums text-[#ddd]">
                <span>{LST_MIN_C}</span>
                <span>20</span>
                <span>25</span>
                <span>35</span>
                <span>{LST_MAX_C}+</span>
            </div>
            <div className="flex items-center justify-between gap-2 text-[12px] leading-none text-[#999]">
                <span>Landsat LST · 30 m</span>
                <span>Demo scene · 16-day revisit</span>
            </div>
        </div>
    );
}
