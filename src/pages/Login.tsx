import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { useAuth } from '../auth/AuthContext';
import { ApiError, api } from '../services/api';
import { barangays } from '../data/mockData';

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
    const { user, loading, login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [demoRole, setDemoRole] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [info, setInfo] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);
    const [showResend, setShowResend] = useState(false);

    const stats = useMemo(() => {
        const critical = barangays.filter((b) => b.severity === 'critical').length;
        const avgCanopy =
            barangays.reduce((sum, b) => sum + b.canopy, 0) / Math.max(barangays.length, 1);
        return {
            areas: barangays.length,
            critical,
            canopy: avgCanopy.toFixed(1),
        };
    }, []);

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
                <section className="grid w-full max-w-[1040px] overflow-hidden rounded-[24px] border border-white/8 bg-white/5 shadow-[0_0_60px_rgba(var(--accent-glow),.12),0_20px_80px_rgba(0,0,0,.45)] backdrop-blur-[25px] sm:rounded-[28px] lg:grid-cols-[1fr_1.04fr]">
                    {/* Brand / impact panel — right-hand column on desktop. */}
                    <aside className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,rgba(var(--accent-glow),.16),rgba(255,255,255,.02)_55%,rgba(255,255,255,.04))] p-10 lg:order-2 lg:flex lg:border-l lg:border-white/8">
                        <div className="pointer-events-none absolute -left-24 -top-24 h-[320px] w-[320px] rounded-full bg-[rgba(var(--accent-glow),.16)] blur-[70px]"></div>
                        <div className="relative">
                            <div className="flex items-center gap-[14px]">
                                <div className="logo-circle flex h-[58px] w-[58px] shrink-0 items-center justify-center">
                                    <img
                                        src="/assets/images/logo.svg"
                                        alt="INIT.AI logo"
                                        className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(var(--accent-glow),.4)]"
                                    />
                                </div>
                                <div>
                                    <h1 className="text-[26px] leading-none">INIT.AI</h1>
                                    <p className="mt-1 text-[12.5px] text-[#b4b4b4]">
                                        Urban Intelligence Platform
                                    </p>
                                </div>
                            </div>

                            <h2 className="mt-10 max-w-[19ch] text-[30px] font-bold leading-[1.14] text-white">
                                Climate intelligence for every barangay.
                            </h2>
                            <p className="mt-4 max-w-[42ch] text-[14px] leading-[1.7] text-[#c4c4c4]">
                                Find where urban heat concentrates, understand the drivers, and
                                produce a report whose integrity can be checked independently.
                            </p>

                            <div className="mt-8 grid grid-cols-3 gap-3 border-y border-white/8 py-5">
                                <div>
                                    <strong className="block text-[24px] font-bold leading-none tabular-nums">
                                        {stats.areas}
                                    </strong>
                                    <span className="mt-1.5 block text-[12px] leading-snug text-[#aaa]">
                                        barangays in view
                                    </span>
                                </div>
                                <div>
                                    <strong className="block text-[24px] font-bold leading-none tabular-nums text-[#ff5577]">
                                        {stats.critical}
                                    </strong>
                                    <span className="mt-1.5 block text-[12px] leading-snug text-[#aaa]">
                                        critical hotspots
                                    </span>
                                </div>
                                <div>
                                    <strong className="block text-[24px] font-bold leading-none tabular-nums text-mint">
                                        {stats.canopy}%
                                    </strong>
                                    <span className="mt-1.5 block text-[12px] leading-snug text-[#aaa]">
                                        average canopy
                                    </span>
                                </div>
                            </div>

                            <ul className="mt-6 flex flex-col gap-3 text-[12.5px] text-[#c4c4c4]">
                                <li className="flex items-start gap-2.5">
                                    <i className="fa-solid fa-shield-halved mt-0.5 text-[12px] text-accent"></i>
                                    Wallet-submitted, revision-linked attestations on Stellar
                                    Testnet.
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <i className="fa-solid fa-lock mt-0.5 text-[12px] text-accent"></i>
                                    Report content stays off-chain; only a SHA-256 digest travels.
                                </li>
                                <li className="flex items-start gap-2.5">
                                    <i className="fa-solid fa-flask mt-0.5 text-[12px] text-accent"></i>
                                    Prototype data and Testnet proofs — not an LGU certification.
                                </li>
                            </ul>
                        </div>

                        <p className="relative mt-10 text-[12px] text-[#999]">
                            Prototype Version · 2026 · RA!N SYSTEMS
                        </p>
                    </aside>

                    {/* Form panel — left-hand column on desktop. */}
                    <div className="bg-[rgba(8,8,10,.35)] p-6 sm:p-9 lg:order-1 lg:p-10">
                        <div className="mb-7 flex items-center gap-[13px] lg:hidden">
                            <div className="logo-circle flex h-[48px] w-[48px] shrink-0 items-center justify-center">
                                <img
                                    src="/assets/images/logo.svg"
                                    alt="INIT.AI logo"
                                    className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(var(--accent-glow),.35)]"
                                />
                            </div>
                            <div>
                                <h1 className="text-[22px] leading-none">INIT.AI</h1>
                                <p className="mt-1 text-[12px] text-[#999]">
                                    Urban Intelligence Platform
                                </p>
                            </div>
                        </div>

                        <h2 className="text-[26px] font-semibold leading-tight">
                            Welcome back
                        </h2>
                        <p className="mt-2 text-[13px] leading-relaxed text-[#a8a8a8]">
                            Continue monitoring urban heat intelligence for your city.
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

                        <div className="mt-5 rounded-[16px] border border-white/8 bg-white/[.03] p-3">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="text-[12px] font-semibold uppercase tracking-[.08em] text-[#999]">
                                    Demo access
                                </span>
                                <span className="text-[12px] text-[#888]">one tap</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {DEMO_ROLES.map((account) => (
                                    <button
                                        key={account.role}
                                        type="button"
                                        onClick={() => void handleDemoLogin(account)}
                                        disabled={busy || cooldown > 0}
                                        title={`Sign in as ${account.role} (${account.email})`}
                                        className="flex min-h-[56px] cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] border border-white/10 bg-white/[.04] px-2 py-2 text-[12px] font-semibold text-[#ddd] transition hover:border-[rgba(var(--accent-glow),.4)] hover:bg-white/8 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
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
                            <p className="mt-2 text-[12px] leading-snug text-[#999]">
                                Seeded prototype accounts. All three roles open the same workspace;
                                role rules are not enforced yet.
                            </p>
                        </div>

                        <div className="mt-5 flex flex-col gap-2 text-center text-[13px]">
                            <span className="text-[#9f9f9f]">
                                Don&apos;t have an account?{' '}
                                <Link
                                    to="/register"
                                    className="font-medium text-white hover:text-accent"
                                >
                                    Create account
                                </Link>
                            </span>
                        </div>

                        <footer className="mt-6 border-t border-white/6 pt-4 text-center text-[12px] text-[#999]">
                            Prototype · Testnet only · mock environmental data
                        </footer>
                    </div>
                </section>
            </main>
        </div>
    );
}
