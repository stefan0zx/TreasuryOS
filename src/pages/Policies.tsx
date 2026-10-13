import React, { useState } from "react";
import { ShieldCheck, Sliders, Save, RotateCcw, CheckCircle2 } from "lucide-react";
import { useTreasury } from "../context/TreasuryContext";

export const Policies: React.FC = () => {
  const { policy, setPolicy } = useTreasury();

  const [liquidityFloor, setLiquidityFloor] = useState<number>(policy.liquidityFloor);
  const [targetApy, setTargetApy] = useState<number>(policy.targetApy);
  const [maxExposure, setMaxExposure] = useState<number>(policy.maxExposure);
  const [maxRisk, setMaxRisk] = useState<string>(policy.maxRisk);
  const [maxDrawdown, setMaxDrawdown] = useState<number>(policy.maxDrawdown);
  const [rebalanceFreq, setRebalanceFreq] = useState<string>(policy.rebalanceFreq);
  const [approvalThreshold, setApprovalThreshold] = useState<number>(policy.approvalThreshold);
  const [savedMessage, setSavedMessage] = useState<boolean>(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setPolicy({
      liquidityFloor,
      targetApy,
      maxExposure,
      maxRisk,
      maxDrawdown,
      rebalanceFreq,
      approvalThreshold
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  const handleReset = () => {
    setLiquidityFloor(20);
    setTargetApy(5.0);
    setMaxExposure(40);
    setMaxRisk("Tier 2 (Medium)");
    setMaxDrawdown(10.0);
    setRebalanceFreq("Weekly");
    setApprovalThreshold(25);
    setPolicy({
      liquidityFloor: 20,
      targetApy: 5.0,
      maxExposure: 40,
      maxRisk: "Tier 2 (Medium)",
      maxDrawdown: 10.0,
      rebalanceFreq: "Weekly",
      approvalThreshold: 25
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700">DAO Guardrails</span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs">Autonomous Enforcement</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Treasury Policies & Guardrails</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure automated boundaries and risk parameters enforced by the TreasuryOS agent.
          </p>
        </div>
        {savedMessage && (
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Policies successfully saved & applied!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Liquidity & Exposure */}
          <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E6E9EF]">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Liquidity & Exposure Limits</h3>
                <p className="text-xs text-slate-500">Core capital preservation controls</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Liquidity Floor (%) — Minimum Native SOL Held
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={liquidityFloor}
                    onChange={(e) => setLiquidityFloor(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <span className="font-mono font-bold text-sm text-slate-900 w-12 text-right">{liquidityFloor}%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Percentage of treasury kept liquid for immediate DAO operational needs.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Maximum Protocol Exposure (%)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="80"
                    value={maxExposure}
                    onChange={(e) => setMaxExposure(Number(e.target.value))}
                    className="w-full accent-blue-600"
                  />
                  <span className="font-mono font-bold text-sm text-slate-900 w-12 text-right">{maxExposure}%</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Maximum capital allocated to any single third-party protocol.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Blended APY (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={targetApy}
                  onChange={(e) => setTargetApy(Number(e.target.value))}
                  className="w-full bg-[#F5F7FA] border border-[#E6E9EF] rounded-xl px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Card 2: Risk & Rebalancing */}
          <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-[#E6E9EF]">
              <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Risk & Rebalance Automation</h3>
                <p className="text-xs text-slate-500">Autonomous thresholds & guardrails</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Maximum Allowable Risk Tier
                </label>
                <select
                  value={maxRisk}
                  onChange={(e) => setMaxRisk(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#E6E9EF] rounded-xl px-3.5 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option>Tier 1 (Low)</option>
                  <option>Tier 2 (Medium)</option>
                  <option>Tier 3 (High)</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Low = established protocols with deep liquidity. Medium = known protocols with some yield or structure risk. High = unverified or complex strategies.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Max Allowable Drawdown (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={maxDrawdown}
                  onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                  className="w-full bg-[#F5F7FA] border border-[#E6E9EF] rounded-xl px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Rebalance Frequency
                </label>
                <select
                  value={rebalanceFreq}
                  onChange={(e) => setRebalanceFreq(e.target.value)}
                  className="w-full bg-[#F5F7FA] border border-[#E6E9EF] rounded-xl px-3.5 py-2 text-sm font-medium text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option>Every 12 Hours</option>
                  <option>Every 24 Hours</option>
                  <option>Weekly</option>
                  <option>Manual Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Multisig Approval Threshold (%)
                </label>
                <input
                  type="number"
                  value={approvalThreshold}
                  onChange={(e) => setApprovalThreshold(Number(e.target.value))}
                  className="w-full bg-[#F5F7FA] border border-[#E6E9EF] rounded-xl px-3.5 py-2 text-sm font-mono text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Form Footer */}
        <div className="flex items-center justify-end gap-3 bg-white p-4 rounded-2xl border border-[#E6E9EF] shadow-sm">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Reset Defaults
          </button>
          <button
            type="submit"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Save Policies</span>
          </button>
        </div>
      </form>
    </div>
  );
};
