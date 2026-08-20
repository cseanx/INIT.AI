import {
    lazy,
    Suspense,
    useEffect,
    useRef,
    useState,
    type ComponentType,
    type LazyExoticComponent,
    type ReactNode,
} from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { BentoSection } from '../common/BentoCard';
import { usePreferences } from '../../preferences/PreferencesContext';

/**
 * Shared application shell: sidebar + topbar + routed page content.
 *
 * Pages are lazy-loaded, but once visited they stay mounted (hidden with
 * CSS) so charts and data survive navigation — returning to a page is
 * instant instead of rebuilding everything from scratch.
 */
const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
    dashboard: lazy(() => import('../../pages/Dashboard')),
    heatmap: lazy(() => import('../../pages/HeatMap')),
    hotspots: lazy(() => import('../../pages/Hotspots')),
    canopy: lazy(() => import('../../pages/Canopy')),
    mitigation: lazy(() => import('../../pages/Mitigation')),
    reports: lazy(() => import('../../pages/Reports')),
    settings: lazy(() => import('../../pages/Settings')),
};

function pageKey(pathname: string): string {
    return pathname.split('/')[1] ?? 'dashboard';
}

/**
 * Keeps a visited page mounted while hiding it. When the page becomes
 * visible again (a page switch), it fires a bubbling `page-visible` event
 * so nested charts can replay their entrance animation.
 */
function PageSlot({ active, children }: { active: boolean; children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const prevActive = useRef(active);

    useEffect(() => {
        if (active && !prevActive.current) {
            ref.current?.dispatchEvent(new Event('page-visible', { bubbles: true }));
        }
        prevActive.current = active;
    }, [active]);

    return (
        <div ref={ref} className={`flex min-h-0 flex-1 flex-col ${active ? '' : 'hidden'}`}>
            {children}
        </div>
    );
}

export default function DashboardLayout() {
    const { pathname } = useLocation();
    const { preferences, setSidebarCollapsed } = usePreferences();
    const collapsed = preferences.sidebar_collapsed;
    const [visited, setVisited] = useState<Set<string>>(
        () => new Set([pageKey(pathname)]),
    );
    const mainRef = useRef<HTMLElement>(null);
    const current = pageKey(pathname);

    useEffect(() => {
        setVisited((prev) => (prev.has(current) ? prev : new Set(prev).add(current)));
    }, [current]);

    useEffect(() => {
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    return (
        <div className="app isolate relative flex h-screen w-screen gap-3 overflow-hidden bg-[#0a0a0c] p-3">
            <Sidebar
                collapsed={collapsed}
                onToggle={() => setSidebarCollapsed(!collapsed)}
            />
            <main
                ref={mainRef}
                className="main-content flex min-w-0 flex-1 flex-col overflow-y-auto"
            >
                <BentoSection className="flex min-h-0 flex-1 flex-col">
                    <Topbar />
                    {Object.entries(PAGES).map(([key, Page]) => {
                        if (!visited.has(key)) return null;
                        return (
                            <PageSlot key={key} active={key === current}>
                                <Suspense fallback={null}>
                                    <Page />
                                </Suspense>
                            </PageSlot>
                        );
                    })}
                </BentoSection>
            </main>
        </div>
    );
}
