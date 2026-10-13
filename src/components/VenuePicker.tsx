import React, { useState, useEffect } from "react";
import { useOpportunities, OpportunityPool } from "../context/OpportunitiesProvider";
import { useAllocation } from "../context/AllocationContext";
import { SectionLabel } from "./SectionLabel";
import { ProtocolLogo } from "./ProtocolLogo";
import { 
  ExternalLink, 
  Info, 
  Check, 
  ChevronDown, 
  ChevronUp
} from "lucide-react";

interface VenuePickerProps {
  selectedPoolId: string;
  onSelectPool: (poolId: string) => void;
}

const PROTOCOL_COLORS: Record<string, string> = {
  "Kamino Finance": "bg-indigo-600 text-white",
  "SAVE": "bg-blue-600 text-white",
  "marginfi": "bg-purple-600 text-white",
  "Drift Protocol": "bg-emerald-600 text-white",
  "Jito": "bg-amber-600 text-white",
  "Marinade": "bg-teal-600 text-white",
  "Sanctum": "bg-cyan-600 text-white",
  "Jupiter": "bg-orange-600 text-white",
  "Meteora": "bg-pink-600 text-white",
  "Orca": "bg-sky-600 text-white",
  "Raydium": "bg-violet-600 text-white",
  "Lulo": "bg-rose-600 text-white"
};

