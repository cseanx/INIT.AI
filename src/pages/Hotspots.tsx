import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import HotspotTable from '../components/hotspots/HotspotTable';

const CHIP_CLASSES =
    'cursor-pointer rounded-full border border-white/10 bg-white/[.04] px-4 py-[9px] text-[13px] text-[#aaa] transition duration-200 hover:bg-white/8 hover:text-white';

export default function Hotspots() {
    const hotspots = useApiData(api.getHotspots);

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Detected Hotspots"
                    actions={
                        <div className="flex flex-wrap items-center gap-[10px]">
                            <button className={`chip-btn active ${CHIP_CLASSES}`}>All (17)</button>
                            <button className={`chip-btn ${CHIP_CLASSES}`}>Critical (4)</button>
                            <button className={`chip-btn ${CHIP_CLASSES}`}>High (7)</button>
                            <button className={`chip-btn ${CHIP_CLASSES}`}>Moderate (6)</button>
                        </div>
                    }
                />
                {hotspots ? <HotspotTable hotspots={hotspots} /> : null}
            </Card>
        </Page>
    );
}
