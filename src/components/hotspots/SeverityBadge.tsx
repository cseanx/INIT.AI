import type { Severity } from '../../types';
import { SEVERITY_BADGES } from '../../utils/toneClasses';

const BADGE_BASE = 'inline-block rounded-full px-3 py-[5px] text-[11.5px] font-semibold';

export default function SeverityBadge({ severity }: { severity: Severity }) {
    const label = severity.charAt(0).toUpperCase() + severity.slice(1);
    return (
        <span className={`${BADGE_BASE} ${SEVERITY_BADGES[severity]}`}>{label}</span>
    );
}
