import type { PriorityZone } from '../../types';
import { ZONE_PRIORITY_KEYS } from '../../utils/toneClasses';

export default function PriorityZones({ zones }: { zones: PriorityZone[] }) {
    return (
        <div className="priority-zone-list flex flex-col gap-3">
            {zones.map((zone) => {
                const key = ZONE_PRIORITY_KEYS[zone.priority] ?? 'moderate';
                return (
                    <div key={zone.name} className="priority-zone-item">
                        <span className={`pz-dot ${key}`}></span>
                        <div className="pz-body">
                            <div className="pz-top">
                                <strong>{zone.name}</strong>
                                <span className={`pz-badge ${key}`}>{zone.priority}</span>
                            </div>
                            <span className="pz-cover">Tree Cover: {zone.cover}%</span>
                            <div className="pz-tags">
                                {zone.tags.map((tag) => (
                                    <span key={tag} className="mini-tag">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
