import { ROUTES, SETTINGS_ROUTE, SidebarNavLink } from '../../routes';
import AccountMenu from './AccountMenu';

interface SidebarProps {
    collapsed: boolean;
    mobileOpen: boolean;
    onToggle: () => void;
    onClose: () => void;
    onNavigate: () => void;
}

export default function Sidebar({
    collapsed,
    mobileOpen,
    onToggle,
    onClose,
    onNavigate,
}: SidebarProps) {
    return (
        <aside
            id="sidebar"
            className={`sidebar flex w-[230px] shrink-0 flex-col overflow-clip rounded-[30px] border border-white/8 bg-white/5 p-[18px] backdrop-blur-[25px] transition-[width,padding] duration-[.35s] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                collapsed ? 'collapsed' : ''
            } ${mobileOpen ? 'mobile-open' : ''}`}
        >
            <div className="sidebar-top flex flex-col gap-[25px]">
                <div className="flex items-center justify-between">
                    <button
                        id="toggleSidebar"
                        className="toggle-btn flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-[14px] border-none bg-white/5 text-white transition-all duration-[.35s] hover:bg-white/8 max-[899px]:hidden"
                        onClick={onToggle}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <i className="fa-solid fa-bars"></i>
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close navigation"
                        className="flex h-[42px] w-[42px] cursor-pointer items-center justify-center rounded-[14px] border-none bg-white/5 text-white transition hover:bg-white/8 min-[900px]:hidden"
                    >
                        <i className="fa-solid fa-xmark text-[18px]"></i>
                    </button>
                </div>

                <div className="logo flex items-center gap-[15px] transition-all duration-[.35s]">
                    <div className="logo-circle flex h-12 w-12 shrink-0 items-center justify-center">
                        <img
                            src="/assets/images/logo.svg"
                            alt="INIT.AI logo"
                            className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(var(--accent-glow),.35)]"
                        />
                    </div>
                    <div className="logo-text overflow-hidden whitespace-nowrap transition-all duration-[.25s]">
                        <h2>INIT.AI</h2>
                        <span>Urban Intelligence</span>
                    </div>
                </div>
            </div>

            <nav className="mt-[18px] flex flex-col gap-2 min-[900px]:gap-3" aria-label="Primary">
                {ROUTES.map((route) => (
                    <SidebarNavLink
                        key={route.path}
                        to={route.path}
                        icon={route.icon}
                        onClick={onNavigate}
                    >
                        {route.label}
                    </SidebarNavLink>
                ))}
            </nav>

            <div className="sidebar-bottom mt-auto flex flex-col gap-[10px] pt-5">
                <SidebarNavLink
                    to={SETTINGS_ROUTE.path}
                    icon={SETTINGS_ROUTE.icon}
                    onClick={onNavigate}
                >
                    {SETTINGS_ROUTE.label}
                </SidebarNavLink>

                <AccountMenu collapsed={collapsed} />
            </div>
        </aside>
    );
}
