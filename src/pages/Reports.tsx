import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import ReportsTable from '../components/reports/ReportsTable';
import Card from '../components/common/Card';

const NEW_REPORT_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(255,45,85,.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(255,45,85,.42)]';

export default function Reports() {
    const reports = useApiData(api.getReports);

    return (
        <div className="animate-view-in">
            <Card>
                <div className="panel-head mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Generated Reports</h3>
                    <button className={NEW_REPORT_BTN_CLASSES}>
                        <i className="fa-solid fa-plus"></i> New Report
                    </button>
                </div>
                {reports ? <ReportsTable reports={reports} /> : null}
            </Card>
        </div>
    );
}
