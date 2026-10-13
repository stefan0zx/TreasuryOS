import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { useAllocation } from "../context/AllocationContext";
import { useExecution } from "../context/ExecutionContext";
import { useTreasuryHistory } from "../hooks/useTreasuryHistory";
import { computeTreasuryMetrics } from "../lib/treasuryMetrics";
import { ErrorBoundary } from "./ErrorBoundary";
import { Coins, Info, Wallet, TrendingUp, RefreshCw, AlertCircle } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Dot } from "recharts";

interface TreasuryValueCardProps {
  timeframe?: string;
  setTimeframe?: (tf: string) => void;
}

export const TreasuryValueCardContent: React.FC<TreasuryValueCardProps> = ({ 
  timeframe: externalTimeframe, 
  setTimeframe: externalSetTimeframe 
}) => {
  const { connected, publicKey } = useWallet();
  const { balance, isLoading, isError, refetch } = useWalletBalance(publicKey);
  const { allocation } = useAllocation() as any;
  const { execution } = useExecution();

  const [internalTimeframe, setInternalTimeframe] = useState<string>("30D");
  const timeframe = externalTimeframe || internalTimeframe;
  const setTimeframe = externalSetTimeframe || setInternalTimeframe;

  const walletAddr = publicKey ? publicKey.toBase58() : null;
  const { points, snapshots, trackingSince, hasRealHistory } = useTreasuryHistory(publicKey, balance, timeframe, { isLoading, isError, connected });

  const metrics = computeTreasuryMetrics(balance, execution, walletAddr, snapshots, timeframe);

  // Y-axis domain padding
  const values = points.map(p => p.value);
  const minVal = values.length > 0 ? Math.min(...values) : metrics.totalValue;
  const maxVal = values.length > 0 ? Math.max(...values) : metrics.totalValue;
  const pad = Math.max((maxVal - minVal) * 0.1, metrics.totalValue * 0.01, 0.005);
  const yDomainMin = Number((Math.max(0, minVal - pad)).toFixed(4));
  const yDomainMax = Number((maxVal + pad).toFixed(4));

  const returnPct = metrics.returnPct;
  const returnColor = returnPct > 0 ? "text-emerald-600 bg-emerald-50" : "text-[#64748B] bg-slate-100";
  const returnSign = returnPct > 0 ? "+" : "";

  const absoluteChange = metrics.absoluteChange;
  const changeSign = absoluteChange > 0 ? "+" : "";

  const isConfirmed = execution && execution.status === 'confirmed' && execution.wallet === walletAddr;
  const liquidPct = metrics.totalValue > 0 ? (metrics.liquidSol / metrics.totalValue) * 100 : 100;
  const deployedPct = 100 - liquidPct;

  return (
    <div className="md:col-span-4 bg-white rounded-[20px] border border-[#E6E9EF] shadow-sm p-6 flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Treasury Value ({timeframe})</span>
            <div className="group relative cursor-pointer">
              <Info className="w-3.5 h-3.5 text-[#94A3B8]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
                Total SOL in the connected wallet plus deployed positions
              </div>
            </div>
          </div>
          <div className="group relative cursor-pointer">
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${returnColor}`}>
              {returnSign}{returnPct.toFixed(2)}%
            </span>
            <div className="absolute bottom-full right-0 mb-1 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
              Estimated yield return on deployed capital in this period. Excludes deposits and withdrawals.
            </div>
          </div>
        </div>

        {/* Big Value & Segmented Control */}
        <div className="flex items-start justify-between mb-4">
          <div>
            {!connected ? (
              <div className="text-sm font-medium text-[#64748B]">
                Connect wallet to view your treasury
              </div>
            ) : isError ? (
              <div className="space-y-1">
                <div className="text-sm font-semibold text-red-600">Failed to fetch balance</div>
                <button onClick={() => refetch()} className="text-xs text-blue-600 underline">Retry</button>
              </div>
            ) : isLoading && balance === null ? (
              <div className="space-y-1 animate-pulse">
                <div className="h-8 bg-slate-100 rounded w-28"></div>
                <div className="h-3 bg-slate-100 rounded w-20"></div>
              </div>
            ) : (
              <div>
                <div className="text-[32px] font-bold text-[#0F172A] font-mono tracking-tight leading-none">
                  {metrics.totalValue.toFixed(4)} SOL
                </div>
                <div className="text-xs font-medium text-[#64748B] mt-1">SOL Denominated</div>
              </div>
            )}
          </div>

          {/* Segmented Control */}
          <div className="flex items-center bg-[#F5F7FA] p-1 rounded-xl border border-[#E6E9EF]">
            {["7D", "30D", "90D"].map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  timeframe === tf
                    ? "bg-white text-[#0F172A] shadow-sm"
                    : "text-[#64748B] hover:text-[#0F172A]"
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Container */}
        <div className="w-full flex-1 min-h-[220px] lg:h-[220px]">
          {connected ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="solGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F5" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 10, fill: "#94A3B8" }} 
                  axisLine={false}
                  tickLine={false}
                  interval={Math.floor(points.length / 4)}
                />
                <YAxis 
                  domain={[yDomainMin, yDomainMax]} 
                  tick={{ fontSize: 10, fill: "#94A3B8" }} 
                  axisLine={false}
                  tickLine={false}
                  width={44}
                  tickFormatter={(v) => v.toFixed(2)}
                />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 border border-[#E6E9EF] rounded-lg shadow-lg text-xs font-mono space-y-1">
                          <div className="text-slate-500 text-[10px]">{data.date}</div>
                          <div className="font-bold text-slate-900">{Number(data.value).toFixed(4)} SOL</div>
                          {data.markerText && (
                            <div className="text-[10px] text-amber-600 font-sans font-medium">{data.markerText}</div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area 
                  type={hasRealHistory ? "stepAfter" : "monotone"} 
                  dataKey="value" 
                  stroke="#2563EB" 
                  strokeWidth={2} 
                  fill="url(#solGradient)" 
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex flex-col items-center justify-center text-xs text-[#94A3B8] bg-[#F5F7FA] rounded-2xl border border-[#E6E9EF] space-y-2">
              <Wallet className="w-6 h-6 text-slate-300" />
              <span>Connect wallet to view chart</span>
            </div>
          )}
        </div>

        {/* Caption */}
        <div className="text-center text-xs text-[#94A3B8] italic mt-2">
          {trackingSince ? `Tracking since ${trackingSince}` : (metrics.deployedSol > 0 ? "Active positions deployed in DeFi yields." : "No deployed positions. Treasury held in liquid SOL.")}
        </div>

        {/* Breakdown Section (2x2 Grid) */}
        <div className="mt-4 pt-4 border-t border-[#EEF1F5] space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E6E9EF]">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">Liquid Now</div>
              <div className="text-sm font-bold font-mono text-[#0F172A]">
                {connected && balance !== null ? `${metrics.liquidSol.toFixed(4)} SOL` : "—"}
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E6E9EF] relative">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Deployed</span>
                {execution?.mode === 'simulated' && metrics.deployedSol > 0 && (
                  <div className="group/sim relative cursor-pointer">
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Simulated
                    </span>
                    <div className="absolute bottom-full right-0 mb-1 hidden group-hover/sim:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
                      Simulated allocation. No funds left the wallet.
                    </div>
                  </div>
                )}
              </div>
              <div className="text-sm font-bold font-mono text-[#0F172A]">
                {metrics.status === 'pending' ? 'Executing...' : `${metrics.deployedSol.toFixed(4)} SOL`}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E6E9EF]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Est. Yield Earned</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Estimated
                </span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-600">
                +{metrics.accruedYieldValue.toFixed(6)} SOL
              </div>
            </div>

            <div className="bg-[#F8FAFC] p-3 rounded-xl border border-[#E6E9EF]">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Balance Change ({timeframe})</span>
                <div className="group/bc relative cursor-pointer">
                  <Info className="w-3 h-3 text-[#94A3B8]" />
                  <div className="absolute bottom-full right-0 mb-1 hidden group-hover/bc:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
                    Includes deposits, airdrops and withdrawals. This is not investment performance.
                  </div>
                </div>
              </div>
              <div className={`text-sm font-bold font-mono ${absoluteChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                {changeSign}{absoluteChange.toFixed(4)} SOL
              </div>
            </div>
          </div>

          {/* Allocation split bar if execution confirmed */}
          {isConfirmed && (
            <div className="pt-1">
              <div className="flex justify-between text-[10px] font-mono text-[#64748B] mb-1">
                <span>Reserve {liquidPct.toFixed(0)}%</span>
                <span>Allocation split</span>
                <span>Deployed {deployedPct.toFixed(0)}%</span>
              </div>
              <div className="w-full h-2 bg-[#E6E9EF] rounded-full overflow-hidden flex">
                <div style={{ width: `${liquidPct}%` }} className="bg-[var(--border-strong)] h-full" title="Reserve"></div>
                <div style={{ width: `${deployedPct}%` }} className="bg-[var(--accent)] h-full" title="Deployed"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-[#E6E9EF] flex items-center justify-between text-xs text-[#64748B]">
        <div className="flex items-center gap-1">
          <span>Balance change ({timeframe})</span>
          <div className="group/f relative cursor-pointer">
            <Info className="w-3 h-3 text-[#94A3B8]" />
            <div className="absolute bottom-full left-0 mb-1 hidden group-hover/f:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
              Includes deposits, airdrops and withdrawals. This is not investment performance.
            </div>
          </div>
        </div>
        <span className="font-mono font-medium text-[#0F172A]">
          {changeSign}{absoluteChange.toFixed(4)} SOL · {metrics.deployedSol > 0 ? `Deployed: ${metrics.deployedSol.toFixed(4)} SOL` : "Nothing deployed"}
        </span>
      </div>
    </div>
  );
};

export const TreasuryValueCard: React.FC<TreasuryValueCardProps> = (props) => {
  return (
    <ErrorBoundary fallbackTitle="Treasury Value Card Error">
      <TreasuryValueCardContent {...props} />
    </ErrorBoundary>
  );
};
