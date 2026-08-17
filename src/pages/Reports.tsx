import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import ReportsTable from '../components/reports/ReportsTable';

const NEW_REPORT_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';

export default function Reports() {
    const reports = useApiData(api.getReports);

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Generated Reports"
                    actions={
                        <button className={NEW_REPORT_BTN_CLASSES}>
                            <i className="fa-solid fa-plus"></i> New Report
                        </button>
                    }
                />
                {reports ? <ReportsTable reports={reports} /> : null}
            </Card>
        </Page>
    );
}
