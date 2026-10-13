import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { AllocationResult, PolicyConfig, Opportunity, validateAllocation, getFallbackAllocation } from "../lib/allocation";
import { evaluatePool } from "../lib/policy";
import { SOLANA_CLUSTER } from "../lib/solana";

export interface OpportunityPool {
  id: string;
  protocol: string;
  protocolLabel: string;
  name: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number;
  apyReward: number;
  apyMean30d: number;
  apyPct7D: number;
  ilRisk: string;
  exposure: string;
  stablecoin: boolean;
  url: string;
  defillamaUrl: string;
  riskTier: "Low" | "Medium" | "High";
  compatible: boolean;
  rejectionReasons: string[];
  warnings?: string[];
  baseTier?: "Low" | "Medium" | "High";
  bumpReason?: string;
  aiScore?: number;
  aiSummary?: string;
  logoUrl?: string;
  logoResolved?: boolean;
}

export interface TreasuryTimings {
  walletBalanceReadyMs: number | null;
  opportunitiesFetchMs: number | null;
  opportunitiesPayloadKb: number | null;
  clientEvalMs: number | null;
  allocateTotalMs: number | null;
  llmTimeMs: number | null;
  firstAllocationRenderMs: number | null;
}

interface TreasuryContextType {
  opportunities: OpportunityPool[];
  isLoadingOpportunities: boolean;
  errorOpportunities: string | null;
  fetchedAt: string | null;
  source: string;
  stale: boolean;
  assetFilterRelaxed: boolean;
  aiScoring: boolean;
  refreshOpportunities: () => Promise<void>;

  allocation: AllocationResult | null;
  isLoadingAllocation: boolean;
  errorAllocation: string | null;
  isFallback: boolean;
  violations: string[];
  lastUpdatedAllocation: Date | null;
  regenerateAllocation: () => Promise<void>;
  policyChecks: Array<{ label: string; passed: boolean; detail: string }>;
  allocationSource: 'rules' | 'agent' | 'fallback' | 'last-proposal';
  agentRefining: boolean;
  agentRefinedReady: boolean;
  agentErrorMsg: string | null;

  policy: PolicyConfig;
  setPolicy: React.Dispatch<React.SetStateAction<PolicyConfig>>;
  balance: number | null;
  timings: TreasuryTimings;
}

const defaultPolicy: PolicyConfig = {
  liquidityFloor: 20,
  targetApy: 5.0,
  maxExposure: 40,
  maxRisk: "Tier 2 (Medium)",
  maxDrawdown: 10.0,
  rebalanceFreq: "Weekly",
  approvalThreshold: 25
};

const TreasuryContext = createContext<TreasuryContextType | undefined>(undefined);

