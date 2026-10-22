import express from "express";
import OpenAI from "openai";
import { buildPrompt } from "./prompt.js";
import { sanitizeMetadata } from "./validate.js";
import { resolveSubject } from "./subject.js";

function extractText(message) {
  if (!message) return "";
  if (typeof message.content === "string") return message.content.trim();
  if (Array.isArray(message.content)) {
    return message.content
      .filter((b) => b.type === "text")
      .map((b) => (b.text || "").trim())
      .join("\n");
  }
  return "";
}

const COST_TIERS = new Set(["low", "medium", "high", "xhigh", "max"]);

/**
 * Default generator: OpenAI Chat Completions, or OpenRouter (OpenAI-compatible),
 * or a placeholder when no key is set.
 *
 * - OPENAI_API_KEY set: calls OpenAI directly (or OPENAI_BASE_URL if given).
 * - OPENROUTER_API_KEY set (and no OPENAI_API_KEY): calls OpenRouter.
 *   By default this uses OpenRouter's Auto Router ("openrouter/auto"), which
 *   dynamically picks a model per request from live OpenRouter-wide usage —
 *   no model name is hardcoded here. Set OPENROUTER_COST_TIER
 *   (low|medium|high|xhigh|max) to steer it, or set OPENAI_MODEL to pin a
 *   specific "provider/model" id instead (e.g. "anthropic/claude-sonnet-4.5").
 *   The response always reports back which model actually answered.
 */
export async function openAiGenerate(prompt, env = process.env) {
  const openAiKey = env.OPENAI_API_KEY;
  const openRouterKey = env.OPENROUTER_API_KEY;
  const key = openAiKey || openRouterKey;
  if (!key) {
    return {
      text: "[AI integration not configured. Set OPENAI_API_KEY or OPENROUTER_API_KEY (see .env.example) to generate retellings.]",
      model: "placeholder",
      placeholder: true,
    };
  }
  const usingOpenRouter = !openAiKey && Boolean(openRouterKey);
  const baseURL = env.OPENAI_BASE_URL || (usingOpenRouter ? "https://openrouter.ai/api/v1" : undefined);
  const client = new OpenAI({
    apiKey: key,
    baseURL,
    timeout: 60_000,
    maxRetries: 1,
    defaultHeaders: usingOpenRouter
      ? { "HTTP-Referer": env.OPENROUTER_SITE_URL || "http://localhost", "X-Title": env.OPENROUTER_SITE_NAME || "Bible-Bridge" }
      : undefined,
  });
  const requestedModel = env.OPENAI_MODEL || (usingOpenRouter ? "openrouter/auto" : "gpt-4o-mini");
  const maxTokens = Number.parseInt(env.OPENAI_MAX_TOKENS, 10) || 4096;
  // OpenRouter (and most OpenAI-compatible third parties) expect max_tokens;
  // OpenAI's own o-series/gpt-5 models require max_completion_tokens instead.
  const tokenParam = baseURL ? { max_tokens: maxTokens } : { max_completion_tokens: maxTokens };
  const isAutoRouter = requestedModel === "openrouter/auto" || requestedModel === "openrouter/auto-beta";
  const costTier = COST_TIERS.has(env.OPENROUTER_COST_TIER) ? env.OPENROUTER_COST_TIER : undefined;
  const plugins = isAutoRouter && costTier
    ? [{ id: requestedModel === "openrouter/auto-beta" ? "auto-beta-router" : "auto-router", cost_tier: costTier }]
    : undefined;
  // The Auto Router (and manual picks) can land on a reasoning model. Reasoning
  // tokens are billed against max_tokens; on a short prompt they can consume the
  // whole budget and leave an empty, truncated response that still reports
  // success. Keep reasoning light and out of the visible answer.
  const extraBody = usingOpenRouter ? { reasoning: { effort: "low", exclude: true }, ...(plugins ? { plugins } : {}) } : undefined;
  const completion = await client.chat.completions.create({
    model: requestedModel,
    messages: [
      { role: "system", content: "You are Bible-Bridge, a careful biblical retelling guide." },
      { role: "user", content: prompt },
    ],
    temperature: 0.8,
    ...tokenParam,
    ...(extraBody ? { ...extraBody } : {}),
  });
  const choice = completion.choices[0];
  const text = extractText(choice?.message);
  if (!text) {
    // Truncated by reasoning tokens, a refusal, or an empty completion — never
    // report success with a blank retelling.
    const reasoningTokens = completion.usage?.completion_tokens_details?.reasoning_tokens;
    const hint = reasoningTokens ? ` (${reasoningTokens} reasoning tokens consumed the budget)` : "";
    throw new Error(
      `Model "${completion.model || requestedModel}" returned no text (finish_reason: ${choice?.finish_reason ?? "unknown"})${hint}. Try again, raise OPENAI_MAX_TOKENS, or pin a non-reasoning OPENAI_MODEL.`,
    );
  }
  // completion.model reflects the model that actually answered (meaningful for the Auto Router).
  return { text, model: completion.model || requestedModel, placeholder: false };
}

function rateLimiter({ windowMs, max }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const ip = req.ip || "local";
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) {
      return res.status(429).json({ error: "Too many requests. Please wait a moment." });
    }
    recent.push(now);
    hits.set(ip, recent);
    next();
  };
}

export function createApp({ data, publicDir, generate = openAiGenerate, rateMax = 20 }) {
  const app = express();
  app.use(express.json({ limit: "100kb" }));
  app.use(express.static(publicDir));

  app.get("/api/data", (_req, res) => res.json(data));

  app.post("/api/retell", rateLimiter({ windowMs: 60_000, max: rateMax }), async (req, res) => {
    const checked = sanitizeMetadata(req.body, data);
    if (!checked.ok) return res.status(400).json({ error: checked.error });
    let subject;
    try {
      subject = await resolveSubject(checked.value, data);
    } catch (err) {
      return res.status(502).json({ error: "Could not find that Bible reference.", detail: err.message });
    }
    if (!subject) return res.status(400).json({ error: "Choose a story, or type a Bible reference in your message." });
    const prompt = buildPrompt(checked.value, data, subject);
    try {
      const result = await generate(prompt);
      res.json({
        prompt,
        metadata: checked.value,
        subject: {
          title: subject.title,
          book: subject.book,
          reference: subject.reference,
          passageText: subject.passageText,
          excerpted: subject.excerpted,
          translation: subject.translation,
          custom: subject.custom,
        },
        ...result,
      });
    } catch (err) {
      console.error("Retell error:", err);
      res.status(502).json({ error: "The AI service failed to produce a retelling.", detail: err.message });
    }
  });

  app.get("/health", (_req, res) => res.json({ ok: true }));

  // Malformed JSON bodies etc.
  app.use((err, _req, res, _next) => {
    const status = err.status || 500;
    res.status(status).json({ error: status === 400 ? "Invalid request body." : "Server error." });
  });

  return app;
}
