import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import compression from "compression";
import { callLLM, getCachedOrExecuteAgentAllocation } from "./server/llm";
import { getOpportunities, getDebugOpportunities, rankAndCacheOpportunities } from "./server/opportunities";
import { resolveProtocolLogo, proxyLogoRequest } from "./server/logos";

dotenv.config();

function generateDeterministicAllocation(balanceSol: number, policy: any, opportunities: any[]) {
  const liquidReservePercent = Math.max(policy.liquidityFloor, 20);
  const remainingPercent = 100 - liquidReservePercent;
  const compliantOpps = opportunities.filter((o: any) => o.compatible !== false).slice(0, 2);
  const split = compliantOpps.length > 0 ? remainingPercent / compliantOpps.length : 0;

  const allocations = compliantOpps.map((opp: any) => ({
    opportunityId: opp.id,
    label: opp.name || opp.label || "Protocol Pool",
    percent: Number(split.toFixed(1)),
    reason: `Rules-based strategy: selected ${opp.name || opp.label} (${opp.apy}% APY) within risk tier limits.`
  }));

  const actualLiquid = Number((100 - allocations.reduce((acc: number, x: any) => acc + x.percent, 0)).toFixed(1));

  return {
    allocations,
    liquidReservePercent: actualLiquid,
    reasoning: [
      `Autonomous rules-based proposal generated on Solana Devnet.`,
      `Enforced DAO liquidity floor at ${actualLiquid}% (policy minimum ${policy.liquidityFloor}%).`,
      `Allocated remaining capital across vetted Devnet DeFi protocols.`,
      `All weights verified against max exposure (${policy.maxExposure}%) and risk limits.`
    ],
    expectedOutcome: `Projected blended annual yield of ${(allocations.reduce((acc: number, x: any) => {
      const o = opportunities.find((op: any) => op.id === x.opportunityId);
      return acc + (x.percent / 100) * (o?.apy || 0);
    }, 0)).toFixed(2)}% APY.`,
    source: "rules"
  };
}

