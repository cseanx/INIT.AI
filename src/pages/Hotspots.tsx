import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { useCity } from '../contexts/CityContext';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import HotspotList from '../components/hotspots/HotspotList';
import HotspotRail from '../components/hotspots/HotspotRail';
import HotspotFilter, { type HotspotFilterValue } from '../components/hotspots/HotspotFilter';
import type { Barangay } from '../types';

/* The search field mirrors the reports filter rail's input so both list
   pages read as one system. */
const SEARCH_INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/10 bg-white/[.04] p-[10px_34px_10px_38px] text-[16px] text-white outline-none transition duration-200 placeholder:text-[#888] focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)] sm:text-[13.5px] [&::-webkit-search-cancel-button]:hidden';

/* ==========================
   HOTSPOTS — the city on one thermometer.
   A ranked list of every detected hotspot; selecting a reading opens the
   detail rail on the right. The severity filter re-weights the list, the
   sort order flips it, and search narrows it by name or driver. Deep
   links (?q=) pre-select their barangay.
========================== */

function matchesQuery(b: Barangay, term: string): boolean {
    const t = term.toLowerCase();
    return (
        b.name.toLowerCase().includes(t) || (b.driver ?? '').toLowerCase().includes(t)
    );
}

function ListSkeleton() {
    return (
        <div
            className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-7"
            aria-hidden="true"
        >
            <div className="flex flex-col">
                {Array.from({ length: 10 }).map((_, index) => (
                    <div
                        key={index}
                        className="flex items-center gap-3 border-b border-white/6 px-3 py-[10px] last:border-b-0"
                    >
                        <div className="h-[12px] w-[16px] animate-pulse rounded-full bg-white/5" />
                        <div className="h-[9px] w-[9px] animate-pulse rounded-full bg-white/10" />
                        <div className="min-w-0 flex-1">
                            <div className="h-[14px] w-[150px] animate-pulse rounded-full bg-white/5" />
                            <div className="mt-1.5 h-[10px] w-[210px] animate-pulse rounded-full bg-white/5" />
                        </div>
                        <div className="h-[14px] w-[44px] animate-pulse rounded-full bg-white/5" />
                    </div>
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
    // The real 8-day run detects 82 above-median barangays; the list shows
    // all of them, ranked, under an internal scroll.
    const pool = snapshot?.items ?? null;
    const [searchParams, setSearchParams] = useSearchParams();
    // The search box owns the term; the ?q= deep link seeds it and stays in
    // sync (replace, so typing never spams browser history).
    const urlQuery = searchParams.get('q') ?? '';
    const [search, setSearch] = useState(urlQuery);
    const query = search.trim();
    const [filter, setFilter] = useState<HotspotFilterValue>('all');
    const [order, setOrder] = useState<'asc' | 'desc'>('desc');
    const [selected, setSelected] = useState<string | null>(null);

    const counts = useMemo(() => {
        const c = { critical: 0, high: 0, moderate: 0 };
        (pool ?? []).forEach((b) => {
            if (b.severity === 'critical' || b.severity === 'high' || b.severity === 'moderate') {
                c[b.severity] += 1;
            }
        });
        return { all: pool?.length ?? 0, ...c };
    }, [pool]);

    const visible = useMemo(
        () =>
            (pool ?? []).filter(
                (b) =>
                    (filter === 'all' || b.severity === filter) &&
                    matchesQuery(b, query),
            ),
        [pool, filter, query],
    );
    const rows = useMemo(
        () => [...visible].sort((a, b) => (order === 'desc' ? b.temp - a.temp : a.temp - b.temp)),
        [visible, order],
    );

    // Thermal neighbours and true ranks come from the full city ranking,
    // not the severity filter or the search.
    const cityRanking = useMemo(
        () => (pool ? [...pool].sort((a, b) => b.temp - a.temp) : []),
        [pool],
    );

    // Deep links and back/forward navigation drive the search box.
    useEffect(() => {
        setSearch(urlQuery);
    }, [urlQuery]);

    // Deep links pre-select their barangay; anything else opens on the
    // hottest reading so the rail is never empty.
    useEffect(() => {
        if (!pool) return;
        const hottest = cityRanking[0]?.name ?? null;
        if (query) {
            const match = cityRanking.find((b) => matchesQuery(b, query));
            setSelected((current) => match?.name ?? current ?? hottest);
        } else {
            setSelected((current) => current ?? hottest);
        }
    }, [pool, cityRanking, query]);

    // A severity change or a search can strand the selection on a hidden
    // reading; fall back to the hottest one still visible.
    useEffect(() => {
        if (!pool || !selected) return;
        if (visible.some((b) => b.name === selected)) return;
        setSelected(
            [...visible].sort((a, b) => b.temp - a.temp)[0]?.name ?? null,
        );
    }, [pool, selected, visible]);

    function handleSearchChange(value: string) {
        setSearch(value);
        setSearchParams(value ? { q: value } : {}, { replace: true });
    }

    const selectedBarangay = pool?.find((b) => b.name === selected) ?? null;

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

                <div className="relative mb-4 w-full sm:max-w-[420px]">
                    <i
                        className="fa-solid fa-magnifying-glass pointer-events-none absolute left-[14px] top-1/2 -translate-y-1/2 text-[12px] text-[#888]"
                        aria-hidden="true"
                    ></i>
                    <input
                        type="search"
                        value={search}
                        onChange={(event) => handleSearchChange(event.target.value)}
                        placeholder="Search barangay or driver…"
                        aria-label="Search hotspots"
                        className={SEARCH_INPUT_CLASSES}
                    />
                    {search ? (
                        <button
                            type="button"
                            onClick={() => handleSearchChange('')}
                            aria-label="Clear search"
                            className="absolute right-[8px] top-1/2 flex h-[26px] w-[26px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[#bbb] transition duration-200 hover:bg-white/10 hover:text-white"
                        >
                            <i className="fa-solid fa-xmark text-[11.5px]" aria-hidden="true"></i>
                        </button>
                    ) : null}
                </div>

                {pool ? (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_372px] lg:gap-7">
                        <HotspotList
                            rows={rows}
                            cityRanking={cityRanking}
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
                            ) : (
                                <p className="text-[13px] text-[#999]">
                                    Select a reading to inspect it here.
                                </p>
                            )}
                        </div>
                    </div>
                ) : (
                    <ListSkeleton />
                )}

                <p className="mt-5 flex items-center gap-2 border-t border-white/6 pt-4 text-[12px] text-[#888]">
                    <i className="fa-solid fa-satellite text-[11.5px] text-mint"></i>
                    {snapshot ? (
                        <>
                            Real 8-day snapshot · {snapshot.meta.period_start} to{' '}
                            {snapshot.meta.period_end} · {snapshot.meta.hotspot_count} above
                            median, all shown
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
