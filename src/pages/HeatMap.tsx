import { useState } from 'react';
import Page from '../components/layout/Page';
import MapView from '../components/map/MapView';
import HeatLegend from '../components/map/HeatLegend';
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
    const mapCardFx = useBentoFx({ particleCount: 0 });

    return (
        <Page>
            <div className="flex h-[calc(100vh-160px)] min-h-0 gap-[18px]">
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
                        <MapView className="h-full w-full rounded-[18px]">
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