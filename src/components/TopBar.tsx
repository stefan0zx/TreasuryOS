import React from "react";
import { Search, Bell, Bot } from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";
import { WalletBalanceDropdown } from "./WalletBalanceDropdown";

interface TopBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({ searchQuery, setSearchQuery }) => {
  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);

  return (
    <header className="h-[68px] bg-white border-b border-[var(--border)] px-8 flex items-center justify-between fixed top-0 right-0 left-[260px] z-20">
      {/* Search Bar */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals, protocols, policies, TXs..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-full pl-11 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] focus:bg-white transition-all shadow-xs"
          />
        </div>
      </div>

      {/* Right Action Area */}
      <div className="flex items-center gap-3">
        {/* Live Network Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-[var(--accent-soft)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--accent-dark)] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
          <span>Live on Solana {capitalizedCluster}</span>
        </div>

        {/* Agent Active Pill */}
        <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-[var(--bg-card)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--text-secondary)] shadow-xs">
          <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span>Agent Active</span>
        </div>

        {/* Notification Bell */}
        <button className="w-10 h-10 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)] transition-colors relative shadow-xs">
          <Bell className="w-4 h-4" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--accent)]"></span>
        </button>

        {/* Wallet Connection */}
        <WalletBalanceDropdown />
      </div>
    </header>
  );
};
