import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { 
  ExecutionRecord, 
  getExecutionRecord, 
  saveExecutionRecord, 
  clearExecutionRecord 
} from "../lib/executionStore";

interface ExecutionContextType {
  execution: ExecutionRecord | null;
  recordExecution: (proposal: any, signature: string, mode?: 'onchain' | 'simulated', source?: 'agent' | 'custom' | 'rules' | 'fallback') => void;
  clearExecution: () => void;
}

const ExecutionContext = createContext<ExecutionContextType | undefined>(undefined);

export const ExecutionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { publicKey } = useWallet();
  const walletStr = publicKey ? publicKey.toString() : null;

  const [execution, setExecution] = useState<ExecutionRecord | null>(() => {
    return getExecutionRecord(walletStr);
  });

  // Reload execution record when wallet changes
  useEffect(() => {
    setExecution(getExecutionRecord(walletStr));
  }, [walletStr]);

  const recordExecution = useCallback((proposal: any, signature: string, mode: 'onchain' | 'simulated' = 'simulated', source: 'agent' | 'custom' | 'rules' | 'fallback' = 'agent') => {
    if (!walletStr) return;
    const record: ExecutionRecord = {
      id: "exec_" + Math.random().toString(36).substring(2, 11),
      wallet: walletStr,
      createdAt: Date.now(),
      mode,
      status: 'confirmed',
      signatures: [signature],
      source,
      proposal
    };
    saveExecutionRecord(record);
    setExecution(record);
  }, [walletStr]);

  const clearExecution = useCallback(() => {
    if (!walletStr) return;
    clearExecutionRecord(walletStr);
    setExecution(null);
  }, [walletStr]);

  return (
    <ExecutionContext.Provider value={{ execution, recordExecution, clearExecution }}>
      {children}
    </ExecutionContext.Provider>
  );
};

export const useExecution = (): ExecutionContextType => {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error("useExecution must be used within an ExecutionProvider");
  }
  return context;
};
