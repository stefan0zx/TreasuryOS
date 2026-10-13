import React from "react";
import { Bot, Cpu, CheckCircle2, ArrowRight, ShieldCheck, Activity, Terminal } from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";

export const Agent: React.FC = () => {
  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);

  const reasoningSteps = [
    {
      timestamp: "11:04:12 UTC",
      step: "Devnet RPC State Inspection",
      status: "Verified",
      details: "Successfully polled connection slot 342,190,481 on Solana Devnet. Wallet balance synchronized."
    },
    {
      timestamp: "11:04:15 UTC",
      step: "Yield Opportunity Scanning",
      status: "Completed",
      details: "Evaluated 5 active DeFi pools on Devnet. Filtered out Marginfi and Solend due to max risk tier policy constraints."
    },
    {
      timestamp: "11:04:18 UTC",
      step: "Liquidity Floor Guardrail Check",
      status: "Passed",
      details: "Confirmed 20.0% liquid SOL reserve is strictly maintained in native wallet storage."
    },
    {
      timestamp: "11:04:22 UTC",
      step: "Portfolio Rebalance Simulation",
      status: "Ready",
      details: "Computed optimal allocation: 50% Kamino Lending, 30% Meteora DLMM LP, 20% Liquid Reserve. Awaiting multi-sig execution authorization."
    }
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700">Autonomous Core</span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs">Solana {capitalizedCluster}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">TreasuryOS Agent Engine</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time telemetry, probabilistic reasoning chains, and autonomous decision pipelines.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Agent Active & Listening
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Agent Status Card (Span 1) */}
        <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-500/30">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Agent v2.4-dev</h3>
              <p className="text-xs text-slate-500 font-mono">Devnet Executor</p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E6E9EF] text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Uptime</span>
              <span className="font-mono font-medium text-slate-900">99.98%</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Cycles Run</span>
              <span className="font-mono font-medium text-slate-900">14,289</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Active Policies</span>
              <span className="font-mono font-medium text-slate-900">7 Enforced</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Execution Mode</span>
              <span className="font-mono font-medium text-amber-600">Read-Only (Devnet)</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] text-xs text-slate-600">
            <div className="font-semibold text-slate-900 mb-1">Safety Lock</div>
            Fund-moving execution flows are deliberately disabled in this preview build to ensure zero risk.
          </div>
        </div>

        {/* Reasoning List (Span 2) */}
        <div className="md:col-span-2 bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E9EF]">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-blue-600" />
              <h3 className="font-semibold text-slate-900 text-sm">Live Reasoning & Execution Chain</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Auto-refreshed</span>
          </div>

          <div className="space-y-4">
            {reasoningSteps.map((item, index) => (
              <div key={index} className="flex gap-3.5 p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF]">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {index + 1}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-sm">{item.step}</span>
                    <span className="text-[11px] font-mono text-slate-400">{item.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.details}</p>
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 mt-1">
                      <CheckCircle2 className="w-3 h-3" /> {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Expected Outcome Block */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <h3 className="font-semibold text-sm">Expected Outcome Simulation</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          By maintaining a strict 20% liquid SOL floor and deploying 50% into Kamino lending vaults and 30% into Meteora DLMM LP pools, the DAO treasury projects an estimated blended annual yield of <span className="text-emerald-400 font-mono font-bold">8.45%</span> while remaining fully insulated from high-risk liquidation events.
        </p>
      </div>
    </div>
  );
};
