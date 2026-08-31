import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { api } from '../services/api';
import { useAuth } from '../auth/AuthContext';

export default function VerifyEmailChange() {
    const [params] = useSearchParams();
    const token = params.get('token') ?? '';
    const { refresh } = useAuth();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Missing verification token.');
            return;
        }
        // Use GET endpoint via direct fetch to support unauthenticated link clicks
        // But we have POST endpoint that updates DB; use api.account.verifyEmailChange
        api.account
            .verifyEmailChange(token)
            .then(async () => {
                setStatus('success');
                setMessage('Your email has been updated successfully.');
                try {
                    await refresh();
                } catch {
                    /* ignore */
                }
            })
            .catch((err: unknown) => {
                setStatus('error');
                setMessage(err instanceof Error ? err.message : 'Verification failed.');
            });
    }, [token, refresh]);

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
                        {status === 'loading' ? 'Confirming...' : status === 'success' ? 'Email Updated' : 'Update Failed'}
                    </h2>
                    <p className="mb-6 text-sm text-[#9f9f9f]">{status === 'loading' ? 'Please wait while we confirm your new email.' : message}</p>
                    {status === 'success' ? (
                        <Link
                            to="/settings"
                            className="inline-flex w-full justify-center rounded-[14px] bg-gradient-to-r from-primary to-accent px-6 py-3 text-sm font-semibold text-white"
                        >
                            Back to Settings
                        </Link>
                    ) : status === 'error' ? (
                        <Link to="/settings" className="text-sm text-accent hover:text-white">
                            Back to Settings
                        </Link>
                    ) : null}
                </section>
            </main>
        </div>
    );
}
