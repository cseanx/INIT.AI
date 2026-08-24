import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Page from '../components/layout/Page';
import Card from '../components/common/Card';
import PanelHead from '../components/common/PanelHead';
import Toast, { type ToastMessage } from '../components/common/Toast';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import { discardLocalReport, loadCurrentReport, loadStoredReports } from '../reports/reportService';
import type { Report, ReportPayload } from '../types';

const PRIMARY_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[12px_22px] text-[13.5px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';
const SECONDARY_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border border-white/[.14] bg-white/5 p-[12px_22px] text-[13.5px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/9';
const DELETE_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border border-[rgba(255,45,85,.4)] bg-[rgba(255,45,85,.08)] p-[12px_22px] text-[13.5px] font-semibold text-[#ff7a94] transition duration-300 hover:-translate-y-0.5 hover:bg-[rgba(255,45,85,.16)] hover:text-white';
const DELETE_CONFIRM_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-[#ff2d55] p-[12px_22px] text-[13.5px] font-semibold text-white shadow-[0_10px_30px_rgba(255,45,85,.35)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(255,45,85,.45)]';

const SECTION_META: Record<string, { icon: string; title: string }> = {
    summary: { icon: 'fa-file-lines', title: 'Executive Summary' },
    heat: { icon: 'fa-temperature-high', title: 'Heat Analysis' },
    hotspots: { icon: 'fa-location-dot', title: 'Hotspot Analysis' },
    canopy: { icon: 'fa-tree', title: 'Canopy Analysis' },
    mitigation: { icon: 'fa-seedling', title: 'Mitigation Recommendations' },
    maps: { icon: 'fa-map-location-dot', title: 'Maps' },
    charts: { icon: 'fa-chart-column', title: 'Charts' },
    methodology: { icon: 'fa-flask', title: 'Methodology' },
    sources: { icon: 'fa-database', title: 'Data Sources' },
};

function Stat({ label, value, icon }: { label: string; value: string; icon: string }) {
    return (
        <div className="rounded-[14px] border border-white/6 bg-white/[.03] p-[14px]">
            <div className="flex items-center gap-[7px] text-[11px] text-[#888]">
                <i className={`fa-solid ${icon} text-accent`}></i>
                {label}
            </div>
            <div className="mt-[6px] text-[20px] font-bold text-white">{value}</div>
        </div>
    );
}

/** Rebuild a POST payload from a stored report (used to push a locally
 *  saved report to the server on its first save). */
function toPayload(report: Report): ReportPayload {
    const { id: _id, date: _date, ...payload } = report;
    return payload;
}

export default function ReportEditor() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const idParam = searchParams.get('id');
    // Read-only mode: /report/edit?id=X&mode=view hides save/delete controls.
    const viewMode = searchParams.get('mode') === 'view';
    const hotspots = useApiData(api.getHotspots);
    const [report, setReport] = useState<Report | null | undefined>(undefined);
    const [recommendations, setRecommendations] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    useEffect(() => {
        let active = true;
        // The page stays mounted across navigations, so reset transient
        // button states whenever a (new) report is loaded — otherwise a
        // previous delete leaves the Delete button spinning forever.
        setDeleting(false);
        setConfirmingDelete(false);
        setSaving(false);
        async function load() {
            if (idParam) {
                const stored = loadStoredReports().find((r) => String(r.id) === idParam);
                if (stored) {
                    if (active) {
                        setReport(stored);
                        setRecommendations(stored.recommendations);
                    }
                    return;
                }
                try {
                    setReport(undefined);
                    const fetched = await api.getReport(idParam);
                    if (active) {
                        setReport(fetched);
                        setRecommendations(fetched.recommendations);
                    }
                } catch {
                    if (active) setReport(null);
                }
                return;
            }
            const current = loadCurrentReport();
            if (active) {
                setReport(current);
                setRecommendations(current?.recommendations ?? '');
            }
        }
        load();
        return () => {
            active = false;
        };
    }, [idParam]);

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(t);
    }, [toast]);

    // Two-click delete guard: the first click arms the button, the second
    // performs the deletion; arming expires after a few seconds.
    useEffect(() => {
        if (!confirmingDelete) return;
        const t = window.setTimeout(() => setConfirmingDelete(false), 4000);
        return () => window.clearTimeout(t);
    }, [confirmingDelete]);

    const isRemote = typeof report?.id === 'number';
    const sections = useMemo(
        () => (report?.sections ?? []).map((key) => SECTION_META[key]).filter(Boolean),
        [report],
    );

    if (report === undefined) {
        return (
            <Page>
                <Card>
                    <div className="flex items-center justify-center gap-[10px] p-[60px_20px] text-sm text-[#888]">
                        <i className="fa-solid fa-spinner fa-spin text-accent"></i> Loading report…
                    </div>
                </Card>
            </Page>
        );
    }

    if (!report) {
        return (
            <Page>
                <Card>
                    <PanelHead
                        title="Report Editor"
                        actions={
                            <button
                                type="button"
                                onClick={() => navigate('/reports/new')}
                                className={PRIMARY_BTN_CLASSES}
                            >
                                <i className="fa-solid fa-file-circle-plus text-[13px]"></i> Create a Report
                            </button>
                        }
                    />
                    <div className="flex flex-col items-center gap-[14px] p-[50px_20px] text-center">
                        <div className="flex h-[64px] w-[64px] items-center justify-center rounded-[20px] border border-white/6 bg-white/[.03] text-[22px] text-accent">
                            <i className="fa-solid fa-folder-open"></i>
                        </div>
                        <h3 className="text-[16px] font-semibold text-white">No generated report yet</h3>
                        <p className="max-w-[380px] text-[13px] leading-relaxed text-[#999]">
                            Generated reports appear here after you run the report builder. Start a new
                            report to produce one from INIT.AI datasets.
                        </p>
                    </div>
                </Card>
            </Page>
        );
    }

    async function handleSave() {
        if (!report) return;
        setSaving(true);
        try {
            if (isRemote) {
                const updated = await api.reports.update(report.id as number, { recommendations });
                setReport(updated);
                setToast({ id: Date.now(), text: 'Report saved to the database.', tone: 'success' });
            } else {
                const created = await api.reports.create({
                    ...toPayload(report),
                    recommendations,
                });
                discardLocalReport(report.id);
                setReport(created);
                setToast({ id: Date.now(), text: 'Report pushed to the database.', tone: 'success' });
            }
        } catch {
            setToast({ id: Date.now(), text: 'Could not reach the server — changes kept locally.', tone: 'error' });
            setRecommendations(recommendations);
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        if (!report) return;
        if (!confirmingDelete) {
            setConfirmingDelete(true);
            return;
        }
        setDeleting(true);
        try {
            if (isRemote) {
                await api.reports.remove(report.id as number);
            }
            discardLocalReport(report.id);
            navigate('/reports');
        } catch {
            setDeleting(false);
            setConfirmingDelete(false);
            setToast({ id: Date.now(), text: 'Could not delete the report.', tone: 'error' });
        }
    }

    const priorityCount = (hotspots ?? []).filter((b) => b.priority).length;
    const period =
        report.periodStart && report.periodEnd ? `${report.periodStart} to ${report.periodEnd}` : '—';

    return (
        <Page>
            <Card>
                <PanelHead
                    title={viewMode ? 'Report Viewer' : 'Report Editor'}
                    actions={
                        <>
                            <button
                                type="button"
                                onClick={() => navigate('/reports')}
                                className={SECONDARY_BTN_CLASSES}
                            >
                                <i className="fa-solid fa-arrow-left text-[12px]"></i> Back to Reports
                            </button>
                            {!viewMode ? (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/report/edit?id=${report.id}&mode=view`)}
                                    className={SECONDARY_BTN_CLASSES}
                                    title="View read-only"
                                >
                                    <i className="fa-solid fa-eye text-[12px]"></i> View
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => navigate(`/report/edit?id=${report.id}`)}
                                    className={SECONDARY_BTN_CLASSES}
                                    title="Edit this report"
                                >
                                    <i className="fa-solid fa-pen text-[12px]"></i> Edit
                                </button>
                            )}
                        </>
                    }
                />

                {/* Report header */}
                <div className="mb-5 rounded-[18px] border border-white/6 bg-white/[.03] p-[20px]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h3 className="text-[18px] font-bold text-white">{report.title}</h3>
                            <div className="mt-[8px] flex flex-wrap items-center gap-[8px] text-[12px] text-[#999]">
                                <span className="rounded-full border border-white/10 bg-white/[.04] px-[10px] py-[4px]">
                                    {report.type}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[.04] px-[10px] py-[4px]">
                                    <i className="fa-solid fa-map-location-dot mr-[5px] text-accent"></i>
                                    {report.area ?? '—'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[.04] px-[10px] py-[4px]">
                                    <i className="fa-solid fa-city mr-[5px] text-accent"></i>
                                    {report.city ?? '—'}
                                    {report.coverage ? ` · ${report.coverage}` : ''}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[.04] px-[10px] py-[4px]">
                                    <i className="fa-solid fa-calendar mr-[5px] text-accent"></i>
                                    {period}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/[.04] px-[10px] py-[4px]">
                                    <i className="fa-solid fa-user mr-[5px] text-accent"></i>
                                    {report.preparedBy ?? '—'}
                                </span>
                                <span className="rounded-full border border-mint/30 bg-mint/10 px-[10px] py-[4px] text-mint">
                                    <i className="fa-solid fa-circle-check mr-[5px]"></i>
                                    {report.status === 'ready' ? 'Ready' : 'Processing'}
                                </span>
                                {!isRemote ? (
                                    <span className="rounded-full border border-[#ffb03a]/30 bg-[#ffb03a]/10 px-[10px] py-[4px] text-[#ffb03a]">
                                        <i className="fa-solid fa-cloud-arrow-up mr-[5px]"></i>
                                        Not yet on server
                                    </span>
                                ) : null}
                            </div>
                        </div>
                        <div className="flex items-center gap-[8px]">
                            {!viewMode ? (
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving}
                                    className={SECONDARY_BTN_CLASSES}
                                >
                                    <i className={`fa-solid ${saving ? 'fa-spinner fa-spin' : 'fa-floppy-disk'} text-[12px]`}></i>
                                    {saving ? 'Saving…' : isRemote ? 'Save' : 'Save to Database'}
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className={SECONDARY_BTN_CLASSES}
                            >
                                <i className="fa-solid fa-print text-[12px]"></i> Print / Export PDF
                            </button>
                            {!viewMode ? (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className={confirmingDelete ? DELETE_CONFIRM_CLASSES : DELETE_BTN_CLASSES}
                                >
                                    <i className={`fa-solid ${deleting ? 'fa-spinner fa-spin' : confirmingDelete ? 'fa-triangle-exclamation' : 'fa-trash-can'} text-[12px]`}></i>
                                    {deleting ? 'Deleting…' : confirmingDelete ? 'Confirm delete?' : 'Delete'}
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <div className="mt-[16px] grid grid-cols-2 gap-[10px] sm:grid-cols-3 lg:grid-cols-5">
                        <Stat label="Average Surface Temp" value={report.avgSurfaceTemp != null ? `${report.avgSurfaceTemp}°C` : '—'} icon="fa-temperature-high" />
                        <Stat label="Peak Surface Temp" value={report.peakTemp != null ? `${report.peakTemp}°C` : '—'} icon="fa-fire" />
                        <Stat label="Avg Canopy Coverage" value={report.avgCanopy != null ? `${report.avgCanopy}%` : '—'} icon="fa-tree" />
                        <Stat label="Critical / High Zones" value={report.criticalCount != null ? `${report.criticalCount} / ${report.highCount ?? '—'}` : '—'} icon="fa-triangle-exclamation" />
                        <Stat label="Active Mitigation" value={report.mitigationProjects != null ? `${report.mitigationProjects}` : '—'} icon="fa-seedling" />
                    </div>
                </div>

                {/* Sections */}
                <div className="flex flex-col gap-4">
                    {sections.map((meta) => {
                        const section = meta.title;

                        if (section === 'Executive Summary') {
                            return (
                                <SectionBlock key="summary" icon={meta.icon} title="Executive Summary">
                                    <p className="text-[13px] leading-relaxed text-[#ccc]">
                                        This {report.type.toLowerCase()} covers {report.area ?? '—'} for the period{' '}
                                        {period}, prepared by {report.preparedBy ?? '—'}. Average land surface
                                        temperature in {report.city ?? 'the city'} is{' '}
                                        <strong className="text-white">{report.avgSurfaceTemp ?? '—'}°C</strong>,
                                        peaking at <strong className="text-white">{report.peakTemp ?? '—'}°C</strong> in{' '}
                                        <strong className="text-white">{report.peakArea ?? '—'}</strong>. The city
                                        currently tracks {report.criticalCount ?? 0} critical, {report.highCount ?? 0} high,
                                        and {report.moderateCount ?? 0} moderate heat zones with{' '}
                                        <strong className="text-white">{report.avgCanopy ?? '—'}%</strong> average canopy
                                        coverage, supported by {report.mitigationProjects ?? 0} recorded mitigation
                                        projects.
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Heat Analysis') {
                            return (
                                <SectionBlock key="heat" icon={meta.icon} title="Heat Analysis">
                                    <p className="text-[13px] leading-relaxed text-[#ccc]">
                                        Surface temperature readings across {report.city ?? 'the city'} show an average
                                        of <strong className="text-white">{report.avgSurfaceTemp ?? '—'}°C</strong> with
                                        the highest reading at <strong className="text-white">{report.peakTemp ?? '—'}°C</strong> in{' '}
                                        <strong className="text-white">{report.peakArea ?? '—'}</strong>. See the Heat Map
                                        page for the full surface temperature layer.
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Hotspot Analysis') {
                            return (
                                <SectionBlock key="hotspots" icon={meta.icon} title="Hotspot Analysis">
                                    <p className="text-[13px] leading-relaxed text-[#ccc]">
                                        {report.criticalCount ?? 0} critical and {report.highCount ?? 0} high-severity
                                        hotspots were identified. Priority zones (auto-detected or selected during
                                        report setup):{' '}
                                        {report.autoPriorityAreas
                                            ? `${priorityCount} priority areas in ${report.city ?? 'the city'}`
                                            : (report.areas.length ? report.areas.join(', ') : '—')}
                                        . See the Hotspots page for per-barangay severity and drivers.
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Canopy Analysis') {
                            return (
                                <SectionBlock key="canopy" icon={meta.icon} title="Canopy Analysis">
                                    <p className="text-[13px] leading-relaxed text-[#ccc]">
                                        Average canopy coverage in {report.city ?? 'the city'} is{' '}
                                        <strong className="text-white">{report.avgCanopy ?? '—'}%</strong>. The Canopy
                                        Assessment page provides per-barangay coverage and change-over-time
                                        projections.
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Mitigation Recommendations') {
                            return (
                                <SectionBlock key="mitigation" icon={meta.icon} title="Mitigation Recommendations">
                                    <textarea
                                        rows={5}
                                        value={recommendations}
                                        readOnly={viewMode}
                                        onChange={(e) => setRecommendations(e.target.value)}
                                        className={`w-full resize-y rounded-[14px] border border-white/10 bg-white/[.04] p-[13px_16px] text-[13px] leading-relaxed text-white outline-none transition duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)] ${viewMode ? 'cursor-default opacity-90' : ''}`}
                                    />
                                </SectionBlock>
                            );
                        }

                        if (section === 'Maps') {
                            return (
                                <SectionBlock key="maps" icon={meta.icon} title="Maps">
                                    <p className="text-[13px] text-[#777]">
                                        Attach map exports from the Heat Map page (surface temperature layer) and
                                        Canopy Assessment page (coverage layer) for this section.
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Charts') {
                            return (
                                <SectionBlock key="charts" icon={meta.icon} title="Charts">
                                    <p className="text-[13px] text-[#777]">
                                        Charts will be embedded here from the Dashboard (trends, severity
                                        distribution) and Hotspots page (drivers breakdown).
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Methodology') {
                            return (
                                <SectionBlock key="methodology" icon={meta.icon} title="Methodology">
                                    <p className="text-[13px] leading-relaxed text-[#ccc]">
                                        Data is collected from satellite land surface temperature (LST) layers and
                                        aerial canopy assessments, processed through INIT.AI classification
                                        pipelines. Hotspots are ranked by temperature and canopy severity into
                                        critical, high, moderate, and low categories.
                                    </p>
                                </SectionBlock>
                            );
                        }

                        if (section === 'Data Sources') {
                            return (
                                <SectionBlock key="sources" icon={meta.icon} title="Data Sources">
                                    <ul className="list-disc pl-[18px] text-[13px] leading-relaxed text-[#ccc]">
                                        <li>Landsat / satellite LST scenes for {report.city ?? 'the city'}</li>
                                        <li>INIT.AI hotspot registry ({(report.criticalCount ?? 0) + (report.highCount ?? 0)} critical/high)</li>
                                        <li>Canopy assessment survey ({report.avgCanopy ?? '—'}% avg coverage)</li>
                                        <li>LGU mitigation project records ({report.mitigationProjects ?? 0} projects)</li>
                                    </ul>
                                </SectionBlock>
                            );
                        }

                        return null;
                    })}

                    {sections.length === 0 ? (
                        <p className="text-[13px] text-[#888]">
                            No sections selected for this report.
                        </p>
                    ) : null}
                </div>
            </Card>
            <Toast message={toast} />
        </Page>
    );
}

function SectionBlock({
    icon,
    title,
    children,
}: {
    icon: string;
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[16px] border border-white/6 bg-white/[.03] p-[18px]">
            <h4 className="mb-[10px] flex items-center gap-[9px] text-[13.5px] font-semibold">
                <i className={`fa-solid ${icon} text-[12px] text-accent`}></i>
                {title}
            </h4>
            {children}
        </section>
    );
}