import { barangays } from '../../data/mockData';

/* ==========================
   INSPECTOR DATA — frontend only.
   Static mock observations for the selected area; to be wired to the
   backend API / live map selection later.
========================== */

export const SELECTED = {
    name: 'Brgy. Batasan Hills',
    surfaceTemp: 38.4,
    airTemp: 32.1,
    updated: '4h ago',
    humidity: 61,
    wind: 12,
    uvIndex: 8,
    canopy: 16,
    impervious: 78,
    exposedPopulation: '214K',
};

export const HOURLY_LABELS = Array.from({ length: 24 }, (_, i) =>
    `${String(i).padStart(2, '0')}:00`,
);

export const HOURLY_TEMPS = [
    34.6, 34.9, 35.2, 35.8, 36.3, 36.9, 37.4, 37.9, 38.2, 38.5, 38.9, 38.7,
    38.4, 38.2, 38.0, 37.8, 38.1, 38.4, 38.6, 38.9, 39.1, 38.8, 38.5, 38.4,
];

export const HOTSPOTS = [...barangays].sort((a, b) => b.temp - a.temp).slice(0, 5);

export const TREND_LOW = Math.min(...HOURLY_TEMPS);
export const TREND_PEAK = Math.max(...HOURLY_TEMPS);
export const TREND_PEAK_LABEL = HOURLY_LABELS[HOURLY_TEMPS.indexOf(TREND_PEAK)];

export const RECOMMENDATIONS = [
    {
        icon: 'fa-seedling',
        text: 'Prioritize urban tree planting along Commonwealth Ave corridor',
        note: '-2.1°C projected local drop',
    },
    {
        icon: 'fa-road',
        text: 'Deploy cool pavement on the Batasan–Sauyo road section',
        note: '-0.9°C projected local drop',
    },
];

const RISK_CLASSES: Record<'danger' | 'extreme' | 'caution' | 'safe', string> = {
    danger: 'bg-[rgba(255,45,85,.15)] text-[#ff5577]',
    extreme: 'bg-[rgba(255,140,66,.15)] text-[#ff8c42]',
    caution: 'bg-[rgba(255,210,63,.15)] text-[#ffd23f]',
    safe: 'bg-[rgba(0,255,132,.14)] text-[#00ff84]',
};

const RISK_DOTS: Record<'danger' | 'extreme' | 'caution' | 'safe', string> = {
    danger: 'bg-[#ff2d55]',
    extreme: 'bg-[#ff8c42]',
    caution: 'bg-[#ffd23f]',
    safe: 'bg-[#00ff84]',
};

export function heatRisk(temp: number): { label: string; className: string; dot: string } {
    if (temp >= 39)
        return { label: 'Danger', className: RISK_CLASSES.danger, dot: RISK_DOTS.danger };
    if (temp >= 36)
        return { label: 'Extreme Caution', className: RISK_CLASSES.extreme, dot: RISK_DOTS.extreme };
    if (temp >= 33)
        return { label: 'Caution', className: RISK_CLASSES.caution, dot: RISK_DOTS.caution };
    return { label: 'Safe', className: RISK_CLASSES.safe, dot: RISK_DOTS.safe };
}

/** Enough of the selected reading for the collapsed rail to stay useful. */
export const INSPECTOR_SUMMARY = {
    area: SELECTED.name,
    temp: SELECTED.surfaceTemp,
    risk: heatRisk(SELECTED.surfaceTemp),
};
