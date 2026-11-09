import type { MitigationProject } from '../../types';
import { MITIGATION_STATUS_BADGES } from '../../utils/toneClasses';
import { useBentoFx } from '../common/BentoCard';

const CARD_CLASSES =
    'rounded-[20px] border border-white/7 bg-white/[.03] p-[20px] transition duration-200 hover:-translate-y-0.5 hover:bg-white/5 sm:p-[22px]';

export default function MitigationCard({ project }: { project: MitigationProject }) {
    const { ref, className: bentoClassName, style } = useBentoFx();
    const delivering = project.status === 'In Progress';
    const progressLabel = delivering ? 'Implementation progress' : 'Planning readiness';

    return (
        <div ref={ref} style={style} className={`${CARD_CLASSES} ${bentoClassName}`}>
            <div className="mc-top mb-[14px] flex items-center justify-between gap-3">
                <div className="mc-icon flex h-[42px] w-[42px] items-center justify-center rounded-[13px] bg-gradient-to-br from-orange to-primary">
                    <i className={`fa-solid ${project.icon}`}></i>
                </div>
                <span
                    className={`rounded-full p-[5px_12px] text-[12px] font-semibold ${MITIGATION_STATUS_BADGES[project.status]}`}
                >
                    {project.status}
                </span>
            </div>
            <h4 className="mb-2 text-white">{project.title}</h4>
            <p className="mb-4 text-[13px] leading-[1.6] text-[#aaa]">{project.description}</p>
            <div className="mc-stats mb-[16px] flex gap-[26px]">
                <div>
                    <span className="block text-lg font-bold tabular-nums">{project.impact}</span>
                    <small className="text-[12px] text-[#999]">{project.impactLabel}</small>
                </div>
                <div>
                    <span className="block text-lg font-bold tabular-nums">
                        {project.metric}
                        {project.metricSuffix ? (
                            <small className="text-[12px] text-[#999]">
                                {project.metricSuffix}
                            </small>
                        ) : null}
                    </span>
                    <small className="text-[12px] text-[#999]">{project.metricLabel}</small>
                </div>
            </div>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
                <span className="text-[#999]">{progressLabel}</span>
                <span className="font-semibold tabular-nums text-[#ddd]">{project.progress}%</span>
            </div>
            <div
                className="mc-bar h-[6px] overflow-hidden rounded-full bg-white/6"
                role="progressbar"
                aria-label={`${progressLabel} for ${project.title}`}
                aria-valuenow={project.progress}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div
                    style={{ width: `${project.progress}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-orange to-primary"
                ></div>
            </div>
        </div>
    );
}
