// The bridge from taken Career Tests → the report pipeline, now powered by the
// FINAL battery engines (personality-final / interest-final / DBDA / CCPA).
// Whatever the client has completed (1) REPLACES the corresponding seeded radar
// that drives the Career Intelligence Report, and (2) is handed to the AI report
// agent as a ground-truth parameters block. The historical output SHAPES are
// preserved (factors keyed PE/TE/IN/LE/SY/AC, ranked job fits, ability rows) so
// every downstream screen keeps reading real numbers.

import type { RadarProfiles, RadarAxis } from "@/lib/types"
import { getTestResult } from "./results-store"
import { getTest } from "./catalog"
import { scorePfin } from "@/guest/personality-final"
import { scoreIfin } from "@/guest/interest-final"

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

/* ── personality (final 72-item) in the legacy factor shape ────────────────── */

export interface PersonalityFacetLike { label: string; percentile: number }
export interface PersonalityFactorLike {
  key: string
  label: string
  percentile: number
  band: string
  subfactors: PersonalityFacetLike[]
}
export interface PersonalityLike { factors: PersonalityFactorLike[]; overall: number }

const PFIN_TO_KEY: Record<string, string> = {
  "People Orientation": "PE",
  "Team Orientation": "TE",
  "Leadership Orientation": "IN",
  "Learning Orientation": "LE",
  "System Orientation": "SY",
  "Achievement Motivation": "AC",
}

function personalityLike(answers: number[]): PersonalityLike {
  const p = scorePfin(answers)
  const factors: PersonalityFactorLike[] = p.factors.map((f) => ({
    key: PFIN_TO_KEY[f.label] ?? f.label,
    label: f.label,
    percentile: clamp(f.score ?? 50),
    band: f.band ?? "Moderate",
    subfactors: f.subs.map((s) => ({ label: s.label, percentile: clamp(s.score ?? 50) })),
  }))
  return { factors, overall: clamp(factors.reduce((a, f) => a + f.percentile, 0) / (factors.length || 1)) }
}

/** Real personality result if the personality test is done. */
export function realPersonalityFor(clientId: string): PersonalityLike | null {
  const pers = getTestResult(clientId, "sigma_personality")
  return pers && pers.answers.length ? personalityLike(pers.answers) : null
}

/* ── interest (final 176-item) → ranked career fits ────────────────────────── */

export interface GroupFitLike { group: string; fitPct: number; band: string }
export interface JceLike { jobs: GroupFitLike[]; education: GroupFitLike[] }

/** Ranked CAREER-LEVEL cluster fits from the final interest engine — stands in
 *  for the old JCE job-group list. `education` mirrors the top clusters (the
 *  final instrument ranks career clusters, not degree groups). */
export function realJceFor(clientId: string): JceLike | null {
  const intr = getTestResult(clientId, "sigma_interest")
  if (!intr || !intr.answers.length) return null
  const r = scoreIfin(intr.answers)
  const ranked = r.clusters
    .filter((c) => c.career != null)
    .sort((a, b) => (b.career ?? 0) - (a.career ?? 0))
  const jobs: GroupFitLike[] = ranked.map((c) => ({
    group: c.label,
    fitPct: clamp(c.career ?? 0),
    band: c.category ?? c.careerBand ?? "—",
  }))
  return { jobs, education: jobs.slice(0, 8) }
}

/* ── radar crosswalks (report visuals) ─────────────────────────────────────── */

// 6-factor personality → the report's 5-axis Big-Five radar (crosswalk).
function bigFiveAxes(p: PersonalityLike): RadarAxis[] {
  const pct = (key: string) => p.factors.find((f) => f.key === key)?.percentile ?? 50
  const PE = pct("PE"), TE = pct("TE"), LE = pct("LE"), SY = pct("SY"), AC = pct("AC")
  return [
    { axis: "Openness", value: LE },
    { axis: "Conscientiousness", value: clamp((SY + AC) / 2) },
    { axis: "Extraversion", value: PE },
    { axis: "Agreeableness", value: TE },
    { axis: "Neuroticism", value: clamp(100 - TE) }, // composure ↔ low neuroticism
  ]
}

