/**
 * Real land-surface temperature for the map.
 *
 * Source: NASA GIBS — MODIS Aqua daily Land Surface Temperature (Day and
 * Night) and its 8-day composite sibling, 1 km, colorized by NASA. There is
 * one daytime and one nighttime overpass per day, not an hourly product.
 * The daily L3 product typically publishes about three to four days behind
 * real time; the 8-day composite about two weeks behind. Free and keyless.
 *
 * GIBS tiles are PNGs pre-colorized with NASA's global palette. The map
 * recolors them to the local scale in `lstScale.ts`; the legend uses the same
 * scale. The colorized tiles do not carry the per-pixel observation time.
 */

export const GIBS_LST_SOURCE_ID = 'gibs-modis-lst';
export const GIBS_LST_LAYER_ID = 'gibs-modis-lst-layer';
export const GIBS_LST_ATTRIBUTION =
    'NASA EOSDIS GIBS · MODIS Aqua LST, 1 km · color scale: INIT.AI';

export type LstMode = 'day' | 'night';
export type LstCadence = 'daily' | 'weekly';

export const LST_MODE_LABEL: Record<LstMode, string> = {
    day: 'Day',
    night: 'Night',
};

/** Nominal Aqua overpass; the colorized tiles do not include actual times. */
export const LST_MODE_OVERPASS: Record<LstMode, string> = {
    day: '~13:30 local',
    night: '~01:30 local',
};

export const LST_CADENCE_LABEL: Record<LstCadence, string> = {
    daily: 'Daily',
    weekly: '1 week',
};const GIBS_LST_TILE_ROOTS: Record<LstCadence, Record<LstMode, string>> = {
    daily: {
        day: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_L3_Land_Surface_Temp_Daily_Day/default',
        night: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_L3_Land_Surface_Temp_Daily_Night/default',
    },
    weekly: {
        day: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_L3_Land_Surface_Temp_8Day_Day/default',
        night: 'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Aqua_L3_Land_Surface_Temp_8Day_Night/default',
    },
};

const DAILY_LATENCY_DAYS = 3;
const PERIOD_DAYS = 8;
/** Allow two full 8-day periods for publication. */
const PERIODS_OF_LAG = 2;
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
    date: string,
    mode: LstMode,
    cadence: LstCadence,
): string {
    return `${GIBS_LST_TILE_ROOTS[cadence][mode]}/${date}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
}

function tilePathFor(lng: number, lat: number, zoom: number): string {
    const count = 2 ** zoom;
    const x = Math.floor(((lng + 180) / 360) * count);
    const radians = (lat * Math.PI) / 180;
    const y = Math.floor(
        ((1 -
            Math.log(Math.tan(radians) + 1 / Math.cos(radians)) / Math.PI) /
            2) *
            count,
    );
    return `${zoom}/${y}/${x}`;
}

/**
 * Walk back from the newest processed date until the daily tile over the
 * current city has an actual retrieval. A 200 response with a near-empty PNG
 * means the whole city was cloudy, which is not a useful default.
 */
export async function findLatestLstDate(
    center: [number, number],
    mode: LstMode,
    maxDate: string,
    attempts = 7,
): Promise<string> {
    let date = maxDate;

    for (let index = 0; index < attempts; index += 1) {
        const tileUrl = gibsLstTileUrl(date, mode, 'daily').replace(
            '{z}/{y}/{x}',
            tilePathFor(center[0], center[1], 7),
        );

        try {
            const response = await fetch(tileUrl);
            if (response.ok) {
                const blob = await response.blob();
                if (blob.size >= 2500) return date;
            }
        } catch {
            // Try the previous day; the map will show its normal cloud gaps.
        }

        date = shiftLstDate(date, -1);
    }

    return maxDate;
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
