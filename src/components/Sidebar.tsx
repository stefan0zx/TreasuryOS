import React, { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Compass, 
  ShieldCheck, 
  Bot, 
  ArrowLeftRight, 
  History, 
  Settings, 
  HelpCircle, 
  Shield, 
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { SOLANA_CLUSTER, getRpcHostLabel, connection } from "../lib/solana";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { useExecution } from "../context/ExecutionContext";
import { useAllocation } from "../context/AllocationContext";
import { computeTreasuryMetrics } from "../lib/treasuryMetrics";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
  mobileOpen?: boolean;
  setMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  setCurrentTab, 
  collapsed, 
  toggleCollapsed,
  mobileOpen = false,
  setMobileOpen 
}) => {
  const { connected, publicKey } = useWallet();
  const { balance } = useWalletBalance(publicKey);
  const { execution } = useExecution();
  const { allocation } = useAllocation();
  const [currentSlot, setCurrentSlot] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const metrics = computeTreasuryMetrics(balance, execution, publicKey ? publicKey.toBase58() : null, [], "30D");

  useEffect(() => {
    let mounted = true;
    const fetchSlot = async () => {
      try {
        const slot = await connection.getSlot();
        if (mounted) setCurrentSlot(slot);
      } catch (err) {
        console.error("Failed to fetch slot:", err);
      }
    };
    fetchSlot();
    const interval = setInterval(fetchSlot, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "opportunities", label: "Opportunities", icon: Compass },
    { id: "policies", label: "Policies", icon: ShieldCheck },
    { id: "agent", label: "Agent", icon: Bot },
    { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    { id: "decision-history", label: "Decision History", icon: History },
  ];

  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);
  const rpcHost = getRpcHostLabel();

  const hasPendingProposal = connected && !execution && allocation && allocation.allocations?.length > 0;

  const handleCopyAddress = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const walletStr = publicKey ? publicKey.toBase58() : "";
  const shortenedAddress = walletStr ? `${walletStr.slice(0, 4)}...${walletStr.slice(-4)}` : "FMio...BS1h";

  // Reserve vs deployed split for progress bar
  const reservePct = execution ? execution.proposal.reservePercent : (allocation ? allocation.liquidReservePercent : 100);
  const deployedPct = 100 - reservePct;
  const isExecuted = !!execution;

  const sidebarContent = (
    <div className={`h-full flex flex-col gap-2 select-none transition-all duration-200 ${collapsed ? "w-[88px]" : "w-[280px]"}`}>
      {/* TILE A: Brand */}
      <div className="bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] p-5 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] relative flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-[44px] h-[44px] rounded-[14px] bg-[var(--ink)] text-white flex items-center justify-center shrink-0 shadow-sm">
              <Shield className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-[var(--text-primary)] text-[18px] tracking-tight leading-none mb-1">
                  TreasuryOS
                </h1>
                <p className="text-[13px] text-[var(--text-secondary)] whitespace-nowrap overflow-hidden text-ellipsis">
                  Treasury Intelligence
                </p>
              </div>
            )}
          </div>
          <button
            onClick={toggleCollapsed}
            className="w-7 h-7 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shadow-xs transition-colors cursor-pointer shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-4 pt-3 border-t border-[var(--tile-border)] flex items-center justify-center">
            <div className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-[var(--tile-raised)] border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--text-primary)] shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
              <span>Devnet · live</span>
            </div>
          </div>
        )}
      </div>

      {/* TILE B: Navigation */}
      <div className="flex-1 min-height-0 overflow-y-auto bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] p-4 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] flex flex-col">
        {!collapsed && (
          <div className="px-3 pb-3 font-mono uppercase text-[11px] font-medium tracking-[0.28em] text-[var(--text-muted)]">
            Menu
          </div>
        )}
        <nav aria-label="Primary" className="space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            const showBadge = item.id === "overview" && hasPendingProposal;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentTab(item.id);
                  if (setMobileOpen) setMobileOpen(false);
                }}
                aria-current={isActive ? "page" : undefined}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center justify-between h-[48px] rounded-[var(--radius-item)] px-3.5 text-[15px] font-medium transition-all group cursor-pointer relative ${
                  isActive
                    ? "bg-[var(--tile-raised)] text-[var(--text-primary)] font-semibold shadow-xs border border-[var(--tile-border)]"
                    : "text-[var(--text-secondary)] hover:bg-white/60 hover:text-[var(--text-primary)]"
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {isActive ? (
                    <div className="w-[32px] h-[32px] rounded-[12px] bg-[var(--accent)] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <div className="w-[32px] h-[32px] rounded-[12px] flex items-center justify-center shrink-0 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]">
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && showBadge && (
                  <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold font-mono flex items-center justify-center shrink-0">
                    1
                  </span>
                )}
                {collapsed && showBadge && (
                  <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[var(--accent)] ring-2 ring-white"></span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* TILE C: Active Treasury Mini-Card */}
      {!collapsed && (
        <div className="bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] p-4 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono uppercase text-[10px] font-medium tracking-[0.2em] text-[var(--text-secondary)]">Active Treasury</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--accent-soft)] text-[var(--accent-dark)]">
              ● Devnet
            </span>
          </div>

          {connected ? (
            <div className="space-y-1.5">
              <div className="text-[24px] font-bold text-[var(--text-primary)] font-mono tracking-tight leading-none">
                {balance !== null ? `${metrics.totalValue.toFixed(4)} SOL` : "Loading..."}
              </div>
              <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-mono">
                <span>{shortenedAddress}</span>
                <button
                  onClick={handleCopyAddress}
                  className="p-1 hover:text-[var(--text-primary)] rounded transition-colors cursor-pointer"
                  title="Copy address"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                </button>
              </div>

              {/* Mini progress bar if execution active and confirmed */}
              {isExecuted && (
                <div className="pt-2">
                  <div className="flex justify-between text-[10px] font-mono text-[var(--text-muted)] mb-1">
                    <span>Reserve {reservePct}%</span>
                    <span>Deployed {deployedPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--border)] rounded-full overflow-hidden flex">
                    <div style={{ width: `${reservePct}%` }} className="bg-[var(--text-muted)] h-full"></div>
                    <div style={{ width: `${deployedPct}%` }} className="bg-[var(--accent)] h-full"></div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-[var(--text-secondary)] italic py-1">
              Connect wallet to view real DAO balance
            </div>
          )}
        </div>
      )}

      {/* TILE D: Footer */}
      <div className="bg-[var(--tile)] border border-[var(--tile-border)] rounded-[var(--radius-shell)] p-4 shadow-[var(--shadow-tile),inset_0_1px_0_rgba(255,255,255,0.8)] space-y-2.5">
        {!collapsed && (
          <div className="space-y-0.5">
            <button 
              onClick={() => {
                setCurrentTab("policies");
                if (setMobileOpen) setMobileOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-[var(--radius-item)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--tile-raised)] transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 text-[var(--text-muted)]" />
              <span>Settings</span>
            </button>
            <a 
              href={`https://explorer.solana.com/?cluster=${SOLANA_CLUSTER}`} 
              target="_blank" 
              rel="noreferrer"
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-item)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--tile-raised)] transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <HelpCircle className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Help & Support</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            </a>
          </div>
        )}

        {/* Dark Status Card */}
        <div className={`rounded-[var(--radius-item)] bg-[var(--ink)] text-white text-xs shadow-sm ${collapsed ? "p-3 text-center" : "p-3.5 space-y-1.5"}`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-slate-200 flex items-center gap-1.5 text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {!collapsed && `Solana ${capitalizedCluster}`}
            </span>
            {!collapsed && (
              <span className="text-[10px] font-mono text-slate-400">
                Slot {currentSlot > 0 ? currentSlot.toLocaleString() : "..."}
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="text-[10px] text-slate-400 truncate font-mono" title={rpcHost}>
              {rpcHost}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block sticky top-4 h-[calc(100vh-32px)]">
        {sidebarContent}
      </aside>

      {/* Mobile / Tablet Slide-over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-[rgba(11,11,11,0.45)] backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen && setMobileOpen(false)}
          />
          <div className="relative w-[280px] bg-[var(--bg-canvas)] p-4 h-full shadow-2xl z-10 overflow-y-auto">
            <div className="flex justify-end mb-2">
              <button 
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className="w-8 h-8 rounded-full bg-white border border-[var(--border)] flex items-center justify-center text-[var(--text-primary)] font-bold"
              >
                ✕
              </button>
            </div>
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
