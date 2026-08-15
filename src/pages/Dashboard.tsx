import { useNavigate } from 'react-router-dom';
import StatCard from '../components/dashboard/StatCard';
import DashboardChart from '../components/dashboard/DashboardChart';
import { api } from '../services/api';
import { dashboardStats, priorityHotspots } from '../data/mockData';
import { useApiData } from '../hooks/useApiData';
import { SEVERITY_BADGES, SEVERITY_DOTS } from '../utils/toneClasses';
import type { Barangay } from '../types';

const PRIMARY_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[14px_24px] text-[14.5px] font-semibold text-white shadow-[0_10px_30px_rgba(255,45,85,.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(255,45,85,.42)]';
const SECONDARY_BTN_CLASSES =
    'cursor-pointer rounded-[14px] border border-white/[.14] bg-white/5 p-[14px_24px] text-[14.5px] font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-white/9';

function HotspotRow({ hotspot }: { hotspot: Barangay }) {
    return (
        <div className="flex items-center justify-between rounded-[16px] border border-white/6 bg-white/[.03] p-[14px_16px] transition duration-200 hover:bg-white/6">
            <div className="flex items-center gap-[14px]">
                <span className={`h-[10px] w-[10px] shrink-0 rounded-full ${SEVERITY_DOTS[hotspot.severity]}`}></span>
                <div>
                    <strong className="block text-sm font-semibold">{hotspot.name}</strong>
                    <small className="text-xs text-[#888]">{hotspot.driver}</small>
                </div>
            </div>
            <span
                className={`rounded-full p-[6px_14px] text-[15px] font-bold ${SEVERITY_BADGES[hotspot.severity]}`}
            >
                {hotspot.temp.toFixed(1)}°C
            </span>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const barangays = useApiData(api.getHotspots);

    return (
        <div className="animate-view-in">
            <section className="hero-panel relative mx-5 mb-[30px] flex items-center justify-between gap-10 overflow-hidden rounded-[28px] border border-white/8 bg-white/5 p-[44px_46px] backdrop-blur-[25px] shadow-[0_20px_60px_rgba(0,0,0,.35)]">
                <div className="relative z-10 max-w-[480px]">
                    <span className="mb-5 inline-block rounded-full border border-[rgba(255,85,85,.3)] bg-gradient-to-br from-[rgba(255,140,66,.2)] to-[rgba(255,45,85,.18)] px-4 py-2 text-[12.5px] tracking-[.03em] text-[#ff8899]">
                        AI Climate Intelligence
                    </span>
                    <h1 className="mb-[18px] bg-gradient-to-b from-white to-[#d8d8d8] bg-clip-text text-[44px] font-bold leading-[1.12] text-transparent">
                        Monitor.
                        <br />
                        Analyze.
                        <br />
                        Mitigate.
                    </h1>
                    <p className="mb-7 text-[15px] leading-[1.7] text-[#9f9f9f]">
                        Analyze urban heat islands using satellite imagery, AI-assisted hotspot
                        detection, and canopy assessment to support climate-smart decision making.
                    </p>
                    <div className="flex gap-[14px]">
                        <button className={PRIMARY_BTN_CLASSES} onClick={() => navigate('/heatmap')}>
                            Launch Analysis
                        </button>
                        <button className={SECONDARY_BTN_CLASSES} onClick={() => navigate('/heatmap')}>
                            Open Heat Map
                        </button>
                    </div>
                </div>

                <div className="relative z-10 shrink-0">
                    <div className="relative h-[340px] w-[320px] overflow-hidden rounded-[24px] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,.5)]">
                        <div className="thermal-visual absolute inset-0 bg-[#0a1220]">
                            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                                <img src="/assets/images/urban1.png" alt="" className="block h-full w-full object-cover saturate-[1.1] brightness-[.85]" />
                                <img src="/assets/images/urban3.png" alt="" className="block h-full w-full object-cover saturate-[1.1] brightness-[.85]" />
                                <img src="/assets/images/urban2.png" alt="" className="block h-full w-full object-cover saturate-[1.1] brightness-[.85]" />
                                <img src="/assets/images/urban4.png" alt="" className="block h-full w-full object-cover saturate-[1.1] brightness-[.85]" />
                            </div>
                            <div className="thermal-overlay"></div>
                        </div>
                        <div className="absolute left-[18px] top-[18px] flex items-center gap-2 rounded-full border border-white/12 bg-black/50 px-[14px] py-2 text-[11px] tracking-[.05em] backdrop-blur-[10px]">
                            <span className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_#ff2d55] animate-status-pulse-fast"></span>
                            LIVE SATELLITE
                        </div>
                        <div className="absolute bottom-[44px] left-[18px] text-[40px] font-bold [text-shadow:0_4px_20px_rgba(0,0,0,.6)]">
                            41.2°C
                        </div>
                        <div className="absolute bottom-[18px] left-[18px] right-[18px] text-[10.5px] text-[#ccc] [text-shadow:0_2px_8px_rgba(0,0,0,.6)]">
                            Payatas, Quezon City · Imagery © Esri, Maxar, Earthstar Geographics
                        </div>
                    </div>
                </div>
            </section>

            <section className="stat-grid mx-5 mb-[30px] grid grid-cols-4 gap-5 max-[1200px]:grid-cols-2">
                {dashboardStats.map((stat) => (
                    <StatCard key={stat.label} stat={stat} />
                ))}
            </section>

            <section className="panel-grid mx-5 mb-[30px] grid grid-cols-[1.6fr_1fr] gap-5 max-[1200px]:grid-cols-1">
                <div className="glass-panel mb-5 rounded-[24px] border border-white/8 bg-white/5 p-[26px] backdrop-blur-2xl">
                    <div className="panel-head mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">Priority Hotspots</h3>
                        <button
                            className="flex items-center gap-[6px] text-[13px] text-accent"
                            onClick={() => navigate('/hotspots')}
                        >
                            View all <i className="fa-solid fa-arrow-right"></i>
                        </button>
                    </div>
                    <div className="flex flex-col gap-[10px]">
                        {priorityHotspots.map((h) => (
                            <HotspotRow key={h.name} hotspot={h} />
                        ))}
                    </div>
                </div>

                <div className="glass-panel mb-5 rounded-[24px] border border-white/8 bg-white/5 p-[26px] backdrop-blur-2xl">
                    <div className="panel-head mb-5 flex flex-wrap items-center justify-between gap-3">
                        <h3 className="text-lg font-semibold">Canopy vs Heat</h3>
                    </div>
                    <div className="chart-wrap small relative h-[180px]">
                        {barangays ? <DashboardChart data={barangays} /> : null}
                    </div>
                    <p className="mt-[14px] text-center text-xs text-[#777]">
                        Inverse correlation across all monitored barangays
                    </p>
                </div>
            </section>
        </div>
    );
}
