import type { AccentName } from '../types';

export interface AccentPalette {
    primary: string;
    secondary: string;
    orange: string;
    glow: string;
}

export const ACCENTS: Record<AccentName, AccentPalette> = {
    sunset: {
        primary: '#ff2d55',
        secondary: '#ff5577',
        orange: '#ff8c42',
        glow: '255, 45, 85',
    },
    ocean: {
        primary: '#5aa9ff',
        secondary: '#2f6f9e',
        orange: '#8ec7ff',
        glow: '90, 169, 255',
    },
    canopy: {
        primary: '#ff2d55',
        secondary: '#ff5577',
        orange: '#ff8c42',
        glow: '255, 45, 85',
    },
    amber: {
        primary: '#ff2d55',
        secondary: '#ff5577',
        orange: '#ff8c42',
        glow: '255, 45, 85',
    },
    violet: {
        primary: '#ff2d55',
        secondary: '#ff5577',
        orange: '#ff8c42',
        glow: '255, 45, 85',
    },
};
