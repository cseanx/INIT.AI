/**
 * Real land-surface temperature for the map.
 *
 * Sources: NASA GIBS MODIS Aqua, MODIS Terra, and VIIRS NOAA-20 Level 3
 * land-surface temperature, daily and 8-day, day and night, ~1 km. Each
 * platform has one daytime and one nighttime overpass per day, not an hourly
 * product. The daily L3 product typically publishes a few days behind real
 * time; the 8-day composite about two weeks behind. Free and keyless.
 *
 * GIBS tiles are PNGs pre-colorized with NASA's LST palette. The map recolors
 * them to the local scale in `lstScale.ts`; the legend uses the same scale.
 * The colorized tiles do not carry the per-pixel observation time.
 *
 * The platforms use different retrieval algorithms (MODIS split-window,
 * VIIRS TES) and overpass times, so values at the same point can differ by a
 * few K. The UI labels the active platform rather than blending the sources.
 */

export const GIBS_LST_SOURCE_ID = 'gibs-lst';
export const GIBS_LST_LAYER_ID = 'gibs-lst-layer';
export const GIBS_LST_ATTRIBUTION =
    'NASA EOSDIS GIBS · MODIS/VIIRS LST, 1 km · color scale: INIT.AI';

export type LstMode = 'day' | 'night';
export type LstCadence = 'daily' | 'weekly';
export type LstSourceId = 'modis-aqua' | 'modis-terra' | 'viirs-noaa20';

export interface LstSource {
    id: LstSourceId;
    /** Full name used in the popup and source control. */
    label: string;
    /** Short name for the compact legend chip. */
    shortLabel: string;
    sensor: 'MODIS' | 'VIIRS';
    platform: string;
    resolution: '1 km';
    /** Retrieval family, shown as provenance in the legend/popup. */
    algorithm: string;
    /** Nominal local overpass; the colorized tiles carry no exact time. */
    overpass: Record<LstMode, string>;
    description: string;
    layers: Record<LstCadence, Record<LstMode, string>>;
}

const GIBS_ROOT = 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best';

const MODIS_AQUA_LAYERS: LstSource['layers'] = {
    daily: {
        day: `${GIBS_ROOT}/MODIS_Aqua_L3_Land_Surface_Temp_Daily_Day/default`,
        night: `${GIBS_ROOT}/MODIS_Aqua_L3_Land_Surface_Temp_Daily_Night/default`,
    },
    weekly: {
        day: `${GIBS_ROOT}/MODIS_Aqua_L3_Land_Surface_Temp_8Day_Day/default`,
        night: `${GIBS_ROOT}/MODIS_Aqua_L3_Land_Surface_Temp_8Day_Night/default`,
    },
};

const MODIS_TERRA_LAYERS: LstSource['layers'] = {
    daily: {
        day: `${GIBS_ROOT}/MODIS_Terra_L3_Land_Surface_Temp_Daily_Day/default`,
        night: `${GIBS_ROOT}/MODIS_Terra_L3_Land_Surface_Temp_Daily_Night/default`,
    },
    weekly: {
        day: `${GIBS_ROOT}/MODIS_Terra_L3_Land_Surface_Temp_8Day_Day/default`,
        night: `${GIBS_ROOT}/MODIS_Terra_L3_Land_Surface_Temp_8Day_Night/default`,
    },
};

const VIIRS_NOAA20_LAYERS: LstSource['layers'] = {
    daily: {
        day: `${GIBS_ROOT}/VIIRS_NOAA20_L3_Land_Surface_Temp_Daily_Day/default`,
        night: `${GIBS_ROOT}/VIIRS_NOAA20_L3_Land_Surface_Temp_Daily_Night/default`,
    },
    weekly: {
        day: `${GIBS_ROOT}/VIIRS_NOAA20_L3_Land_Surface_Temp_8Day_Day/default`,
        night: `${GIBS_ROOT}/VIIRS_NOAA20_L3_Land_Surface_Temp_8Day_Night/default`,
    },
};

const SOURCES: LstSource[] = [
    {
        id: 'modis-aqua',
        label: 'MODIS Aqua',
        shortLabel: 'Aqua',
        sensor: 'MODIS',
        platform: 'Aqua',
        resolution: '1 km',
        algorithm: 'split-window (MYD11)',
        overpass: { day: '~13:30 local', night: '~01:30 local' },
        description:
            'NASA MODIS Aqua Level 3 LST, 1 km. Afternoon pass; the standard product publishes a few days behind real time.',
        layers: MODIS_AQUA_LAYERS,
    },
    {
        id: 'modis-terra',
        label: 'MODIS Terra',
        shortLabel: 'Terra',
        sensor: 'MODIS',
        platform: 'Terra',
        resolution: '1 km',
        algorithm: 'split-window (MOD11)',
        overpass: { day: '~10:30 local', night: '~22:30 local' },
        description:
            'NASA MODIS Terra Level 3 LST, 1 km. Morning pass; the standard product publishes a few days behind real time.',
        layers: MODIS_TERRA_LAYERS,
    },
    {
        id: 'viirs-noaa20',
        label: 'VIIRS NOAA-20',
        shortLabel: 'NOAA-20',
        sensor: 'VIIRS',
        platform: 'NOAA-20',
        resolution: '1 km',
        algorithm: 'TES (VNP21)',
        overpass: { day: '~13:30 local', night: '~01:30 local' },
        description:
            'NASA VIIRS NOAA-20 Level 3 LST, 1 km (native 750 m, gridded 1 km). Early-afternoon pass using the TES retrieval.',
        layers: VIIRS_NOAA20_LAYERS,
    },
];

