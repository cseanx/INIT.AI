import { useEffect, useRef, useState } from 'react';

export interface MenuSelectOption {
    value: string;
    label: string;
}

interface MenuSelectProps {
    value: string;
    options: MenuSelectOption[];
    onChange: (value: string) => void;
}

const TRIGGER_CLASSES =
    'flex w-full cursor-pointer items-center justify-between rounded-[14px] border border-white/10 bg-white/[.04] p-[13px_16px] text-sm text-white outline-none transition duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)]';

const OPTION_CLASSES =
    'flex w-full cursor-pointer items-center justify-between rounded-[10px] border-none bg-transparent p-[10px_12px] text-left text-[13px] text-[#ddd] transition duration-200 hover:bg-white/6 hover:text-white';

/** Custom dropdown that matches the app's dark glass UI (native <select>
 *  popups are browser-styled and cannot be themed). */
export default function MenuSelect({ value, options, onChange }: MenuSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

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

    const selected = options.find((o) => o.value === value);

    return (
        <div ref={rootRef} className="relative">
            <button
                type="button"
                className={TRIGGER_CLASSES}
                onClick={() => setOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span>{selected?.label ?? value}</span>
                <i
                    className={`fa-solid fa-chevron-down text-[11px] text-[#888] transition duration-200 ${
                        open ? 'rotate-180' : ''
                    }`}
                ></i>
            </button>
            {open ? (
                <div
                    role="listbox"
                    className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 flex flex-col gap-0.5 rounded-[14px] border border-white/10 bg-[#101010] p-[6px] shadow-[0_16px_40px_rgba(0,0,0,.55)]"
                >
                    {options.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            role="option"
                            aria-selected={option.value === value}
                            className={OPTION_CLASSES}
                            onClick={() => {
                                onChange(option.value);
                                setOpen(false);
                            }}
                        >
                            <span>{option.label}</span>
                            {option.value === value ? (
                                <i className="fa-solid fa-check text-[12px] text-accent"></i>
                            ) : null}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}