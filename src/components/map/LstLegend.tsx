import { LST_MAX_C, LST_MIN_C } from './lstData';

/**
 * Floating legend for the LST overlay — same ramp and placement as the
 * static HeatLegend, shown only while the Land Surface Temperature layer
 * is enabled. Frontend-only scale (25°C blue → 45°C red).
 */
export default function LstLegend() {
    return (
        <div className="pointer-events-none absolute bottom-[18px] left-[18px] z-10 flex flex-col gap-[8px] rounded-[14px] border border-white/10 bg-[rgba(10,10,12,.82)] px-[14px] py-[10px] backdrop-blur-[12px]">
            <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.08em] text-[#999]">
                <span>Land Surface Temp</span>
                <span className="text-[#777]">°C</span>
            </div>
            <div
                className="h-[8px] w-[190px] rounded-full"
                style={{
                    background:
                        'linear-gradient(90deg,#3b82f6 0%,#00d4ff 25%,#00ff84 40%,#ffd23f 55%,#ff8c42 75%,#ff2d55 100%)',
                }}
            ></div>
            <div className="flex justify-between text-[10px] font-medium text-[#bbb]">
                <span>{LST_MIN_C}</span>
                <span>30</span>
                <span>35</span>
                <span>40</span>
                <span>{LST_MAX_C}</span>
            </div>
        </div>
    );
}