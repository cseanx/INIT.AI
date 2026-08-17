import type { ThemePreference } from '../../types';
import { usePreferences } from '../../preferences/PreferencesContext';

interface ThemeOption {
    name: ThemePreference;
    icon: string;
    label: string;
    tag?: string;
}

const THEMES: ThemeOption[] = [
    { name: 'system', icon: 'fa-display', label: 'System Default', tag: 'Default' },
    { name: 'dark', icon: 'fa-moon', label: 'Dark Mode' },
    { name: 'light', icon: 'fa-sun', label: 'Light Mode' },
];

const CARD_CLASSES =
    'relative flex cursor-pointer flex-col items-start gap-[10px] rounded-[16px] border border-white/8 bg-white/[.03] p-[18px] text-left text-[13.5px] font-semibold text-[#ccc] transition duration-200 hover:bg-white/6 hover:text-white';

export default function ThemePicker() {
    const { preferences, setTheme } = usePreferences();
    const active = preferences.theme;

    return (
        <div className="grid grid-cols-3 gap-[14px] max-[1200px]:grid-cols-1">
            {THEMES.map((theme) => (
                <button
                    key={theme.name}
                    type="button"
                    className={`${CARD_CLASSES} theme-card ${active === theme.name ? 'active' : ''}`}
                    onClick={() => setTheme(theme.name)}
                >
                    <i className={`fa-solid ${theme.icon} text-lg text-[#999]`}></i>
                    {theme.label}
                    {theme.tag ? (
                        <span className="theme-tag absolute right-[14px] top-[14px] rounded-full bg-[rgba(var(--accent-glow),.18)] p-[4px_9px] text-[10px] font-bold uppercase tracking-[.04em] text-accent">
                            {theme.tag}
                        </span>
                    ) : null}
                </button>
            ))}
        </div>
    );
}
