import { Connection, clusterApiUrl, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

export const SOLANA_CLUSTER = "devnet" as const;
export const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);

// The ONLY Solana Connection instance in the entire application
export const connection = new Connection(RPC_URL, "confirmed");

export function getRpcHostLabel(): string {
  try {
    return new URL(RPC_URL).hostname;
  } catch {
    return "unknown-rpc";
  }
}

export async function getWalletSolBalance(publicKey: PublicKey): Promise<number> {
  console.log(`[balance] fetching SOL for ${publicKey.toBase58()} from ${getRpcHostLabel()}`);
  const lamports = await connection.getBalance(publicKey, "confirmed");
  return lamports / LAMPORTS_PER_SOL;
}
