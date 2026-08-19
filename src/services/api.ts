import type {
    AuthUser,
    Barangay,
    CanopySnapshot,
    HealthResponse,
    HeatSnapshot,
    MitigationProject,
    Report,
    UserPreferences,
} from '../types';
import {
    barangays,
    canopySnapshot,
    heatSnapshot,
    mitigationProjects,
    reports,
} from '../data/mockData';

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
                typeof r?.area === 'string' &&
                typeof r?.date === 'string' &&
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
    getReports: (): Promise<Report[]> =>
        fromApi('/api/reports', reports, isReportArray),

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
