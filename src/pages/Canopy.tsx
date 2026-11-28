import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { useCity } from '../contexts/CityContext';
import Page from '../components/layout/Page';
import StatGrid from '../components/layout/StatGrid';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import StatCard from '../components/dashboard/StatCard';
import {
    CanopyBarChart,
    CanopyTrendChart,
    CanopyTrajectoryChart,
} from '../components/canopy/CanopyCharts';
import LandCoverDonut from '../components/canopy/LandCoverDonut';
import PriorityZones from '../components/canopy/PriorityZones';
import { canopyStats } from '../data/mockData';
import { InsightStrip, SplitPanel } from '../components/common/LayoutPrimitives';

export default function Canopy() {
    const canopy = useApiData(api.getCanopy);
    const { selected: activeCity, setSelected: setActiveCity } = useCity();
    const isPilotCity = activeCity === 'Quezon City';
    const hotspotData = useApiData(api.getHotspots);
    // Real tree cover and hotspots come from the QC pilot; other cities keep
    // the prototype canopy tiles but get no borrowed barangay readings.
    const barangays = isPilotCity ? hotspotData : null;

    const total = barangays?.length ?? 0;
    const trajectory = barangays?.filter(
        (b) => typeof b.canopyChange === 'number',
    );
    const trajectoryTotal = trajectory?.length ?? 0;
    const losing =
        trajectory?.filter((b) => typeof b.canopyChange === 'number' && b.canopyChange < 0)
            .length ?? 0;
    const thinShrinking =
        trajectory?.filter(
            (b) =>
                b.canopy < 18 &&
                typeof b.canopyChange === 'number' &&
                b.canopyChange < 0,
        ).length ?? 0;

    return (
        <Page>
            <p className="mb-4 flex items-center gap-2 text-[12px] text-[#888]">
                <i className="fa-solid fa-flask text-[11.5px] text-accent"></i>
                City-wide canopy statistics, trends, and priority zones remain prototype.
                Barangay tree cover in the detail card is real (ESA WorldCover 2021).
            </p>
            <StatGrid columns={3}>
                {canopyStats.map((stat, index) => (
                    <StatCard
                        key={stat.label}
                        stat={stat}
                        className={
                            canopyStats.length % 2 === 1 && index === canopyStats.length - 1
                                ? 'max-[1199px]:col-span-2 min-[1200px]:col-span-1'
                                : ''
                        }
                    />
                ))}
            </StatGrid>

            {canopy ? (
                <Card>
                    <PanelHead
                        title="Land Cover Composition"
                        actions={
                            <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-[12px] text-[#999]">
                                City-wide · 2026 classification
                            </span>
                        }
                    />
                    <LandCoverDonut data={canopy.landCover} />
                    <InsightStrip icon="fa-tree">
                        Built-up cover leads every other class — replanting is
                        concentrated in the lowest-canopy barangays below.
                    </InsightStrip>
                </Card>
            ) : null}

            {canopy ? (
                <Card>
                    <SplitPanel
                        left={
                            <>
                                <PanelHead title="Canopy Coverage by Barangay" />
                                <div className="relative h-[240px] sm:h-[260px]">
                                    <CanopyBarChart data={canopy} />
                                </div>
                            </>
                        }
                        right={
                            <>
                                <PanelHead title="5-Year Canopy Trend" />
                                <div className="relative h-[240px] sm:h-[260px]">
                                    <CanopyTrendChart data={canopy} />
                                </div>
                                <p className="mt-[10px] text-center text-xs font-semibold text-[#ff5577]">
                                    Overall canopy change: −2.8% since 2021
                                </p>
                            </>
                        }
                    />
                </Card>
            ) : null}

            {canopy ? (
                <Card>
                    <PanelHead
                        title="Priority Replanting Zones"
                        actions={
                            <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-[12px] text-[#999]">
                                {canopy.priorityZones.length} zones · ranked by urgency
                            </span>
                        }
                    />
                    <PriorityZones zones={canopy.priorityZones} />
                </Card>
            ) : null}

            <Card>
                <PanelHead
                    title="Canopy Detail by Barangay"
                    actions={
                        barangays ? (
                            <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-[12px] text-[#999]">
                                {trajectoryTotal > 0
                                    ? `${trajectoryTotal} barangays · canopy vs 5-yr change`
                                    : `${total} hotspots · current tree cover`}
                            </span>
                        ) : null
                    }
                />
                {!isPilotCity ? (
                    <div className="flex flex-col items-center gap-2 rounded-[16px] border border-dashed border-white/10 bg-white/[.02] px-6 py-12 text-center">
                        <i className="fa-solid fa-satellite-dish text-[20px] text-[#777]"></i>
                        <p className="text-[13px] font-semibold text-[#ddd]">
                            Barangay tree cover and hotspots cover Quezon City only
                        </p>
                        <p className="max-w-[46ch] text-[12px] leading-[1.6] text-[#888]">
                            The real canopy layer and 8-day hotspot snapshot in this pilot
                            are built for Quezon City. {activeCity} keeps the prototype
                            canopy tiles above.
                        </p>
                        <button
                            type="button"
                            onClick={() => setActiveCity('Quezon City')}
                            className="mt-1 inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-[10px] border border-white/12 bg-white/5 px-3.5 text-[12.5px] font-semibold text-white transition hover:bg-white/10"
                        >
                            <i className="fa-solid fa-city text-[11px] text-accent"></i>
                            Switch to Quezon City
                        </button>
                    </div>
                ) : barangays ? (
                    <>
                        <div
                            className="relative h-[290px] sm:h-[340px]"
                            role="img"
                            aria-label={
                                trajectoryTotal > 0
                                    ? `Canopy cover versus five-year change for ${trajectoryTotal} barangays`
                                    : 'Five-year canopy change is not available yet'
                            }
                        >
                            <CanopyTrajectoryChart data={barangays} />
                        </div>
                        {trajectoryTotal > 0 ? (
                            <InsightStrip icon="fa-arrow-trend-down">
                                {losing} of {trajectoryTotal} barangays lost canopy over five
                                years — {thinShrinking} of them sit below the 18% line and are
                                still shrinking.
                            </InsightStrip>
                        ) : (
                            <InsightStrip icon="fa-circle-info">
                                Current tree cover is real (ESA WorldCover 2021). Five-year
                                change needs a historical canopy epoch, so this chart shows an
                                explicit unavailable state rather than demo values.
                            </InsightStrip>
                        )}
                    </>
                ) : null}
            </Card>
        </Page>
    );
}
