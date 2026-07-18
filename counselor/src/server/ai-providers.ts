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

// The one place to change the model. `gemini-flash-latest` = the fast, cheap
// current flagship-flash; pin to e.g. "gemini-2.5-flash" for a fixed version.
const GEMINI_MODEL = "gemini-flash-latest"
const GROQ_MODEL = "llama-3.3-70b-versatile"
const OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct"

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

/** Generation chain for non-streaming work: Gemini first, then Groq, then OpenRouter. */
export function modelChain(keys: AIKeys): LanguageModel[] {
  return [geminiModel(keys.gemini), groqModel(keys.groq), openrouterModel(keys.openrouter)].filter((m): m is LanguageModel => m != null)
}

/** A provider name (for telemetry/observability). */
export type ProviderName = "gemini" | "openrouter" | "groq"

/** The interactive chat/voice chain, LABELLED and in preference order (Gemini →
 *  OpenRouter → Groq). Labelled so callers can (a) fail over to the next provider
 *  when one is down and (b) report which model actually served the answer. */
export function streamingChain(keys: AIKeys): { name: ProviderName; model: LanguageModel }[] {
  return [
    { name: "gemini" as const, model: geminiModel(keys.gemini) },
    { name: "openrouter" as const, model: openrouterModel(keys.openrouter) },
    { name: "groq" as const, model: groqModel(keys.groq) },
  ].filter((m): m is { name: ProviderName; model: LanguageModel } => m.model != null)
}

/** The streaming/interactive model (chat + voice): Gemini first, then OpenRouter, then Groq. */
export function streamingModel(keys: AIKeys): LanguageModel | null {
  return geminiModel(keys.gemini) ?? openrouterModel(keys.openrouter) ?? groqModel(keys.groq)
}

/** generateText across the provider chain — returns the text of the first model that succeeds. */
export async function generateTextWithFallback(
  keys: AIKeys,
  params: { system: string; prompt: string; temperature?: number; maxRetries?: number },
): Promise<string> {
  const chain = modelChain(keys)
  if (!chain.length) throw new Error("No AI provider key configured")
  let lastErr: unknown
  for (const model of chain) {
    try {
      const r = await generateText({ model, maxRetries: 2, ...params })
      if (r.text && r.text.trim()) return r.text
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr ?? new Error("All AI providers failed")
}