// 34 final interest clusters → the report's 6-axis RIASEC radar.
const RIASEC_CLUSTERS: Record<string, string[]> = {
  Realistic: ["Core Engineering", "Agriculture & Environment", "Defence Services", "Sports & Physical Fitness", "Adventure & Exploration"],
  Investigative: ["Physical Science & Research", "Social Science & Research", "Data Science & Analytics", "AI & Robotics", "Healthcare / Medicine"],
  Artistic: ["Creative Arts & Design", "Performing Arts", "Writing & Content Creation", "Architecture"],
  Social: ["Education & Teaching", "Psychology", "Social Work", "Human Resources"],
  Enterprising: ["Sales & Business Development", "Entrepreneurship", "Leadership & Management", "Digital Marketing", "Law"],
  Conventional: ["Finance & Banking", "Administration & Compliance", "Operations Management", "Supply Chain & Logistics"],
}

function riasecAxes(byLabel: Map<string, number>): RadarAxis[] {
  return Object.entries(RIASEC_CLUSTERS).map(([axis, labels]) => {
    const vals = labels.map((l) => byLabel.get(l)).filter((v): v is number => v != null)
    return { axis, value: clamp(vals.reduce((a, b) => a + b, 0) / (vals.length || 1)) }
  })
}

/** Real radar from the Career Tests, per-instrument over the seeded base; null if
 *  neither has been taken. */
export function realRadarFor(clientId: string, base: RadarProfiles): RadarProfiles | null {
  const pers = getTestResult(clientId, "sigma_personality")
  const intr = getTestResult(clientId, "sigma_interest")
  if (!pers && !intr) return null
  let riasec = base.riasec
  if (intr && intr.answers.length) {
    const r = scoreIfin(intr.answers)
    riasec = riasecAxes(new Map(r.clusters.map((c) => [c.label, c.career ?? 0])))
  }
  return {
    bigFive: pers && pers.answers.length ? bigFiveAxes(personalityLike(pers.answers)) : base.bigFive,
    riasec,
  }
}

export function hasRealAssessments(clientId: string): boolean {
  return Boolean(
    getTestResult(clientId, "sigma_personality") ||
    getTestResult(clientId, "sigma_interest") ||
    getTestResult(clientId, "aptitude"),
  )
}

/* ── the third test (DBDA ability / CCPA competency) ───────────────────────── */

export interface AbilityRow { label: string; value: number; highlight?: boolean; meta: string }

interface DbdaPayload { kind: "dbda"; sections: { key: string; label: string; raw: number; max: number; grade: string; band: string }[] }
interface CcpaPayload { kind: "ccpa"; comps: { code: string; label: string; composite: number | null; band: string | null }[] }

/** Real third-test rows (DBDA sections graded A–J, or CCPA competencies 0–100),
 *  same shape as abilityMetrics so the report chart reads actual scores. */
export function realAbilitiesFor(clientId: string): AbilityRow[] | null {
  const apt = getTestResult(clientId, "aptitude")
  if (!apt) return null
  const payload = apt.payload as DbdaPayload | CcpaPayload | undefined
  let rows: AbilityRow[]
  if (payload?.kind === "dbda") {
    rows = payload.sections.map((s) => ({
      label: s.label, value: clamp(apt.scores[s.key] ?? 0), meta: `Grade ${s.grade} · ${s.raw}/${s.max}`,
    }))
  } else if (payload?.kind === "ccpa") {
    rows = payload.comps.map((c) => ({
      label: c.label, value: clamp(c.composite ?? 0), meta: c.band ?? `${clamp(c.composite ?? 0)} / 100`,
    }))
  } else {
    rows = Object.entries(apt.scores).map(([k, v]) => ({ label: k, value: clamp(v), meta: `${clamp(v)} / 100` }))
  }
  const top = Math.max(...rows.map((r) => r.value), 0)
  return rows.map((r) => ({ ...r, highlight: r.value === top }))
}

