import { Link } from 'react-router-dom';
import type { PriorityZone } from '../../types';
import { ZONE_PRIORITY_KEYS } from '../../utils/toneClasses';
import { LedgerList, LedgerRow } from '../common/LayoutPrimitives';

/** Priority zones as a dense ledger — no card-within-card nesting. */
export default function PriorityZones({ zones }: { zones: PriorityZone[] }) {
    return (
        <LedgerList>
            {zones.map((zone) => {
                const key = ZONE_PRIORITY_KEYS[zone.priority] ?? 'moderate';
                return (
                    <LedgerRow
                        key={zone.name}
                        media={<span className={`pz-dot ${key}`}></span>}
                        title={zone.name}
                        tags={zone.tags}
                        bar={{
                            value: zone.cover,
                            label: `${zone.cover}% tree cover`,
                            tone: zone.cover < 15 ? 'accent' : zone.cover < 25 ? 'gold' : 'mint',
                        }}
                        meta={<span className={`pz-badge ${key}`}>{zone.priority}</span>}
                        actions={
                            <Link
                                to="/heatmap"
                                className="whitespace-nowrap text-[12px] font-semibold text-accent hover:underline"
                            >
                                Open on map
                            </Link>
                        }
                    />
                );
            })}
        </LedgerList>
    );
}