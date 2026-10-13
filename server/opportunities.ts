import { evaluatePool } from "../src/lib/policy";
import { getProtocolInfo } from "../src/lib/protocols";
import { rankOpportunities } from "./opportunityRanker";
import { resolveProtocolLogo } from "./logos";
import fs from "fs";
import path from "path";

const ASSET_UNIVERSE = /^(SOL|WSOL|JITOSOL|MSOL|BSOL|JUPSOL|INF|JSOL|HSOL|VSOL|BNSOL|DSOL|JTO-SOL|BONKSOL|LST)$/;

function matchesAssetUniverse(symbol: string): boolean {
  const clean = (symbol || "").toUpperCase().trim();
  if (!clean) return false;
  const parts = clean.split(/[-/ ]+/);
  return parts.every(part => {
    if (ASSET_UNIVERSE.test(part)) return true;
    if (part.endsWith("SOL") && part.length >= 5) return true;
    return false;
  });
}

interface CacheEntry {
  data: any;
  fetchedAt: number;
}

let memoryCache: CacheEntry | null = null;
let rankedCache: { rankings: any[]; fetchedAt: number } | null = null;
const CACHE_DURATION_MS = 15 * 60 * 1000; // 15 min TTL
const STALE_THRESHOLD_MS = 10 * 60 * 1000; // 10 min background refresh trigger
const CACHE_FILE_PATH = path.resolve(process.cwd(), "server/.cache/opportunities.json");

// Load cached data from disk on startup if available
try {
  if (fs.existsSync(CACHE_FILE_PATH)) {
    const fileContent = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
    const parsed = JSON.parse(fileContent);
    if (parsed && parsed.data && parsed.fetchedAt) {
      memoryCache = parsed;
      console.log(`[TreasuryOS] Loaded cached opportunities from disk (${new Date(parsed.fetchedAt).toISOString()})`);
    }
  }
} catch (e) {
  console.warn("[TreasuryOS] Failed to load opportunities cache from disk:", e);
}

function saveCacheToDisk(entry: CacheEntry) {
  try {
    const dir = path.dirname(CACHE_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(entry), "utf-8");
  } catch (e) {
    console.warn("[TreasuryOS] Failed to save opportunities cache to disk:", e);
  }
}

