import { useNavigate } from 'react-router-dom';
import type { Report } from '../../types';
import { reportPeriod, reportScope } from '../../utils/reportScope';

const TH_CLASSES =
    'border-b border-white/8 p-[12px_14px] text-left text-[12px] font-medium uppercase tracking-[.04em] text-[#999]';
const TD_CLASSES = 'border-b border-white/5 p-[14px] align-top';
const ACTION_BTN_CLASSES =
    'flex h-10 w-10 cursor-pointer items-center justify-center rounded-[10px] border border-white/10 bg-white/[.04] text-[#ccc] transition duration-200 hover:bg-white/9 hover:text-white disabled:cursor-not-allowed disabled:opacity-40';
const PILL_CLASSES =
    'inline-block rounded-full border border-white/10 bg-white/[.04] px-[9px] py-[3px] text-[12px] text-[#bbb]';
const VERIFY_PILL_CLASSES =
    'inline-flex cursor-default items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-semibold';
const VERIFIED_PILL = `${VERIFY_PILL_CLASSES} bg-[rgba(0,255,132,.12)] text-mint`;
const OUTDATED_PILL = `${VERIFY_PILL_CLASSES} bg-[rgba(255,210,63,.13)] text-gold`;
const UNVERIFIED_PILL = `${VERIFY_PILL_CLASSES} bg-white/[.05] text-[#aaa]`;

/** Attestation pill for one row: verified / outdated / unverified.
 *  Mirrors the editor's Stellar panel logic — a proof only counts as
 *  verified while it matches the report's CURRENT content hash. */
function VerificationPill({ report }: { report: Report }) {
    const count = report.attestationCount ?? 0;
    if (report.attestedCurrent) {
        const when = report.attestedAt ? new Date(report.attestedAt).toLocaleString() : '';
        return (
            <span
                className={VERIFIED_PILL}
                title={`Recorded on Stellar Testnet ${when}`.trim()}
                aria-label={`Verified on Stellar Testnet${when ? `, ${when}` : ''}`}
            >
                <i className="fa-solid fa-circle-check text-[12px]" aria-hidden="true"></i>
                Verified{count > 1 ? ` · ${count}` : ''}
            </span>
        );
    }
    if (count > 0) {
        return (
            <span
                className={OUTDATED_PILL}
                title={`This report was edited after its on-chain proof (${count} recorded). Re-verify to attest the current form.`}
                aria-label="Outdated proof: report edited after attestation"
            >
                <i className="fa-solid fa-clock-rotate-left text-[12px]" aria-hidden="true"></i>
                Outdated proof
            </span>
        );
    }
    return (
        <span className={UNVERIFIED_PILL} aria-label="Not yet verified on Stellar">
            <i className="fa-solid fa-shield-halved text-[12px] opacity-70" aria-hidden="true"></i>
            Unverified
        </span>
    );
}

