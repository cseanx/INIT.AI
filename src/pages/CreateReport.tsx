import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Page from '../components/layout/Page';
import Card from '../components/common/Card';
import PanelHead from '../components/common/PanelHead';
import Toast, { type ToastMessage } from '../components/common/Toast';
import MenuSelect from '../components/settings/MenuSelect';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';
import type { ReportCoverage, ReportDatasetKey, ReportDraft, ReportSectionKey, ReportType } from '../types';
import {
    COVERAGE_OPTIONS,
    DATASET_OPTIONS,
    REPORT_CITIES,
    REPORT_TYPES,
    SECTION_OPTIONS,
    buildLocalReport,
    buildReportPayload,
    discardDraft,
    generateRecommendations,
    loadDrafts,
    newDraft,
    saveDraft,
    storeLocalReport,
} from '../reports/reportService';

const FIELD_CLASSES =
    'rounded-[14px] border border-white/10 bg-white/[.04] p-[13px_16px] text-sm text-white outline-none transition duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)]';
const FIELD_ERROR_CLASSES =
    'rounded-[14px] border border-[rgba(255,45,85,.65)] bg-white/[.04] p-[13px_16px] text-sm text-white outline-none';
const LABEL_CLASSES = 'text-[13px] text-[#999]';
const CHIP_CLASSES =
    'cursor-pointer rounded-full border border-white/10 bg-white/[.04] px-3.5 py-[7px] text-[12.5px] text-[#aaa] transition duration-200 hover:bg-white/8 hover:text-white';
