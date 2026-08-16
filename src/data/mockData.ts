import type {
    Barangay,
    CanopySnapshot,
    HeatSnapshot,
    MitigationProject,
    Report,
    StatCardData,
} from '../types';

/* ==========================
   MOCK DATA — prototype only.
   To be replaced by the Python backend API responses
   (see src/services/api.ts). Do not treat as real
   satellite / sensor observations.
========================== */

export const barangays: Barangay[] = [
    { name: 'Payatas', temp: 41.2, canopy: 12, severity: 'critical', driver: 'Open dump heat retention', trend: 2.4, area: 180, canopyChange: -4.1, priority: true },
    { name: 'Batasan Hills', temp: 38.9, canopy: 16, severity: 'high', driver: 'Dense low-rise residential', trend: 1.6, area: 210, canopyChange: -2.8, priority: true },
    { name: 'Cubao (Commercial)', temp: 38.1, canopy: 9, severity: 'high', driver: 'Impervious commercial surface', trend: 1.1, area: 40, canopyChange: -1.2, priority: true },
    { name: 'Novaliches Proper', temp: 36.4, canopy: 21, severity: 'moderate', driver: 'Recent canopy loss', trend: 0.8, area: 260, canopyChange: -3.3, priority: true },
    { name: 'Fairview', temp: 35.8, canopy: 24, severity: 'moderate', driver: 'Expanding subdivision', trend: 0.6, area: 640, canopyChange: -0.9, priority: false },
    { name: 'Commonwealth', temp: 37.6, canopy: 18, severity: 'high', driver: 'Traffic corridor heat', trend: 1.3, area: 520, canopyChange: -2.0, priority: true },
    { name: 'Diliman', temp: 33.1, canopy: 38, severity: 'moderate', driver: 'Institutional grounds edge', trend: 0.2, area: 410, canopyChange: 0.3, priority: false },
    { name: 'Project 6', temp: 36.9, canopy: 19, severity: 'moderate', driver: 'Mixed residential density', trend: 0.9, area: 150, canopyChange: -1.1, priority: false },
    { name: 'Bagong Silangan', temp: 37.9, canopy: 15, severity: 'high', driver: 'Informal settlement density', trend: 1.4, area: 190, canopyChange: -3.4, priority: true },
    { name: 'Holy Spirit', temp: 35.2, canopy: 22, severity: 'moderate', driver: 'Rooftop heat absorption', trend: 0.5, area: 230, canopyChange: -0.7, priority: false },
    { name: 'Tandang Sora', temp: 34.4, canopy: 27, severity: 'moderate', driver: 'Low canopy along main road', trend: 0.3, area: 380, canopyChange: 0.2, priority: false },
    { name: 'UP Campus', temp: 30.6, canopy: 52, severity: 'moderate', driver: 'Baseline — high canopy zone', trend: -0.4, area: 490, canopyChange: 1.1, priority: false },
    { name: 'Kamuning', temp: 37.1, canopy: 14, severity: 'high', driver: 'Dense commercial strip', trend: 1.0, area: 60, canopyChange: -1.8, priority: true },
    { name: 'San Bartolome', temp: 36.1, canopy: 20, severity: 'moderate', driver: 'Riverside informal housing', trend: 0.7, area: 240, canopyChange: -1.0, priority: false },
    { name: 'Sauyo', temp: 34.9, canopy: 26, severity: 'moderate', driver: 'Light industrial edge', trend: 0.4, area: 300, canopyChange: -0.4, priority: false },
    { name: 'Pasong Tamo', temp: 39.4, canopy: 11, severity: 'critical', driver: 'Warehouse / logistics zone', trend: 1.9, area: 95, canopyChange: -3.9, priority: true },
    { name: 'Talipapa', temp: 38.6, canopy: 13, severity: 'critical', driver: 'Market district, low shade', trend: 1.7, area: 70, canopyChange: -3.1, priority: true },
];

/* Priority hotspot preview shown on the dashboard */
export const priorityHotspots: Barangay[] = [
    { name: 'Payatas', temp: 41.2, canopy: 12, severity: 'critical', driver: 'Landfill-adjacent informal settlement', trend: 2.4, area: 180, canopyChange: -4.1, priority: true },
    { name: 'Batasan Hills', temp: 38.9, canopy: 16, severity: 'high', driver: 'Dense residential, low canopy', trend: 1.6, area: 210, canopyChange: -2.8, priority: true },
    { name: 'Cubao Commercial District', temp: 38.1, canopy: 9, severity: 'high', driver: 'Impervious surface, no tree cover', trend: 1.1, area: 40, canopyChange: -1.2, priority: true },
    { name: 'Novaliches Proper', temp: 36.4, canopy: 21, severity: 'moderate', driver: 'Mixed-use, canopy loss detected', trend: 0.8, area: 260, canopyChange: -3.3, priority: true },
];

export const dashboardStats: StatCardData[] = [
    { icon: 'fa-temperature-high', tone: 'red', value: '34.6', valueSuffix: '°C', label: 'Avg. Surface Temp', trendIcon: 'fa-arrow-trend-up', trend: '2.1° vs last month', trendTone: 'up' },
    { icon: 'fa-fire', tone: 'orange', value: '17', label: 'Active Hotspots', trendIcon: 'fa-arrow-trend-up', trend: '3 new this week', trendTone: 'up' },
    { icon: 'fa-tree', tone: 'green', value: '28.4', valueSuffix: '%', label: 'Canopy Coverage', trendIcon: 'fa-arrow-trend-down', trend: '1.4% vs 2024', trendTone: 'down' },
    { icon: 'fa-map-location-dot', tone: 'blue', value: '142', label: 'Barangays Monitored', trendIcon: 'fa-satellite', trend: 'Updated 4h ago', trendTone: 'neutral' },
];

