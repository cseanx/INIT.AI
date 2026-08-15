import type { Barangay } from '../../types';
import SeverityBadge from '../hotspots/SeverityBadge';

const TH_CLASSES =
    'border-b border-white/8 p-[12px_14px] text-left text-xs font-medium uppercase tracking-[.04em] text-[#888]';
const TD_CLASSES = 'border-b border-white/5 p-[14px]';

export default function CanopyTable({ barangays }: { barangays: Barangay[] }) {
    const sorted = [...barangays].sort((a, b) => a.canopy - b.canopy);

    return (
        <div className="table-wrap overflow-x-auto">
            <table className="data-table w-full border-collapse text-[13.5px]" id="canopyTable">
                <thead>
                    <tr>
                        <th className={TH_CLASSES}>Barangay</th>
                        <th className={TH_CLASSES}>Canopy %</th>
                        <th className={TH_CLASSES}>Canopy Area</th>
                        <th className={TH_CLASSES}>5-Yr Change</th>
                        <th className={TH_CLASSES}>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {sorted.map((b) => {
                        const improving = b.canopyChange >= 0;
                        const status: 'critical' | 'moderate' | 'high' = b.priority
                            ? 'critical'
                            : improving
                              ? 'moderate'
                              : 'high';
                        return (
                            <tr
                                key={b.name}
                                className="transition duration-200 hover:bg-white/[.03]"
                            >
                                <td className={TD_CLASSES}>
                                    <strong>{b.name}</strong>
                                </td>
                                <td className={TD_CLASSES}>{b.canopy}%</td>
                                <td className={TD_CLASSES}>{b.area.toLocaleString()} ha</td>
                                <td className={TD_CLASSES}>
                                    <span
                                        className={`flex items-center gap-[6px] ${improving ? 'text-mint' : 'text-accent'}`}
                                    >
                                        <i
                                            className={`fa-solid fa-arrow-trend-${improving ? 'up' : 'down'}`}
                                        ></i>
                                        {improving ? '+' : ''}
                                        {b.canopyChange.toFixed(1)}%
                                    </span>
                                </td>
                                <td className={TD_CLASSES}>
                                    <SeverityBadge severity={status} />
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