export const LST_SOURCE_IDS = SOURCES.map((source) => source.id);

export const LST_SOURCES: Record<LstSourceId, LstSource> = SOURCES.reduce(
    (record, source) => {
        record[source.id] = source;
        return record;
    },
    {} as Record<LstSourceId, LstSource>,
);

export function getLstSource(id: LstSourceId): LstSource {
    return LST_SOURCES[id] ?? LST_SOURCES['modis-aqua'];
}

export const LST_MODE_LABEL: Record<LstMode, string> = {
    day: 'Day',
    night: 'Night',
};

export const LST_CADENCE_LABEL: Record<LstCadence, string> = {
    daily: 'Daily',
    weekly: '8-day',
};

const DAILY_LATENCY_DAYS = 3;
const PERIOD_DAYS = 8;
/** The current GIBS 8-day product is typically one period behind. */
const PERIODS_OF_LAG = 1;
const ARCHIVE_DAYS = 90;

function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

function utcDay(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function latestDailyDate(now = new Date()): string {
    const date = utcDay(now);
    date.setUTCDate(date.getUTCDate() - DAILY_LATENCY_DAYS);
    return isoDate(date);
}

function latestPeriodStart(now = new Date()): Date {
    const year = now.getUTCFullYear();
    const yearStart = Date.UTC(year, 0, 1);
    const today = Date.UTC(year, now.getUTCMonth(), now.getUTCDate());
    const dayOfYear = Math.floor((today - yearStart) / 86_400_000);
    const periodIndex = Math.floor(dayOfYear / PERIOD_DAYS);
    const periodStart = new Date(Date.UTC(year, 0, 1 + periodIndex * PERIOD_DAYS));
    periodStart.setUTCDate(periodStart.getUTCDate() - PERIOD_DAYS * PERIODS_OF_LAG);
    return periodStart;
}

export function shiftLstDate(iso: string, days: number): string {
    const date = new Date(`${iso}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return isoDate(date);
}

export const LST_DAILY_MAX_DATE = latestDailyDate();
export const LST_DAILY_MIN_DATE = shiftLstDate(LST_DAILY_MAX_DATE, -(ARCHIVE_DAYS - 1));

export const LST_WEEKLY_MAX_DATE = isoDate(latestPeriodStart());
export const LST_WEEKLY_MIN_DATE = shiftLstDate(LST_WEEKLY_MAX_DATE, -88);

/** Start of the 8-day composite period containing a date. */
export function weeklyStartFor(iso: string): string {
    const date = new Date(`${iso}T00:00:00Z`);
    const year = date.getUTCFullYear();
    const yearStart = Date.UTC(year, 0, 1);
    const dayOfYear = Math.floor(
        (Date.UTC(year, date.getUTCMonth(), date.getUTCDate()) - yearStart) / 86_400_000,
    );
    const periodIndex = Math.floor(dayOfYear / PERIOD_DAYS);
    return isoDate(new Date(Date.UTC(year, 0, 1 + periodIndex * PERIOD_DAYS)));
}

export function isLstPeriodStart(iso: string): boolean {
    return weeklyStartFor(iso) === iso;
}

export function gibsLstTileUrl(
    sourceId: LstSourceId,
    date: string,
    mode: LstMode,
    cadence: LstCadence,
): string {
    return `${getLstSource(sourceId).layers[cadence][mode]}/${date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
}

/** Whole UTC days between an ISO date and today. */
export function lstDaysAgo(iso: string, now = new Date()): number {
    const today = utcDay(now).getTime();
    const selected = new Date(`${iso}T00:00:00Z`).getTime();
    return Math.max(0, Math.round((today - selected) / 86_400_000));
}

/** Human-readable date, e.g. "Nov 22, 2026". */
export function formatLstDate(iso: string): string {
    return new Date(`${iso}T00:00:00Z`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

/** Human-readable 8-day period, e.g. "Nov 9–16, 2026". */
export function formatLstPeriod(startIso: string): string {
    const start = new Date(`${startIso}T00:00:00Z`);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + PERIOD_DAYS - 1);

    const month = start.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
    const endMonth = end.toLocaleDateString(undefined, { month: 'short', timeZone: 'UTC' });
    const year = end.getUTCFullYear();
    const sameMonth = start.getUTCMonth() === end.getUTCMonth();
    const endLabel = sameMonth ? `${end.getUTCDate()}` : `${endMonth} ${end.getUTCDate()}`;

    return `${month} ${start.getUTCDate()}–${endLabel}, ${year}`;
}
