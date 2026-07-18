// ── Plain-language read-outs, computed not generated ────────────────────────
//
// Every sentence here is derived from the member's actual scores by rule. There
// is no model call: the same scores always produce the same words, which is what
// makes this safe to show without a counsellor in the room.
//
// Two disciplines hold throughout:
//   1. Describe, don't prescribe. We say what the pattern IS and what it tends
//      to suit — never "you should become X". The counsellor does that, with the
//      member present.
//   2. Carry the caveat that belongs to the instrument. Self-report measures
//      preference, not ability; the ability battery is graded against age/gender
//      norms, not against everyone. Saying so is part of being accurate.

import type { StoredTestResult } from "./results-store"

export interface Readout {
  /** 2–4 sentences a member can read on their own and not be misled by. */
  body: string
  /** The honest limit of what this test can tell them. */
  caveat: string
}

const pct = (n: number) => Math.round(n)

/** Sorted [key, value] pairs, highest first. */
function ranked(scores: Record<string, number>): [string, number][] {
  return Object.entries(scores).filter(([, v]) => Number.isFinite(v)).sort((a, b) => b[1] - a[1])
}

/** Turn a 0–100 score into the band language used across the product. */
function band(v: number): "high" | "moderate" | "lower" {
  return v >= 65 ? "high" : v <= 35 ? "lower" : "moderate"
}