async function fetchWithRetry(url: string, retries = 1, timeoutMs = 20000): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) continue;
        throw new Error(`HTTP error ${res.status}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
    }
  }
  throw new Error("Failed to fetch yields after retry");
}

let lastDebugInfo: any = {
  stageCounts: {},
  first5RawSolana: [],
  first5RejectedAsset: [],
  poolErrors: []
};

let backgroundRefreshing = false;

export async function getOpportunities(forceRefresh = false): Promise<any> {
  const startTime = Date.now();
  const stages: Record<string, number> = {};
  const poolErrors: any[] = [];
  const rejectedAsset: any[] = [];
  const rawSolanaPools: any[] = [];

  const now = Date.now();
  
  // If we have a cache entry and not forced
  if (!forceRefresh && memoryCache) {
    const age = now - memoryCache.fetchedAt;
    if (age < CACHE_DURATION_MS) {
      // Trigger background refresh if older than 10 minutes (SWR)
      if (age > STALE_THRESHOLD_MS && !backgroundRefreshing) {
        backgroundRefreshing = true;
        getOpportunities(true).catch(e => console.warn("[TreasuryOS] Background SWR refresh error:", e)).finally(() => {
          backgroundRefreshing = false;
        });
      }
      return {
        ...memoryCache.data,
        cached: true,
        stale: false
      };
    }
  }

  try {
    const t0 = Date.now();
    let rawData;
    try {
      rawData = await fetchWithRetry("https://yields.llama.fi/pools");
    } catch (fetchErr: any) {
      if (memoryCache) {
        console.warn("DeFiLlama fetch failed, serving stale cache:", fetchErr);
        return {
          ...memoryCache.data,
          cached: true,
          stale: true
        };
      }
      throw { error: "DeFiLlama API request failed", status: 502, detail: fetchErr.message };
    }

    const pools = Array.isArray(rawData?.data) ? rawData.data : null;
    if (!pools) {
      if (memoryCache) {
        return { ...memoryCache.data, cached: true, stale: true };
      }
      throw { error: "DeFiLlama API returned invalid data structure", status: 502, detail: "Missing data array" };
    }
    stages.fetchMs = Date.now() - t0;
    stages.totalPools = pools.length;

    const defaultPolicy = {
      liquidityFloor: 20,
      targetApy: 5.0,
      maxExposure: 40,
      maxRisk: "Tier 2 (Medium)",
      maxDrawdown: 10.0,
      rebalanceFreq: "Weekly",
      approvalThreshold: 25
    };

    const t1 = Date.now();
    const stage1Pools: any[] = [];

    for (const p of pools) {
      try {
        const chain = (p?.chain ?? "").toLowerCase();
        if (chain !== "solana") continue;

        if (rawSolanaPools.length < 5) {
          rawSolanaPools.push({
            project: p?.project ?? "",
            symbol: p?.symbol ?? "",
            tvlUsd: p?.tvlUsd ?? 0,
            apy: p?.apy ?? 0,
            stablecoin: !!p?.stablecoin,
            exposure: p?.exposure ?? "",
            ilRisk: p?.ilRisk ?? ""
          });
        }

        const tvlUsd = Number(p?.tvlUsd ?? 0);
        if (tvlUsd < 1_000_000) continue;
        const apy = Number(p?.apy ?? 0);
        if (apy <= 0 || apy >= 100) continue;
        if (p?.outlier === true) continue;
        if (p?.stablecoin === true) continue;

        stage1Pools.push(p);
      } catch (e: any) {
        poolErrors.push({ poolId: p?.pool, error: e.message });
      }
    }
    stages.stage1Count = stage1Pools.length;
    stages.stage1Ms = Date.now() - t1;

    const t2 = Date.now();
    let assetFilteredPools: any[] = [];
    let assetFilterRelaxed = false;

    for (const p of stage1Pools) {
      try {
        const symbol = (p?.symbol ?? "").toUpperCase().trim();
        const matches = matchesAssetUniverse(symbol);
        if (matches) {
          assetFilteredPools.push(p);
        } else {
          if (rejectedAsset.length < 5) {
            rejectedAsset.push({
              project: p?.project ?? "",
              symbol,
              reason: "Did not match ASSET_UNIVERSE regex or SOL token rule"
            });
          }
        }
      } catch (e: any) {
        poolErrors.push({ poolId: p?.pool, error: e.message });
      }
    }

    if (assetFilteredPools.length < 3) {
      assetFilterRelaxed = true;
      assetFilteredPools = stage1Pools.filter(p => {
        const symbol = (p?.symbol ?? "").toUpperCase();
        return symbol.includes("SOL");
      });
    }

    stages.assetFilteredCount = assetFilteredPools.length;
    stages.assetFilterRelaxed = assetFilterRelaxed ? 1 : 0;
    stages.stage2Ms = Date.now() - t2;

    const t3 = Date.now();
    const evaluatedPools: any[] = [];

    for (const p of assetFilteredPools) {
      try {
        const tvlUsd = Number(p?.tvlUsd ?? 0);
        const apy = Number(p?.apy ?? 0);
        const protoInfo = getProtocolInfo(p?.project ?? "", p?.url ?? "");
        
        const evalResult = evaluatePool({
          tvlUsd,
          apy,
          apyBase: p?.apyBase ?? 0,
          apyReward: p?.apyReward ?? 0,
          apyMean30d: p?.apyMean30d ?? apy,
          ilRisk: p?.ilRisk ?? "no",
          exposure: p?.exposure ?? "single",
          stablecoin: !!p?.stablecoin,
          project: p?.project ?? "",
          symbol: p?.symbol ?? "",
          outlier: p?.outlier ?? false
        }, defaultPolicy);

        const logoRes = resolveProtocolLogo(p?.project ?? "");
        const opp: any = {
          id: p?.pool ?? Math.random().toString(),
          protocol: p?.project ?? "unknown",
          protocolLabel: protoInfo.label,
          name: `${protoInfo.label} ${p?.symbol ?? ''}${p?.poolMeta ? ' · ' + p.poolMeta : ''}`,
          symbol: p?.symbol ?? "",
          tvlUsd,
          apy,
          apyBase: p?.apyBase ?? 0,
          apyReward: p?.apyReward ?? 0,
          apyMean30d: p?.apyMean30d ?? apy,
          ilRisk: p?.ilRisk ?? "no",
          exposure: p?.exposure ?? "single",
          url: protoInfo.url,
          defillamaUrl: `https://defillama.com/yields/pool/${p?.pool ?? ""}`,
          riskTier: evalResult.riskTier,
          compatible: evalResult.compatible,
          rejectionReasons: evalResult.reasons,
          warnings: evalResult.warnings,
          logoResolved: !!logoRes.logoUrl
        };
        if (logoRes.logoUrl) {
          opp.logoUrl = `/api/logo/${encodeURIComponent(p?.project ?? "")}`;
        }
        evaluatedPools.push(opp);
      } catch (e: any) {
        poolErrors.push({ poolId: p?.pool, error: e.message });
      }
    }
    stages.evaluatedCount = evaluatedPools.length;
    stages.stage3Ms = Date.now() - t3;

    const multiplier: Record<string, number> = { Low: 1.0, Medium: 0.8, High: 0.5 };
    evaluatedPools.sort((a, b) => {
      const scoreA = a.apy * (multiplier[a.riskTier] || 0.5);
      const scoreB = b.apy * (multiplier[b.riskTier] || 0.5);
      return scoreB - scoreA;
    });

    const top30 = evaluatedPools.slice(0, 30);

    if (rankedCache && (now - rankedCache.fetchedAt < CACHE_DURATION_MS)) {
      const rankedMap = new Map(rankedCache.rankings.map(r => [r.id, r]));
      top30.forEach((p: any) => {
        const r: any = rankedMap.get(p.id);
        if (r) {
          p.aiScore = r.score;
          p.aiSummary = r.summary;
        }
      });
    }

    stages.totalMs = Date.now() - startTime;
    console.log(`[TreasuryOS] getOpportunities stage metrics:`, stages);

    lastDebugInfo = {
      stageCounts: stages,
      first5RawSolana: rawSolanaPools,
      first5RejectedAsset: rejectedAsset,
      poolErrors: poolErrors.slice(0, 10)
    };

    const payload = {
      opportunities: top30,
      fetchedAt: new Date().toISOString(),
      source: "DeFiLlama Yields",
      cached: false,
      stale: false,
      aiRanked: !!rankedCache && (now - rankedCache.fetchedAt < CACHE_DURATION_MS),
      assetFilterRelaxed
    };

    const entry: CacheEntry = {
      data: payload,
      fetchedAt: now
    };

    memoryCache = entry;
    saveCacheToDisk(entry);

    return payload;
  } catch (err: any) {
    console.error("Error in getOpportunities:", err);
    if (memoryCache) {
      return {
        ...memoryCache.data,
        cached: true,
        stale: true
      };
    }
    throw err;
  }
}

