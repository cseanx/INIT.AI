import { useEffect, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { useAuth } from '../auth/AuthContext';
import { ApiError, api } from '../services/api';
import { useStellarNetwork } from '../services/stellar/NetworkContext';

const INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/8 bg-white/[.04] p-[15px] text-[16px] text-white outline-none transition duration-300 focus:border-primary focus:shadow-[0_0_25px_rgba(var(--accent-glow),.25)]';

const DEMO_ROLES = [
    {
        role: 'LGU Administrator',
        short: 'Admin',
        email: 'admin@init.ai',
        password: 'admin123',
        icon: 'fa-user-tie',
    },
    {
        role: 'Climate Analyst',
        short: 'Analyst',
        email: 'analyst@init.ai',
        password: 'analyst123',
        icon: 'fa-chart-line',
    },
    {
        role: 'Field Coordinator',
        short: 'Coordinator',
        email: 'coordinator@init.ai',
        password: 'coordinator123',
        icon: 'fa-person-walking',
    },
] as const;

export default function Login() {
    const navigate = useNavigate();
    const { config } = useStellarNetwork();
    const { user, loading, login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [demoRole, setDemoRole] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [showResend, setShowResend] = useState(false);

    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
        return () => clearInterval(timer);
    }, [cooldown > 0]);

    if (loading) {
        return null;
    }
    if (user) {
        return <Navigate to="/dashboard" replace />;
    }

    const busy = loggingIn || demoRole !== null;

    function describeError(err: unknown): string {
        if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
            setCooldown(err.retryAfter);
            return 'Too many failed attempts. Please wait to try again.';
        }
        if (err instanceof ApiError && err.status === 403) {
            setShowResend(true);
            return err.message;
        }
        return err instanceof Error ? err.message : 'Login failed. Please try again.';
    }

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        if (busy || cooldown > 0) return;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.trim())) {
            setError('Enter a valid email address');
            return;
        }
        setLoggingIn(true);
        setError(null);
        setInfo(null);
        setShowResend(false);
        try {
            await login(email, password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(describeError(err));
            setLoggingIn(false);
        }
    }

    async function handleDemoLogin(account: (typeof DEMO_ROLES)[number]) {
        if (busy || cooldown > 0) return;
        setDemoRole(account.role);
        setError(null);
        setInfo(null);
        setShowResend(false);
        try {
            await login(account.email, account.password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(describeError(err));
            setDemoRole(null);
        }
    }

    async function handleResend() {
        setError(null);
        setInfo(null);
        try {
            const res = await api.auth.resendVerification(email.trim());
            setInfo(res.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resend verification email.');
        }
    }

    return (
        <div className="background fixed inset-0 overflow-y-auto">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="pointer-events-none absolute h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.24)] blur-[120px] animate-glow-one"></div>
            <div className="pointer-events-none absolute -bottom-[150px] -right-[150px] h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.14)] blur-[120px] animate-glow-two"></div>
            <Particles />

            <main className="relative z-10 flex min-h-[100dvh] w-full items-center justify-center p-4 sm:p-6">
                <section className="w-full max-w-[480px] rounded-[24px] border border-white/8 bg-white/5 p-6 shadow-[0_0_60px_rgba(var(--accent-glow),.12),0_20px_80px_rgba(0,0,0,.45)] backdrop-blur-[25px] sm:rounded-[28px] sm:p-[40px]">
                    <div className="flex items-center gap-[14px]">
                        <div className="logo-circle flex h-[52px] w-[52px] shrink-0 items-center justify-center">
                            <img
                                src="/assets/images/logo.svg"
                                alt="INIT.AI logo"
                                className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(var(--accent-glow),.35)]"
                            />
                        </div>
                        <div>
                            <h1 className="text-[24px] leading-none">INIT.AI</h1>
                            <p className="mt-1 text-[12px] text-[#9f9f9f]">
                                Urban Intelligence Platform
                            </p>
                        </div>
                    </div>

                    <h2 className="mt-7 text-[24px] font-semibold leading-tight">Welcome back</h2>
                    <p className="mt-2 text-[13px] leading-relaxed text-[#a8a8a8]">
                        Sign in to continue monitoring urban heat for your city.
                    </p>

                    <form onSubmit={handleLogin} className="mt-6" noValidate>
                        <div className="mb-4">
                            <label
                                htmlFor="login-email"
                                className="mb-2 block text-[13px] text-[#d4d4d4]"
                            >
                                Email address
                            </label>
                            <input
                                id="login-email"
                                type="email"
                                placeholder="you@lgu.gov.ph"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                aria-invalid={error ? true : undefined}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div className="mb-4">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <label
                                    htmlFor="login-password"
                                    className="text-[13px] text-[#d4d4d4]"
                                >
                                    Password
                                </label>
                                <Link
                                    to="/forgot-password"
                                    className="text-[12px] font-medium text-accent hover:text-white"
                                >
                                    Forgot password?
                                </Link>
                            </div>
                            <input
                                id="login-password"
                                type="password"
                                placeholder="Your password"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                aria-invalid={error ? true : undefined}
                                className={INPUT_CLASSES}
                            />
                        </div>

                        {error ? (
                            <p
                                role="alert"
                                className="mb-3 rounded-[12px] border border-[rgba(255,45,85,.3)] bg-[rgba(255,45,85,.08)] px-3 py-2.5 text-[12.5px] font-medium leading-snug text-[#ff7a94]"
                            >
                                {cooldown > 0
                                    ? `Too many failed attempts — try again in ${cooldown}s`
                                    : error}
                            </p>
                        ) : null}
                        {info ? (
                            <p
                                role="status"
                                className="mb-3 rounded-[12px] border border-mint/25 bg-mint/[.07] px-3 py-2.5 text-[12.5px] font-medium leading-snug text-mint"
                            >
                                {info}
                            </p>
                        ) : null}
                        {showResend ? (
                            <button
                                type="button"
                                onClick={handleResend}
                                className="mb-3 min-h-[40px] w-full cursor-pointer rounded-[14px] border border-white/10 bg-white/[.04] px-3 text-[12.5px] font-medium text-white hover:bg-white/10"
                            >
                                Resend verification email
                            </button>
                        ) : null}

                        <button
                            id="loginBtn"
                            type="submit"
                            disabled={busy || cooldown > 0}
                            className="mt-1 flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[14px] text-[15px] font-semibold text-white transition duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_35px_rgba(var(--accent-glow),.45)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loggingIn ? (
                                <>
                                    <i className="fa-solid fa-spinner fa-spin text-[13px]"></i>
                                    Signing in…
                                </>
                            ) : cooldown > 0 ? (
                                `Try again in ${cooldown}s`
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 border-t border-white/8 pt-4">
                        <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                            Demo access
                        </p>
                        <div className="grid grid-cols-3 gap-2">
                            {DEMO_ROLES.map((account) => (
                                <button
                                    key={account.role}
                                    type="button"
                                    onClick={() => void handleDemoLogin(account)}
                                    disabled={busy || cooldown > 0}
                                    title={`Sign in as ${account.role} (${account.email})`}
                                    className="flex min-h-[52px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-white/10 bg-white/[.04] px-2 py-2 text-[12px] font-semibold text-[#ddd] transition hover:border-[rgba(var(--accent-glow),.4)] hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <i
                                        className={`fa-solid ${
                                            demoRole === account.role
                                                ? 'fa-spinner fa-spin'
                                                : account.icon
                                        } text-[13px] text-accent`}
                                    ></i>
                                    {demoRole === account.role ? 'Signing in…' : account.short}
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="mt-5 text-center text-[13px] text-[#9f9f9f]">
                        Don&apos;t have an account?{' '}
                        <Link
                            to="/register"
                            className="font-medium text-white hover:text-accent"
                        >
                            Create account
                        </Link>
                    </p>

                    <footer className="mt-3 text-center text-[12px] text-[#999]">
                        Prototype · Stellar {config.label} · mock environmental data
                    </footer>
                </section>
            </main>
        </div>
    );
}
