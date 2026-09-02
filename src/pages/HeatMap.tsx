import { useCallback, useState } from 'react';
import Page from '../components/layout/Page';
import MapView from '../components/map/MapView';
import HeatLegend from '../components/map/HeatLegend';
import LstLegend from '../components/map/LstLegend';
import InspectorPanel from '../components/inspector/InspectorPanel';
import { useBentoFx } from '../components/common/BentoCard';

/**
 * Fixed-height map workspace: the page never scrolls — the map fills the
 * available height and only the inspector panel scrolls internally.
 * Height = 100vh minus the app frame: 12px outer top padding + topbar
 * height + 20px topbar bottom margin + 12px outer bottom padding.
 * Both cards are glassmorphism panels with the app-wide bento spotlight
 * border glow; only the map card skips the star particles.
 */
export default function HeatMap() {
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const [lstActive, setLstActive] = useState(true);
    const mapCardFx = useBentoFx({ particleCount: 0 });

    // MapView reports toggle changes so the legend can follow the LST layer.
    const handleLayerStateChange = useCallback((state: Record<string, boolean>) => {
        setLstActive(state.lst ?? false);
    }, []);

    return (
        <Page className="h-full min-h-0">
            <div className="flex h-full min-h-0 gap-[18px]">
                {/* Map card */}
                <div
                    ref={mapCardFx.ref}
                    style={mapCardFx.style}
                    className={`${mapCardFx.className} flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/5 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)]`}
                >
                    <div className="flex shrink-0 items-center justify-between border-b border-white/8 px-[20px] py-[13px]">
                        <h3 className="text-[15px] font-semibold">
                            Philippines - Heat Map
                        </h3>
                    </div>
                    <div className="relative min-h-0 flex-1 p-[14px]">
                        <MapView className="h-full w-full rounded-[18px]" onLayerStateChange={handleLayerStateChange}>
                            {lstActive ? <LstLegend /> : <HeatLegend />}
                        </MapView>
                    </div>
                </div>

                {/* Inspector card */}
                <div className="flex shrink-0 overflow-hidden rounded-[28px]">
                    <div
                        className={`h-full min-w-0 overflow-hidden transition-[width,opacity] duration-[.35s] ease-[cubic-bezier(0.32,0.72,0,1)] ${
                            inspectorOpen ? 'w-[340px] opacity-100' : 'w-0 opacity-0'
                        }`}
                    >
                        <div className="h-full w-[340px] shrink-0">
                            <InspectorPanel
                                onToggle={() => setInspectorOpen(!inspectorOpen)}
                            />
                        </div>
                    </div>
                    {!inspectorOpen && (
                        <button
                            type="button"
                            onClick={() => setInspectorOpen(true)}
                            title="Open inspector panel"
                            className="flex w-[44px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[16px] rounded-[28px] border border-white/8 bg-white/5 text-[#888] backdrop-blur-2xl transition duration-200 hover:bg-white/8 hover:text-accent"
                        >
                            <i className="fa-solid fa-angles-right text-[16px]"></i>
                            <span className="rotate-180 text-[10px] font-semibold uppercase tracking-[.18em] [writing-mode:vertical-rl]">
                                Inspector
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </Page>
    );
}