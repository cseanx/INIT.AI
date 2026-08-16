import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

function AuthLoader() {
    return (
        <div className="flex h-screen items-center justify-center text-sm text-[#888]">
            Loading…
        </div>
    );
}

/** Blocks the wrapped routes until an authenticated session is confirmed. */
export default function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();

    if (loading) {
        return <AuthLoader />;
    }
    if (!user) {
        return <Navigate to="/login" replace />;
    }
    return children;
}