export const TreasuryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pageLoadTimeRef = useRef<number>(performance.now());
  const { connected, publicKey } = useWallet();
  const { balance } = useWalletBalance(publicKey);

  const [policy, setPolicy] = useState<PolicyConfig>(defaultPolicy);

  // Timings state
  const [timings, setTimings] = useState<TreasuryTimings>({
    walletBalanceReadyMs: null,
    opportunitiesFetchMs: null,
    opportunitiesPayloadKb: null,
    clientEvalMs: null,
    allocateTotalMs: null,
    llmTimeMs: null,
    firstAllocationRenderMs: null,
  });

  const walletReadyLoggedRef = useRef<boolean>(false);
  useEffect(() => {
    if (balance !== null && !walletReadyLoggedRef.current) {
      walletReadyLoggedRef.current = true;
      const ms = performance.now() - pageLoadTimeRef.current;
      console.log(`[Timing] Wallet balance ready: ${ms.toFixed(1)}ms`);
      setTimings(prev => ({ ...prev, walletBalanceReadyMs: Number(ms.toFixed(1)) }));
    }
  }, [balance]);

  // Opportunities state
  const [rawOpportunities, setRawOpportunities] = useState<OpportunityPool[]>([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState<boolean>(true);
  const [errorOpportunities, setErrorOpportunities] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [source, setSource] = useState<string>("DeFiLlama Yields");
  const [stale, setStale] = useState<boolean>(false);
  const [assetFilterRelaxed, setAssetFilterRelaxed] = useState<boolean>(false);
  const [aiScoring, setAiScoring] = useState<boolean>(false);

  // Allocation state
  const [allocation, setAllocation] = useState<AllocationResult | null>(null);
  const [isLoadingAllocation, setIsLoadingAllocation] = useState<boolean>(false);
  const [errorAllocation, setErrorAllocation] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [violations, setViolations] = useState<string[]>([]);
  const [lastUpdatedAllocation, setLastUpdatedAllocation] = useState<Date | null>(null);
  const [policyChecks, setPolicyChecks] = useState<Array<{ label: string; passed: boolean; detail: string }>>([]);
  const [allocationSource, setAllocationSource] = useState<'rules' | 'agent' | 'fallback' | 'last-proposal'>('rules');
  const [agentRefining, setAgentRefining] = useState<boolean>(false);
  const [agentRefinedReady, setAgentRefinedReady] = useState<boolean>(false);
  const [agentErrorMsg, setAgentErrorMsg] = useState<string | null>(null);

  const lastRoundedBalanceRef = useRef<number | null>(null);
  const inFlightRef = useRef<boolean>(false);
  const lastKeyRef = useRef<string>("");

  const fetchOpportunities = useCallback(async (refresh = false) => {
    setIsLoadingOpportunities(true);
    setErrorOpportunities(null);
    const t0 = performance.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);

    try {
      const url = refresh ? "/api/opportunities?refresh=true" : "/api/opportunities";
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      const payloadSizeHeader = res.headers.get("X-Payload-Size");
      const rawText = await res.text();
      const payloadKb = Number((rawText.length / 1024).toFixed(2));
      const data = JSON.parse(rawText);

      const fetchMs = performance.now() - t0;
      console.log(`[Timing] /api/opportunities fetched in ${fetchMs.toFixed(1)}ms (${payloadKb} KB)`);
      setTimings(prev => ({
        ...prev,
        opportunitiesFetchMs: Number(fetchMs.toFixed(1)),
        opportunitiesPayloadKb: payloadKb
      }));

      setRawOpportunities(data.opportunities || []);
      setFetchedAt(data.fetchedAt || new Date().toISOString());
      setSource(data.source || "DeFiLlama Yields");
      setStale(data.stale || false);
      setAssetFilterRelaxed(!!data.assetFilterRelaxed);

      if (!data.aiRanked && (data.opportunities || []).length > 0) {
        setAiScoring(true);
        fetch("/api/opportunities/rank", { method: "POST" })
          .then(r => r.json())
          .then(rankData => {
            if (rankData.success && rankData.rankings) {
              const rankMap = new Map(rankData.rankings.map((r: any) => [r.id, r]));
              setRawOpportunities(prev => prev.map(p => {
                const r: any = rankMap.get(p.id);
                if (r) {
                  return { ...p, aiScore: r.score, aiSummary: r.summary };
                }
                return p;
              }));
            }
          })
          .catch(e => console.warn("Background AI ranking error:", e))
          .finally(() => setAiScoring(false));
      }
    } catch (err: any) {
      clearTimeout(timer);
      console.error("Failed to fetch opportunities:", err);
      const msg = err.name === "AbortError" ? "Request timed out (25s limit reached)" : (err.message || "Failed to load opportunities");
      setErrorOpportunities(msg);
    } finally {
      setIsLoadingOpportunities(false);
    }
  }, []);

  useEffect(() => {
    fetchOpportunities(false);
    const interval = setInterval(() => {
      fetchOpportunities(false);
    }, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchOpportunities]);

  // Memoized pool evaluations
  const evalCacheRef = useRef<Map<string, any>>(new Map());
  const opportunities = useMemo(() => {
    const t0 = performance.now();
    const policyKey = JSON.stringify(policy);
    const res = rawOpportunities.map(pool => {
      const cacheKey = `${pool.id}:${policyKey}`;
      if (evalCacheRef.current.has(cacheKey)) {
        return evalCacheRef.current.get(cacheKey);
      }
      const evalResult = evaluatePool(pool, policy);
      const evaluated = {
        ...pool,
        riskTier: evalResult.riskTier,
        compatible: evalResult.compatible,
        rejectionReasons: evalResult.reasons,
        warnings: evalResult.warnings,
        baseTier: evalResult.baseTier,
        bumpReason: evalResult.bumpReason
      };
      evalCacheRef.current.set(cacheKey, evaluated);
      return evaluated;
    });
    const evalMs = performance.now() - t0;
    console.log(`[Timing] Client-side pool evaluation time: ${evalMs.toFixed(1)}ms`);
    setTimings(prev => ({ ...prev, clientEvalMs: Number(evalMs.toFixed(1)) }));
    return res;
  }, [rawOpportunities, policy]);

  const mappedOpportunities: Opportunity[] = useMemo(() => {
    return opportunities.map(o => ({
      id: o.id,
      protocol: o.protocol,
      name: o.name,
      apy: o.apy,
      tvl: `$${(o.tvlUsd / 1_000_000).toFixed(1)}M`,
      riskTier: `Tier ${o.riskTier === 'Low' ? '1 (Low)' : o.riskTier === 'Medium' ? '2 (Medium)' : '3 (High)'}`
    }));
  }, [opportunities]);

  const firstRenderLoggedRef = useRef<boolean>(false);

  // Instant deterministic proposal & last proposal cache check
  const runAllocationGeneration = useCallback(async (forced = false) => {
    if (!connected || !publicKey || balance === null || opportunities.length === 0) {
      return;
    }

    const roundedBalance = Number(balance.toFixed(4));
    if (!forced && lastRoundedBalanceRef.current !== null && Math.abs(lastRoundedBalanceRef.current - roundedBalance) < 0.0001) {
      return; // 15s balance refresh without significant change does not trigger re-render
    }
    lastRoundedBalanceRef.current = roundedBalance;

    if (balance <= 0.01) {
      const zeroRes: AllocationResult = {
        allocations: [],
        liquidReservePercent: 100,
        reasoning: ["Wallet balance is at or below the 0.01 SOL fee buffer required for Devnet transactions."],
        expectedOutcome: "0.00% blended APY (insufficient balance)."
      };
      setAllocation(zeroRes);
      setAllocationSource('rules');
      setIsLoadingAllocation(false);
      return;
    }

    const compatibleOpps = opportunities.filter(o => o.compatible).map(o => ({
      id: o.id,
      protocol: o.protocol,
      name: o.name,
      apy: o.apy,
      tvlUsd: o.tvlUsd,
      riskTier: o.riskTier
    }));

    const policyHash = JSON.stringify(policy);
    const oppsSummary = compatibleOpps.map(o => `${o.id}:${o.apy}`).join(",");
    const cacheKey = `${publicKey.toBase58()}:${roundedBalance}:${policyHash}:${oppsSummary}`;

    if (!forced && lastKeyRef.current === cacheKey && allocation) {
      return;
    }

    // 1. Check last valid proposal cache in localStorage for instant repeat visits
    if (!forced) {
      try {
        const storedLast = localStorage.getItem(`treasuryos:last-proposal:${publicKey.toBase58()}:${SOLANA_CLUSTER}`);
        if (storedLast) {
          const parsed = JSON.parse(storedLast);
          const balanceDiff = Math.abs(parsed.balanceSolRounded - roundedBalance);
          if (parsed.policyHash === policyHash && balanceDiff / roundedBalance <= 0.05) {
            setAllocation(parsed.proposal);
            setAllocationSource('last-proposal');
            setLastUpdatedAllocation(new Date(parsed.generatedAt));
            lastKeyRef.current = cacheKey;
            
            if (!firstRenderLoggedRef.current) {
              firstRenderLoggedRef.current = true;
              const ms = performance.now() - pageLoadTimeRef.current;
              console.log(`[Timing] Page load to first rendered allocation row (cached): ${ms.toFixed(1)}ms`);
              setTimings(prev => ({ ...prev, firstAllocationRenderMs: Number(ms.toFixed(1)) }));
            }

            // Background refresh agent proposal if older than 30 mins
            if (Date.now() - parsed.generatedAt > 30 * 60 * 1000) {
              // trigger background fetch
            } else {
              return;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 2. Instant Deterministic Proposal (Render first, upgrade later)
    const deterministicFallback = getFallbackAllocation(balance, policy, mappedOpportunities, []);
    setAllocation(deterministicFallback);
    setAllocationSource('rules');
    setIsFallback(false);
    setAgentRefining(true);
    setAgentRefinedReady(false);
    setAgentErrorMsg(null);
    setLastUpdatedAllocation(new Date());

    if (!firstRenderLoggedRef.current) {
      firstRenderLoggedRef.current = true;
      const ms = performance.now() - pageLoadTimeRef.current;
      console.log(`[Timing] Page load to first rendered allocation row (rules-based): ${ms.toFixed(1)}ms`);
      setTimings(prev => ({ ...prev, firstAllocationRenderMs: Number(ms.toFixed(1)) }));
    }

    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoadingAllocation(true);
    setErrorAllocation(null);

    const tAllocStart = performance.now();

    try {
      const res = await fetch("/api/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          balanceSol: balance,
          policy,
          opportunities: compatibleOpps.length > 0 ? compatibleOpps : mappedOpportunities
        })
      });

      const allocateMs = performance.now() - tAllocStart;
      console.log(`[Timing] /api/allocate total time: ${allocateMs.toFixed(1)}ms`);
      setTimings(prev => ({
        ...prev,
        allocateTotalMs: Number(allocateMs.toFixed(1)),
        llmTimeMs: Number(allocateMs.toFixed(1))
      }));

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      const result = await res.json();
      const validation = validateAllocation(result, policy, mappedOpportunities);

      if (validation.isValid && result.source !== "fallback") {
        const finalResult: AllocationResult = {
          allocations: result.allocations,
          liquidReservePercent: result.liquidReservePercent,
          reasoning: result.reasoning || ["Agent optimized yield within DAO policy parameters."],
          expectedOutcome: result.expectedOutcome || "Optimal yield achieved."
        };

        setAllocation(finalResult);
        setAllocationSource('agent');
        setIsFallback(false);
        setViolations([]);
        setAgentRefining(false);
        setAgentRefinedReady(true);
        const now = new Date();
        setLastUpdatedAllocation(now);
        lastKeyRef.current = cacheKey;

        // Persist last valid proposal in localStorage
        try {
          localStorage.setItem(`treasuryos:last-proposal:${publicKey.toBase58()}:${SOLANA_CLUSTER}`, JSON.stringify({
            proposal: finalResult,
            balanceSolRounded: roundedBalance,
            policyHash,
            opportunitiesHash: oppsSummary,
            generatedAt: now.getTime(),
            source: 'agent'
          }));
        } catch (e) {
          // ignore
        }
      } else {
        // Agent validation failed or timeout fallback
        setAgentRefining(false);
        setAgentRefinedReady(false);
        setAgentErrorMsg("Agent unavailable or failed validation, showing rules-based proposal.");
      }
    } catch (err: any) {
      console.warn("Background LLM allocate error, keeping rules-based proposal:", err);
      setAgentRefining(false);
      setAgentRefinedReady(false);
      setAgentErrorMsg("Agent unavailable, showing rules-based proposal.");
    } finally {
      setIsLoadingAllocation(false);
      inFlightRef.current = false;
    }
  }, [connected, publicKey, balance, policy, opportunities, mappedOpportunities, allocation]);

  useEffect(() => {
    if (connected && publicKey && balance !== null && opportunities.length > 0) {
      runAllocationGeneration(false);
    }
  }, [connected, publicKey, balance, opportunities, runAllocationGeneration]);

  const regenerateAllocation = async () => {
    await runAllocationGeneration(true);
  };

  return (
    <TreasuryContext.Provider
      value={{
        opportunities,
        isLoadingOpportunities,
        errorOpportunities,
        fetchedAt,
        source,
        stale,
        assetFilterRelaxed,
        aiScoring,
        refreshOpportunities: () => fetchOpportunities(true),

        allocation,
        isLoadingAllocation,
        errorAllocation,
        isFallback,
        violations,
        lastUpdatedAllocation,
        regenerateAllocation,
        policyChecks,
        allocationSource,
        agentRefining,
        agentRefinedReady,
        agentErrorMsg,

        policy,
        setPolicy,
        balance,
        timings
      }}
    >
      {children}
    </TreasuryContext.Provider>
  );
};

export function useTreasury() {
  const context = useContext(TreasuryContext);
  if (!context) {
    throw new Error("useTreasury must be used within a TreasuryProvider");
  }
  return context;
}

export function useOpportunities() {
  const ctx = useTreasury();
  return {
    opportunities: ctx.opportunities,
    isLoading: ctx.isLoadingOpportunities,
    error: ctx.errorOpportunities,
    fetchedAt: ctx.fetchedAt,
    source: ctx.source,
    stale: ctx.stale,
    refresh: ctx.refreshOpportunities
  };
}

export function useAllocation() {
  const ctx = useTreasury();
  return {
    allocation: ctx.allocation,
    isLoading: ctx.isLoadingAllocation,
    error: ctx.errorAllocation,
    isFallback: ctx.isFallback,
    violations: ctx.violations,
    lastUpdated: ctx.lastUpdatedAllocation,
    regenerate: ctx.regenerateAllocation,
    policyChecks: ctx.policyChecks,
    balance: ctx.balance,
    policy: ctx.policy,
    allocationSource: ctx.allocationSource,
    agentRefining: ctx.agentRefining,
    agentRefinedReady: ctx.agentRefinedReady,
    agentErrorMsg: ctx.agentErrorMsg,
    timings: ctx.timings,
    opportunities: ctx.opportunities.map(o => ({
      id: o.id,
      protocol: o.protocol,
      name: o.name,
      apy: o.apy,
      tvl: `$${(o.tvlUsd / 1_000_000).toFixed(1)}M`,
      riskTier: `Tier ${o.riskTier === 'Low' ? '1 (Low)' : o.riskTier === 'Medium' ? '2 (Medium)' : '3 (High)'}`
    }))
  };
}
