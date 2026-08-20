import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { ResolvedTheme, ThemePreference, UserPreferences } from '../types';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';

const DEFAULT_PREFERENCES: UserPreferences = {
    theme: 'system',
    sidebar_collapsed: false,
};

const STORAGE_KEY = 'initai_preferences';

function loadStoredPreferences(): UserPreferences {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return DEFAULT_PREFERENCES;
        const stored = JSON.parse(raw) as Partial<UserPreferences>;
        return {
            theme: stored.theme ?? DEFAULT_PREFERENCES.theme,
            sidebar_collapsed: stored.sidebar_collapsed ?? DEFAULT_PREFERENCES.sidebar_collapsed,
        };
    } catch {
        return DEFAULT_PREFERENCES;
    }
}

interface PreferencesContextValue {
    preferences: UserPreferences;
    ready: boolean;
    resolvedTheme: ResolvedTheme;
    setTheme: (theme: ThemePreference) => void;
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
    const [preferences, setPreferences] = useState<UserPreferences>(loadStoredPreferences);
    const [ready, setReady] = useState(false);
    const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
        resolveTheme(preferences.theme),
    );

    // Cache locally so a refresh (login page included) applies the saved
    // theme instantly instead of flashing the default.
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch {
            /* storage unavailable — settings still apply in-memory */
        }
    }, [preferences]);

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

    const setTheme = useCallback((theme: ThemePreference) => {
        setPreferences((prev) => ({ ...prev, theme }));
        api.preferences.update({ theme }).catch(() => {
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
            setTheme,
            setSidebarCollapsed,
        }),
        [preferences, ready, resolvedTheme, setTheme, setSidebarCollapsed],
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
