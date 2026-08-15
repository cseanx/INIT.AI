import type { Report } from '../../types';
import { REPORT_STATUS_PILLS } from '../../utils/toneClasses';

const TH_CLASSES =
    'border-b border-white/8 p-[12px_14px] text-left text-xs font-medium uppercase tracking-[.04em] text-[#888]';
const TD_CLASSES = 'border-b border-white/5 p-[14px]';
const DL_BTN_CLASSES =
    'h-[34px] w-[34px] cursor-pointer rounded-[10px] border border-white/10 bg-white/[.04] text-[#ccc] transition duration-200 hover:bg-white/9 hover:text-white';

export default function ReportsTable({ reports }: { reports: Report[] }) {
    return (
        <div className="table-wrap overflow-x-auto">
            <table className="data-table w-full border-collapse text-[13.5px]" id="reportsTable">
                <thead>
                    <tr>
                        <th className={TH_CLASSES}>Report</th>
                        <th className={TH_CLASSES}>Type</th>
                        <th className={TH_CLASSES}>Coverage Area</th>
                        <th className={TH_CLASSES}>Date Generated</th>
                        <th className={TH_CLASSES}>Status</th>
                        <th className={TH_CLASSES}></th>
                    </tr>
                </thead>
                <tbody>
                    {reports.map((r) => {
                        const ready = r.status === 'ready';
                        return (
                            <tr
                                key={r.title}
                                className="transition duration-200 hover:bg-white/[.03]"
                            >
                                <td className={TD_CLASSES}>
                                    <strong>{r.title}</strong>
                                </td>
                                <td className={TD_CLASSES}>{r.type}</td>
                                <td className={TD_CLASSES}>{r.area}</td>
                                <td className={TD_CLASSES}>{r.date}</td>
                                <td className={TD_CLASSES}>
                                    <span
                                        className={`rounded-full px-3 py-[5px] text-[11.5px] font-semibold ${REPORT_STATUS_PILLS[r.status]}`}
                                    >
                                        {ready ? 'Ready' : 'Processing'}
                                    </span>
                                </td>
                                <td className={TD_CLASSES}>
                                    <button
                                        className={DL_BTN_CLASSES}
                                        disabled={!ready}
                                        style={
                                            ready ? undefined : { opacity: 0.35, cursor: 'not-allowed' }
                                        }
                                        title={ready ? 'Download report' : 'Not ready yet'}
                                    >
                                        <i className="fa-solid fa-download"></i>
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
