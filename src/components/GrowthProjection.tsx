import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { useOpportunities, OpportunityPool } from "../context/OpportunitiesProvider";
import { projectGrowth } from "../lib/projection";
import { SectionLabel } from "./SectionLabel";
import { Info } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from "recharts";

interface GrowthProjectionProps {
  selectedPoolId: string;
}

export const GrowthProjection: React.FC<GrowthProjectionProps> = ({ selectedPoolId }) => {
  const { connected, publicKey } = useWallet();
  const { balance } = useWalletBalance(publicKey);
  const { opportunities, isLoading } = useOpportunities() as any;

  const [amountInput, setAmountInput] = useState<string>("");
  const [years, setYears] = useState<number>(5);

  const selectedPool = opportunities.find((o: OpportunityPool) => o.id === selectedPoolId);
  const apy = selectedPool ? selectedPool.apy : 0;

  useEffect(() => {
    if (connected && balance !== null && amountInput === "") {
      setAmountInput(balance.toFixed(4));
    }
  }, [connected, balance, amountInput]);

  const handleUseWalletBalance = () => {
    if (balance !== null) {
      setAmountInput(balance.toFixed(4));
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === "") {
      setAmountInput("");
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      if (num <= 1_000_000) {
        setAmountInput(val);
      } else {
        setAmountInput("1000000");
      }
    }
  };

  const principal = amountInput !== "" ? parseFloat(amountInput) : NaN;
  const hasAmount = !isNaN(principal) && principal > 0;

  const projection = projectGrowth(hasAmount ? principal : 0, apy, years);

  return (
    <div className="md:col-span-5 bg-[var(--bg-card)] rounded-[24px] border border-[var(--border)] shadow-[var(--shadow-soft)] p-8 flex flex-col h-full justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <SectionLabel>Growth Projection</SectionLabel>
            <div className="group relative cursor-pointer">
              <Info className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block w-56 p-2 bg-slate-900 text-white text-[10px] rounded-lg shadow-lg z-10 text-center">
                Compounds the selected venue's current APY over time. Assumes the rate stays constant. Not guaranteed.
              </div>
            </div>
          </div>
          <span className="text-xs text-[var(--text-secondary)] font-medium font-mono">{apy.toFixed(1)}% APY</span>
        </div>

        {/* What-if amount input */}
        <div className="space-y-1.5 mb-5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--text-primary)]">Principal capital</label>
            {connected && balance !== null && (
              <button
                onClick={handleUseWalletBalance}
                className="text-[11px] font-medium text-[var(--accent-dark)] hover:underline cursor-pointer"
              >
                Use wallet balance ({balance.toFixed(4)} SOL)
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.0001"
              min="0"
              max="1000000"
              value={amountInput}
              onChange={handleAmountChange}
              placeholder="Enter an amount"
              className="w-full bg-[var(--bg-card-raised)] border border-[var(--border)] rounded-full px-5 py-2.5 text-base font-mono font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent)] shadow-xs"
            />
            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--text-muted)] font-mono">SOL</span>
          </div>
        </div>

        {/* Duration Slider */}
        <div className="space-y-2 mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-primary)]">
            <span>Horizon duration</span>
            <span className="font-mono text-[var(--accent-dark)] font-bold">{years} {years === 1 ? 'year' : 'years'}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={years}
            onChange={(e) => setYears(Number(e.target.value))}
            aria-valuetext={`${years} years`}
            className="w-full accent-[var(--accent)] cursor-pointer h-2 bg-[var(--border)] rounded-full"
          />
          <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
            <span>1 yr</span>
            <span>5 yrs</span>
            <span>10 yrs</span>
          </div>
        </div>

        {/* Chart / Hint */}
        <div className="w-full min-h-[140px] h-[160px] bg-[var(--bg-card-raised)] rounded-[16px] border border-[var(--border)] p-3 mb-6 relative flex items-center justify-center shadow-xs">
          {!hasAmount ? (
            <div className="text-xs text-[var(--text-muted)] italic">Enter an amount to see growth</div>
          ) : isLoading ? (
            <div className="text-xs text-[var(--text-muted)] animate-pulse">Calculating projection...</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection.yearlySeries} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                <defs>
                  <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => v.toFixed(1)} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-2.5 border border-[var(--border)] rounded-[12px] shadow-lg text-xs font-mono">
                          <div className="text-[var(--text-muted)] text-[10px]">Year {data.year}</div>
                          <div className="font-bold text-[var(--accent-dark)]">{Number(data.value).toFixed(4)} SOL</div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={principal} stroke="var(--text-muted)" strokeDasharray="3 3" label={{ value: "Principal", fill: "var(--text-muted)", fontSize: 10, position: "top" }} />
                <Area type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} fill="url(#growthGradient)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Result Block & Footer */}
      <div className="mt-auto pt-4 border-t border-[var(--border)] space-y-2">
        <div>
          <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Could become</div>
          <div className="text-[32px] font-bold font-mono text-[var(--accent-dark)] tracking-tight leading-none">
            {hasAmount ? `${projection.finalAmount.toFixed(4)} SOL` : "— SOL"}
          </div>
          <div className="text-xs text-[var(--text-secondary)] mt-1">
            {hasAmount ? `+${projection.totalGain.toFixed(4)} SOL earned at ${apy.toFixed(1)}% APY` : "Enter an amount above"}
          </div>
        </div>

        <p className="text-[11px] italic text-[var(--text-muted)] pt-1">
          Projection only. Based on current pool APYs, which change and are not guaranteed. Smart-contract risk applies.
        </p>
      </div>
    </div>
  );
};
