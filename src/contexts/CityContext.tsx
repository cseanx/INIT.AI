import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

/** INIT.AI is scoped to the MIMAROPA region (Region IV-B). The selector
 *  offers the whole region plus each province so the map can focus without
 *  ever leaving MIMAROPA. */
export type CityName =
    | 'MIMAROPA'
    | 'Occidental Mindoro'
    | 'Oriental Mindoro'
    | 'Marinduque'
    | 'Romblon'
    | 'Palawan';

export interface CityConfig {
    name: CityName;
    center: [number, number]; // [lng, lat]
    bounds: [[number, number], [number, number]]; // [[minLng, minLat],[maxLng, maxLat]]
    zoom: number;
}

export const CITY_CONFIG: Record<CityName, CityConfig> = {
    MIMAROPA: {
        name: 'MIMAROPA',
        center: [119.85, 10.78],
        // Palawan (Balabac) in the southwest through the Romblon islands
        // in the northeast. Kalayaan's Spratly islands are intentionally
        // outside this box so the regional view stays readable.
        bounds: [
            [116.9, 7.6],
            [122.8, 13.95],
        ],
        zoom: 6.6,
    },
    'Occidental Mindoro': {
        name: 'Occidental Mindoro',
        center: [120.75, 13.0],
        bounds: [
            [120.15, 12.15],
            [121.25, 13.9],
        ],
        zoom: 8.4,
    },
    'Oriental Mindoro': {
        name: 'Oriental Mindoro',
        center: [121.22, 13.12],
        bounds: [
            [120.85, 12.7],
            [121.7, 13.65],
        ],
        zoom: 9.2,
    },
    Marinduque: {
        name: 'Marinduque',
        center: [121.92, 13.42],
        bounds: [
            [121.65, 13.2],
            [122.15, 13.7],
        ],
        zoom: 10.0,
    },
    Romblon: {
        name: 'Romblon',
        center: [122.25, 12.5],
        bounds: [
            [121.85, 11.95],
            [122.75, 13.05],
        ],
        zoom: 9.4,
    },
    Palawan: {
        name: 'Palawan',
        center: [118.6, 10.0],
        bounds: [
            [116.9, 7.6],
            [120.4, 12.45],
        ],
        zoom: 7.3,
    },
};

interface CityContextValue {
    selected: CityName;
    config: CityConfig;
    setSelected: (city: CityName) => void;
}

const CityContext = createContext<CityContextValue | null>(null);

export function CityProvider({ children }: { children: ReactNode }) {
    const [selected, setSelected] = useState<CityName>('MIMAROPA');
    const value = useMemo(() => ({ selected, config: CITY_CONFIG[selected], setSelected }), [selected]);
    return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity(): CityContextValue {
    const ctx = useContext(CityContext);
    if (!ctx) throw new Error('useCity must be used within CityProvider');
    return ctx;
}
