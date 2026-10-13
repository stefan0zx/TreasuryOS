import React, { useState } from "react";
import { useOpportunities, OpportunityPool } from "../context/OpportunitiesProvider";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { VenuePicker } from "../components/VenuePicker";
import { GrowthProjection } from "../components/GrowthProjection";
import { SectionLabel } from "../components/SectionLabel";
import { ProtocolLogo } from "../components/ProtocolLogo";
import { 
  RefreshCw, 
  ExternalLink, 
  Sparkles, 
  Info,
  AlertCircle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";

export const OpportunitiesContent: React.FC = () => {
  const { opportunities, isLoading, error, fetchedAt, stale, assetFilterRelaxed, aiScoring, refresh } = useOpportunities() as any;

  const [filterTab, setFilterTab] = useState<string>("All");
  const [selectedProtocol, setSelectedProtocol] = useState<string>("All");
  const [selectedPoolId, setSelectedPoolId] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  const protocols: string[] = Array.from(new Set(opportunities.map((o: OpportunityPool) => o.protocolLabel)));

  const filteredOpportunities = opportunities.filter((o: OpportunityPool) => {
    if (filterTab === "Compatible" && !o.compatible) return false;
    if (filterTab === "Rejected" && o.compatible) return false;
    if (filterTab === "Low" && o.riskTier !== "Low") return false;
    if (filterTab === "Medium" && o.riskTier !== "Medium") return false;
    if (filterTab === "High" && o.riskTier !== "High") return false;

    if (selectedProtocol !== "All" && o.protocolLabel !== selectedProtocol) return false;

    return true;
  });

  const getRelativeTime = (isoString?: string) => {
    if (!isoString) return "";
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Updated Just now";
    if (diffMins === 1) return "Updated 1 min ago";
    if (diffMins < 60) return `Updated ${diffMins} mins ago`;
    return `Updated at ${new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <SectionLabel>Market Scanner · Active</SectionLabel>
        <h1 className="text-[36px] font-bold text-[var(--text-primary)] tracking-tight mt-1 mb-1">
          Opportunities
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Live Solana yield pools, evaluated continuously against your autonomous risk mandate.
        </p>
      </div>

      {/* Two-Column Section at Top: Venue Picker & Growth Projection */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <VenuePicker selectedPoolId={selectedPoolId} onSelectPool={setSelectedPoolId} />
        <GrowthProjection selectedPoolId={selectedPoolId} />
      </div>

      {/* Filter Chips & Protocol Selector */}
      <div className="bg-[var(--bg-card)] p-4 rounded-[20px] border border-[var(--border)] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          {["All", "Compatible", "Rejected", "Low", "Medium", "High"].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                filterTab === tab
                  ? "bg-[var(--ink)] text-white shadow-xs"
                  : "bg-white text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Protocol:</span>
          <select
            value={selectedProtocol}
            onChange={(e) => setSelectedProtocol(e.target.value)}
            className="bg-white border border-[var(--border)] rounded-full px-4 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-xs"
          >
            <option value="All">All Protocols ({opportunities.length})</option>
            {protocols.map((p: string) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[var(--border)] rounded-full text-xs font-semibold text-[var(--text-primary)] shadow-xs hover:bg-[var(--bg-card)] transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? "animate-spin text-[var(--accent)]" : ""}`} />
            <span>Refresh Pools</span>
          </button>
        </div>
      </div>

      {/* Opportunities Table / States */}
      <div className="bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] shadow-[var(--shadow-soft)] overflow-hidden">
        {isLoading && opportunities.length === 0 ? (
          <div className="p-16 text-center space-y-3 animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
            <div className="h-64 bg-slate-200 rounded w-full mt-6"></div>
            <p className="text-xs text-[var(--text-secondary)]">Fetching live Solana yield pools from DeFiLlama...</p>
          </div>
        ) : error && opportunities.length === 0 ? (
          <div className="p-12 text-center space-y-3 bg-[var(--negative-soft)]">
            <AlertCircle className="w-8 h-8 text-[var(--negative)] mx-auto" />
            <p className="text-sm font-medium text-[var(--negative)]">Failed to load opportunities</p>
            <p className="text-xs text-[var(--text-secondary)]">{error}</p>
            <button
              onClick={() => handleRefresh()}
              className="px-4 py-2 bg-[var(--negative)] text-white rounded-full text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : !isLoading && opportunities.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Info className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No pools returned. Check the filters or retry.</p>
            <button
              onClick={() => handleRefresh()}
              className="px-4 py-2 bg-[var(--ink)] text-white rounded-full text-xs font-semibold shadow-sm inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <Info className="w-8 h-8 text-[var(--text-muted)] mx-auto" />
            <p className="text-sm font-medium text-[var(--text-primary)]">No opportunities match your filter criteria.</p>
            <p className="text-xs text-[var(--text-secondary)]">Try resetting your filter chips or protocol selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-white text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-[0.2em] font-mono h-14">
                  <th className="py-4 px-6">Protocol</th>
                  <th className="py-4 px-6">APY</th>
                  <th className="py-4 px-6">TVL</th>
                  <th className="py-4 px-6">Risk Tier</th>
                  <th className="py-4 px-6">AI Score</th>
                  <th className="py-4 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)] text-sm">
                {filteredOpportunities.map((opp: OpportunityPool) => {
                  const tvlFormatted = opp.tvlUsd >= 1_000_000 
                    ? `$${(opp.tvlUsd / 1_000_000).toFixed(1)}M` 
                    : `$${opp.tvlUsd.toLocaleString()}`;

                  return (
                    <tr 
                      key={opp.id} 
                      onClick={() => setSelectedPoolId(opp.id)}
                      className={`hover:bg-white transition-colors cursor-pointer h-16 ${selectedPoolId === opp.id ? "bg-[var(--accent-soft)]/40" : ""}`}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <ProtocolLogo project={opp.protocol} logoUrl={opp.logoUrl} label={opp.protocolLabel} size={32} />
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                              <a 
                                href={opp.url} 
                                target="_blank" 
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="hover:text-[var(--accent)] flex items-center gap-1.5"
                              >
                                <span>{opp.protocolLabel}</span>
                                <ExternalLink className="w-3 h-3 text-[var(--text-muted)]" />
                              </a>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] font-mono mt-0.5">{opp.name}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-bold text-[var(--accent-dark)]">
                        +{opp.apy.toFixed(2)}%
                        <div className="text-[10px] text-[var(--text-secondary)] font-normal font-sans">
                          Base {opp.apyBase.toFixed(1)}% {opp.apyReward > 0 ? `+ rewards ${opp.apyReward.toFixed(1)}%` : ""}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono font-medium text-[var(--text-primary)]">
                        {tvlFormatted}
                      </td>

                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-white border border-[var(--border)] text-[var(--text-primary)]">
                          {opp.riskTier}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {opp.aiScore !== undefined ? (
                          <div className="space-y-0.5 max-w-xs" title={opp.aiSummary || ""}>
                            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-dark)] font-mono">
                              <Sparkles className="w-3.5 h-3.5 text-[var(--accent)]" />
                              <span>Score: {opp.aiScore}/100</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] line-clamp-1">{opp.aiSummary}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--text-muted)] italic">Ranked by APY & Risk</span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {opp.compatible ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--accent-soft)] text-[var(--accent-dark)]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--accent)]" /> Compatible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--negative-soft)] text-[var(--negative)]">
                            <XCircle className="w-3.5 h-3.5 text-[var(--negative)]" /> Rejected
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-xs text-[var(--text-muted)] pt-2 space-y-1">
        <div className="italic">Pool APYs come from live market data and are references only. Devnet cannot execute these positions.</div>
        <div className="text-[12px] text-[var(--text-muted)]">Protocol logos via DeFiLlama and belong to their respective owners.</div>
      </div>
    </div>
  );
};

export const Opportunities: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Opportunities Page Error">
      <OpportunitiesContent />
    </ErrorBoundary>
  );
};
