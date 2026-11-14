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
    LandCoverChart,
} from '../components/canopy/CanopyCharts';
import CanopyTable from '../components/canopy/CanopyTable';
import PriorityZones from '../components/canopy/PriorityZones';
import { canopyStats } from '../data/mockData';
import {
    InsightStrip,
    LedgerList,
    LedgerRow,
    SplitPanel,
} from '../components/common/LayoutPrimitives';

export default function Canopy() {
    const canopy = useApiData(api.getCanopy);
    const barangays = useApiData(api.getHotspots);

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
                    <SplitPanel
                        left={
                            <div className="relative h-[260px]">
                                <LandCoverChart data={canopy} showLegend={false} />
                            </div>
                        }
                        right={
                            <>
                                <LedgerList>
                                    {canopy.landCover.map((entry) => (
                                        <LedgerRow
                                            key={entry.label}
                                            media={
                                                <span
                                                    className="inline-block h-2.5 w-2.5 rounded-full"
                                                    style={{ background: entry.color }}
                                                ></span>
                                            }
                                            title={entry.label}
                                            bar={{
                                                value: entry.value,
                                                tone: 'neutral',
                                                label: `${entry.value}%`,
                                            }}
                                        />
                                    ))}
                                </LedgerList>
                                <InsightStrip icon="fa-tree">
                                    Built-up cover leads every other class — replanting is
                                    concentrated in the lowest-canopy barangays below.
                                </InsightStrip>
                            </>
                        }
                    />
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
                <PanelHead title="Canopy Detail by Barangay" />
                {barangays ? <CanopyTable barangays={barangays} /> : null}
            </Card>
        </Page>
    );
}