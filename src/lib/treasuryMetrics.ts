import { ExecutionRecord } from "./executionStore";
import { BalanceSnapshot, ChartPoint } from "../hooks/useTreasuryHistory";
import { accruedYield, returnPercentage } from "./yield";

export interface TreasuryMetricsResult {
  totalValue: number;
  liquidSol: number;
  deployedSol: number;
  reserveSol: number;
  blendedApy: number;
  accruedYieldValue: number;
  returnPct: number;
  absoluteChange: number;
  points: ChartPoint[];
  trackingSince: string | null;
  hasRealHistory: boolean;
  status: 'confirmed' | 'pending' | 'failed' | 'none';
  executionStatusText: string;
  mode: 'onchain' | 'simulated';
}

export function computeTreasuryMetrics(
  walletBalance: number | null,
  execution: ExecutionRecord | null,
  walletAddress: string | null,
  snapshots: BalanceSnapshot[],
  timeframe: string,
  now = Date.now()
): TreasuryMetricsResult {
  const balance = walletBalance !== null && walletBalance > 0 ? walletBalance : 0;
  
  let deployedSol = 0;
  let reserveSol = balance;
  let blendedApy = 0;
  let status: 'confirmed' | 'pending' | 'failed' | 'none' = 'none';
  let mode: 'onchain' | 'simulated' = 'simulated';
  let createdAt = 0;
  let executionStatusText = "";

  const isMatchingWallet = execution && walletAddress && execution.wallet === walletAddress;

  if (execution && isMatchingWallet) {
    status = execution.status;
    mode = execution.mode;
    createdAt = execution.createdAt;
    if (status === 'confirmed') {
      deployedSol = execution.proposal.deployedSol || 0;
      reserveSol = execution.proposal.reserveSol || Math.max(0, balance - deployedSol);
      blendedApy = execution.proposal.blendedApy || 5.3;
    } else if (status === 'pending') {
      executionStatusText = "Executing...";
    } else if (status === 'failed') {
      executionStatusText = "Failed";
    }
  }

  let liquidSol = 0;
  let totalValue = 0;

  if (status === 'confirmed' && mode === 'onchain') {
    liquidSol = balance;
    totalValue = balance + deployedSol;
  } else {
    // simulated or none
    liquidSol = Math.max(0, balance - deployedSol);
    totalValue = balance;
  }

  const accruedYieldValue = accruedYield(deployedSol, blendedApy, createdAt, now);

  const rangeMs = timeframe === "7D" ? 7 * 24 * 60 * 60 * 1000 : timeframe === "90D" ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const rangeStart = now - rangeMs;
  const rangeSnaps = snapshots.filter(s => s.t >= rangeStart);

  const returnPct = returnPercentage(deployedSol, blendedApy, createdAt, rangeStart, now);

  const points: ChartPoint[] = [];
  const lastStoredSol = snapshots.length > 0 ? snapshots[snapshots.length - 1].sol : totalValue;
  const currentTotal = totalValue > 0 ? totalValue : lastStoredSol;

  if (rangeSnaps.length < 2) {
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = rangeStart + (rangeMs / steps) * i;
      const d = new Date(t);
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timestamp: t,
        value: currentTotal > 0 ? currentTotal : 0,
        isReal: false
      });
    }
  } else {
    rangeSnaps.forEach((s, idx) => {
      const d = new Date(s.t);
      let markerType: 'deposit' | 'withdrawal' | null = null;
      let markerText = "";
      if (idx > 0) {
        const diff = s.sol - rangeSnaps[idx - 1].sol;
        if (Math.abs(diff) > 0.01 && (!execution || Math.abs(s.t - execution.createdAt) > 60000)) {
          markerType = diff > 0 ? 'deposit' : 'withdrawal';
          markerText = diff > 0 ? `Balance increased by ${diff.toFixed(4)} SOL (deposit or airdrop)` : `Balance decreased by ${Math.abs(diff).toFixed(4)} SOL (withdrawal)`;
        }
      }
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: 'numeric', minute: '2-digit' }),
        timestamp: s.t,
        value: s.sol,
        isReal: true,
        markerType,
        markerText
      });
    });
    const lastPoint = points[points.length - 1];
    if (!lastPoint || now - lastPoint.timestamp > 60000) {
      const d = new Date(now);
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: 'numeric', minute: '2-digit' }),
        timestamp: now,
        value: currentTotal > 0 ? currentTotal : (lastPoint?.value || 0),
        isReal: true
      });
    }
  }

  let absoluteChange = 0;
  if (points.length >= 2) {
    const firstVal = points[0].value;
    const lastVal = points[points.length - 1].value;
    absoluteChange = lastVal - firstVal;
  }

  const trackingSince = rangeSnaps.length >= 2 ? new Date(rangeSnaps[0].t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return {
    totalValue,
    liquidSol,
    deployedSol,
    reserveSol,
    blendedApy,
    accruedYieldValue,
    returnPct,
    absoluteChange,
    points,
    trackingSince,
    hasRealHistory: rangeSnaps.length >= 2,
    status,
    executionStatusText,
    mode
  };
}
