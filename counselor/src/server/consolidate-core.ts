// POST /api/consolidate — the optional AI layer on the guest report.
// Takes the three DETERMINISTIC result sets (already scored by the testing logic)
// and asks Gemini (fallback: Groq/OpenRouter) for a consolidated read: job groups,
// future paths, predictions. It must only interpret the supplied numbers — the
// prompt forbids inventing scores.

import { generateTextWithFallback, type AIKeys } from "./ai-providers"

export interface ConsolidateBody {
  details: { name: string; age: number; gender: string; grade: string }
  track?: "student" | "executive"
  ability: { key: string; label: string; raw: number; max: number; grade?: string; band?: string; percentile?: number }[]
  competency?: { code: string; label: string; composite: number | null; band?: string | null }[]
  interest: { factor: string; attraction: number | null; career: number | null; hcg: number | null; category?: string | null }[]
  personality: { label: string; score: number | null; band?: string | null }[]
}

const SYSTEM = `You are SetMyCareer's assessment consolidation engine. You are given a
person's ability standard scores, interest inventory scores and personality percentiles —
all already computed by validated scoring logic. Your job is to interpret the PATTERN.

Rules:
- Reference only the scores provided. Never invent numbers, percentiles or test names.
- Be specific to the pattern (e.g. "high spatial + mechanical with strong Engineering
  interest"), never generic advice.
- India-context career framing, suitable for a student/parent reader.
- British spelling. No emojis. No markdown headings inside strings.
- Return STRICT JSON only — no prose before or after, no code fences.`

const SHAPE = `{
  "overview": "120-160 words tying the three instruments into one coherent read",
  "strengths": ["4-6 short pattern-grounded strength statements"],
  "watchouts": ["2-3 honest development areas phrased constructively"],
  "jobGroups": [{ "name": "group", "why": "one sentence tied to their scores", "roles": ["3-4 example roles"] }],
  "paths": [{ "horizon": "Next 2 years | Degree years | First job", "focus": "what to do in that window, tied to the profile" }],
  "subjects": ["4-6 school/college subjects that fit the profile"]
}`

export async function runConsolidate(body: ConsolidateBody, keys: AIKeys): Promise<Response> {
  const json = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } })
  try {
    if (!body?.details?.name) return json({ error: "Bad payload" }, 400)
    const isExec = body.track === "executive"
    const thirdBlock = isExec && Array.isArray(body.competency)
      ? [
          `COMPETENCY & POTENTIAL (CCPA composite 0–100, three-method: situational judgement + forced choice + self-ratings; behavioural tendency, not skill):`,
          ...body.competency.map((c) => `- ${c.label}: ${c.composite ?? "—"}${c.band ? ` (${c.band})` : ""}`),
        ]
      : [
          `ABILITY (DBDA raw/max, standard grade A best–J lowest, band):`,
          ...body.ability.map((a) => `- ${a.label}: ${a.raw}/${a.max}${a.grade ? ` · grade ${a.grade} (${a.band}, ~${a.percentile}th percentile)` : " · raw score only"}`),
        ]
    const prompt = [
      `Person: ${body.details.name}, age ${body.details.age}, ${body.details.gender}, ${body.details.grade}.` + (isExec ? " They are a working professional / executive." : ""),
      ``,
      ...thirdBlock,
      ``,
      `INTEREST (top clusters; Attraction 0–100 = what pulls them; Career-Level 0–100 = 50% willingness-to-do-the-work + 25% work-environment fit + 25% job-characteristic fit; HCG = attraction minus career; category per the SMC rulebook):`,
      ...body.interest.filter((i) => i.career != null || i.attraction != null).map((i) => `- ${i.factor}: attraction ${i.attraction ?? "—"} · career ${i.career ?? "—"} · gap ${i.hcg ?? "—"}${i.category ? ` · ${i.category}` : ""}`),
      ``,
      `PERSONALITY (0–100 developmental scale; higher = more characteristic, NOT better):`,
      ...body.personality.map((p) => `- ${p.label}: ${p.score ?? "—"}${p.band ? ` (${p.band})` : ""}`),
      ``,
      isExec
        ? `This is an EXECUTIVE — frame job groups as roles/functions and career moves suited to a working professional, and "subjects" as skills or development areas rather than school subjects.`
        : `Frame subjects as school/college subjects.`,
      `Weight the CAREER-LEVEL interest scores over raw attraction when suggesting job groups; call out any large hobby-career gaps honestly.`,
      `Produce the consolidation as JSON of exactly this shape: ${SHAPE}`,
    ].join("\n")

    const text = await generateTextWithFallback(keys, { system: SYSTEM, prompt, temperature: 0.4 })
    // strip accidental fences, then parse defensively
    const cleaned = text.replace(/^```(?:json)?/m, "").replace(/```\s*$/m, "").trim()
    const start = cleaned.indexOf("{")
    const end = cleaned.lastIndexOf("}")
    if (start < 0 || end <= start) return json({ error: "Model returned no JSON" }, 502)
    const parsed = JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
    return json({ ok: true, summary: parsed })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : "Consolidation failed" }, 500)
  }
}

export async function handleConsolidateRequest(req: Request, keys: AIKeys): Promise<Response> {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 })
  const body = (await req.json().catch(() => null)) as ConsolidateBody | null
  if (!body) return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers: { "content-type": "application/json" } })
  return runConsolidate(body, keys)
}
