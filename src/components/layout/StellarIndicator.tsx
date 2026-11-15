import { useEffect, useRef, useState } from 'react';
import { useStellarWallet } from '../../services/stellar/WalletContext';
import { useStellarNetwork } from '../../services/stellar/NetworkContext';
import { STELLAR_ENABLED, explorerAccountUrl, type StellarNetwork } from '../../services/stellar/client';

/** GAB3...X9K2-style shortening for header display. */
function shortAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

const LINE2_CLASSES =
    'inline-flex cursor-pointer items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-semibold transition duration-200';

type OpenMenu = 'network' | 'wallet' | null;

/** Compact network toggle + wallet indicator for the global topbar.
 *  The badge opens a Testnet/Mainnet menu; Mainnet is disabled until a
 *  Mainnet contract id is configured for the build.
 *  Renders nothing when the Stellar integration is disabled. */
export default function StellarIndicator() {
    const wallet = useStellarWallet();
    const { network, config, available, setNetwork } = useStellarNetwork();
    const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
    const [copied, setCopied] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!openMenu) return;
        function onDocumentClick(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setOpenMenu(null);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpenMenu(null);
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [openMenu]);

    if (!STELLAR_ENABLED) return null;

    const connected = !!wallet.address;

    function handleCopy() {
        if (!wallet.address) return;
        void navigator.clipboard.writeText(wallet.address).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        });
    }

    function chooseNetwork(next: StellarNetwork) {
        if (!available[next]) return;
        setNetwork(next);
        setOpenMenu(null);
    }

    return (
        <div ref={rootRef} className="relative flex flex-col items-end gap-[5px]">
            {/* Network badge — opens the Testnet/Mainnet toggle */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setOpenMenu((m) => (m === 'network' ? null : 'network'))}
                    aria-haspopup="menu"
                    aria-expanded={openMenu === 'network'}
                    title={
                        config.isMainnet
                            ? 'Stellar Mainnet — attestations cost real XLM. Click to switch.'
                            : 'Stellar Testnet — free test XLM. Click to switch.'
                    }
                    className={`inline-flex cursor-pointer items-center gap-[5px] rounded-full border px-[9px] py-[3px] text-[12px] font-bold uppercase tracking-[.08em] transition duration-200 sm:px-[10px] sm:text-[12px] ${
                        config.isMainnet
                            ? 'border-mint/30 bg-mint/10 text-mint hover:bg-mint/20'
                            : 'border-[#ffb03a]/30 bg-[#ffb03a]/10 text-[#ffb03a] hover:bg-[#ffb03a]/20'
                    }`}
                >
                    <i className="fa-solid fa-satellite text-[11px]"></i>
                    {config.isMainnet ? 'Mainnet' : 'Testnet Demo'}
                    <i
                        className={`fa-solid fa-chevron-down text-[9px] opacity-70 transition duration-200 ${
                            openMenu === 'network' ? 'rotate-180' : ''
                        }`}
                    ></i>
                </button>

                {openMenu === 'network' ? (
                    <div
                        role="menu"
                        aria-label="Stellar network"
                        className="absolute right-0 top-full z-[70] mt-[8px] w-[248px] rounded-[14px] border border-white/10 bg-[#101010] p-[8px] shadow-[0_16px_40px_rgba(0,0,0,.55)]"
                    >
                        <p className="px-[8px] py-[6px] text-[11px] font-semibold uppercase tracking-[.12em] text-[#888]">
                            Stellar network
                        </p>
                        {(['testnet', 'mainnet'] as StellarNetwork[]).map((option) => {
                            const isActive = network === option;
                            const isAvailable = available[option];
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    role="menuitemradio"
                                    aria-checked={isActive}
                                    disabled={!isAvailable}
                                    onClick={() => chooseNetwork(option)}
                                    className={`flex w-full items-start gap-[9px] rounded-[10px] px-[9px] py-[8px] text-left transition ${
                                        isActive
                                            ? 'bg-white/[.07]'
                                            : 'hover:bg-white/[.04]'
                                    } ${isAvailable ? 'cursor-pointer' : 'cursor-not-allowed opacity-45'}`}
                                >
                                    <span
                                        className={`mt-[3px] inline-block h-[7px] w-[7px] shrink-0 rounded-full ${
                                            option === 'mainnet' ? 'bg-mint' : 'bg-[#ffb03a]'
                                        }`}
                                    ></span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-[12.5px] font-semibold text-[#eee]">
                                            {option === 'mainnet' ? 'Mainnet' : 'Testnet'}
                                        </span>
                                        <span className="block text-[11px] leading-snug text-[#888]">
                                            {option === 'mainnet'
                                                ? isAvailable
                                                    ? 'Real XLM fees. Proofs are permanent.'
                                                    : 'No Mainnet contract configured yet.'
                                                : isAvailable
                                                  ? 'Free test XLM via friendbot.'
                                                  : 'No Testnet contract configured.'}
                                        </span>
                                    </span>
                                    {isActive ? (
                                        <i className="fa-solid fa-check mt-[3px] text-[11px] text-mint"></i>
                                    ) : null}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            {/* Line 2 — state */}
            {!connected ? (
                wallet.connecting ? (
                    <span className="inline-flex items-center gap-[6px] px-[10px] py-[4px] text-[12px] font-semibold text-[#999]">
                        <i className="fa-solid fa-spinner fa-spin text-[11.5px]"></i>
                        Connecting...
                    </span>
                ) : wallet.error ? (
                    <button
                        type="button"
                        title={wallet.error}
                        onClick={() => void wallet.connect()}
                        className={`${LINE2_CLASSES} border border-[rgba(255,45,85,.3)] bg-[rgba(255,45,85,.08)] text-[#ff7a94] hover:bg-[rgba(255,45,85,.16)]`}
                    >
                        <i className="fa-solid fa-triangle-exclamation text-[11.5px]"></i>
                        Connection failed
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => void wallet.connect()}
                        className={`${LINE2_CLASSES} border border-white/10 bg-white/[.04] text-accent hover:bg-white/8`}
                    >
                        <i className="fa-solid fa-wallet text-[11.5px]"></i>
                        Connect Wallet
                    </button>
                )
            ) : (
                <button
                    type="button"
                    onClick={() => setOpenMenu((m) => (m === 'wallet' ? null : 'wallet'))}
                    aria-expanded={openMenu === 'wallet'}
                    aria-haspopup="menu"
                    className={`${LINE2_CLASSES} border border-mint/30 bg-mint/10 text-mint hover:bg-mint/20`}
                >
                    <span className="inline-block h-[6px] w-[6px] rounded-full bg-mint shadow-[0_0_6px_rgba(0,255,132,.8)]"></span>
                    {shortAddress(wallet.address as string)}
                    <i
                        className={`fa-solid fa-chevron-down text-[11px] transition duration-200 ${
                            openMenu === 'wallet' ? 'rotate-180' : ''
                        }`}
                    ></i>
                </button>
            )}

            {/* Connected wallet popover */}
            {connected && openMenu === 'wallet' ? (
                <div
                    role="menu"
                    className="wallet-menu absolute right-0 top-full z-[60] mt-[10px] w-[264px] rounded-[14px] border border-white/10 bg-[#101010] p-[12px] shadow-[0_16px_40px_rgba(0,0,0,.55)]"
                >
                    <p className="mb-[8px] text-[12px] font-semibold uppercase tracking-[.12em] text-[#999]">
                        Stellar Wallet
                    </p>

                    <div className="mb-[10px] rounded-[10px] border border-white/8 bg-white/[.04] p-[10px]">
                        <div className="flex items-center justify-between gap-[8px]">
                            <span className="min-w-0 flex-1 break-all text-[12px] leading-snug text-[#ddd]">
                                {wallet.address}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                title="Copy address"
                                aria-label="Copy wallet address"
                                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent text-[#999] transition hover:text-white"
                            >
                                <i
                                    className={`fa-solid ${copied ? 'fa-check text-mint' : 'fa-copy'} text-[12px]`}
                                ></i>
                            </button>
                        </div>
                    </div>

                    <div className="mb-[10px] flex flex-col gap-[6px] text-[12px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[#888]">Network</span>
                            <span className="font-semibold text-[#ddd]">Stellar {config.label}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#888]">Status</span>
                            <span className="inline-flex items-center gap-[6px] font-semibold text-mint">
                                <span className="inline-block h-[6px] w-[6px] rounded-full bg-mint"></span>
                                Connected
                            </span>
                        </div>
                    </div>

                    <a
                        href={explorerAccountUrl(wallet.address as string, network)}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-[4px] flex items-center gap-[8px] rounded-[10px] px-[8px] py-[7px] text-[12.5px] text-[#ddd] transition hover:bg-white/6 hover:text-white"
                    >
                        <i className="fa-solid fa-arrow-up-right-from-square w-[14px] text-center text-[12px] text-accent"></i>
                        View on Stellar Expert
                    </a>

                    <button
                        type="button"
                        onClick={() => {
                            setOpenMenu(null);
                            wallet.disconnect();
                        }}
                        className="flex w-full cursor-pointer items-center gap-[8px] rounded-[10px] border-none bg-transparent px-[8px] py-[7px] text-left text-[12.5px] text-[#ff7a94] transition hover:bg-[rgba(255,45,85,.1)]"
                    >
                        <i className="fa-solid fa-right-from-bracket w-[14px] text-center text-[12px]"></i>
                        Disconnect Wallet
                    </button>
                </div>
            ) : null}
        </div>
    );
}
