// Multi-provider AI resilience. The primary model is Google Gemini (one key runs
// EVERYTHING — the interactive chat assistant, the browser voice guide, and the
// report/notes generation), with Groq (free) and OpenRouter (paid) kept as
// automatic fallbacks so the product never dies if one account is rate-limited.
//   • Gemini is used whenever GOOGLE_GENERATIVE_AI_API_KEY is set (chat + voice + gen).
//   • heavy generation (report, notes) → Gemini, then Groq, then OpenRouter.
//   • the interactive assistant → Gemini, then OpenRouter, then Groq.
// To swap the whole product's brain, set ONE env var — no other file changes.

import { createGroq } from "@ai-sdk/groq"
import { createOpenAI } from "@ai-sdk/openai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { generateText, type LanguageModel } from "ai"

// This module runs server-side only (api/* routes + the Vite dev middleware),
// but lives under the browser tsconfig which has no `process` type. Declare it +
// guard the read so it's safe if the module is ever evaluated in a browser.
declare const process: { env: Record<string, string | undefined> } | undefined
// accept any of the names Google's own tooling uses, so whatever the user sets works.
const envGeminiKey = () =>
  typeof process === "undefined" ? undefined
    : process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? process.env.GOOGLE_API_KEY

// The one place to change the models. Each can be overridden by an env var, so the next
// time a provider retires a model id it is a config change, not a code change.
//
// Verified 2026-10-03 against each provider with the production keys:
//   • llama-3.3-70b-versatile no longer exists on Groq — every Groq fallback had been
//     failing with "does not exist or you do not have access to it".
//   • the OpenRouter account has never bought credits, so the paid llama model always
//     failed with "Insufficient credits". Its :free models work at zero cost (with a
//     daily cap), so the backup is now one of those.
// Until this was found, the three-provider "failover" was really one free-tier Gemini
// key: when its quota ran out, every AI surface failed at once.
const env = (k: string) => (typeof process === "undefined" ? undefined : process.env[k])
const GEMINI_MODEL = env("GEMINI_MODEL") || "gemini-flash-latest"
const GROQ_MODEL = env("GROQ_MODEL") || "openai/gpt-oss-120b"
const OPENROUTER_MODEL = env("OPENROUTER_MODEL") || "qwen/qwen3.8-27b:free"

export interface AIKeys {
  gemini?: string
  groq?: string
  openrouter?: string
}

// Gemini reads GOOGLE_GENERATIVE_AI_API_KEY from the environment by default, so
// no route has to thread the key through — set the env var and it's live.
export function geminiModel(key = envGeminiKey()): LanguageModel | null {
  return key ? createGoogleGenerativeAI({ apiKey: key })(GEMINI_MODEL) : null
}

export function groqModel(key?: string): LanguageModel | null {
  return key ? createGroq({ apiKey: key })(GROQ_MODEL) : null
}

export function openrouterModel(key?: string): LanguageModel | null {
  if (!key) return null
  const provider = createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: key, name: "openrouter" })
  return provider(OPENROUTER_MODEL)
}

/** A provider name (for telemetry/observability). */
export type ProviderName = "gemini" | "openrouter" | "groq"

// ── failure classification + circuit breaker ────────────────────────────────
export type FailKind = "quota" | "rate_limit" | "too_large" | "auth" | "model_not_found" | "timeout" | "error"

/** Classify a provider error. Word-bounded on purpose: the old check matched "rate"
 *  anywhere, so the AI SDK's own "No output gene-RATE-d" wrapper read as a rate limit
 *  and every failure of any kind told users "I'm momentarily at the rate limit". */
export function failKind(e: unknown): FailKind {
  // URLs are stripped first: Gemini's quota error links to ".../docs/rate-limits", and
  // matching inside that link filed a hard quota as a 45 s rate limit. Gemini was then
  // retried on nearly every request, at 9-20 s a time.
  const m = (e instanceof Error ? e.message : String(e)).replace(/https?:\/\/\S+/g, " ")
  // Per-minute limits first: Groq's "Rate limit reached ... tokens per minute ... try
  // again in 12s" also links to its billing page, and must not earn a 10-minute cooldown.
  // a DAILY cap reads like a rate limit but will not clear for hours
  if (/per day|\btpd\b|\brpd\b|daily/i.test(m)) return "quota"
  // "Request too large ... tokens per minute (TPM): Limit 8000" is about THIS request,
  // not the provider: waiting will not help it, and a smaller request would still succeed.
  if (/request too large|too large for model|maximum context length|context[_ ]length[_ ]exceeded/i.test(m)) return "too_large"
  if (/rate[ -]?limit|per minute|\btpm\b|\brpm\b|try again in|too many requests/i.test(m)) return "rate_limit"
  if (/exceeded your current quota|insufficient credits|resource[_ ]exhausted|per day/i.test(m)) return "quota"
  if (/\b429\b/.test(m)) return "rate_limit"
  if (/\b40[13]\b|api key|unauthori[sz]ed|permission denied/i.test(m)) return "auth"
  if (/\b404\b|does not exist|not found|no endpoints|unknown model|decommissioned|no longer supported/i.test(m)) return "model_not_found"
  if (/time[ -]?out|timed out|aborted/i.test(m)) return "timeout"
  return "error"
}

