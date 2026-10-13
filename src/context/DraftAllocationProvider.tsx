import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletBalance } from "../hooks/useWalletBalance";
import { SOLANA_CLUSTER } from "../lib/solana";
import { useTreasury } from "./TreasuryContext";
import { validateAllocation, AllocationResult } from "../lib/allocation";

export interface DraftItem {
  opportunityId: string;
  percent: number;
}

export interface UserDraft {
  items: DraftItem[];
  reservePercent: number;
  editedAt: number;
  balanceAtCreation: number;
}

interface DraftContextType {
  userDraft: UserDraft | null;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  previewAgentProposal: boolean;
  setPreviewAgentProposal: (val: boolean) => void;
  saveDraft: (items: DraftItem[], reservePercent: number) => void;
  resetDraft: () => void;
  effectiveAllocation: AllocationResult | null;
  effectiveValidation: { isValid: boolean; violations: string[] };
  hasNewAgentProposal: boolean;
  dismissNewAgentAlert: () => void;
  toastMessage: string | null;
}

const DraftContext = createContext<DraftContextType | undefined>(undefined);

export const DraftAllocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { publicKey } = useWallet();
  const walletStr = publicKey ? publicKey.toString() : null;
  const { balance } = useWalletBalance(publicKey);
  const treasury = useTreasury();

  const storageKey = walletStr ? `treasuryos:draft:${walletStr}:${SOLANA_CLUSTER}` : null;

  const [userDraft, setUserDraft] = useState<UserDraft | null>(() => {
    if (!storageKey) return null;
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.items) && typeof parsed.reservePercent === 'number') {
        return parsed;
      }
    } catch (e) {
      console.warn("Corrupt sessionStorage draft", e);
    }
    return null;
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [previewAgentProposal, setPreviewAgentProposal] = useState<boolean>(false);
  const [hasNewAgentProposal, setHasNewAgentProposal] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const lastAgentUpdateRef = useRef<number>(treasury.lastUpdatedAllocation ? treasury.lastUpdatedAllocation.getTime() : 0);

  // Track agent proposal updates to notify if new agent proposal arrives while draft is active
  useEffect(() => {
    if (!treasury.lastUpdatedAllocation) return;
    const t = treasury.lastUpdatedAllocation.getTime();
    if (userDraft && t > lastAgentUpdateRef.current + 2000) {
      setHasNewAgentProposal(true);
    }
    lastAgentUpdateRef.current = t;
  }, [treasury.lastUpdatedAllocation, userDraft]);

  // Balance change check (>5% moves reset draft)
  useEffect(() => {
    if (userDraft && balance !== null && balance > 0 && userDraft.balanceAtCreation > 0) {
      const diff = Math.abs(balance - userDraft.balanceAtCreation) / userDraft.balanceAtCreation;
      if (diff > 0.05) {
        sessionStorage.removeItem(storageKey || "");
        setUserDraft(null);
        setToastMessage("Draft reset: balance changed by more than 5%.");
        setTimeout(() => setToastMessage(null), 5000);
      }
    }
  }, [balance, userDraft, storageKey]);

  // Sync draft to sessionStorage
  useEffect(() => {
    if (!storageKey) return;
    if (userDraft) {
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(userDraft));
      } catch (e) {
        console.error("Failed to save draft", e);
      }
    } else {
      sessionStorage.removeItem(storageKey);
    }
  }, [userDraft, storageKey]);

  // Clear draft if wallet changes
  useEffect(() => {
    setUserDraft(null);
    setIsEditing(false);
    setHasNewAgentProposal(false);
  }, [walletStr]);

  const saveDraft = useCallback((items: DraftItem[], reservePercent: number) => {
    const draft: UserDraft = {
      items,
      reservePercent,
      editedAt: Date.now(),
      balanceAtCreation: balance !== null ? balance : 0
    };
    setUserDraft(draft);
    setIsEditing(false);
    setHasNewAgentProposal(false);
  }, [balance]);

  const resetDraft = useCallback(() => {
    setUserDraft(null);
    setIsEditing(false);
    setHasNewAgentProposal(false);
    if (storageKey) sessionStorage.removeItem(storageKey);
  }, [storageKey]);

  const dismissNewAgentAlert = useCallback(() => {
    setHasNewAgentProposal(false);
  }, []);

  // Compute effective allocation from userDraft if present, else agent proposal
  const effectiveAllocation: AllocationResult | null = React.useMemo(() => {
    if (previewAgentProposal) {
      return treasury.allocation;
    }
    if (!userDraft) {
      return treasury.allocation;
    }

    // Map userDraft items to AllocationItem format
    const allocations = userDraft.items.map(item => {
      const opp = treasury.opportunities.find(o => o.id === item.opportunityId);
      return {
        opportunityId: item.opportunityId,
        label: opp ? opp.name : item.opportunityId,
        percent: item.percent,
        reason: "Custom user allocation override."
      };
    });

    const nonReserveSum = allocations.reduce((acc, x) => acc + x.percent, 0);
    const calculatedReserve = Number((100 - nonReserveSum).toFixed(1));

    const blendedApy = allocations.reduce((acc, item) => {
      const opp = treasury.opportunities.find(o => o.id === item.opportunityId);
      return acc + (item.percent / 100) * (opp ? opp.apy : 0);
    }, 0);

    return {
      allocations,
      liquidReservePercent: calculatedReserve,
      reasoning: [
        "Custom user-configured allocation override.",
        `Liquid reserve set to ${calculatedReserve}% (User Draft).`,
        `Blended strategy APY projected at ${blendedApy.toFixed(2)}%.`
      ],
      expectedOutcome: `Custom allocation projected at ${blendedApy.toFixed(2)}% blended APY.`,
      isFallback: false,
      violations: []
    };
  }, [userDraft, previewAgentProposal, treasury.allocation, treasury.opportunities]);

  const effectiveValidation = React.useMemo(() => {
    if (!effectiveAllocation) return { isValid: false, violations: ["No allocation data available"] };
    const mappedOpps = (treasury.opportunities || []).map(o => ({
      id: o.id,
      protocol: o.protocol,
      name: o.name,
      apy: o.apy,
      tvl: `$${(o.tvlUsd / 1_000_000).toFixed(1)}M`,
      riskTier: `Tier ${o.riskTier === 'Low' ? '1 (Low)' : o.riskTier === 'Medium' ? '2 (Medium)' : '3 (High)'}`
    }));
    return validateAllocation(effectiveAllocation, treasury.policy, mappedOpps);
  }, [effectiveAllocation, treasury.policy, treasury.opportunities]);

  return (
    <DraftContext.Provider value={{
      userDraft: previewAgentProposal ? null : userDraft,
      isEditing,
      setIsEditing,
      previewAgentProposal,
      setPreviewAgentProposal,
      saveDraft,
      resetDraft,
      effectiveAllocation,
      effectiveValidation,
      hasNewAgentProposal: previewAgentProposal ? false : hasNewAgentProposal,
      dismissNewAgentAlert,
      toastMessage
    }}>
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-800 text-white text-xs px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-bounce">
          <span>⚠️ {toastMessage}</span>
        </div>
      )}
      {children}
    </DraftContext.Provider>
  );
};

export const useDraft = () => {
  const ctx = useContext(DraftContext);
  if (!ctx) {
    return {
      userDraft: null,
      isEditing: false,
      setIsEditing: () => {},
      previewAgentProposal: false,
      setPreviewAgentProposal: () => {},
      saveDraft: () => {},
      resetDraft: () => {},
      effectiveAllocation: null,
      effectiveValidation: { isValid: false, violations: [] },
      hasNewAgentProposal: false,
      dismissNewAgentAlert: () => {},
      toastMessage: null
    };
  }
  return ctx;
};
