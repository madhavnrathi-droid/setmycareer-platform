// Real AI report-prose generation, shared by the edge function (api/report.ts)
// and the Vite dev middleware. Turns a fully-assembled scaffold payload (built by
// the caller — facts, scores, routes, journey, session summaries, transcript
// quotes, and the counsellor's own notes) into a McKinsey-grade AINarrative the
// report renderer drops in place of its deterministic prose.
//
// Like notes-core, this uses Groq's llama-3.3-70b-versatile via generateText +
// defensive JSON parsing — NOT generateObject — because llama-3.3 doesn't support
// the json_schema structured-output mode. One full narrative is too long for a
// single reliable completion, so we fan the work out across three smaller
// generateText calls and merge them, always returning a well-formed AINarrative
// even if a sub-call fails (missing fields fall back to "").

import { type AIKeys, generateTextWithFallback } from "./ai-providers"

export interface AINarrative {
  framingThesis: string
  executiveSummary: string[]
  journey: { key: string; narrative: string }[]
  sectionNarratives: {
    personality: string
    interests: string
    abilities: string
    clusters: string
    jobGroups: string
    workRoles: string
    wellbeing: string
  }
  jobMarket: string[]
  routeNarratives: { id: string; rationale: string }[]
  counsellorSynthesis: string
  recommendations: string[]
  pullQuotes: string[]
}

/** A fully-formed, empty narrative — the floor we always return. */
function emptyNarrative(): AINarrative {
  return {
    framingThesis: "",
    executiveSummary: [],
    journey: [],
    sectionNarratives: {
      personality: "",
      interests: "",
      abilities: "",
      clusters: "",
      jobGroups: "",
      workRoles: "",
      wellbeing: "",
    },
    jobMarket: [],
    routeNarratives: [],
    counsellorSynthesis: "",
    recommendations: [],
    pullQuotes: [],
  }
}

/** Pull a JSON object out of an LLM response, tolerating fences / stray prose. */
function parseJsonObject(raw: string): Record<string, unknown> {
  let s = raw.trim()
  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence) s = fence[1].trim()
  const a = s.indexOf("{")
  const b = s.lastIndexOf("}")
  if (a >= 0 && b > a) s = s.slice(a, b + 1)
  try {
    const o = JSON.parse(s)
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : ""
}

/** Coerce to a clean string[] (drop blanks); tolerate a single string. */
function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(asString).filter(Boolean)
  const s = asString(v)
  return s ? [s] : []
}

/** Coerce to [{ key/id, <field> }] pairs, tolerating loose shapes. */
function asKeyedArray(
  v: unknown,
  keyName: "key" | "id",
  valueName: string,
): { k: string; val: string }[] {
  if (!Array.isArray(v)) return []
  const out: { k: string; val: string }[] = []
  for (const item of v) {
    if (item && typeof item === "object") {
      const o = item as Record<string, unknown>
      const k = asString(o[keyName])
      const val = asString(o[valueName])
      if (k && val) out.push({ k, val })
    }
  }
  return out
}

// The shared system prompt — the heart of the McKinsey-grade voice. Every
// sub-call gets this, plus its own task line, so tone/constraints never drift.
function systemPrompt(preferredName: string, pronouns: string): string {
  const name = preferredName || "the client"
  const pn = pronouns || "they/them"
  return [
    `You are an elite career strategist writing the prose for a career-assessment report for ${name} (pronouns: ${pn}).`,
    "",
    "VOICE & ADDRESS:",
    `- Address ${name} directly in the SECOND PERSON ("you", "your"). Use the name "${name}" naturally; honour the pronouns ${pn} when referring to ${name} in the third person.`,
    "- Warm, precise, candid. No hype, no cheerleading, no emoji, no exclamation marks.",
    "",
    "STANDARD — McKinsey-grade:",
    "- Lead with a clear FRAMING THESIS: the central tension or the defining shift that organises everything else.",
    '- Frame growth as a "shift from X to Y" wherever it fits — name where you are now and where the evidence points.',
    "- Every claim must be EVIDENCE-GROUNDED: cite the real numbers, bands, codes, probabilities, and verbatim quotes supplied in the payload. NEVER invent numbers, scores, percentages, route names, or quotes that are not in the payload.",
    "- Explain hard ideas with concrete METAPHORS and short worked examples a non-expert can picture. Prefer the vivid concrete image over the abstract noun.",
    "- Be ACTION-ORIENTED: end reasoning on what it implies for a decision or a next move.",
    "",
    "COUNSELLOR NOTES CARRY HIGH WEIGHT:",
    "- The counsellor's notes are the most authoritative human signal in the payload. Let them VISIBLY shape the synthesis and the recommendations — privilege them over the scores when they conflict, and reference what the counsellor observed.",
    "",
    "HONESTY:",
    "- Keep honest caveats: probabilities are estimates, scores are point-in-time, and the market — not the model — ultimately decides outcomes. Say so plainly where it matters, without undercutting the guidance.",
    "",
    "OUTPUT:",
    "- Respond with ONLY a single JSON object — no markdown fences, no commentary, no trailing prose. Use exactly the keys requested. All values are plain prose strings (no markdown).",
  ].join("\n")
}

