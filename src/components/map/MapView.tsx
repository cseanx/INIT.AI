import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Map as MapLibreMap, Popup, setWorkerUrl } from 'maplibre-gl';
import type { MapMouseEvent, RasterTileSource, StyleSpecification } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useCity } from '../../contexts/CityContext';
import {
    GIBS_LST_ATTRIBUTION,
    GIBS_LST_LAYER_ID,
    GIBS_LST_SOURCE_ID,
    LST_CADENCE_LABEL,
    LST_MODE_LABEL,
    gibsLstTileUrl,
    type LstCadence,
    type LstMode,
} from './gibsLst';
import { sampleGibsLstPoint, type GibsLstSample } from './gibsLstSample';
import { lstRecolorUrl, registerLstRecolorProtocol } from './lstRecolor';

// MapLibre needs its worker resolved by the bundler when using a vector style.
setWorkerUrl(workerUrl);
registerLstRecolorProtocol();

/**
 * Free, keyless raster basemap. OpenFreeMap's current public vector tiles are
 * returning empty z7/z8 tiles over Metro Manila, so use Esri's dark canvas
 * with a separate transparent labels layer above the thermal raster.
 */
const BASEMAP_LABELS_ID = 'basemap-labels';
const BASEMAP_STYLE: StyleSpecification = {
    version: 8,
    sources: {
        basemap: {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution:
                'Esri, HERE, Garmin, © OpenStreetMap contributors, and the GIS user community',
        },
        [BASEMAP_LABELS_ID]: {
            type: 'raster',
            tiles: [
                'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
        },
    },
    layers: [
        {
            id: 'basemap-background',
            type: 'background',
            paint: { 'background-color': '#0b0e14' },
        },
        {
            id: 'basemap',
            type: 'raster',
            source: 'basemap',
            paint: { 'raster-opacity': 0.92 },
        },
        {
            id: BASEMAP_LABELS_ID,
            type: 'raster',
            source: BASEMAP_LABELS_ID,
        },
    ],
};

/** Keep the camera around the Philippines so users can't wander the world. */
const TRAVEL_LIMITS: [[number, number], [number, number]] = [
    [113.0, 2.0],
    [130.5, 23.5],
];

interface MapViewProps {
    className?: string;
    children?: ReactNode;
    /** UTC date (YYYY-MM-DD) of the daily pass, or start of the 8-day period. */
    lstDate: string;
    /** Daily pass or 8-day composite. */
    lstCadence: LstCadence;
    /** Day or night pass for the selected date. */
    lstMode: LstMode;
    /** Whether the LST raster is visible. */
    lstVisible: boolean;
}

const CTRL_BTN_CLASSES =
    'map-ctrl-btn flex h-[30px] w-[30px] cursor-pointer items-center justify-center border-none bg-transparent text-[12.5px] transition duration-200';

function formatPassDate(isoDate: string): string {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
}

function popupShell(body: string): string {
    return `<div class="lst-popup">${body}</div>`;
}

function loadingPopupHtml(lat: number, lng: number): string {
    return popupShell(`
        <div class="lst-popup-title">Reading NASA LST…</div>
        <div class="lst-popup-sub">MODIS Aqua · 1 km pixel</div>
        <div class="lst-popup-meta">${lat.toFixed(4)}, ${lng.toFixed(4)}</div>
    `);
}

function resultPopupHtml(
    sample: GibsLstSample,
    pass: { lstDate: string; lstMode: LstMode; lstCadence: LstCadence },
    lat: number,
    lng: number,
): string {
    const passLine = `${formatPassDate(pass.lstDate)} · ${LST_MODE_LABEL[pass.lstMode]} · ${LST_CADENCE_LABEL[pass.lstCadence]}`;
    const coords = `${lat.toFixed(3)}, ${lng.toFixed(3)} · NASA GIBS`;

    if (sample.status === 'ok') {
        return popupShell(`
            <div class="lst-popup-title">Land-surface temperature</div>
            <div class="lst-popup-sub">MODIS Aqua LST · 1 km pixel</div>
            <div class="lst-popup-temp">≈ ${sample.tempC.toFixed(1)} °C</div>
            <div class="lst-popup-meta">${passLine}</div>
            <div class="lst-popup-meta">${coords}</div>
            <div class="lst-popup-note">1 km color-bin estimate from the NASA raster shown — not a live sensor reading.</div>
        `);
    }

    if (sample.status === 'nodata') {
        return popupShell(`
            <div class="lst-popup-title">Land-surface temperature</div>
            <div class="lst-popup-sub">MODIS Aqua LST · 1 km pixel</div>
            <div class="lst-popup-temp empty">No retrieval</div>
            <div class="lst-popup-meta">${passLine}</div>
            <div class="lst-popup-meta">${coords}</div>
            <div class="lst-popup-note">Cloud or ocean for this pass — there is no LST pixel here.</div>
        `);
    }

    return popupShell(`
        <div class="lst-popup-title">Land-surface temperature</div>
        <div class="lst-popup-sub">MODIS Aqua LST · 1 km pixel</div>
        <div class="lst-popup-temp empty">Unavailable</div>
        <div class="lst-popup-meta">${passLine}</div>
        <div class="lst-popup-meta">${coords}</div>
        <div class="lst-popup-note">The NASA GIBS tile for this pass could not be read. Try another date or pass.</div>
    `);
}

/**
 * Heat Map workspace: Esri Dark Gray Canvas basemap + NASA GIBS MODIS LST.
 *
 * The LST overlay is real satellite data (1 km, one day and one night pass
 * per day, typically published about four days behind real time), colorized
 * by NASA. Clicking the map while LST is visible reads the same GIBS raster
 * at that point and shows the decoded 1 km color-bin value in a popup.
 */
export default function MapView({
    className = '',
    children,
    lstDate,
    lstCadence,
    lstMode,
    lstVisible,
}: MapViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<MapLibreMap | null>(null);
    const popupRef = useRef<Popup | null>(null);
    const latestRef = useRef({ lstDate, lstCadence, lstMode, lstVisible });
    const appliedSelectionRef = useRef(`${lstDate}:${lstCadence}:${lstMode}`);
    const [mapReady, setMapReady] = useState(false);
    const { config: cityConfig } = useCity();

    // Keep the values the one-time style-load handler reads up to date,
    // including changes made before the style has finished loading.
    useEffect(() => {
        latestRef.current = { lstDate, lstCadence, lstMode, lstVisible };
    }, [lstDate, lstCadence, lstMode, lstVisible]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container || mapRef.current) return;

        const map = new MapLibreMap({
            container,
            style: BASEMAP_STYLE,
            bounds: cityConfig.bounds,
            fitBoundsOptions: { padding: 36, duration: 0 },
            minZoom: 4.2,
            maxZoom: 17,
            maxBounds: TRAVEL_LIMITS,
            attributionControl: { compact: true },
            trackResize: true,
        });
        mapRef.current = map;

        const addLstLayer = () => {
            if (map.getSource(GIBS_LST_SOURCE_ID)) return;

            let styleLayers;
            try {
                styleLayers = map.getStyle().layers;
            } catch {
                return;
            }
            if (!styleLayers?.length) return;

            // Keep the thermal raster below the transparent labels layer.
            const beforeId = map.getLayer(BASEMAP_LABELS_ID)
                ? BASEMAP_LABELS_ID
                : undefined;

            map.addSource(GIBS_LST_SOURCE_ID, {
                type: 'raster',
                tiles: [
                    lstRecolorUrl(
                        gibsLstTileUrl(
                            latestRef.current.lstDate,
                            latestRef.current.lstMode,
                            latestRef.current.lstCadence,
                        ),
                    ),
                ],
                tileSize: 256,
                minzoom: 0,
                maxzoom: 7,
                attribution: GIBS_LST_ATTRIBUTION,
            });
            map.addLayer(
                {
                    id: GIBS_LST_LAYER_ID,
                    type: 'raster',
                    source: GIBS_LST_SOURCE_ID,
                    layout: {
                        visibility: latestRef.current.lstVisible ? 'visible' : 'none',
                    },
                    paint: {
                        'raster-opacity': 0.55,
                        'raster-resampling': 'nearest',
                        'raster-fade-duration': 0,
                    },
                },
                beforeId,
            );
            map.triggerRepaint();
            appliedSelectionRef.current = `${latestRef.current.lstDate}:${latestRef.current.lstCadence}:${latestRef.current.lstMode}`;
            setMapReady(true);
        };

        map.on('style.load', addLstLayer);
        addLstLayer();

        return () => {
            map.remove();
            mapRef.current = null;
            setMapReady(false);
        };
        // The map is created once; city changes are handled below.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // City selector: refit the camera when the city changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        map.fitBounds(cityConfig.bounds, {
            padding: 36,
            duration: 700,
            maxZoom: 13.5,
            essential: true,
        });
    }, [cityConfig, mapReady]);

    // Swap the pass when the date, cadence, or day/night mode changes.
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        const selection = `${lstDate}:${lstCadence}:${lstMode}`;
        if (appliedSelectionRef.current === selection) return;
        appliedSelectionRef.current = selection;
        const source = map.getSource(GIBS_LST_SOURCE_ID) as RasterTileSource | undefined;
        source?.setTiles([
            lstRecolorUrl(gibsLstTileUrl(lstDate, lstMode, lstCadence)),
        ]);
        map.triggerRepaint();
    }, [lstDate, lstCadence, lstMode, mapReady]);

    // Show/hide the thermal layer.
    useEffect(() => {
        const map = mapRef.current;
        if (!mapReady || !map) return;
        if (map.getLayer(GIBS_LST_LAYER_ID)) {
            map.setLayoutProperty(GIBS_LST_LAYER_ID, 'visibility', lstVisible ? 'visible' : 'none');
        }
    }, [lstVisible, mapReady]);

    // Click-to-sample: read the real GIBS pixel behind the active LST pass.
    // Registered as soon as the map exists so an early click still samples.
    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        let token = 0;

        const close = () => {
            if (!popupRef.current) return;
            popupRef.current.remove();
            popupRef.current = null;
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') close();
        };

        const handleClick = async (event: MapMouseEvent) => {
            const pass = latestRef.current;
            if (!pass.lstVisible) return;

            const { lng, lat } = event.lngLat;
            close();
            const request = ++token;

            const created = new Popup({
                closeButton: false,
                closeOnClick: true,
                offset: 12,
                className: 'lst-popup-wrapper',
                maxWidth: '300px',
            })
                .setLngLat(event.lngLat)
                .setHTML(loadingPopupHtml(lat, lng))
                .addTo(map);
            popupRef.current = created;

            const sample = await sampleGibsLstPoint(
                lng,
                lat,
                pass.lstDate,
                pass.lstMode,
                pass.lstCadence,
            );

            if (request !== token || popupRef.current !== created || !created.isOpen()) return;
            created.setHTML(resultPopupHtml(sample, pass, lat, lng));
        };

        map.on('click', handleClick);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            map.off('click', handleClick);
            document.removeEventListener('keydown', handleKeyDown);
            close();
        };
        // The map instance is stable; pass values are read through latestRef.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // The popup belongs to one pass; drop it when the pass or visibility changes.
    useEffect(() => {
        popupRef.current?.remove();
        popupRef.current = null;
    }, [lstDate, lstCadence, lstMode, lstVisible]);

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
        mapRef.current?.fitBounds(cityConfig.bounds, { padding: 36, duration: 600 });
    }

    return (
        <div ref={containerRef} className={`map-view relative overflow-hidden ${className}`}>
            <div className="absolute right-[12px] top-[12px] z-20 flex flex-col items-end gap-[8px]">
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
                        title={`Reset view to ${cityConfig.name}`}
                        aria-label={`Reset view to ${cityConfig.name}`}
                        onClick={resetView}
                    >
                        <i className="fa-solid fa-location-crosshairs"></i>
                    </button>
                </div>
            </div>

            {children}
        </div>
    );
}
