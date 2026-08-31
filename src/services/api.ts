import type {
    AuthUser,
    Barangay,
    CanopySnapshot,
    HealthResponse,
    HeatSnapshot,
    MitigationProject,
    Report,
    ReportPayload,
    UserPreferences,
} from '../types';
import type {
    AttestationMessage,
    RecordAttestationBody,
    ReportAttestationRecord,
} from '../types/stellar';
import {
    barangays,
    canopySnapshot,
    heatSnapshot,
    mitigationProjects,
    reports,
} from '../data/mockData';
import { loadStoredReports } from '../reports/reportService';

/* ==========================
   API SERVICE LAYER
   The Python/FastAPI backend (see backend/) serves these endpoints:
     GET  /api/health
     POST /api/auth/login
     POST /api/auth/logout
     GET  /api/auth/me
     GET  /api/preferences
     PUT  /api/preferences
     GET  /api/heat
     GET  /api/canopy
     GET  /api/mitigation
     GET  /api/reports
   Base URL comes from VITE_API_URL (frontend .env). Authentication uses
   an HTTP-only session cookie — fetch calls must send credentials.

   Data endpoints gracefully fall back to prototype mock data when the
   backend is unreachable OR returns a shape the UI cannot render yet
   (the backend is still growing its aggregate endpoints).
========================== */

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

/* ---------- response shape guards ---------- */

function isBarangayArray(data: unknown): data is Barangay[] {
    return (
        Array.isArray(data) &&
        data.every(
            (b) =>
                typeof b?.name === 'string' &&
                typeof b?.temp === 'number' &&
                typeof b?.canopy === 'number' &&
                typeof b?.severity === 'string',
        )
    );
}

/** Normalize a backend report row into the frontend Report shape. The API
 *  serializes camelCase (periodStart, preparedBy, …) but older deployments
 *  emitted snake_case (period_start, …) — accept both so the UI never shows
 *  blanks for periods/prepared-by/summary numbers. */
function fromBackendReport(raw: unknown): Report {
    const r = (raw ?? {}) as Record<string, unknown>;
    const pick = (camel: string, snake: string): unknown => r[camel] ?? r[snake];
    const asStr = (v: unknown): string | null => (v == null ? null : String(v));
    const asNum = (v: unknown): number | null => (v == null ? null : Number(v));
    return {
        id: (r.id as Report['id']) ?? crypto.randomUUID(),
        title: asStr(pick('title', 'title')) ?? 'Untitled report',
        type: asStr(pick('type', 'type')) ?? 'Report',
        status: ((pick('status', 'status') as Report['status']) ?? 'ready'),
        date: asStr(pick('date', 'date')) ?? '',
        area: asStr(pick('area', 'area')),
        city: asStr(pick('city', 'city')),
        coverage: asStr(pick('coverage', 'coverage')),
        periodStart: asStr(pick('periodStart', 'period_start')),
        periodEnd: asStr(pick('periodEnd', 'period_end')),
        preparedBy: asStr(pick('preparedBy', 'prepared_by')),
        autoPriorityAreas: (pick('autoPriorityAreas', 'auto_priority_areas') as boolean | undefined) ?? false,
        datasets: Array.isArray(pick('datasets', 'datasets')) ? (pick('datasets', 'datasets') as Report['datasets']) : [],
        sections: Array.isArray(pick('sections', 'sections')) ? (pick('sections', 'sections') as Report['sections']) : [],
        areas: Array.isArray(pick('areas', 'areas')) ? (pick('areas', 'areas') as string[]) : [],
        recommendations: asStr(pick('recommendations', 'recommendations')) ?? '',
        avgSurfaceTemp: asNum(pick('avgSurfaceTemp', 'avg_surface_temp')),
        peakTemp: asNum(pick('peakTemp', 'peak_temp')),
        peakArea: asStr(pick('peakArea', 'peak_area')),
        criticalCount: asNum(pick('criticalCount', 'critical_count')),
        highCount: asNum(pick('highCount', 'high_count')),
        moderateCount: asNum(pick('moderateCount', 'moderate_count')),
        avgCanopy: asNum(pick('avgCanopy', 'avg_canopy')),
        mitigationProjects: asNum(pick('mitigationProjects', 'mitigation_projects')),
        generatedAt: asStr(pick('generatedAt', 'generated_at')),
        // Attestation summary — absent on old deployments/local reports.
        attestationCount: asNum(pick('attestationCount', 'attestation_count')) ?? undefined,
        attestedCurrent:
            (pick('attestedCurrent', 'attested_current') as boolean | undefined) ?? undefined,
        attestedAt: asStr(pick('attestedAt', 'attested_at')),
    };
}

