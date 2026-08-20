import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Severity } from '../../types';

export type HotspotFilterValue = 'all' | Severity;

const CHIP_CLASSES =
    'cursor-pointer rounded-full border border-white/10 bg-white/[.04] px-3 py-[6px] text-[12px] text-[#aaa] transition duration-200 hover:bg-white/8 hover:text-white';

export interface HotspotFilterProps {
    filter: HotspotFilterValue;
    onFilterChange: (value: HotspotFilterValue) => void;
    order: 'asc' | 'desc';
    onOrderChange: (order: 'asc' | 'desc') => void;
    counts: Record<HotspotFilterValue, number>;
}

/** Filter + sort popover for the hotspots table (severity + temperature order). */
export default function HotspotFilter({
    filter,
    onFilterChange,
    order,
    onOrderChange,
    counts,
}: HotspotFilterProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onDocumentClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    const active = filter !== 'all' || order !== 'desc';
    const filterLabel = filter === 'all' ? 'All' : filter[0].toUpperCase() + filter.slice(1);

    const options: { value: HotspotFilterValue; label: string }[] = [
        { value: 'all', label: 'All' },
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'moderate', label: 'Moderate' },
    ];

    function SectionLabel({ children }: { children: ReactNode }) {
        return (
            <p className="px-[6px] pb-[6px] text-[10px] font-semibold uppercase tracking-[.14em] text-[#777]">
                {children}
            </p>
        );
    }

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="menu"
                aria-expanded={open}
                className={`cursor-pointer rounded-full border px-4 py-[9px] text-[13px] transition duration-200 ${
                    active
                        ? 'border-[rgba(var(--accent-glow),.45)] bg-[rgba(var(--accent-glow),.18)] text-white'
                        : 'border-white/10 bg-white/[.04] text-[#aaa] hover:bg-white/8 hover:text-white'
                }`}
            >
                <i className="fa-solid fa-filter mr-[7px] text-[11px]"></i>
                {filterLabel}
                <i className="fa-solid fa-chevron-down ml-[8px] text-[10px] text-[#888]"></i>
            </button>

            {open ? (
                <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 flex w-[240px] flex-col gap-0.5 rounded-[14px] border border-white/10 bg-[#101010]/95 p-[10px] shadow-[0_16px_40px_rgba(0,0,0,.55)] backdrop-blur-2xl"
                >
                    <SectionLabel>Severity</SectionLabel>
                    <div className="mb-[8px] flex flex-wrap gap-[6px]">
                        {options.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                role="menuitemradio"
                                aria-checked={filter === option.value}
                                onClick={() => onFilterChange(option.value)}
                                className={`${CHIP_CLASSES} ${
                                    filter === option.value ? 'chip-btn active' : ''
                                }`}
                            >
                                {option.label} ({counts[option.value]})
                            </button>
                        ))}
                    </div>

                    <div className="my-[4px] border-t border-white/8" />

                    <SectionLabel>Sort by Peak Temp</SectionLabel>
                    <button
                        type="button"
                        role="menuitem"
                        onClick={() => onOrderChange(order === 'asc' ? 'desc' : 'asc')}
                        className="flex cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-white/10 bg-white/[.04] p-[10px_12px] text-left text-[13px] text-white transition duration-200 hover:bg-white/8"
                    >
                        <span className="flex items-center gap-[9px]">
                            <i
                                className={`fa-solid ${
                                    order === 'desc'
                                        ? 'fa-arrow-down-short-wide'
                                        : 'fa-arrow-up-short-wide'
                                } text-[12px] text-accent`}
                            ></i>
                            {order === 'desc' ? 'Descending' : 'Ascending'}
                        </span>
                        <i className="fa-solid fa-repeat text-[10px] text-[#777]"></i>
                    </button>
                </div>
            ) : null}
        </div>
    );
}