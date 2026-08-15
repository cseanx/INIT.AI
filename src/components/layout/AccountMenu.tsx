import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { accounts } from '../../data/mockData';

interface AccountMenuProps {
    collapsed: boolean;
}

const MENU_ITEM_CLASSES =
    'flex cursor-pointer items-center gap-[10px] rounded-[10px] border-none bg-transparent p-[10px_12px] text-left text-[13px] text-[#ddd] transition duration-200 hover:bg-white/6 hover:text-white';

export default function AccountMenu({ collapsed }: AccountMenuProps) {
    const navigate = useNavigate();
    const sectionRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [open, setOpen] = useState(false);
    const [accountIndex, setAccountIndex] = useState(0);
    const [menuStyle, setMenuStyle] = useState<CSSProperties>({});

    const account = accounts[accountIndex];

    function positionMenu() {
        const trigger = triggerRef.current;
        if (!trigger) return;
        const rect = trigger.getBoundingClientRect();
        const menuWidth = Math.max(rect.width, 210);
        const style: CSSProperties = {
            width: `${menuWidth}px`,
            bottom: `${window.innerHeight - rect.top + 8}px`,
        };
        if (collapsed) {
            style.left = `${rect.right + 12}px`;
            style.bottom = `${window.innerHeight - rect.bottom}px`;
        } else {
            style.left = `${rect.left}px`;
        }
        setMenuStyle(style);
    }

    function toggleOpen() {
        const next = !open;
        if (next) positionMenu();
        setOpen(next);
    }

    function switchAccount() {
        setAccountIndex((i) => (i + 1) % accounts.length);
        setOpen(false);
    }

    useEffect(() => {
        function onDocumentClick(e: MouseEvent) {
            if (sectionRef.current && !sectionRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        function onResize() {
            setOpen(false);
        }
        document.addEventListener('click', onDocumentClick);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    function handleLogout() {
        navigate('/login');
    }

    return (
        <div className="account-section relative" ref={sectionRef}>
            <button
                type="button"
                className="account-trigger flex w-full cursor-pointer items-center gap-3 rounded-[16px] border border-white/8 bg-white/[.04] p-[9px] text-white transition duration-200 hover:bg-white/8"
                ref={triggerRef}
                onClick={toggleOpen}
            >
                <div className="account-avatar flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange to-primary text-[12.5px] font-bold">
                    {account.initials}
                </div>
                <div className="account-info min-w-0 flex-1 text-left">
                    <strong className="block truncate text-[13px] font-semibold">
                        {account.name}
                    </strong>
                    <span className="block truncate text-[11px] text-[#888]">{account.role}</span>
                </div>
                <i className="fa-solid fa-chevron-up account-chevron shrink-0 text-[11px] text-[#888] transition duration-200 ease-in-out"></i>
            </button>

            <div
                className="account-menu invisible fixed z-[999] flex translate-y-[6px] flex-col gap-0.5 rounded-[14px] border border-white/10 bg-[#101010] p-[6px] opacity-0 shadow-[0_16px_40px_rgba(0,0,0,.55)] transition duration-200"
                style={menuStyle}
            >
                <button type="button" className={MENU_ITEM_CLASSES} onClick={switchAccount}>
                    <i className="fa-solid fa-arrows-rotate w-4 text-center text-[13px]"></i>
                    Switch Account
                </button>
                <button
                    type="button"
                    className={`${MENU_ITEM_CLASSES} danger`}
                    onClick={handleLogout}
                >
                    <i className="fa-solid fa-right-from-bracket w-4 text-center text-[13px]"></i>
                    Log Out
                </button>
            </div>
        </div>
    );
}
