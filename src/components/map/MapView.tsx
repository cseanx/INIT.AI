import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Map as MapLibreMap } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import MapLayersPanel from './MapLayersPanel';
import { attachLSTLayer, bindLSTInteractions } from './lstLayer';
import { loadLSTData } from './lstData';
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

/** Clean satellite basemap (Esri World Imagery — no API key required) with
 *  a place/boundary label reference layer rendered above the imagery so
 *  geographic names stay readable over the photos. */
const SATELLITE_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        esri: {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 19,
            attribution: '© Esri, Maxar, Earthstar Geographics',
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
    },
    layers: [
        {
            id: 'satellite-basemap',
            type: 'raster',
            source: 'esri',
        },
        {
            id: 'place-labels',
            type: 'raster',
            source: 'esriLabels',
        },
    ],
};

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
 * The instance is created once on mount and destroyed on unmount. Because
 * routed pages stay mounted (hidden with CSS), the map listens for the
 * bubbling `page-visible` event to resize itself when its page reappears.
 *
 * A compact React control stack (zoom, reset-to-Philippines, layers) floats
 * top-right; layer visibility is driven by the registry in layers.ts so
 * future backend layers plug in without UI changes.
 */
export default function MapView({ className = '', children, onLayerStateChange }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const lstCleanupRef = useRef<(() => void) | null>(null);
    const [mapReady, setMapReady] = useState(false);
    const [layersOpen, setLayersOpen] = useState(false);
    const [layerState, setLayerState] = useState<Record<string, boolean>>(defaultLayerState);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || mapRef.current) return;

        const map = new MapLibreMap({
            container,
            style: SATELLITE_STYLE,
            bounds: PHILIPPINES_BOUNDS,
            fitBoundsOptions: { padding: 36, duration: 0 },
            minZoom: 4.2,
            maxZoom: 17,
            maxBounds: TRAVEL_LIMITS,
            attributionControl: { compact: true },
            trackResize: true,
        });

        // Attach the LST overlay once the style exists. Data loading is
        // isolated in lstData.ts (mock today, FastAPI/PostGIS later); a
        // failure here leaves the rest of the map fully functional.
        async function initLayers() {
            try {
                const data = await loadLSTData();
                if (!mapRef.current) return;
                if (attachLSTLayer(mapRef.current, data)) {
                    lstCleanupRef.current = bindLSTInteractions(mapRef.current);
                }
            } catch {
                console.warn('INIT.AI map: LST layer unavailable — skipping.');
            } finally {
                // Ready only after LST attach attempts, so the visibility
                // sync below sees the final layer set.
                setMapReady(true);
            }
        }

        map.on('load', () => {
            void initLayers();
        });
        mapRef.current = map;

        return () => {
            lstCleanupRef.current?.();
            lstCleanupRef.current = null;
            map.remove();
            mapRef.current = null;
            setMapReady(false);
        };
    }, []);

    // Push layer visibility onto the map whenever a toggle changes (and
    // once the style + runtime layers are loaded). Missing/future layers
    // resolve to no-ops.
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        for (const layer of MAP_LAYERS) {
            applyLayerVisibility(map, layer, layerState[layer.id] ?? false);
        }
    }, [layerState, mapReady]);

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