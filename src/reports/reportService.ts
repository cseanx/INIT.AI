/* ==========================
   REPORT SERVICE — local data abstraction.
   Stores drafts in localStorage and derives report content from existing
   INIT.AI datasets (mockData). The backend persists generated reports
   (POST/PUT /api/reports); localStorage `initai_reports_store` only holds
   reports created while the API was unreachable, and they are re-pushed
   the next time they are saved from the editor.
   Recommendation text is rule-based from local datasets, never claimed
   to be AI-generated.
========================== */

import type {
    Report,
    ReportDatasetKey,
    ReportDraft,
    ReportPayload,
    ReportSectionKey,
    ReportSummaryData,
    ReportType,
} from '../types';
import { barangays, mitigationProjects, priorityHotspots } from '../data/mockData';

const DRAFTS_KEY = 'initai_report_drafts';
const GENERATED_KEY = 'initai_reports_store';

/* ---------- option lists (labels shared by every report UI) ---------- */

export const REPORT_TYPES: { value: ReportType; label: string; icon: string }[] = [
    { value: 'Heat Assessment', label: 'Heat Assessment', icon: 'fa-temperature-high' },
    { value: 'Hotspot Report', label: 'Hotspot Report', icon: 'fa-location-dot' },
    { value: 'Canopy Assessment', label: 'Canopy Assessment', icon: 'fa-tree' },
    { value: 'Mitigation Report', label: 'Mitigation Report', icon: 'fa-seedling' },
    { value: 'Monthly Summary', label: 'Monthly Summary', icon: 'fa-calendar-day' },
    { value: 'Quarterly Summary', label: 'Quarterly Summary', icon: 'fa-calendar-week' },
    { value: 'Custom', label: 'Custom', icon: 'fa-pen-ruler' },
];

export const REPORT_CITIES = ['Quezon City', 'Manila', 'Pasig', 'Caloocan'] as const;

export const COVERAGE_OPTIONS = ['Entire city', 'District', 'Barangay'] as const;

export const DATASET_OPTIONS: { key: ReportDatasetKey; label: string; icon: string }[] = [
    { key: 'lst', label: 'Land Surface Temperature', icon: 'fa-temperature-high' },
    { key: 'hotspots', label: 'Heat Hotspots', icon: 'fa-fire-flame-curved' },
    { key: 'canopy', label: 'Canopy Coverage', icon: 'fa-tree' },
    { key: 'landcover', label: 'Land Cover', icon: 'fa-map' },
    { key: 'trends', label: 'Historical Trends', icon: 'fa-chart-line' },
    { key: 'mitigation', label: 'Mitigation Analysis', icon: 'fa-seedling' },
];

export const SECTION_OPTIONS: { key: ReportSectionKey; label: string; icon: string }[] = [
    { key: 'summary', label: 'Executive Summary', icon: 'fa-file-lines' },
    { key: 'heat', label: 'Heat Analysis', icon: 'fa-temperature-high' },
    { key: 'hotspots', label: 'Hotspot Analysis', icon: 'fa-location-dot' },
    { key: 'canopy', label: 'Canopy Analysis', icon: 'fa-tree' },
    { key: 'mitigation', label: 'Mitigation Recommendations', icon: 'fa-seedling' },
    { key: 'maps', label: 'Maps', icon: 'fa-map-location-dot' },
    { key: 'charts', label: 'Charts', icon: 'fa-chart-column' },
    { key: 'methodology', label: 'Methodology', icon: 'fa-flask' },
    { key: 'sources', label: 'Data Sources', icon: 'fa-database' },
];

const ALL_SECTIONS: ReportSectionKey[] = SECTION_OPTIONS.map((o) => o.key);

/* ---------- draft defaults ---------- */

export function newDraft(partial: Partial<ReportDraft> = {}): ReportDraft {
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        title: '',
        type: 'Heat Assessment',
        city: 'Quezon City',
        coverage: 'Entire city',
        periodStart: '',
        periodEnd: '',
        preparedBy: '',
        datasets: ['lst', 'hotspots'],
        areas: [],
        autoPriorityAreas: false,
        sections: [...ALL_SECTIONS],
        recommendations: '',
        createdAt: now,
        updatedAt: now,
        ...partial,
    };
}

