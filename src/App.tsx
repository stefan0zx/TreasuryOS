/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { SolanaProviders } from "./components/SolanaProviders";
import { TreasuryProvider } from "./context/TreasuryContext";
import { AllocationProvider } from "./context/AllocationContext";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { Overview } from "./pages/Overview";
import { Opportunities } from "./pages/Opportunities";
import { Policies } from "./pages/Policies";
import { Agent } from "./pages/Agent";
import { Transactions } from "./pages/Transactions";
import { DecisionHistory } from "./pages/DecisionHistory";
import { RPC_URL } from "./lib/solana";
import { runAllocationTests } from "./lib/allocation.test";
import { runPolicyTests } from "./lib/policy.test";
import { runTreasuryHistoryTests } from "./hooks/useTreasuryHistory.test";
import { runProjectionTests } from "./lib/projection.test";

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>("overview");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("treasuryos:sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("treasuryos:sidebar-collapsed", String(next));
    } catch {}
  };

  useEffect(() => {
    console.log('[app] Solana RPC:', RPC_URL);
    try {
      runAllocationTests();
      runPolicyTests();
      runTreasuryHistoryTests();
      runProjectionTests();
    } catch (e) {
      console.error("Unit tests error:", e);
    }
  }, []);

  const renderContent = () => {
    switch (currentTab) {
      case "overview":
        return <Overview setCurrentTab={setCurrentTab} />;
      case "opportunities":
        return <Opportunities />;
      case "policies":
        return <Policies />;
      case "agent":
        return <Agent />;
      case "transactions":
        return <Transactions />;
      case "decision-history":
        return <DecisionHistory />;
      default:
        return <Overview setCurrentTab={setCurrentTab} />;
    }
  };

  return (
    <SolanaProviders>
      <TreasuryProvider>
        <AllocationProvider>
          <div 
            className="min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)] font-sans grid p-4 gap-4 box-border overflow-hidden"
            style={{
              gridTemplateColumns: `${collapsed ? '88px' : '280px'} 1fr`,
              gridTemplateRows: '72px 1fr',
              height: '100vh',
              transition: 'grid-template-columns 200ms ease'
            }}
          >
            {/* Sidebar spanning both rows in column 1 */}
            <div className="row-span-2 col-start-1 h-[calc(100vh-32px)]">
              <Sidebar 
                currentTab={currentTab} 
                setCurrentTab={setCurrentTab} 
                collapsed={collapsed} 
                toggleCollapsed={toggleCollapsed}
                mobileOpen={mobileOpen}
                setMobileOpen={setMobileOpen}
              />
            </div>

            {/* Header in row 1 of column 2 */}
            <div className="col-start-2 row-start-1">
              <Header 
                searchQuery={searchQuery} 
                setSearchQuery={setSearchQuery} 
                currentTab={currentTab} 
                setMobileOpen={setMobileOpen}
              />
            </div>

            {/* Page content in row 2 of column 2 */}
            <main className="col-start-2 row-start-2 overflow-y-auto pr-2">
              <div className="max-w-[1180px] mx-auto px-2 pb-28">
                {renderContent()}
              </div>
            </main>

          </div>
        </AllocationProvider>
      </TreasuryProvider>
    </SolanaProviders>
  );
}
