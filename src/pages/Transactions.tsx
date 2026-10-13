import React from "react";
import { ArrowLeftRight, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { SOLANA_CLUSTER } from "../lib/solana";

export const Transactions: React.FC = () => {
  const capitalizedCluster = SOLANA_CLUSTER.charAt(0).toUpperCase() + SOLANA_CLUSTER.slice(1);

  const txs = [
    {
      id: "tx-1",
      signature: "5Kx7...9mQ2",
      type: "Yield Harvest",
      protocol: "Kamino Lend",
      amount: "+1.4250 SOL",
      status: "Confirmed",
      time: "2 hours ago"
    },
    {
      id: "tx-2",
      signature: "3Wp9...1jR8",
      type: "Liquidity Rebalance",
      protocol: "Meteora DLMM",
      amount: "5.0000 SOL",
      status: "Confirmed",
      time: "1 day ago"
    },
    {
      id: "tx-3",
      signature: "8Yt2...4kL5",
      type: "Policy Verification",
      protocol: "TreasuryOS Core",
      amount: "0.0000 SOL",
      status: "Verified",
      time: "2 days ago"
    },
    {
      id: "tx-4",
      signature: "2Bn6...7hX9",
      type: "Stake Deposit",
      protocol: "Jito Staking",
      amount: "10.0000 SOL",
      status: "Confirmed",
      time: "4 days ago"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-6 rounded-2xl border border-[#E6E9EF] shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700">On-Chain Activity</span>
            <span className="text-slate-400 text-xs">•</span>
            <span className="text-slate-500 text-xs">Solana {capitalizedCluster}</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Treasury Transactions</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Log of automated agent rebalancing actions and yield collections on Devnet.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-xl bg-[#F5F7FA] border border-[#E6E9EF] text-xs text-slate-600 font-mono">
          Explorer: explorer.solana.com ({capitalizedCluster})
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-[#E6E9EF] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E6E9EF] bg-[#F5F7FA] text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Transaction Signature</th>
                <th className="py-3.5 px-6">Action Type</th>
                <th className="py-3.5 px-6">Protocol</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E9EF] text-sm">
              {txs.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-mono font-medium text-blue-600">
                    <a 
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=${SOLANA_CLUSTER}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 hover:underline"
                    >
                      {tx.signature}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {tx.type}
                  </td>
                  <td className="py-4 px-6 text-slate-600">
                    {tx.protocol}
                  </td>
                  <td className="py-4 px-6 font-mono font-bold text-slate-900">
                    {tx.amount}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right text-xs text-slate-500 font-mono">
                    {tx.time}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