const PRIMARY_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[12px_22px] text-[13.5px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border border-white/[.14] bg-white/5 p-[12px_22px] text-[13.5px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/9';

interface FieldProps {
    label: string;
    required?: boolean;
    error?: boolean;
    errorText?: string;
    children: ReactNode;
}

function Field({ label, required, error, errorText, children }: FieldProps) {
    return (
        <div className="flex flex-col gap-2">
            <label className={LABEL_CLASSES}>
                {label}
                {required ? <span className="ml-[3px] text-accent">*</span> : null}
            </label>
            {children}
            {error ? <span className="text-[11.5px] text-[#ff5577]">{errorText}</span> : null}
        </div>
    );
}

function Chip({
    active,
    onClick,
    icon,
    children,
}: {
    active: boolean;
    onClick: () => void;
    icon?: string;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`${CHIP_CLASSES} ${active ? 'chip-btn active' : ''}`}
        >
            {icon ? <i className={`fa-solid ${icon} mr-[7px] text-[11px]`}></i> : null}
            {children}
            {active ? <i className="fa-solid fa-check ml-[7px] text-[10px]"></i> : null}
        </button>
    );
}

function SectionCard({
    icon,
    title,
    step,
    action,
    children,
}: {
    icon: string;
    title: string;
    step: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section className="rounded-[16px] border border-white/6 bg-white/[.03] p-[18px]">
            <div className="mb-[14px] flex flex-wrap items-center justify-between gap-3">
                <h4 className="flex items-center gap-[9px] text-[13.5px] font-semibold">
                    <span className="flex h-[24px] w-[24px] items-center justify-center rounded-[8px] bg-[rgba(var(--accent-glow),.15)] text-[11px] text-accent">
                        {step}
                    </span>
                    <i className={`fa-solid ${icon} text-[12px] text-accent`}></i>
                    {title}
                </h4>
                {action}
            </div>
            {children}
        </section>
    );
}

export default function CreateReport() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const hotspots = useApiData(api.getHotspots);
    const [draft, setDraft] = useState<ReportDraft>(() =>
        newDraft({ preparedBy: user?.name ?? '' }),
    );
    const [errors, setErrors] = useState<string[]>([]);
    const [errorFields, setErrorFields] = useState<Set<string>>(new Set());
    const [generating, setGenerating] = useState(false);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const savedDrafts = useMemo(() => loadDrafts(), []);
    const [latestDraft] = savedDrafts.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const [showRestore, setShowRestore] = useState(!!latestDraft);

    useEffect(() => {
        if (!toast) return;
        const t = window.setTimeout(() => setToast(null), 3200);
        return () => window.clearTimeout(t);
    }, [toast]);

    const barangayNames = useMemo(() => (hotspots ?? []).map((b) => b.name), [hotspots]);
    const priorityAreas = useMemo(
        () => (hotspots ?? []).filter((b) => b.priority).map((b) => b.name),
        [hotspots],
    );

    const invalid = (field: string) => errorFields.has(field);

    function toggleIn(list: string[], value: string, set: (next: string[]) => void) {
        set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
    }

    function validate(d: ReportDraft): Set<string> {
        const fields = new Set<string>();
        if (!d.title.trim()) fields.add('title');
        if (!d.city) fields.add('city');
        if (!d.coverage) fields.add('coverage');
        if (!d.periodStart || !d.periodEnd) fields.add('period');
        if (!d.preparedBy.trim()) fields.add('preparedBy');
        if (d.datasets.length === 0) fields.add('datasets');
        if (d.areas.length === 0 && !d.autoPriorityAreas) fields.add('areas');
        return fields;
    }

    const errorMessages: Record<string, string> = {
        title: 'Report title is required.',
        city: 'Select a city.',
        coverage: 'Select a coverage area.',
        period: 'Select a reporting period.',
        preparedBy: 'Prepared by is required.',
        datasets: 'Select at least one dataset.',
        areas: 'Select at least one area, or enable Priority Areas.',
    };

    async function handleGenerate() {
        const fields = validate(draft);
        setErrorFields(fields);
        setErrors(fields.size ? [...fields].map((f) => errorMessages[f]) : []);
        if (fields.size) return;

        setGenerating(true);
        const payload = buildReportPayload(draft);
        try {
            const created = await api.reports.create(payload);
            setGenerating(false);
            navigate(`/report/edit?id=${created.id}`);
        } catch {
            const local = buildLocalReport(payload);
            storeLocalReport(local);
            setGenerating(false);
            setToast({
                id: Date.now(),
                text: 'Server unreachable — report saved locally.',
                tone: 'error',
            });
            navigate('/report/edit');
        }
    }

    function handleSaveDraft() {
        try {
            saveDraft(draft);
            setToast({ id: Date.now(), text: 'Draft saved successfully.', tone: 'success' });
        } catch {
            setToast({ id: Date.now(), text: 'Could not save the draft.', tone: 'error' });
        }
    }

    function handleGenerateRecommendations() {
        setDraft((d) => ({ ...d, recommendations: generateRecommendations(d) }));
    }

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Create Report"
                    actions={
                        <button
                            type="button"
                            onClick={() => navigate('/reports')}
                            className={SECONDARY_BTN_CLASSES}
                        >
                            <i className="fa-solid fa-arrow-left text-[12px]"></i> Back to Reports
                        </button>
                    }
                />

                {errors.length ? (
                    <div
                        role="alert"
                        className="mb-5 flex items-start gap-[10px] rounded-[14px] border border-[rgba(255,45,85,.35)] bg-[rgba(255,45,85,.08)] p-[13px_16px] text-[12.5px] text-[#ff7a94]"
                    >
                        <i className="fa-solid fa-circle-exclamation mt-[2px]"></i>
                        <div>
                            <strong className="block">Please fix the following:</strong>
                            <ul className="mt-[4px] list-disc pl-[18px]">
                                {errors.map((e) => (
                                    <li key={e}>{e}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ) : null}

                {showRestore && latestDraft ? (
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-white/8 bg-white/[.03] p-[13px_16px]">
                        <span className="flex items-center gap-[10px] text-[12.5px] text-[#bbb]">
                            <i className="fa-solid fa-clock-rotate-left text-accent"></i>
                            Saved draft from{' '}
                            {new Date(latestDraft.updatedAt).toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                            })}
                            {latestDraft.title ? ` — "${latestDraft.title}"` : ''}
                        </span>
                        <span className="flex items-center gap-[8px]">
                            <button
                                type="button"
                                onClick={() => {
                                    setDraft(latestDraft);
                                    setShowRestore(false);
                                }}
                                className={SECONDARY_BTN_CLASSES}
                            >
                                Load Draft
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    discardDraft(latestDraft.id);
                                    setShowRestore(false);
                                }}
                                className="cursor-pointer rounded-[14px] border border-white/[.14] bg-white/5 px-[18px] py-[12px] text-[12.5px] font-semibold text-[#888] transition duration-300 hover:text-[#ff5577]"
                            >
                                Discard
                            </button>
                        </span>
                    </div>
                ) : null}

                <div className="flex flex-col gap-4">
                    {/* 1 — Report information */}
                    <SectionCard step="1" icon="fa-circle-info" title="Report Information">
                        <div className="grid grid-cols-2 gap-4 max-[1100px]:grid-cols-1">
                            <div className="col-span-2">
                                <Field label="Report title" required error={invalid('title')} errorText={errorMessages.title}>
                                    <input
                                        type="text"
                                        value={draft.title}
                                        onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                                        placeholder="e.g. Q3 Urban Heat Island Assessment"
                                        className={invalid('title') ? FIELD_ERROR_CLASSES : FIELD_CLASSES}
                                    />
                                </Field>
                            </div>
                            <Field label="Report type" required>
                                <MenuSelect
                                    value={draft.type}
                                    onChange={(value) => setDraft({ ...draft, type: value as ReportType })}
                                    options={REPORT_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                                />
                            </Field>
                            <Field label="Selected city" required error={invalid('city')} errorText={errorMessages.city}>
                                <MenuSelect
                                    value={draft.city}
                                    onChange={(value) => setDraft({ ...draft, city: value })}
                                    options={REPORT_CITIES.map((c) => ({ value: c, label: c }))}
                                />
                            </Field>
                            <Field label="Coverage area" required error={invalid('coverage')} errorText={errorMessages.coverage}>
                                <MenuSelect
                                    value={draft.coverage}
                                    onChange={(value) => setDraft({ ...draft, coverage: value as ReportCoverage })}
                                    options={COVERAGE_OPTIONS.map((c) => ({ value: c, label: c }))}
                                />
                            </Field>
                            <Field label="Reporting period" required error={invalid('period')} errorText={errorMessages.period}>
                                <div className="flex items-center gap-[10px]">
                                    <input
                                        type="date"
                                        value={draft.periodStart}
                                        onChange={(e) => setDraft({ ...draft, periodStart: e.target.value })}
                                        className={invalid('period') ? FIELD_ERROR_CLASSES : FIELD_CLASSES}
                                    />
                                    <span className="text-[#666]">to</span>
                                    <input
                                        type="date"
                                        value={draft.periodEnd}
                                        onChange={(e) => setDraft({ ...draft, periodEnd: e.target.value })}
                                        className={invalid('period') ? FIELD_ERROR_CLASSES : FIELD_CLASSES}
                                    />
                                </div>
                            </Field>
                            <Field label="Prepared by" required error={invalid('preparedBy')} errorText={errorMessages.preparedBy}>
                                <input
                                    type="text"
                                    value={draft.preparedBy}
                                    onChange={(e) => setDraft({ ...draft, preparedBy: e.target.value })}
                                    placeholder="LGU Office / Officer name"
                                    className={invalid('preparedBy') ? FIELD_ERROR_CLASSES : FIELD_CLASSES}
                                />
                            </Field>
                        </div>
                    </SectionCard>

                    {/* 2 — Data & analysis */}
                    <SectionCard step="2" icon="fa-database" title="Data & Analysis">
                        <div className="flex flex-wrap gap-[8px]">
                            {DATASET_OPTIONS.map((option) => (
                                <Chip
                                    key={option.key}
                                    icon={option.icon}
                                    active={draft.datasets.includes(option.key)}
                                    onClick={() =>
                                        toggleIn(draft.datasets, option.key, (next) =>
                                            setDraft({ ...draft, datasets: next as ReportDatasetKey[] }),
                                        )
                                    }
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </div>
                        {invalid('datasets') ? (
                            <p className="mt-[10px] text-[11.5px] text-[#ff5577]">{errorMessages.datasets}</p>
                        ) : null}
                    </SectionCard>

                    {/* 3 — Areas of interest */}
                    <SectionCard
                        step="3"
                        icon="fa-location-crosshairs"
                        title="Areas of Interest"
                        action={
                            <button
                                type="button"
                                onClick={() => setDraft({ ...draft, autoPriorityAreas: !draft.autoPriorityAreas, areas: draft.autoPriorityAreas ? draft.areas : [] })}
                                className={`${CHIP_CLASSES} ${draft.autoPriorityAreas ? 'chip-btn active' : ''}`}
                            >
                                <i className="fa-solid fa-triangle-exclamation mr-[7px] text-[11px]"></i>
                                Auto-select priority areas
                            </button>
                        }
                    >
                        {draft.autoPriorityAreas ? (
                            <p className="mb-[12px] text-[12px] text-[#bbb]">
                                <i className="fa-solid fa-circle-check mr-[6px] text-mint"></i>
                                Including {priorityAreas.length} priority / highest-risk areas:{' '}
                                {priorityAreas.join(', ') || '—'}.
                            </p>
                        ) : null}
                        <div className="flex flex-wrap gap-[8px]">
                            {(barangayNames.length ? barangayNames : []).map((name) => (
                                <Chip
                                    key={name}
                                    active={draft.areas.includes(name)}
                                    onClick={() => toggleIn(draft.areas, name, (next) => setDraft({ ...draft, areas: next }))}
                                >
                                    {name}
                                </Chip>
                            ))}
                        </div>
                        {draft.areas.length === 0 && !draft.autoPriorityAreas ? (
                            <div className="mt-[12px] flex items-center gap-[10px] rounded-[12px] border border-dashed border-white/10 p-[12px] text-[12px] text-[#777]">
                                <i className="fa-solid fa-map-location-dot text-[#555]"></i>
                                No areas selected yet — pick barangays above or enable Priority Areas.
                            </div>
                        ) : null}
                        {invalid('areas') ? (
                            <p className="mt-[10px] text-[11.5px] text-[#ff5577]">{errorMessages.areas}</p>
                        ) : null}
                    </SectionCard>

                    {/* 4 — Report sections */}
                    <SectionCard step="4" icon="fa-file-lines" title="Report Sections">
                        <div className="flex flex-wrap gap-[8px]">
                            {SECTION_OPTIONS.map((option) => (
                                <Chip
                                    key={option.key}
                                    icon={option.icon}
                                    active={draft.sections.includes(option.key)}
                                    onClick={() =>
                                        toggleIn(draft.sections, option.key, (next) =>
                                            setDraft({ ...draft, sections: next as ReportSectionKey[] }),
                                        )
                                    }
                                >
                                    {option.label}
                                </Chip>
                            ))}
                        </div>
                    </SectionCard>

                    {/* 5 — Recommendations */}
                    <SectionCard
                        step="5"
                        icon="fa-lightbulb"
                        title="Recommendations"
                        action={
                            <button
                                type="button"
                                onClick={handleGenerateRecommendations}
                                className={`${CHIP_CLASSES} border-accent/40 text-white`}
                            >
                                <i className="fa-solid fa-wand-magic-sparkles mr-[7px] text-[11px] text-accent"></i>
                                Generate Recommendations
                            </button>
                        }
                    >
                        <textarea
                            rows={5}
                            value={draft.recommendations}
                            onChange={(e) => setDraft({ ...draft, recommendations: e.target.value })}
                            placeholder="Write recommendations for the report, or use Generate Recommendations to draft them from current INIT.AI datasets."
                            className={`${FIELD_CLASSES} w-full resize-y leading-relaxed`}
                        />
                        {!draft.recommendations.trim() ? (
                            <p className="mt-[8px] text-[11.5px] text-[#777]">
                                No recommendations yet — draft some above or generate them from the dataset
                                (rule-based local logic, not AI-generated).
                            </p>
                        ) : null}
                    </SectionCard>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center justify-end gap-[10px] border-t border-white/6 pt-[18px]">
                        <button type="button" onClick={() => navigate('/reports')} className={SECONDARY_BTN_CLASSES}>
                            Cancel
                        </button>
                        <button type="button" onClick={handleSaveDraft} className={SECONDARY_BTN_CLASSES}>
                            <i className="fa-solid fa-floppy-disk text-[12px]"></i> Save Draft
                        </button>
                        <button type="button" onClick={handleGenerate} disabled={generating} className={PRIMARY_BTN_CLASSES}>
                            {generating ? (
                                <i className="fa-solid fa-spinner fa-spin text-[13px]"></i>
                            ) : (
                                <i className="fa-solid fa-file-circle-plus text-[13px]"></i>
                            )}
                            {generating ? 'Generating…' : 'Generate Report'}
                        </button>
                    </div>
                </div>
            </Card>
            <Toast message={toast} />
        </Page>
    );
}