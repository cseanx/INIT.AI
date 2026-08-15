import Switch from './Switch';

interface ToggleRowProps {
    title: string;
    description: string;
    checked?: boolean;
}

export default function ToggleRow({ title, description, checked }: ToggleRowProps) {
    return (
        <div className="flex items-center justify-between gap-5 border-b border-white/6 p-4 last:border-b-0 last:pb-0">
            <div>
                <strong className="mb-1 block text-sm font-semibold">{title}</strong>
                <span className="block text-[12.5px] leading-[1.5] text-[#888]">{description}</span>
            </div>
            <Switch checked={checked} />
        </div>
    );
}