/* ---------- persistence ---------- */

function read<T>(key: string): T[] {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
        return [];
    }
}

function write<T>(key: string, value: T[]) {
    localStorage.setItem(key, JSON.stringify(value));
}

export function loadDrafts(): ReportDraft[] {
    return read<ReportDraft>(DRAFTS_KEY);
}

export function saveDraft(draft: ReportDraft): void {
    const drafts = loadDrafts().filter((d) => d.id !== draft.id);
    drafts.push({ ...draft, updatedAt: new Date().toISOString() });
    write(DRAFTS_KEY, drafts);
}

export function discardDraft(id: string): void {
    write(DRAFTS_KEY, loadDrafts().filter((d) => d.id !== id));
}

/** Coerce any stored report into the current Report shape. Reports written
 *  by older builds (before backend persistence) stored their data under a
 *  `draft`/`summary` sub-object and had no top-level datasets/sections/areas
 *  — without this migration the reports table would crash on `.datasets`. */
function normalizeStored(raw: unknown): Report {
    const r = (raw ?? {}) as Record<string, unknown>;
    const d = (r.draft ?? {}) as Record<string, unknown>;
    const s = (r.summary ?? {}) as Record<string, unknown>;
    return {
        id: (r.id as Report['id']) ?? crypto.randomUUID(),
        title: (r.title as string) ?? (d.title as string) ?? 'Untitled report',
        type: (r.type as string) ?? (d.type as string) ?? 'Report',
        status: (r.status as Report['status']) ?? 'ready',
        date: (r.date as string) ?? '',
        area: (r.area as string | null) ?? null,
        city: (d.city as string | null) ?? null,
        coverage: (d.coverage as string | null) ?? null,
        periodStart: (d.periodStart as string | null) ?? null,
        periodEnd: (d.periodEnd as string | null) ?? null,
        preparedBy: (d.preparedBy as string | null) ?? null,
        autoPriorityAreas: (d.autoPriorityAreas as boolean | undefined) ?? false,
        datasets: Array.isArray(d.datasets) ? (d.datasets as Report['datasets']) : [],
        sections: Array.isArray(d.sections) ? (d.sections as Report['sections']) : [],
        areas: Array.isArray(d.areas) ? (d.areas as string[]) : [],
        recommendations: (d.recommendations as string) ?? (r.recommendations as string) ?? '',
        avgSurfaceTemp: (s.avgSurfaceTemp as number | null) ?? (r.avgSurfaceTemp as number | null) ?? null,
        peakTemp: (s.peakTemp as number | null) ?? (r.peakTemp as number | null) ?? null,
        peakArea: (s.peakArea as string | null) ?? (r.peakArea as string | null) ?? null,
        criticalCount: (s.criticalCount as number | null) ?? (r.criticalCount as number | null) ?? null,
        highCount: (s.highCount as number | null) ?? (r.highCount as number | null) ?? null,
        moderateCount: (s.moderateCount as number | null) ?? (r.moderateCount as number | null) ?? null,
        avgCanopy: (s.avgCanopy as number | null) ?? (r.avgCanopy as number | null) ?? null,
        mitigationProjects: (s.mitigationProjects as number | null) ?? (r.mitigationProjects as number | null) ?? null,
        generatedAt: (r.generatedAt as string | null) ?? null,
    };
}

export function loadStoredReports(): Report[] {
    return read<unknown>(GENERATED_KEY).map(normalizeStored);
}

export function storeLocalReport(report: Report): void {
    write(GENERATED_KEY, [report, ...read<unknown>(GENERATED_KEY)]);
}

export function discardLocalReport(id: number | string): void {
    write(GENERATED_KEY, read<unknown>(GENERATED_KEY).filter((r) => (r as Report).id !== id));
}

/** Newest locally stored report — shown by the editor when no ?id is given. */
export function loadCurrentReport(): Report | null {
    return loadStoredReports()[0] ?? null;
}

