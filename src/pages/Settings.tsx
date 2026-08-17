import Page from '../components/layout/Page';
import PanelHead from '../components/common/PanelHead';
import Card from '../components/common/Card';
import ToggleRow from '../components/settings/ToggleRow';
import Switch from '../components/settings/Switch';
import ThemePicker from '../components/settings/ThemePicker';
import AccentPicker from '../components/settings/AccentPicker';
import { usePreferences } from '../preferences/PreferencesContext';

const SUBHEAD_CLASSES =
    'mb-[14px] block text-[12.5px] uppercase tracking-[.05em] text-[#999]';

const FIELD_CLASSES =
    'rounded-[14px] border border-white/10 bg-white/[.04] p-[13px_16px] text-sm text-white outline-none transition duration-200 focus:border-primary focus:shadow-[0_0_0_3px_rgba(var(--accent-glow),.15)]';

const SAVE_BTN_CLASSES =
    'flex w-auto cursor-pointer items-center gap-2 rounded-[14px] border-none bg-gradient-to-r from-primary to-accent p-[11px_20px] text-[13px] font-semibold text-white shadow-[0_10px_30px_rgba(var(--accent-glow),.3)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_36px_rgba(var(--accent-glow),.42)]';

const DL_BTN_CLASSES =
    'h-[34px] w-[34px] cursor-pointer rounded-[10px] border border-white/10 bg-white/[.04] text-[#ccc] transition duration-200 hover:bg-white/9 hover:text-white';

function SecurityRow({
    icon,
    title,
    description,
    disabled,
    badge,
}: {
    icon: string;
    title: string;
    description: string;
    disabled?: boolean;
    badge?: string;
}) {
    const base =
        'flex w-full items-center justify-between rounded-[16px] border border-white/7 bg-white/[.03] p-4 text-white transition duration-200';
    if (disabled) {
        return (
            <div className={`${base} security-row disabled cursor-default opacity-60`}>
                <div className="flex items-center gap-4 text-left">
                    <i className={`fa-solid ${icon} w-5 text-center text-base text-[#999]`}></i>
                    <div>
                        <strong className="mb-[3px] block text-sm font-semibold">{title}</strong>
                        <span className="block text-[12.5px] text-[#888]">{description}</span>
                    </div>
                </div>
                <span className="rounded-full bg-white/8 p-[6px_12px] text-[11px] font-semibold text-[#aaa]">
                    {badge}
                </span>
            </div>
        );
    }
    return (
        <button type="button" className={`${base} security-row hover:bg-white/6`}>
            <div className="flex items-center gap-4 text-left">
                <i className={`fa-solid ${icon} w-5 text-center text-base text-[#999]`}></i>
                <div>
                    <strong className="mb-[3px] block text-sm font-semibold">{title}</strong>
                    <span className="block text-[12.5px] text-[#888]">{description}</span>
                </div>
            </div>
            <i className="fa-solid fa-chevron-right text-[13px] text-[#666]"></i>
        </button>
    );
}

