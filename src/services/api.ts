import type {
    Barangay,
    CanopySnapshot,
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
   The Python backend will eventually serve these endpoints:
     GET /api/heat
     GET /api/hotspots
     GET /api/canopy
     GET /api/mitigation
     GET /api/reports
   Until those exist, each call gracefully falls back to the
   prototype mock data (see src/data/mockData.ts).
========================== */

async function fromApi<T>(url: string, fallback: T): Promise<T> {
    try {
        const res = await fetch(url);
        if (!res.ok) {
            return fallback;
        }
        return (await res.json()) as T;
    } catch {
        return fallback;
    }
}

export const api = {
    getHeat: (): Promise<HeatSnapshot> => fromApi('/api/heat', heatSnapshot),
    getHotspots: (): Promise<Barangay[]> => fromApi('/api/hotspots', barangays),
    getCanopy: (): Promise<CanopySnapshot> => fromApi('/api/canopy', canopySnapshot),
    getMitigation: (): Promise<MitigationProject[]> => fromApi('/api/mitigation', mitigationProjects),
    getReports: (): Promise<Report[]> => fromApi('/api/reports', reports),
};
