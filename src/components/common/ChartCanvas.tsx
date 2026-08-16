import { useEffect, useRef, useState } from 'react';
import {
    Chart,
    registerables,
    type ChartConfiguration,
} from 'chart.js';

Chart.register(...registerables);

interface ChartCanvasProps {
    id: string;
    config: ChartConfiguration;
    className?: string;
}

/**
 * Thin Chart.js wrapper: creates the chart on mount and always destroys
 * the instance on unmount so instances never leak. Pauses rendering while
 * the browser tab is hidden.
 */
export default function ChartCanvas({ id, config, className }: ChartCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || failed) return;

        try {
            chartRef.current = new Chart(canvas, config);
        } catch (err) {
            console.error(`Chart "${id}" failed to render:`, err);
            setFailed(true);
        }
        return () => {
            chartRef.current?.destroy();
            chartRef.current = null;
        };
    }, [id, config, failed]);

    useEffect(() => {
        function onVisibilityChange() {
            const chart = chartRef.current;
            if (!chart) return;
            if (document.hidden) {
                chart.stop();
            } else {
                chart.render();
            }
        }
        document.addEventListener('visibilitychange', onVisibilityChange);
        return () => document.removeEventListener('visibilitychange', onVisibilityChange);
    }, []);

    if (failed) {
        return (
            <div className="chart-fallback">
                <i className="fa-solid fa-triangle-exclamation"></i>
                Couldn't render this chart
            </div>
        );
    }

    return <canvas id={id} ref={canvasRef} className={className ?? 'block h-full w-full'} />;
}
