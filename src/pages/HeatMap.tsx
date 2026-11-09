import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import Page from '../components/layout/Page';
import MapView from '../components/map/MapView';
import HeatLegend from '../components/map/HeatLegend';
import LstLegend from '../components/map/LstLegend';
import InspectorPanel from '../components/inspector/InspectorPanel';
import { useBentoFx } from '../components/common/BentoCard';
import { useCity } from '../contexts/CityContext';
import { useApiData } from '../hooks/useApiData';
import { api } from '../services/api';

/**
 * Map workspace. Desktop: map + fixed-height inspector side by side.
 * Below 1100px the two stack vertically and the page scrolls, so a field
 * coordinator can read the map and the inspector on a phone.
 */
export default function HeatMap() {
    const [inspectorOpen, setInspectorOpen] = useState(true);
    const [lstActive, setLstActive] = useState(true);
    const mapCardFx = useBentoFx({ particleCount: 0 });
    const { selected } = useCity();
    const hotspots = useApiData(api.getHotspots);

    const criticalCount = (hotspots ?? []).filter((b) => b.severity === 'critical').length;

    // MapView reports toggle changes so the legend can follow the LST layer.
    const handleLayerStateChange = useCallback((state: Record<string, boolean>) => {
        setLstActive(state.lst ?? false);
    }, []);

    return (
        <Page className="min-h-0">
            <div className="flex min-h-0 flex-col gap-4 min-[1100px]:h-full min-[1100px]:flex-row min-[1100px]:gap-[18px]">
                {/* Map card */}
                <div
                    ref={mapCardFx.ref}
                    style={mapCardFx.style}
                    className={`${mapCardFx.className} flex h-[58vh] min-h-[380px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/8 bg-white/5 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,.35)] min-[1100px]:h-auto min-[1100px]:flex-1 sm:rounded-[28px]`}
                >
                    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-white/8 px-[16px] py-[11px] sm:px-[20px] sm:py-[13px]">
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <h3 className="text-[14px] font-semibold sm:text-[15px]">
                                {selected} · Heat Map
                            </h3>
                            <span
                                className="inline-flex items-center gap-1 rounded-full border border-[#ffb03a]/30 bg-[#ffb03a]/10 px-2 py-[2px] text-[12px] font-bold uppercase tracking-[.06em] text-[#ffb03a]"
                                title="Prototype scene: Landsat land-surface temperature with synthetic fallback where no scene is available."
                            >
                                <i className="fa-solid fa-flask text-[11px]"></i> Demo scene
                            </span>
                        </div>
                        <Link
                            to="/hotspots"
                            className="inline-flex min-h-[32px] items-center gap-1.5 rounded-full border border-white/10 bg-white/[.04] px-[10px] text-[12px] font-semibold text-[#ddd] transition hover:bg-white/10 hover:text-white"
                        >
                            <span className="h-1.5 w-1.5 rounded-full bg-[#ff2d55] shadow-[0_0_6px_#ff2d55]"></span>
                            {criticalCount} critical hotspots
                            <i className="fa-solid fa-arrow-right text-[11px]"></i>
                        </Link>
                    </div>
                    <div className="relative min-h-0 flex-1 p-[10px] sm:p-[14px]">
                        <MapView className="h-full w-full rounded-[16px] sm:rounded-[18px]" onLayerStateChange={handleLayerStateChange}>
                            {lstActive ? <LstLegend /> : <HeatLegend />}
                        </MapView>
                    </div>
                </div>

                {/* Inspector card */}
                <div className="flex shrink-0 overflow-hidden rounded-[24px] min-[1100px]:rounded-[28px]">
                    <div
                        className={`h-full min-w-0 overflow-hidden transition-[width,opacity] duration-[.35s] ease-[cubic-bezier(0.32,0.72,0,1)] max-[1099px]:!w-full max-[1099px]:!opacity-100 ${
                            inspectorOpen ? 'w-[340px] opacity-100' : 'w-0 opacity-0'
                        }`}
                    >
                        <div className="h-[560px] w-full shrink-0 min-[1100px]:h-full min-[1100px]:w-[340px]">
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
                            aria-label="Open inspector panel"
                            className="flex w-[44px] shrink-0 cursor-pointer flex-col items-center justify-center gap-[16px] rounded-[28px] border border-white/8 bg-white/5 text-[#888] backdrop-blur-2xl transition duration-200 hover:bg-white/8 hover:text-accent max-[1099px]:hidden"
                        >
                            <i className="fa-solid fa-angles-right text-[16px]"></i>
                            <span className="rotate-180 text-[12px] font-semibold uppercase tracking-[.18em] [writing-mode:vertical-rl]">
                                Inspector
                            </span>
                        </button>
                    )}
                </div>
            </div>
        </Page>
    );
}
