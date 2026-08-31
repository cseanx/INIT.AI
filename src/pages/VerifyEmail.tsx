import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { api } from '../services/api';

export default function VerifyEmail() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resendMsg, setResendMsg] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Missing verification token.');
            return;
        }
        api.auth
            .verifyEmail(token)
            .then((res) => {
                setStatus('success');
                setMessage(res.message);
            })
            .catch((err: unknown) => {
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Verification failed.');
            });
    }, [token]);

    async function handleResend(e: React.FormEvent) {
        e.preventDefault();
        setResendMsg(null);
        try {
            const res = await api.auth.resendVerification(resendEmail);
            setResendMsg(res.message);
        } catch (err) {
            setResendMsg(err instanceof Error ? err.message : 'Failed to resend.');
        }
    }

    return (
        <div className="background fixed inset-0">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="absolute h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.28)] blur-[120px] animate-glow-one"></div>
            <Particles />
            <main className="relative z-10 flex h-screen w-full items-center justify-center px-4">
                <section className="w-[460px] rounded-[28px] border border-white/8 bg-white/5 p-[40px] backdrop-blur-[25px] shadow-[0_0_60px_rgba(var(--accent-glow),.12),0_20px_80px_rgba(0,0,0,.45)] text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-white">
                            <i className={`fa-solid ${status === 'success' ? 'fa-check' : status === 'error' ? 'fa-triangle-exclamation' : 'fa-envelope'} text-xl`}></i>
                        </div>
                    </div>
                    <h2 className="mb-2 text-xl font-semibold">
                        {status === 'loading' ? 'Verifying...' : status === 'success' ? 'Email Verified' : 'Verification Failed'}
                    </h2>
                    <p className="mb-6 text-sm text-[#9f9f9f]">{status === 'loading' ? 'Please wait while we verify your email.' : message}</p>

                    {status === 'success' ? (
                        <Link
                            to="/login"
                            className="inline-flex w-full justify-center rounded-[14px] bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
                        >
                            Continue to Login
                        </Link>
                    ) : status === 'error' ? (
                        <div className="text-left">
                            <form onSubmit={handleResend} className="mt-4 flex gap-2">
                                <input
                                    type="email"
                                    placeholder="Enter your email to resend"
                                    value={resendEmail}
                                    onChange={(e) => setResendEmail(e.target.value)}
                                    className="flex-1 rounded-[14px] border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white outline-none"
                                />
                                <button
                                    type="submit"
                                    className="rounded-[14px] bg-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/15"
                                >
                                    Resend
                                </button>
                            </form>
                            {resendMsg ? <p className="mt-3 text-center text-xs text-mint">{resendMsg}</p> : null}
                            <div className="mt-6 flex justify-center gap-4 text-sm">
                                <Link to="/login" className="text-accent hover:text-white">Back to Login</Link>
                                <Link to="/register" className="text-[#9f9f9f] hover:text-white">Create Account</Link>
                            </div>
                        </div>
                    ) : null}
                </section>
            </main>
        </div>
    );
}
