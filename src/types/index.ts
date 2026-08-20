/* ==========================
   INIT.AI — Shared domain types
========================== */

export type Severity = 'critical' | 'high' | 'moderate';
export type TrendTone = 'up' | 'down' | 'neutral';
export type IconTone = 'red' | 'orange' | 'green' | 'blue';

export type ThemePreference = 'system' | 'dark' | 'light';
export type ResolvedTheme = 'dark' | 'light';

export interface UserPreferences {
    theme: ThemePreference;
    sidebar_collapsed: boolean;
}

export interface HealthResponse {
    status: string;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: string;
    created_at: string;
}

export interface Barangay {
    name: string;
    temp: number;
    canopy: number;
    severity: Severity;
    driver: string;
    trend: number;
    area: number;
    canopyChange: number;
    priority: boolean;
}

export interface HeatReading {
    barangay: string;
    temperature: number;
}

export interface HeatSnapshot {
    capturedAt: string;
    scale: [number, number];
    readings: HeatReading[];
}

export interface CanopyBarDatum {
    name: string;
    value: number;
}

export interface CanopyTrend {
    labels: string[];
    values: number[];
}

export interface LandCoverDatum {
    label: string;
    value: number;
    color: string;
}

export type ZonePriority = 'Critical' | 'High' | 'Medium' | 'Moderate';

export interface PriorityZone {
    name: string;
    cover: number;
    priority: ZonePriority;
    tags: string[];
}

export interface CanopySnapshot {
    barData: CanopyBarDatum[];
    trend: CanopyTrend;
    landCover: LandCoverDatum[];
    priorityZones: PriorityZone[];
}

export type ReportStatus = 'ready' | 'processing';

/** A report as stored by the backend (or, when offline, in localStorage).
 *  `date` is the formatted generated-on date; `area` is the display string
 *  produced by the report builder (legacy rows fall back to the barangay). */
export interface Report {
    id: number | string;
    title: string;
    type: string;
    status: ReportStatus;
    date: string;
    area: string | null;

    city: string | null;
    coverage: string | null;
    periodStart: string | null;
    periodEnd: string | null;
    preparedBy: string | null;
    autoPriorityAreas: boolean;
    datasets: ReportDatasetKey[];
    areas: string[];
    sections: ReportSectionKey[];
    recommendations: string;

    avgSurfaceTemp: number | null;
    peakTemp: number | null;
    peakArea: string | null;
    criticalCount: number | null;
    highCount: number | null;
    moderateCount: number | null;
    avgCanopy: number | null;
    mitigationProjects: number | null;

    generatedAt?: string | null;
}

/** Payload sent to POST /api/reports — everything except the server id/date. */
export type ReportPayload = Omit<Report, 'id' | 'date'>;

/* ---------- Report builder / drafts ---------- */

export type ReportType =
    | 'Heat Assessment'
    | 'Hotspot Report'
    | 'Canopy Assessment'
    | 'Mitigation Report'
    | 'Monthly Summary'
    | 'Quarterly Summary'
    | 'Custom';

export type ReportCoverage = 'Entire city' | 'District' | 'Barangay';

export type ReportDatasetKey =
    | 'lst'
    | 'hotspots'
    | 'canopy'
    | 'landcover'
    | 'trends'
    | 'mitigation';

export type ReportSectionKey =
    | 'summary'
    | 'heat'
    | 'hotspots'
    | 'canopy'
    | 'mitigation'
    | 'maps'
    | 'charts'
    | 'methodology'
    | 'sources';

export interface ReportDraft {
    id: string;
    title: string;
    type: ReportType;
    city: string;
    coverage: ReportCoverage;
    periodStart: string;
    periodEnd: string;
    preparedBy: string;
    datasets: ReportDatasetKey[];
    areas: string[];
    autoPriorityAreas: boolean;
    sections: ReportSectionKey[];
    recommendations: string;
    createdAt: string;
    updatedAt: string;
}

/** Computed numbers derived exclusively from existing INIT.AI datasets. */
export interface ReportSummaryData {
    avgSurfaceTemp: number;
    peakTemp: number;
    peakArea: string;
    criticalCount: number;
    highCount: number;
    moderateCount: number;
    avgCanopy: number;
    mitigationProjects: number;
}

export type MitigationStatus = 'Proposed' | 'In Progress' | 'Planned';

export interface MitigationProject {
    id: string;
    icon: string;
    status: MitigationStatus;
    title: string;
    description: string;
    impact: string;
    impactLabel: string;
    metric: string;
    metricSuffix?: string;
    metricLabel: string;
    progress: number;
}

export interface StatCardData {
    icon: string;
    tone: IconTone;
    value: string;
    valueSuffix?: string;
    label: string;
    trendIcon: string;
    trend: string;
    trendTone: TrendTone;
}
