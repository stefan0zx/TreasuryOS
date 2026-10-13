import React from "react";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = "" }) => {
  return (
    <span 
      className={`font-mono uppercase text-[11px] font-medium tracking-[0.28em] text-[var(--text-muted)] ${className}`}
    >
      {children}
    </span>
  );
};
