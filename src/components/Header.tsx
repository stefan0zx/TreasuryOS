import React from "react";
import { Search, Bell, Bot, Menu, Sparkles } from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";
import { WalletBalanceDropdown } from "./WalletBalanceDropdown";
import { useExecution } from "../context/ExecutionContext";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  currentTab: string;
  setMobileOpen: (open: boolean) => void;
}

const TAB_TITLES: Record<string, { title: string; subtitle: string }> = {
  overview: { title: "Overview", subtitle: "Your treasury at a glance across Solana Devnet." },
  opportunities: { title: "Opportunities", subtitle: "Live Solana yield pools evaluated against risk policies." },
  policies: { title: "Policies", subtitle: "Rules your autonomous treasury agent must strictly follow." },
  agent: { title: "Agent Engine", subtitle: "Real-time telemetry and probabilistic reasoning chains." },
  transactions: { title: "Transactions", subtitle: "Log of automated agent rebalancing actions and yields." },
  "decision-history": { title: "Decision History", subtitle: "Chronological record of autonomous governance decisions." }
};

export const Header: React.FC<HeaderProps> = ({ searchQuery, setSearchQuery, currentTab, setMobileOpen }) => {
  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);
  const { execution } = useExecution();

  const tabMeta = TAB_TITLES[currentTab] || TAB_TITLES.overview;

  return (
    <header className="h-[72px] grid grid-cols-1 md:grid-cols-12 gap-3 items-center z-20">
      {/* TILE 1: Title + Search (Span 7 or 6) */}
      <div className="md:col-span-6 lg:col-span-7 h-full bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] px-5 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-between gap-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden w-10 h-10 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] shrink-0 shadow-xs cursor-pointer"
            title="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h2 className="font-bold text-[var(--text-primary)] text-[18px] tracking-tight truncate leading-tight">
              {tabMeta.title}
            </h2>
            <p className="text-[12px] text-[var(--text-secondary)] truncate hidden sm:block">
              {tabMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="hidden sm:flex items-center relative w-56 lg:w-72 shrink-0">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search proposals, protocols..."
            className="w-full bg-[var(--tile-raised)] border border-[var(--border)] rounded-full pl-10 pr-12 h-[40px] text-xs font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent)] shadow-xs transition-all"
          />
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[var(--text-muted)] bg-[var(--bg-canvas)] px-1.5 py-0.5 rounded border border-[var(--border)]">
            ⌘K
          </span>
        </div>
      </div>

      {/* TILE 2: Status Pills (Span 2 or 3) */}
      <div className="hidden lg:flex md:col-span-3 h-full bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] px-4 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] items-center justify-center gap-2.5">
        <div className="inline-flex items-center gap-1.5 px-3 h-[40px] bg-[var(--tile-raised)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--accent-dark)] shadow-xs whitespace-nowrap">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
          <span>Solana {capitalizedCluster}</span>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 h-[40px] bg-[var(--tile-raised)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--text-secondary)] shadow-xs whitespace-nowrap">
          <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
          <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
          <span>Agent Active</span>
        </div>
      </div>

      {/* TILE 3: Account (Span 3 or 4) */}
      <div className="md:col-span-6 lg:col-span-2 h-full bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] px-4 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-end gap-3">
        <button 
          className="w-10 h-10 rounded-full bg-[var(--tile-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative shadow-xs shrink-0 cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          {execution && <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[var(--accent)]"></span>}
        </button>

        <WalletBalanceDropdown />
      </div>
    </header>
  );
};