function isHeatSnapshot(data: unknown): data is HeatSnapshot {
    const snapshot = data as HeatSnapshot | null;
    return (
        !!snapshot &&
        Array.isArray(snapshot.readings) &&
        snapshot.readings.every(
            (r) => typeof r?.barangay === 'string' && typeof r?.temperature === 'number',
        )
    );
}

function isCanopySnapshot(data: unknown): data is CanopySnapshot {
    const snapshot = data as CanopySnapshot | null;
    return (
        !!snapshot &&
        Array.isArray(snapshot.barData) &&
        !!snapshot.trend &&
        Array.isArray(snapshot.trend.labels) &&
        Array.isArray(snapshot.landCover) &&
        Array.isArray(snapshot.priorityZones)
    );
}

function isMitigationProjectArray(data: unknown): data is MitigationProject[] {
    return (
        Array.isArray(data) &&
        data.every(
            (p) =>
                typeof p?.id === 'string' &&
                typeof p?.icon === 'string' &&
                typeof p?.impact === 'string' &&
                typeof p?.progress === 'number',
        )
    );
}

function isReportArray(data: unknown): data is Report[] {
    return (
        Array.isArray(data) &&
        data.every(
            (r) =>
                typeof r?.title === 'string' &&
                typeof r?.type === 'string' &&
                typeof r?.date === 'string' &&
                (r.id as unknown) != null &&
                (r.status === 'ready' || r.status === 'processing'),
        )
    );
}

/* ---------- fetch helpers ---------- */

export class ApiError extends Error {
    status: number;
    retryAfter?: number;

    constructor(message: string, status: number, retryAfter?: number) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.retryAfter = retryAfter;
    }
}

async function fromApi<T>(
    path: string,
    fallback: T,
    validate: (data: unknown) => data is T,
): Promise<T> {
    try {
        const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
        if (!res.ok) {
            return fallback;
        }
        const data: unknown = await res.json();
        return validate(data) ? data : fallback;
    } catch {
        return fallback;
    }
}

async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        ...init,
    });
    if (!res.ok) {
        let detail = `Request failed (${res.status})`;
        try {
            const body = (await res.json()) as { detail?: unknown };
            if (typeof body.detail === 'string') {
                detail = body.detail;
            } else if (Array.isArray(body.detail) && body.detail.length > 0) {
                const first = body.detail[0] as { msg?: string };
                if (first?.msg) detail = first.msg;
            }
        } catch {
            /* non-JSON error body */
        }
        const retryRaw = res.headers.get('Retry-After');
        throw new ApiError(detail, res.status, retryRaw ? Number(retryRaw) : undefined);
    }
    if (res.status === 204) {
        return undefined as T;
    }
    return (await res.json()) as T;
}

/* ---------- api surface ---------- */

