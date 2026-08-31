import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { api } from '../services/api';

const INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/8 bg-white/[.04] p-[15px] text-[15px] text-white outline-none transition duration-300 focus:border-primary focus:shadow-[0_0_25px_rgba(var(--accent-glow),.25)]';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setMessage(null);
        setError(null);
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.trim())) {
            setError('Enter a valid email address.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.auth.forgotPassword(email.trim());
            setMessage(res.message);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Request failed.');
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="background fixed inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="absolute h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.28)] blur-[120px] animate-glow-one"></div>
            <Particles />
            <main className="relative z-10 flex h-screen w-full items-center justify-center px-4">
                <section className="w-[430px] rounded-[28px] border border-white/8 bg-white/5 p-[40px] backdrop-blur-[25px] shadow-[0_0_60px_rgba(var(--accent-glow),.12),0_20px_80px_rgba(0,0,0,.45)]">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white">
                            <i className="fa-solid fa-key"></i>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">Forgot Password</h2>
                            <p className="text-[13px] text-[#9f9f9f]">Reset your INIT.AI password</p>
                        </div>
                    </div>
                    <p className="mb-6 text-[13px] leading-5 text-[#9f9f9f]">
                        Enter your email and we&apos;ll send you a secure link to reset your password. The link expires in 1 hour and can only be used once.
                    </p>
                    <form onSubmit={handleSubmit}>
                        <label className="mb-2 block text-sm text-[#d4d4d4]">Email Address</label>
                        <input
                            type="email"
                            placeholder="you@lgu.gov.ph"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={INPUT_CLASSES}
                        />
                        {error ? (
                            <p role="alert" className="mt-3 text-center text-[13px] font-medium text-accent">
                                {error}
                            </p>
                        ) : null}
                        {message ? (
                            <p role="status" className="mt-3 text-center text-[13px] font-medium text-mint">
                                {message}
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-5 w-full cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[14px] text-base font-semibold text-white disabled:opacity-60"
                        >
                            {submitting ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                    <div className="mt-6 flex justify-between text-[13px]">
                        <Link to="/login" className="text-[#9f9f9f] hover:text-white">
                            Back to Login
                        </Link>
                        <Link to="/register" className="text-accent hover:text-white">
                            Create Account
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
