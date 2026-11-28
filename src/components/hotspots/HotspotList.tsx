import { useMemo, useRef, type KeyboardEvent } from 'react';
import type { Barangay } from '../../types';
import { SEVERITY_DOTS, SEVERITY_TEXT } from '../../utils/toneClasses';

/* ==========================
   HOTSPOT LIST
   The city as one ranked reading list: city rank, severity dot, name and
   driver, and the p90 temperature on the right. Hairline rows, no nested
   cards — the detail rail beside it carries the depth. Selection walks
   with the arrow keys, and ranks always follow the full city ranking,
   never the active filter.
========================== */

interface HotspotListProps {
    /** Visible rows in display order (already filtered and sorted). */
    rows: Barangay[];
    /** Full city ranking, hottest first — the source of true ranks. */
    cityRanking: Barangay[];
    selected: string | null;
    onSelect: (name: string) => void;
}

export default function HotspotList({
    rows,
    cityRanking,
    selected,
    onSelect,
}: HotspotListProps) {
    const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

    const rankByName = useMemo(() => {
        const ranks = new Map<string, number>();
        cityRanking.forEach((barangay, index) => {
            ranks.set(barangay.name, index + 1);
        });
        return ranks;
    }, [cityRanking]);

    // Arrow keys walk the ranking while a row has focus.
    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
        event.preventDefault();
        const next = event.key === 'ArrowDown' ? index + 1 : index - 1;
        const target = rows[next];
        if (!target) return;
        onSelect(target.name);
        rowRefs.current[next]?.focus();
    }

    return (
        <div
            role="group"
            aria-label="Hotspots ranked by p90 surface temperature"
            // The full detected set is long, so the ranked list scrolls
            // internally at every width (the inspector rail's scrollbar).
            className="inspector-scroll flex max-h-[560px] min-w-0 flex-col overflow-y-auto pr-1"
        >
            {rows.length === 0 ? (
                <p className="px-3 py-6 text-[13px] text-[#999]">
                    No readings match the current search or filter.
                </p>
            ) : (
                rows.map((barangay, index) => {
                    const isSelected = barangay.name === selected;
                    return (
                        <button
                            key={barangay.name}
                            ref={(el) => {
                                rowRefs.current[index] = el;
                            }}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelect(barangay.name)}
                            onKeyDown={(event) => onKeyDown(event, index)}
                            className={`flex w-full cursor-pointer items-center gap-3 border-b border-white/6 px-3 py-[10px] text-left transition duration-200 last:border-b-0 hover:bg-white/[.04] focus-visible:bg-white/[.06] focus-visible:outline-none ${
                                isSelected ? 'bg-white/[.07]' : ''
                            }`}
                        >
                            <span className="w-[22px] shrink-0 text-right text-[11px] font-semibold tabular-nums text-[#777]">
                                {rankByName.get(barangay.name) ?? '—'}
                            </span>
                            <span
                                className={`h-[9px] w-[9px] shrink-0 rounded-full transition-transform duration-200 motion-reduce:transition-none ${SEVERITY_DOTS[barangay.severity]} ${
                                    isSelected ? 'scale-125' : 'scale-100'
                                }`}
                            ></span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13.5px] font-medium text-[#ddd]">
                                    {barangay.name}
                                </span>
                                <span className="block truncate text-[11px] text-[#888]">
                                    {barangay.driver}
                                </span>
                            </span>
                            <span
                                className={`shrink-0 text-[14.5px] font-semibold tabular-nums ${SEVERITY_TEXT[barangay.severity]}`}
                            >
                                {barangay.temp.toFixed(1)}°
                            </span>
                        </button>
                    );
                })
            )}
        </div>
    );
}