function SessionItem({
    icon,
    device,
    detail,
    isThisDevice,
    onSignOut,
}: {
    icon: string;
    device: string;
    detail: string;
    isThisDevice?: boolean;
    onSignOut?: () => void;
}) {
    return (
        <div className="flex items-center gap-4 p-[14px_0]">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/5 text-[#999]">
                <i className={`fa-solid ${icon}`}></i>
            </div>
            <div className="min-w-0 flex-1">
                <strong className="mb-[3px] flex items-center gap-[10px] text-[13.5px] font-semibold">
                    {device}
                    {isThisDevice ? (
                        <span className="rounded-full bg-[rgba(0,255,132,.14)] p-[3px_9px] text-[10px] font-bold uppercase tracking-[.03em] text-mint">
                            This device
                        </span>
                    ) : null}
                </strong>
                <span className="block text-xs text-[#888]">{detail}</span>
            </div>
            {onSignOut ? (
                <button className={DL_BTN_CLASSES} type="button" title="Sign out this session" onClick={onSignOut}>
                    <i className="fa-solid fa-right-from-bracket"></i>
                </button>
            ) : null}
        </div>
    );
}

export default function Settings() {
    const { preferences, setSidebarCollapsed } = usePreferences();

    return (
        <Page>
            <Card>
                <PanelHead title="Profile" />
                <div className="grid grid-cols-2 gap-5 max-[1200px]:grid-cols-1">
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Full Name</label>
                        <input type="text" defaultValue="Juan Dela Cruz" placeholder="Full name" className={FIELD_CLASSES} />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Email Address</label>
                        <input
                            type="email"
                            defaultValue="juan.delacruz@quezoncity.gov.ph"
                            placeholder="Email address"
                            className={FIELD_CLASSES}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Organization / LGU</label>
                        <input
                            type="text"
                            defaultValue="Quezon City Local Government"
                            placeholder="Organization / LGU"
                            className={FIELD_CLASSES}
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[13px] text-[#999]">Role</label>
                        <select className={FIELD_CLASSES}>
                            <option className="bg-[#111] text-white">Planner</option>
                            <option selected className="bg-[#111] text-white">Admin</option>
                            <option className="bg-[#111] text-white">Analyst</option>
                        </select>
                    </div>
                </div>
                <div className="mt-[22px] flex justify-end border-t border-white/6 pt-5">
                    <button className={SAVE_BTN_CLASSES} type="button">
                        <i className="fa-solid fa-check"></i> Save Changes
                    </button>
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
                <div className="mb-6 border-b border-white/6 pb-6">
                    <span className={SUBHEAD_CLASSES}>Accent Color</span>
                    <AccentPicker />
                </div>
                <div className="mb-0 border-b-0 pb-0">
                    <div className="flex items-center justify-between gap-5 border-b border-white/6 p-4 last:border-b-0 last:pb-0">
                        <div>
                            <strong className="mb-1 block text-sm font-semibold">Sidebar Collapse</strong>
                            <span className="block text-[12.5px] leading-[1.5] text-[#888]">
                                Start every session with the sidebar collapsed to icons
                            </span>
                        </div>
                        <Switch
                            checked={preferences.sidebar_collapsed}
                            onChange={setSidebarCollapsed}
                        />
                    </div>
                </div>
            </Card>

            <Card>
                <PanelHead title="Security" />
                <div className="mb-7 flex flex-col gap-[10px]">
                    <SecurityRow icon="fa-key" title="Change Password" description="Update the password used to sign in" />
                    <SecurityRow icon="fa-envelope" title="Change Email" description="Update your registered email address" />
                    <SecurityRow icon="fa-shield-halved" title="Two-Factor Authentication" description="Add an extra layer of login security" disabled badge="Coming Soon" />
                </div>
                <div className="border-t border-white/6 pt-6">
                    <span className={SUBHEAD_CLASSES}>Active Sessions</span>
                    <SessionItem icon="fa-desktop" device="Chrome on Windows" detail="Quezon City, PH · Active now" isThisDevice />
                    <SessionItem icon="fa-mobile-screen" device="INIT.AI Mobile" detail="Quezon City, PH · Last active 2h ago" />
                    <SessionItem icon="fa-laptop" device="Safari on macOS" detail="Manila, PH · Last active 3d ago" />
                </div>
            </Card>

            <Card className="about-card flex flex-col gap-[22px]">
                <div className="flex items-center gap-[18px]">
                    <div className="logo-circle about-logo flex shrink-0 items-center justify-center">
                        <img
                            src="/assets/images/logo.svg"
                            alt="INIT.AI logo"
                            className="h-full w-full object-contain drop-shadow-[0_0_14px_rgba(var(--accent-glow),.35)]"
                        />
                    </div>
                    <div>
                        <h3 className="mb-1 text-[17px]">About INIT.AI</h3>
                        <p className="text-[13px] text-[#999]">
                            Urban Intelligence Platform for climate-smart LGU decision making.
                        </p>
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
