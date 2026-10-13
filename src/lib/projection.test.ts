import { projectGrowth } from "./projection";

export function runProjectionTests() {
  console.log("Running projectGrowth unit tests...");

  // Case 1: 2 SOL at 6% for 5 years (2 * 1.06^5 = 2.67645... -> 2.6765)
  const case1 = projectGrowth(2, 6, 5);
  console.assert(Math.abs(case1.finalAmount - 2.6765) < 0.0005, `Case 1 finalAmount should be ~2.6765, got ${case1.finalAmount}`);
  console.assert(case1.yearlySeries.length === 6, "Case 1 yearlySeries should have 6 points (year 0 to 5)");
  console.log("✓ Case 1 (2 SOL at 6% for 5 years): PASSED");

  // Case 2: 0% APY (unchanged)
  const case2 = projectGrowth(10, 0, 3);
  console.assert(case2.finalAmount === 10, "Case 2 finalAmount should remain 10");
  console.assert(case2.totalGain === 0, "Case 2 totalGain should be 0");
  console.log("✓ Case 2 (0% APY): PASSED");

  // Case 3: Amount 0
  const case3 = projectGrowth(0, 10, 4);
  console.assert(case3.finalAmount === 0, "Case 3 finalAmount should be 0");
  console.assert(case3.totalGain === 0, "Case 3 totalGain should be 0");
  console.log("✓ Case 3 (Amount 0): PASSED");

  // Case 4: Years = 1
  const case4 = projectGrowth(5, 10, 1);
  console.assert(case4.finalAmount === 5.5, "Case 4 finalAmount should be 5.5");
  console.assert(case4.totalGain === 0.5, "Case 4 totalGain should be 0.5");
  console.log("✓ Case 4 (Years = 1): PASSED");

  console.log("All projectGrowth unit tests passed successfully!");
}
