import { useMemo } from 'react';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import { LedgerList, LedgerRow } from '../components/common/LayoutPrimitives';
import { MITIGATION_STATUS_BADGES } from '../utils/toneClasses';

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

                <LedgerList>
                    {projects
                        ? projects.map((project) => {
                              const progressLabel =
                                  project.status === 'In Progress'
                                      ? 'implementation progress'
                                      : 'planning readiness';
                              return (
                                  <LedgerRow
                                      key={project.id}
                                      media={
                                          <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-gradient-to-br from-orange to-primary text-[13px] text-white">
                                              <i className={`fa-solid ${project.icon}`}></i>
                                          </span>
                                      }
                                      title={project.title}
                                      subtitle={
                                          <span className="line-clamp-2">{project.description}</span>
                                      }
                                      tags={[`${project.progress}% ${progressLabel}`]}
                                      bar={{
                                          value: project.progress,
                                          label: `${project.progress}%`,
                                      }}
                                      meta={
                                          <div className="flex items-center gap-4">
                                              <div>
                                                  <span className="block text-[15px] font-bold tabular-nums text-white">
                                                      {project.impact}
                                                  </span>
                                                  <span className="block text-[11px] text-[#888]">
                                                      {project.impactLabel}
                                                  </span>
                                              </div>
                                              <div className="hidden sm:block">
                                                  <span className="block text-[15px] font-bold tabular-nums text-white">
                                                      {project.metric}
                                                      {project.metricSuffix ? (
                                                          <small className="text-[11px] text-[#999]">
                                                              {project.metricSuffix}
                                                          </small>
                                                      ) : null}
                                                  </span>
                                                  <span className="block text-[11px] text-[#888]">
                                                      {project.metricLabel}
                                                  </span>
                                              </div>
                                              <span
                                                  className={`rounded-full p-[5px_12px] text-[12px] font-semibold ${MITIGATION_STATUS_BADGES[project.status]}`}
                                              >
                                                  {project.status}
                                              </span>
                                          </div>
                                      }
                                  />
                              );
                          })
                        : null}
                </LedgerList>
            </Card>
        </Page>
    );
}