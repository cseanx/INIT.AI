import type { Barangay } from '../../types';
import { SEVERITY_BADGES, SEVERITY_DOTS } from '../../utils/toneClasses';

export default function MiniHotspotList({ hotspots }: { hotspots: Barangay[] }) {
    return (
        <div className="flex flex-col gap-[10px]">
            {hotspots.map((hotspot) => (
                <div
                    key={hotspot.name}
                    className="flex items-center justify-between rounded-[16px] border border-white/6 bg-white/[.03] p-[14px_16px] transition duration-200 hover:bg-white/6"
                >
                    <div className="flex items-center gap-[14px]">
                        <span
                            className={`h-[10px] w-[10px] shrink-0 rounded-full ${SEVERITY_DOTS[hotspot.severity]}`}
                        ></span>
                        <div>
                            <strong className="block text-sm font-semibold">{hotspot.name}</strong>
                            <small className="text-xs text-[#888]">{hotspot.driver}</small>
                        </div>
                    </div>
                    <span
                        className={`rounded-full p-[6px_14px] text-[15px] font-bold ${SEVERITY_BADGES[hotspot.severity]}`}
                    >
                        {hotspot.temp.toFixed(1)}°C
                    </span>
                </div>
            ))}
        </div>
    );
}
