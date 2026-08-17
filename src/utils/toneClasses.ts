import type { IconTone, Severity, TrendTone } from '../types';

/* ==========================
   Shared class maps for the app's severity/tone color system.
========================== */

export const STAT_ICON_TONES: Record<IconTone, string> = {
    red: 'bg-[rgba(255,45,85,.16)] text-[#ff5577]',
    orange: 'bg-[rgba(255,140,66,.16)] text-[#ff8c42]',
    green: 'bg-[rgba(0,255,132,.14)] text-mint',
    blue: 'bg-[rgba(64,160,255,.16)] text-sky',
};

export const TREND_TONES: Record<TrendTone, string> = {
    up: 'text-accent',
    down: 'text-mint',
    neutral: 'text-sky',
};

export const SEVERITY_BADGES: Record<Severity, string> = {
    critical: 'bg-[rgba(255,45,85,.15)] text-[#ff5577]',
    high: 'bg-[rgba(255,140,66,.15)] text-[#ff8c42]',
    moderate: 'bg-[rgba(255,210,63,.15)] text-[#ffd23f]',
};

export const SEVERITY_DOTS: Record<Severity, string> = {
    critical: 'bg-[#ff2d55] shadow-[0_0_10px_#ff2d55]',
    high: 'bg-[#ff8c42] shadow-[0_0_10px_#ff8c42]',
    moderate: 'bg-gold shadow-[0_0_10px_#ffd23f]',
};

export const REPORT_STATUS_PILLS: Record<'ready' | 'processing', string> = {
    ready: 'bg-[rgba(0,255,132,.14)] text-[#00ff84]',
    processing: 'bg-[rgba(255,210,63,.14)] text-[#ffd23f]',
};

export const MITIGATION_STATUS_BADGES: Record<string, string> = {
    Proposed: 'bg-[rgba(90,169,255,.15)] text-sky',
    'In Progress': 'bg-[rgba(255,210,63,.15)] text-gold',
    Planned: 'bg-white/8 text-[#aaa]',
};

export const ZONE_PRIORITY_KEYS: Record<string, string> = {
    Critical: 'critical',
    High: 'high',
    Medium: 'medium',
    Moderate: 'moderate',
};
