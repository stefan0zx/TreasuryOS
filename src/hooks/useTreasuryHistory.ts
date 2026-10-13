import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";

export interface BalanceSnapshot {
  t: number; // epoch ms
  sol: number;
}

export interface ChartPoint {
  date: string;
  timestamp: number;
  value: number;
  isReal: boolean;
  markerType?: 'deposit' | 'withdrawal' | null;
  markerText?: string;
}

const MAX_ENTRIES = 2000;
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export interface HistoryOptions {
  isLoading?: boolean;
  isError?: boolean;
  connected?: boolean;
}

export function useTreasuryHistory(
  publicKey: PublicKey | null, 
  currentBalance: number | null, 
  timeframe: string,
  options?: HistoryOptions
) {
  const [snapshots, setSnapshots] = useState<BalanceSnapshot[]>([]);

  const isLoading = options?.isLoading ?? false;
  const isError = options?.isError ?? false;
  const connected = options?.connected ?? true;

  useEffect(() => {
    if (!publicKey) return;

    const key = `treasuryos:history:${publicKey.toBase58()}`;
    let existing: BalanceSnapshot[] = [];
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        existing = JSON.parse(raw);
        if (!Array.isArray(existing)) existing = [];
        console.log("[history] loaded stored snapshots for wallet", publicKey.toBase58().slice(0, 6), existing);
      }
    } catch (e) {
      existing = [];
    }

    const now = Date.now();
    const cutoff = now - NINETY_DAYS_MS;
    
    // Scrub existing snapshots: filter out old ones AND any zero or negative sol entries
    existing = existing.filter(s => s.t >= cutoff && s.sol > 0);

    const lastSnap = existing[existing.length - 1];
    
    const isValidBalance = currentBalance !== null && currentBalance > 0 && !isNaN(currentBalance);
    const shouldRecord = isValidBalance && !isLoading && !isError && connected && (
      !lastSnap || 
      (now - lastSnap.t >= ONE_HOUR_MS) || 
      (Math.abs(currentBalance - lastSnap.sol) > 0.0001)
    );

    let reason = "skipped";
    if (!publicKey) reason = "no_wallet";
    else if (!connected) reason = "disconnected";
    else if (isLoading) reason = "loading";
    else if (isError) reason = "error";
    else if (!isValidBalance) reason = "invalid_balance";
    else if (!lastSnap) reason = "first_snapshot";
    else if (now - lastSnap.t >= ONE_HOUR_MS) reason = "time_interval";
    else if (Math.abs(currentBalance - lastSnap.sol) > 0.0001) reason = "balance_change";

    console.log("[history] snapshot", {
      wallet: publicKey.toBase58().slice(0, 6),
      sol: currentBalance,
      reason,
      isLoading,
      isError,
      connected,
      t: now
    });

    if (shouldRecord && isValidBalance) {
      existing.push({ t: now, sol: currentBalance });
      if (existing.length > MAX_ENTRIES) {
        existing = existing.slice(existing.length - MAX_ENTRIES);
      }
      try {
        localStorage.setItem(key, JSON.stringify(existing));
      } catch (e) {
        // ignore storage quota
      }
    }

    setSnapshots(existing);
  }, [publicKey, currentBalance, isLoading, isError, connected]);

  const rangeMs = timeframe === "7D" ? 7 * 24 * 60 * 60 * 1000 : timeframe === "90D" ? 90 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  const rangeStart = Date.now() - rangeMs;
  const rangeSnaps = snapshots.filter(s => s.t >= rangeStart);

  const points: ChartPoint[] = [];
  const lastStoredSol = snapshots.length > 0 ? snapshots[snapshots.length - 1].sol : (currentBalance && currentBalance > 0 ? currentBalance : 0);
  const currentSol = (currentBalance !== null && currentBalance > 0) ? currentBalance : lastStoredSol;
  const now = Date.now();

  if (rangeSnaps.length < 2) {
    const steps = 6;
    for (let i = 0; i <= steps; i++) {
      const t = rangeStart + (rangeMs / steps) * i;
      const d = new Date(t);
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timestamp: t,
        value: currentSol > 0 ? currentSol : 0,
        isReal: false
      });
    }
  } else {
    rangeSnaps.forEach(s => {
      const d = new Date(s.t);
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: 'numeric', minute: '2-digit' }),
        timestamp: s.t,
        value: s.sol,
        isReal: true
      });
    });
    const lastPoint = points[points.length - 1];
    if (!lastPoint || now - lastPoint.timestamp > 60000) {
      const d = new Date(now);
      points.push({
        date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: 'numeric', minute: '2-digit' }),
        timestamp: now,
        value: currentSol > 0 ? currentSol : (lastPoint?.value || 0),
        isReal: true
      });
    }
  }

  let changePct = 0;
  let absoluteChange = 0;
  if (points.length >= 2) {
    const firstVal = points[0].value;
    const lastVal = points[points.length - 1].value;
    absoluteChange = lastVal - firstVal;
    if (firstVal > 0) {
      changePct = (absoluteChange / firstVal) * 100;
    }
  }

  const trackingSince = rangeSnaps.length >= 2 ? new Date(rangeSnaps[0].t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  return {
    points,
    snapshots,
    changePct,
    absoluteChange,
    trackingSince,
    hasRealHistory: rangeSnaps.length >= 2
  };
}