const list = (xs: string[]) =>
  xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`

/* ── per-factor meaning, personality ─────────────────────────────────────────
   Keyed by the historic factor keys (PFIN_KEY values). Phrased as tendencies,
   because that is what a self-report scale can honestly claim. */
const PERSONALITY_MEANING: Record<string, { high: string; low: string }> = {
  PE: { high: "you work outward — through people, conversation and contact", low: "you do your best thinking with fewer people around" },
  TE: { high: "you pull toward shared work and group results", low: "you prefer clear individual ownership over collective effort" },
  IN: { high: "you step into direction-setting rather than waiting for it", low: "you'd rather contribute than take charge of the room" },
  LE: { high: "you keep learning for its own sake, past what's required", low: "you learn what the work needs and apply it, without chasing more" },
  SY: { high: "you bring order, structure and follow-through to loose work", low: "you stay flexible and improvise rather than systematise" },
  AC: { high: "you set your own bar and push against it", low: "you pace yourself steadily rather than driving hard at targets" },
}

export function personalityReadout(r: StoredTestResult, labelFor: (k: string) => string): Readout {
  const rk = ranked(r.scores)
  if (rk.length === 0) return { body: "No scored factors were recorded for this sitting.", caveat: "" }
  const [topKey, topVal] = rk[0]
  const [secondKey, secondVal] = rk[1] ?? rk[0]
  const [lowKey, lowVal] = rk[rk.length - 1]

  const strong = rk.filter(([, v]) => v >= 65).map(([k]) => labelFor(k))
  const lead = strong.length
    ? `Your profile stands tallest on ${list(strong)}.`
    : `Your profile is fairly even, with ${labelFor(topKey)} (${pct(topVal)}) just ahead.`

  const t = PERSONALITY_MEANING[topKey]
  const s = PERSONALITY_MEANING[secondKey]
  const l = PERSONALITY_MEANING[lowKey]

  const shape = t
    ? ` The clearest signal is ${labelFor(topKey)} at ${pct(topVal)} — ${band(topVal) === "lower" ? t.low : t.high}.`
    : ""
  const pair = s && secondKey !== topKey
    ? ` Alongside it, ${labelFor(secondKey)} (${pct(secondVal)}) suggests ${band(secondVal) === "lower" ? s.low : s.high}.`
    : ""
  const low = l && lowKey !== topKey && band(lowVal) === "lower"
    ? ` Lowest is ${labelFor(lowKey)} (${pct(lowVal)}) — ${l.low}. That isn't a weakness; it's a preference worth designing around.`
    : ""

  return {
    body: `${lead}${shape}${pair}${low}`,
    caveat:
      "This is how you described yourself, so it reflects preference and habit — not skill or potential. Environments can shift these scores; treat them as a starting map for the conversation with your counsellor.",
  }
}

export function interestReadout(r: StoredTestResult): Readout {
  const rk = ranked(r.scores)
  if (rk.length === 0) return { body: "No interest clusters were scored for this sitting.", caveat: "" }
  const top = rk.slice(0, 3)
  const strong = top.filter(([, v]) => v >= 60)
  const flat = rk[0][1] < 50

  const lead = flat
    ? `No single interest area dominates — your strongest is ${rk[0][0]} at ${pct(rk[0][1])}.`
    : `Your interests concentrate in ${list(top.map(([k]) => k))}.`

  const detail = strong.length
    ? ` ${strong[0][0]} leads at ${pct(strong[0][1])}, meaning you're drawn to that work *and* you'd repeat it — the two things this test measures separately.`
    : " Scores sit in the moderate range across the board, which usually means your interests are still forming or spread wide."

  const spread = rk.length > 3
    ? ` Below the top three the scores fall away toward ${rk[rk.length - 1][0]} (${pct(rk[rk.length - 1][1])}), so the shortlist is genuinely narrower than the full list of options.`
    : ""

  return {
    body: `${lead}${detail}${spread}`,
    caveat:
      flat
        ? "A flat profile is common and isn't a problem — it usually means you need exposure before preferences sharpen. Your counsellor will focus on widening experience before narrowing choices."
        : "A high score means genuine pull, not proven ability. What sustains a career is interest plus the capability to match — which is what the rest of your battery is for.",
  }
}

export function abilityReadout(r: StoredTestResult, labelFor: (k: string) => string): Readout {
  const rk = ranked(r.scores)
  if (rk.length === 0) return { body: "No ability sections were scored for this sitting.", caveat: "" }
  const [topKey, topVal] = rk[0]
  const [lowKey, lowVal] = rk[rk.length - 1]
  const strong = rk.filter(([, v]) => v >= 65).map(([k]) => labelFor(k))
  const even = topVal - lowVal <= 20

  const lead = even
    ? `Your ability scores are fairly even across sections, topping at ${labelFor(topKey)} (${pct(topVal)}).`
    : strong.length
      ? `You score strongest on ${list(strong)}.`
      : `Your strongest section is ${labelFor(topKey)} at ${pct(topVal)}.`

  const shape = even
    ? " An even profile means no single aptitude is carrying you — it keeps more paths open, and makes interest the better tie-breaker."
    : ` The gap between ${labelFor(topKey)} (${pct(topVal)}) and ${labelFor(lowKey)} (${pct(lowVal)}) is wide enough to matter: work that leans on your stronger sections will feel less effortful.`

  return {
    body: `${lead}${shape} These are percentile-style standings, so 50 is genuinely average — not a poor result.`,
    caveat:
      "Graded against people of your own age and gender, not the whole population. Timed tests also measure speed under pressure, so a lower score can reflect pace rather than capability — your counsellor will read these alongside your interests before drawing conclusions.",
  }
}

export function competencyReadout(r: StoredTestResult, labelFor: (k: string) => string): Readout {
  const rk = ranked(r.scores)
  if (rk.length === 0) return { body: "No competencies were scored for this sitting.", caveat: "" }
  const top = rk.slice(0, 3).map(([k, v]) => `${labelFor(k)} (${pct(v)})`)
  const growth = rk.filter(([, v]) => v <= 45).slice(-2).map(([k]) => labelFor(k))

  const lead = `You come out strongest on ${list(top)}.`
  const dev = growth.length
    ? ` The clearest room to grow sits in ${list(growth)} — normal at this stage, and the kind of thing that moves with deliberate practice rather than time alone.`
    : " No competency falls into the development band, so your profile is broadly balanced rather than spiky."

  return {
    body: `${lead}${dev} Because each competency was measured three different ways, a high score here is harder to fake than a single self-rating.`,
    caveat:
      "These describe behavioural tendency — how you're inclined to operate at work — not technical skill or intelligence. A lower score is a growth area, never a verdict.",
  }
}

/** The right read-out for a stored result, whichever instrument it came from. */
export function readoutFor(r: StoredTestResult, labelFor: (k: string) => string): Readout {
  if (r.testId === "sigma_personality") return personalityReadout(r, labelFor)
  if (r.testId === "sigma_interest") return interestReadout(r)
  if (r.variant === "ccpa") return competencyReadout(r, labelFor)
  return abilityReadout(r, labelFor)
}

/* ── the consolidated read across the whole battery ─────────────────────────── */

export interface Consolidated {
  headline: string
  paragraphs: string[]
  caveat: string
}

/**
 * Reads all three instruments together. The genuinely useful thing a battery can
 * say — and the thing no single test can — is where interest and capability
 * AGREE and where they PULL APART. That convergence/divergence is the whole
 * point of testing more than once, so it leads.
 */
export function consolidatedReadout(
  results: StoredTestResult[],
  labelFor: (testId: string, key: string) => string,
): Consolidated | null {
  const personality = results.find((r) => r.testId === "sigma_personality")
  const interest = results.find((r) => r.testId === "sigma_interest")
  const third = results.find((r) => r.testId === "aptitude")
  if (!personality || !interest || !third) return null

  const iTop = ranked(interest.scores).slice(0, 3)
  const pTop = ranked(personality.scores)[0]
  const tRank = ranked(third.scores)
  const tTop = tRank[0]
  const tLow = tRank[tRank.length - 1]
  const isCcpa = third.variant === "ccpa"

  const paragraphs: string[] = []

  paragraphs.push(
    `Across three instruments the steadiest signal is your interest profile, which concentrates in ${list(iTop.map(([k]) => k))}. Interest is the strongest single predictor of what someone will still be doing willingly in ten years, which is why it anchors the read.`,
  )

  paragraphs.push(
    `Your personality profile leads on ${labelFor("sigma_personality", pTop[0])} (${pct(pTop[1])}), which describes the conditions you work best under rather than the field you should enter. Read it as the shape of the working environment to look for — pace, autonomy, how much of the day is spent with other people.`,
  )

  paragraphs.push(
    isCcpa
      ? `On competencies you're strongest in ${labelFor("aptitude", tTop[0])} (${pct(tTop[1])}) and have the most room in ${labelFor("aptitude", tLow[0])} (${pct(tLow[1])}). Where a strong competency sits under a high interest, that pairing is worth taking seriously; where they diverge, it points to what to build rather than what to avoid.`
      : `On measured ability you stand highest in ${labelFor("aptitude", tTop[0])} (${pct(tTop[1])}) and lowest in ${labelFor("aptitude", tLow[0])} (${pct(tLow[1])}). Where measured ability lines up with a high interest, that is the most defensible direction in your results; where a strong interest meets a weaker section, it isn't a closed door — it tells you what preparation the path would need.`,
  )

  paragraphs.push(
    "Nothing here names a career on its own. Two of these instruments describe preference and one describes capability, and a real recommendation needs all three read against your circumstances — which is the work of your counselling sessions.",
  )

  return {
    headline: `Your results point most consistently toward ${iTop[0]?.[0] ?? "your leading interest area"}.`,
    paragraphs,
    caveat:
      "This summary is generated by rule from your scores — it is consistent and repeatable, but it is deliberately general. Your counsellor's report, written after your sessions, is where these results get read against your subjects, marks, circumstances and plans.",
  }
}
