import { useMemo } from 'react';
import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import { tempToColor } from '../utils/tempToColor';
import HeatLegend from '../components/heatmap/HeatLegend';
import Card from '../components/common/Card';

const CELL_COUNT = 40;

function buildCells(readings: { barangay: string; temperature: number }[]) {
    return Array.from({ length: CELL_COUNT }, (_, i) => {
        const source = readings[i % readings.length];
        const variation = Math.sin(i * 12.9) * 1.6;
        const temperature = Math.max(27, Math.min(42, source.temperature + variation));
        return { name: source.barangay, temperature };
    });
}

export default function HeatMap() {
    const snapshot = useApiData(api.getHeat);
    const cells = useMemo(
        () => (snapshot ? buildCells(snapshot.readings) : null),
        [snapshot],
    );

    return (
        <div className="animate-view-in">
            <Card>
                <div className="panel-head mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Quezon City — Surface Temperature</h3>
                    <div className="flex flex-wrap items-center gap-[10px]">
                        <select
                            id="cityFilter"
                            className="rounded-xl border border-white/10 bg-white/5 p-[10px_14px] text-white outline-none"
                        >
                            <option>Quezon City</option>
                            <option>Manila</option>
                            <option>Pasig</option>
                            <option>Caloocan</option>
                        </select>
                        <button className="chip-btn active cursor-pointer rounded-full border border-white/10 bg-white/[.04] px-4 py-[9px] text-[13px] text-[#aaa] transition duration-200 hover:bg-white/8 hover:text-white">
                            Day
                        </button>
                        <button className="chip-btn cursor-pointer rounded-full border border-white/10 bg-white/[.04] px-4 py-[9px] text-[13px] text-[#aaa] transition duration-200 hover:bg-white/8 hover:text-white">
                            Night
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-[1fr_260px] gap-6 max-[1200px]:grid-cols-1">
                    <div className="grid aspect-[8/5] grid-cols-8 gap-[6px]" id="heatmapGrid">
                        {cells
                            ? cells.map((cell, i) => (
                                  <div
                                      key={i}
                                      className="heatmap-cell"
                                      style={{ background: tempToColor(cell.temperature) }}
                                  >
                                      <div className="cell-tip">
                                          {cell.name} · {cell.temperature.toFixed(1)}°C
                                      </div>
                                  </div>
                              ))
                            : null}
                    </div>
                    <HeatLegend />
                </div>
            </Card>
        </div>
    );
}
