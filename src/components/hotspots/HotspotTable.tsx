import type { Barangay } from '../../types';
import SeverityBadge from './SeverityBadge';

const TH_CLASSES =
    'border-b border-white/8 p-[12px_14px] text-left text-xs font-medium uppercase tracking-[.04em] text-[#888]';
const TD_CLASSES = 'border-b border-white/5 p-[14px]';

export default function HotspotTable({ hotspots }: { hotspots: Barangay[] }) {
    const sorted = [...hotspots].sort((a, b) => b.temp - a.temp);

    return (
        <div className="table-wrap overflow-x-auto">
            <table className="data-table w-full border-collapse text-[13.5px]" id="hotspotsTable">
                <thead>
                    <tr>
                        <th className={TH_CLASSES}>Barangay</th>
                        <th className={TH_CLASSES}>Peak Temp</th>
                        <th className={TH_CLASSES}>Severity</th>
                        <th className={TH_CLASSES}>Trend (7d)</th>
                        <th className={TH_CLASSES}>Primary Driver</th>
                        <th className={TH_CLASSES}>Last Updated</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((b) => {
                        const trendUp = b.trend >= 0;
                        return (
                            <tr
                                key={b.name}
                                className="transition duration-200 hover:bg-white/[.03]"
                            >
                                <td className={TD_CLASSES}>
                                    <strong>{b.name}</strong>
                                </td>
                                <td className={TD_CLASSES}>{b.temp.toFixed(1)}°C</td>
                                <td className={TD_CLASSES}>
                                    <SeverityBadge severity={b.severity} />
                                </td>
                                <td className={TD_CLASSES}>
                                    <span
                                        className={`flex items-center gap-[6px] ${trendUp ? 'text-accent' : 'text-mint'}`}
                                    >
                                        <i
                                            className={`fa-solid fa-arrow-trend-${trendUp ? 'up' : 'down'}`}
                                        ></i>
                                        {trendUp ? '+' : ''}
                                        {b.trend.toFixed(1)}°C
                                    </span>
                                </td>
                                <td className={TD_CLASSES}>{b.driver}</td>
                                <td className={TD_CLASSES}>4h ago</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
