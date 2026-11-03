import type {
    Barangay,
    CanopySnapshot,
    HeatSnapshot,
    MitigationProject,
    Report,
    Severity,
    StatCardData,
} from '../types';

/* ==========================
   MOCK DATA — prototype only.
   MIMAROPA regional demo (Region IV-B). Values are illustrative, not real
   satellite / sensor observations. To be replaced by the Python backend API
   responses (see src/services/api.ts).
========================== */

type RowSeed = [
    name: string,
    temp: number,
    canopy: number,
    severity: Severity,
    driver: string,
    trend: number,
    area: number,
    canopyChange: number,
    priority: boolean,
];

/** One city/municipality per province, five representative barangays each. */
const MIMAROPA_ROWS: { city: string; province: string; rows: RowSeed[] }[] = [
    {
        city: 'Calapan City',
        province: 'Oriental Mindoro',
        rows: [
            ['Poblacion', 38.6, 12, 'critical', 'Dense commercial core, low shade', 1.8, 85, -2.6, true],
            ['Camilmil', 37.4, 16, 'high', 'Port-adjacent built-up area', 1.3, 120, -2.1, true],
            ['San Vicente', 36.2, 22, 'high', 'Mixed residential density', 0.9, 180, -1.4, false],
            ['San Antonio', 35.1, 28, 'moderate', 'Riverside settlement edge', 0.5, 210, -0.8, false],
            ['Guinobatan', 34.3, 34, 'moderate', 'Peri-urban farmland transition', 0.2, 320, 0.4, false],
        ],
    },
    {
        city: 'Mamburao',
        province: 'Occidental Mindoro',
        rows: [
            ['Poblacion', 36.8, 18, 'high', 'Provincial government core', 1.2, 95, -1.9, true],
            ['Payompon', 35.9, 24, 'moderate', 'Coastal residential strip', 0.7, 140, -1.1, false],
            ['Balansay', 35.3, 29, 'moderate', 'Rice-field edge, low density', 0.4, 260, -0.5, false],
            ['Talabaan', 34.8, 31, 'moderate', 'Rural barangay, mixed canopy', 0.3, 300, -0.2, false],
            ['Santa Maria', 34.1, 36, 'moderate', 'Upland vegetation buffer', 0.1, 350, 0.6, false],
        ],
    },
    {
        city: 'Boac',
        province: 'Marinduque',
        rows: [
            ['Poblacion', 35.8, 20, 'high', 'Heritage town core, impervious', 1.0, 70, -1.6, true],
            ['San Miguel', 35.1, 26, 'moderate', 'Residential infill', 0.6, 150, -0.9, false],
            ['Laylay', 34.7, 30, 'moderate', 'Coastal road corridor', 0.4, 110, -0.6, false],
            ['Tampus', 34.2, 35, 'moderate', 'Hillside mixed vegetation', 0.2, 280, 0.3, false],
            ['Bantad', 33.8, 41, 'moderate', 'Upland forest edge', 0.0, 340, 0.9, false],
        ],
    },
    {
        city: 'Romblon',
        province: 'Romblon',
        rows: [
            ['Poblacion', 35.5, 21, 'high', 'Port and town center', 0.9, 60, -1.3, true],
            ['Cahayag', 34.9, 27, 'moderate', 'Dense coastal settlement', 0.5, 85, -0.8, false],
            ['Cobrador', 33.9, 38, 'moderate', 'Island vegetation cover', 0.1, 190, 0.5, false],
            ['Ilauran', 34.5, 32, 'moderate', 'Mixed residential and orchard', 0.3, 160, -0.3, false],
            ['Macalas', 33.7, 44, 'moderate', 'Upland canopy buffer', -0.1, 240, 1.0, false],
        ],
    },
    {
        city: 'Puerto Princesa City',
        province: 'Palawan',
        rows: [
            ['San Pedro', 39.2, 10, 'critical', 'Dense commercial core, low canopy', 2.1, 130, -3.2, true],
            ['San Jose', 38.4, 13, 'high', 'Market district, impervious surface', 1.7, 95, -2.7, true],
            ['Tanglaw', 37.2, 17, 'high', 'Expanding residential subdivision', 1.2, 220, -1.8, true],
            ['Model', 36.1, 23, 'high', 'Institutional and mixed use', 0.8, 310, -1.0, false],
            ['Mabuhay', 35.3, 30, 'moderate', 'Peri-urban corridor', 0.4, 420, -0.4, false],
        ],
    },
];

export const barangays: Barangay[] = MIMAROPA_ROWS.flatMap(({ city, province, rows }) =>
    rows.map(([name, temp, canopy, severity, driver, trend, area, canopyChange, priority]) => ({
        name,
        temp,
        canopy,
        severity,
        driver,
        trend,
        area,
        canopyChange,
        priority,
        city,
        province,
    })),
);

