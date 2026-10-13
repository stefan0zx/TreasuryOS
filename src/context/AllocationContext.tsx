import React from "react";
import { useTreasury } from "./TreasuryContext";
import { DraftAllocationProvider, useDraft } from "./DraftAllocationProvider";
import { AllocationResult, validateAllocation } from "../lib/allocation";

export { useDraft } from "./DraftAllocationProvider";

export function useAllocation() {
  const ctx = useTreasury();
  const draftCtx = useDraft();

  const effective = draftCtx.effectiveAllocation || ctx.allocation;

  return {
    allocation: effective,
    agentAllocation: ctx.allocation,
    isLoading: ctx.isLoadingAllocation,
    error: ctx.errorAllocation,
    isFallback: ctx.isFallback,
    violations: draftCtx.effectiveValidation.violations.length > 0 ? draftCtx.effectiveValidation.violations : ctx.violations,
    lastUpdated: ctx.lastUpdatedAllocation,
    regenerate: ctx.regenerateAllocation,
    policyChecks: ctx.policyChecks,
    balance: ctx.balance,
    policy: ctx.policy,
    isCustomDraft: !!draftCtx.userDraft && !draftCtx.previewAgentProposal,
    opportunities: ctx.opportunities.map(o => ({
      id: o.id,
      protocol: o.protocol,
      name: o.name,
      apy: o.apy,
      tvl: `$${(o.tvlUsd / 1_000_000).toFixed(1)}M`,
      riskTier: `Tier ${o.riskTier === 'Low' ? '1 (Low)' : o.riskTier === 'Medium' ? '2 (Medium)' : '3 (High)'}`
    }))
  };
}

export const AllocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DraftAllocationProvider>
      {children}
    </DraftAllocationProvider>
  );
};
