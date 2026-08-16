interface SwitchProps {
    checked?: boolean;
    onChange?: (checked: boolean) => void;
}

export default function Switch({ checked = false, onChange }: SwitchProps) {
    return (
        <label className="switch relative h-[26px] w-[46px] shrink-0 cursor-pointer">
            <input
                type="checkbox"
                checked={onChange ? checked : undefined}
                defaultChecked={onChange ? undefined : checked}
                onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
                className="absolute h-0 w-0 opacity-0"
            />
            <span className="slider absolute inset-0 rounded-full border border-white/10 bg-white/12 transition duration-200"></span>
        </label>
    );
}
