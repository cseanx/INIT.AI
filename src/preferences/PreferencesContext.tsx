import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { AccentName, ResolvedTheme, ThemePreference, UserPreferences } from '../types';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';
import { ACCENTS } from '../utils/accent';

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    accent: 'sunset',
    sidebar_collapsed: false,
};

interface PreferencesContextValue {
    preferences: UserPreferences;
    ready: boolean;
    resolvedTheme: ResolvedTheme;
    accentGlow: string;
    setTheme: (theme: ThemePreference) => void;
    setAccent: (accent: AccentName) => void;
    setSidebarCollapsed: (collapsed: boolean) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function resolveTheme(theme: ThemePreference): ResolvedTheme {
    if (theme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
}

function applyTheme(theme: ResolvedTheme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
}

/**
 * Per-user UI preferences (theme + sidebar collapse), persisted to the
 * backend PostgreSQL database so they survive across sessions. Loaded once
 * the user is authenticated; optimistic local updates are pushed to the API.
 */
export function PreferencesProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
    const [ready, setReady] = useState(false);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        resolveTheme(DEFAULT_PREFERENCES.theme),
    );
    const accentGlow = ACCENTS[preferences.accent]?.glow ?? ACCENTS.sunset.glow;

    useEffect(() => {
        let active = true;
        if (!user) {
            setReady(false);
            return;
        }
        api.preferences
            .get()
            .then((saved) => {
                if (active) {
                    setPreferences(saved);
                    setReady(true);
                }
            })
            .catch(() => {
                if (active) setReady(true);
            });
        return () => {
            active = false;
        };
    }, [user]);

    // Follow the OS theme when the preference is "system".
    useEffect(() => {
        const media = window.matchMedia('(prefers-color-scheme: dark)');
        const update = () => setResolvedTheme(resolveTheme(preferences.theme));
        update();
        media.addEventListener('change', update);
        return () => media.removeEventListener('change', update);
    }, [preferences.theme]);

    // Push the resolved theme onto the document root.
    useEffect(() => {
        applyTheme(resolvedTheme);
    }, [resolvedTheme]);

    // Push the accent palette onto the document root as CSS variables, so
    // every Tailwind token (--color-primary/accent/orange) and --accent-glow
    // follows the chosen accent color.
    useEffect(() => {
        const root = document.documentElement;
        const palette = ACCENTS[preferences.accent] ?? ACCENTS.sunset;
        root.style.setProperty('--color-primary', palette.primary);
        root.style.setProperty('--color-accent', palette.secondary);
        root.style.setProperty('--color-orange', palette.orange);
        root.style.setProperty('--accent-glow', palette.glow);
        root.dataset.accent = preferences.accent;
    }, [preferences.accent]);

    const setTheme = useCallback((theme: ThemePreference) => {
        setPreferences((prev) => ({ ...prev, theme }));
        api.preferences.update({ theme }).catch(() => {
            /* offline — local value still applies for this session */
        });
    }, []);

    const setAccent = useCallback((accent: AccentName) => {
        setPreferences((prev) => ({ ...prev, accent }));
        api.preferences.update({ accent }).catch(() => {
            /* offline — local value still applies for this session */
        });
    }, []);

    const setSidebarCollapsed = useCallback((sidebar_collapsed: boolean) => {
        setPreferences((prev) => ({ ...prev, sidebar_collapsed }));
        api.preferences.update({ sidebar_collapsed }).catch(() => {
            /* offline — local value still applies for this session */
        });
    }, []);

    const value = useMemo(
        () => ({
            preferences,
            ready,
            resolvedTheme,
            accentGlow,
            setTheme,
            setAccent,
            setSidebarCollapsed,
        }),
        [preferences, ready, resolvedTheme, accentGlow, setTheme, setAccent, setSidebarCollapsed],
    );

    return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error('usePreferences must be used within a PreferencesProvider');
    }
    return context;
}
