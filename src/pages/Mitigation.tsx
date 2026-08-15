import { api } from '../services/api';
import { useApiData } from '../hooks/useApiData';
import MitigationCard from '../components/mitigation/MitigationCard';
import Card from '../components/common/Card';

export default function Mitigation() {
    const projects = useApiData(api.getMitigation);

    return (
        <div className="animate-view-in">
            <Card>
                <div className="panel-head mb-5 flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Recommended Interventions</h3>
                    <span className="rounded-full border border-white/8 bg-white/5 p-[6px_14px] text-xs text-[#999]">
                        AI-ranked by projected impact
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-5 max-[1200px]:grid-cols-1">
                    {projects
                        ? projects.map((project) => (
                              <MitigationCard key={project.id} project={project} />
                          ))
                        : null}
                </div>
            </Card>
        </div>
    );
}
