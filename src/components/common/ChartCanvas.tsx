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
 * Thin Chart.js wrapper.
 *
 * The chart instance is created lazily, only once its canvas becomes
 * visible (IntersectionObserver). This guarantees the entrance animation
 * is never played off-screen, in a background tab, or below the fold —
 * and that the user always sees it. Page switches replay the entrance
 * via the `page-visible` event. Instances are destroyed on unmount so
 * they never leak.
 */
export default function ChartCanvas({ id, config, className }: ChartCanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const chartRef = useRef<Chart | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || failed) return;

        let created = false;
        const createChart = () => {
            if (created) return;
            created = true;
            let chart: Chart | undefined;
            try {
                chart = new Chart(canvas, config);
            } catch (err) {
                console.error(`Chart "${id}" failed to render:`, err);
                setFailed(true);
                return;
            }
            chartRef.current = chart;
            // The constructor may draw the final frame immediately and skip
            // the animator, so play the entrance on our own terms: cancel
            // pending animation work, wipe the canvas, return elements to
            // their initial state, then animate in — always visible.
            chart.stop();
            chart.clear();
            chart.reset();
            chart.update();
        };

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    createChart();
                    observer.disconnect();
                }
            },
            { threshold: 0.01 },
        );
        observer.observe(canvas);

        return () => {
            observer.disconnect();
            if (created) {
                chartRef.current?.destroy();
                chartRef.current = null;
            }
        };
    }, [id, config, failed]);

    // Replay the entrance animation whenever the containing page becomes
    // visible again (page switches), without destroying the chart.
    useEffect(() => {
        function onPageVisible(e: Event) {
            const canvas = canvasRef.current;
            const chart = chartRef.current;
            if (!canvas || !chart) return;
            const target = e.target as Node | null;
            if (
                target === canvas ||
                (target instanceof Element && target.contains(canvas))
            ) {
                chart.reset();
                chart.update();
            }
        }
        document.addEventListener('page-visible', onPageVisible);
        return () => document.removeEventListener('page-visible', onPageVisible);
    }, []);

    // Pause rendering while the browser tab is hidden.
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

    return <canvas id={id} ref={canvasRef} className={className ?? 'block h-full w-full max-w-full'} />;
}
