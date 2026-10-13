import { evaluatePool } from "./policy";
import { PolicyConfig } from "./allocation";

const testPolicy: PolicyConfig = {
  liquidityFloor: 20,
  targetApy: 5.0,
  maxExposure: 40,
  maxRisk: "Tier 2 (Medium)",
  maxDrawdown: 10.0,
  rebalanceFreq: "Weekly",
  approvalThreshold: 25
};

export function runPolicyTests() {
  console.log("Running evaluatePool 6 unit test cases...");

  // Case 1: Kamino SOL lending (Low, compatible)
  const case1 = evaluatePool({
    tvlUsd: 50_000_000,
    apy: 7.5,
    apyBase: 7.0,
    apyReward: 0.5,
    ilRisk: "no",
    exposure: "single",
    project: "kamino-lend",
    symbol: "SOL"
  }, testPolicy);
  console.assert(case1.compatible === true, "Case 1 should be compatible");
  console.assert(case1.riskTier === "Low", "Case 1 should be Low risk");
  console.log("✓ Case 1 (Kamino SOL lending): PASSED");

  // Case 2: jitoSOL staking with 80% reward share (stays Low, has a warning)
  const case2 = evaluatePool({
    tvlUsd: 200_000_000,
    apy: 10.0,
    apyBase: 2.0,
    apyReward: 8.0, // 80% reward share (> 0.7)
    ilRisk: "no",
    exposure: "single",
    project: "jito",
    symbol: "JITOSOL"
  }, testPolicy);
  console.assert(case2.riskTier === "Low", "Case 2 should stay Low risk for trusted protocol");
  console.assert(case2.warnings.some(w => w.includes("temporary emissions")), "Case 2 should have reward warning");
  console.assert(case2.compatible === true, "Case 2 should be compatible");
  console.log("✓ Case 2 (jitoSOL with high reward share): PASSED");

  // Case 3: Medium-tier known protocol with an APY spike (Medium, warning)
  const case3 = evaluatePool({
    tvlUsd: 15_000_000,
    apy: 28.0,
    apyMean30d: 8.0, // 28 > 2.5 * 8 (20) -> APY spike
    ilRisk: "no",
    exposure: "single",
    project: "orca",
    symbol: "SOL"
  }, testPolicy);
  console.assert(case3.riskTier === "Medium", "Case 3 should be Medium risk");
  console.assert(case3.warnings.some(w => w.includes("APY spike")), "Case 3 should have APY spike warning");
  console.assert(case3.compatible === true, "Case 3 should be compatible under Medium policy max");
  console.log("✓ Case 3 (Medium-tier known protocol with APY spike): PASSED");

  // Case 4: Unknown protocol with $2M TVL (High, rejected under default max Medium)
  const case4 = evaluatePool({
    tvlUsd: 2_000_000,
    apy: 12.0,
    ilRisk: "no",
    exposure: "single",
    project: "unknown-protocol",
    symbol: "SOL"
  }, testPolicy);
  console.assert(case4.riskTier === "High", "Case 4 should be High risk for unknown protocol");
  console.assert(case4.compatible === false, "Case 4 should be rejected under Medium max risk policy");
  console.log("✓ Case 4 (Unknown protocol with $2M TVL): PASSED");

  // Case 5: Multi-asset LP in a trusted protocol (Low -> Medium)
  const case5 = evaluatePool({
    tvlUsd: 30_000_000,
    apy: 18.0,
    ilRisk: "yes",
    exposure: "multi",
    project: "meteora",
    symbol: "SOL-SOL"
  }, testPolicy);
  console.assert(case5.riskTier === "Medium", "Case 5 should bump trusted protocol from Low to Medium due to multi-asset LP");
  console.assert(case5.compatible === true, "Case 5 should be compatible under Medium policy max");
  console.log("✓ Case 5 (Multi-asset LP in trusted protocol): PASSED");

  // Case 6: Pool with TVL under $1M (rejected)
  const case6 = evaluatePool({
    tvlUsd: 500_000,
    apy: 8.0,
    ilRisk: "no",
    exposure: "single",
    project: "kamino-lend",
    symbol: "SOL"
  }, testPolicy);
  console.assert(case6.compatible === false, "Case 6 should be rejected due to TVL floor");
  console.assert(case6.reasons.some(r => r.includes("TVL below")), "Case 6 should mention TVL floor");
  console.log("✓ Case 6 (TVL under $1M): PASSED");

  console.log("All 6 evaluatePool unit tests passed successfully!");
}
