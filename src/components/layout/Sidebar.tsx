import { ROUTES, SETTINGS_ROUTE, SidebarNavLink } from '../../routes';
import AccountMenu from './AccountMenu';

interface SidebarProps {
    collapsed: boolean;
    onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
    return (
        <aside
            className="sidebar m-[18px] flex w-[230px] shrink-0 flex-col overflow-hidden rounded-[30px] border border-white/8 bg-white/5 p-[18px] backdrop-blur-[25px] transition-[width,padding] duration-[.35s] ease-in-out"
            id="sidebar"
        >
            <div className="sidebar-top flex flex-col gap-[25px]">
                <button
                    id="toggleSidebar"
                    className="toggle-btn h-[42px] w-[42px] cursor-pointer rounded-[14px] border-none bg-white/5 text-white transition duration-300 hover:bg-white/8"
                    onClick={onToggle}
                    aria-label="Toggle sidebar"
                >
                    <i className="fa-solid fa-bars"></i>
                </button>

                <div className="logo flex items-center gap-[15px]">
                    <div className="logo-circle flex h-12 w-12 shrink-0 items-center justify-center">
                        <img
                            src="/assets/images/logo.svg"
                            alt="INIT.AI logo"
                            className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(255,45,85,.35)]"
                        />
                    </div>
                    <div className="logo-text transition duration-[.25s]">
                        <h2>INIT.AI</h2>
                        <span>Urban Intelligence</span>
                    </div>
                </div>
            </div>

            <nav className="mt-[18px] flex flex-col gap-3">
                {ROUTES.map((route) => (
                    <SidebarNavLink key={route.path} to={route.path} icon={route.icon}>
                        {route.label}
                    </SidebarNavLink>
                ))}
            </nav>

            <div className="sidebar-bottom mt-auto flex flex-col gap-[10px] pt-5">
                <SidebarNavLink to={SETTINGS_ROUTE.path} icon={SETTINGS_ROUTE.icon} notification>
                    {SETTINGS_ROUTE.label}
                </SidebarNavLink>

                <div className="sidebar-status flex items-center gap-[10px] rounded-[14px] border border-white/6 bg-white/[.03] p-[10px_12px] text-xs tracking-[.03em] text-[#ccc]">
                    <span className="status-dot h-[10px] w-[10px] shrink-0 rounded-full bg-mint shadow-[0_0_15px_#00ff84] animate-status-pulse"></span>
                    <span>SYSTEM ONLINE</span>
                </div>

                <AccountMenu collapsed={collapsed} />
            </div>
        </aside>
    );
}
