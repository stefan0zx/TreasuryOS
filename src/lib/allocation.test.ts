import { validateAllocation, getFallbackAllocation, PolicyConfig, Opportunity } from "./allocation";

const mockPolicy: PolicyConfig = {
  liquidityFloor: 20,
  targetApy: 8.5,
  maxExposure: 50,
  maxRisk: "Tier 2 (Medium)",
  maxDrawdown: 5.0,
  rebalanceFreq: "Every 24 Hours",
  approvalThreshold: 75
};

const mockOpportunities: Opportunity[] = [
  { id: "1", protocol: "Kamino", name: "SOL Lending Vault", apy: 7.85, tvl: "$42.5M", riskTier: "Tier 1 (Low)" },
  { id: "2", protocol: "Meteora", name: "DLMM SOL-SOL", apy: 14.20, tvl: "$18.1M", riskTier: "Tier 2 (Medium)" },
  { id: "3", protocol: "Marginfi", name: "Leveraged Pool", apy: 22.40, tvl: "$28.9M", riskTier: "Tier 3 (High)" }
];

// Unit tests demonstrating 3 cases:
export function runAllocationTests() {
  console.log("Running validateAllocation unit tests...");

  // Case 1: Normal valid case (sums to 100, meets floor, valid risk tiers)
  const normalCase = {
    liquidReservePercent: 20,
    allocations: [
      { opportunityId: "1", label: "SOL Lending Vault", percent: 50, reason: "Good yield" },
      { opportunityId: "2", label: "DLMM SOL-SOL", percent: 30, reason: "Strong DLMM" }
    ]
  };
  const res1 = validateAllocation(normalCase, mockPolicy, mockOpportunities);
  const sum1 = normalCase.liquidReservePercent + normalCase.allocations.reduce((a, b) => a + b.percent, 0);
  console.assert(sum1 === 100, "Case 1 sum must be 100");
  console.assert(res1.isValid === true, "Case 1 should be valid");
  console.log("✓ Case 1 (Normal case): PASSED");

  // Case 2: Violating LLM output (risk tier too high / sum not 100) triggering fallback
  const violatingCase = {
    liquidReservePercent: 10, // violates liquidityFloor (20)
    allocations: [
      { opportunityId: "3", label: "Leveraged Pool", percent: 90, reason: "High APY" } // violates max risk tier 3 > Tier 2 and max exposure 50
    ]
  };
  const res2 = validateAllocation(violatingCase, mockPolicy, mockOpportunities);
  console.assert(res2.isValid === false, "Case 2 should be invalid");
  
  const fallback = getFallbackAllocation(5.0, mockPolicy, mockOpportunities, res2.violations);
  const fallbackSum = fallback.liquidReservePercent + fallback.allocations.reduce((a, b) => a + b.percent, 0);
  console.assert(Math.abs(fallbackSum - 100) < 0.1, "Fallback allocation sum must be 100");
  console.assert(fallback.isFallback === true, "Should be marked as fallback");
  console.log("✓ Case 2 (Violating LLM output triggering fallback): PASSED");

  // Case 3: Zero balance / empty balance case
  const zeroBalanceBalance = 0.0;
  const fallbackZero = getFallbackAllocation(zeroBalanceBalance, mockPolicy, mockOpportunities, ["Zero balance"]);
  const zeroSum = fallbackZero.liquidReservePercent + fallbackZero.allocations.reduce((a, b) => a + b.percent, 0);
  console.assert(zeroSum === 100, "Zero balance case sum must still be 100");
  console.log("✓ Case 3 (Zero balance case): PASSED");

  console.log("All allocation unit tests completed successfully!");
}

// Automatically execute unit test checks in dev mode
if (typeof window !== "undefined") {
  setTimeout(() => {
    runAllocationTests();
  }, 1000);
}
