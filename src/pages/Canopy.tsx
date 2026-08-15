import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import StatGrid from '../components/layout/StatGrid';
import PanelGrid from '../components/layout/PanelGrid';
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

export default function Canopy() {
    const canopy = useApiData(api.getCanopy);
    const barangays = useApiData(api.getHotspots);

    return (
        <Page>
            <StatGrid>
                {canopyStats.map((stat) => (
                    <StatCard key={stat.label} stat={stat} />
                ))}
            </StatGrid>

            {canopy ? (
                <PanelGrid>
                    <Card>
                        <PanelHead title="Canopy Coverage by Barangay" />
                        <div className="relative h-[280px]">
                            <CanopyBarChart data={canopy} />
                        </div>
                    </Card>
                    <Card>
                        <PanelHead title="5-Year Canopy Trend" />
                        <div className="relative h-[280px]">
                            <CanopyTrendChart data={canopy} />
                        </div>
                        <p className="mt-[14px] text-center text-xs font-semibold text-accent">
                            Overall Canopy Change: -2.8% since 2021
                        </p>
                    </Card>
                </PanelGrid>
            ) : null}

            {canopy ? (
                <PanelGrid>
                    <Card>
                        <PanelHead title="Land Cover Composition" />
                        <div className="relative h-[280px]">
                            <LandCoverChart data={canopy} />
                        </div>
                        <p className="mt-[14px] text-center text-xs text-[#777]">
                            City-wide, 2026 satellite classification
                        </p>
                    </Card>
                    <Card>
                        <PanelHead
                            title="Priority Replanting Zones"
                            actions={
                                <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-xs text-[#999]">
                                    Ranked by urgency
                                </span>
                            }
                        />
                        <PriorityZones zones={canopy.priorityZones} />
                    </Card>
                </PanelGrid>
            ) : null}

            <Card>
                <PanelHead title="Canopy Detail by Barangay" />
                {barangays ? <CanopyTable barangays={barangays} /> : null}
            </Card>
        </Page>
    );
}
