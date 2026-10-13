import fs from "fs";
import path from "path";
import { PROTOCOL_ALIASES } from "./logoAliases";

interface ProtocolEntry {
  slug: string;
  name: string;
  logo?: string;
  parentProtocol?: string;
  chains?: string[];
}

const CACHE_FILE_PATH = path.resolve(process.cwd(), "server/.cache/logos.json");
const IMAGE_CACHE_DIR = path.resolve(process.cwd(), "server/.cache/logos");

let protocolMap = new Map<string, ProtocolEntry>();
let lastFetchedAt = 0;
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

// Ensure cache dirs exist
try {
  const dir = path.dirname(CACHE_FILE_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(IMAGE_CACHE_DIR)) fs.mkdirSync(IMAGE_CACHE_DIR, { recursive: true });
} catch (e) {
  console.warn("[LogoResolver] Failed to create cache directories:", e);
}

// Load persisted cache on startup
function loadDiskIndex() {
  try {
    if (fs.existsSync(CACHE_FILE_PATH)) {
      const content = fs.readFileSync(CACHE_FILE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.protocols)) {
        protocolMap.clear();
        for (const p of parsed.protocols) {
          if (p.slug) {
            protocolMap.set(p.slug.toLowerCase(), p);
          }
        }
        lastFetchedAt = parsed.fetchedAt || Date.now();
        console.log(`[LogoResolver] Loaded ${protocolMap.size} protocols from disk cache.`);
      }
    }
  } catch (e) {
    console.warn("[LogoResolver] Failed to load logo index from disk:", e);
  }
}

loadDiskIndex();

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
  throw new Error("Failed to fetch protocols after retry");
}

export async function refreshProtocolIndex(force = false): Promise<void> {
  const now = Date.now();
  if (!force && protocolMap.size > 0 && (now - lastFetchedAt < CACHE_DURATION_MS)) {
    return;
  }

  try {
    console.log("[LogoResolver] Fetching protocols from DeFiLlama...");
    const raw = await fetchWithRetry("https://api.llama.fi/protocols");
    if (!Array.isArray(raw)) throw new Error("Invalid protocols response");

    const newMap = new Map<string, ProtocolEntry>();
    const parentSlugs = new Set<string>();

    // First pass: collect Solana protocols and note parentProtocol references
    for (const p of raw) {
      const chains = Array.isArray(p?.chains) ? p.chains.map((c: string) => c.toLowerCase()) : [];
      const isSolana = chains.includes("solana");
      if (isSolana) {
        const entry: ProtocolEntry = {
          slug: p.slug,
          name: p.name,
          logo: p.logo,
          parentProtocol: p.parentProtocol,
          chains
        };
        newMap.set(p.slug.toLowerCase(), entry);
        if (p.parentProtocol) {
          parentSlugs.add(p.parentProtocol.toLowerCase());
        }
      }
    }

    // Second pass: include parent protocols needed for resolution
    for (const p of raw) {
      if (p.slug && parentSlugs.has(p.slug.toLowerCase()) && !newMap.has(p.slug.toLowerCase())) {
        newMap.set(p.slug.toLowerCase(), {
          slug: p.slug,
          name: p.name,
          logo: p.logo,
          parentProtocol: p.parentProtocol,
          chains: p.chains
        });
      }
    }

    if (newMap.size > 0) {
      protocolMap = newMap;
      lastFetchedAt = now;
      try {
        const payload = {
          fetchedAt: now,
          protocols: Array.from(protocolMap.values())
        };
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(payload), "utf-8");
        console.log(`[LogoResolver] Successfully updated logo index with ${protocolMap.size} Solana protocols.`);
      } catch (e) {
        console.warn("[LogoResolver] Failed to save logo index to disk:", e);
      }
    }
  } catch (err) {
    console.warn("[LogoResolver] Failed to refresh protocol index from DeFiLlama:", err);
    if (protocolMap.size === 0) {
      loadDiskIndex();
    }
  }
}

// Warm up index on startup
refreshProtocolIndex(true).catch(e => console.warn("[LogoResolver] Startup refresh error:", e));

