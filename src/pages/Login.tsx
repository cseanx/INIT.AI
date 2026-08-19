import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../services/api';

const INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/8 bg-white/[.04] p-[15px] text-[15px] text-white outline-none transition duration-300 focus:border-primary focus:shadow-[0_0_25px_rgba(var(--accent-glow),.25)]';

export default function Login() {
    const navigate = useNavigate();
    const { user, loading, login } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loggingIn, setLoggingIn] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

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

    async function handleLogin(e: FormEvent) {
        e.preventDefault();
        if (loggingIn || cooldown > 0) return;
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.trim())) {
            setError('Enter a valid email address');
            return;
        }
        setLoggingIn(true);
        setError(null);
        try {
            await login(email, password);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            if (err instanceof ApiError && err.status === 429 && err.retryAfter) {
                setCooldown(err.retryAfter);
                setError('Too many failed attempts. Please wait to try again.');
            } else {
                setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
            }
            setLoggingIn(false);
        }
    }

    return (
        <div className="background fixed inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="absolute h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.28)] blur-[120px] animate-glow-one"></div>
            <div className="absolute -bottom-[150px] -right-[150px] h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.16)] blur-[120px] animate-glow-two"></div>
            <Particles />

            <main className="relative z-10 flex h-screen w-full items-center justify-center">
                <section className="w-[430px] rounded-[28px] border border-white/8 bg-white/5 p-[45px] backdrop-blur-[25px] shadow-[0_0_60px_rgba(var(--accent-glow),.12),0_20px_80px_rgba(0,0,0,.45)]">
                    <div className="logo mb-[35px] flex items-center gap-[15px]">
                        <div className="logo-circle flex h-[60px] w-[60px] shrink-0 items-center justify-center">
                            <img
                                src="/assets/images/logo.svg"
                                alt="INIT.AI logo"
                                className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(var(--accent-glow),.4)]"
                            />
                        </div>
                        <div>
                            <h1 className="text-[30px]">INIT.AI</h1>
                            <p className="text-[13px] text-[#9f9f9f]">Urban Intelligence Platform</p>
                        </div>
                    </div>
                    <h2 className="mb-2">Welcome Back</h2>
                    <span className="mb-[30px] block text-[#9f9f9f]">
                        Sign in to continue monitoring urban heat intelligence.
                    </span>
                    <form onSubmit={handleLogin}>
                        <div className="mb-5">
                            <label className="mb-2 block text-sm text-[#d4d4d4]">
                                Email Address
                            </label>
                            <input
                                type="email"
                                placeholder="admin@init.ai"
                                required
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div className="mb-5">
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Password</label>
                            <input
                                type="password"
                                placeholder="admin123"
                                required
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        {error ? (
                            <p
                                role="alert"
                                className="mb-4 text-center text-[13px] font-medium text-accent"
                            >
                                {cooldown > 0
                                    ? `Too many failed attempts — try again in ${cooldown}s`
                                    : error}
                            </p>
                        ) : null}
                        <button
                            id="loginBtn"
                            type="submit"
                            disabled={loggingIn || cooldown > 0}
                            className="mt-[10px] w-full cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[15px] text-base font-semibold text-white transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_10px_35px_rgba(var(--accent-glow),.45)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {loggingIn
                                ? 'Logging in...'
                                : cooldown > 0
                                  ? `Try again in ${cooldown}s`
                                  : 'Login'}
                        </button>
                    </form>
                    <footer className="mt-[30px] text-center text-[13px] text-[#9f9f9f]">
                        Prototype Version • 2026
                    </footer>
                </section>
            </main>
        </div>
    );
}
