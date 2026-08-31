import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Particles from '../components/common/Particles';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../services/api';
import MenuSelect from '../components/settings/MenuSelect';

const INPUT_CLASSES =
    'w-full rounded-[14px] border border-white/8 bg-white/[.04] p-[15px] text-[15px] text-white outline-none transition duration-300 focus:border-primary focus:shadow-[0_0_25px_rgba(var(--accent-glow),.25)]';

const ROLE_OPTIONS = [
    { value: 'Climate Analyst', label: 'Climate Analyst' },
    { value: 'Field Coordinator', label: 'Field Coordinator' },
];

export default function Register() {
    const navigate = useNavigate();
    const { register } = useAuth();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [organization, setOrganization] = useState('');
    const [role, setRole] = useState('Climate Analyst');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        if (submitting) return;
        setError(null);
        setSuccess(null);
        if (!name.trim() || !organization.trim()) {
            setError('Full name and organization are required.');
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email.trim())) {
            setError('Enter a valid email address.');
            return;
        }
        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        setSubmitting(true);
        try {
            await register({
                name: name.trim(),
                email: email.trim(),
                password,
                confirm_password: confirmPassword,
                organization: organization.trim(),
                role,
            });
            setSuccess(
                'Account created. Please check your email for a verification link. You must verify before logging in.',
            );
            setTimeout(() => navigate('/login', { replace: true }), 2500);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed.');
            if (err instanceof ApiError && err.status === 400) {
                // duplicate email handled
            }
            setSubmitting(false);
        }
    }

    return (
        <div className="background fixed inset-0 overflow-auto">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.03)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
            <div className="absolute h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.28)] blur-[120px] animate-glow-one"></div>
            <div className="absolute -bottom-[150px] -right-[150px] h-[700px] w-[700px] rounded-full bg-[rgba(var(--accent-glow),.16)] blur-[120px] animate-glow-two"></div>
            <Particles />

            <main className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10">
                <section className="w-[520px] rounded-[28px] border border-white/8 bg-white/5 p-[40px] backdrop-blur-[25px] shadow-[0_0_60px_rgba(var(--accent-glow),.12),0_20px_80px_rgba(0,0,0,.45)]">
                    <div className="logo mb-[30px] flex items-center gap-[15px]">
                        <div className="logo-circle flex h-[60px] w-[60px] shrink-0 items-center justify-center">
                            <img
                                src="/assets/images/logo.svg"
                                alt="INIT.AI logo"
                                className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(var(--accent-glow),.4)]"
                            />
                        </div>
                        <div>
                            <h1 className="text-[28px]">INIT.AI</h1>
                            <p className="text-[13px] text-[#9f9f9f]">Urban Intelligence Platform</p>
                        </div>
                    </div>
                    <h2 className="mb-1 text-[22px] font-semibold">Create Account</h2>
                    <span className="mb-[28px] block text-[13px] text-[#9f9f9f]">
                        Join your LGU climate intelligence workspace.
                    </span>
                    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Full Name</label>
                            <input
                                type="text"
                                placeholder="Juan Dela Cruz"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Email Address</label>
                            <input
                                type="email"
                                placeholder="you@lgu.gov.ph"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">LGU / Organization</label>
                            <input
                                type="text"
                                placeholder="Quezon City Local Government"
                                required
                                value={organization}
                                onChange={(e) => setOrganization(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Role</label>
                            <MenuSelect value={role} options={ROLE_OPTIONS} onChange={setRole} />
                            <p className="mt-2 text-[11px] text-[#777]">LGU Administrator requires invitation and cannot be self-registered.</p>
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Password</label>
                            <input
                                type="password"
                                placeholder="At least 8 characters"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={INPUT_CLASSES}
                            />
                        </div>
                        <div>
                            <label className="mb-2 block text-sm text-[#d4d4d4]">Confirm Password</label>
                            <input
                                type="password"
                                placeholder="Repeat password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                            className="mt-2 w-full cursor-pointer rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[15px] text-base font-semibold text-white transition duration-300 hover:-translate-y-[3px] hover:shadow-[0_10px_35px_rgba(var(--accent-glow),.45)] disabled:cursor-not-allowed disabled:opacity-70"
                        >
                            {submitting ? 'Creating...' : 'Create Account'}
                        </button>
                    </form>
                    <div className="mt-6 flex justify-between text-[13px]">
                        <Link to="/login" className="text-[#9f9f9f] hover:text-white">
                            Already have an account? Sign in
                        </Link>
                        <Link to="/forgot-password" className="text-accent hover:text-white">
                            Forgot password?
                        </Link>
                    </div>
                    <footer className="mt-[24px] text-center text-[12px] text-[#9f9f9f]">
                        Prototype Version • 2026
                    </footer>
                </section>
            </main>
        </div>
    );
}
