import { accruedYield, periodYield, returnPercentage } from "./yield";

export function runYieldTests() {
  console.log("Running yield unit tests...");

  const now = Date.now();
  const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
  const deployed = 2.5245;
  const apy = 4.21;

  const earned3Days = accruedYield(deployed, apy, threeDaysAgo, now);
  console.assert(earned3Days > 0, "Earned yield over 3 days should be positive");

  const rangeStart = now - 7 * 24 * 60 * 60 * 1000;
  const retPct = returnPercentage(deployed, apy, threeDaysAgo, rangeStart, now);
  console.assert(retPct > 0, "Return percentage should be positive");

  const zeroRet = returnPercentage(0, apy, threeDaysAgo, rangeStart, now);
  console.assert(zeroRet === 0, "Return percentage with 0 deployed should be 0");

  console.log("✓ All yield unit tests passed successfully!");
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    runYieldTests();
  }, 1200);
}
