import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

interface AgentCacheEntry {
  data: any;
  cachedAt: number;
}

const agentResponseCache = new Map<string, AgentCacheEntry>();
const inFlightAgentRequests = new Map<string, Promise<any>>();
const AGENT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function callLLM(prompt: string, options?: { maxTokens?: number; temperature?: number; reasoningEffort?: string }): Promise<string> {
  const apiKey = process.env.LLM_API_KEY || process.env.NVIDIA_API_KEY || process.env.GEMINI_API_KEY;
  const baseUrl = process.env.LLM_BASE_URL || "https://integrate.api.nvidia.com/v1";
  const modelName = process.env.LLM_MODEL || "z-ai/glm-5-3";
  const reasoningEffort = options?.reasoningEffort || process.env.LLM_REASONING_EFFORT || "low";
  const maxTokens = options?.maxTokens || 1200;
  const temperature = options?.temperature ?? 0.2;

  if (!apiKey || apiKey.includes("MY_")) {
    throw new Error("API key not configured or valid");
  }

  const isNvidia = apiKey.startsWith("nvapi-") || process.env.LLM_PROVIDER === "nvidia" || (process.env.LLM_API_KEY && !apiKey.startsWith("AIza"));

  if (isNvidia) {
    const makeRequestBody = (includeReasoning: boolean) => {
      const body: any = {
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
        stream: false
      };
      if (includeReasoning && reasoningEffort) {
        body.reasoning_effort = reasoningEffort;
      }
      return body;
    };

    let response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(makeRequestBody(true))
    });

    if (!response.ok && response.status === 400) {
      // Retry once without reasoning_effort if provider rejected it
      const errText = await response.text();
      if (errText.toLowerCase().includes("reasoning")) {
        console.warn("[TreasuryOS] Provider rejected reasoning_effort, retrying without it:", errText);
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(makeRequestBody(false))
        });
      } else {
        throw new Error(`NVIDIA NIM API error (${response.status}): ${errText}`);
      }
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`NVIDIA NIM API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } else {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return response.text || "";
  }
}

export async function getCachedOrExecuteAgentAllocation(
  balanceSol: number,
  policy: any,
  opportunities: any[],
  promptModifier: string | undefined,
  executor: () => Promise<any>
): Promise<any> {
  const roundedBalance = Number(balanceSol.toFixed(2));
  const policyHash = crypto.createHash("md5").update(JSON.stringify(policy)).digest("hex");
  const oppsSummary = opportunities.map(o => `${o.id}:${o.apy}`).sort().join(",");
  const oppsHash = crypto.createHash("md5").update(oppsSummary).digest("hex");
  const cacheKey = `${roundedBalance}:${policyHash}:${oppsHash}:${promptModifier || ""}`;

  const now = Date.now();
  const cached = agentResponseCache.get(cacheKey);
  if (cached && (now - cached.cachedAt < AGENT_CACHE_TTL)) {
    return cached.data;
  }

  if (inFlightAgentRequests.has(cacheKey)) {
    return await inFlightAgentRequests.get(cacheKey);
  }

  const promise = (async () => {
    const result = await executor();
    agentResponseCache.set(cacheKey, { data: result, cachedAt: Date.now() });
    return result;
  })().finally(() => {
    inFlightAgentRequests.delete(cacheKey);
  });

  inFlightAgentRequests.set(cacheKey, promise);
  return await promise;
}
