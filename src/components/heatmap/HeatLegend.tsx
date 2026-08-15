export default function HeatLegend() {
    return (
        <div className="heatmap-legend flex flex-col gap-[10px]">
            <span className="legend-title text-[13px] text-[#999]">Surface Temp</span>
            <div className="legend-scale h-[14px] rounded-full bg-[linear-gradient(90deg,#1a3a5c,#2f6f4e,#ffd23f,#ff8c42,#ff2d55)]"></div>
            <div className="legend-labels flex justify-between text-[11px] text-[#888]">
                <span>28°C</span>
                <span>34°C</span>
                <span>41°C+</span>
            </div>
            <p className="legend-note mt-[10px] text-xs leading-[1.6] text-[#777]">
                Tap a cell to inspect a barangay grid segment. Data derived from Landsat 9
                thermal band composites, refreshed every 4 hours.
            </p>
        </div>
    );
}
