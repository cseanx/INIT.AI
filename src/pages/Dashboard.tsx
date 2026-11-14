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
                    <div className="flex w-full max-w-[400px] flex-col items-start">
                        <div className="flex w-full items-center justify-between gap-3">
                            <span className="flex items-center gap-2.5">
                                <span className="relative flex h-2 w-2 shrink-0">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-60"></span>
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500 shadow-[0_0_10px_rgba(255,45,85,.9)]"></span>
                                </span>
                                <span className="text-[10.5px] font-semibold uppercase tracking-[.13em] text-red-400">
                                    Payatas · critical hotspot
                                </span>
                            </span>
                            <span className="shrink-0 rounded-full border border-white/10 px-2 py-[3px] text-[9.5px] font-medium uppercase tracking-[.08em] text-white/55">
                                Demo
                            </span>
                        </div>

                        <p className="mt-5 font-mono text-[56px] font-bold leading-none tracking-[-.05em] text-white sm:text-[62px]">
                            41.2
                            <span className="ml-1 align-top font-sans text-[20px] font-semibold tracking-normal text-white/70">
                                °C
                            </span>
                        </p>

                        <p className="mt-3 text-[12.5px] font-medium text-red-400">
                            +4.8°C <span className="font-normal text-white/60">above baseline</span>
                            <span className="mx-1.5 text-white/30">·</span>
                            <span className="font-normal text-white/60">12% canopy</span>
                        </p>

                        <Link
                            to="/hotspots?q=Payatas"
                            className="mt-6 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-white transition hover:text-red-300"
                        >
                            Inspect hotspot
                            <i className="fa-solid fa-arrow-right text-[11px] text-red-400" aria-hidden="true"></i>
                        </Link>
                    </div>
                </div>
            </BentoCard>

            <StatGrid>
                {dashboardStats.map((stat) => (
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
                            <MiniHotspotList hotspots={priorityHotspots} />
                        </>
                    }
                    right={
                        <>
                            <PanelHead title="Canopy vs Heat" />
                            <div className="relative h-[180px] sm:h-[200px]">
                                {barangays ? <DashboardChart data={barangays} /> : null}
                            </div>
                            <p className="mt-[10px] text-center text-xs text-[#888]">
                                Inverse correlation across all monitored barangays
                            </p>
                        </>
                    }
                />
            </Card>
        </Page>
    );
}
