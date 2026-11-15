import type { StatCardData } from '../../types';
import { STAT_ICON_TONES, TREND_TONES } from '../../utils/toneClasses';
import { useBentoFx } from '../common/BentoCard';

const CARD_CLASSES =
    'flex flex-col rounded-[20px] border border-white/8 bg-white/5 p-[18px] backdrop-blur-2xl sm:rounded-[22px] sm:p-[22px]';

/**
 * Overview readout: metric identity (icon + label), the value, then the
 * change with its context demoted to metadata. Order matters — the label
 * names the number before the eye lands on it, so the card scans as
 * label → reading → change instead of decoration → number → caption.
 */
export default function StatCard({
    stat,
    className = '',
}: {
    stat: StatCardData;
    className?: string;
}) {
    const { ref, className: bentoClassName, style } = useBentoFx();

    return (
        <div ref={ref} style={style} className={`${CARD_CLASSES} ${bentoClassName} ${className}`}>
            <div className="flex min-w-0 items-center gap-3">
                <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] text-[15px] sm:h-11 sm:w-11 sm:rounded-[14px] sm:text-[16px] ${STAT_ICON_TONES[stat.tone]}`}
                    aria-hidden="true"
                >
                    <i className={`fa-solid ${stat.icon}`}></i>
                </span>
                <span className="min-w-0 text-[12.5px] font-medium leading-snug text-[#999]">
                    {stat.label}
                </span>
            </div>

            <div className="mt-[14px] flex items-baseline gap-1 sm:mt-4">
                <span className="text-[30px] font-semibold leading-none tracking-[-.015em] tabular-nums sm:text-[32px]">
                    {stat.value}
                </span>
                {stat.valueSuffix ? (
                    <span className="text-[15px] font-medium text-[#888]">
                        {stat.valueSuffix.trim()}
                    </span>
                ) : null}
            </div>

            <div className="mt-auto pt-4">
                <div
                    className={`flex items-start gap-[7px] border-t border-white/6 pt-3 text-[12px] leading-snug ${TREND_TONES[stat.trendTone]}`}
                >
                    <i
                        className={`fa-solid ${stat.trendIcon} mt-[2px] text-[11px]`}
                        aria-hidden="true"
                    ></i>
                    <span className="min-w-0">
                        <span className="font-medium">{stat.trend}</span>
                        {stat.trendNote ? (
                            <span className="font-normal text-[#888]"> {stat.trendNote}</span>
                        ) : null}
                    </span>
                </div>
            </div>
        </div>
    );
}
