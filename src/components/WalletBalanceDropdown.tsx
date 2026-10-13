import React, { useState, useRef, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { SOLANA_CLUSTER } from "../lib/solana";
import { Wallet, RefreshCw, ChevronDown, LogOut } from "lucide-react";

export const WalletBalanceDropdown: React.FC = () => {
  const { connected, publicKey, disconnect } = useWallet();
  const { balance, isLoading, lastUpdated, refetch } = useWalletBalance(publicKey);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  if (!connected) {
    return (
      <div className="custom-wallet-btn-wrapper">
        <WalletMultiButton className="!bg-[var(--ink)] !text-white !border !border-[var(--border)] !rounded-full !px-5 !py-2 !h-[42px] !text-sm !font-semibold !shadow-sm hover:!bg-[#222] transition-all" />
      </div>
    );
  }

  const formattedTime = lastUpdated 
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : "Just now";

  const initials = publicKey ? publicKey.toBase58().slice(0, 2).toUpperCase() : "AR";

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white border border-[var(--border)] rounded-full text-sm font-semibold text-[var(--text-primary)] shadow-xs hover:bg-[var(--bg-card)] transition-all h-[42px]"
      >
        <div className="w-7 h-7 rounded-full bg-[var(--accent-soft)] text-[var(--accent-dark)] flex items-center justify-center text-xs font-bold font-mono">
          {initials}
        </div>
        <span className="font-mono text-sm">
          {balance !== null ? `${balance.toFixed(4)} SOL` : "Loading..."}
        </span>
        <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-[var(--border)] rounded-[24px] shadow-xl p-5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <span className="font-mono uppercase text-[10px] font-medium tracking-[0.2em] text-[var(--text-muted)]">
              Wallet Balance
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent-soft)] text-[var(--accent-dark)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse"></span>
              {capitalizedCluster}
            </span>
          </div>

          <div className="py-4">
            <div className="text-3xl font-bold font-mono text-[var(--text-primary)] tracking-tight">
              {isLoading && balance === null ? (
                <span className="text-[var(--text-muted)] text-lg font-normal">Fetching balance...</span>
              ) : balance !== null ? (
                `${balance.toFixed(4)} SOL`
              ) : (
                "0.0000 SOL"
              )}
            </div>
            <div className="text-xs text-[var(--text-secondary)] font-mono mt-1 truncate" title={publicKey?.toBase58()}>
              {publicKey?.toBase58()}
            </div>
          </div>

          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <div className="flex items-center gap-1.5">
              <span>Last updated {formattedTime}</span>
              <button 
                onClick={() => refetch()} 
                disabled={isLoading}
                className="p-1 hover:text-[var(--text-primary)] rounded transition-colors"
                title="Refresh balance"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-[var(--accent)]" : ""}`} />
              </button>
            </div>
            <button
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="flex items-center gap-1 text-[var(--negative)] hover:opacity-80 font-medium"
            >
              <LogOut className="w-3 h-3" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