/* ── qualitative + the AI ground-truth digest ──────────────────────────────── */

/** The client's own words from the reflection questions on every instrument —
 *  situational choices + free-text sub-answers. Qualitative: for the report's
 *  texture and the counsellor's read, never a measured score. */
export function reflectionLines(clientId: string): string[] {
  const out: string[] = []
  for (const testId of ["sigma_personality", "sigma_interest", "aptitude"]) {
    const r = getTestResult(clientId, testId)
    const def = getTest(testId)
    if (!r?.reflections || !def?.reflections) continue
    for (const item of def.reflections) {
      const a = r.reflections[item.id]
      if (a == null || a === "") continue
      const answer = typeof a === "number" && item.choices ? (item.choices[a] ?? String(a)) : String(a)
      out.push(`${def.name} — "${item.scenario ? item.scenario + " " : ""}${item.prompt}" → ${answer}`)
      const why = r.reflections[`${item.id}__why`]
      if (why) out.push(`   ↳ ${item.followUp ?? "Why"}: ${why}`)
    }
  }
  return out
}

/** A ground-truth digest of every test taken, for the AI report payload. */
export function assessmentSummary(clientId: string): string {
  const lines: string[] = []

  const p = realPersonalityFor(clientId)
  if (p) {
    lines.push(
      "Personality (final 72-item, 0–100 developmental — higher = more characteristic, NOT better): " +
        p.factors.map((f) => `${f.label} ${f.percentile} (${f.band})`).join("; ") + ".",
    )
    const facets = p.factors.flatMap((f) => f.subfactors)
    const top = [...facets].sort((a, b) => b.percentile - a.percentile).slice(0, 3)
    const low = [...facets].sort((a, b) => a.percentile - b.percentile).slice(0, 3)
    lines.push(
      `Standout facets: ${top.map((s) => `${s.label} (${s.percentile})`).join(", ")}. ` +
        `Least characteristic: ${low.map((s) => `${s.label} (${s.percentile})`).join(", ")}.`,
    )
  }

  const j = realJceFor(clientId)
  if (j) {
    lines.push(
      "Interest (final 176-item; Career-Level = 50% willingness-to-do-the-work + 25% work-environment + 25% job-characteristic fit — weight these over raw attraction): " +
        "Top clusters: " + j.jobs.slice(0, 6).map((g) => `${g.group} ${g.fitPct} (${g.band})`).join(", ") + ".",
    )
  }

  const apt = getTestResult(clientId, "aptitude")
  if (apt) {
    const rows = realAbilitiesFor(clientId) ?? []
    const isCcpa = (apt.payload as { kind?: string } | undefined)?.kind === "ccpa"
    lines.push(
      (isCcpa
        ? "Competency & Potential (CCPA, 12 competencies, 0–100 behavioural composites): "
        : "Ability (DBDA, seven timed sections, graded vs age+gender norms): ") +
        rows.map((r) => `${r.label} ${r.meta}`).join(", ") + ".",
    )
  }

  if (!lines.length) return ""
  const blocks = [
    "SELF-REPORTED CAREER TEST RESULTS (the client completed these; treat as ground truth and synthesise from them — these are the FINAL SetMyCareer battery scores, computed by the validated engines):",
    ...lines.map((l) => `• ${l}`),
  ]
  const refl = reflectionLines(clientId)
  if (refl.length) {
    blocks.push(
      "",
      "IN THE CLIENT'S OWN WORDS (qualitative reflections — situational choices and free-text they wrote during the tests; use these for human texture, tie-breaking and the narrative, NOT as measured scores):",
      ...refl.map((l) => `• ${l}`),
    )
  }
  return blocks.join("\n")
}
