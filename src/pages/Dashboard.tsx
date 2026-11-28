import { Link, useNavigate } from 'react-router-dom';
import Page from '../components/layout/Page';
import StatGrid from '../components/layout/StatGrid';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import { SplitPanel } from '../components/common/LayoutPrimitives';
import { BentoCard } from '../components/common/BentoCard';
import StatCard from '../components/dashboard/StatCard';
import DashboardChart from '../components/dashboard/DashboardChart';
import MiniHotspotList from '../components/dashboard/MiniHotspotList';
import HeatScale from '../components/common/HeatScale';
import { api } from '../services/api';
import { dashboardStats } from '../data/mockData';
import { useApiData } from '../hooks/useApiData';
import { useCity } from '../contexts/CityContext';

const PRIMARY_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[13px_20px] text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] sm:p-[14px_24px] sm:text-[14.5px]';
const SECONDARY_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border border-white/[.14] bg-white/5 p-[13px_20px] text-[14px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/9 sm:p-[14px_24px] sm:text-[14.5px]';

export default function Dashboard() {
    const navigate = useNavigate();
    const { selected: activeCity, setSelected: setActiveCity } = useCity();
    const isPilotCity = activeCity === 'Quezon City';
    const hotspotData = useApiData(api.getHotspots);
    // The snapshot is Quezon City only; other cities get an explicit
    // unavailable state instead of borrowed QC readings.
    const barangays = isPilotCity ? hotspotData : null;
    const topHotspot = barangays
        ? [...barangays].sort((a, b) => b.temp - a.temp)[0]
        : undefined;
    const stats = dashboardStats.map((stat) =>
        stat.label === 'Active Hotspots'
            ? {
                  ...stat,
                  value: barangays ? String(barangays.length) : '—',
                  trendIcon: 'fa-satellite',
                  trend: isPilotCity ? '8-day' : 'QC',
                  trendNote: isPilotCity ? 'MODIS snapshot' : 'pilot only',
              }
            : stat,
    );

    return (
        <Page>
            <BentoCard className="hero-panel relative mb-4 flex w-full flex-col items-start justify-between gap-8 overflow-hidden rounded-[24px] border border-white/8 bg-white/5 p-[24px] backdrop-blur-[25px] shadow-[0_20px_60px_rgba(0,0,0,.35)] sm:mb-5 sm:rounded-[28px] sm:p-[32px] lg:flex-row lg:items-center lg:gap-10 lg:p-[40px_44px]">
                <div className="relative z-10 w-full min-w-0 lg:w-[55%]">
                    <h1 className="mb-4 bg-none text-[32px] font-bold leading-[1.1] text-white sm:text-[38px] lg:mb-[18px] lg:text-[44px]">
                        Monitor.
                        <br />
                        Analyze.
                        <br />
                        Mitigate.
                    </h1>
                    <p className="mb-6 max-w-[52ch] text-[14px] leading-[1.7] text-[#cdcdcd] sm:text-[15px] lg:mb-7">
                        Analyze urban heat islands using satellite-derived hotspot detection,
                        real land-surface temperature, and canopy assessment to support
                        climate-smart decision making.
                    </p>
                    <div className="flex flex-wrap gap-3 sm:gap-[14px]">
                        <button className={PRIMARY_BTN_CLASSES} onClick={() => navigate('/heatmap')}>
                            <i className="fa-solid fa-map-location-dot mr-2 text-[13px]"></i>
                            Open Heat Map
                        </button>
                        <button
                            className={SECONDARY_BTN_CLASSES}
                            onClick={() => navigate('/hotspots')}
                        >
                            Review Hotspots
                        </button>
                    </div>
                    <p className="hero-demo-note mt-5 flex items-center gap-2 text-[12px] text-[#d8c2c2]">
                        <i className="fa-solid fa-satellite text-[12px] text-[#ff8fa3]"></i>
                        {isPilotCity
                            ? 'Real 8-day hotspots; other dashboard metrics remain prototype.'
                            : 'Hotspot pilot covers Quezon City; other dashboard metrics remain prototype.'}
                    </p>
                </div>

                <div className="relative z-10 flex w-full min-w-0 justify-end lg:w-[45%]">
                    <div className="flex w-full max-w-[400px] flex-col items-start">
                        <div className="flex w-full items-center justify-between gap-3">
                            <span className="flex min-w-0 items-center gap-2.5">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(255,45,85,.9)]"></span>
                                </span>
                                <span className="truncate text-[10.5px] font-semibold uppercase tracking-[.13em] text-red-400">
                                    {topHotspot
                                        ? `${topHotspot.name} · ${topHotspot.severity} hotspot`
                                        : isPilotCity
                                          ? 'Loading satellite hotspots…'
                                          : `${activeCity} · no hotspot snapshot`}
                                </span>
                            </span>
                            <span className="shrink-0 rounded-full border border-white/10 px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[.08em] text-white/55">
                                {isPilotCity ? '8-day' : 'QC pilot'}
                            </span>
                        </div>

                        <p className="mt-5 font-mono text-[56px] font-bold leading-none tracking-[-.05em] text-white sm:text-[62px]">
                            {topHotspot ? topHotspot.temp.toFixed(1) : '—'}
                            <span className="ml-1 align-top font-sans text-[20px] font-semibold tracking-normal text-white/70">
                                °C
                            </span>
                        </p>

                        <HeatScale
                            className="mt-6 max-w-[320px]"
                            caption="City scale"
                            markers={
                                topHotspot
                                    ? [
                                          {
                                              temp: topHotspot.temp,
                                              severity: topHotspot.severity,
                                              title: `${topHotspot.temp.toFixed(1)}°C — ${topHotspot.name}, hottest in the latest 8-day snapshot`,
                                          },
                                      ]
                                    : []
                            }
                        />

                        <p className="mt-4 text-[12.5px] font-medium text-red-400">
                            {!isPilotCity ? (
                                <span className="font-normal text-white/60">
                                    Hotspots are mapped for Quezon City only in this pilot.
                                </span>
                            ) : topHotspot?.trend != null ? (
                                <>
                                    {topHotspot.trend >= 0 ? '+' : '−'}
                                    {Math.abs(topHotspot.trend).toFixed(1)}°C{' '}
                                    <span className="font-normal text-white/60">
                                        vs previous 8-day
                                    </span>
                                </>
                            ) : (
                                <span className="font-normal text-white/60">
                                    No previous-period comparison
                                </span>
                            )}
                            {isPilotCity ? (
                                <>
                                    <span className="mx-1.5 text-white/30">·</span>
                                    <span className="font-normal text-white/60">
                                        {topHotspot
                                            ? `${topHotspot.canopy}% canopy`
                                            : '— canopy'}
                                    </span>
                                </>
                            ) : null}
                        </p>

                        {isPilotCity ? (
                            <Link
                                to={
                                    topHotspot
                                        ? `/hotspots?q=${encodeURIComponent(topHotspot.name)}`
                                        : '/hotspots'
                                }
                                className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-white transition hover:text-red-300"
                            >
                                Inspect hotspot
                                <i className="fa-solid fa-arrow-right text-[11px] text-red-400" aria-hidden="true"></i>
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setActiveCity('Quezon City')}
                                className="mt-6 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/14 bg-white/5 px-4 text-[13px] font-semibold text-white transition hover:bg-white/10"
                            >
                                <i className="fa-solid fa-city text-[11px] text-accent"></i>
                                Switch to Quezon City
                            </button>
                        )}
                    </div>
                </div>
            </BentoCard>

            <StatGrid>
                {stats.map((stat) => (
                    <StatCard key={stat.label} stat={stat} />
                ))}
            </StatGrid>

            <Card>
                <SplitPanel
                    left={
                        <>
                            <PanelHead
                                title="Priority Hotspots"
                                actions={
                                    <button
                                        className="flex min-h-[44px] items-center gap-[6px] text-[13px] text-accent"
                                        onClick={() => navigate('/hotspots')}
                                    >
                                        View all <i className="fa-solid fa-arrow-right"></i>
                                    </button>
                                }
                            />
                            {isPilotCity ? (
                                <MiniHotspotList hotspots={(barangays ?? []).slice(0, 4)} />
                            ) : (
                                <div className="flex min-h-[180px] items-center justify-center rounded-[14px] border border-dashed border-white/10 bg-white/[.02] px-5 text-center text-[12.5px] leading-[1.6] text-[#888]">
                                    Priority hotspots are available for the Quezon City
                                    pilot only.
                                </div>
                            )}
                        </>
                    }
                    right={
                        <div className="flex h-full min-h-[260px] flex-col">
                            <PanelHead title="Canopy vs Heat" />
                            {!isPilotCity ? (
                                <div className="flex min-h-[200px] flex-1 items-center justify-center rounded-[14px] border border-dashed border-white/10 bg-white/[.02] px-5 text-center text-[12.5px] leading-[1.6] text-[#888]">
                                    Canopy vs heat is part of the Quezon City pilot only.
                                </div>
                            ) : barangays ? (
                                <DashboardChart data={barangays} />
                            ) : (
                                <div className="min-h-[200px] flex-1" aria-hidden="true" />
                            )}
                        </div>
                    }
                />
            </Card>
        </Page>
    );
}
