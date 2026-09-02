import { paletteHorizontalCSS, LST_MIN_C, LST_MAX_C, HAS_OPENWEATHER_KEY, lstSourceLabel } from './rasterLST';

/**
 * Professional thermal legend — continuous gradient, honest labeling (§6).
 * When OpenWeather key present, label is “Temperature” (air), not “Satellite LST”.
 */
export default function LstLegend() {
    const isOW = HAS_OPENWEATHER_KEY;
    return (
        <div className="pointer-events-none absolute bottom-[18px] left-[18px] z-10 flex min-w-[240px] flex-col gap-[8px] rounded-[14px] border border-white/10 bg-[rgba(10,10,12,.88)] px-[14px] py-[10px] backdrop-blur-[14px] shadow-[0_8px_24px_rgba(0,0,0,.4)]">
            <div className="flex items-center justify-between gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-[.08em] text-[#bbb]">
                    {isOW ? 'Temperature' : 'Temperature'}
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[#999]">
                    °C
                </span>
            </div>
            <div className="flex items-center gap-2 text-[9px] font-medium text-[#777]">
                <span>COOL</span>
                <div className="h-[12px] flex-1 rounded-full border border-white/10" style={{ background: paletteHorizontalCSS() }}></div>
                <span>HOT</span>
            </div>
            <div className="flex justify-between text-[10px] font-medium tabular-nums text-[#bbb]">
                <span>{LST_MIN_C}</span>
                <span>0</span>
                <span>20</span>
                <span>35</span>
                <span>{LST_MAX_C}+</span>
            </div>
            <div className="flex items-center justify-between text-[8.5px] leading-none text-[#666]">
                <span>{isOW ? 'OpenWeather' : lstSourceLabel()}</span>
                <span>{isOW ? 'honest air temp' : 'demo — no LST claim'}</span>
            </div>
        </div>
    );
}