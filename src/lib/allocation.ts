export interface Opportunity {
  id: string;
  protocol: string;
  name: string;
  apy: number;
  tvl: string;
  riskTier: string; // e.g. "Tier 1 (Low)", "Tier 2 (Medium)", "Tier 3 (High)"
}

export interface PolicyConfig {
  liquidityFloor: number; // e.g. 20
  targetApy: number;
  maxExposure: number; // e.g. 50
  maxRisk: string; // e.g. "Tier 2 (Medium)"
  maxDrawdown: number;
  rebalanceFreq: string;
  approvalThreshold: number;
}

export interface AllocationItem {
  opportunityId: string;
  label: string;
  percent: number;
  reason: string;
}

export interface AllocationResult {
  allocations: AllocationItem[];
  liquidReservePercent: number;
  reasoning: string[];
  expectedOutcome: string;
  isFallback?: boolean;
  violations?: string[];
}

// Helper to parse risk tier number from string
export function parseRiskTier(tierStr: string): number {
  if (tierStr.includes("1")) return 1;
  if (tierStr.includes("2")) return 2;
  if (tierStr.includes("3")) return 3;
  if (tierStr.includes("4")) return 4;
  return 2; // default medium
}

export function validateAllocation(
  result: any,
  policy: PolicyConfig,
  opportunities: Opportunity[]
): { isValid: boolean; violations: string[] } {
  const violations: string[] = [];

  if (!result || typeof result !== "object") {
    return { isValid: false, violations: ["Invalid result object structure"] };
  }

  const liquidReserve = Number(result.liquidReservePercent);
  const allocations = Array.isArray(result.allocations) ? result.allocations : [];

  if (isNaN(liquidReserve)) {
    violations.push("liquidReservePercent must be a number");
  }

  // Check liquidity floor
  if (liquidReserve < policy.liquidityFloor) {
    violations.push(`Liquid reserve (${liquidReserve}%) is below policy minimum liquidity floor (${policy.liquidityFloor}%)`);
  }

  // Check sum of percentages equals 100
  const totalAllocatedPercent = allocations.reduce((acc: number, item: any) => acc + Number(item.percent || 0), 0);
  const totalSum = (isNaN(liquidReserve) ? 0 : liquidReserve) + totalAllocatedPercent;
  
  if (Math.abs(totalSum - 100) > 0.05) {
    violations.push(`Total allocation percentages sum to ${totalSum.toFixed(2)}%, must sum to exactly 100%`);
  }

  const maxRiskLevel = parseRiskTier(policy.maxRisk);

  for (const item of allocations) {
    const pct = Number(item.percent || 0);
    if (pct > policy.maxExposure) {
      violations.push(`Allocation to ${item.label || item.opportunityId} (${pct}%) exceeds max exposure policy (${policy.maxExposure}%)`);
    }

    const opp = opportunities.find(o => o.id === item.opportunityId);
    if (!opp) {
      violations.push(`Opportunity ID '${item.opportunityId}' does not exist in active opportunities list`);
    } else {
      const oppRiskLevel = parseRiskTier(opp.riskTier);
      if (oppRiskLevel > maxRiskLevel) {
        violations.push(`Opportunity '${opp.name}' risk tier (${opp.riskTier}) exceeds max allowed policy risk (${policy.maxRisk})`);
      }
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

export function getFallbackAllocation(
  balanceSol: number,
  policy: PolicyConfig,
  opportunities: Opportunity[],
  violations: string[] = []
): AllocationResult {
  const liquidReservePercent = Math.max(policy.liquidityFloor, 20);
  const remainingPercent = 100 - liquidReservePercent;

  const maxRiskLevel = parseRiskTier(policy.maxRisk);
  const compliantOpps = opportunities.filter(o => parseRiskTier(o.riskTier) <= maxRiskLevel);

  let allocations: AllocationItem[] = [];

  if (compliantOpps.length > 0) {
    // Sort by APY descending
    const sorted = [...compliantOpps].sort((a, b) => b.apy - a.apy);
    const count = Math.min(sorted.length, 2);
    const splitPercent = Math.min(remainingPercent / count, policy.maxExposure);

    allocations = sorted.slice(0, count).map((opp, idx) => ({
      opportunityId: opp.id,
      label: opp.name,
      percent: Number(splitPercent.toFixed(1)),
      reason: `Compliant high-yield opportunity with ${opp.apy}% APY.`
    }));

    // Adjust remainder into liquid reserve if any percentage gap
    const allocatedSum = allocations.reduce((acc, x) => acc + x.percent, 0);
    const actualLiquid = 100 - allocatedSum;

    return {
      allocations,
      liquidReservePercent: Number(actualLiquid.toFixed(1)),
      reasoning: [
        "LLM output rejected by DAO policy guardrails; engaged deterministic fallback.",
        `Enforced liquidity floor at ${actualLiquid.toFixed(1)}% (minimum ${policy.liquidityFloor}%).`,
        `Selected top ${count} compliant opportunities within risk tier ${policy.maxRisk}.`,
        "All positions verified against max exposure constraints."
      ],
      expectedOutcome: `Fallback allocation projected at ${(allocations.reduce((acc, x) => {
        const o = opportunities.find(op => op.id === x.opportunityId);
        return acc + (x.percent / 100) * (o?.apy || 0);
      }, 0)).toFixed(2)}% blended APY.`,
      isFallback: true,
      violations
    };
  } else {
    return {
      allocations: [],
      liquidReservePercent: 100,
      reasoning: [
        "No compliant third-party opportunities matched policy risk thresholds.",
        `Defaulted 100% of capital into liquid reserve (${balanceSol.toFixed(4)} SOL).`
      ],
      expectedOutcome: "0.00% blended APY (100% liquid reserve safety mode).",
      isFallback: true,
      violations
    };
  }
}
