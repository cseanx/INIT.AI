import { useEffect, useRef, useState } from 'react';
import { CITY_CONFIG, useCity, type CityName } from '../../contexts/CityContext';

const CITIES = Object.keys(CITY_CONFIG) as CityName[];

const TRIGGER_CLASSES =
    'flex cursor-pointer items-center gap-3 rounded-[16px] border border-white/5 bg-white/5 p-[14px_18px] text-white transition-all duration-200 hover:bg-white/8';

const MENU_CLASSES =
    'city-menu absolute right-0 top-full z-50 mt-2 flex min-w-[190px] flex-col gap-0.5 rounded-[14px] border border-white/10 bg-[#101010]/90 p-[6px] shadow-[0_16px_40px_rgba(0,0,0,.55)] backdrop-blur-2xl';

const OPTION_CLASSES =
    'flex w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] p-[10px_12px] text-left text-[13px] text-[#ddd] transition duration-200 hover:bg-white/6 hover:text-white';

/** Glassmorphism city selector — reads/writes global CityContext so Heat Map keeps same city. */
export default function CitySelector() {
    const [open, setOpen] = useState(false);
    const { selected, setSelected } = useCity();
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

    return (
        <div className="relative" ref={ref}>
            <button
                id="cityFilter"
                type="button"
                className={TRIGGER_CLASSES}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{selected}</span>
                <i
                    className={`fa-solid fa-chevron-down text-xs text-[#888] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                ></i>
            </button>

            {open ? (
                <div className={MENU_CLASSES} role="listbox" aria-label="City">
                    {CITIES.map((city) => {
                        const isSelected = city === selected;
                        return (
                            <button
                                key={city}
                                type="button"
                                role="option"
                                aria-selected={isSelected}
                                className={`${OPTION_CLASSES} ${isSelected ? 'text-white' : ''}`}
                                onClick={() => {
                                    setSelected(city as CityName);
                                    setOpen(false);
                                }}
                            >
                                <span>{city}</span>
                                {isSelected ? (
                                    <i className="fa-solid fa-check text-xs text-accent"></i>
                                ) : null}
                            </button>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