// Stringify the caller-built payload compactly for the prompt body, with a hard
// cap so a single call always completes. The caller is responsible for the
// payload's contents; we just relay it to the model.
function payloadText(input: unknown, limit: number): string {
  let s: string
  try {
    s = JSON.stringify(input)
  } catch {
    s = String(input)
  }
  return s.length > limit ? s.slice(0, limit) : s
}

export async function generateReport(
  input: unknown,
  keys: AIKeys,
): Promise<AINarrative> {
  if (!keys.groq && !keys.openrouter) throw new Error("No AI provider configured")

  // Pull the two voice anchors off the payload if present (purely for the system
  // prompt's address line); everything else is relayed verbatim to the model.
  const root = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
  const client = (root.client && typeof root.client === "object" ? root.client : root) as Record<string, unknown>
  const preferredName = asString(client.preferredName) || asString(client.name)
  const pronouns = asString(client.pronouns)
  const system = systemPrompt(preferredName, pronouns)

  const temperature = 0.4

  // The caller now sends the client's FULL record: a big `dossier` (every score,
  // note, session, the complete transcript, tests, history) and the raw
  // `transcript`. Pull those out and give them their own generous budgets so the
  // model reads + quotes real evidence rather than a truncated digest. `factsLite`
  // is the compact scaffold (numbers/routes/job-groups) WITHOUT the big blobs.
  const dossier = asString(root.dossier)
  const transcript = asString(root.transcript)
  const factsLite = payloadText({ ...root, dossier: undefined, transcript: undefined }, 9000)
  const transcriptBlock = transcript
    ? `\n\nFULL SESSION TRANSCRIPT (primary evidence — read it closely; quote VERBATIM and attribute each quote to its moment/session):\n${transcript.slice(0, 15000)}`
    : ""
  const dossierBlock = dossier
    ? `\n\nFULL CLIENT RECORD (read for specifics — scores, every note, every session, history):\n${dossier.slice(0, 15000)}`
    : ""

  // ── Split the narrative across three parallel calls ─────────────────────────
  // Each returns a small JSON object so it completes reliably; we merge below.

  // Call A — the spine: framing thesis, executive summary, the five journey
  // stages, the counsellor-driven synthesis — grounded in the FULL transcript.
  const callA = generateTextWithFallback(keys, {
    temperature,
    system,
    prompt:
      `SCAFFOLD FACTS (JSON):\n${factsLite}${transcriptBlock}\n\n` +
      "Write the report SPINE, grounded in the transcript above. Return ONLY a JSON object with exactly these keys:\n" +
      '- "framingThesis": string — one punchy paragraph naming the central tension / defining shift, in the second person.\n' +
      '- "executiveSummary": string[] — 3-4 paragraphs, second person, grounded in the real numbers AND in what was actually said across sessions.\n' +
      '- "journey": array of objects { "key": string, "narrative": string } with EXACTLY these five keys in order: "problem", "assessment", "sessions", "synthesis", "future". Quote the client VERBATIM from the transcript at least once per stage where one fits, and reason ACROSS sessions to show change over time.\n' +
      '- "counsellorSynthesis": string — 1-2 paragraphs that integrate the counsellor notes HEAVILY and reference specific transcript moments; the counsellor\'s observations should visibly drive the read.\n' +
      "Return the JSON object now.",
  })

  // Call B — the section reads: one tight paragraph per analytical section,
  // pulling specifics from the full client record.
  const callB = generateTextWithFallback(keys, {
    temperature,
    system,
    prompt:
      `SCAFFOLD FACTS (JSON):\n${factsLite}${dossierBlock}\n\n` +
      'Write the SECTION NARRATIVES, grounded in the record above. Return ONLY a JSON object with key "sectionNarratives" whose value is an object with exactly these string keys, each a single evidence-grounded paragraph in the second person:\n' +
      '"personality" (big-five levels), "interests" (Holland / RIASEC code), "abilities", "clusters" (the five cluster scores), "jobGroups" (top job groups), "workRoles" (top work roles), "wellbeing" (sustainability / reserves — honest, non-clinical).\n' +
      "Where a real session moment or note supports a point, reference it. Use a concrete metaphor in at least the personality and clusters paragraphs. Return the JSON object now.",
  })

  // Call C — outlook & actions: job-market reading, per-route rationales (ids
  // MUST match the route ids in the payload), recommendations, and pull quotes.
  const callC = generateTextWithFallback(keys, {
    temperature,
    system,
    prompt:
      `SCAFFOLD FACTS (JSON — the only facts you may use):\n${factsLite}\n\n` +
      "Write the OUTLOOK & ACTIONS. Return ONLY a JSON object with exactly these keys:\n" +
      '- "jobMarket": string[] — 2-4 short paragraphs reading the job-market numbers in the payload (never invent figures).\n' +
      '- "routeNarratives": array of { "id": string, "rationale": string } — one entry per route in the payload, the "id" matching that route\'s id EXACTLY. The rationale cites the route\'s probability and horizon and frames the trade-off honestly.\n' +
      '- "recommendations": string[] — 4-6 concrete, sequenced next moves; let the counsellor notes carry high weight here.\n' +
      '- "pullQuotes": string[] — 3-5 short, memorable McKinsey-style takeaway lines drawn from the analysis.\n' +
      "Return the JSON object now.",
  })

  const out = emptyNarrative()

  // Merge each sub-call independently so one failure can't sink the rest.
  const [ra, rb, rc] = await Promise.allSettled([callA, callB, callC])

  if (ra.status === "fulfilled") {
    const o = parseJsonObject(ra.value)
    out.framingThesis = asString(o.framingThesis)
    out.executiveSummary = asStringArray(o.executiveSummary)
    out.journey = asKeyedArray(o.journey, "key", "narrative").map((x) => ({
      key: x.k,
      narrative: x.val,
    }))
    out.counsellorSynthesis = asString(o.counsellorSynthesis)
  }

  if (rb.status === "fulfilled") {
    const o = parseJsonObject(rb.value)
    const sn = (o.sectionNarratives && typeof o.sectionNarratives === "object"
      ? o.sectionNarratives
      : o) as Record<string, unknown>
    out.sectionNarratives = {
      personality: asString(sn.personality),
      interests: asString(sn.interests),
      abilities: asString(sn.abilities),
      clusters: asString(sn.clusters),
      jobGroups: asString(sn.jobGroups),
      workRoles: asString(sn.workRoles),
      wellbeing: asString(sn.wellbeing),
    }
  }

  if (rc.status === "fulfilled") {
    const o = parseJsonObject(rc.value)
    out.jobMarket = asStringArray(o.jobMarket)
    out.routeNarratives = asKeyedArray(o.routeNarratives, "id", "rationale").map((x) => ({
      id: x.k,
      rationale: x.val,
    }))
    out.recommendations = asStringArray(o.recommendations)
    out.pullQuotes = asStringArray(o.pullQuotes)
  }

  return out
}

export async function handleReportRequest(
  request: Request,
  apiKey?: string,
  openrouterKey?: string,
): Promise<Response> {
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
  try {
    const input = await request.json()
    if (!input || typeof input !== "object") {
      return Response.json({ error: "No report payload provided" }, { status: 400 })
    }
    const narrative = await generateReport(input, { groq: apiKey, openrouter: openrouterKey })
    return Response.json(narrative)
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Report generation failed" },
      { status: 500 },
    )
  }
}