// Prefetch and warm cache on startup
getOpportunities(false).then(() => {
  console.log("[TreasuryOS] Opportunities cache warmed successfully on startup.");
}).catch(e => {
  console.warn("[TreasuryOS] Startup opportunities warm failed:", e);
});

// Refresh cache every 10 minutes on a timer
setInterval(() => {
  getOpportunities(true).then(() => {
    console.log("[TreasuryOS] Periodic background opportunities refresh completed.");
  }).catch(e => {
    console.warn("[TreasuryOS] Periodic opportunities refresh failed:", e);
  });
}, 10 * 60 * 1000);

export async function getDebugOpportunities(): Promise<any> {
  await getOpportunities(false);
  return lastDebugInfo;
}

export async function rankAndCacheOpportunities(): Promise<any> {
  const now = Date.now();
  if (rankedCache && (now - rankedCache.fetchedAt < CACHE_DURATION_MS)) {
    return rankedCache.rankings;
  }
  if (!memoryCache) {
    await getOpportunities(false);
  }
  const pools = memoryCache?.data?.opportunities || [];
  if (pools.length === 0) return [];

  const rankResult = await rankOpportunities(pools);
  if (rankResult.aiRanked) {
    rankedCache = {
      rankings: rankResult.rankings,
      fetchedAt: now
    };
  }
  return rankResult.rankings;
}
