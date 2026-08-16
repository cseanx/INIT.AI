import type {
    Barangay,
    CanopySnapshot,
    HealthResponse,
    HeatSnapshot,
    MitigationProject,
    Report,
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
     GET /api/health
     GET /api/heat
     GET /api/hotspots (backed by /api/heat + /api/barangays)
     GET /api/canopy
     GET /api/mitigation
     GET /api/reports
   Base URL comes from VITE_API_URL (frontend .env). When the backend is
   unreachable, each call gracefully falls back to the prototype mock data
   (see src/data/mockData.ts).
========================== */

const API_BASE: string = import.meta.env.VITE_API_URL ?? '';

async function fromApi<T>(path: string, fallback: T): Promise<T> {
    try {
        const res = await fetch(`${API_BASE}${path}`);
        if (!res.ok) {
            return fallback;
        }
        return (await res.json()) as T;
    } catch {
        return fallback;
    }
}

export const api = {
    getHealth: (): Promise<HealthResponse> => fromApi('/api/health', { status: 'ok' }),
    getHeat: (): Promise<HeatSnapshot> => fromApi('/api/heat', heatSnapshot),
    getHotspots: (): Promise<Barangay[]> => fromApi('/api/hotspots', barangays),
    getCanopy: (): Promise<CanopySnapshot> => fromApi('/api/canopy', canopySnapshot),
    getMitigation: (): Promise<MitigationProject[]> => fromApi('/api/mitigation', mitigationProjects),
    getReports: (): Promise<Report[]> => fromApi('/api/reports', reports),
};
