import React from "react";
import { Sparkles } from "lucide-react";
import { useWallet as useSolanaWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useExecution } from "../context/ExecutionContext";

interface FloatingPillProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const FloatingPill: React.FC<FloatingPillProps> = ({ currentTab, setCurrentTab }) => {
  const { connected } = useSolanaWallet();
  const { setVisible } = useWalletModal();
  const { execution } = useExecution();

  const handleClick = () => {
    if (!connected) {
      setVisible(true);
      return;
    }
    if (!execution) {
      if (currentTab !== "overview") {
        setCurrentTab("overview");
      }
      setTimeout(() => {
        const el = document.getElementById("proposed-allocation-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    } else {
      if (currentTab !== "overview") {
        setCurrentTab("overview");
      }
      setTimeout(() => {
        const el = document.getElementById("active-allocation-card");
        if (el) {
          el.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  let label = "Review proposal";
  let showBadge = false;

  if (!connected) {
    label = "Connect wallet";
  } else if (execution) {
    label = "View allocation";
  } else {
    label = "Review proposal";
    showBadge = true;
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 select-none">
      <button
        onClick={handleClick}
        className="h-[52px] px-[22px] bg-[var(--ink)] text-white rounded-[999px] shadow-[0_10px_30px_rgba(0,0,0,0.25)] hover:bg-[#222] transition-all flex items-center gap-2.5 font-semibold text-sm cursor-pointer border border-white/10"
      >
        <Sparkles className="w-4 h-4 text-[var(--accent)]" />
        <span>{label}</span>
        {showBadge && (
          <span className="w-5 h-5 rounded-full bg-[var(--accent)] text-white text-[11px] font-bold font-mono flex items-center justify-center">
            1
          </span>
        )}
      </button>
    </div>
  );
};
