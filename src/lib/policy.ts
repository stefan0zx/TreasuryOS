import { PolicyConfig } from "./allocation";
import { isTrustedProtocol } from "./protocols";

export interface PoolInput {
  tvlUsd: number;
  apy: number;
  apyBase?: number;
  apyReward?: number;
  apyMean30d?: number;
  ilRisk: string;
  exposure: string;
  stablecoin?: boolean;
  project?: string;
  symbol?: string;
  outlier?: boolean;
}

export interface PoolEvaluation {
  riskTier: "Low" | "Medium" | "High";
  compatible: boolean;
  reasons: string[];
  warnings: string[];
  baseTier: "Low" | "Medium" | "High";
  bumpReason?: string;
}

const KNOWN_PROTOCOLS = new Set([
  "orca",
  "raydium",
  "lulo",
  "phoenix",
  "lifinity"
]);

export function evaluatePool(pool: PoolInput, policy: PolicyConfig): PoolEvaluation {
  const reasons: string[] = [];
  const warnings: string[] = [];
  let baseTierScore = 1; // 1: Low, 2: Medium, 3: High

  const isTrusted = isTrustedProtocol(pool.project);
  const proj = (pool.project || "").toLowerCase().trim();

  // Base tier assignment
  if (isTrusted) {
    baseTierScore = 1; // Low
  } else if (pool.tvlUsd >= 10_000_000 || KNOWN_PROTOCOLS.has(proj)) {
    baseTierScore = 2; // Medium
  } else {
    baseTierScore = 3; // High
  }

  const baseTierMap: Record<number, "Low" | "Medium" | "High"> = { 1: "Low", 2: "Medium", 3: "High" };
  const baseTier = baseTierMap[baseTierScore];

  // 1. Rejections (TVL floor, outlier, APY >= 100)
  if (pool.tvlUsd < 1_000_000) {
    reasons.push("TVL below $1M floor");
  }

  if (pool.outlier === true) {
    reasons.push("Flagged as market outlier");
  }

  if (pool.apy >= 100) {
    reasons.push("APY >= 100% cap exceeded");
  }

  // Risk flags (each adds 1 point)
  const isMultiAsset = pool.ilRisk !== "no" || pool.exposure === "multi";
  const apy = pool.apy || 0;
  const apyReward = pool.apyReward || 0;
  const rewardShare = apy > 0 ? apyReward / apy : 0;
  const isRewardHeavy = rewardShare > 0.7;
  const isApyHigh = apy > 30;
  const isApySpike = pool.apyMean30d !== undefined && pool.apyMean30d > 0 && apy > 2.5 * pool.apyMean30d;

  let bumpCount = 0;
  let bumpReason = "";

  if (isMultiAsset) {
    bumpCount += 1;
    warnings.push("Multi-asset LP / IL risk");
    bumpReason = "Multi-asset LP exposure / IL risk";
  }
  if (isRewardHeavy) {
    bumpCount += 1;
    warnings.push(`Majority of yield from temporary emissions (${Math.round(rewardShare * 100)}% rewards)`);
    if (!bumpReason) bumpReason = "Reward-heavy emissions";
  }
  if (isApyHigh) {
    bumpCount += 1;
    warnings.push("APY unusually high (>30%), likely unsustainable");
    if (!bumpReason) bumpReason = "High APY";
  }
  if (isApySpike) {
    bumpCount += 1;
    warnings.push("APY spike vs 30d average");
    if (!bumpReason) bumpReason = "APY spike vs 30d avg";
  }

  let finalTierScore = baseTierScore;

  if (bumpCount > 0) {
    if (isTrusted && baseTierScore === 1) {
      // Trusted protocols with only flags (b), (c) or (d) stay Low and display flags as warnings.
      // Only flag (a) (multi-asset / IL) can move a trusted protocol from Low to Medium.
      if (isMultiAsset) {
        finalTierScore = 2; // Low -> Medium
      } else {
        // stay Low, warnings shown in UI
      }
    } else {
      // Non-trusted or Medium base: move up by at most one level in total
      finalTierScore = Math.min(baseTierScore + 1, 3);
    }
  }

  finalTierScore = Math.min(Math.max(finalTierScore, 1), 3);
  const riskTier = baseTierMap[finalTierScore];

  // Policy max risk tier evaluation
  const policyMaxRiskNum = policy.maxRisk.includes("1") ? 1 : policy.maxRisk.includes("2") ? 2 : 3;
  const isTierCompatible = finalTierScore <= policyMaxRiskNum;

  if (!isTierCompatible) {
    reasons.push(`Risk tier (${riskTier}) exceeds max allowed policy risk (${policy.maxRisk})`);
  }

  const hasTvlPassed = pool.tvlUsd >= 1_000_000;
  const compatible = hasTvlPassed && isTierCompatible && reasons.length === 0;

  return {
    riskTier,
    compatible,
    reasons,
    warnings,
    baseTier,
    bumpReason: bumpCount > 0 ? bumpReason : undefined
  };
}
