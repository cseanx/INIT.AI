import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

/**
 * Shared application shell: sidebar + topbar + routed page content.
 * Resets scroll position whenever the route changes.
 */
export default function DashboardLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const { pathname } = useLocation();
    const mainRef = useRef<HTMLElement>(null);

    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    return (
        <div className="app relative flex h-screen">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />
            <main
                ref={mainRef}
                className="main-content min-w-0 flex-1 overflow-y-auto p-[30px_35px_30px_10px]"
            >
                <Topbar />
                <Outlet />
            </main>
        </div>
    );
}
