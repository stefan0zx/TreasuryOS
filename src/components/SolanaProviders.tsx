import React, { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { RPC_URL } from "../lib/solana";
import { ExecutionProvider } from "../context/ExecutionContext";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";
import "../styles/wallet-overrides.css";

interface SolanaProvidersProps {
  children: React.ReactNode;
}

export const SolanaProviders: React.FC<SolanaProvidersProps> = ({ children }) => {
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={RPC_URL}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <ExecutionProvider>
            {children}
          </ExecutionProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

