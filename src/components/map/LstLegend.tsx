import {
    formatLstDate,
    formatLstPeriod,
    LST_MODE_LABEL,
    LST_MODE_OVERPASS,
    type LstCadence,
    type LstMode,
} from './gibsLst';
import { LST_SCALE_TICKS, lstScaleGradientCSS } from './lstScale';

/**
 * Compact thermal legend for the recolored LST layer. The map and the legend
 * share the local 10–40°C scale from `lstScale.ts`. The date and cadence live
 * in the map header, so this overlay only carries the scale and pass type.
 */
export default function LstLegend({
    date,
    cadence,
    mode,
}: {
    date: string;
    cadence: LstCadence;
    mode: LstMode;
}) {
    const modeLabel = LST_MODE_LABEL[mode];
    const dateLabel = cadence === 'weekly' ? formatLstPeriod(date) : formatLstDate(date);
    const cadenceLabel = cadence === 'weekly' ? '1 km · 8-day' : '1 km · daily';
    const delayLabel = cadence === 'weekly' ? 'GIBS · ~2 wk' : 'GIBS · ~3–4 d';

    return (
        <div
            className="pointer-events-none absolute bottom-[10px] left-[10px] z-10 flex w-[224px] max-w-[calc(100%-20px)] flex-col gap-[6px] rounded-[13px] border border-white/10 bg-[rgba(10,10,12,.9)] px-[10px] py-[8px] shadow-[0_8px_24px_rgba(0,0,0,.4)] backdrop-blur-[14px] sm:bottom-[14px] sm:left-[14px] sm:w-[244px]"
            title={`${modeLabel} pass · ${dateLabel} · ${cadenceLabel} · ${delayLabel}. Colors use the INIT.AI 10–40°C scale applied to NASA LST bins. Uncolored areas are water, cloud, or no satellite retrieval.`}
        >
            <div className="flex items-center justify-between gap-2">
                <span className="text-[10.5px] font-semibold uppercase tracking-[.08em] text-[#ddd]">
                    LST <span className="font-medium text-[#888]">≈°C</span>
                </span>
                <span
                    className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/10 px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[.05em] text-[#ccc]"
                    title={`${modeLabel} pass · nominal Aqua overpass ${LST_MODE_OVERPASS[mode]}. Exact per-pixel time is not carried by this colorized layer.`}
                >
                    <i
                        className={`fa-solid ${
                            mode === 'day' ? 'fa-sun' : 'fa-moon'
                        } text-[8px] text-[#aaa]`}
                        aria-hidden="true"
                    ></i>
                    MODIS · {modeLabel}
                </span>
            </div>

            <div className="relative h-[10px] w-full overflow-hidden rounded-full border border-white/10">
                <div
                    className="absolute inset-0"
                    style={{ background: lstScaleGradientCSS() }}
                ></div>
                <span className="absolute inset-y-0 left-[33.33%] w-px bg-black/20"></span>
                <span className="absolute inset-y-0 left-[66.66%] w-px bg-black/20"></span>
            </div>

            <div className="flex justify-between text-[9px] font-medium tabular-nums text-[#999]">
                {LST_SCALE_TICKS.map((tick, index) => (
                    <span key={tick}>
                        {tick}
                        {index === LST_SCALE_TICKS.length - 1 ? '+' : ''}°
                    </span>
                ))}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/6 pt-[5px] text-[9px] leading-none text-[#777]">
                <span>{cadenceLabel}</span>
                <span>{delayLabel}</span>
            </div>
        </div>
    );
}