/* Priority hotspot preview shown on the dashboard */
export const priorityHotspots: Barangay[] = [...barangays]
    .filter((b) => b.priority)
    .sort((a, b) => b.temp - a.temp)
    .slice(0, 4);

export const dashboardStats: StatCardData[] = [
    { icon: 'fa-temperature-high', tone: 'red', value: '35.6', valueSuffix: '°C', label: 'Avg. Surface Temp', trendIcon: 'fa-arrow-trend-up', trend: '1.8° vs last month', trendTone: 'up' },
    { icon: 'fa-fire', tone: 'orange', value: '10', label: 'Active Hotspots', trendIcon: 'fa-arrow-trend-up', trend: '2 new this week', trendTone: 'up' },
    { icon: 'fa-tree', tone: 'green', value: '26.3', valueSuffix: '%', label: 'Canopy Coverage', trendIcon: 'fa-arrow-trend-down', trend: '1.2% vs 2024', trendTone: 'down' },
    { icon: 'fa-map-location-dot', tone: 'blue', value: '25', label: 'Barangays Monitored', trendIcon: 'fa-satellite', trend: 'Across 5 provinces', trendTone: 'neutral' },
];

export const canopyStats: StatCardData[] = [
    { icon: 'fa-leaf', tone: 'green', value: '1,430', valueSuffix: ' ha', label: 'Total Canopy Area', trendIcon: 'fa-arrow-trend-down', trend: '-2.8% (5yr)', trendTone: 'down' },
    { icon: 'fa-seedling', tone: 'red', value: '8', label: 'Priority Replanting Zones', trendIcon: 'fa-map-pin', trend: 'Flagged by AI model', trendTone: 'neutral' },
    { icon: 'fa-droplet', tone: 'blue', value: '34.6', valueSuffix: '%', label: 'Impervious Surface', trendIcon: 'fa-arrow-trend-up', trend: '+0.6% vs 2024', trendTone: 'up' },
];

export const reports: Report[] = [
    { id: 1, demo: true, title: 'MIMAROPA Q3 Urban Heat Summary', type: 'Quarterly', area: 'MIMAROPA (All Provinces)', date: 'Aug 1, 2026', status: 'ready', city: 'MIMAROPA', coverage: 'Entire region', periodStart: 'Jul 1, 2026', periodEnd: 'Jul 31, 2026', preparedBy: 'Juan Dela Cruz', autoPriorityAreas: false, datasets: ['lst', 'hotspots', 'trends'], areas: ['Poblacion (Calapan City)', 'San Pedro (Puerto Princesa City)', 'Poblacion (Boac)'], sections: ['summary', 'heat', 'hotspots', 'charts', 'methodology'], recommendations: 'Prioritize urban tree planting in Calapan City, Puerto Princesa City and Boac.', avgSurfaceTemp: 35.6, peakTemp: 39.2, peakArea: 'San Pedro', criticalCount: 2, highCount: 8, moderateCount: 15, avgCanopy: 26.3, mitigationProjects: 4 },
    { id: 2, demo: true, title: 'San Pedro Priority Zone Deep Dive', type: 'Hotspot Brief', area: 'San Pedro, Puerto Princesa City', date: 'Jul 28, 2026', status: 'ready', city: 'Puerto Princesa City', coverage: 'Barangay', periodStart: 'Jun 1, 2026', periodEnd: 'Jun 30, 2026', preparedBy: 'Maria Santos', autoPriorityAreas: false, datasets: ['lst', 'hotspots', 'canopy'], areas: ['San Pedro'], sections: ['summary', 'hotspots', 'canopy', 'mitigation'], recommendations: 'Fast-track tree planting along the San Pedro commercial core.', avgSurfaceTemp: 37.8, peakTemp: 39.2, peakArea: 'San Pedro', criticalCount: 1, highCount: 2, moderateCount: 2, avgCanopy: 18.6, mitigationProjects: 1 },
    { id: 3, demo: true, title: 'MIMAROPA Canopy Loss Assessment 2021–2026', type: 'Canopy', area: 'Region-wide', date: 'Jul 20, 2026', status: 'ready', city: 'MIMAROPA', coverage: 'Entire region', periodStart: 'Jan 1, 2021', periodEnd: 'Dec 31, 2025', preparedBy: 'Maria Santos', autoPriorityAreas: false, datasets: ['canopy', 'landcover'], areas: [], sections: ['summary', 'canopy', 'maps', 'charts', 'methodology', 'sources'], recommendations: 'Address canopy deficits in the priority barangays of Calapan and Puerto Princesa.', avgSurfaceTemp: 35.6, peakTemp: 39.2, peakArea: 'San Pedro', criticalCount: 2, highCount: 8, moderateCount: 15, avgCanopy: 26.3, mitigationProjects: 4 },
    { id: 4, demo: true, title: 'Mitigation Impact Projection', type: 'Mitigation', area: '8 Priority Barangays', date: 'Aug 5, 2026', status: 'processing', city: 'MIMAROPA', coverage: 'Entire region', periodStart: 'Jan 1, 2026', periodEnd: 'Dec 31, 2026', preparedBy: 'Ramon Reyes', autoPriorityAreas: true, datasets: ['lst', 'hotspots', 'mitigation'], areas: [], sections: ['summary', 'mitigation', 'charts'], recommendations: '', avgSurfaceTemp: 35.6, peakTemp: 39.2, peakArea: 'San Pedro', criticalCount: 2, highCount: 8, moderateCount: 15, avgCanopy: 26.3, mitigationProjects: 4 },
    { id: 5, demo: true, title: 'August Satellite Pass Summary', type: 'Monthly', area: 'MIMAROPA (All Provinces)', date: 'Aug 6, 2026', status: 'processing', city: 'MIMAROPA', coverage: 'Entire region', periodStart: 'Aug 1, 2026', periodEnd: 'Aug 31, 2026', preparedBy: 'Juan Dela Cruz', autoPriorityAreas: false, datasets: ['lst', 'trends'], areas: [], sections: ['summary', 'heat', 'charts', 'sources'], recommendations: '', avgSurfaceTemp: 35.6, peakTemp: 39.2, peakArea: 'San Pedro', criticalCount: 2, highCount: 8, moderateCount: 15, avgCanopy: 26.3, mitigationProjects: 4 },
];

