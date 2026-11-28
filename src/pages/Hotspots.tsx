import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { useCity } from '../contexts/CityContext';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import ThermalLadder from '../components/hotspots/ThermalLadder';
import HotspotRail from '../components/hotspots/HotspotRail';
import HotspotFilter, { type HotspotFilterValue } from '../components/hotspots/HotspotFilter';
import type { Barangay } from '../types';

/* ==========================
   HOTSPOTS — the city on one thermometer.
   Instead of a ranked table, every barangay sits at its true peak
   temperature on a shared thermal ladder; selecting a reading opens the
   detail rail. The severity filter re-weights the instrument, and the
   sort order flips it. Deep links (?q=) pre-select their barangay.
========================== */

function matchesQuery(b: Barangay, term: string): boolean {
    const t = term.toLowerCase();
    return (
        b.name.toLowerCase().includes(t) || (b.driver ?? '').toLowerCase().includes(t)
    );
}

function LadderSkeleton() {
    return (
        <div
            className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-7"
            aria-hidden="true"
        >
            <div className="relative h-[520px]">
                <div className="absolute bottom-0 top-0 w-[12px] rounded-full bg-white/5" style={{ left: 46 }} />
                {[92, 168, 240, 318, 402].map((top) => (
                    <div key={top} className="absolute left-[64px] h-3 w-3 animate-pulse rounded-full bg-white/10" style={{ top }} />
                ))}
                {[80, 150, 226, 308, 396].map((top) => (
                    <div key={top} className="absolute left-[252px] h-[16px] w-[190px] animate-pulse rounded-full bg-white/5" style={{ top }} />
                ))}
            </div>
            <div className="flex flex-col gap-3 border-t border-white/8 pt-5 lg:border-l lg:border-t-0 lg:pl-7">
                <div className="h-[22px] w-[160px] animate-pulse rounded-full bg-white/5" />
                <div className="h-[44px] w-[120px] animate-pulse rounded-[10px] bg-white/5" />
                <div className="h-[16px] w-[220px] animate-pulse rounded-full bg-white/5" />
                <div className="mt-4 h-[110px] w-full animate-pulse rounded-[12px] bg-white/5" />
                <div className="mt-2 h-[60px] w-full animate-pulse rounded-[12px] bg-white/5" />
            </div>
        </div>
    );
}

