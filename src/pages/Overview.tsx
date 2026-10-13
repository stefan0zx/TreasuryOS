import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { useAllocation } from "../context/AllocationContext";
import { useExecution } from "../context/ExecutionContext";
import { ProposedAllocationCard } from "../components/ProposedAllocationCard";
import { ActiveAllocationCard } from "../components/ActiveAllocationCard";
import { TreasuryValueCard } from "../components/TreasuryValueCard";
import { SectionLabel } from "../components/SectionLabel";
import { ProtocolLogo } from "../components/ProtocolLogo";
import { 
  Sparkles, 
  CheckCircle2, 
  Bot, 
  Lock, 
  Wallet, 
  ArrowUpRight, 
  ExternalLink,
  ShieldCheck,
  Compass
} from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";
import { computeTreasuryMetrics } from "../lib/treasuryMetrics";

interface OverviewProps {
  setCurrentTab?: (tab: string) => void;
}

export const Overview: React.FC<OverviewProps> = ({ setCurrentTab }) => {
  const { connected, publicKey } = useWallet();
  const { balance } = useWalletBalance(publicKey);
  const { allocation } = useAllocation();
  const { execution } = useExecution();

  const [timeframe, setTimeframe] = useState<string>("30D");

  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);
  const walletAddr = publicKey ? publicKey.toBase58() : null;
  const metrics = computeTreasuryMetrics(balance, execution, walletAddr, [], timeframe);

  const balanceSol = metrics.totalValue;
  const nonReserveAllocations = execution ? execution.proposal.allocations : (allocation?.allocations || []);
  const liquidReservePct = execution ? execution.proposal.reservePercent : (allocation ? allocation.liquidReservePercent : 100);
  const deployedSol = metrics.deployedSol;
  const reserveSol = metrics.liquidSol;
  const blendedApy = metrics.blendedApy || (allocation ? (nonReserveAllocations.reduce((acc: number, item: any) => acc + (item.percent / 100) * 5.3, 0)) : 0);
  const estimatedYield = metrics.accruedYieldValue || (balanceSol * (blendedApy / 100));

  const scrollToProposal = () => {
    const el = document.getElementById("proposed-allocation-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const goToOpportunities = () => {
    if (setCurrentTab) setCurrentTab("opportunities");
  };

  return (
    <div className="space-y-8">
      {/* Page Header / Metadata */}
      <div>
        <SectionLabel>Portfolio Monitor · Post-Execution Telemetry</SectionLabel>
        <h1 className="text-[36px] font-bold text-[var(--text-primary)] tracking-tight mt-1 mb-1">
          Overview
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Your treasury at a glance across Solana Devnet liquidity pools and reserve accounts.
        </p>
      </div>

      {/* Hero Cosmic Vault Card */}
      <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-r from-[var(--hero-from)] via-[var(--hero-via)] to-[var(--hero-to)] p-10 text-white shadow-[0_10px_30px_rgba(0,0,0,0.25)] border border-white/10">
        {/* Soft celestial starfield / glowing orbs background */}
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-[var(--accent)] opacity-25 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-20 w-80 h-80 rounded-full bg-teal-800 opacity-20 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col justify-between h-full space-y-8">
          {/* Top row of hero */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono uppercase text-[11px] font-medium tracking-[0.28em] text-white/60">
                Total Treasury
              </span>
              <span className="text-xs text-white/60 font-mono">
                {publicKey ? `· ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "· Vault Ready"}
              </span>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-white border border-white/10">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse"></span>
              <span>Devnet · live</span>
            </div>
          </div>

          {/* Big number */}
          <div>
            <div className="text-[72px] font-bold font-mono tracking-tight leading-none mb-3">
              {connected && balance !== null ? `${balance.toFixed(4)} SOL` : "0.0000 SOL"}
            </div>
            <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
              {execution ? (
                <>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-mono font-semibold">+{estimatedYield.toFixed(4)} SOL est. yield</span>
                  <span>· {blendedApy.toFixed(2)}% a year blended run-rate</span>
                </>
              ) : (
                <span className="text-white/60 italic">Not deployed · holding in liquid reserve</span>
              )}
            </div>
          </div>

          {/* Bottom actions row */}
          <div className="flex items-center gap-3 pt-2">
            {!execution ? (
              <>
                <button 
                  onClick={scrollToProposal}
                  className="h-[44px] px-6 bg-white text-[var(--ink)] rounded-full font-semibold text-sm hover:bg-slate-100 transition-all shadow-sm cursor-pointer flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-[var(--accent)]" />
                  <span>Review proposal</span>
                </button>
                <button 
                  onClick={goToOpportunities}
                  className="h-[44px] px-6 bg-transparent text-white rounded-full font-semibold text-sm border border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                >
                  View opportunities
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={scrollToProposal}
                  className="h-[44px] px-6 bg-white text-[var(--ink)] rounded-full font-semibold text-sm hover:bg-slate-100 transition-all shadow-sm cursor-pointer"
                >
                  View allocation
                </button>
                <button 
                  onClick={goToOpportunities}
                  className="h-[44px] px-6 bg-transparent text-white rounded-full font-semibold text-sm border border-white/20 hover:bg-white/10 transition-all cursor-pointer"
                >
                  Explore yields
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Two-Column Middle Cards (In Vault / Liquid Reserve) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* In Vault / Deployed */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 flex flex-col justify-between shadow-[var(--shadow-soft)]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>In Vault</SectionLabel>
              <div className="w-9 h-9 rounded-full bg-[var(--ink)] text-white flex items-center justify-center">
                <Lock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[40px] font-bold font-mono text-[var(--text-primary)] tracking-tight mb-2">
              {deployedSol.toFixed(4)} <span className="text-2xl font-normal text-[var(--text-secondary)]">SOL</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              {execution ? "Allocated to 2 protocols earning automated yield." : "Currently productive reserves awaiting execution."}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>{nonReserveAllocations.map((a: any) => a.protocol || a.label).join(" + ") || "No active protocols"}</span>
            <span className="font-mono font-bold text-[var(--accent-dark)]">{(100 - liquidReservePct).toFixed(1)}% Deployed</span>
          </div>
        </div>

        {/* Liquid Reserve */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 flex flex-col justify-between shadow-[var(--shadow-soft)]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <SectionLabel>Liquid Reserve</SectionLabel>
              <div className="w-9 h-9 rounded-full bg-[var(--ink)] text-white flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-[40px] font-bold font-mono text-[var(--text-primary)] tracking-tight mb-2">
              {reserveSol.toFixed(4)} <span className="text-2xl font-normal text-[var(--text-secondary)]">SOL</span>
            </div>
            <p className="text-xs text-[var(--text-secondary)]">
              Liquid reserve kept in treasury wallet for immediate operational runway.
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Cold Treasury Keypair</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">{liquidReservePct.toFixed(1)}% Reserve</span>
          </div>
        </div>
      </div>

      {/* Proposed / Active Allocation Card */}
      <div id="proposed-allocation-card">
        {execution ? <ActiveAllocationCard /> : <ProposedAllocationCard />}
      </div>

      {/* Treasury Value Chart Card */}
      <TreasuryValueCard timeframe={timeframe} setTimeframe={setTimeframe} />

      {/* Bottom 2-Column Row: Portfolio Breakdown & Treasury Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Portfolio Breakdown */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 shadow-[var(--shadow-soft)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <SectionLabel>Portfolio Breakdown</SectionLabel>
              <span className="text-xs text-[var(--text-secondary)] font-mono">{execution ? "Active" : "Proposed"}</span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-[14px] bg-[var(--bg-card-raised)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 rounded-full bg-[var(--accent)]"></div>
                  <div>
                    <div className="text-sm font-semibold text-[var(--text-primary)]">Liquid SOL (Reserve)</div>
                    <div className="text-xs text-[var(--text-secondary)]">Unallocated Floor</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[var(--text-primary)] font-mono">
                    {connected && balance !== null ? `${reserveSol.toFixed(4)} SOL` : "—"}
                  </div>
                  <div className="text-xs text-[var(--text-secondary)]">{liquidReservePct.toFixed(1)}%</div>
                </div>
              </div>

              {nonReserveAllocations.map((item: any, idx: number) => {
                const solAmt = balanceSol > 0 ? (balanceSol * item.percent) / 100 : (item.amountSol || 0);
                return (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-[14px] bg-[var(--bg-card-raised)] border border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <ProtocolLogo project={item.protocol} logoUrl={item.logoUrl} label={item.protocol || item.label} size={24} />
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">{item.protocol || item.label}</div>
                        <div className="text-xs text-[var(--text-secondary)]">{item.percent}% allocation</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[var(--text-primary)] font-mono">{solAmt.toFixed(4)} SOL</div>
                      <div className="text-xs text-[var(--accent-dark)] font-semibold">+{item.apyAtExecution || item.apy || 5.3}% APY</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Devnet Security Guardrails</span>
            <span className="font-semibold text-[var(--accent-dark)]">Active</span>
          </div>
        </div>

        {/* Treasury Health */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[24px] p-8 shadow-[var(--shadow-soft)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <SectionLabel>Treasury Health</SectionLabel>
              <span className="inline-flex items-center gap-1 text-xs text-[var(--accent-dark)] bg-[var(--accent-soft)] px-2.5 py-0.5 rounded-full font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Optimal
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-[14px] bg-[var(--bg-card-raised)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Liquidity Ratio</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Meets &gt;15% mandate</div>
                </div>
                <span className="text-sm font-bold text-[var(--text-primary)] font-mono">{liquidReservePct.toFixed(1)}%</span>
              </div>

              <div className="p-4 rounded-[14px] bg-[var(--bg-card-raised)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Blended APY</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Across active positions</div>
                </div>
                <span className="text-sm font-bold text-[var(--accent-dark)] font-mono">{blendedApy.toFixed(2)}%</span>
              </div>

              <div className="p-4 rounded-[14px] bg-[var(--bg-card-raised)] border border-[var(--border)] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[var(--text-primary)]">Max Risk Tier</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">Institutional grade</div>
                </div>
                <span className="text-xs font-bold text-[var(--accent-dark)] bg-[var(--accent-soft)] px-2.5 py-1 rounded-full">Tier 2</span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs text-[var(--text-secondary)]">
            <span>Program Safety Guardrails</span>
            <span className="font-semibold text-[var(--accent-dark)]">Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
};
