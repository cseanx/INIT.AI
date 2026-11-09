import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import HotspotTable from '../components/hotspots/HotspotTable';
import HotspotFilter, { type HotspotFilterValue } from '../components/hotspots/HotspotFilter';
import { SEVERITY_BADGES } from '../utils/toneClasses';

export default function Hotspots() {
    const hotspots = useApiData(api.getHotspots);
    const [searchParams, setSearchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
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
        const term = query.toLowerCase();
        const base = (hotspots ?? [])
            .filter((b) => filter === 'all' || b.severity === filter)
            .filter(
                (b) =>
                    !term ||
                    b.name.toLowerCase().includes(term) ||
                    (b.driver ?? '').toLowerCase().includes(term),
            );
        return [...base].sort((a, b) =>
            order === 'desc' ? b.temp - a.temp : a.temp - b.temp,
        );
    }, [hotspots, filter, order, query]);

    const total = counts.all || 1;
    const avgPeak = hotspots?.length
        ? hotspots.reduce((sum, b) => sum + b.temp, 0) / hotspots.length
        : null;
    const hottest = hotspots?.length
        ? [...hotspots].sort((a, b) => b.temp - a.temp)[0]
        : null;

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Detected Hotspots"
                    actions={
                        <div className="flex flex-wrap items-center gap-2">
                            <Link
                                to="/heatmap"
                                className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-white/10 bg-white/[.04] px-4 text-[12.5px] font-semibold text-[#ddd] transition hover:bg-white/9 hover:text-white"
                            >
                                <i className="fa-solid fa-map-location-dot text-[12px] text-accent"></i>
                                Open Heat Map
                            </Link>
                            <HotspotFilter
                                filter={filter}
                                onFilterChange={setFilter}
                                order={order}
                                onOrderChange={setOrder}
                                counts={counts}
                            />
                        </div>
                    }
                />

                {query ? (
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-[#bbb]">
                        <i className="fa-solid fa-magnifying-glass text-[11px] text-accent"></i>
                        Showing matches for
                        <strong className="text-white">&ldquo;{query}&rdquo;</strong>
                        <button
                            type="button"
                            onClick={() => setSearchParams({})}
                            className="cursor-pointer rounded-full border border-white/12 bg-white/[.05] px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-white/10"
                        >
                            Clear search
                        </button>
                    </div>
                ) : null}

                <div className="mb-5 grid grid-cols-2 gap-x-6 gap-y-4 border-b border-white/6 pb-5 sm:grid-cols-4">
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Hotspots tracked
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums">
                            {counts.all}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">barangays ranked</span>
                    </div>
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Critical
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums text-[#ff5577]">
                            {counts.critical}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">act first</span>
                    </div>
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Average peak
                        </span>
                        <strong className="mt-1 block text-[26px] font-bold leading-none tabular-nums">
                            {avgPeak != null ? `${avgPeak.toFixed(1)}°C` : '—'}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">across monitored areas</span>
                    </div>
                    <div>
                        <span className="block text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Hottest area
                        </span>
                        <strong className="mt-1 block truncate text-[16px] font-semibold leading-tight">
                            {hottest?.name ?? '—'}
                        </strong>
                        <span className="mt-1 block text-[12px] text-[#888]">
                            {hottest ? `${hottest.temp.toFixed(1)}°C peak` : 'no reading'}
                        </span>
                    </div>
                </div>

                <div className="mb-5">
                    <div className="flex h-[10px] overflow-hidden rounded-full border border-white/10 bg-white/5">
                        {(['critical', 'high', 'moderate'] as const).map((severity) => (
                            <span
                                key={severity}
                                className={
                                    severity === 'critical'
                                        ? 'bg-[#ff2d55]'
                                        : severity === 'high'
                                          ? 'bg-[#ff8c42]'
                                          : 'bg-[#ffd23f]'
                                }
                                style={{ width: `${(counts[severity] / total) * 100}%` }}
                            />
                        ))}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                        {(['critical', 'high', 'moderate'] as const).map((severity) => (
                            <span key={severity} className="flex items-center gap-1.5 text-[#b4b4b4]">
                                <span
                                    className={`rounded-full px-1.5 py-0.5 text-[12px] font-semibold ${SEVERITY_BADGES[severity]}`}
                                >
                                    {counts[severity]}
                                </span>
                                {severity[0].toUpperCase() + severity.slice(1)}
                            </span>
                        ))}
                        <span className="ml-auto flex items-center gap-1.5 text-[12px] text-[#888]">
                            <i className="fa-solid fa-flask text-[11.5px] text-accent"></i>
                            Prototype dataset — mock observations
                        </span>
                    </div>
                </div>

                {hotspots ? <HotspotTable hotspots={rows} /> : null}
                {hotspots && rows.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-10 text-center">
                        <i className="fa-solid fa-filter-circle-xmark text-[20px] text-[#999]"></i>
                        <p className="text-[13px] text-[#bbb]">
                            {query
                                ? `No hotspots match “${query}”.`
                                : 'No hotspots match this severity.'}
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                if (query) setSearchParams({});
                                setFilter('all');
                            }}
                            className="min-h-[40px] cursor-pointer rounded-full border border-white/12 bg-white/[.05] px-4 text-[12.5px] font-semibold text-white hover:bg-white/10"
                        >
                            Show all hotspots
                        </button>
                    </div>
                ) : null}
            </Card>
        </Page>
    );
}