export default function Hotspots() {
    const { selected: activeCity, setSelected: setActiveCity } = useCity();
    const snapshot = useApiData(api.getHotspotSnapshot);
    const allHotspots = snapshot?.items ?? null;
    // The real 8-day run has 82 above-median barangays; the ladder is legible
    // with the top 17. The meta still reports the full detected set.
    const hotspots = useMemo(
        () => (allHotspots ? allHotspots.slice(0, 17) : null),
        [allHotspots],
    );
    const [searchParams, setSearchParams] = useSearchParams();
    const query = (searchParams.get('q') ?? '').trim();
    const [filter, setFilter] = useState<HotspotFilterValue>('all');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<string | null>(null);

    const counts = useMemo(() => {
        const c = { critical: 0, high: 0, moderate: 0 };
        (hotspots ?? []).forEach((b) => {
            if (b.severity === 'critical' || b.severity === 'high' || b.severity === 'moderate') {
                c[b.severity] += 1;
            }
        });
        return { all: hotspots?.length ?? 0, ...c };
    }, [hotspots]);

    const visible = useMemo(
        () => (hotspots ?? []).filter((b) => filter === 'all' || b.severity === filter),
        [hotspots, filter],
    );
    const ladderRows = useMemo(
        () => [...visible].sort((a, b) => (order === 'desc' ? b.temp - a.temp : a.temp - b.temp)),
        [visible, order],
    );

    // Deep links pre-select their barangay; anything else opens on the
    // hottest reading so the rail is never empty.
    useEffect(() => {
        if (!hotspots) return;
        const hottest = [...hotspots].sort((a, b) => b.temp - a.temp)[0]?.name ?? null;
        if (query) {
            const match = [...hotspots]
                .sort((a, b) => b.temp - a.temp)
                .find((b) => matchesQuery(b, query));
            setSelected((current) => match?.name ?? current ?? hottest);
        } else {
            setSelected((current) => current ?? hottest);
        }
    }, [hotspots, query]);

    // A severity change can strand the selection on a hidden reading.
    useEffect(() => {
        if (!hotspots || !selected) return;
        if (visible.some((b) => b.name === selected)) return;
        setSelected(
            [...visible].sort((a, b) => b.temp - a.temp)[0]?.name ?? null,
        );
    }, [hotspots, selected, visible]);

    const qMiss = !!hotspots && !!query && !hotspots.some((b) => matchesQuery(b, query));
    const selectedBarangay = hotspots?.find((b) => b.name === selected) ?? null;

    // Thermal neighbours come from the full city ranking, not the filter.
    const cityRanking = useMemo(
        () => (hotspots ? [...hotspots].sort((a, b) => b.temp - a.temp) : []),
        [hotspots],
    );
    const rankIndex = selectedBarangay
        ? cityRanking.findIndex((b) => b.name === selectedBarangay.name)
        : -1;
    const hotter = rankIndex > 0 ? cityRanking[rankIndex - 1] : null;
    const cooler =
        rankIndex >= 0 && rankIndex < cityRanking.length - 1
            ? cityRanking[rankIndex + 1]
            : null;

    if (activeCity !== 'Quezon City') {
        return (
            <Page>
                <Card>
                    <PanelHead
                        title="Hotspot pilot"
                        actions={
                            <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-[12px] text-[#999]">
                                Quezon City only
                            </span>
                        }
                    />
                    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
                        <i className="fa-solid fa-satellite-dish text-[26px] text-[#777]"></i>
                        <h2 className="max-w-[34ch] text-[18px] font-semibold leading-snug text-white">
                            The real 8-day hotspot pilot currently covers Quezon City only.
                        </h2>
                        <p className="max-w-[52ch] text-[13px] leading-[1.7] text-[#999]">
                            Barangay boundaries, clear-sky filtering, and severity
                            thresholds are built for Quezon City&rsquo;s 142 barangays.{' '}
                            {activeCity} will get its own snapshot when the pilot expands;
                            no other city is shown with borrowed data.
                        </p>
                        <button
                            type="button"
                            onClick={() => setActiveCity('Quezon City')}
                            className="mt-2 inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-[12px] border border-white/14 bg-white/6 px-4 text-[13px] font-semibold text-white transition hover:bg-white/10"
                        >
                            <i className="fa-solid fa-city text-[12px] text-accent"></i>
                            Switch to Quezon City
                        </button>
                    </div>
                </Card>
            </Page>
        );
    }

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

                {qMiss ? (
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-[12.5px] text-[#bbb]">
                        <i className="fa-solid fa-magnifying-glass text-[11px] text-accent"></i>
                        No hotspot matches
                        <strong className="text-white">&ldquo;{query}&rdquo;</strong>
                        <button
                            type="button"
                            onClick={() => setSearchParams({})}
                            className="cursor-pointer rounded-full border border-white/12 bg-white/[.05] px-2.5 py-1 text-[11.5px] font-semibold text-white transition hover:bg-white/10"
                        >
                            Clear
                        </button>
                    </div>
                ) : null}

                {hotspots ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-7">
                        <ThermalLadder
                            barangays={ladderRows}
                            order={order}
                            selected={selected}
                            onSelect={setSelected}
                        />
                        <div className="min-w-0 border-t border-white/8 pt-5 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0">
                            {selectedBarangay ? (
                                <HotspotRail
                                    hotspot={selectedBarangay}
                                    rank={rankIndex + 1}
                                    total={cityRanking.length}
                                    hotter={hotter}
                                    cooler={cooler}
                                    onSelect={setSelected}
                                />
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <LadderSkeleton />
                )}

                <p className="mt-5 flex items-center gap-2 border-t border-white/6 pt-4 text-[12px] text-[#888]">
                    <i className="fa-solid fa-satellite text-[11.5px] text-mint"></i>
                    {snapshot ? (
                        <>
                            Real 8-day snapshot · {snapshot.meta.period_start} to{' '}
                            {snapshot.meta.period_end} · {snapshot.meta.hotspot_count} above
                            median, showing top {hotspots?.length ?? 0}
                            {snapshot.meta.no_data_count > 0
                                ? ` · ${snapshot.meta.no_data_count} without clear-sky data`
                                : ''}
                            <span className="text-[#666]">
                                {snapshot.meta.storage === 'bundled'
                                    ? ' · bundled snapshot'
                                    : ' · latest snapshot'}
                            </span>
                        </>
                    ) : (
                        'Loading the real Quezon City hotspot snapshot…'
                    )}
                </p>
            </Card>
        </Page>
    );
}
