import Switch from '../settings/Switch';
import {
    LAYER_GROUPS,
    MAP_LAYERS,
    type LayerGroupId,
    type MapLayerDef,
} from './layers';

const GROUP_HEAD_CLASSES =
    'px-[6px] pb-[6px] text-[10px] font-semibold uppercase tracking-[.14em] text-[#777]';

interface MapLayersPanelProps {
    state: Record<string, boolean>;
    onToggle: (layer: MapLayerDef, visible: boolean) => void;
}

/** Grouped layer visibility panel for the map (Basemap / Environmental /
 *  Administrative / Risk). Renders purely from the MAP_LAYERS registry, so
 *  future backend layers appear here automatically. Unavailable layers stay
 *  toggleable but surface a placeholder note instead of touching the map.
 *  Positioning and open/close handling live in MapView. */
export default function MapLayersPanel({ state, onToggle }: MapLayersPanelProps) {
    const pending = MAP_LAYERS.find(
        (layer) => !layer.available && state[layer.id] && layer.pendingNote,
    );

    const layersForGroup = (group: LayerGroupId) =>
        MAP_LAYERS.filter((layer) => layer.group === group);

    return (
        <div
            role="dialog"
            aria-label="Map layers"
            className="map-layers-menu flex w-[268px] flex-col gap-[10px] rounded-[14px] border border-white/10 bg-[#101010]/95 p-[12px] shadow-[0_16px_40px_rgba(0,0,0,.55)] backdrop-blur-2xl"
        >
            {LAYER_GROUPS.map((group) => (
                <div key={group.id}>
                    <p className={GROUP_HEAD_CLASSES}>{group.label}</p>
                    <div className="flex flex-col">
                        {layersForGroup(group.id).map((layer) => {
                            const checked = state[layer.id] ?? true;
                            return (
                                <label
                                    key={layer.id}
                                    className={`flex cursor-pointer items-center gap-[10px] rounded-[10px] p-[7px_8px] transition duration-200 hover:bg-white/6 ${
                                        layer.available ? '' : 'opacity-75'
                                    }`}
                                >
                                    <i
                                        className={`fa-solid ${layer.icon} w-[16px] text-center text-[12px] ${
                                            checked ? 'text-accent' : 'text-[#666]'
                                        }`}
                                    ></i>
                                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-white">
                                        {layer.label}
                                    </span>
                                    {!layer.available ? (
                                        <span className="rounded-full border border-white/10 bg-white/[.05] px-[7px] py-[2px] text-[9.5px] font-bold uppercase tracking-[.06em] text-[#888]">
                                            Soon
                                        </span>
                                    ) : null}
                                    <Switch
                                        checked={checked}
                                        onChange={(visible) => onToggle(layer, visible)}
                                    />
                                </label>
                            );
                        })}
                    </div>
                </div>
            ))}

            {pending?.pendingNote ? (
                <p className="flex items-start gap-[8px] rounded-[10px] border border-[#ffb03a]/25 bg-[#ffb03a]/10 p-[9px_11px] text-[11.5px] leading-snug text-[#ffb03a]">
                    <i className="fa-solid fa-circle-info mt-[2px] text-[11px]"></i>
                    {pending.pendingNote}
                </p>
            ) : null}
        </div>
    );
}