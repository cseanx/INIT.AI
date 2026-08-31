import { useEffect, useState } from 'react';
import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import ToggleRow from '../components/settings/ToggleRow';
import Switch from '../components/settings/Switch';
import ThemePicker from '../components/settings/ThemePicker';
import { usePreferences } from '../preferences/PreferencesContext';
import { useAuth } from '../auth/AuthContext';
import { api } from '../services/api';

const SUBHEAD_CLASSES = 'mb-[14px] block text-[12.5px] uppercase tracking-[.05em] text-[#999]';
const FIELD_CLASSES = 'rounded-[14px] border border-white/10 bg-white/[.04] p-[13px_16px] text-sm text-white outline-none transition duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)] disabled:opacity-60';
const SAVE_BTN_CLASSES = 'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)] disabled:opacity-60';
const GHOST_BTN_CLASSES = 'rounded-[14px] border border-white/10 bg-white/[.04] px-4 py-[11px] text-[13px] font-medium text-white hover:bg-white/10';

export default function Settings() {
    const { preferences, setSidebarCollapsed } = usePreferences();
    const { user, setUser } = useAuth();

    // Profile
    const [name, setName] = useState(user?.name ?? '');
    const [profileMsg, setProfileMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [savingProfile, setSavingProfile] = useState(false);

    // Email change
    const [newEmail, setNewEmail] = useState('');
    const [emailPassword, setEmailPassword] = useState('');
    const [emailMsg, setEmailMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [emailSubmitting, setEmailSubmitting] = useState(false);

    // Password change
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [pwdMsg, setPwdMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
    const [pwdSubmitting, setPwdSubmitting] = useState(false);

    // Verification resend
    const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

    useEffect(() => {
        if (user) setName(user.name);
    }, [user?.name]);

    async function handleSaveProfile() {
        if (!name.trim() || name.trim().length < 2) {
            setProfileMsg({ type: 'error', text: 'Full name must be at least 2 characters.' });
            return;
        }
        setSavingProfile(true);
        setProfileMsg(null);
        try {
            const updated = await api.account.updateProfile(name.trim());
            setUser(updated);
            setProfileMsg({ type: 'success', text: 'Name updated successfully.' });
        } catch (err) {
            setProfileMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update name.' });
        } finally {
            setSavingProfile(false);
        }
    }

    async function handleChangeEmail() {
        setEmailMsg(null);
        if (!newEmail.trim()) {
            setEmailMsg({ type: 'error', text: 'Enter a new email address.' });
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(newEmail.trim())) {
            setEmailMsg({ type: 'error', text: 'Enter a valid email address.' });
            return;
        }
        if (!emailPassword) {
            setEmailMsg({ type: 'error', text: 'Enter your current password to confirm.' });
            return;
        }
        setEmailSubmitting(true);
        try {
            const res = await api.account.requestEmailChange(newEmail.trim(), emailPassword);
            setEmailMsg({ type: 'success', text: res.message });
            setNewEmail('');
            setEmailPassword('');
        } catch (err) {
            setEmailMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to request email change.' });
        } finally {
            setEmailSubmitting(false);
        }
    }

    async function handleChangePassword() {
        setPwdMsg(null);
        if (!currentPassword || !newPassword || !confirmPassword) {
            setPwdMsg({ type: 'error', text: 'All password fields are required.' });
            return;
        }
        if (newPassword.length < 8) {
            setPwdMsg({ type: 'error', text: 'New password must be at least 8 characters.' });
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwdMsg({ type: 'error', text: 'New passwords do not match.' });
            return;
        }
        setPwdSubmitting(true);
        try {
            const res = await api.account.changePassword({ current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword });
            setPwdMsg({ type: 'success', text: res.message });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            setPwdMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to change password.' });
        } finally {
            setPwdSubmitting(false);
        }
    }

    async function handleResendVerification() {
        if (!user?.email) return;
        setVerifyMsg(null);
        try {
            const res = await api.auth.resendVerification(user.email);
            setVerifyMsg(res.message);
        } catch (err) {
            setVerifyMsg(err instanceof Error ? err.message : 'Failed to resend.');
        }
    }

    if (!user) {
        return (
            <Page>
                <Card>
                    <p className="text-sm text-[#888]">Loading account...</p>
                </Card>
            </Page>
        );
    }

    return (
        <Page>
            {/* Account */}
            <Card>
                <PanelHead title="Account" />
                <p className="mb-5 text-[12.5px] text-[#888]">Your LGU identity on INIT.AI</p>
                <div className="grid grid-cols-2 gap-5 max-[1200px]:grid-cols-1">
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Full Name</label>
                        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className={FIELD_CLASSES} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Email Address</label>
                        <div className="relative">
                            <input type="email" value={user.email} disabled className={`${FIELD_CLASSES} bg-white/[.02] pr-28`} />
                            <span className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${user.email_verified ? 'bg-[rgba(0,255,132,.14)] text-mint' : 'bg-[rgba(255,45,85,.14)] text-accent'}`}>
                                {user.email_verified ? 'Verified' : 'Unverified'}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Organization / LGU</label>
                        <input type="text" value={user.organization ?? ''} disabled placeholder="—" className={`${FIELD_CLASSES} bg-white/[.02]`} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Role</label>
                        <input type="text" value={user.role} disabled className={`${FIELD_CLASSES} bg-white/[.02]`} />
                        <span className="text-[11px] text-[#666]">Role cannot be changed from Settings.</span>
                    </div>
                </div>
                {profileMsg ? (
                    <p className={`mt-4 text-[13px] font-medium ${profileMsg.type === 'success' ? 'text-mint' : 'text-accent'}`}>{profileMsg.text}</p>
                ) : null}
                {!user.email_verified ? (
                    <div className="mt-4 flex items-center gap-3 rounded-[14px] border border-amber-500/20 bg-amber-500/10 p-3">
                        <i className="fa-solid fa-triangle-exclamation text-amber-400"></i>
                        <span className="flex-1 text-[12.5px] text-amber-200">Your email is not verified. Check your inbox or resend the verification email.</span>
                        <button onClick={handleResendVerification} className="rounded-full bg-white/10 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/15">
                            Resend
                        </button>
                    </div>
                ) : null}
                {verifyMsg ? <p className="mt-2 text-[12px] text-mint">{verifyMsg}</p> : null}
                <div className="mt-[22px] flex justify-end border-t border-white/6 pt-5">
                    <button onClick={handleSaveProfile} disabled={savingProfile} className={SAVE_BTN_CLASSES} type="button">
                        <i className="fa-solid fa-check"></i> {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </Card>

            {/* Email - Change Email */}
            <Card>
                <PanelHead title="Email" />
                <div className="mb-2">
                    <span className={SUBHEAD_CLASSES}>Change Email</span>
                    <p className="mb-4 text-[12.5px] leading-5 text-[#888]">Enter a new address and your current password. We&apos;ll send a verification link to the new address — your email only changes after you confirm.</p>
                    <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1">
                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] text-[#999]">New Email Address</label>
                            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new@lgu.gov.ph" className={FIELD_CLASSES} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] text-[#999]">Current Password</label>
                            <input type="password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} placeholder="••••••••" className={FIELD_CLASSES} />
                        </div>
                    </div>
                    {emailMsg ? (
                        <p className={`mt-3 text-[13px] font-medium ${emailMsg.type === 'success' ? 'text-mint' : 'text-accent'}`}>{emailMsg.text}</p>
                    ) : null}
                    <div className="mt-5 flex justify-end">
                        <button onClick={handleChangeEmail} disabled={emailSubmitting} className={SAVE_BTN_CLASSES} type="button">
                            <i className="fa-solid fa-envelope"></i> {emailSubmitting ? 'Sending...' : 'Send Verification'}
                        </button>
                    </div>
                </div>
                <div className="mt-6 border-t border-white/6 pt-6">
                    <span className={SUBHEAD_CLASSES}>Verification Status</span>
                    <div className="flex items-center justify-between rounded-[16px] border border-white/7 bg-white/[.03] p-4">
                        <div className="flex items-center gap-3">
                            <i className={`fa-solid ${user.email_verified ? 'fa-circle-check text-mint' : 'fa-circle-exclamation text-accent'} text-lg`}></i>
                            <div>
                                <strong className="block text-sm font-semibold">{user.email_verified ? 'Email verified' : 'Email not verified'}</strong>
                                <span className="block text-[12.5px] text-[#888]">{user.email}</span>
                            </div>
                        </div>
                        {!user.email_verified ? (
                            <button onClick={handleResendVerification} className={GHOST_BTN_CLASSES} type="button">
                                Resend Email
                            </button>
                        ) : (
                            <span className="rounded-full bg-[rgba(0,255,132,.14)] px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-mint">Active</span>
                        )}
                    </div>
                </div>
            </Card>

            {/* Security - Change Password */}
            <Card>
                <PanelHead title="Security" />
                <div className="mb-2">
                    <span className={SUBHEAD_CLASSES}>Change Password</span>
                    <p className="mb-4 text-[12.5px] leading-5 text-[#888]">Update the password used to sign in. You&apos;ll stay logged in on this device but other sessions will be signed out.</p>
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[13px] text-[#999]">Current Password</label>
                            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className={FIELD_CLASSES} />
                        </div>
                        <div className="grid grid-cols-2 gap-5 max-[700px]:grid-cols-1">
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] text-[#999]">New Password</label>
                                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" className={FIELD_CLASSES} />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[13px] text-[#999]">Confirm New Password</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" className={FIELD_CLASSES} />
                            </div>
                        </div>
                    </div>
                    {pwdMsg ? (
                        <p className={`mt-3 text-[13px] font-medium ${pwdMsg.type === 'success' ? 'text-mint' : 'text-accent'}`}>{pwdMsg.text}</p>
                    ) : null}
                    <div className="mt-5 flex justify-end">
                        <button onClick={handleChangePassword} disabled={pwdSubmitting} className={SAVE_BTN_CLASSES} type="button">
                            <i className="fa-solid fa-key"></i> {pwdSubmitting ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </div>
                <div className="border-t border-white/6 pt-6">
                    <span className={SUBHEAD_CLASSES}>Protected Actions</span>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between rounded-[16px] border border-white/7 bg-white/[.03] p-4 opacity-60">
                            <div className="flex items-center gap-4">
                                <i className="fa-solid fa-shield-halved w-5 text-center text-[#999]"></i>
                                <div>
                                    <strong className="block text-sm font-semibold">Two-Factor Authentication</strong>
                                    <span className="block text-[12.5px] text-[#888]">Add an extra layer of login security</span>
                                </div>
                            </div>
                            <span className="rounded-full bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-[#aaa]">Coming Soon</span>
                        </div>
                    </div>
                </div>
            </Card>

            <Card>
                <PanelHead title="Notifications" />
                <div className="flex flex-col">
                    <ToggleRow title="Email Notifications" description="Get platform updates and digests sent to your inbox" checked />
                    <ToggleRow title="SMS Notifications" description="Receive critical alerts as text messages" />
                    <ToggleRow title="Heat Alert Notifications" description="Get notified when a monitored barangay crosses a critical threshold" checked />
                    <ToggleRow title="Weekly Reports" description="Receive a summary report every Monday morning" checked />
                    <ToggleRow title="System Announcements" description="Product updates, maintenance windows, and platform news" />
                </div>
            </Card>

            <Card>
                <PanelHead title="Appearance" />
                <div className="mb-6 border-b border-white/6 pb-6">
                    <span className={SUBHEAD_CLASSES}>Theme</span>
                    <ThemePicker />
                </div>
                <div className="mb-0 border-b-0 pb-0">
                    <div className="flex items-center justify-between gap-5 border-b border-white/6 p-4 last:border-b-0 last:pb-0">
                        <div>
                            <strong className="mb-1 block text-sm font-semibold">Sidebar Collapse</strong>
                            <span className="block text-[12.5px] leading-[1.5] text-[#888]">Start every session with the sidebar collapsed to icons</span>
                        </div>
                        <Switch checked={preferences.sidebar_collapsed} onChange={setSidebarCollapsed} />
                    </div>
                </div>
            </Card>

            <Card className="about-card flex flex-col gap-[22px]">
                <div className="flex items-center gap-[18px]">
                    <div className="logo-circle about-logo flex shrink-0 items-center justify-center">
                        <img src="/assets/images/logo.svg" alt="INIT.AI logo" className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(var(--accent-glow),.35)]" />
                    </div>
                    <div>
                        <h3 className="mb-1 text-[17px]">About INIT.AI</h3>
                        <p className="text-[13px] text-[#999]">Urban Intelligence Platform for climate-smart LGU decision making.</p>
                    </div>
                </div>
                <div className="flex gap-10 border-t border-white/6 pt-5">
                    <div className="flex flex-col gap-1">
                        <span className="text-[11.5px] uppercase tracking-[.04em] text-[#888]">Version</span>
                        <strong className="text-sm font-semibold">v0.1 Prototype</strong>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[11.5px] uppercase tracking-[.04em] text-[#888]">Developed by</span>
                        <strong className="text-sm font-semibold">RA!N SYSTEMS</strong>
                    </div>
                </div>
            </Card>
        </Page>
    );
}
