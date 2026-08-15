/* ==========================
   INIT.AI — Shared domain types
========================== */

export type Severity = 'critical' | 'high' | 'moderate';
export type TrendTone = 'up' | 'down' | 'neutral';
export type IconTone = 'red' | 'orange' | 'green' | 'blue';

export interface Account {
    name: string;
    role: string;
    initials: string;
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

export interface Report {
    title: string;
    type: string;
    area: string;
    date: string;
    status: ReportStatus;
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
