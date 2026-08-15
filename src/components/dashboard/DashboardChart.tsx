import { useMemo } from 'react';
import type { ChartConfiguration } from 'chart.js';
import type { Barangay } from '../../types';
import { chartTheme } from '../../utils/chartTheme';
import ChartCanvas from '../common/ChartCanvas';

/** Canopy % vs surface temp scatter for the dashboard panel. */
export default function DashboardChart({ data }: { data: Barangay[] }) {
    const config = useMemo<ChartConfiguration<'scatter'>>(() => {
        const th = chartTheme();
        return {
            type: 'scatter',
            data: {
                datasets: [
                    {
                        label: 'Barangays',
                        data: data.map((b) => ({ x: b.canopy, y: b.temp })),
                        backgroundColor: th.red,
                        pointRadius: 5,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
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
    }, [data]);

    return <ChartCanvas id="dashMiniChart" config={config} />;
}
