import type { StatCardData } from '../../types';
import { STAT_ICON_TONES, TREND_TONES } from '../../utils/toneClasses';
import { useBentoFx } from '../common/BentoCard';

const CARD_CLASSES =
    'flex flex-col gap-[14px] rounded-[22px] border border-white/8 bg-white/5 p-[22px] backdrop-blur-2xl';

export default function StatCard({ stat }: { stat: StatCardData }) {
    const { ref, className: bentoClassName, style } = useBentoFx();

    return (
        <div ref={ref} style={style} className={`${CARD_CLASSES} ${bentoClassName}`}>
            <div
                className={`flex h-11 w-11 items-center justify-center rounded-[14px] text-[17px] ${STAT_ICON_TONES[stat.tone]}`}
            >
                <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div className="flex flex-col gap-1">
                <span className="text-[28px] font-bold">
                    {stat.value}
                    {stat.valueSuffix ? (
                        <small className="text-sm font-medium text-[#999]">
                            {stat.valueSuffix}
                        </small>
                    ) : null}
                </span>
                <span className="text-[13px] text-[#999]">{stat.label}</span>
            </div>
            <span
                className={`flex items-center gap-[6px] border-t border-white/6 pt-[10px] text-xs ${TREND_TONES[stat.trendTone]}`}
            >
                <i className={`fa-solid ${stat.trendIcon}`}></i> {stat.trend}
            </span>
        </div>
    );
}
