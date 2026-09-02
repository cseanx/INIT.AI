import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Map as MapLibreMap, Popup } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapLayersPanel from './MapLayersPanel';
import { HAS_OPENWEATHER_KEY, LST_RASTER_LAYER_ID, LST_RASTER_SOURCE_ID, fetchLSTPoint, lstSourceLabel, lstTileUrl } from './rasterLST';
import { useCity } from '../../contexts/CityContext';
import {
    MAP_LAYERS,
    applyLayerVisibility,
    defaultLayerState,
    type MapLayerDef,
} from './layers';

/**
 * Philippines travel box. The camera cannot leave this area (with a little
 * sea margin around the archipelago), so users can't wander the world.
 */
const PHILIPPINES_BOUNDS: [[number, number], [number, number]] = [
    [116.9, 4.6],
    [126.6, 21.2],
];

const TRAVEL_LIMITS: [[number, number], [number, number]] = [
    [113.0, 2.0],
    [130.5, 23.5],
];

/** Dark satellite basemap + OpenWeather global thermal (no crop, entire MapLibre). */
function satelliteStyle(): StyleSpecification {
    const thermalTiles = [lstTileUrl()];
    const thermalAttribution = HAS_OPENWEATHER_KEY
        ? '© OpenWeather (temperature) · not satellite LST'
        : '© OpenWeather — set VITE_OPENWEATHER_API_KEY to enable temperature';

    return {
        version: 8,
        sources: {
            // Dark base: Esri World Imagery darkened via raster paint, keeps roads/labels readable at 0.62 opacity.
            esri: {
                type: 'raster',
                tiles: [
                    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                ],
                tileSize: 256,
                maxzoom: 19,
                attribution: '© Esri, Maxar',
            },
            esriLabels: {
                type: 'raster',
                tiles: [
                    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
                ],
                tileSize: 256,
                maxzoom: 19,
                attribution: '© Esri',
            },
            [LST_RASTER_SOURCE_ID]: {
                type: 'raster',
                tiles: thermalTiles,
                tileSize: 256,
                minzoom: 0,
                maxzoom: 19,
                // Allow overzoom/underzoom to avoid sudden disappearance (§3)
                attribution: thermalAttribution,
            },
        },
        layers: [
            {
                id: 'satellite-basemap',
                type: 'raster',
                source: 'esri',
                paint: {
                    // Slightly dim base so thermal pops but roads stay readable at 0.62 opacity.
                    'raster-brightness-min': 0.15,
                    'raster-brightness-max': 0.95,
                    'raster-contrast': 0.05,
                    'raster-saturation': -0.15,
                },
            },
            {
                id: LST_RASTER_LAYER_ID,
                type: 'raster',
                source: LST_RASTER_SOURCE_ID,
                paint: {
                    // §2 smooth, §5 readable 0.55-0.75. 0.62 keeps roads/labels readable, hot spots pop.
                    'raster-opacity': 0.62,
                    'raster-resampling': 'linear',
                    'raster-fade-duration': 80,
                    'raster-contrast': 0.08,
                    'raster-saturation': 0.15,
                    'raster-brightness-min': 0.08,
                    'raster-brightness-max': 0.98,
                },
            },
            {
                id: 'place-labels',
                type: 'raster',
                source: 'esriLabels',
                paint: {
                    'raster-opacity': 0.95,
                },
            },
            // Future vector overlays (barangay/city boundaries, hotspots) inserted here
            // will always render above thermal by design (§7).
        ],
    };
}

interface MapViewProps {
    className?: string;
    children?: ReactNode;
    /** Notifies the page when a layer toggle changes (e.g. to swap legends). */
    onLayerStateChange?: (state: Record<string, boolean>) => void;
}

const CTRL_BTN_CLASSES =
    'map-ctrl-btn flex h-[30px] w-[30px] cursor-pointer items-center justify-center border-none bg-transparent text-[12.5px] transition duration-200';

/**
 * Large interactive MapLibre GL map for the Heat Map page.
 *
 * Now serves continuous raster LST (hourly) instead of 18 vector boxes.
 * Inspector click fetches `GET /api/layers/lst/point?lat=&lng=&date=now`.
 * Hourly tiles auto-refresh every 10 min when LST is visible.
 */