/* ---------- dataset-derived summary (no invented measurements) ---------- */

function mean(values: number[]): number {
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

export function buildSummary(): ReportSummaryData {
    const temps = barangays.map((b) => b.temp);
    const peak = [...barangays].sort((a, b) => b.temp - a.temp)[0];
    return {
        avgSurfaceTemp: Number(mean(temps).toFixed(1)),
        peakTemp: peak?.temp ?? 0,
        peakArea: peak?.name ?? '',
        criticalCount: barangays.filter((b) => b.severity === 'critical').length,
        highCount: barangays.filter((b) => b.severity === 'high').length,
        moderateCount: barangays.filter((b) => b.severity === 'moderate').length,
        avgCanopy: Number(mean(barangays.map((b) => b.canopy)).toFixed(1)),
        mitigationProjects: mitigationProjects.length,
    };
}

/* ---------- rule-based recommendations (local logic, not AI) ---------- */

export function generateRecommendations(draft: ReportDraft): string {
    const lines: string[] = [];
    const avgCanopy = mean(barangays.map((b) => b.canopy));
    const top = [...priorityHotspots].sort((a, b) => b.temp - a.temp).slice(0, 3);
    lines.push(
        `Prioritize urban tree planting in ${top.map((b) => b.name).join(', ')} — the hottest priority zones in ${draft.city} (peak ${top[0]?.temp.toFixed(1)}°C).`,
    );

    if (avgCanopy < 25 || draft.datasets.includes('canopy')) {
        const lowest = [...barangays].sort((a, b) => a.canopy - b.canopy)[0];
        lines.push(
            `Address canopy deficits in ${lowest?.name} (${lowest?.canopy}% cover) and other low-cover barangays; every +10% canopy projects to a meaningful local surface-temperature drop.`,
        );
    }

    const inProgress = mitigationProjects.filter((p) => p.status === 'In Progress');
    if (inProgress.length) {
        lines.push(
            `Continue active mitigation: ${inProgress.map((p) => p.title).join(', ')} (projected ${inProgress[0]?.impact}).`,
        );
    }

    lines.push(
        `Re-run the assessment next reporting period to measure canopy and temperature change against this baseline.`,
    );
    return lines.join('\n');
}

/* ---------- generation ---------- */

function formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/** Build the POST /api/reports payload from a builder draft. All numbers
 *  come from the current INIT.AI datasets via buildSummary(). */
export function buildReportPayload(draft: ReportDraft): ReportPayload {
    const summary = buildSummary();
    const area =
        draft.coverage === 'Entire city'
            ? `${draft.city} (All Areas)`
            : draft.autoPriorityAreas || draft.areas.length === 0
              ? `${draft.city} (Priority Areas)`
              : draft.areas.join(', ');
    return {
        title: draft.title.trim() || `${draft.type} — ${draft.city}`,
        type: draft.type,
        status: 'ready',
        area,
        city: draft.city,
        coverage: draft.coverage,
        periodStart: draft.periodStart,
        periodEnd: draft.periodEnd,
        preparedBy: draft.preparedBy,
        autoPriorityAreas: draft.autoPriorityAreas,
        datasets: [...draft.datasets],
        areas: draft.autoPriorityAreas ? [] : [...draft.areas],
        sections: [...draft.sections],
        recommendations: draft.recommendations,
        avgSurfaceTemp: summary.avgSurfaceTemp,
        peakTemp: summary.peakTemp,
        peakArea: summary.peakArea,
        criticalCount: summary.criticalCount,
        highCount: summary.highCount,
        moderateCount: summary.moderateCount,
        avgCanopy: summary.avgCanopy,
        mitigationProjects: summary.mitigationProjects,
        generatedAt: new Date().toISOString(),
    };
}

/** Local-only fallback when the API is unreachable: give the report a UUID
 *  and persist it so the user still reaches the editor. The next Save from
 *  the editor pushes it to the backend and removes the local copy. */
export function buildLocalReport(payload: ReportPayload): Report {
    return {
        ...payload,
        id: crypto.randomUUID(),
        date: formatDate(new Date()),
    };
}