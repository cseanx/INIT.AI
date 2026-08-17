import type { AccentName } from '../../types';
import { usePreferences } from '../../preferences/PreferencesContext';

interface AccentSwatch {
    name: AccentName;
    gradient: string;
    title: string;
}

const SWATCHES: AccentSwatch[] = [
    { name: 'sunset', gradient: 'linear-gradient(135deg,#ff8c42,#ff2d55)', title: 'Sunset (default)' },
    { name: 'ocean', gradient: 'linear-gradient(135deg,#5aa9ff,#2f6f9e)', title: 'Ocean' },
    { name: 'canopy', gradient: 'linear-gradient(135deg,#00ff84,#2f6f4e)', title: 'Canopy' },
    { name: 'amber', gradient: 'linear-gradient(135deg,#ffd23f,#ff8c42)', title: 'Amber' },
    { name: 'violet', gradient: 'linear-gradient(135deg,#c792ea,#5aa9ff)', title: 'Violet' },
];

const SWATCH_CLASSES =
    'relative h-[38px] w-[38px] cursor-pointer rounded-full border-2 border-transparent transition duration-200 hover:-translate-y-0.5';

export default function AccentPicker() {
    const { preferences, setAccent } = usePreferences();
    const active = preferences.accent;

    return (
        <div className="flex gap-[14px]">
            {SWATCHES.map((swatch) => (
                <button
                    key={swatch.name}
                    type="button"
                    className={`${SWATCH_CLASSES} swatch ${active === swatch.name ? 'active' : ''}`}
                    style={{ background: swatch.gradient }}
                    title={swatch.title}
                    onClick={() => setAccent(swatch.name)}
                ></button>
            ))}
        </div>
    );
}
