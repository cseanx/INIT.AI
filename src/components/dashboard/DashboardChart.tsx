import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { Barangay } from '../../types';
import { baseChartOptions, chartTheme } from '../../utils/chartTheme';
import { usePreferences } from '../../preferences/PreferencesContext';
import ChartCanvas from '../common/ChartCanvas';

/** Canopy % vs surface temp scatter for the dashboard panel. */
export default function DashboardChart({ data }: { data: Barangay[] }) {
    const { resolvedTheme, preferences } = usePreferences();
    const config = useMemo<ChartConfiguration<'scatter'>>(() => {
        const th = chartTheme(resolvedTheme, preferences.accent);
        return {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Barangays',
                        data: data.map((b) => ({ x: b.canopy, y: b.temp })),
                        backgroundColor: th.brand,
                        pointRadius: 5,
                    },
                ],
            },
            options: {
                ...baseChartOptions(),
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        title: { display: true, text: 'Canopy %', color: th.text },
                        ticks: { color: th.text },
                        grid: { color: th.grid },
                    },
                    y: {
                        title: { display: true, text: 'Temp °C', color: th.text },
                        ticks: { color: th.text },
                        grid: { color: th.grid },
                    },
                },
            },
        };
    }, [data, resolvedTheme, preferences.accent]);

    return <ChartCanvas id="dashMiniChart" config={config} />;
}
