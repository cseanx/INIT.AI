import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

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
 *  popups are browser-styled and cannot be themed). The popover renders in
 *  a portal with fixed positioning so sibling cards — which form their own
 *  stacking contexts via backdrop-blur — can never paint over / clip it. */
export default function MenuSelect({ value, options, onChange }: MenuSelectProps) {
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

    useEffect(() => {
        function onDocumentClick(e: MouseEvent) {
            const target = e.target as Node;
            if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false);
        }
        function onScroll(e: Event) {
            if (!(e.target instanceof Node) || !rootRef.current?.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('scroll', onScroll, true);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('scroll', onScroll, true);
        };
    }, []);

    const selected = options.find((o) => o.value === value);

    function positionMenu() {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        setMenuStyle({
            width: `${rect.width}px`,
            top: `${rect.bottom + 6}px`,
            left: `${rect.left}px`,
        });
    }

    function toggleOpen() {
        const next = !open;
        if (next) positionMenu();
        setOpen(next);
    }

    return (
        <div ref={rootRef} className="relative">
            <button
                ref={triggerRef}
                type="button"
                className={TRIGGER_CLASSES}
                onClick={toggleOpen}
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
            {open
                ? createPortal(
                      <div
                          ref={menuRef}
                          role="listbox"
                          className="menu-select-menu fixed z-[999] flex flex-col gap-0.5 rounded-[14px] border border-white/10 bg-[#101010] p-[6px] shadow-[0_16px_40px_rgba(0,0,0,.55)]"
                          style={menuStyle}
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
                      </div>,
                      document.body,
                  )
                : null}
        </div>
    );
}