function getProtocolColor(label: string): string {
  if (PROTOCOL_COLORS[label]) return PROTOCOL_COLORS[label];
  const colors = [
    "bg-[var(--accent)] text-white",
    "bg-indigo-600 text-white",
    "bg-purple-600 text-white",
    "bg-emerald-600 text-white",
    "bg-teal-600 text-white"
  ];
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const VenuePicker: React.FC<VenuePickerProps> = ({ selectedPoolId, onSelectPool }) => {
  const { opportunities, isLoading } = useOpportunities() as any;
  const { allocation } = useAllocation() as any;

  const [showAll, setShowAll] = useState<boolean>(false);

  const compatiblePools = opportunities.filter((o: OpportunityPool) => o.compatible);
  const sortedCompatible = [...compatiblePools].sort((a: OpportunityPool, b: OpportunityPool) => {
    if (a.aiScore !== undefined && b.aiScore !== undefined) {
      return b.aiScore - a.aiScore;
    }
    const mult: Record<string, number> = { Low: 1.0, Medium: 0.8, High: 0.5 };
    const scoreA = a.apy * (mult[a.riskTier] || 0.5);
    const scoreB = b.apy * (mult[b.riskTier] || 0.5);
    return scoreB - scoreA;
  });

  const top5Compatible = sortedCompatible.slice(0, 5);

  useEffect(() => {
    if (opportunities.length === 0) return;

    const isCurrentValid = opportunities.some((o: OpportunityPool) => o.id === selectedPoolId && o.compatible);
    if (isCurrentValid) return;

    const nonReserve = allocation?.allocations || [];
    if (nonReserve.length > 0) {
      const largest = [...nonReserve].sort((a: any, b: any) => b.percent - a.percent)[0];
      const match = opportunities.find((o: OpportunityPool) => o.id === largest.opportunityId && o.compatible);
      if (match) {
        onSelectPool(match.id);
        return;
      }
    }

    if (top5Compatible.length > 0) {
      onSelectPool(top5Compatible[0].id);
    } else if (opportunities.length > 0) {
      onSelectPool(opportunities[0].id);
    }
  }, [opportunities, allocation, selectedPoolId, onSelectPool, top5Compatible]);

  const selectedPool = opportunities.find((o: OpportunityPool) => o.id === selectedPoolId) || top5Compatible[0] || opportunities[0];

  const tvlFormatted = selectedPool 
    ? (selectedPool.tvlUsd >= 1_000_000 ? `$${(selectedPool.tvlUsd / 1_000_000).toFixed(1)}M` : `$${selectedPool.tvlUsd.toLocaleString()}`)
    : "$0M";

  const venueList = showAll ? opportunities : top5Compatible;

  return (
    <div className="md:col-span-7 bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] shadow-[var(--shadow-soft)] p-8 flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SectionLabel>Where Your SOL Earns</SectionLabel>
            <div className="group relative cursor-pointer">
              <Info className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
                Live Solana pool yields from DeFiLlama that fit your treasury policy. Preview only. Nothing is deployed from this screen.
              </div>
            </div>
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-medium">Live market</span>
        </div>

        {/* Hero APY Number */}
        <div className="mb-6 flex items-baseline gap-2 transition-all duration-200">
          <span className="text-[56px] font-bold text-[var(--accent-dark)] font-mono tracking-tight leading-none">
            {selectedPool ? `+${selectedPool.apy.toFixed(1)}%` : "0.0%"}
          </span>
          <span className="text-base font-bold text-[var(--text-secondary)] uppercase">APY</span>
        </div>

        {/* Chips Row */}
        {selectedPool && (
          <div className="flex items-center gap-2 flex-wrap mb-8">
            <span className="px-3 py-1 rounded-full text-xs font-bold border border-[var(--border)] bg-white text-[var(--text-primary)] shadow-xs">
              {selectedPool.riskTier} Risk
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[var(--text-secondary)] border border-[var(--border)] shadow-xs">
              {tvlFormatted} TVL
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white text-[var(--text-secondary)] border border-[var(--border)] shadow-xs">
              Base {selectedPool.apyBase?.toFixed(1) || "0.0"}% {selectedPool.apyReward > 0 ? `+ rewards ${selectedPool.apyReward.toFixed(1)}%` : ""}
            </span>
            <a 
              href={selectedPool.url} 
              target="_blank" 
              rel="noreferrer"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent-dark)] border border-[var(--border)] inline-flex items-center gap-1.5 hover:opacity-90 transition-opacity shadow-xs"
            >
              <ProtocolLogo project={selectedPool.protocol} logoUrl={selectedPool.logoUrl} label={selectedPool.protocolLabel} size={20} />
              <span>{selectedPool.protocolLabel}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Sub-heading */}
        <div className="text-sm font-semibold text-[var(--text-primary)] mb-3">Choose a venue</div>

        {/* Venue List */}
        <div className="rounded-[16px] border border-[var(--border)] bg-white overflow-hidden shadow-xs" role="radiogroup" aria-label="Choose a venue">
          {isLoading && opportunities.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)] animate-pulse">Loading verified venues...</div>
          ) : venueList.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--text-secondary)]">No compatible venues available under current policy.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {venueList.map((pool: OpportunityPool) => {
                const isSelected = pool.id === selectedPoolId;
                const poolTvl = pool.tvlUsd >= 1_000_000 ? `$${(pool.tvlUsd / 1_000_000).toFixed(1)}M` : `$${pool.tvlUsd.toLocaleString()}`;

                return (
                  <div
                    key={pool.id}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onClick={() => pool.compatible && onSelectPool(pool.id)}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && pool.compatible) {
                        onSelectPool(pool.id);
                      }
                    }}
                    className={`flex items-center justify-between p-4 transition-colors cursor-pointer ${
                      isSelected ? "bg-[var(--accent-soft)]/40" : pool.compatible ? "hover:bg-[var(--bg-card)]" : "opacity-50 cursor-not-allowed bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <ProtocolLogo project={pool.protocol} logoUrl={pool.logoUrl} label={pool.protocolLabel} size={44} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-[var(--text-primary)] text-base">{pool.protocolLabel}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)]">Live market</span>
                          {!pool.compatible && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--negative-soft)] text-[var(--negative)]" title={pool.rejectionReasons?.join(", ") || "Policy rejected"}>
                              Rejected
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">
                          {pool.symbol} · {poolTvl} TVL
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold font-mono text-[var(--accent-dark)]">+{pool.apy.toFixed(1)}%</div>
                        <div className="text-[10px] text-[var(--text-secondary)] uppercase">APY</div>
                      </div>

                      <div className={`w-6 h-6 rounded-full flex items-center justify-center border transition-all ${
                        isSelected ? "bg-[var(--accent)] border-[var(--accent)] text-white shadow-xs" : "border-[var(--border)] bg-white"
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Show all pools toggle */}
        <div className="mt-3 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-[var(--accent-dark)] hover:underline inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{showAll ? "Show top compatible pools only" : `Show all pools (${opportunities.length})`}</span>
            {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Footer link & muted note */}
      <div className="mt-6 pt-4 border-t border-[var(--border)] space-y-2">
        <div className="flex items-center justify-between">
          {selectedPool?.defillamaUrl ? (
            <a 
              href={selectedPool.defillamaUrl} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs font-semibold text-[var(--accent-dark)] hover:underline inline-flex items-center gap-1"
            >
              <span>View pool on DeFiLlama</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span></span>
          )}
          <span className="text-[11px] text-[var(--text-muted)] italic">Live market data. Preview only.</span>
        </div>
        <div className="text-[11px] text-[var(--text-muted)]">
          Devnet cannot execute these positions.
        </div>
      </div>
    </div>
  );
};
