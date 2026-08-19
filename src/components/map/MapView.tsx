import { useEffect, useRef, type ReactNode } from 'react';
import { Map as MapLibreMap, NavigationControl } from 'maplibre-gl';
import type { StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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

/** Clean satellite basemap (Esri World Imagery — no API key required). */
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
    },
    layers: [
        {
            id: 'satellite-basemap',
            type: 'raster',
            source: 'esri',
        },
    ],
};

interface MapViewProps {
    className?: string;
    children?: ReactNode;
}

/**
 * Large interactive MapLibre GL map for the Heat Map page.
 *
 * The instance is created once on mount and destroyed on unmount. Because
 * routed pages stay mounted (hidden with CSS), the map listens for the
 * bubbling `page-visible` event to resize itself when its page reappears.
 */
export default function MapView({ className = '', children }: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);

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

        map.addControl(new NavigationControl({ showCompass: false }), 'top-right');
        mapRef.current = map;

        return () => {
            map.remove();
            mapRef.current = null;
        };
    }, []);

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

    return (
        <div ref={containerRef} className={`map-view relative overflow-hidden ${className}`}>
            {children}
        </div>
    );
}