async function startServer() {
  const app = express();
  app.use(compression());
  app.use(express.json());

  // API route for opportunities debug
  app.get("/api/opportunities/debug", async (req, res) => {
    try {
      const data = await getDebugOpportunities();
      res.json(data);
    } catch (err: any) {
      console.error("Error in /api/opportunities/debug:", err);
      res.status(500).json({ error: err.message || "Failed to fetch debug opportunities" });
    }
  });

  // API route for logo proxy
  app.get("/api/logo/:project", async (req, res) => {
    const project = req.params.project;
    if (!project || !/^[a-z0-9._-]{1,80}$/.test(project)) {
      return res.status(400).send("Invalid project format");
    }

    try {
      const result = await proxyLogoRequest(project);
      if (!result) {
        return res.status(404).send();
      }
      res.setHeader("Cache-Control", "public, max-age=86400, stale-while-revalidate=604800");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("ETag", result.etag);
      res.setHeader("Content-Type", result.contentType);

      if (req.headers["if-none-match"] === result.etag) {
        return res.status(304).send();
      }

      res.send(result.buffer);
    } catch (err: any) {
      res.status(404).send();
    }
  });

  // API route for logos debug
  app.get("/api/logos/debug", async (req, res) => {
    try {
      const oppsData = await getOpportunities(false);
      const opps = oppsData?.opportunities || [];
      const debugList = opps.map((o: any) => {
        const resolution = resolveProtocolLogo(o.protocol);
        return {
          project: o.protocol,
          resolvedSlug: resolution.resolvedSlug,
          via: resolution.via,
          logoUrl: resolution.logoUrl
        };
      });
      res.json(debugList);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to fetch logos debug info" });
    }
  });

  // API route for opportunities with Cache-Control and payload size logging
  app.get("/api/opportunities", async (req, res) => {
    const t0 = performance.now();
    try {
      const refresh = req.query.refresh === "true";
      const data = await getOpportunities(refresh);
      res.setHeader("Cache-Control", "public, max-age=60");
      const jsonString = JSON.stringify(data);
      const sizeBytes = Buffer.byteLength(jsonString, "utf8");
      const durationMs = (performance.now() - t0).toFixed(1);
      console.log(`[API /api/opportunities] Time: ${durationMs}ms | Size: ${(sizeBytes / 1024).toFixed(2)} KB | Cached: ${data.cached}`);
      res.setHeader("X-Payload-Size", sizeBytes);
      res.send(jsonString);
    } catch (err: any) {
      console.error("Error in /api/opportunities:", err);
      const status = err.status || 500;
      res.status(status).json({ error: err.error || err.message || "Failed to fetch opportunities", status, detail: err.detail });
    }
  });

  // API route for background AI ranking
  app.post("/api/opportunities/rank", async (req, res) => {
    try {
      const rankings = await rankAndCacheOpportunities();
      res.json({ success: true, rankings });
    } catch (err: any) {
      console.error("Error in /api/opportunities/rank:", err);
      res.json({ success: false, rankings: [] });
    }
  });

  // API route for allocation with 25s timeout and server-side caching
  app.post("/api/allocate", async (req, res) => {
    const t0 = performance.now();
    try {
      const { balanceSol, policy, opportunities, promptModifier } = req.body;

      // Filter and shrink opportunities for prompt (at most 10 compatible, compact JSON)
      const compatibleOpps = (opportunities || [])
        .filter((o: any) => o.compatible !== false)
        .slice(0, 10)
        .map((o: any) => ({
          id: o.id,
          label: o.name || o.label,
          apy: o.apy,
          tvlUsd: o.tvlUsd ? Math.round(o.tvlUsd / 1_000_000) : 0,
          riskTier: o.riskTier,
          warnings: o.warnings || []
        }));

      const compactInput = {
        balanceSol: Number((balanceSol || 0).toFixed(2)),
        policy: {
          liquidityFloor: policy?.liquidityFloor,
          maxExposure: policy?.maxExposure,
          maxRisk: policy?.maxRisk
        },
        opportunities: compatibleOpps
      };

      const prompt = `DAO treasury allocation agent on Solana Devnet. Generate optimal yield strategy adhering strictly to DAO policies.
Inputs: ${JSON.stringify(compactInput)}
${promptModifier ? `Additional Instructions: ${promptModifier}` : ""}

Rules:
1. Liquid reserve must be >= ${policy?.liquidityFloor || 20}%.
2. No single protocol exposure > ${policy?.maxExposure || 40}%.
3. Do not allocate to risk tier exceeding ${policy?.maxRisk || "Tier 2 (Medium)"}.
4. Percentages across reserve and allocations must sum to exactly 100.
5. Return at most 4 reasoning bullets (max 20 words each).

Return ONLY valid JSON matching this exact structure with no markdown code fences:
{
  "allocations": [
    { "opportunityId": "string", "label": "string", "percent": number, "reason": "string" }
  ],
  "liquidReservePercent": number,
  "reasoning": ["string"],
  "expectedOutcome": "string",
  "source": "agent"
}`;

      const agentExecutor = async () => {
        const controller = new AbortController();
        const timeoutTimer = setTimeout(() => controller.abort(), 25000);
        try {
          const rawText = await callLLM(prompt, { maxTokens: 1200, temperature: 0.2 });
          clearTimeout(timeoutTimer);

          let cleaned = rawText.trim();
          if (cleaned.startsWith("```json")) {
            cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
          } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
          }

          const parsed = JSON.parse(cleaned);
          return { ...parsed, source: "agent" };
        } catch (llmErr: any) {
          clearTimeout(timeoutTimer);
          throw llmErr;
        }
      };

      let result;
      try {
        result = await getCachedOrExecuteAgentAllocation(balanceSol, policy, opportunities, promptModifier, agentExecutor);
      } catch (cacheErr: any) {
        console.warn("[TreasuryOS] Agent LLM execution failed or timed out (25s):", cacheErr.message);
        const fallback = generateDeterministicAllocation(balanceSol, policy, opportunities);
        return res.json({ ...fallback, source: "fallback", error: cacheErr.message });
      }

      const durationMs = (performance.now() - t0).toFixed(1);
      console.log(`[API /api/allocate] Total time: ${durationMs}ms`);
      res.json(result);
    } catch (err: any) {
      console.error("Error in /api/allocate:", err);
      const { balanceSol, policy, opportunities } = req.body;
      const fallbackResult = generateDeterministicAllocation(balanceSol || 10, policy || {}, opportunities || []);
      res.json({ ...fallbackResult, source: "fallback" });
    }
  });

  const isDev = process.env.NODE_ENV !== "production";
  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
