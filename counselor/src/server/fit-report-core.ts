// The Package-Fit report writer — the AI layer behind the marketing site's /fit.
//
// The site computes a DETERMINISTIC conversion report client-side (the journey,
// the future plan, the buying plan — structure, names, prices and links all
// fixed). It then POSTs that structure here with the respondent's six dimension
// scores, signals and their own free-text reflections. We ask the model to
// REWRITE ONLY THE PROSE — every "why", the summary, the closing — so the report
// reads like a senior counsellor who actually read their words, then merge those
// strings back onto the fixed structure. The model can never invent a price, a
// programme name or a link; if it returns nothing usable, the site keeps the
// deterministic prose. One job: convert honestly.

import { type AIKeys, generateTextWithFallback } from "./ai-providers"

interface JourneyStep { name: string; meta?: string; why: string; to?: string; cta?: string }
interface FuturePhase { horizon: string; move: string }
interface BuyStep { when: string; item: string; meta?: string; why: string }

interface FitReport {
  journeyTitle: string
  summary: string
  journey: JourneyStep[]
  journeyWhy: string
  futurePlan: FuturePhase[]
  buyingPlan: BuyStep[]
  closing: string
  ai: boolean
}

interface FitContext {
  firstName?: string
  stageLabel?: string
  track?: string
  dims?: { key: string; label: string; value: number; read: string }[]
  signals?: string[]
  primaryName?: string
  primaryFit?: number
  runnerUpName?: string
  reflections?: { r_crux?: string; r_future?: string }
}

const asStr = (v: unknown): string => (typeof v === "string" ? v.trim() : "")
const asStrArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x.trim() : "")) : []

/** Pull the first balanced JSON object out of a model response (fences/prose safe). */
function extractJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf("{")
  if (start < 0) return {}
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inStr) {
      if (esc) esc = false
      else if (ch === "\\") esc = true
      else if (ch === '"') inStr = false
      continue
    }
    if (ch === '"') inStr = true
    else if (ch === "{") depth++
    else if (ch === "}") {
      depth--
      if (depth === 0) {
        try { return JSON.parse(text.slice(start, i + 1)) as Record<string, unknown> } catch { return {} }
      }
    }
  }
  return {}
}

function systemPrompt(name: string, stageLabel: string): string {
  return [
    `You are the senior career counsellor at SetMyCareer, personally writing the closing of a free Package-Fit report for ${name || "the reader"}${stageLabel ? ` (${stageLabel})` : ""}.`,
    "Voice: warm, precise, grounded, second person ('you'). Speak like someone who has read their words closely and genuinely wants the best next step for them — never like an ad.",
    "Your job is to make them feel accurately seen and quietly confident to begin — a soft, honest conversion, not a hard sell.",
    "HARD RULES:",
    "- NEVER invent or change a programme name, a price, a number, or a link. Those are fixed by the payload — you only write prose around them.",
    "- Ground every reason in their actual six dimension scores and, wherever they wrote something, in THEIR OWN WORDS (quote a short phrase back to them where it lands).",
    "- No hype words ('amazing', 'revolutionary'), no fake urgency, no guarantees of outcomes. Honesty is the conversion.",
    "- Keep each string tight: summary ≤ 3 sentences; each 'why' ≤ 2 sentences; closing ≤ 2 sentences.",
    "OUTPUT: return ONLY one JSON object, no markdown, no commentary.",
  ].join("\n")
}

