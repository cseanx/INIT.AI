import { useMemo } from 'react';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import MitigationCard from '../components/mitigation/MitigationCard';

export default function Mitigation() {
    const projects = useApiData(api.getMitigation);

    const summary = useMemo(() => {
        const list = projects ?? [];
        const active = list.filter((p) => p.status === 'In Progress').length;
        const drops = list
            .map((p) => Number.parseFloat(p.impact.replace(/[^0-9.-]/g, '')))
            .filter((n) => Number.isFinite(n));
        const avgDrop = drops.length
            ? Math.abs(drops.reduce((sum, n) => sum + n, 0) / drops.length)
            : null;
        return { total: list.length, active, avgDrop };
    }, [projects]);

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Recommended Interventions"
                    actions={
                        <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-[12px] text-[#999]">
                            Ranked by projected impact
                        </span>
                    }
                />

                <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-white/6 pb-5 sm:grid-cols-4">
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Interventions
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums">
                            {summary.total}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">in the plan</span>
                    </div>
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            In progress
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums text-gold">
                            {summary.active}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">being delivered</span>
                    </div>
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Average drop
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums text-mint">
                            {summary.avgDrop != null ? `−${summary.avgDrop.toFixed(1)}°C` : '—'}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">projected local</span>
                    </div>
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Evidence basis
                        </span>
                        <strong className="mt-1 block text-[16px] font-semibold leading-tight">
                            Hotspot + canopy
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">
                            rule-based ranking
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-5 max-[1200px]:grid-cols-1">
                    {projects
                        ? projects.map((project) => (
                              <MitigationCard key={project.id} project={project} />
                          ))
                        : null}
                </div>
            </Card>
        </Page>
    );
}
