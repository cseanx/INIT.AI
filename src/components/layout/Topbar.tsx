import { useLocation } from 'react-router-dom';
import { metaFor } from '../../routes';
import { useClock } from '../../hooks/useClock';

export default function Topbar() {
    const { pathname } = useLocation();
    const meta = metaFor(pathname);
    const { time, date } = useClock();

    return (
        <header className="topbar m-[20px_20px_35px] flex items-center justify-between rounded-[24px] border border-white/8 bg-white/5 p-[22px_28px] backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,.35)]">
            <div>
                <h1 id="topbarTitle" className="text-[36px]">
                    {meta.title}
                </h1>
                <p id="topbarSub" className="mt-2 text-[#777]">
                    {meta.sub}
                </p>
            </div>

            <div className="topbar-right flex items-center gap-[25px]">
                <div className="search flex w-[280px] items-center gap-3 rounded-[16px] border border-white/5 bg-white/5 p-[14px_18px]">
                    <i className="fa-solid fa-magnifying-glass"></i>
                    <input
                        type="text"
                        placeholder="Search barangay, report..."
                        className="w-full border-none bg-transparent text-white outline-none"
                    />
                </div>

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
