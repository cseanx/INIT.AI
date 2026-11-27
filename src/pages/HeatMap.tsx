import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/layout/Page';
import MapView from '../components/map/MapView';
import LstLegend from '../components/map/LstLegend';
import LstDatePicker from '../components/map/LstDatePicker';
import InspectorPanel from '../components/inspector/InspectorPanel';
import { useBentoFx } from '../components/common/BentoCard';
import { useCity } from '../contexts/CityContext';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';
import {
    LST_DAILY_MAX_DATE,
    LST_DAILY_MIN_DATE,
    LST_CADENCE_LABEL,
    LST_WEEKLY_MAX_DATE,
    LST_WEEKLY_MIN_DATE,
    findLatestLstDate,
    weeklyStartFor,
    type LstCadence,
    type LstMode,
} from '../components/map/gibsLst';

/**
 * Map workspace. Desktop: map + fixed-height inspector side by side.
 * Below 1100px the two stack vertically and the page scrolls, so a field
 * coordinator can read the map and the inspector on a phone.
 */
export default function HeatMap() {
    const [lstVisible, setLstVisible] = useState(true);
    const [lstCadence, setLstCadence] = useState<LstCadence>('daily');
    const [lstMode, setLstMode] = useState<LstMode>('day');
    const [lstDate, setLstDate] = useState(LST_DAILY_MAX_DATE);
    const [latestDailyDate, setLatestDailyDate] = useState(LST_DAILY_MAX_DATE);
    const dateTouchedRef = useRef(false);
    const mapCardFx = useBentoFx({ particleCount: 0 });
    const { selected, config: cityConfig } = useCity();
    const hotspots = useApiData(api.getHotspots);

    const criticalCount = (hotspots ?? []).filter((b) => b.severity === 'critical').length;

    useEffect(() => {
        if (lstCadence !== 'daily') return;

        let cancelled = false;
        const [[west, south], [east, north]] = cityConfig.bounds;
        const center: [number, number] = [(west + east) / 2, (south + north) / 2];

        void findLatestLstDate(center, lstMode, LST_DAILY_MAX_DATE).then((date) => {
            if (cancelled) return;
            setLatestDailyDate(date);
            if (!dateTouchedRef.current) setLstDate(date);
        });

        return () => {
            cancelled = true;
        };
    }, [cityConfig, lstCadence, lstMode]);

    const dateMin = lstCadence === 'weekly' ? LST_WEEKLY_MIN_DATE : LST_DAILY_MIN_DATE;
    const dateMax = lstCadence === 'weekly' ? LST_WEEKLY_MAX_DATE : latestDailyDate;

    function handleDateChange(date: string) {
        dateTouchedRef.current = true;
        setLstDate(date);
    }

    function changeCadence(next: LstCadence) {
        setLstCadence(next);

        if (next === 'weekly') {
            const periodStart = weeklyStartFor(lstDate);
            setLstDate(
                periodStart < LST_WEEKLY_MIN_DATE
                    ? LST_WEEKLY_MIN_DATE
                    : periodStart > LST_WEEKLY_MAX_DATE
                      ? LST_WEEKLY_MAX_DATE
                      : periodStart,
            );
            return;
        }

        setLstDate(
            lstDate < LST_DAILY_MIN_DATE
                ? LST_DAILY_MIN_DATE
                : lstDate > latestDailyDate
                  ? latestDailyDate
                  : lstDate,
        );
    }

    return (
        <Page className="min-h-0">
            <div
                ref={mapCardFx.ref}
                style={mapCardFx.style}
                className={`${mapCardFx.className} flex min-h-0 w-full flex-col overflow-hidden rounded-[24px] border border-white/8 bg-white/5 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)] min-[1100px]:h-full min-[1100px]:flex-row sm:rounded-[28px]`}
            >
                {/* Map column */}
                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/8 px-[16px] py-[11px] min-[1100px]:min-h-[60px] sm:px-[20px] sm:py-[13px]">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="text-[14px] font-semibold sm:text-[15px]">
                                {selected} · Heat Map
                            </h3>
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-mint/30 bg-mint/10 px-2 py-[2px] text-[10.5px] font-bold uppercase tracking-[.06em] text-mint"
                                title="NASA GIBS MODIS Aqua land-surface temperature. Daily or 1-week composite, day and night passes at 1 km, about three to four days (daily) or two weeks (composite) behind real time. Colors use the INIT.AI 10–40°C scale."
                            >
                                <i className="fa-solid fa-satellite text-[10px]"></i> Real LST
                            </span>
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[.04] px-2 py-[2px] text-[10.5px] font-semibold uppercase tracking-[.06em] text-[#999]"
                                title="Hotspot records and the inspector are still prototype demo data."
                            >
                                Demo hotspots
                            </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <LstDatePicker
                                value={lstDate}
                                minDate={dateMin}
                                maxDate={dateMax}
                                cadence={lstCadence}
                                onChange={handleDateChange}
                            />

                            <div className="relative inline-flex items-center">
                                <select
                                    aria-label="LST cadence"
                                    title="Switch between daily passes and the 8-day (1 week) composite"
                                    value={lstCadence}
                                    onChange={(event) =>
                                        changeCadence(event.target.value as LstCadence)
                                    }
                                    className="h-[34px] cursor-pointer appearance-none rounded-full border border-white/10 bg-white/[.04] pl-3 pr-7 text-[11px] font-semibold text-[#ddd] outline-none transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35"
                                >
                                    <option value="daily">{LST_CADENCE_LABEL.daily}</option>
                                    <option value="weekly">{LST_CADENCE_LABEL.weekly}</option>
                                </select>
                                <i
                                    className="fa-solid fa-chevron-down pointer-events-none absolute right-2.5 text-[8px] text-[#777]"
                                    aria-hidden="true"
                                ></i>
                            </div>

                            <div
                                role="group"
                                aria-label="LST pass"
                                className="inline-flex items-center rounded-full border border-white/10 bg-white/[.04] p-[2px]"
                            >
                                <button
                                    type="button"
                                    aria-pressed={lstMode === 'day'}
                                    title="Day pass · nominal Aqua overpass ~13:30 local. Exact per-pixel time is not included in this layer."
                                    onClick={() => setLstMode('day')}
                                    style={{ outline: 'none' }}
                                    className={`inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-full border-none px-[9px] text-[11px] font-semibold transition focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35 ${
                                        lstMode === 'day'
                                            ? 'bg-white/14 text-white shadow-[0_1px_0_rgba(255,255,255,.08)_inset]'
                                            : 'bg-transparent text-[#999] hover:text-white'
                                    }`}
                                >
                                    <i className="fa-solid fa-sun text-[10px]" aria-hidden="true"></i>
                                    Day
                                </button>
                                <button
                                    type="button"
                                    aria-pressed={lstMode === 'night'}
                                    title="Night pass · nominal Aqua overpass ~01:30 local. Exact per-pixel time is not included in this layer."
                                    onClick={() => setLstMode('night')}
                                    style={{ outline: 'none' }}
                                    className={`inline-flex min-h-[30px] cursor-pointer items-center gap-1.5 rounded-full border-none px-[9px] text-[11px] font-semibold transition focus:outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/35 ${
                                        lstMode === 'night'
                                            ? 'bg-white/14 text-white shadow-[0_1px_0_rgba(255,255,255,.08)_inset]'
                                            : 'bg-transparent text-[#999] hover:text-white'
                                    }`}
                                >
                                    <i className="fa-solid fa-moon text-[10px]" aria-hidden="true"></i>
                                    Night
                                </button>
                            </div>

                            <button
                                type="button"
                                aria-pressed={lstVisible}
                                onClick={() => setLstVisible((visible) => !visible)}
                                title={lstVisible ? 'Hide the LST layer' : 'Show the LST layer'}
                                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-[10px] text-[12px] font-semibold text-[#ddd] transition hover:bg-white/10 hover:text-white"
                            >
                                <i
                                    className={`fa-solid ${lstVisible ? 'fa-eye' : 'fa-eye-slash'} text-[11px]`}
                                    aria-hidden="true"
                                ></i>
                                {lstVisible ? 'LST on' : 'LST off'}
                            </button>

                            <Link
                                to="/hotspots"
                                className="inline-flex min-h-[34px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-[10px] text-[12px] font-semibold text-[#ddd] transition hover:bg-white/10 hover:text-white"
                                title="Prototype hotspot records (demo data)"
                            >
                                <span className="h-1.5 w-1.5 rounded-full bg-[#ff2d55] shadow-[0_0_6px_#ff2d55]"></span>
                                {criticalCount} critical hotspots
                                <i className="fa-solid fa-arrow-right text-[11px]"></i>
                            </Link>
                        </div>
                    </div>
                    <div className="relative h-[58vh] min-h-[380px] p-[10px] min-[1100px]:h-auto min-[1100px]:min-h-0 min-[1100px]:flex-1 sm:p-[14px]">
                        <MapView
                            className="h-full w-full rounded-[16px] sm:rounded-[18px]"
                            lstDate={lstDate}
                            lstCadence={lstCadence}
                            lstMode={lstMode}
                            lstVisible={lstVisible}
                        >
                            {lstVisible ? (
                                <LstLegend
                                    date={lstDate}
                                    cadence={lstCadence}
                                    mode={lstMode}
                                />
                            ) : null}
                        </MapView>
                    </div>
                </div>

                {/* Inspector column — part of the same card, like the reports rail */}
                <div className="flex w-full shrink-0 flex-col border-t border-white/8 min-[1100px]:h-full min-[1100px]:w-[372px] min-[1100px]:shrink-0 min-[1100px]:border-l min-[1100px]:border-t-0 min-[1360px]:w-[400px]">
                    <InspectorPanel />
                </div>
            </div>
        </Page>
    );
}