export const mitigationProjects: MitigationProject[] = [
    {
        id: 'urban-tree-planting',
        icon: 'fa-tree',
        status: 'Proposed',
        title: 'Urban Tree Planting',
        description: 'Fast-canopy native species along Poblacion and Camilmil arterials in Calapan City.',
        impact: '-2.1°C',
        impactLabel: 'Projected local drop',
        metric: '3,600',
        metricLabel: 'Trees needed',
        progress: 58,
    },
    {
        id: 'cool-roofing',
        icon: 'fa-house-chimney',
        status: 'In Progress',
        title: 'Cool / Reflective Roofing',
        description: 'Retrofit high-density rooftops in San Pedro and San Jose, Puerto Princesa City.',
        impact: '-1.4°C',
        impactLabel: 'Projected local drop',
        metric: '1,200',
        metricLabel: 'Rooftops targeted',
        progress: 35,
    },
    {
        id: 'green-corridors',
        icon: 'fa-road',
        status: 'Proposed',
        title: 'Green Corridors & Pocket Parks',
        description: "Convert underused lots around Boac's heritage core into shaded pocket parks.",
        impact: '-1.8°C',
        impactLabel: 'Projected local drop',
        metric: '9',
        metricLabel: 'Sites identified',
        progress: 18,
    },
    {
        id: 'permeable-pavements',
        icon: 'fa-water',
        status: 'Planned',
        title: 'Permeable Pavements',
        description: "Replace impervious pavement in Romblon's port district flood-heat overlap zones.",
        impact: '-0.9°C',
        impactLabel: 'Projected local drop',
        metric: '2.6',
        metricSuffix: 'km',
        metricLabel: 'Road length',
        progress: 6,
    },
];

export const canopySnapshot: CanopySnapshot = {
    barData: [
        { name: 'Macalas (Romblon)', value: 44 },
        { name: 'Bantad (Boac)', value: 41 },
        { name: 'Cobrador (Romblon)', value: 38 },
        { name: 'Santa Maria (Mamburao)', value: 36 },
        { name: 'Tampus (Boac)', value: 35 },
        { name: 'Guinobatan (Calapan)', value: 34 },
    ],
    trend: {
        labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
        values: [29.1, 28.7, 28.2, 27.6, 27.0, 26.3],
    },
    landCover: [
        { label: 'Built-up', value: 42, color: '#ff2d55' },
        { label: 'Vegetation', value: 38, color: '#00ff84' },
        { label: 'Bare Soil', value: 9, color: '#ffd23f' },
        { label: 'Water Bodies', value: 11, color: '#5aa9ff' },
    ],
    priorityZones: [
        { name: 'Poblacion (Calapan)', cover: 12, priority: 'Critical', tags: ['Needs Trees', 'High Heat'] },
        { name: 'San Pedro (Puerto Princesa)', cover: 10, priority: 'Critical', tags: ['Needs Trees', 'Commercial'] },
        { name: 'Poblacion (Boac)', cover: 20, priority: 'High', tags: ['Heritage Core', 'Low Shade'] },
        { name: 'Poblacion (Romblon)', cover: 21, priority: 'High', tags: ['Port Area', 'Residential'] },
    ],
};

export const heatSnapshot: HeatSnapshot = {
    capturedAt: new Date().toISOString(),
    scale: [28, 42],
    readings: barangays.map((b) => ({ barangay: b.name, temperature: b.temp })),
};
