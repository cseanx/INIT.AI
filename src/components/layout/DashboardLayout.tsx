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
 *
 * Under 900px the sidebar becomes an off-canvas drawer. The content column
 * is the only scroller on every size.
 */
const PAGES: Record<string, LazyExoticComponent<ComponentType>> = {
    dashboard: lazy(() => import('../../pages/Dashboard')),
    heatmap: lazy(() => import('../../pages/HeatMap')),
    hotspots: lazy(() => import('../../pages/Hotspots')),
    canopy: lazy(() => import('../../pages/Canopy')),
    mitigation: lazy(() => import('../../pages/Mitigation')),
    reports: lazy(() => import('../../pages/Reports')),
    'reports-new': lazy(() => import('../../pages/CreateReport')),
    'report-edit': lazy(() => import('../../pages/ReportEditor')),
    settings: lazy(() => import('../../pages/Settings')),
};

function pageKey(pathname: string): string {
    const parts = pathname.split('/').filter(Boolean);
    return parts.length >= 2 ? `${parts[0]}-${parts[1]}` : (parts[0] ?? 'dashboard');
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
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const mainRef = useRef<HTMLElement>(null);
    const current = pageKey(pathname);

    useEffect(() => {
        setVisited((prev) => (prev.has(current) ? prev : new Set(prev).add(current)));
    }, [current]);

    useEffect(() => {
        setMobileNavOpen(false);
        mainRef.current?.scrollTo({ top: 0 });
    }, [pathname]);

    // Keep the drawer from surviving a resize into desktop layout.
    useEffect(() => {
        const media = window.matchMedia('(min-width: 900px)');
        const closeOnDesktop = () => {
            if (media.matches) setMobileNavOpen(false);
        };
        media.addEventListener('change', closeOnDesktop);
        return () => media.removeEventListener('change', closeOnDesktop);
    }, []);

    return (
        <div className="app isolate relative flex h-[100dvh] w-full gap-2 overflow-hidden bg-[#0a0a0c] p-2 sm:gap-3 sm:p-3">
            <a href="#main-content" className="skip-link">
                Skip to main content
            </a>

            {mobileNavOpen ? (
                <button
                    type="button"
                    aria-label="Close navigation"
                    className="fixed inset-0 z-50 cursor-default border-none bg-black/65 backdrop-blur-[2px] min-[900px]:hidden"
                    onClick={() => setMobileNavOpen(false)}
                />
            ) : null}

            <Sidebar
                collapsed={collapsed}
                mobileOpen={mobileNavOpen}
                onToggle={() => setSidebarCollapsed(!collapsed)}
                onClose={() => setMobileNavOpen(false)}
                onNavigate={() => setMobileNavOpen(false)}
            />
            <main
                ref={mainRef}
                id="main-content"
                className="main-content flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
            >
                <BentoSection className="flex min-h-0 flex-1 flex-col">
                    <Topbar onOpenNav={() => setMobileNavOpen(true)} />
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