// How long to skip a provider after it fails, by kind. A quota or a missing model will
// not fix itself in seconds; a transient rate limit usually does.
const COOL_MS: Record<FailKind, number> = { quota: 10 * 60e3, model_not_found: 30 * 60e3, auth: 30 * 60e3, rate_limit: 45e3, too_large: 0, timeout: 20e3, error: 15e3 }
const downUntil = new Map<ProviderName, number>()

/** Record a provider failure so the next requests in this instance skip it. */
export function markDown(name: ProviderName, kind: FailKind): void {
  downUntil.set(name, Date.now() + COOL_MS[kind])
}
const isUp = (name: ProviderName) => (downUntil.get(name) ?? 0) <= Date.now()

/** Healthy providers first, cooling-down ones last (never dropped: if everything is
 *  cooling down we still try them all rather than refuse outright). */
function healthFirst<T extends { name: ProviderName }>(xs: T[]): T[] {
  return [...xs.filter((x) => isUp(x.name)), ...xs.filter((x) => !isUp(x.name))]
}

/** Per-provider call options. Namespaced by provider, so each is ignored elsewhere.
 *  gpt-oss on Groq reasons before answering; "low" keeps a chat reply quick. */
export const PROVIDER_OPTIONS = { groq: { reasoningEffort: "low" as const } }

/** The labelled chain, in preference order: Gemini (best quality), Groq (keyed, very
 *  fast, no daily cap), OpenRouter free (zero-cost last resort, daily-capped). */
export function streamingChain(keys: AIKeys): { name: ProviderName; model: LanguageModel }[] {
  return healthFirst([
    { name: "gemini" as const, model: geminiModel(keys.gemini) },
    { name: "groq" as const, model: groqModel(keys.groq) },
    { name: "openrouter" as const, model: openrouterModel(keys.openrouter) },
  ].filter((m): m is { name: ProviderName; model: LanguageModel } => m.model != null))
}

/** Generation chain for non-streaming work (reports, notes, consolidation). */
export function modelChain(keys: AIKeys): LanguageModel[] {
  return streamingChain(keys).map((x) => x.model)
}

/** The streaming/interactive model (chat + voice): the first healthy provider. */
export function streamingModel(keys: AIKeys): LanguageModel | null {
  return streamingChain(keys)[0]?.model ?? null
}

/** generateText across the provider chain — returns the text of the first model that succeeds. */
/** Longest stated rate-limit wait worth sitting out instead of falling back. Callers that
 *  answer through a non-streamed Edge response must stay well inside its 25 s limit;
 *  a streamed one (the report) can afford more. */
const DEFAULT_MAX_WAIT_MS = 12_000

/** The wait a provider asks for in its rate-limit message, if it states one. */
export function statedWaitMs(e: unknown): number | null {
  const m = e instanceof Error ? e.message : String(e)
  const hit = m.match(/(?:try again|retry) in\s+(?:(\d+)m)?\s*(\d+(?:\.\d+)?)\s*(ms|s)\b/i)
  if (!hit) return null
  const mins = hit[1] ? Number(hit[1]) * 60_000 : 0
  const n = Number(hit[2])
  return mins + (hit[3].toLowerCase() === "ms" ? n : n * 1000)
}

export async function generateTextWithFallback(
  keys: AIKeys,
  params: { system: string; prompt: string; temperature?: number },
  label = "generate",
  opts: { maxWaitMs?: number } = {},
): Promise<string> {
  const maxWait = opts.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
  const chain = streamingChain(keys)
  if (!chain.length) throw new Error("No AI provider key configured")
  let lastErr: unknown
  // One line per attempt in the function logs: which provider, what happened, how long.
  // Without it a slow or failing report was invisible: the only trace was a 504.
  // Never logs keys or prompt text, only the provider's own error message.
  const approxTokens = Math.round((params.system.length + params.prompt.length) / 4)
  for (const { name, model } of chain) {
    // The SDK's own retry runs before the error can be classified, so it is off
    // (maxRetries: 0) and the decision is made here instead: a transient failure gets
    // one more try on the same provider, while a quota, rate limit, bad key or missing
    // model moves straight on. The SDK retry used to spend 9-20 s re-asking an exhausted
    // Gemini before every Groq answer, which itself arrived in about 2 s.
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now()
      try {
        const r = await generateText({ model, maxRetries: 0, providerOptions: PROVIDER_OPTIONS, ...params })
        if (r.text && r.text.trim()) {
          console.info(`[ai] ${label} ${name} ok ${Date.now() - t0}ms ~${approxTokens}tok`)
          return r.text
        }
        console.warn(`[ai] ${label} ${name} empty ${Date.now() - t0}ms`)
        break
      } catch (err) {
        lastErr = err
        const kind = failKind(err)
        const stated = kind === "rate_limit" ? statedWaitMs(err) : null
        console.warn(`[ai] ${label} ${name} ${kind} ${Date.now() - t0}ms ~${approxTokens}tok${stated != null ? ` wait=${stated}ms` : ""}: ${(err instanceof Error ? err.message : String(err)).slice(0, 160)}`)
        if (attempt === 0 && (kind === "error" || kind === "timeout")) continue
        // A per-minute cap that names a short wait ("try again in 9.75s") is cheaper to
        // sit out than to fall back: Groq then answers in ~2 s, where the free OpenRouter
        // model took ~36 s for the same report section.
        const wait = attempt === 0 ? stated : null
        if (wait != null && wait <= maxWait) {
          await new Promise((r) => setTimeout(r, wait + 250))
          continue
        }
        markDown(name, kind)
        break
      }
    }
  }
  throw lastErr ?? new Error("All AI providers failed")
}