export default function MapView({ className = '', children, onLayerStateChange }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const popupRef = useRef<Popup | null>(null);
    const refreshTimerRef = useRef<number | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [layersOpen, setLayersOpen] = useState(false);
    const { config: cityConfig } = useCity();
    const [layerState, setLayerState] = useState<Record<string, boolean>>(() => {
        const s = defaultLayerState();
        // Open with thermal on by default (continuous surface, honest OpenWeather)
        return { ...s, lst: true };
    });

    useEffect(() => {
        const container = containerRef.current;
        if (!container || mapRef.current) return;

        const map = new MapLibreMap({
            container,
            style: satelliteStyle(),
            bounds: PHILIPPINES_BOUNDS,
            fitBoundsOptions: { padding: 36, duration: 0 },
            minZoom: 4.2,
            maxZoom: 17,
            maxBounds: TRAVEL_LIMITS,
            attributionControl: { compact: true },
            trackResize: true,
        });

        const dbg = window as unknown as Record<string, unknown>;
        dbg.__initaiMap = map;

        function formatTemp(v: number | null): string {
            if (v == null || !Number.isFinite(v)) return '—';
            return `${v.toFixed(1)}°C`;
        }

        async function handleMapClick(e: { lngLat: { lng: number; lat: number } }) {
            // Only when LST is visible — otherwise click is basemap
            const lstVisible = map.getLayoutProperty(LST_RASTER_LAYER_ID, 'visibility') !== 'none';
            if (!lstVisible) return;
            const { lng, lat } = e.lngLat;
            // Close previous popup
            popupRef.current?.remove();
            const popup = new Popup({
                closeButton: false,
                closeOnClick: true,
                offset: 12,
                className: 'lst-popup-wrapper',
                maxWidth: '280px',
            })
                .setLngLat([lng, lat])
                .setHTML(
                    `<div class="lst-popup">
                        <div class="lst-popup-title">Fetching…</div>
                        <div class="lst-popup-sub">${lat.toFixed(3)}, ${lng.toFixed(3)}</div>
                        <div class="lst-popup-temp">…</div>
                    </div>`,
                )
                .addTo(map);
            popupRef.current = popup;
            const data = await fetchLSTPoint(lat, lng, 'now');
            if (!popup.isOpen()) return;
            const temp = data?.temperature_c ?? null;
            const hasReading = temp != null;
            const ts = data?.timestamp ? new Date(data.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'now';
            const src = lstSourceLabel();
            popup.setHTML(
                `<div class="lst-popup">
                    <div class="lst-popup-title">${hasReading ? 'Temperature' : 'No data'}</div>
                    <div class="lst-popup-sub">${lat.toFixed(3)}, ${lng.toFixed(3)}</div>
                    <div class="lst-popup-temp${hasReading ? '' : ' empty'}">${hasReading ? formatTemp(temp) : '—'}</div>
                    <div class="lst-popup-meta">Observed ${ts}</div>
                    <div class="lst-popup-meta">Source: ${hasReading ? src : 'Unknown'} · ${HAS_OPENWEATHER_KEY ? 'not satellite LST' : 'demo'}</div>
                </div>`,
            );
        }

        map.on('load', () => {
            setMapReady(true);
            map.on('click', handleMapClick);
            map.getCanvas().style.cursor = 'crosshair';
        });
        mapRef.current = map;

        return () => {
            map.off('click', handleMapClick);
            popupRef.current?.remove();
            popupRef.current = null;
            map.remove();
            mapRef.current = null;
            setMapReady(false);
        };
    }, []);

    // City selector compatibility (§8): keep thermal active, update center/bounds.
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        map.fitBounds(cityConfig.bounds, { padding: 36, duration: 700, maxZoom: 13.5, essential: true });
    }, [cityConfig, mapReady]);

    // Push layer visibility onto the map whenever a toggle changes
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        for (const layer of MAP_LAYERS) {
            applyLayerVisibility(map, layer, layerState[layer.id] ?? false);
        }
    }, [layerState, mapReady]);

    // Hourly auto-refresh: when LST is visible, bust tile cache every 10 min
    useEffect(() => {
        if (!mapReady) return;
        const map = mapRef.current;
        if (!map) return;
        const lstVisible = layerState.lst ?? false;
        if (refreshTimerRef.current) {
            window.clearInterval(refreshTimerRef.current);
            refreshTimerRef.current = null;
        }
        if (!lstVisible) return;
        const refresh = () => {
            const src = map.getSource(LST_RASTER_SOURCE_ID) as unknown as { setTiles?: (tiles: string[]) => void; reload?: () => void } | undefined;
            const url = lstTileUrl('now') + `&t=${Date.now()}`;
            if (src?.setTiles) {
                src.setTiles([url]);
                if (src.reload) src.reload();
                map.triggerRepaint();
            } else {
                // Fallback: force source reload via style diff
                const style = map.getStyle();
                if (style?.sources?.[LST_RASTER_SOURCE_ID]) {
                    (style.sources[LST_RASTER_SOURCE_ID] as { tiles?: string[] }).tiles = [url];
                    map.setStyle(style as StyleSpecification);
                }
            }
        };
        // Refresh every 10 min (600_000ms) — aligns to hourly synthetic variation
        refreshTimerRef.current = window.setInterval(refresh, 10 * 60 * 1000);
        return () => {
            if (refreshTimerRef.current) {
                window.clearInterval(refreshTimerRef.current);
                refreshTimerRef.current = null;
            }
        };
    }, [layerState.lst, mapReady]);

    // Let the page react to toggle changes (legend swap etc.).
    useEffect(() => {
        onLayerStateChange?.(layerState);
    }, [layerState, onLayerStateChange]);

    // Close the layers panel on outside click / Escape.
    useEffect(() => {
        if (!layersOpen) return;
        function onDocumentClick(e: MouseEvent) {
            if (controlsRef.current && !controlsRef.current.contains(e.target as Node)) {
                setLayersOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setLayersOpen(false);
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [layersOpen]);

    // Resize when the containing page becomes visible again (page switches).
    useEffect(() => {
        function onPageVisible(e: Event) {
            const container = containerRef.current;
            const map = mapRef.current;
            if (!container || !map) return;
            const target = e.target as Node | null;
            if (
                target === container ||
                (target instanceof Element && target.contains(container))
            ) {
                map.resize();
            }
        }
        document.addEventListener('page-visible', onPageVisible);
        return () => document.removeEventListener('page-visible', onPageVisible);
    }, []);

    function resetView() {
        mapRef.current?.fitBounds(PHILIPPINES_BOUNDS, { padding: 36, duration: 600 });
    }

    function handleToggle(layer: MapLayerDef, visible: boolean) {
        setLayerState((prev) => ({ ...prev, [layer.id]: visible }));
        const map = mapRef.current;
        if (map) applyLayerVisibility(map, layer, visible);
    }

    return (
        <div ref={containerRef} className={`map-view relative overflow-hidden ${className}`}>
            {/* Compact control stack: zoom / reset / layers */}
            <div
                ref={controlsRef}
                className="absolute right-[12px] top-[12px] z-20 flex flex-col items-end gap-[8px]"
            >
                <div className="maplibregl-ctrl-group flex flex-col overflow-hidden">
                    <button
                        type="button"
                        className={CTRL_BTN_CLASSES}
                        title="Zoom in"
                        aria-label="Zoom in"
                        onClick={() => mapRef.current?.zoomIn()}
                    >
                        <i className="fa-solid fa-plus"></i>
                    </button>
                    <button
                        type="button"
                        className={CTRL_BTN_CLASSES}
                        title="Zoom out"
                        aria-label="Zoom out"
                        onClick={() => mapRef.current?.zoomOut()}
                    >
                        <i className="fa-solid fa-minus"></i>
                    </button>
                    <button
                        type="button"
                        className={CTRL_BTN_CLASSES}
                        title="Reset view to the Philippines"
                        aria-label="Reset view to the Philippines"
                        onClick={resetView}
                    >
                        <i className="fa-solid fa-location-crosshairs"></i>
                    </button>
                    <button
                        type="button"
                        className={`${CTRL_BTN_CLASSES} ${layersOpen ? 'active' : ''}`}
                        title="Map layers"
                        aria-label="Map layers"
                        aria-haspopup="dialog"
                        aria-expanded={layersOpen}
                        onClick={() => setLayersOpen((o) => !o)}
                    >
                        <i className="fa-solid fa-layer-group"></i>
                    </button>
                </div>

                {layersOpen ? <MapLayersPanel state={layerState} onToggle={handleToggle} /> : null}
            </div>

            {children}
        </div>
    );
}
