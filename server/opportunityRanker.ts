import { callLLM } from "./llm";
import { z } from "zod";

const RankedItemSchema = z.object({
  id: z.string(),
  score: z.number().min(0).max(100),
  summary: z.string().max(140)
});

const RankedListSchema = z.array(RankedItemSchema);

export async function rankOpportunities(pools: any[]) {
  try {
    const compactPools = pools.map(p => ({
      id: p.id,
      protocolLabel: p.protocolLabel,
      symbol: p.symbol,
      tvlUsd: Math.round(p.tvlUsd),
      apy: p.apy,
      apyBase: p.apyBase,
      apyReward: p.apyReward,
      apyMean30d: p.apyMean30d,
      ilRisk: p.ilRisk,
      riskTier: p.riskTier
    }));

    const prompt = `You are a professional DAO treasury analyst. Analyze the following top Solana yield pools. Compare base vs reward yield, concentration risk, protocol safety, and TVL depth. 
Return ONLY valid JSON array (no markdown code fences, no preamble, no markdown formatting at all) with items matching:
[
  { "id": "string", "score": number (0-100), "summary": "string max 140 chars" }
]

Pools data:
${JSON.stringify(compactPools)}`;

    // 15 second timeout via AbortController
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    let rawText = "";
    try {
      rawText = await callLLM(prompt);
      clearTimeout(timer);
    } catch (llmErr) {
      clearTimeout(timer);
      throw llmErr;
    }

    let cleaned = rawText.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json/, "").replace(/```$/, "").trim();
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```/, "").replace(/```$/, "").trim();
    }

    const parsed = JSON.parse(cleaned);
    const validated = RankedListSchema.parse(parsed);

    return {
      rankings: validated,
      aiRanked: true
    };
  } catch (err) {
    console.warn("AI ranking timed out or failed, falling back to risk-adjusted APY sort:", err);
    return {
      rankings: [],
      aiRanked: false
    };
  }
}
