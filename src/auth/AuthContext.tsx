import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import type { AuthUser } from '../types';
import { api } from '../services/api';

interface AuthContextValue {
    user: AuthUser | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    setUser: (user: AuthUser | null) => void;
    register: (payload: {
        name: string;
        email: string;
        password: string;
        confirm_password: string;
        organization: string;
        role?: string;
    }) => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the authenticated user. The session itself is an HTTP-only cookie
 * owned by the backend, so state is restored automatically on refresh by
 * calling GET /api/auth/me on mount.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const current = await api.auth.me();
        setUser(current);
    }, []);

    useEffect(() => {
        let active = true;
        api.auth
            .me()
            .then((current) => {
                if (active) setUser(current);
            })
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        const current = await api.auth.login(email, password);
        setUser(current);
    }, []);

    const logout = useCallback(async () => {
        await api.auth.logout();
        setUser(null);
    }, []);

    const register = useCallback(
        async (payload: {
            name: string;
            email: string;
            password: string;
            confirm_password: string;
            organization: string;
            role?: string;
        }) => {
            const created = await api.auth.register(payload);
            return created;
        },
        [],
    );

    const value = useMemo(
        () => ({ user, loading, login, logout, refresh, setUser, register }),
        [user, loading, login, logout, refresh, register],
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
