import { useEffect, useRef, useState, type Ref } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { metaFor } from '../../routes';
import { useClock } from '../../hooks/useClock';
import CitySelector from '../common/CitySelector';
import StellarIndicator from './StellarIndicator';
import { useBentoFx } from '../common/BentoCard';

/**
 * Collapsing search: a compact icon button that smoothly expands into the
 * full field. Submitting routes to Hotspots with a text filter applied, so
 * the control is functional rather than decorative.
 */
function SearchBar() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
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

    function submit(e: React.FormEvent) {
        e.preventDefault();
        const term = value.trim();
        if (!term) return;
        setOpen(false);
        navigate(`/hotspots?q=${encodeURIComponent(term)}`);
    }

    return (
        <form
            ref={rootRef as unknown as Ref<HTMLFormElement>}
            role="search"
            onSubmit={submit}
            className={`search flex h-[44px] items-center gap-3 overflow-hidden rounded-[14px] border border-white/5 bg-white/5 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                open
                    ? 'w-[240px] cursor-text px-[16px] sm:w-[280px] sm:px-[18px]'
                    : 'w-[44px] cursor-pointer justify-center hover:bg-white/8'
            }`}
            onClick={() => {
                setOpen(true);
                inputRef.current?.focus();
            }}
        >
            <button
                type="submit"
                aria-label="Search hotspots"
                className="shrink-0 cursor-pointer border-none bg-transparent p-0 text-inherit"
                tabIndex={open ? 0 : -1}
            >
                <i className="fa-solid fa-magnifying-glass"></i>
            </button>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Search barangay..."
                aria-label="Search barangay"
                tabIndex={open ? 0 : -1}
                className={`min-w-0 border-none bg-transparent text-white outline-none transition-opacity duration-200 ${
                    open ? 'w-full opacity-100' : 'w-0 opacity-0'
                }`}
            />
        </form>
    );
}

/**
 * Topbar: page identity on the left, city + clock + Testnet/wallet state on
 * the right. Under 900px a drawer trigger replaces the desktop sidebar, and
 * the controls wrap onto a second row instead of clipping the title.
 */
export default function Topbar({ onOpenNav }: { onOpenNav: () => void }) {
    const { pathname } = useLocation();
    const meta = metaFor(pathname);
    const { time, date } = useClock();
    const { ref, className: bentoClassName, style } = useBentoFx({ particleCount: 0 });

    useEffect(() => {
        document.title = `${meta.title} · INIT.AI | Urban Intelligence Platform`;
    }, [meta.title]);

    return (
        <header
            ref={ref}
            className={`${bentoClassName} topbar relative z-20 mb-4 flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-[20px] border border-white/8 bg-white/5 p-[14px_16px] shadow-[0_20px_50px_rgba(0,0,0,.35)] backdrop-blur-2xl sm:mb-5 sm:rounded-[24px] sm:p-[18px_22px] lg:p-[22px_28px]`}
            style={{ ...style, overflow: 'visible' }}
        >
            <div className="flex min-w-0 items-center gap-3">
                <button
                    type="button"
                    onClick={onOpenNav}
                    aria-label="Open navigation"
                    className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-[14px] border border-white/10 bg-white/[.05] text-white transition hover:bg-white/10 min-[900px]:hidden"
                >
                    <i className="fa-solid fa-bars text-[17px]"></i>
                </button>
                <div className="min-w-0">
                    <h1
                        id="topbarTitle"
                        className="truncate text-[24px] leading-tight sm:text-[28px] lg:text-[34px]"
                    >
                        {meta.title}
                    </h1>
                    <p
                        id="topbarSub"
                        className="mt-1 line-clamp-2 text-[12.5px] text-[#999] sm:mt-1.5 sm:text-[13px] min-[900px]:line-clamp-1"
                    >
                        {meta.sub}
                    </p>
                </div>
            </div>

            <div className="topbar-right flex w-full items-center justify-between gap-2 sm:gap-3 min-[900px]:w-auto min-[900px]:justify-end lg:gap-5">
                <SearchBar />

                <CitySelector />

                <div className="datetime hidden flex-col items-end gap-0.5 min-[620px]:flex">
                    <span className="date text-[12px] tracking-[.02em] text-[#999]" id="dateDisplay">
                        {date}
                    </span>
                    <span className="clock text-[14px] font-semibold" id="clockDisplay">
                        {time}
                    </span>
                </div>

                <StellarIndicator />
            </div>
        </header>
    );
}
