import React from "react";
import { useExecution } from "../context/ExecutionContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { ProtocolLogo } from "./ProtocolLogo";
import { 
  ShieldCheck, 
  CheckCircle2, 
  ExternalLink, 
  RefreshCw, 
  Wallet,
  Clock,
  TrendingUp,
  Sparkles
} from "lucide-react";

export const ActiveAllocationCardContent: React.FC = () => {
  const { execution, clearExecution } = useExecution();

  if (!execution) return null;

  const { proposal, createdAt, mode, signatures } = execution;
  const allocations = proposal.allocations || [];
  const signature = signatures[0] || "";

  const formattedDate = new Date(createdAt).toLocaleString([], { 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });

  const totalAnnualGain = allocations.reduce((acc, item) => {
    return acc + item.amountSol * (item.apyAtExecution / 100);
  }, 0);

  return (
    <div className="md:col-span-8 bg-white rounded-[20px] border border-[#E6E9EF] shadow-sm relative overflow-hidden flex flex-col justify-between" style={{ padding: '32px' }} id="active-allocation-card">

      <div className="space-y-6">
        {/* Top Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Active Treasury Allocation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
              {execution.source === 'rules' ? 'Rules-based proposal' : execution.source === 'custom' ? 'Custom Allocation' : 'Agent proposal'}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Live on Devnet ({mode})
            </span>
            <span className="text-xs text-[#64748B] font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> {formattedDate}
            </span>
          </div>
        </div>

        {/* Headline */}
        <div>
          <h2 className="text-[30px] font-bold text-[#0F172A] font-mono tracking-tight leading-none mb-1.5">
            Deployed {proposal.deployedSol.toFixed(4)} of {proposal.balanceSolAtExecution.toFixed(4)} SOL
          </h2>
          <p className="text-xs text-[#64748B]">
            Active strategy managing {allocations.length} positions across Solana DeFi ({proposal.reservePercent}% liquid reserve).
          </p>
        </div>

        {/* Allocation Breakdown List */}
        <div className="space-y-3">
          {allocations.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ProtocolLogo project={item.protocol} logoUrl={item.logoUrl} label={item.protocol} size={24} />
                  <span className="text-xs font-bold text-[#0F172A]">{item.protocol}</span>
                  <span className="text-[11px] text-[#64748B]">({item.symbol})</span>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="text-[#2563EB] hover:text-[#1D4ED8]">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div className="text-[11px] text-[#64748B] pl-8">
                  {item.percent}% allocation ({item.amountSol.toFixed(4)} SOL)
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-mono text-emerald-600">+{item.apyAtExecution.toFixed(2)}% APY</div>
                <div className="text-[10px] text-[#64748B]">Est. +{(item.amountSol * (item.apyAtExecution / 100)).toFixed(4)} SOL/yr</div>
              </div>
            </div>
          ))}

          {proposal.reservePercent > 0 && (
            <div className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#94A3B8]"></span>
                  <span className="text-xs font-bold text-[#0F172A]">Liquid Reserve</span>
                  <span className="text-[11px] text-[#64748B]">(Unallocated Buffer)</span>
                </div>
                <div className="text-[11px] text-[#64748B] pl-4">
                  {proposal.reservePercent}% reserve ({proposal.reserveSol.toFixed(4)} SOL)
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold font-mono text-[#64748B]">0.00% APY</div>
                <div className="text-[10px] text-[#64748B]">Available for withdrawal</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between pt-2 border-t border-[#E6E9EF]">
          <div>
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Blended Strategy APY</div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-[#0F172A]">
                {proposal.blendedApy.toFixed(2)}%
              </span>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Active Yield</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Total Est. Annual Gain</div>
            <div className="text-2xl font-bold font-mono text-emerald-600">+{totalAnnualGain.toFixed(4)} SOL/yr</div>
            <div className="text-xs text-[#64748B] mt-0.5">Earning on Solana Devnet</div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-8 pt-6 border-t border-[#E6E9EF] flex items-center justify-between">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#0F172A]">
            Transaction Signature: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[11px]">{signature.slice(0, 16)}...</code>
          </div>
          {signature && (
            <a 
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`} 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
            >
              <span>View on Solana Explorer</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>

        <button
          onClick={clearExecution}
          className="px-5 py-2.5 rounded-full bg-white border border-[#E6E9EF] hover:bg-slate-50 text-sm font-semibold text-[#0F172A] shadow-sm transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4 text-[#2563EB]" />
          <span>Rebalance / Update Strategy</span>
        </button>
      </div>
    </div>
  );
};

export const ActiveAllocationCard: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Active Allocation Error">
      <ActiveAllocationCardContent />
    </ErrorBoundary>
  );
};
