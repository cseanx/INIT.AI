import { useNavigate } from 'react-router-dom';
import Page from '../components/layout/Page';
import StatGrid from '../components/layout/StatGrid';
import PanelGrid from '../components/layout/PanelGrid';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import { BentoCard } from '../components/common/BentoCard';
import StatCard from '../components/dashboard/StatCard';
import DashboardChart from '../components/dashboard/DashboardChart';
import MiniHotspotList from '../components/dashboard/MiniHotspotList';
import { api } from '../services/api';
import { dashboardStats, priorityHotspots } from '../data/mockData';
import { useApiData } from '../hooks/useApiData';

const PRIMARY_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[13px_20px] text-[14px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] sm:p-[14px_24px] sm:text-[14.5px]';
const SECONDARY_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border border-white/[.14] bg-white/5 p-[13px_20px] text-[14px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/9 sm:p-[14px_24px] sm:text-[14.5px]';

export default function Dashboard() {
    const navigate = useNavigate();
    const barangays = useApiData(api.getHotspots);

    return (
        <Page>
            <BentoCard className="hero-panel glass-hot relative mb-4 flex w-full flex-col items-start justify-between gap-8 overflow-hidden rounded-[24px] border border-white/8 bg-white/5 p-[24px] backdrop-blur-[25px] shadow-[0_20px_60px_rgba(0,0,0,.35)] sm:mb-5 sm:rounded-[28px] sm:p-[32px] lg:flex-row lg:items-center lg:gap-10 lg:p-[40px_44px]">
                <div className="relative z-10 w-full min-w-0 lg:w-[55%]">
                    <h1 className="mb-4 bg-none text-[32px] font-bold leading-[1.1] text-white sm:text-[38px] lg:mb-[18px] lg:text-[44px]">
                        Monitor.
                        <br />
                        Analyze.
                        <br />
                        Mitigate.
                    </h1>
                    <p className="mb-6 max-w-[52ch] text-[14px] leading-[1.7] text-[#b4b4b4] sm:text-[15px] lg:mb-7">
                        Analyze urban heat islands using satellite imagery, AI-assisted hotspot
                        detection, and canopy assessment to support climate-smart decision making.
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
                        <i className="fa-solid fa-flask text-[12px] text-[#ff8fa3]"></i>
                        Prototype dataset — demo observations, not live sensor data.
                    </p>
                </div>

                <div className="relative z-10 flex w-full min-w-0 justify-end lg:w-[45%]">
                    <div className="keep-dark relative w-full max-w-[420px] rounded-[22px] border border-white/10 bg-[rgba(20,20,25,0.5)] p-[18px] shadow-[0_20px_50px_rgba(0,0,0,.5)] backdrop-blur-md transition-colors duration-300 hover:border-red-500/30 sm:p-[22px]">
                        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        <div className="mb-[16px] flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                                <span className="relative flex h-2.5 w-2.5 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(255,45,85,.9)]"></span>
                                </span>
                                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-[12px] font-semibold tracking-[.06em] text-red-400">
                                    CRITICAL ANOMALY
                                </span>
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-1 text-[12px] leading-tight text-[#999]">
                                <span>Demo reading</span>
                                <span className="text-[#bbb]">Payatas, District 2</span>
                            </div>
                        </div>

                        <div className="mb-1 flex items-baseline gap-2">
                            <span className="font-mono text-[38px] font-bold leading-none text-white sm:text-[40px]">
                                41.2°C
                            </span>
                        </div>
                        <p className="mb-[16px] text-[12.5px] font-medium text-red-400/90">
                            +4.8°C above historical baseline
                        </p>

                        <div className="mb-[18px]">
                            <div className="mb-2 flex items-center justify-between gap-3 text-[12px] font-medium">
                                <span className="uppercase tracking-[.06em] text-[#999]">Risk level</span>
                                <span className="text-right text-red-400">Extreme Caution / Danger</span>
                            </div>
                            <div className="h-[8px] overflow-hidden rounded-full border border-white/10 bg-white/5">
                                <div className="h-full w-[86%] rounded-full bg-gradient-to-r from-amber-400 via-red-500 to-red-600 shadow-[0_0_12px_rgba(255,45,85,.5)]" />
                            </div>
                        </div>

                        <div className="mb-[18px] flex items-start gap-2.5 rounded-[14px] border border-white/10 bg-white/[.03] p-[12px_14px]">
                            <i className="fa-solid fa-robot mt-[2px] text-[13px] text-red-400"></i>
                            <p className="text-[12.5px] leading-relaxed text-[#ccc]">
                                High surface heat cluster identified over dense residential zone with
                                12% canopy deficit. Vulnerability score: High.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5 sm:flex-row">
                            <button
                                type="button"
                                onClick={() => navigate('/hotspots')}
                                className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border-none bg-red-600/90 px-4 py-3 text-[13px] font-semibold text-white shadow-[0_8px_24px_rgba(255,45,85,.35)] transition duration-300 hover:-translate-y-0.5 hover:bg-red-500 hover:shadow-[0_12px_32px_rgba(255,45,85,.45)]"
                            >
                                <i className="fa-solid fa-fire text-[12px]"></i>
                                Review Hotspots
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/heatmap')}
                                className="flex min-h-[44px] flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 py-3 text-[13px] font-semibold text-white backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-red-500/30 hover:bg-white/10"
                            >
                                Locate on Map
                                <span aria-hidden="true">↗</span>
                            </button>
                        </div>
                    </div>
                </div>
            </BentoCard>

            <StatGrid>
                {dashboardStats.map((stat) => (
                    <StatCard key={stat.label} stat={stat} />
                ))}
            </StatGrid>

            <PanelGrid>
                <Card>
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
                    <MiniHotspotList hotspots={priorityHotspots} />
                </Card>

                <Card>
                    <PanelHead title="Canopy vs Heat" />
                    <div className="relative h-[180px]">
                        {barangays ? <DashboardChart data={barangays} /> : null}
                    </div>
                    <p className="mt-[14px] text-center text-xs text-[#888]">
                        Inverse correlation across all monitored barangays
                    </p>
                </Card>
            </PanelGrid>
        </Page>
    );
}
