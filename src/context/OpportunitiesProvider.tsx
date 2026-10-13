import React from "react";
import { useTreasury } from "./TreasuryContext";

export type { OpportunityPool } from "./TreasuryContext";

export function useOpportunities() {
  const ctx = useTreasury();
  return {
    opportunities: ctx.opportunities,
    isLoading: ctx.isLoadingOpportunities,
    error: ctx.errorOpportunities,
    fetchedAt: ctx.fetchedAt,
    source: ctx.source,
    stale: ctx.stale,
    refresh: ctx.refreshOpportunities
  };
}

export const OpportunitiesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
