import type { StatCardData } from '../../types';
import { STAT_ICON_TONES, TREND_TONES } from '../../utils/toneClasses';
import { useBentoFx } from '../common/BentoCard';

const CARD_CLASSES =
    'flex flex-col gap-[12px] rounded-[20px] border border-white/8 bg-white/5 p-[18px] backdrop-blur-2xl sm:gap-[14px] sm:rounded-[22px] sm:p-[22px]';

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
            <div
                className={`flex h-10 w-10 items-center justify-center rounded-[13px] text-[16px] sm:h-11 sm:w-11 sm:rounded-[14px] sm:text-[17px] ${STAT_ICON_TONES[stat.tone]}`}
            >
                <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
                <span className="text-[24px] font-bold leading-none tabular-nums sm:text-[28px]">
                    {stat.value}
                    {stat.valueSuffix ? (
                        <small className="ml-0.5 text-sm font-medium text-[#999]">
                            {stat.valueSuffix}
                        </small>
                    ) : null}
                </span>
                <span className="text-[12.5px] leading-snug text-[#999] sm:text-[13px]">
                    {stat.label}
                </span>
            </div>
            <span
                className={`flex items-center gap-[6px] border-t border-white/6 pt-[10px] text-[12px] ${TREND_TONES[stat.trendTone]}`}
            >
                <i className={`fa-solid ${stat.trendIcon}`}></i> {stat.trend}
            </span>
        </div>
    );
}
