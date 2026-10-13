import React, { useState, useEffect } from "react";

interface ProtocolLogoProps {
  project?: string;
  logoUrl?: string;
  label: string;
  symbol?: string;
  size?: 20 | 24 | 32 | 40 | 44;
  className?: string;
}

const failedLogoUrls = new Set<string>();

const PROTOCOL_COLORS: Record<string, string> = {
  "Kamino Finance": "bg-indigo-600 text-white",
  "SAVE": "bg-blue-600 text-white",
  "marginfi": "bg-purple-600 text-white",
  "Drift Protocol": "bg-emerald-600 text-white",
  "Jito": "bg-amber-600 text-white",
  "Marinade": "bg-teal-600 text-white",
  "Sanctum": "bg-cyan-600 text-white",
  "Jupiter": "bg-orange-600 text-white",
  "Meteora": "bg-pink-600 text-white",
  "Orca": "bg-sky-600 text-white",
  "Raydium": "bg-violet-600 text-white",
  "Lulo": "bg-rose-600 text-white"
};

function getProtocolColor(label: string): string {
  if (PROTOCOL_COLORS[label]) return PROTOCOL_COLORS[label];
  const colors = [
    "bg-[var(--accent)] text-white",
    "bg-indigo-600 text-white",
    "bg-purple-600 text-white",
    "bg-emerald-600 text-white",
    "bg-teal-600 text-white",
    "bg-amber-600 text-white"
  ];
  let hash = 0;
  for (let i = 0; i < (label || "").length; i++) {
    hash = label.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export const ProtocolLogo: React.FC<ProtocolLogoProps> = React.memo(({
  project,
  logoUrl,
  label,
  symbol,
  size = 32,
  className = ""
}) => {
  const [hasError, setHasError] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const effectiveLogoUrl = logoUrl && !failedLogoUrls.has(logoUrl) ? logoUrl : undefined;

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [effectiveLogoUrl]);

  const radiusClass = size >= 40 ? "rounded-[12px]" : "rounded-[8px]";
  const dimensionClass = `w-[${size}px] h-[${size}px] min-w-[${size}px] min-h-[${size}px]`;

  const initial = (label || symbol || "?").charAt(0).toUpperCase();
  const colorClass = getProtocolColor(label || symbol || "");

  if (!effectiveLogoUrl || hasError) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`flex items-center justify-center font-bold text-xs ${radiusClass} ${colorClass} ${dimensionClass} ${className} shrink-0 select-none shadow-xs`}
        title={label}
      >
        {initial}
      </div>
    );
  }

  return (
    <div 
      style={{ width: size, height: size }}
      className={`relative flex items-center justify-center bg-[var(--tile-raised)] border border-[var(--border)] ${radiusClass} overflow-hidden ${dimensionClass} ${className} shrink-0 select-none shadow-xs p-1`}
      title={label}
    >
      {isLoading && (
        <div className="absolute inset-0 bg-[var(--bg-card)] animate-pulse" />
      )}
      <img
        src={effectiveLogoUrl}
        alt={`${label} logo`}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          if (effectiveLogoUrl) failedLogoUrls.add(effectiveLogoUrl);
          setHasError(true);
          setIsLoading(false);
        }}
        style={{ objectFit: 'contain', width: '100%', height: '100%' }}
        className={`transition-opacity duration-150 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
      />
    </div>
  );
});

ProtocolLogo.displayName = "ProtocolLogo";