export default function ReportsTable({
    reports,
    onVerify,
    onClearFilter,
}: {
    reports: Report[];
    /** Present only when Stellar is enabled — renders the per-row
     *  "Verify on Stellar" action that opens the confirmation modal. */
    onVerify?: (report: Report) => void;
    onClearFilter?: () => void;
}) {
    const navigate = useNavigate();

    return (
        <>
        <div
            className="table-wrap overflow-x-auto"
            role="region"
            aria-label="Generated reports"
            tabIndex={0}
        >
            <table
                className="data-table w-full min-w-[1040px] table-fixed border-collapse text-[13.5px] max-[700px]:min-w-[1040px]"
                id="reportsTable"
            >
                <colgroup>
                    <col className="w-[24%]" />
                    <col className="w-[12%]" />
                    <col className="w-[13%]" />
                    <col className="w-[18%]" />
                    <col className="w-[8%]" />
                    <col className="w-[11%]" />
                    <col className="w-[14%]" />
                </colgroup>
                <thead>
                    <tr>
                        <th className={`${TH_CLASSES} sticky-col`}>Report</th>
                        <th className={TH_CLASSES}>Scope</th>
                        <th className={TH_CLASSES}>Period</th>
                        <th className={TH_CLASSES}>Data included</th>
                        <th className={TH_CLASSES}>Status</th>
                        <th className={TH_CLASSES}>Verification</th>
                        <th className={`${TH_CLASSES} text-right`}>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r) => {
                        const ready = r.status === 'ready';
                        const period = reportPeriod(r.periodStart, r.periodEnd, r.date);
                        return (
                            <tr
                                key={r.id ?? r.title}
                                className="transition duration-200 hover:bg-white/[.03]"
                            >
                                <td className={`${TD_CLASSES} sticky-col`}>
                                    <strong className="block text-[13.5px] font-semibold">
                                        {r.title}
                                    </strong>
                                    <div className="mt-[6px] flex flex-wrap items-center gap-[8px] text-[12px] text-[#999]">
                                        <span className={PILL_CLASSES}>{r.type}</span>
                                        <span className="inline-flex items-center gap-1">
                                            <i
                                                className="fa-solid fa-user text-[11.5px] text-accent"
                                                aria-hidden="true"
                                            ></i>
                                            {r.preparedBy ?? '—'}
                                        </span>
                                        <span className="inline-flex items-center gap-1">
                                            <i
                                                className="fa-solid fa-calendar text-[11.5px] text-accent"
                                                aria-hidden="true"
                                            ></i>
                                            {r.date}
                                        </span>
                                    </div>
                                </td>
                                <td className={TD_CLASSES}>
                                    <span className="block text-[12.5px] font-medium leading-snug text-[#ddd]">
                                        {reportScope(r)}
                                    </span>
                                </td>
                                <td className={`${TD_CLASSES} text-[12.5px] text-[#ccc]`}>
                                    {period}
                                </td>
                                <td className={TD_CLASSES}>
                                    {Array.isArray(r.datasets) && r.datasets.length ? (
                                        <div className="flex max-w-[230px] flex-wrap gap-[4px]">
                                            {(r.datasets ?? []).map((d) => (
                                                <span key={d} className={PILL_CLASSES}>
                                                    {d}
                                                </span>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[#999]">—</span>
                                    )}
                                </td>
                                <td className={TD_CLASSES}>
                                    <span
                                        className={`inline-flex items-center gap-1.5 rounded-full border border-white/8 bg-white/[.04] px-3 py-[5px] text-[12px] font-semibold ${
                                            ready ? 'text-[#ddd]' : 'text-gold'
                                        }`}
                                    >
                                        <i
                                            className={`fa-solid ${
                                                ready ? 'fa-circle-check text-[#bbb]' : 'fa-clock text-gold'
                                            } text-[12px]`}
                                            aria-hidden="true"
                                        ></i>
                                        {ready ? 'Ready' : 'Processing'}
                                    </span>
                                </td>
                                <td className={TD_CLASSES}>
                                    <VerificationPill report={r} />
                                </td>
                                <td className={`${TD_CLASSES} text-right`}>
                                    <div className="flex items-center justify-end gap-[6px]">
                                        <button
                                            type="button"
                                            className={ACTION_BTN_CLASSES}
                                            title="View report"
                                            aria-label={`View ${r.title}`}
                                            onClick={() =>
                                                navigate(`/report/edit?id=${r.id}&mode=view`)
                                            }
                                        >
                                            <i
                                                className="fa-solid fa-eye text-[13px]"
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                        <button
                                            type="button"
                                            className={ACTION_BTN_CLASSES}
                                            title="Edit report"
                                            aria-label={`Edit ${r.title}`}
                                            onClick={() => navigate(`/report/edit?id=${r.id}`)}
                                        >
                                            <i
                                                className="fa-solid fa-pen text-[13px]"
                                                aria-hidden="true"
                                            ></i>
                                        </button>
                                        {onVerify && typeof r.id === 'number' ? (
                                            <button
                                                type="button"
                                                className={ACTION_BTN_CLASSES}
                                                disabled={!!r.attestedCurrent}
                                                title={
                                                    r.attestedCurrent
                                                        ? 'Already verified on Stellar Testnet — edit the report to create a new version to verify'
                                                        : 'Verify on Stellar'
                                                }
                                                aria-label={
                                                    r.attestedCurrent
                                                        ? `${r.title} is already verified on Stellar Testnet`
                                                        : `Verify ${r.title} on Stellar Testnet`
                                                }
                                                onClick={() => {
                                                    if (r.attestedCurrent) return;
                                                    onVerify(r);
                                                }}
                                            >
                                                <i
                                                    className="fa-solid fa-shield-halved text-[13px]"
                                                    aria-hidden="true"
                                                ></i>
                                            </button>
                                        ) : null}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                    {reports.length === 0 ? (
                        <tr>
                            <td colSpan={7} className="p-[40px_20px] text-center">
                                <div className="flex flex-col items-center gap-2">
                                    <i className="fa-solid fa-filter-circle-xmark text-[22px] text-[#999]"></i>
                                    <p className="text-[13.5px] font-medium text-[#ddd]">
                                        No reports in this view
                                    </p>
                                    <p className="max-w-[360px] text-[12px] leading-relaxed text-[#999]">
                                        Clear the filter to see every generated report, or create a
                                        new report to start an evidence trail.
                                    </p>
                                    {onClearFilter ? (
                                        <button
                                            type="button"
                                            onClick={onClearFilter}
                                            className="mt-1 min-h-[40px] cursor-pointer rounded-full border border-white/12 bg-white/[.05] px-4 text-[12.5px] font-semibold text-white hover:bg-white/10"
                                        >
                                            Show all reports
                                        </button>
                                    ) : null}
                                </div>
                            </td>
                        </tr>
                    ) : null}
                </tbody>
            </table>
        </div>
        <p className="mt-2 text-[11.5px] text-[#999] min-[700px]:hidden">
            Swipe the table sideways for scope, status, and actions.
        </p>
        </>
    );
}
