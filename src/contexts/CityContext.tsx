import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type CityName = 'Quezon City' | 'Manila' | 'Pasig' | 'Caloocan';

export interface CityConfig {
    name: CityName;
    center: [number, number]; // [lng, lat]
    bounds: [[number, number], [number, number]]; // [[minLng, minLat],[maxLng, maxLat]]
    zoom: number;
}

export const CITY_CONFIG: Record<CityName, CityConfig> = {
    'Quezon City': {
        name: 'Quezon City',
        center: [121.043, 14.676],
        bounds: [
            [120.95, 14.58],
            [121.15, 14.78],
        ],
        zoom: 11.2,
    },
    Manila: {
        name: 'Manila',
        center: [120.9842, 14.5995],
        bounds: [
            [120.93, 14.53],
            [121.06, 14.67],
        ],
        zoom: 11.5,
    },
    Pasig: {
        name: 'Pasig',
        center: [121.0851, 14.5764],
        bounds: [
            [121.02, 14.52],
            [121.15, 14.65],
        ],
        zoom: 11.8,
    },
    Caloocan: {
        name: 'Caloocan',
        center: [120.967, 14.65],
        bounds: [
            [120.9, 14.58],
            [121.06, 14.74],
        ],
        zoom: 11.6,
    },
};

interface CityContextValue {
    selected: CityName;
    config: CityConfig;
    setSelected: (city: CityName) => void;
}

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
    const [selected, setSelected] = useState<CityName>('Quezon City');
    const value = useMemo(() => ({ selected, config: CITY_CONFIG[selected], setSelected }), [selected]);
    return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
    const ctx = useContext(CityContext);
    if (!ctx) throw new Error('useCity must be used within CityProvider');
    return ctx;
}
