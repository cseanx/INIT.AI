import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import StatCard from '../components/dashboard/StatCard';
import {
    CanopyBarChart,
    CanopyTrendChart,
    LandCoverChart,
} from '../components/canopy/CanopyCharts';
import CanopyTable from '../components/canopy/CanopyTable';
import PriorityZones from '../components/canopy/PriorityZones';
import Card from '../components/common/Card';
import { canopyStats } from '../data/mockData';

const PANEL_HEAD_CLASSES =
    'panel-head mb-5 flex flex-wrap items-center justify-between gap-3';

export default function Canopy() {
    const canopy = useApiData(api.getCanopy);
    const barangays = useApiData(api.getHotspots);

    return (
        <div className="animate-view-in">
            <section className="mx-5 mb-[30px] grid grid-cols-4 gap-5 max-[1200px]:grid-cols-2">
                {canopyStats.map((stat) => (
                    <StatCard key={stat.label} stat={stat} />
                ))}
            </section>

            {canopy ? (
                <section className="mx-5 mb-[30px] grid grid-cols-[1.6fr_1fr] gap-5 max-[1200px]:grid-cols-1">
                    <Card>
                        <div className={PANEL_HEAD_CLASSES}>
                            <h3 className="text-lg font-semibold">Canopy Coverage by Barangay</h3>
                        </div>
                        <div className="relative h-[280px]">
                            <CanopyBarChart data={canopy} />
                        </div>
                    </Card>
                    <Card>
                        <div className={PANEL_HEAD_CLASSES}>
                            <h3 className="text-lg font-semibold">5-Year Canopy Trend</h3>
                        </div>
                        <div className="relative h-[280px]">
                            <CanopyTrendChart data={canopy} />
                        </div>
                        <p className="mt-[14px] text-center text-xs font-semibold text-accent">
                            Overall Canopy Change: -2.8% since 2021
                        </p>
                    </Card>
                </section>
            ) : null}

            {canopy ? (
                <section className="mx-5 mb-[30px] grid grid-cols-[1.6fr_1fr] gap-5 max-[1200px]:grid-cols-1">
                    <Card>
                        <div className={PANEL_HEAD_CLASSES}>
                            <h3 className="text-lg font-semibold">Land Cover Composition</h3>
                        </div>
                        <div className="relative h-[450px]">
                            <LandCoverChart data={canopy} />
                        </div>
                        <p className="mt-[14px] text-center text-xs text-[#777]">
                            City-wide, 2026 satellite classification
                        </p>
                    </Card>
                    <Card>
                        <div className={PANEL_HEAD_CLASSES}>
                            <h3 className="text-lg font-semibold">Priority Replanting Zones</h3>
                            <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-xs text-[#999]">
                                Ranked by urgency
                            </span>
                        </div>
                        <PriorityZones zones={canopy.priorityZones} />
                    </Card>
                </section>
            ) : null}

            <Card>
                <div className={PANEL_HEAD_CLASSES}>
                    <h3 className="text-lg font-semibold">Canopy Detail by Barangay</h3>
                </div>
                {barangays ? <CanopyTable barangays={barangays} /> : null}
            </Card>
        </div>
    );
}
