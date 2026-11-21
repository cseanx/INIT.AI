import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { metaFor } from '../../routes';
import { useClock } from '../../hooks/useClock';
import CitySelector from '../common/CitySelector';
import StellarIndicator from './StellarIndicator';
import { useBentoFx } from '../common/BentoCard';

/**
 * Topbar: page identity on the left, city + clock + network/wallet state on
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
