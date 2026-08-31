import { useNavigate } from 'react-router-dom';
import type { Report } from '../../types';
import { REPORT_STATUS_PILLS } from '../../utils/toneClasses';

const TH_CLASSES =
    'border-b border-white/8 p-[12px_14px] text-left text-xs font-medium uppercase tracking-[.04em] text-[#888]';
const TD_CLASSES = 'border-b border-white/5 p-[14px]';
const ACTION_BTN_CLASSES =
    'h-[34px] w-[34px] cursor-pointer rounded-[10px] border border-white/10 bg-white/[.04] text-[#ccc] transition duration-200 hover:bg-white/9 hover:text-white';
const PILL_CLASSES =
    'inline-block rounded-full border border-white/10 bg-white/[.04] px-[9px] py-[3px] text-[11px] text-[#bbb]';
const VERIFY_PILL_CLASSES =
    'inline-flex cursor-default items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[11px] font-semibold';
const VERIFIED_PILL = `${VERIFY_PILL_CLASSES} bg-[rgba(0,255,132,.12)] text-mint`;
const OUTDATED_PILL = `${VERIFY_PILL_CLASSES} bg-[rgba(255,210,63,.13)] text-gold`;
const UNVERIFIED_PILL = `${VERIFY_PILL_CLASSES} bg-white/[.05] text-[#8a8a8a]`;

/** Attestation pill for one row: verified / outdated / unverified.
 *  Mirrors the editor's Stellar panel logic — a proof only counts as
 *  verified while it matches the report's CURRENT content hash. */
function VerificationPill({ report }: { report: Report }) {
    const count = report.attestationCount ?? 0;
    if (report.attestedCurrent) {
        const when = report.attestedAt ? new Date(report.attestedAt).toLocaleString() : '';
        return (
            <span className={VERIFIED_PILL} title={`Recorded on Stellar Testnet ${when}`.trim()}>
                <i className="fa-solid fa-circle-check text-[10px]"></i>
                Verified{count > 1 ? ` · ${count}` : ''}
            </span>
        );
    }
    if (count > 0) {
        return (
            <span
                className={OUTDATED_PILL}
                title={`This report was edited after its on-chain proof (${count} recorded). Re-verify to attest the current form.`}
            >
                <i className="fa-solid fa-clock-rotate-left text-[10px]"></i>
                Outdated proof
            </span>
        );
    }
    return (
        <span className={UNVERIFIED_PILL}>
            <i className="fa-solid fa-shield-halved text-[10px] opacity-60"></i>
            Unverified
        </span>
    );
}

export default function ReportsTable({
    reports,
    onVerify,
}: {
    reports: Report[];
    /** Present only when Stellar is enabled — renders the per-row
     *  "Verify on Stellar" action that opens the confirmation modal. */
    onVerify?: (report: Report) => void;
}) {
    const navigate = useNavigate();

    return (
        <div className="table-wrap overflow-x-auto">
            <table className="data-table w-full border-collapse text-[13.5px]" id="reportsTable">
                <thead>
                    <tr>
                        <th className={TH_CLASSES}>Report</th>
                        <th className={TH_CLASSES}>Type</th>
                        <th className={TH_CLASSES}>City</th>
                        <th className={TH_CLASSES}>Coverage</th>
                        <th className={TH_CLASSES}>Period</th>
                        <th className={TH_CLASSES}>Data Included</th>
                        <th className={TH_CLASSES}>Status</th>
                        <th className={TH_CLASSES}>Verification</th>
                        <th className={TH_CLASSES}></th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r) => {
                        const ready = r.status === 'ready';
                        const period =
                            r.periodStart && r.periodEnd
                                ? `${r.periodStart} – ${r.periodEnd}`
                                : r.date;
                        return (
                            <tr
                                key={r.id ?? r.title}
                                className="transition duration-200 hover:bg-white/[.03]"
                            >
                                <td className={TD_CLASSES}>
                                    <strong>{r.title}</strong>
                                    <div className="mt-[4px] flex flex-wrap items-center gap-[8px] text-[11.5px] text-[#777]">
                                        <span>
                                            <i className="fa-solid fa-user mr-[5px] text-[10px] text-accent"></i>
                                            {r.preparedBy ?? '—'}
                                        </span>
                                        <span>
                                            <i className="fa-solid fa-calendar mr-[5px] text-[10px] text-accent"></i>
                                            {r.date}
                                        </span>
                                    </div>
                                </td>
                                <td className={TD_CLASSES}>{r.type}</td>
                                <td className={TD_CLASSES}>{r.city ?? '—'}</td>
                                <td className={TD_CLASSES}>{r.coverage ?? r.area ?? '—'}</td>
                                <td className={TD_CLASSES}>{period}</td>
                                <td className={TD_CLASSES}>
                                    {Array.isArray(r.datasets) && r.datasets.length ? (
                                        <div className="flex max-w-[240px] flex-wrap gap-[4px]">
                                            {(r.datasets ?? []).map((d) => (
                                                <span key={d} className={PILL_CLASSES}>
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[#555]">—</span>
                                    )}
                                </td>
                                <td className={TD_CLASSES}>
                                    <span
                                        className={`rounded-full px-3 py-[5px] text-[11.5px] font-semibold ${REPORT_STATUS_PILLS[r.status]}`}
                                    >
                                        {ready ? 'Ready' : 'Processing'}
                                    </span>
                                </td>
                                <td className={TD_CLASSES}>
                                    <VerificationPill report={r} />
                                </td>
                                <td className={TD_CLASSES}>
                                    <div className="flex items-center gap-[6px]">
                                        <button
                                            className={ACTION_BTN_CLASSES}
                                            title="View report"
                                            onClick={() => navigate(`/report/edit?id=${r.id}&mode=view`)}
                                        >
                                            <i className="fa-solid fa-eye"></i>
                                        </button>
                                        <button
                                            className={ACTION_BTN_CLASSES}
                                            title="Edit report"
                                            onClick={() => navigate(`/report/edit?id=${r.id}`)}
                                        >
                                            <i className="fa-solid fa-pen"></i>
                                        </button>
                                        <button
                                            className={ACTION_BTN_CLASSES}
                                            disabled={!ready}
                                            style={
                                                ready
                                                    ? undefined
                                                    : { opacity: 0.35, cursor: 'not-allowed' }
                                            }
                                            title={ready ? 'Download report' : 'Not ready yet'}
                                        >
                                            <i className="fa-solid fa-download"></i>
                                        </button>
                                        {onVerify && typeof r.id === 'number' ? (
                                            <button
                                                className={ACTION_BTN_CLASSES}
                                                disabled={!!r.attestedCurrent}
                                                style={
                                                    r.attestedCurrent
                                                        ? { opacity: 0.35, cursor: 'not-allowed' }
                                                        : undefined
                                                }
                                                title={
                                                    r.attestedCurrent
                                                        ? 'Already verified on Stellar Testnet — edit the report to create a new version to verify'
                                                        : 'Verify on Stellar'
                                                }
                                                onClick={() => {
                                                    if (r.attestedCurrent) return;
                                                    onVerify(r);
                                                }}
                                            >
                                                <i className="fa-solid fa-shield-halved"></i>
                                            </button>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}