// Periodic background refresh every 12 hours
setInterval(() => {
  refreshProtocolIndex(true).catch(e => console.warn("[LogoResolver] Periodic refresh error:", e));
}, 12 * 60 * 60 * 1000);

const SUFFIXES = [
  "-lend",
  "-lending",
  "-liquidity",
  "-liquid-staking",
  "-staked-sol",
  "-lsts",
  "-lst",
  "-infinity",
  "-dlmm",
  "-amm",
  "-perps",
  "-finance",
  "-protocol",
  "-v2",
  "-v3"
];

export interface ResolutionResult {
  project: string;
  resolvedSlug: string | null;
  via: 'exact' | 'alias' | 'stripped' | 'token' | 'name' | 'parent' | 'unresolved';
  logoUrl: string | null;
}

export function resolveProtocolLogo(projectInput: string): ResolutionResult {
  const rawProject = (projectInput || "").trim().toLowerCase();
  if (!rawProject) {
    return { project: projectInput, resolvedSlug: null, via: 'unresolved', logoUrl: null };
  }

  // 1. Exact slug match
  let entry = protocolMap.get(rawProject);
  if (entry && entry.logo) {
    return { project: projectInput, resolvedSlug: entry.slug, via: 'exact', logoUrl: entry.logo };
  }

  // 2. Hand-written alias map
  const alias = PROTOCOL_ALIASES[rawProject];
  if (alias) {
    entry = protocolMap.get(alias.toLowerCase());
    if (entry && entry.logo) {
      return { project: projectInput, resolvedSlug: entry.slug, via: 'alias', logoUrl: entry.logo };
    }
  }

  // 3. Suffix stripped match
  let strippedSlug = rawProject;
  for (const suf of SUFFIXES) {
    if (strippedSlug.endsWith(suf)) {
      strippedSlug = strippedSlug.slice(0, strippedSlug.length - suf.length);
      break;
    }
  }
  if (strippedSlug !== rawProject) {
    entry = protocolMap.get(strippedSlug);
    if (entry && entry.logo) {
      return { project: projectInput, resolvedSlug: entry.slug, via: 'stripped', logoUrl: entry.logo };
    }
    // Also check alias for stripped
    const aliasStripped = PROTOCOL_ALIASES[strippedSlug];
    if (aliasStripped) {
      entry = protocolMap.get(aliasStripped.toLowerCase());
      if (entry && entry.logo) {
        return { project: projectInput, resolvedSlug: entry.slug, via: 'stripped', logoUrl: entry.logo };
      }
    }
  }

  // 4. First hyphen-separated token
  const firstToken = rawProject.split('-')[0];
  if (firstToken && firstToken !== rawProject) {
    entry = protocolMap.get(firstToken);
    if (entry && entry.logo) {
      return { project: projectInput, resolvedSlug: entry.slug, via: 'token', logoUrl: entry.logo };
    }
    const aliasToken = PROTOCOL_ALIASES[firstToken];
    if (aliasToken) {
      entry = protocolMap.get(aliasToken.toLowerCase());
      if (entry && entry.logo) {
        return { project: projectInput, resolvedSlug: entry.slug, via: 'token', logoUrl: entry.logo };
      }
    }
  }

  // 5. Normalized name match (lowercase, alphanumeric only)
  const normInput = rawProject.replace(/[^a-z0-9]/g, '');
  if (normInput) {
    for (const [_, p] of protocolMap.entries()) {
      const normName = (p.name || "").toLowerCase().replace(/[^a-z0-9]/g, '');
      if (normName && normName === normInput && p.logo) {
        return { project: projectInput, resolvedSlug: p.slug, via: 'name', logoUrl: p.logo };
      }
    }
  }

  // 6. Parent protocol logo
  if (entry && entry.parentProtocol) {
    const parentEntry = protocolMap.get(entry.parentProtocol.toLowerCase());
    if (parentEntry && parentEntry.logo) {
      return { project: projectInput, resolvedSlug: parentEntry.slug, via: 'parent', logoUrl: parentEntry.logo };
    }
  }

  // Also check if any found entry has a parentProtocol we can check
  if (entry && entry.parentProtocol) {
    const parentEntry = protocolMap.get(entry.parentProtocol.toLowerCase());
    if (parentEntry && parentEntry.logo) {
      return { project: projectInput, resolvedSlug: parentEntry.slug, via: 'parent', logoUrl: parentEntry.logo };
    }
  }

  return { project: projectInput, resolvedSlug: null, via: 'unresolved', logoUrl: null };
}