function buildPrompt(report: FitReport, ctx: FitContext): string {
  const dims = (ctx.dims ?? []).map((d) => `${d.label} ${d.value}/100 (${d.read})`).join("; ")
  const crux = asStr(ctx.reflections?.r_crux)
  const dream = asStr(ctx.reflections?.r_future)
  const lines: string[] = [
    `RESPONDENT: ${ctx.firstName || "—"} · ${ctx.stageLabel || "—"} · ${ctx.track || "—"} track.`,
    `BEST FIT: ${ctx.primaryName} (${ctx.primaryFit}% match). Runner-up: ${ctx.runnerUpName}.`,
    `SIX DIMENSIONS: ${dims || "—"}.`,
    ctx.signals?.length ? `SIGNALS: ${ctx.signals.join(", ")}.` : "",
    crux ? `THEIR OWN WORDS — the real question: "${crux}".` : "They did not write the crux question.",
    dream ? `THEIR OWN WORDS — the dream outcome: "${dream}".` : "They did not describe a dream outcome.",
    "",
    "THE FIXED STRUCTURE you are writing prose for (do NOT change names/meta/order):",
    `journeyTitle: ${report.journeyTitle}`,
    `journey items (in order): ${report.journey.map((j, i) => `[${i}] ${j.name}${j.meta ? ` — ${j.meta}` : ""}`).join(" | ")}`,
    `futurePlan phases (in order): ${report.futurePlan.map((f, i) => `[${i}] ${f.horizon}`).join(" | ")}`,
    `buyingPlan steps (in order): ${report.buyingPlan.map((b, i) => `[${i}] ${b.when}: ${b.item}${b.meta ? ` (${b.meta})` : ""}`).join(" | ")}`,
    "",
    "Return ONLY this JSON object:",
    "{",
    '  "summary": string — 2-3 sentences. Open by reflecting their real question back (quote a phrase if they gave one), then name why the best-fit journey answers it.',
    '  "journeyTitle": string — keep it essentially the same phrase; you may polish wording but keep every programme name intact.',
    '  "journeyWhy": string — 1-2 sentences: why THIS shape (anchor + any follow-ups), tied to their stakes/support/urgency scores.',
    `  "journeyWhys": string[] — EXACTLY ${report.journey.length} items, one per journey item in order, each ≤ 2 sentences on why that step is there.`,
    `  "futureMoves": string[] — EXACTLY ${report.futurePlan.length} items, one per future phase in order, each a vivid concrete move for that horizon.`,
    `  "buyingWhys": string[] — EXACTLY ${report.buyingPlan.length} items, one per buying step in order, each ≤ 2 sentences, reassuring and low-pressure.`,
    '  "closing": string — ≤ 2 sentences. Warm, direct, addresses them by name, invites the first step without pushing.',
    "}",
  ]
  return lines.filter(Boolean).join("\n")
}

/** Merge model prose onto the fixed deterministic structure (prose only). */
function merge(report: FitReport, o: Record<string, unknown>): FitReport {
  const summary = asStr(o.summary)
  const journeyTitle = asStr(o.journeyTitle)
  const journeyWhy = asStr(o.journeyWhy)
  const closing = asStr(o.closing)
  const journeyWhys = asStrArr(o.journeyWhys)
  const futureMoves = asStrArr(o.futureMoves)
  const buyingWhys = asStrArr(o.buyingWhys)

  return {
    journeyTitle: journeyTitle || report.journeyTitle,
    summary: summary || report.summary,
    journeyWhy: journeyWhy || report.journeyWhy,
    closing: closing || report.closing,
    journey: report.journey.map((j, i) => ({ ...j, why: journeyWhys[i] || j.why })),
    futurePlan: report.futurePlan.map((f, i) => ({ ...f, move: futureMoves[i] || f.move })),
    buyingPlan: report.buyingPlan.map((b, i) => ({ ...b, why: buyingWhys[i] || b.why })),
    ai: true,
  }
}

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
}

export async function handleFitReportRequest(request: Request, keys: AIKeys): Promise<Response> {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS })
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: CORS })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...CORS } })

  let report: FitReport, ctx: FitContext
  try {
    const body = (await request.json()) as { report?: FitReport; context?: FitContext }
    if (!body?.report || !Array.isArray(body.report.journey)) return json({ ok: false, reason: "no report" }, 400)
    report = body.report
    ctx = body.context ?? {}
  } catch {
    return json({ ok: false, reason: "bad json" }, 400)
  }

  // No keys configured → tell the client to keep its deterministic prose. Never error.
  if (!keys.gemini && !keys.groq && !keys.openrouter) return json({ ok: false, reason: "no ai" })

  try {
    const text = await generateTextWithFallback(keys, {
      temperature: 0.6,
      maxRetries: 1, // keep the Edge call snappy — one shot, one retry, then fall back
      system: systemPrompt(asStr(ctx.firstName), asStr(ctx.stageLabel)),
      prompt: buildPrompt(report, ctx),
    })
    const merged = merge(report, extractJsonObject(text))
    return json({ ok: true, report: merged })
  } catch {
    // any provider failure → graceful fallback (client already has the deterministic report)
    return json({ ok: false, reason: "ai failed" })
  }
}