export const canopyStats: StatCardData[] = [
    { icon: 'fa-leaf', tone: 'green', value: '6,214', valueSuffix: ' ha', label: 'Total Canopy Area', trendIcon: 'fa-arrow-trend-down', trend: '-1.4% (5yr)', trendTone: 'down' },
    { icon: 'fa-seedling', tone: 'red', value: '9', label: 'Priority Replanting Zones', trendIcon: 'fa-map-pin', trend: 'Flagged by AI model', trendTone: 'neutral' },
    { icon: 'fa-droplet', tone: 'blue', value: '31.2', valueSuffix: '%', label: 'Impervious Surface', trendIcon: 'fa-arrow-trend-up', trend: '+0.8% vs 2024', trendTone: 'up' },
];

export const reports: Report[] = [
    { title: 'Q3 Urban Heat Island Summary', type: 'Quarterly', area: 'Quezon City (All Districts)', date: 'Aug 1, 2026', status: 'ready' },
    { title: 'Payatas Priority Zone Deep Dive', type: 'Hotspot Brief', area: 'Payatas', date: 'Jul 28, 2026', status: 'ready' },
    { title: 'Canopy Loss Assessment 2021–2026', type: 'Canopy', area: 'City-wide', date: 'Jul 20, 2026', status: 'ready' },
    { title: 'Mitigation Impact Projection', type: 'Mitigation', area: '6 Priority Barangays', date: 'Aug 5, 2026', status: 'processing' },
    { title: 'August Satellite Pass Summary', type: 'Monthly', area: 'Quezon City (All Districts)', date: 'Aug 6, 2026', status: 'processing' },
];

export const mitigationProjects: MitigationProject[] = [
    {
        id: 'urban-tree-planting',
        icon: 'fa-tree',
        status: 'Proposed',
        title: 'Urban Tree Planting',
        description: 'Fast-canopy native species along arterial roads in Payatas and Batasan Hills.',
        impact: '-2.1°C',
        impactLabel: 'Projected local drop',
        metric: '4,800',
        metricLabel: 'Trees needed',
        progress: 65,
    },
    {
        id: 'cool-roofing',
        icon: 'fa-house-chimney',
        status: 'In Progress',
        title: 'Cool / Reflective Roofing',
        description: 'Retrofit high-density residential rooftops in Cubao with reflective coating.',
        impact: '-1.4°C',
        impactLabel: 'Projected local drop',
        metric: '1,200',
        metricLabel: 'Rooftops targeted',
        progress: 40,
    },
    {
        id: 'green-corridors',
        icon: 'fa-road',
        status: 'Proposed',
        title: 'Green Corridors & Pocket Parks',
        description: 'Convert underused lots along Commonwealth Ave into shaded pocket parks.',
        impact: '-1.8°C',
        impactLabel: 'Projected local drop',
        metric: '12',
        metricLabel: 'Sites identified',
        progress: 22,
    },
    {
        id: 'permeable-pavements',
        icon: 'fa-water',
        status: 'Planned',
        title: 'Permeable Pavements',
        description: 'Replace impervious pavement in Novaliches Proper flood-heat overlap zones.',
        impact: '-0.9°C',
        impactLabel: 'Projected local drop',
        metric: '3.2',
        metricSuffix: 'km',
        metricLabel: 'Road length',
        progress: 8,
    },
];

export const canopySnapshot: CanopySnapshot = {
    barData: [
        { name: 'Diliman', value: 42 },
        { name: 'Batasan Hills', value: 35 },
        { name: 'Fairview', value: 33 },
        { name: 'Novaliches', value: 28 },
        { name: 'Payatas', value: 18 },
        { name: 'Cubao', value: 14 },
    ],
    trend: {
        labels: ['2021', '2022', '2023', '2024', '2025', '2026'],
        values: [34, 33, 32, 31.6, 31.4, 31.2],
    },
    landCover: [
        { label: 'Built-up', value: 52, color: '#ff2d55' },
        { label: 'Vegetation', value: 31, color: '#00ff84' },
        { label: 'Bare Soil', value: 10, color: '#ffd23f' },
        { label: 'Water Bodies', value: 7, color: '#5aa9ff' },
    ],
    priorityZones: [
        { name: 'Payatas', cover: 12, priority: 'Critical', tags: ['Needs Trees', 'High Heat'] },
        { name: 'Cubao', cover: 15, priority: 'High', tags: ['Needs Trees', 'Residential'] },
        { name: 'Batasan Hills', cover: 22, priority: 'Medium', tags: ['School Zone', 'Residential'] },
        { name: 'Fairview', cover: 29, priority: 'Moderate', tags: ['Residential'] },
    ],
};

export const heatSnapshot: HeatSnapshot = {
    capturedAt: new Date().toISOString(),
    scale: [28, 42],
    readings: barangays.map((b) => ({ barangay: b.name, temperature: b.temp })),
};
