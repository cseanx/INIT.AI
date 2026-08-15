# INIT.AI

AI-powered Urban Heat Island Mapping & Mitigation Platform for Philippine Cities.

## Stack

- React 19 + TypeScript (strict)
- Vite 7
- Tailwind CSS v4 (`@tailwindcss/vite`)
- React Router v7
- Chart.js 4

## Getting started

```bash
npm install
npm run dev        # start the Vite dev server
npm run build      # typecheck + production build (outputs to dist/)
npm run preview    # serve the production build
```

## Project structure

```
src/
  components/
    layout/      Sidebar, Topbar, AccountMenu, DashboardLayout
    dashboard/   StatCard, DashboardChart
    heatmap/     HeatLegend
    hotspots/    HotspotTable, SeverityBadge
    canopy/      CanopyCharts, CanopyTable, PriorityZones
    mitigation/  MitigationCard
    reports/     ReportsTable
    settings/    Switch, ToggleRow, ThemePicker, AccentPicker
    common/      ChartCanvas, Card, Particles
  pages/         Login, Dashboard, HeatMap, Hotspots, Canopy, Mitigation, Reports, Settings
  data/          mockData.ts — prototype mock data (swap for API responses later)
  services/      api.ts — typed API layer with mock fallback
  hooks/         useApiData, useClock
  types/         shared domain types
  utils/         chartTheme, tempToColor, toneClasses
  App.tsx        lazy-loaded route definitions
  main.tsx
  input.css      Tailwind source (@theme tokens, animations, component layer)
```

## Routes

- `/login` — prototype login screen
- `/dashboard`, `/heatmap`, `/hotspots`, `/canopy`, `/mitigation`, `/reports`, `/settings`

## API layer

`src/services/api.ts` targets the future Python backend:

```
GET /api/heat
GET /api/hotspots
GET /api/canopy
GET /api/mitigation
GET /api/reports
```

While the backend does not exist, every call gracefully falls back to
`src/data/mockData.ts`. When the backend is live, re-enable the dev proxy
(see `vite.config.ts`) and delete the mock data.

## Notes

- All chart instances are destroyed on unmount (`components/common/ChartCanvas.tsx`).
- Pages are lazy-loaded; Chart.js is split into its own chunk.
- The prototype uses mock environmental data — nothing here is real
  satellite/sensor data yet.
