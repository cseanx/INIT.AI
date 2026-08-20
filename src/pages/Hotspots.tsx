import { useMemo, useState } from 'react';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import HotspotTable from '../components/hotspots/HotspotTable';
import HotspotFilter, { type HotspotFilterValue } from '../components/hotspots/HotspotFilter';

export default function Hotspots() {
    const hotspots = useApiData(api.getHotspots);
    const [filter, setFilter] = useState<HotspotFilterValue>('all');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');

    const counts = useMemo(() => {
        const c = { critical: 0, high: 0, moderate: 0 };
        (hotspots ?? []).forEach((b) => {
            if (b.severity === 'critical' || b.severity === 'high' || b.severity === 'moderate') {
                c[b.severity] += 1;
            }
        });
        return { all: hotspots?.length ?? 0, ...c };
    }, [hotspots]);

    const rows = useMemo(() => {
        const base = filter === 'all' ? hotspots : hotspots?.filter((b) => b.severity === filter);
        return [...(base ?? [])].sort((a, b) =>
            order === 'desc' ? b.temp - a.temp : a.temp - b.temp,
        );
    }, [hotspots, filter, order]);

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Detected Hotspots"
                    actions={
                        <HotspotFilter
                            filter={filter}
                            onFilterChange={setFilter}
                            order={order}
                            onOrderChange={setOrder}
                            counts={counts}
                        />
                    }
                />
                {hotspots ? <HotspotTable hotspots={rows} /> : null}
            </Card>
        </Page>
    );
}