import React from "react";
import { History, ShieldCheck, CheckCircle2, Bot, ArrowRight } from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";

export const DecisionHistory: React.FC = () => {
  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);

  const decisions = [
    {
      id: "dec-1",
      title: "Rebalanced Yield Weights to Kamino Lend",
      category: "Portfolio Rebalance",
      timestamp: "October 8, 2026 - 14:32 UTC",
      description: "Autonomous scanner identified 0.45% APY spread advantage on Kamino SOL vault. Reallocated 15% of surplus treasury capital while keeping 20% liquid floor intact.",
      status: "Executed Successfully"
    },
    {
      id: "dec-2",
      title: "Rejected High-Risk Leverage Pool",
      category: "Risk Guardrail Trigger",
      timestamp: "October 7, 2026 - 09:15 UTC",
      description: "Marginfi leveraged SOL pool evaluated at 22.4% APY, but rejected automatically due to Tier 3 risk rating violating DAO max risk policy (Tier 2 limit).",
      status: "Blocked by Policy"
    },
    {
      id: "dec-3",
      title: "Liquidity Floor Enforcement Check",
      category: "Capital Preservation",
      timestamp: "October 5, 2026 - 18:00 UTC",
      description: "Verified native wallet balance reserves. Confirmed 20.0% liquidity floor requirement was fully satisfied prior to executing secondary pool deposits.",
      status: "Verified"
    },
    {
      id: "dec-4",
      title: "Initial TreasuryOS Deployment on Devnet",
      category: "System Initialization",
      timestamp: "October 1, 2026 - 10:00 UTC",
      description: "Successfully booted autonomous treasury agent connected to Solana Devnet RPC endpoint. Initialized 7 DAO governance rules.",
      status: "Initialized"
    }
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700">Audit Log</span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs">Solana {capitalizedCluster}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Decision History & Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chronological record of all automated governance decisions and policy guardrail activations.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-slate-100 rounded-xl text-xs font-semibold text-slate-700">
          <Bot className="w-4 h-4 text-blue-600" />
          <span>Autonomous Log</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {decisions.map((dec, index) => (
          <div key={dec.id} className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm flex flex-col md:flex-row gap-6">
            <div className="w-full md:w-48 shrink-0">
              <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider">{dec.category}</div>
              <div className="text-xs text-slate-400 font-mono mt-1">{dec.timestamp}</div>
            </div>
            <div className="flex-1 space-y-2 border-t md:border-t-0 md:border-l border-[#E6E9EF] pt-4 md:pt-0 md:pl-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">{dec.title}</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {dec.status}
                </span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{dec.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