export const api = {
    getHealth: (): Promise<HealthResponse> =>
        fromApi('/api/health', { status: 'ok' }, (d): d is HealthResponse =>
            typeof (d as HealthResponse | null)?.status === 'string',
        ),
    getHeat: (): Promise<HeatSnapshot> =>
        fromApi('/api/heat', heatSnapshot, isHeatSnapshot),
    getHotspots: (): Promise<Barangay[]> =>
        fromApi('/api/hotspots', barangays, isBarangayArray),
    getCanopy: (): Promise<CanopySnapshot> =>
        fromApi('/api/canopy', canopySnapshot, isCanopySnapshot),
    getMitigation: (): Promise<MitigationProject[]> =>
        fromApi('/api/mitigation', mitigationProjects, isMitigationProjectArray),
getReports: async (): Promise<Report[]> => {
        const remote = await fromApi('/api/reports', reports, isReportArray);
        const local = loadStoredReports();
        return local.length
            ? [...local, ...remote.map(fromBackendReport)]
            : remote.map(fromBackendReport);
    },
    getReport: async (id: number | string): Promise<Report> =>
        fromBackendReport(await authFetch<unknown>(`/api/reports/${id}`)),

    reports: {
        create: async (payload: ReportPayload): Promise<Report> =>
            fromBackendReport(
                await authFetch<unknown>('/api/reports', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                }),
            ),
        update: async (id: number, patch: Partial<ReportPayload>): Promise<Report> =>
            fromBackendReport(
                await authFetch<unknown>(`/api/reports/${id}`, {
                    method: 'PUT',
                    body: JSON.stringify(patch),
                }),
            ),
        remove: (id: number): Promise<void> =>
            authFetch<void>(`/api/reports/${id}`, { method: 'DELETE' }),

        /** Server-authoritative hash + canonical payload for attestation. */
        attestationMessage: (id: number | string): Promise<AttestationMessage> =>
            authFetch<AttestationMessage>(`/api/reports/${id}/attestation-message`),

        /** Persisted proof history (public). */
        listAttestations: (id: number | string): Promise<ReportAttestationRecord[]> =>
            authFetch<unknown>(`/api/reports/${id}/attestation`).then((data) =>
                Array.isArray(data) &&
                data.every((r) => typeof r?.stellarHash === 'string' && typeof r?.txHash === 'string')
                    ? (data as ReportAttestationRecord[])
                    : [],
            ),

        /** Store a confirmed on-chain attestation (auth required; 409 on stale hash). */
        recordAttestation: async (
            id: number | string,
            body: RecordAttestationBody,
        ): Promise<ReportAttestationRecord> =>
            authFetch<ReportAttestationRecord>(`/api/reports/${id}/attestation`, {
                method: 'POST',
                body: JSON.stringify(body),
            }),
    },

    auth: {
        login: (email: string, password: string): Promise<AuthUser> =>
            authFetch('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password }),
            }),
        logout: (): Promise<void> =>
            authFetch<void>('/api/auth/logout', { method: 'POST' }),
        me: (): Promise<AuthUser | null> =>
            authFetch<AuthUser | null>('/api/auth/me').catch(() => null),
        register: (payload: {
            name: string;
            email: string;
            password: string;
            confirm_password: string;
            organization: string;
            role?: string;
        }): Promise<AuthUser> =>
            authFetch('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
        verifyEmail: (token: string): Promise<{ message: string }> =>
            authFetch('/api/auth/verify-email', {
                method: 'POST',
                body: JSON.stringify({ token }),
            }),
        resendVerification: (email: string): Promise<{ message: string }> =>
            authFetch('/api/auth/resend-verification', {
                method: 'POST',
                body: JSON.stringify({ email }),
            }),
        forgotPassword: (email: string): Promise<{ message: string }> =>
            authFetch('/api/auth/forgot-password', {
                method: 'POST',
                body: JSON.stringify({ email }),
            }),
        resetPassword: (payload: {
            token: string;
            new_password: string;
            confirm_password: string;
        }): Promise<{ message: string }> =>
            authFetch('/api/auth/reset-password', {
                method: 'POST',
                body: JSON.stringify(payload),
            }),
    },

    account: {
        me: (): Promise<AuthUser> => authFetch('/api/account/me'),
        updateProfile: (name: string): Promise<AuthUser> =>
            authFetch('/api/account/profile', {
                method: 'PUT',
                body: JSON.stringify({ name }),
            }),
        requestEmailChange: (new_email: string, current_password: string): Promise<{ message: string }> =>
            authFetch('/api/account/email/request', {
                method: 'POST',
                body: JSON.stringify({ new_email, current_password }),
            }),
        verifyEmailChange: (token: string): Promise<AuthUser> =>
            authFetch('/api/account/email/verify', {
                method: 'POST',
                body: JSON.stringify({ token }),
            }),
        changePassword: (payload: {
            current_password: string;
            new_password: string;
            confirm_password: string;
        }): Promise<{ message: string }> =>
            authFetch('/api/account/password', {
                method: 'PUT',
                body: JSON.stringify(payload),
            }),
    },

    preferences: {
        get: (): Promise<UserPreferences> =>
            authFetch<UserPreferences>('/api/preferences'),
        update: (patch: Partial<UserPreferences>): Promise<UserPreferences> =>
            authFetch<UserPreferences>('/api/preferences', {
                method: 'PUT',
                body: JSON.stringify(patch),
            }),
    },
};
