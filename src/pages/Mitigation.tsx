import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import MitigationCard from '../components/mitigation/MitigationCard';

export default function Mitigation() {
    const projects = useApiData(api.getMitigation);

    return (
        <Page>
            <Card>
                <PanelHead
                    title="Recommended Interventions"
                    actions={
                        <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-xs text-[#999]">
                            AI-ranked by projected impact
                        </span>
                    }
                />

                <div className="grid grid-cols-2 gap-5 max-[1200px]:grid-cols-1">
                    {projects
                        ? projects.map((project) => (
                              <MitigationCard key={project.id} project={project} />
                          ))
                        : null}
                </div>
            </Card>
        </Page>
    );
}
