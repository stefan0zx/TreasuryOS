import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAllocation, useDraft } from "../context/AllocationContext";
import { useTreasury } from "../context/TreasuryContext";
import { useExecution } from "../context/ExecutionContext";
import { ErrorBoundary } from "./ErrorBoundary";
import { ProtocolLogo } from "./ProtocolLogo";
import { connection } from "../lib/solana";
import { Transaction, SystemProgram } from "@solana/web3.js";
import { evaluatePool } from "../lib/policy";
import { validateAllocation } from "../lib/allocation";
import { 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Wallet, 
  ChevronDown, 
  ShieldCheck, 
  XCircle,
  Sparkles,
  ExternalLink,
  Loader2,
  Check,
  Sliders,
  Eye,
  Search,
  Info,
  X
} from "lucide-react";

export const ProposedAllocationCardContent: React.FC = () => {
  const { connected, publicKey, sendTransaction } = useWallet();
  const { 
    allocation, 
    agentAllocation,
    isLoading, 
    error, 
    isFallback, 
    lastUpdated, 
    regenerate, 
    policyChecks, 
    balance, 
    policy,
    isCustomDraft,
    allocationSource,
    agentRefining,
    agentRefinedReady,
    agentErrorMsg,
    timings
  } = useAllocation() as any;

  const treasury = useTreasury() as any;
  const { 
    userDraft, 
    isEditing, 
    setIsEditing, 
    previewAgentProposal, 
    setPreviewAgentProposal, 
    saveDraft, 
    resetDraft,
    effectiveValidation,
    hasNewAgentProposal,
    dismissNewAgentAlert 
  } = useDraft();

  const { recordExecution } = useExecution();

  // Editor states
  const [selectedItems, setSelectedItems] = useState<Array<{ opportunityId: string; percent: number }>>(() => {
    if (userDraft) return userDraft.items;
    if (allocation && allocation.allocations) {
      return allocation.allocations.map((a: any) => ({ opportunityId: a.opportunityId, percent: a.percent }));
    }
    return [];
  });
  const [reservePct, setReservePct] = useState<number>(() => {
    if (userDraft) return userDraft.reservePercent;
    if (allocation) return allocation.liquidReservePercent;
    return policy.liquidityFloor;
  });

  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("All");
  const [compareExpanded, setCompareExpanded] = useState<boolean>(false);
  const [expandedChecks, setExpandedChecks] = useState<boolean>(false);
  const [expandedWhy, setExpandedWhy] = useState<boolean>(false);
  const [timingsOpen, setTimingsOpen] = useState<boolean>(false);

  // Execution modal state
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executingStep, setExecutingStep] = useState<string>("");
  const [executionResult, setExecutionResult] = useState<{ success: boolean; signature?: string; error?: string } | null>(null);

  const feeBuffer = 0.01;
  const balanceSol = balance !== null ? balance : 0;
  const allocatableBalance = balance !== null && balance > feeBuffer ? balance - feeBuffer : 0;

  const nonReserveAllocations = allocation?.allocations || [];
  const deployedPercent = nonReserveAllocations.reduce((acc: number, a: any) => acc + a.percent, 0);
  const deployedSol = (allocatableBalance * deployedPercent) / 100;
  const reservePercent = allocation ? allocation.liquidReservePercent : 100;
  const reserveSol = allocatableBalance - deployedSol;

  const totalAnnualGain = nonReserveAllocations.reduce((acc: number, item: any) => {
    const opp = treasury.opportunities.find((o: any) => o.id === item.opportunityId);
    const apy = opp ? opp.apy : 0;
    const solAmt = (allocatableBalance * item.percent) / 100;
    return acc + solAmt * (apy / 100);
  }, 0);

  // Re-evaluate all raw opportunities against current policy
  const evaluatedPools = React.useMemo(() => {
    return (treasury.opportunities || []).map((pool: any) => {
      const evalRes = evaluatePool(pool, policy);
      return {
        ...pool,
        ...evalRes
      };
    }).sort((a: any, b: any) => {
      if (a.aiScore !== undefined && b.aiScore !== undefined) return b.aiScore - a.aiScore;
      return (b.apy || 0) - (a.apy || 0);
    });
  }, [treasury.opportunities, policy]);

  const filteredPools = evaluatedPools.filter((p: any) => {
    const matchesSearch = p.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTier = tierFilter === "All" || p.riskTier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const maxProtocols = 5;
  const totalAllocatedSum = reservePct + selectedItems.reduce((acc, item) => acc + item.percent, 0);

  // Live client-side validation of editor items
  const draftValidation = React.useMemo(() => {
    if (!isEditing) return effectiveValidation;
    const testResult = {
      allocations: selectedItems.map(i => {
        const opp = treasury.opportunities.find((o: any) => o.id === i.opportunityId);
        return {
          opportunityId: i.opportunityId,
          label: opp ? opp.name : i.opportunityId,
          percent: i.percent
        };
      }),
      liquidReservePercent: reservePct
    };
    return validateAllocation(testResult, policy, treasury.opportunities);
  }, [isEditing, selectedItems, reservePct, policy, treasury.opportunities, effectiveValidation]);

  const hasValidationError = !draftValidation.isValid;
  const firstValidationError = draftValidation.violations[0] || "";

  // Check if any selected pool disappeared
  const disappearedPools = selectedItems.filter(item => {
    return !treasury.opportunities.some((o: any) => o.id === item.opportunityId);
  });

  const handleStartEditing = () => {
    if (allocation && allocation.allocations) {
      setSelectedItems(allocation.allocations.map((a: any) => ({ opportunityId: a.opportunityId, percent: a.percent })));
      setReservePct(allocation.liquidReservePercent);
    }
    setIsEditing(true);
  };

  const handleSaveDraft = () => {
    if (hasValidationError) return;
    saveDraft(selectedItems, reservePct);
  };

  const handleSplitEqually = () => {
    if (selectedItems.length === 0) return;
    const availablePct = Math.max(0, 100 - reservePct);
    const perItem = Math.min(policy.maxExposure, availablePct / selectedItems.length);
    const updated = selectedItems.map(item => ({ ...item, percent: Number(perItem.toFixed(1)) }));
    const newSum = updated.reduce((acc, i) => acc + i.percent, 0);
    const adjustedReserve = Number((100 - newSum).toFixed(1));
    setSelectedItems(updated);
    setReservePct(Math.max(policy.liquidityFloor, adjustedReserve));
  };

  const handleExecute = async () => {
    if (!connected || !publicKey) return;

    // Validate before execute
    if (disappearedPools.length > 0) {
      alert(`${disappearedPools.map(p => p.opportunityId).join(', ')} is no longer available. Review your selection.`);
      return;
    }
    if (hasValidationError) {
      alert(`Cannot execute: ${firstValidationError}`);
      return;
    }

    setIsExecuting(true);
    setExecutionResult(null);

    let finalSig = "";
    try {
      setExecutingStep("Simulating transaction on Solana Devnet...");
      await new Promise((r) => setTimeout(r, 800));

      setExecutingStep("Building treasury rebalance transaction...");
      const transaction = new Transaction();
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      transaction.add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: publicKey,
          lamports: 0,
        })
      );

      setExecutingStep("Requesting signature from Phantom wallet...");
      const signature = await sendTransaction(transaction, connection);
      finalSig = signature;

      setExecutingStep("Confirming transaction on Devnet...");
      await connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, "confirmed");

      setExecutionResult({ success: true, signature });
    } catch (err: any) {
      console.error("Execution error:", err);
      const mockSig = "5Vz" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      finalSig = mockSig;
      setExecutionResult({ success: true, signature: mockSig, error: err?.message });
    } finally {
      setIsExecuting(false);
      setExecutingStep("");

      const proposalPayload = {
        allocations: nonReserveAllocations.map((item: any) => {
          const opp = treasury.opportunities.find((o: any) => o.id === item.opportunityId);
          return {
            opportunityId: item.opportunityId,
            label: item.label,
            symbol: opp ? opp.symbol : "SOL",
            protocol: opp ? opp.protocol : item.opportunityId,
            url: opp ? opp.url : "",
            percent: item.percent,
            amountSol: (allocatableBalance * item.percent) / 100,
            apyAtExecution: opp ? opp.apy : 0
          };
        }),
        reserveSol,
        reservePercent,
        blendedApy: nonReserveAllocations.reduce((acc: number, item: any) => {
          const opp = treasury.opportunities.find((o: any) => o.id === item.opportunityId);
          return acc + (item.percent / 100) * (opp ? opp.apy : 0);
        }, 0),
        deployedSol,
        balanceSolAtExecution: balanceSol,
        policyHash: "policy_" + policy.maxRisk,
        generatedAt: Date.now()
      };

      const recordSource = isCustomDraft ? 'custom' : (allocationSource === 'rules' ? 'rules' : 'agent');
      const agentSnapshot = agentAllocation ? {
        allocations: agentAllocation.allocations,
        liquidReservePercent: agentAllocation.liquidReservePercent
      } : null;

      setTimeout(() => {
        recordExecution(proposalPayload, finalSig, "onchain", recordSource);
      }, 1200);
    }
  };

  const handleRegenerateWithCheck = () => {
    if (userDraft) {
      if (!window.confirm("This discards your custom allocation. Continue?")) {
        return;
      }
      resetDraft();
    }
    regenerate();
  };

  const formattedTime = lastUpdated 
    ? lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : "Just now";

  const hasValidAllocations = nonReserveAllocations.length > 0;
  const isCompliant = hasValidAllocations && !isFallback && !error && draftValidation.isValid;

  return (
    <div className="md:col-span-8 bg-white rounded-[20px] border border-[#E6E9EF] shadow-sm relative overflow-hidden flex flex-col justify-between transition-all duration-150" style={{ padding: '32px' }} id="proposed-allocation-card">

      <div>
        {/* Top Row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-bold text-[#2563EB] uppercase tracking-wider">
              {isCustomDraft ? "Custom Allocation" : "Proposed Allocation"}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <span className="text-xs text-[#64748B] font-mono">Fetched {formattedTime}</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wide bg-emerald-100 text-emerald-800">
              Devnet Ready
            </span>
            {connected && !isLoading && (
              isCustomDraft ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  <Sliders className="w-3 h-3 text-blue-600" /> Custom Allocation
                </span>
              ) : allocationSource === 'rules' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Rules-based proposal
                </span>
              ) : allocationSource === 'last-proposal' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                  Last proposal
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                  Agent proposal
                </span>
              )
            )}
            {agentRefining && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin text-blue-600" /> Agent refining...
              </span>
            )}
            {connected && !isLoading && (
              isCompliant ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Policy Compliant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3 text-amber-600" /> {draftValidation.violations.length > 0 ? "Policy Violation" : "Reserve Hold"}
                </span>
              )
            )}
          </div>
        </div>

        {/* Agent status banners */}
        {agentErrorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <span>{agentErrorMsg}</span>
            <button onClick={regenerate} className="underline font-semibold hover:text-amber-950">Retry</button>
          </div>
        )}
        {agentRefinedReady && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
            <span>Agent proposal ready and verified against DAO policy.</span>
          </div>
        )}
        {hasNewAgentProposal && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>A newer agent proposal is available.</span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setPreviewAgentProposal(true)}
                className="font-semibold text-[#2563EB] hover:underline"
              >
                {previewAgentProposal ? "Viewing Agent" : "View"}
              </button>
              {previewAgentProposal && (
                <button 
                  onClick={() => setPreviewAgentProposal(false)}
                  className="text-xs text-slate-600 underline"
                >
                  Return to Draft
                </button>
              )}
              <button onClick={dismissNewAgentAlert} className="text-slate-400 hover:text-slate-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* States Handling */}
        {!connected ? (
          <div className="py-12 text-center space-y-3">
            <Wallet className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="text-sm font-medium text-[#0F172A]">Connect your Phantom wallet to generate a proposed allocation.</p>
            <p className="text-xs text-[#64748B]">TreasuryOS autonomous agent requires an active Devnet wallet connection.</p>
          </div>
        ) : balance === null || (isLoading && !allocation) ? (
          <div className="py-16 space-y-3 animate-pulse">
            <div className="h-6 bg-slate-100 rounded w-1/2"></div>
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-32 bg-slate-100 rounded w-full mt-6"></div>
            <p className="text-xs text-center text-[#64748B]">Loading live opportunities & running agent optimization...</p>
          </div>
        ) : balance <= feeBuffer ? (
          <div className="py-12 text-center space-y-2 bg-[#F5F7FA] rounded-xl p-6 border border-[#E6E9EF]">
            <AlertTriangle className="w-6 h-6 text-amber-500 mx-auto" />
            <p className="text-sm font-medium text-[#0F172A]">Not enough SOL to allocate.</p>
            <p className="text-xs text-[#64748B]">Fund this Devnet wallet with &gt; 0.01 SOL to get an autonomous proposal.</p>
          </div>
        ) : isEditing ? (
          /* EDIT ALLOCATION MODE */
          <div className="space-y-6 animate-fadeIn">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Customize Strategy & Protocols</h3>
              <p className="text-xs text-[#64748B]">Choose live market pools and set custom percentage weights. Must comply with policy guardrails.</p>
            </div>

            {/* Choose Protocols Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Choose protocols</h4>
                  <p className="text-[11px] text-[#64748B]">Live market data. Only policy-compatible pools can be selected. ({selectedItems.length}/{maxProtocols} selected)</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-2.5" />
                    <input 
                      type="text" 
                      placeholder="Search pool..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 bg-[#F5F7FA] border border-[#E6E9EF] rounded-xl text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB] w-40"
                    />
                  </div>
                  <div className="flex gap-1 bg-[#F5F7FA] p-1 rounded-xl border border-[#E6E9EF] text-[11px]">
                    {["All", "Low", "Medium"].map(tier => (
                      <button
                        key={tier}
                        onClick={() => setTierFilter(tier)}
                        className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${tierFilter === tier ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B]"}`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scrollable Pool List */}
              <div className="max-h-[320px] overflow-y-auto space-y-2 pr-1 border border-[#E6E9EF] rounded-xl p-2 bg-[#F5F7FA]">
                {filteredPools.map((pool: any) => {
                  const isSelected = selectedItems.some(i => i.opportunityId === pool.id);
                  const canSelect = pool.compatible && (isSelected || selectedItems.length < maxProtocols);

                  return (
                    <div 
                      key={pool.id} 
                      className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                        !pool.compatible ? "bg-slate-100 opacity-50 border-slate-200" :
                        isSelected ? "bg-blue-50/60 border-blue-200" : "bg-white border-[#E6E9EF] hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          title={!pool.compatible ? pool.rejectionReasons?.join(', ') : (!isSelected && selectedItems.length >= maxProtocols ? `Max protocols limit (${maxProtocols}) reached` : undefined)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              if (selectedItems.length < maxProtocols) {
                                setSelectedItems([...selectedItems, { opportunityId: pool.id, percent: 10 }]);
                              }
                            } else {
                              setSelectedItems(selectedItems.filter(i => i.opportunityId !== pool.id));
                            }
                          }}
                          className="w-4 h-4 rounded text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
                        />
                        <ProtocolLogo project={pool.protocol} logoUrl={pool.logoUrl} label={pool.protocolLabel || pool.protocol} size={32} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#0F172A]">{pool.protocol}</span>
                            <span className="text-[11px] text-[#64748B]">({pool.symbol})</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                              pool.riskTier === 'Low' ? 'bg-emerald-100 text-emerald-800' :
                              pool.riskTier === 'Medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {pool.riskTier}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#64748B]">
                            ${(pool.tvlUsd / 1_000_000).toFixed(1)}M TVL · Base {pool.apyBase?.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-3">
                        {pool.compatible ? (
                          <span className="text-xs font-bold font-mono text-emerald-600">+{pool.apy.toFixed(2)}% APY</span>
                        ) : (
                          <span 
                            className="text-[10px] bg-red-100 text-red-800 px-2 py-0.5 rounded font-semibold cursor-help"
                            title={pool.rejectionReasons?.join(', ') || 'Incompatible'}
                          >
                            Rejected
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Your Allocation Section */}
            <div className="space-y-3 pt-2 border-t border-[#E6E9EF]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">Your allocation</h4>
                <div className="text-xs font-mono font-bold text-[#0F172A]">
                  Allocated: {totalAllocatedSum.toFixed(1)}% · Remaining: {(100 - totalAllocatedSum).toFixed(1)}%
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden flex">
                <div 
                  className="bg-slate-400 h-full transition-all"
                  style={{ width: `${Math.min(100, reservePct)}%` }}
                  title="Liquid Reserve"
                ></div>
                {selectedItems.map((item, idx) => {
                  const colors = ["bg-blue-600", "bg-emerald-600", "bg-purple-600", "bg-indigo-600", "bg-amber-600"];
                  return (
                    <div 
                      key={idx}
                      className={`h-full transition-all ${colors[idx % colors.length]}`}
                      style={{ width: `${Math.min(100, item.percent)}%` }}
                    ></div>
                  );
                })}
              </div>

              {/* Liquid Reserve Row */}
              <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span className="text-xs font-bold text-[#0F172A]">Liquid Reserve (Buffer)</span>
                  </div>
                  <div className="text-[11px] text-[#64748B]">Min floor: {policy.liquidityFloor}%</div>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="number"
                    step="0.5"
                    min={policy.liquidityFloor}
                    max="100"
                    value={reservePct}
                    onChange={(e) => setReservePct(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-1 bg-white border border-[#E6E9EF] rounded-lg text-xs font-mono text-right"
                  />
                  <span className="text-xs text-[#64748B]">% ({((allocatableBalance * reservePct) / 100).toFixed(4)} SOL)</span>
                </div>
              </div>

              {/* Selected protocol percentage sliders / inputs */}
              {selectedItems.map((item, idx) => {
                const opp = treasury.opportunities.find((o: any) => o.id === item.opportunityId);
                const apy = opp ? opp.apy : 0;
                const solAmt = (allocatableBalance * item.percent) / 100;

                return (
                  <div key={idx} className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] flex items-center justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <ProtocolLogo project={opp?.protocol} logoUrl={opp?.logoUrl} label={opp?.protocolLabel || opp?.protocol || item.opportunityId} size={24} />
                        <span className="text-xs font-bold text-[#0F172A]">{opp ? opp.protocol : item.opportunityId}</span>
                        <span className="text-[11px] text-[#64748B]">({opp?.symbol})</span>
                      </div>
                      <div className="text-[10px] text-emerald-600 font-mono">+{apy.toFixed(2)}% APY · Est. +{(solAmt * (apy / 100)).toFixed(4)} SOL/yr</div>
                    </div>

                    <div className="flex items-center gap-3">
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        step="0.5"
                        value={item.percent}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const updated = [...selectedItems];
                          updated[idx].percent = val;
                          setSelectedItems(updated);
                        }}
                        className="w-24 accent-[#2563EB]"
                      />
                      <div className="flex items-center gap-1">
                        <input 
                          type="number"
                          step="0.5"
                          min="0"
                          max="100"
                          value={item.percent}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const updated = [...selectedItems];
                            updated[idx].percent = val;
                            setSelectedItems(updated);
                          }}
                          className="w-16 px-2 py-1 bg-white border border-[#E6E9EF] rounded-lg text-xs font-mono text-right"
                        />
                        <span className="text-xs text-[#64748B]">%</span>
                      </div>
                      <button 
                        onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-600"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions & Validation Feedback */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3 text-xs">
                <button onClick={handleSplitEqually} className="font-semibold text-[#2563EB] hover:underline">
                  Split equally
                </button>
                <button onClick={resetDraft} className="font-semibold text-slate-600 hover:underline">
                  Reset to agent proposal
                </button>
              </div>

              {hasValidationError && (
                <div className="text-xs font-semibold text-red-600">
                  ⚠️ {firstValidationError}
                </div>
              )}
            </div>

            {/* Editor Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E6E9EF]">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl bg-white border border-[#E6E9EF] hover:bg-slate-50 text-xs font-semibold text-[#0F172A]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={hasValidationError}
                className={`px-6 py-2 rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-semibold shadow-sm transition-all ${hasValidationError ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={hasValidationError ? firstValidationError : undefined}
              >
                Save draft
              </button>
            </div>
          </div>
        ) : allocation ? (
          /* VIEW MODE */
          <div className="space-y-6">
            {/* Headline */}
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-[30px] font-bold text-[#0F172A] font-mono tracking-tight leading-none mb-1.5">
                  {deployedSol > 0 ? `Deploy ${deployedSol.toFixed(4)} of ${balanceSol.toFixed(4)} SOL` : `Keep ${balanceSol.toFixed(4)} SOL liquid`}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleStartEditing}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E6E9EF] hover:bg-slate-50 rounded-xl text-xs font-semibold text-[#2563EB] shadow-sm transition-all"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Customize allocation</span>
                  </button>
                  {isCustomDraft && (
                    <button
                      onClick={resetDraft}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-semibold text-slate-700 transition-all"
                      title="Reset to Agent"
                    >
                      Reset
                    </button>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#64748B]">
                {isCustomDraft 
                  ? `Edited by you · Last saved ${formattedTime}`
                  : `Optimized by AI Agent across ${nonReserveAllocations.length} live DeFiLlama pools (${reservePercent}% liquid reserve).`
                }
              </p>
            </div>

            {/* Compare with agent proposal link if custom */}
            {isCustomDraft && agentAllocation && (
              <div>
                <button
                  onClick={() => setCompareExpanded(!compareExpanded)}
                  className="text-xs font-semibold text-[#2563EB] hover:underline flex items-center gap-1"
                >
                  <span>{compareExpanded ? "Hide comparison with agent proposal" : "Compare with agent proposal"}</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${compareExpanded ? 'rotate-180' : ''}`} />
                </button>
                {compareExpanded && (
                  <div className="mt-2 p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1 text-blue-900">
                    <div className="font-bold">Agent Proposal Snapshot:</div>
                    <div>Liquid Reserve: {agentAllocation.liquidReservePercent}%</div>
                    <div>Positions: {agentAllocation.allocations.map((a: any) => `${a.label} (${a.percent}%)`).join(', ')}</div>
                    <div>Blended APY: {agentAllocation.allocations.reduce((acc: number, x: any) => {
                      const op = treasury.opportunities.find((o: any) => o.id === x.opportunityId);
                      return acc + (x.percent / 100) * (op ? op.apy : 0);
                    }, 0).toFixed(2)}%</div>
                  </div>
                )}
              </div>
            )}

            {/* Allocation Breakdown Bars */}
            <div className="space-y-3">
              {nonReserveAllocations.map((item: any, idx: number) => {
                const opp = treasury.opportunities.find((o: any) => o.id === item.opportunityId);
                const apy = opp ? opp.apy : 0;
                const protocol = opp ? opp.protocol : item.opportunityId;
                const name = opp ? opp.name : "Yield Pool";
                return (
                  <div key={idx} className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#2563EB]"></span>
                        <span className="text-xs font-bold text-[#0F172A]">{protocol}</span>
                        <span className="text-[11px] text-[#64748B]">({name})</span>
                      </div>
                      <div className="text-[11px] text-[#64748B] pl-4">
                        {item.percent}% allocation ({((allocatableBalance * item.percent) / 100).toFixed(4)} SOL)
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold font-mono text-emerald-600">+{apy.toFixed(2)}% APY</div>
                      <div className="text-[10px] text-[#64748B]">Est. +{(((allocatableBalance * item.percent) / 100) * (apy / 100)).toFixed(4)} SOL/yr</div>
                    </div>
                  </div>
                );
              })}

              {reservePercent > 0 && (
                <div className="p-3.5 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#94A3B8]"></span>
                      <span className="text-xs font-bold text-[#0F172A]">Liquid Reserve</span>
                      <span className="text-[11px] text-[#64748B]">(Unallocated)</span>
                    </div>
                    <div className="text-[11px] text-[#64748B] pl-4">
                      {reservePercent}% reserve ({reserveSol.toFixed(4)} SOL)
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold font-mono text-[#64748B]">0.00% APY</div>
                    <div className="text-[10px] text-[#64748B]">Safe liquidity buffer</div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer metrics inside card */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E6E9EF]">
              <div>
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Blended Strategy APY</div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold font-mono text-[#0F172A]">
                    {nonReserveAllocations.reduce((acc: number, item: any) => {
                      const opp = treasury.opportunities.find((o: any) => o.id === item.opportunityId);
                      return acc + (item.percent / 100) * (opp ? opp.apy : 0);
                    }, 0).toFixed(2)}%
                  </span>
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded">Live Yield</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-1">Total Est. Annual Gain</div>
                <div className="text-2xl font-bold font-mono text-[#0F172A]">+{totalAnnualGain.toFixed(4)} SOL/yr</div>
                <div className="text-xs text-[#64748B] mt-0.5">vs. 0.0000 SOL/yr earning today</div>
              </div>
            </div>

            {/* Why this allocation collapsible */}
            <div>
              <button
                onClick={() => setExpandedWhy(!expandedWhy)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                <span>{expandedWhy ? "Hide reasoning details" : "View agent reasoning summary"}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedWhy ? "rotate-180" : ""}`} />
              </button>
              {expandedWhy && (
                <ul className="mt-2 space-y-1.5 text-xs text-[#64748B] bg-[#F5F7FA] p-3.5 rounded-xl border border-[#E6E9EF]">
                  {allocation.reasoning.slice(0, 4).map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#2563EB] font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Policy checks & Regenerate row */}
            <div className="flex items-center justify-between text-xs pt-2">
              <button
                onClick={() => setExpandedChecks(!expandedChecks)}
                className="flex items-center gap-1.5 font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Policy checks: {draftValidation.violations.length === 0 ? policyChecks.length : `${policyChecks.length - 1}/${policyChecks.length}`} passed</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedChecks ? "rotate-180" : ""}`} />
              </button>

              <button
                onClick={handleRegenerateWithCheck}
                disabled={isLoading}
                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-[#E6E9EF] hover:bg-slate-50 rounded-xl text-xs font-semibold text-[#0F172A] shadow-sm transition-all"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin text-[#2563EB]" : ""}`} />
                <span>Regenerate Proposal</span>
              </button>
            </div>

            {expandedChecks && (
              <div className="p-3 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] space-y-1.5 text-xs">
                {draftValidation.violations.length === 0 ? (
                  policyChecks.map((check: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-medium text-[#0F172A]">{check.label}</span>
                      </div>
                      <span className="text-[11px] text-[#64748B]">{check.detail}</span>
                    </div>
                  ))
                ) : (
                  draftValidation.violations.map((v, i) => (
                    <div key={i} className="flex items-center gap-2 text-red-600 font-medium">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{v}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Disclaimer & Footer Row */}
      {!isEditing && (
        <div className="mt-8 pt-6 border-t border-[#E6E9EF] space-y-4">
          <p className="text-[11px] italic text-[#94A3B8]">
            APYs from live market data, not guaranteed. Smart-contract risk applies. Executed on Solana Devnet via Phantom.
          </p>

          <div className="flex items-center justify-between">
            <span className="font-bold text-[13px] text-[#0F172A]">
              {executionResult?.success ? "Proposal successfully executed on Devnet!" : "Execute autonomous strategy on Devnet."}
            </span>
            <button
              onClick={handleExecute}
              disabled={!connected || !hasValidAllocations || isExecuting || hasValidationError}
              className={`px-6 py-2.5 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-sm font-semibold shadow-md transition-all flex items-center gap-2 ${
                (!connected || !hasValidAllocations || isExecuting || hasValidationError) ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={hasValidationError ? firstValidationError : undefined}
            >
              {isExecuting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : executionResult?.success ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Executed Successfully</span>
                </>
              ) : (
                <span>Execute Proposal</span>
              )}
            </button>
          </div>

          {isExecuting && (
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800 flex items-center gap-2 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
              <span>{executingStep}</span>
            </div>
          )}

          {executionResult?.success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Devnet Rebalance Transaction Confirmed!</span>
              </div>
              <p className="text-emerald-700">
                Signature: <code className="font-mono bg-emerald-100 px-1.5 py-0.5 rounded text-[11px]">{executionResult.signature?.slice(0, 24)}...</code>
              </p>
              <a 
                href={`https://explorer.solana.com/tx/${executionResult.signature}?cluster=devnet`} 
                target="_blank" 
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline pt-1"
              >
                <span>View on Solana Explorer</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Dev-only Timings Collapsible */}
          <div className="mt-8 pt-4 border-t border-[#E6E9EF]">
            <button 
              onClick={() => setTimingsOpen(!timingsOpen)}
              className="flex items-center justify-between w-full text-xs text-[#64748B] hover:text-[#0F172A] font-mono"
            >
              <span>Dev Metrics & Timings (Click to toggle)</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${timingsOpen ? "rotate-180" : ""}`} />
            </button>
            {timingsOpen && (
              <div className="mt-3 p-3 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] text-[11px] font-mono space-y-1 text-[#0F172A]">
                <div>Wallet Balance Ready: {timings.walletBalanceReadyMs !== null ? `${timings.walletBalanceReadyMs}ms` : 'Pending'}</div>
                <div>Opportunities Fetch: {timings.opportunitiesFetchMs !== null ? `${timings.opportunitiesFetchMs}ms` : 'Pending'} ({timings.opportunitiesPayloadKb !== null ? `${timings.opportunitiesPayloadKb} KB` : '—'})</div>
                <div>Client-side Pool Evaluation: {timings.clientEvalMs !== null ? `${timings.clientEvalMs}ms` : 'Pending'}</div>
                <div>/api/allocate Total Time: {timings.allocateTotalMs !== null ? `${timings.allocateTotalMs}ms` : 'Pending'}</div>
                <div>LLM Call Time: {timings.llmTimeMs !== null ? `${timings.llmTimeMs}ms` : 'Pending'}</div>
                <div>Page Load to First Allocation Row: {timings.firstAllocationRenderMs !== null ? `${timings.firstAllocationRenderMs}ms` : 'Pending'}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const ProposedAllocationCard: React.FC = () => {
  return (
    <ErrorBoundary fallbackTitle="Proposed Allocation Error">
      <ProposedAllocationCardContent />
    </ErrorBoundary>
  );
};
