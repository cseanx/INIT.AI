import { useEffect, useRef, useState } from 'react';
import { useStellarWallet } from '../../services/stellar/WalletContext';
import { STELLAR_ENABLED } from '../../services/stellar/client';

/** GAB3...X9K2-style shortening for header display. */
function shortAddress(address: string): string {
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function explorerAccountUrl(address: string): string {
    return `https://stellar.expert/explorer/testnet/account/${address}`;
}

const LINE2_CLASSES =
    'inline-flex cursor-pointer items-center gap-[6px] rounded-full px-[10px] py-[4px] text-[12px] font-semibold transition duration-200';

/** Compact TESTNET DEMO + wallet indicator for the global topbar.
 *  Renders nothing when the Stellar integration is disabled. */
export default function StellarIndicator() {
    const wallet = useStellarWallet();
    const [menuOpen, setMenuOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!menuOpen) return;
        function onDocumentClick(e: MouseEvent) {
            if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') setMenuOpen(false);
        }
        document.addEventListener('click', onDocumentClick);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('click', onDocumentClick);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    if (!STELLAR_ENABLED) return null;

    const connected = !!wallet.address;

    function handleCopy() {
        if (!wallet.address) return;
        void navigator.clipboard.writeText(wallet.address).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        });
    }

    return (
        <div ref={rootRef} className="relative flex flex-col items-end gap-[5px]">
            {/* Network badge */}
            <span className="inline-flex items-center gap-[5px] rounded-full border border-[#ffb03a]/30 bg-[#ffb03a]/10 px-[10px] py-[3px] text-[9.5px] font-bold uppercase tracking-[.1em] text-[#ffb03a]">
                <i className="fa-solid fa-satellite text-[8px]"></i>
                Testnet Demo
            </span>

            {/* Line 2 — state */}
            {!connected ? (
                wallet.connecting ? (
                    <span className="inline-flex items-center gap-[6px] px-[10px] py-[4px] text-[12px] font-semibold text-[#999]">
                        <i className="fa-solid fa-spinner fa-spin text-[10px]"></i>
                        Connecting...
                    </span>
                ) : wallet.error ? (
                    <button
                        type="button"
                        title={wallet.error}
                        onClick={() => void wallet.connect()}
                        className={`${LINE2_CLASSES} border border-[rgba(255,45,85,.3)] bg-[rgba(255,45,85,.08)] text-[#ff7a94] hover:bg-[rgba(255,45,85,.16)]`}
                    >
                        <i className="fa-solid fa-triangle-exclamation text-[10px]"></i>
                        Connection failed
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={() => void wallet.connect()}
                        className={`${LINE2_CLASSES} border border-white/10 bg-white/[.04] text-accent hover:bg-white/8`}
                    >
                        <i className="fa-solid fa-wallet text-[10px]"></i>
                        Connect Wallet
                    </button>
                )
            ) : (
                <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-expanded={menuOpen}
                    aria-haspopup="menu"
                    className={`${LINE2_CLASSES} border border-mint/30 bg-mint/10 text-mint hover:bg-mint/20`}
                >
                    <span className="inline-block h-[6px] w-[6px] rounded-full bg-mint shadow-[0_0_6px_rgba(0,255,132,.8)]"></span>
                    {shortAddress(wallet.address as string)}
                    <i
                        className={`fa-solid fa-chevron-down text-[9px] transition duration-200 ${
                            menuOpen ? 'rotate-180' : ''
                        }`}
                    ></i>
                </button>
            )}

            {/* Connected wallet popover */}
            {connected && menuOpen ? (
                <div
                    role="menu"
                    className="wallet-menu absolute right-0 top-full z-[60] mt-[10px] w-[264px] rounded-[14px] border border-white/10 bg-[#101010] p-[12px] shadow-[0_16px_40px_rgba(0,0,0,.55)]"
                >
                    <p className="mb-[8px] text-[10px] font-semibold uppercase tracking-[.14em] text-[#777]">
                        Stellar Wallet
                    </p>

                    <div className="mb-[10px] rounded-[10px] border border-white/8 bg-white/[.04] p-[10px]">
                        <div className="flex items-center justify-between gap-[8px]">
                            <span className="min-w-0 flex-1 break-all text-[11.5px] leading-snug text-[#ddd]">
                                {wallet.address}
                            </span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                title="Copy address"
                                className="shrink-0 cursor-pointer border-none bg-transparent text-[#888] transition hover:text-white"
                            >
                                <i
                                    className={`fa-solid ${copied ? 'fa-check text-mint' : 'fa-copy'} text-[11px]`}
                                ></i>
                            </button>
                        </div>
                    </div>

                    <div className="mb-[10px] flex flex-col gap-[6px] text-[12px]">
                        <div className="flex items-center justify-between">
                            <span className="text-[#888]">Network</span>
                            <span className="font-semibold text-[#ddd]">Stellar Testnet</span>
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
                        href={explorerAccountUrl(wallet.address as string)}
                        target="_blank"
                        rel="noreferrer"
                        className="mb-[4px] flex items-center gap-[8px] rounded-[10px] px-[8px] py-[7px] text-[12.5px] text-[#ddd] transition hover:bg-white/6 hover:text-white"
                    >
                        <i className="fa-solid fa-arrow-up-right-from-square w-[14px] text-center text-[11px] text-accent"></i>
                        View on Stellar Expert
                    </a>

                    <button
                        type="button"
                        onClick={() => {
                            setMenuOpen(false);
                            wallet.disconnect();
                        }}
                        className="flex w-full cursor-pointer items-center gap-[8px] rounded-[10px] border-none bg-transparent px-[8px] py-[7px] text-left text-[12.5px] text-[#ff7a94] transition hover:bg-[rgba(255,45,85,.1)]"
                    >
                        <i className="fa-solid fa-right-from-bracket w-[14px] text-center text-[11px]"></i>
                        Disconnect Wallet
                    </button>
                </div>
            ) : null}
        </div>
    );
}