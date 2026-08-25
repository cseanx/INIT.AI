import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { metaFor } from '../../routes';
import { useClock } from '../../hooks/useClock';
import CitySelector from '../common/CitySelector';
import { useBentoFx } from '../common/BentoCard';

/**
 * Collapsing search: a compact icon button that smoothly expands into the
 * full search field when clicked. Collapses again on outside click or
 * Escape; typed text is preserved while hidden.
 */
function SearchBar() {
    const [open, setOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) inputRef.current?.focus();
    }, [open]);

    useEffect(() => {
        function onDocumentClick(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, []);

    return (
        <div
            ref={rootRef}
            role="search"
            className={`search flex h-[46px] items-center gap-3 overflow-hidden rounded-[16px] border border-white/5 bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open
                    ? 'w-[280px] cursor-text px-[18px]'
                    : 'w-[46px] cursor-pointer justify-center hover:bg-white/8'
            }`}
            onClick={() => {
                setOpen(true);
                inputRef.current?.focus();
            }}
        >
            <i className="fa-solid fa-magnifying-glass shrink-0"></i>
            <input
                ref={inputRef}
                type="text"
                placeholder="Search barangay, report..."
                aria-label="Search barangay, report"
                tabIndex={open ? 0 : -1}
                className={`border-none bg-transparent text-white outline-none transition-opacity duration-200 ${
                    open ? 'w-full opacity-100' : 'w-0 opacity-0'
                }`}
            />
        </div>
    );
}

export default function Topbar() {
    const { pathname } = useLocation();
    const meta = metaFor(pathname);
    const { time, date } = useClock();
    const { ref, className: bentoClassName, style } = useBentoFx({ particleCount: 0 });

    return (
        <header
            ref={ref}
            className={`${bentoClassName} topbar relative z-20 mb-5 flex shrink-0 items-center justify-between rounded-[24px] border border-white/8 bg-white/5 p-[22px_28px] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,.35)]`}
            style={{ ...style, overflow: 'visible' }}
        >
            <div>
                <h1 id="topbarTitle" className="text-[36px]">
                    {meta.title}
                </h1>
                <p id="topbarSub" className="mt-2 text-[#777]">
                    {meta.sub}
                </p>
            </div>

            <div className="topbar-right flex items-center gap-[25px]">
                <SearchBar />

                <CitySelector />

                <div className="datetime flex flex-col items-end gap-1">
                    <span className="date text-xs tracking-[.02em] text-[#888]" id="dateDisplay">
                        {date}
                    </span>
                    <span className="clock text-[15px] font-semibold" id="clockDisplay">
                        {time}
                    </span>
                </div>
            </div>
        </header>
    );
}
