import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';

/* ==========================
   ROUTE METADATA
   Drives the sidebar navigation and the topbar title/subtitle.
========================== */

export interface RouteMeta {
    path: string;
    label: string;
    icon: string;
    title: string;
    sub: string;
}

export const ROUTES: RouteMeta[] = [
    {
        path: '/dashboard',
        label: 'Dashboard',
        icon: 'fa-chart-line',
        title: 'Dashboard',
        sub: 'Welcome back to INIT.AI',
    },
    {
        path: '/heatmap',
        label: 'Heat Map',
        icon: 'fa-earth-americas',
        title: 'Heat Map',
        sub: 'Live surface temperature across monitored barangays',
    },
    {
        path: '/hotspots',
        label: 'Hotspots',
        icon: 'fa-location-dot',
        title: 'Hotspots',
        sub: 'AI-detected urban heat islands requiring attention',
    },
    {
        path: '/canopy',
        label: 'Canopy Analysis',
        icon: 'fa-tree',
        title: 'Canopy Analysis',
        sub: 'Tree cover and green space assessment',
    },
    {
        path: '/mitigation',
        label: 'Mitigation',
        icon: 'fa-seedling',
        title: 'Mitigation',
        sub: 'Recommended interventions and projected impact',
    },
    {
        path: '/reports',
        label: 'Reports',
        icon: 'fa-file-lines',
        title: 'Reports',
        sub: 'Generated intelligence briefs for stakeholders',
    },
];

export const SETTINGS_ROUTE: RouteMeta = {
    path: '/settings',
    label: 'Settings',
    icon: 'fa-gear',
    title: 'Settings',
    sub: 'Manage your profile, notifications, and preferences',
};

export function metaFor(pathname: string): RouteMeta {
    const meta = [...ROUTES, SETTINGS_ROUTE].find((r) => r.path === pathname);
    return meta ?? ROUTES[0];
}

/* Shared link styling for the sidebar nav anchors. */
export const NAV_LINK_CLASSES =
    'relative flex items-center gap-4 rounded-[18px] p-3 text-[#b4b4b4] no-underline transition-all duration-[.35s] hover:bg-white/5 hover:text-white';

export function NavLinkClasses({ isActive }: { isActive: boolean }): string {
    return isActive ? `${NAV_LINK_CLASSES} active` : NAV_LINK_CLASSES;
}

export function SidebarNavLink({
    to,
    icon,
    children,
    notification,
}: {
    to: string;
    icon: string;
    children: ReactNode;
    notification?: boolean;
}) {
    return (
        <NavLink to={to} className={({ isActive }) => NavLinkClasses({ isActive })}>
            <i className={`fa-solid ${icon} w-[22px] shrink-0 text-center text-lg`}></i>
            <span className="whitespace-nowrap transition-all duration-[.25s]">{children}</span>
            {notification ? (
                <div className="notification-dot absolute right-[14px] top-[10px] h-2 w-2 rounded-full bg-primary shadow-[0_0_8px_rgba(255,45,85,.6)]"></div>
            ) : null}
        </NavLink>
    );
}
