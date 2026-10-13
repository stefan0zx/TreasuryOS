import { useState, useEffect, useCallback } from "react";
import { PublicKey } from "@solana/web3.js";
import { getWalletSolBalance } from "../lib/solana";

export interface WalletBalanceState {
  balance: number | null;
  isLoading: boolean;
  isError: boolean;
  lastUpdated: Date | null;
  refetch: () => Promise<void>;
}

export function useWalletBalance(publicKey: PublicKey | null): WalletBalanceState {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    console.log("[balance] state change:", {
      value: balance,
      isLoading,
      isError,
      publicKey: publicKey ? publicKey.toBase58().slice(0, 6) : null
    });
  }, [balance, isLoading, isError, publicKey]);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      setIsLoading(false);
      setIsError(false);
      setLastUpdated(null);
      return;
    }

    setIsLoading(true);
    setIsError(false);

    try {
      const sol = await getWalletSolBalance(publicKey);
      setBalance(sol);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch wallet SOL balance:", err);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    fetchBalance();

    if (!publicKey) return;

    // Refresh every 15 seconds
    const interval = setInterval(() => {
      fetchBalance();
    }, 15000);

    return () => clearInterval(interval);
  }, [publicKey, fetchBalance]);

  return {
    balance,
    isLoading,
    isError,
    lastUpdated,
    refetch: fetchBalance,
  };
}
