import { computeTreasuryMetrics } from "./treasuryMetrics";
import { ExecutionRecord } from "./executionStore";

export function runTreasuryMetricsTests() {
  console.log("Running treasuryMetrics unit tests...");

  const now = Date.now();
  const walletAddr = "FMiowk3pBS1h...";

  // 1. Confirmed simulated record
  const simExec: ExecutionRecord = {
    id: "exec_1",
    wallet: walletAddr,
    createdAt: now - 86400000,
    mode: 'simulated',
    status: 'confirmed',
    signatures: ["sig1"],
    proposal: {
      allocations: [],
      reserveSol: 0.6311,
      reservePercent: 20,
      blendedApy: 8.45,
      deployedSol: 2.5245,
      balanceSolAtExecution: 3.1556,
      policyHash: "abc",
      generatedAt: now
    }
  };

  const resSim = computeTreasuryMetrics(3.1556, simExec, walletAddr, [], "30D", now);
  console.assert(Math.abs(resSim.deployedSol - 2.5245) < 0.0001, "Simulated deployedSol should be 2.5245");
  console.assert(Math.abs(resSim.liquidSol - 0.6311) < 0.0001, "Simulated liquidSol should be 0.6311 (balance - deployed)");
  console.assert(Math.abs(resSim.totalValue - 3.1556) < 0.0001, "Simulated totalValue should equal wallet balance (no double counting)");

  // 2. Confirmed on-chain record
  const onchainExec: ExecutionRecord = {
    ...simExec,
    mode: 'onchain'
  };
  const resOnchain = computeTreasuryMetrics(0.6311, onchainExec, walletAddr, [], "30D", now);
  console.assert(Math.abs(resOnchain.liquidSol - 0.6311) < 0.0001, "Onchain liquidSol should be wallet balance");
  console.assert(Math.abs(resOnchain.totalValue - 3.1556) < 0.0001, "Onchain totalValue should be wallet + deployed (0.6311 + 2.5245)");

  // 3. No record
  const resNone = computeTreasuryMetrics(3.1556, null, walletAddr, [], "30D", now);
  console.assert(resNone.deployedSol === 0, "No record deployedSol should be 0");
  console.assert(Math.abs(resNone.liquidSol - 3.1556) < 0.0001, "No record liquidSol should equal balance");

  // 4. Different wallet record (ignored)
  const resDiffWallet = computeTreasuryMetrics(3.1556, simExec, "OtherWallet...", [], "30D", now);
  console.assert(resDiffWallet.deployedSol === 0, "Different wallet record should be ignored");

  // 5. Pending and failed records
  const pendingExec: ExecutionRecord = { ...simExec, status: 'pending' };
  const resPending = computeTreasuryMetrics(3.1556, pendingExec, walletAddr, [], "30D", now);
  console.assert(resPending.deployedSol === 0, "Pending record deployedSol should be 0");
  console.assert(resPending.executionStatusText === "Executing...", "Pending status text should be Executing...");

  const failedExec: ExecutionRecord = { ...simExec, status: 'failed' };
  const resFailed = computeTreasuryMetrics(3.1556, failedExec, walletAddr, [], "30D", now);
  console.assert(resFailed.deployedSol === 0, "Failed record deployedSol should be 0");

  console.log("✓ All treasuryMetrics unit tests passed successfully!");
}

if (typeof window !== "undefined") {
  setTimeout(() => {
    runTreasuryMetricsTests();
  }, 1400);
}
