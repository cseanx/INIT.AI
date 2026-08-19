import { useState } from 'react';
import Page from '../components/layout/Page';
import MapView from '../components/map/MapView';
import HeatLegend from '../components/map/HeatLegend';
import InspectorPanel from '../components/inspector/InspectorPanel';
import { useBentoFx } from '../components/common/BentoCard';

/**
 * Fixed-height map workspace: the page never scrolls — the map fills the
 * available height and only the inspector panel scrolls internally.
 * Height = 100vh minus the app topbar + main content padding. Both cards
 * are glassmorphism panels with the app-wide bento border glow / spotlight.
 */
export default function HeatMap() {
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const mapCardFx = useBentoFx();

    return (
        <Page>
            <div className="flex h-[calc(100vh-231px)] min-h-0 gap-[18px]">
                {/* Map card */}
                <div
                    ref={mapCardFx.ref}
                    style={mapCardFx.style}
                    className={`${mapCardFx.className} flex min-w-0 flex-1 flex-col overflow-hidden rounded-[28px] border border-white/8 bg-white/5 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)]`}
                >
                    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-[20px] py-[13px]">
                        <h3 className="flex items-center gap-[9px] text-[15px] font-semibold">
                            <i className="fa-solid fa-satellite text-accent"></i>
                            Philippines — Heat Map
                        </h3>
                        <span className="flex items-center gap-[7px] rounded-full border border-white/8 bg-white/[.04] px-[11px] py-[5px] text-[10.5px] font-semibold tracking-[.08em] text-[#aaa]">
                            <span className="h-[6px] w-[6px] rounded-full bg-mint shadow-[0_0_8px_#00ff84] animate-status-pulse"></span>
                            LIVE
                        </span>
                    </div>
                    <div className="relative min-h-0 flex-1">
                        <MapView className="h-full w-full">
                            <HeatLegend />
                        </MapView>
                    </div>
                </div>

                {/* Inspector card */}
                <div
                    className={`shrink-0 overflow-hidden transition-[width] duration-300 ease-out ${
                        inspectorOpen ? 'w-[340px] min-w-[340px]' : 'w-[44px] min-w-0'
                    }`}
                >
                    <InspectorPanel
                        open={inspectorOpen}
                        onToggle={() => setInspectorOpen(!inspectorOpen)}
                    />
                </div>
            </div>
        </Page>
    );
}