// In-memory LRU cache for image bytes (max 200 entries)
const imageMemoryCache = new Map<string, { buffer: Buffer; contentType: string; etag: string }>();
const MAX_IMAGE_CACHE_SIZE = 200;

export async function proxyLogoRequest(project: string): Promise<{ buffer: Buffer; contentType: string; etag: string } | null> {
  const resolution = resolveProtocolLogo(project);
  if (!resolution.logoUrl) return null;

  const urlStr = resolution.logoUrl;
  // SSRF protection: allow only https, only icons.llama.fi
  try {
    const parsedUrl = new URL(urlStr);
    if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "icons.llama.fi") {
      console.warn("[LogoProxy] Blocked non-allowed logo URL:", urlStr);
      return null;
    }
  } catch (e) {
    return null;
  }

  const cacheKey = resolution.resolvedSlug || project;
  if (imageMemoryCache.has(cacheKey)) {
    const cached = imageMemoryCache.get(cacheKey)!;
    return cached;
  }

  // Check disk cache
  const diskFilePath = path.join(IMAGE_CACHE_DIR, `${cacheKey.replace(/[^a-z0-9._-]/g, '_')}.bin`);
  const metaFilePath = diskFilePath + ".meta.json";
  try {
    if (fs.existsSync(diskFilePath) && fs.existsSync(metaFilePath)) {
      const meta = JSON.parse(fs.readFileSync(metaFilePath, "utf-8"));
      const buffer = fs.readFileSync(diskFilePath);
      const resObj = { buffer, contentType: meta.contentType, etag: meta.etag };
      if (imageMemoryCache.size >= MAX_IMAGE_CACHE_SIZE) {
        const firstKey = imageMemoryCache.keys().next().value;
        if (firstKey) imageMemoryCache.delete(firstKey);
      }
      imageMemoryCache.set(cacheKey, resObj);
      return resObj;
    }
  } catch (e) {
    // ignore disk cache read error
  }

  // Fetch image with 5-second timeout, max 300 KB, no redirects to other hosts
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(urlStr, {
      signal: controller.signal,
      redirect: "error" // no redirects
    });
    clearTimeout(timer);

    if (!res.ok) return null;

    const contentType = res.headers.get("content-type") || "";
    // Only allow image/png, image/jpeg, image/webp (reject SVG and everything else)
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    const matchedType = validTypes.find(t => contentType.toLowerCase().includes(t));
    if (!matchedType) {
      console.warn("[LogoProxy] Rejected content type:", contentType, "for url:", urlStr);
      return null;
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength > 300 * 1024) {
      console.warn("[LogoProxy] Image exceeded 300KB limit:", arrayBuf.byteLength);
      return null;
    }

    const buffer = Buffer.from(arrayBuf);
    const etag = `W/"${Buffer.from(cacheKey).toString('base64')}-${buffer.length}"`;

    const resultObj = { buffer, contentType: matchedType, etag };

    // Store in memory
    if (imageMemoryCache.size >= MAX_IMAGE_CACHE_SIZE) {
      const firstKey = imageMemoryCache.keys().next().value;
      if (firstKey) imageMemoryCache.delete(firstKey);
    }
    imageMemoryCache.set(cacheKey, resultObj);

    // Store on disk
    try {
      fs.writeFileSync(diskFilePath, buffer);
      fs.writeFileSync(metaFilePath, JSON.stringify({ contentType: matchedType, etag }), "utf-8");
    } catch (e) {
      // ignore disk write error
    }

    return resultObj;
  } catch (err) {
    clearTimeout(timer);
    console.warn("[LogoProxy] Error fetching logo from URL:", urlStr, err);
    return null;
  }
}
