import { useState, type FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { api } from '../services/api';

const INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/8 bg-white/[.04] p-[15px] text-[15px] text-white outline-none transition duration-300 focus:border-primary focus:shadow-[0_0_25px_rgba(var(--accent-glow),.25)]';

export default function ResetPassword() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const tokenFromUrl = params.get('token') ?? '';
    const [token, setToken] = useState(tokenFromUrl);
    const [newPassword, setNewPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setError(null);
        if (!token.trim()) {
            setError('Missing reset token.');
            return;
        }
        if (newPassword.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (newPassword !== confirm) {
            setError('Passwords do not match.');
            return;
        }
        setSubmitting(true);
        try {
            const res = await api.auth.resetPassword({
                token: token.trim(),
                new_password: newPassword,
                confirm_password: confirm,
            });
            setSuccess(res.message + ' Redirecting to login...');
            setTimeout(() => navigate('/login', { replace: true }), 2000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Reset failed.');
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
                    <h2 className="mb-1 text-lg font-semibold">Reset Password</h2>
                    <p className="mb-6 text-[13px] text-[#9f9f9f]">Choose a new password for your account.</p>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Reset Token</label>
                            <input
                                type="text"
                                placeholder="Token from email link"
                                required
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                            <p className="mt-1 text-[11px] text-[#777]">Copied automatically if you opened the email link.</p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">New Password</label>
                            <input
                                type="password"
                                placeholder="At least 8 characters"
                                required
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Confirm New Password</label>
                            <input
                                type="password"
                                placeholder="Repeat new password"
                                required
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        {error ? (
                            <p role="alert" className="text-center text-[13px] font-medium text-accent">
                                {error}
                            </p>
                        ) : null}
                        {success ? (
                            <p role="status" className="text-center text-[13px] font-medium text-mint">
                                {success}
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-2 w-full cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[15px] text-base font-semibold text-white disabled:opacity-60"
                        >
                            {submitting ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                    <div className="mt-6 text-center text-[13px]">
                        <Link to="/login" className="text-[#9f9f9f] hover:text-white">
                            Back to Login
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
}
