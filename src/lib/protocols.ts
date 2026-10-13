export interface ProtocolMapping {
  label: string;
  url: string;
  isTrusted: boolean;
}

const TRUSTED_PREFIXES = [
  "kamino",
  "marginfi",
  "save",
  "solend",
  "drift",
  "jito",
  "marinade",
  "sanctum",
  "jupiter",
  "meteora",
  "orca",
  "raydium",
  "lulo",
  "bonk",
  "helius",
  "binance",
  "bybit"
];

const PROTOCOL_MAP: Record<string, { label: string; url: string }> = {
  "kamino-lend": { label: "Kamino Finance", url: "https://app.kamino.finance/" },
  "kamino-liquidity": { label: "Kamino Finance", url: "https://app.kamino.finance/" },
  "save": { label: "SAVE", url: "https://save.finance/" },
  "solend": { label: "SAVE", url: "https://save.finance/" },
  "marginfi": { label: "marginfi", url: "https://app.marginfi.com/" },
  "drift": { label: "Drift Protocol", url: "https://app.drift.trade/" },
  "drift-staked-sol": { label: "Drift Protocol", url: "https://app.drift.trade/" },
  "jito": { label: "Jito", url: "https://www.jito.network/" },
  "jito-liquid-staking": { label: "Jito", url: "https://www.jito.network/" },
  "marinade-finance": { label: "Marinade", url: "https://marinade.finance/" },
  "sanctum": { label: "Sanctum", url: "https://sanctum.so/" },
  "sanctum-validator-lsts": { label: "Sanctum", url: "https://sanctum.so/" },
  "jupiter-staked-sol": { label: "Jupiter", url: "https://jup.ag/" },
  "jupiter-perps": { label: "Jupiter", url: "https://jup.ag/" },
  "meteora": { label: "Meteora", url: "https://app.meteora.ag/" },
  "meteora-dlmm": { label: "Meteora", url: "https://app.meteora.ag/" },
  "orca": { label: "Orca", url: "https://www.orca.so/" },
  "raydium": { label: "Raydium", url: "https://raydium.io/" },
  "lulo": { label: "Lulo", url: "https://lulo.fi/" }
};

export function isTrustedProtocol(project?: string): boolean {
  const norm = (project || "").toLowerCase().trim();
  return TRUSTED_PREFIXES.some(prefix => norm === prefix || norm.startsWith(prefix) || norm.includes(prefix));
}

export function getProtocolInfo(project?: string, defillamaUrl?: string): ProtocolMapping {
  const norm = (project || "").toLowerCase().trim();
  const isTrusted = isTrustedProtocol(norm);

  if (PROTOCOL_MAP[norm]) {
    return { ...PROTOCOL_MAP[norm], isTrusted };
  }

  for (const [key, val] of Object.entries(PROTOCOL_MAP)) {
    if (norm.startsWith(key) || norm.includes(key)) {
      return { ...val, isTrusted: true };
    }
  }

  const titleCased = project
    ? project.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")
    : "DeFi Protocol";

  return {
    label: titleCased,
    url: defillamaUrl || "https://defillama.com/yields",
    isTrusted
  };
}
