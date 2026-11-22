import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
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
    const barangays = useApiData(api.getHotspots);

    const total = barangays?.length ?? 0;
    const losing = barangays?.filter((b) => b.canopyChange < 0).length ?? 0;
    const thinShrinking =
        barangays?.filter((b) => b.canopy < 18 && b.canopyChange < 0).length ?? 0;

    return (
        <Page>
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
                                {total} barangays · canopy vs 5-yr change
                            </span>
                        ) : null
                    }
                />
                {barangays ? (
                    <>
                        <div
                            className="relative h-[290px] sm:h-[340px]"
                            role="img"
                            aria-label={`Canopy cover versus five-year change for ${total} barangays`}
                        >
                            <CanopyTrajectoryChart data={barangays} />
                        </div>
                        {total > 0 ? (
                            <InsightStrip icon="fa-arrow-trend-down">
                                {losing} of {total} barangays lost canopy over five years —{' '}
                                {thinShrinking} of them sit below the 18% line and are still
                                shrinking.
                            </InsightStrip>
                        ) : null}
                    </>
                ) : null}
            </Card>
        </Page>
    );
}
