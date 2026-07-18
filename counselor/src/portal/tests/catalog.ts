// The client-takeable assessment catalog — the FINAL SetMyCareer battery
// (locked 2026-07-17), the same instruments and engines as the guest testing
// links, under the portal's long-standing test ids so results/reports/journey
// wiring stays intact:
//
//  • sigma_personality — the final 72-item Personality Assessment (6 factors ×
//    3 facets × 4 items, reverse-keyed, 0–100 developmental), scored by
//    scorePfin per the source workbook.
//  • sigma_interest — the final 176-item Career Interest Assessment (34
//    clusters × attraction+engagement, + work-environment and job-
//    characteristic layers), scored by scoreIfin (Career-Level = 50/25/25).
//  • aptitude — the THIRD test, picked automatically by the member's track:
//    students sit the timed DBDA ability battery; working professionals sit
//    the CCPA Competency & Potential (both run by their own dedicated
//    runners — `items` stays empty and `itemCount` carries the display count).

import { pfinItems, scorePfin, PFIN_SCALE } from "@/guest/personality-final"
import { ifinItems, scoreIfin, IFIN_SCALE, IFIN_CLUSTERS } from "@/guest/interest-final"
import { ABILITY_LABEL, type AbilityKey } from "@/guest/ability-norms"
import { COMPETENCIES, type CompCode } from "@/guest/ccpa"

export type TestKind = "likert" | "aptitude" | "dbda" | "ccpa"
export type TestAccess = "free" | "premium"

/** New-engine factor labels → the portal's historical short keys, so every
 *  consumer keyed on PE/TE/IN/LE/SY/AC keeps reading real numbers. */
export const PFIN_KEY: Record<string, string> = {
  "People Orientation": "PE",
  "Team Orientation": "TE",
  "Leadership Orientation": "IN",
  "Learning Orientation": "LE",
  "System Orientation": "SY",
  "Achievement Motivation": "AC",
}

export interface LikertItem {
  text: string
  /** which output factor/cluster this item loads on */
  factor: string
  /** reverse-keyed (5↔1) per the scoring key */
  reverse?: boolean
  /** an optional per-question disclaimer / guidance shown under the prompt */
  note?: string
}

export interface AptitudeItem {
  q: string
  options: string[]
  answer: number
  category: string
  note?: string
}

export interface TestFactor {
  key: string
  label: string
}

// ── reflections ──────────────────────────────────────────────────────────────
// A separate layer of QUALITATIVE questions per instrument — situational
// scenarios and subjective free-text. They are NOT part of the psychometric
// score (the validated `items`/`scoreTest` path is left untouched); they are
// stored on the side and handed to the report as the client's own words, so the
// synthesis and the counsellor read a far richer picture. Answering them is
// optional and never affects a percentile.
// "pair" = preference pair (exactly 2 choices, matched for social desirability);
// "bestworst" = pick MOST and LEAST like you from 4-5 equally-acceptable options
// (the executive-psychometrics format — much harder to game than agreement).
export type ReflectionKind = "scenario" | "open" | "pair" | "bestworst"
export interface ReflectionItem {
  /** stable id for storage (survives reordering) */
  id: string
  kind: ReflectionKind
  /** the situational setup, for scenario kind (longer context) */
  scenario?: string
  /** the question itself */
  prompt: string
  /** a disclaimer / note shown under the prompt */
  note?: string
  /** scenario options — qualitative, never scored */
  choices?: string[]
  /** an optional open-text SUB-QUESTION revealed after the main answer */
  followUp?: string
  /** placeholder for open-text kind */
  placeholder?: string
}

export interface TestDef {
  id: string
  name: string
  tagline: string
  source: string
  kind: TestKind
  access: TestAccess
  price?: number
  minutes: number
  factors: TestFactor[]
  /** likert anchor labels, low→high */
  scale?: string[]
  items: (LikertItem | AptitudeItem)[]
  /** display question count for battery kinds whose items live in their own
   *  runner banks (dbda/ccpa) — `items` stays empty there */
  itemCount?: number
  /** qualitative situational + subjective questions, taken after the scored
   *  items — they enrich the report but never touch the psychometric score */
  reflections?: ReflectionItem[]
  feeds: string
}


// ── per-instrument reflections (qualitative, unscored — enrich the report) ────
// DEEP on purpose: each carries a follow-up SUB-QUESTION so the counsellor gets
// a probe on a real answer, not a one-liner. All optional, all skippable, and
// NEVER fed to the psychometric score.
const PERSONALITY_REFLECTIONS: ReflectionItem[] = [
  {
    id: "pe_scenario_pressure", kind: "scenario",
    scenario: "A group project you care about is falling behind — two days before the deadline.",
    prompt: "What do you actually do first?",
    note: "There's no right answer. Pick what you'd genuinely do, not what sounds best.",
    choices: ["Take charge and re-plan the work", "Quietly pick up the slack yourself", "Get everyone talking to sort it out", "Flag it to whoever's in charge"],
    followUp: "In a sentence — why that one?",
  },
  {
    id: "pe_scenario_disagree", kind: "scenario",
    scenario: "Someone you respect — a parent, a teacher, a boss — is pushing a plan for you that feels wrong.",
    prompt: "What do you most likely do?",
    note: "Honestly — the move you actually make, not the one you admire.",
    choices: ["Say so directly and make my case", "Agree outwardly, then quietly do it my way", "Ask questions until they see the gaps themselves", "Go along with it — they may know better"],
    followUp: "What does disagreeing with someone you respect cost you?",
  },
  {
    id: "pe_flow", kind: "open",
    prompt: "Describe a time you were so absorbed in something you lost track of the hours. What were you doing?",
    note: "Not scored — it just tells your counsellor where your attention goes on its own.",
    placeholder: "The last time I completely lost track of time was…",
    followUp: "What exactly held you — the challenge, the craft, the people, or the result?",
  },
  {
    id: "pe_pressure_seen", kind: "open",
    prompt: "When you're under real pressure, what do the people around you tend to notice about you?",
    placeholder: "Under pressure, people say I…",
    followUp: "And what do they not see — what does pressure feel like from the inside?",
  },
  {
    id: "pe_energy", kind: "open",
    prompt: "After a long day, what genuinely restores you — and what drains you even when it looks restful?",
    note: "Energy is data: careers spend it in very different ways.",
    placeholder: "I recharge by… and I'm drained by…",
  },
  {
    id: "pe_proud", kind: "open",
    prompt: "One thing you've done that you're quietly proud of — something that wouldn't show up on a certificate.",
    note: "Your counsellor reads this, not a scoring machine.",
    placeholder: "I don't talk about it much, but…",
    followUp: "What did it take from you that people wouldn't guess?",
  },
  // new-format items (v2 spec): preference pair + best/worst — options matched
  // for social desirability so neither reads as the "good" answer
  {
    id: "pe_pair_week", kind: "pair",
    prompt: "Two good weeks. Which would you rather have lived?",
    choices: [
      "The plan held, and everything landed exactly when you said it would",
      "The plan changed daily, and you improvised your way through",
    ],
    note: "Both weeks went well — this is about which one suits you, not which is better.",
    followUp: "What is it about the other week that would wear you down?",
  },
  {
    id: "pe_bw_group_role", kind: "bestworst",
    prompt: "In a group task, pick the line MOST like you — and the one LEAST like you.",
    choices: [
      "I get the plan straight before anyone starts",
      "I keep the mood steady when things wobble",
      "I push the pace when energy drops",
      "I ask whether we're solving the right problem at all",
      "I take my piece and get on with it alone",
    ],
    note: "Every one of these keeps a team alive. The pattern is what your counsellor reads.",
  },
]
const INTEREST_REFLECTIONS: ReflectionItem[] = [
  {
    id: "in_scenario_saturday", kind: "scenario",
    scenario: "A completely free Saturday — and money is no concern.",
    prompt: "Which one pulls you most?",
    note: "Go with your gut — the first one you leaned toward.",
    choices: ["Building or fixing something with your hands", "Getting lost in a book, film or big idea", "Making or designing something of your own", "Bringing people together for something"],
    followUp: "What would you actually make, build or explore?",
  },
  {
    id: "in_scenario_bookstore", kind: "scenario",
    scenario: "You wander into a big bookstore with an hour to kill and no list.",
    prompt: "Which shelf do you drift to first?",
    choices: ["Science, technology & how things work", "Business, money & how people win", "Art, design, fiction & film", "People, psychology & the big questions"],
    followUp: "What's the last thing from that shelf you actually finished?",
  },
  {
    id: "in_rabbit_hole", kind: "open",
    prompt: "What could you happily read or watch about for hours — and why does it pull you?",
    note: "In your own words. This becomes part of your report.",
    placeholder: "I could go down a rabbit hole on…",
    followUp: "When did that pull start — and has it survived being difficult?",
  },
  {
    id: "in_shadow", kind: "open",
    prompt: "If you could shadow any one person at their work for a day, who — and what would you want to see?",
    placeholder: "I'd want to spend a day with…",
    followUp: "What would you ask them at the end of that day?",
  },
  {
    id: "in_free_year", kind: "open",
    prompt: "You're given a fully funded year — no exams, no CV pressure. How do you spend it?",
    note: "Dream honestly. The constraint-free answer says a lot.",
    placeholder: "With a free year I'd…",
  },
  {
    id: "in_never", kind: "open",
    prompt: "What kind of work are you certain you don't want — and what exactly repels you about it?",
    note: "Ruling out is data too — often the cleanest data you'll give us.",
    placeholder: "I know I don't want… because…",
  },
  // new-format items (v2 spec): preference pair + best/worst
  {
    id: "in_pair_afternoon", kind: "pair",
    prompt: "Which afternoon sounds more enjoyable?",
    choices: [
      "Untangling a messy set of figures until every line finally adds up",
      "Back-to-back conversations, working out what each person actually needs",
    ],
    followUp: "Would your answer hold if you had to do it every working day?",
  },
  {
    id: "in_bw_pull", kind: "bestworst",
    prompt: "Pick the one MOST like you — and the one LEAST like you.",
    choices: [
      "Getting a stubborn machine or gadget running again",
      "Chasing down why the data says something odd",
      "Reworking a design until it looks right from every angle",
      "Coaching someone through a topic until it clicks",
      "Talking a sceptical room around to a plan",
    ],
    note: "None of these is the 'right' answer — they point at genuinely different kinds of work.",
  },
]
const APTITUDE_REFLECTIONS: ReflectionItem[] = [
  {
    id: "ab_scenario_newproblem", kind: "scenario",
    scenario: "You're handed a problem you've never seen before, with no instructions.",
    prompt: "Your instinct is to…",
    note: "This describes HOW you think — it isn't marked right or wrong.",
    choices: ["Break it into smaller parts", "Look for a pattern or an analogy", "Sketch it or picture it", "Talk it through out loud"],
    followUp: "Can you recall a real time you did exactly that?",
  },
  {
    id: "ab_scenario_stuck", kind: "scenario",
    scenario: "Twenty minutes into a hard problem, you're properly stuck.",
    prompt: "What do you actually do next?",
    choices: ["Push harder down the same line", "Restart from zero with a different approach", "Step away and let it cook", "Find a person or a resource to unblock me"],
    followUp: "And how does being stuck feel — curious, anxious, annoyed, calm?",
  },
  {
    id: "ab_enjoy", kind: "open",
    prompt: "What kind of problem do you most enjoy solving — and what makes it satisfying?",
    placeholder: "The problems I enjoy most are…",
    followUp: "Which kind do you avoid, even when you could solve it?",
  },
  {
    id: "ab_battery_read", kind: "open",
    prompt: "Which section of this test felt easiest, which felt hardest — and did that surprise you?",
    note: "Your own read of the battery helps your counsellor calibrate the scores.",
    placeholder: "Easiest was… hardest was…",
  },
  {
    id: "ab_learning", kind: "open",
    prompt: "When you have to learn something genuinely new, how do you go about it — the first hour, the first week?",
    placeholder: "First I…",
  },
  // new-format items (v2 spec). The pair was reworded after adversarial review:
  // the first draft's "careless slips" stigmatised the speed option, so both
  // choices now carry symmetric, neutral costs.
  {
    id: "ab_pair_timed", kind: "pair",
    prompt: "A timed test ends. Which result would you rather walk out with?",
    choices: [
      "Covered nearly every question, moving fast",
      "Covered fewer questions, checking each one",
    ],
    note: "Neither is better — they're different working styles under time pressure.",
  },
  {
    id: "ab_bw_hard_problem", kind: "bestworst",
    prompt: "Deep in a hard problem, pick what's MOST like you — and what's LEAST like you.",
    choices: [
      "I double-check each step before moving on",
      "I trust a good estimate and keep moving",
      "I turn the problem into a diagram or picture",
      "I put the problem into words and reason it out loud",
      "I try small numbers first and hunt for the pattern",
    ],
    followUp: "Has that habit ever cost you? When?",
  },
]

// ── Personality Assessment (FINAL 72-item instrument) ────────────────────────
const SIGMA_PERSONALITY: TestDef = {
  id: "sigma_personality",
  name: "Personality Assessment",
  tagline: "How you usually work and learn — six factors, eighteen facets, no right answers.",
  source: "SetMyCareer final battery · 72 items, workbook-scored",
  kind: "likert",
  access: "free",
  minutes: 12,
  scale: PFIN_SCALE,
  feeds: "Personality profile · report synthesis",
  reflections: PERSONALITY_REFLECTIONS,
  factors: Object.entries(PFIN_KEY).map(([label, key]) => ({ key, label })),
  items: pfinItems().map((it) => ({ text: it.text, factor: PFIN_KEY[it.factor] ?? it.factor, reverse: it.reverse })),
}

// ── Career Interest Assessment (FINAL 176-item instrument) ───────────────────
const SIGMA_INTEREST: TestDef = {
  id: "sigma_interest",
  name: "Career Interest Assessment",
  tagline: "What genuinely pulls you across 34 clusters — and where that interest could sustain a career.",
  source: "SetMyCareer final battery · attraction + engagement + work-fit layers",
  kind: "likert",
  access: "free",
  minutes: 26,
  scale: IFIN_SCALE,
  feeds: "Career-level interest fit · report synthesis",
  reflections: INTEREST_REFLECTIONS,
  // clusters are keyed by LABEL in the final engine — downstream ranks on these
  factors: IFIN_CLUSTERS.map((c) => ({ key: c.label, label: c.label })),
  items: ifinItems().map((it) => ({
    text: it.text,
    factor: it.kind === "we" || it.kind === "jc" ? `${it.kind}:${it.ownerLabel}` : it.ownerLabel,
  })),
}

// ── The THIRD test — automatic by track ──────────────────────────────────────
// Students sit the timed DBDA ability battery; working professionals sit the
// CCPA Competency & Potential. Both keep the historic id "aptitude" so a
// member has exactly ONE third-test slot in results, reports and the journey.
// Their items live in the dedicated runner banks — `items` stays empty here.

const DBDA_ORDER: AbilityKey[] = ["CA", "VA", "NA", "RA", "SA", "MA", "CL"]
const DBDA_ABILITY: TestDef = {
  id: "aptitude",
  name: "Ability Test",
  tagline: "Seven timed DBDA sections — how you reason with words, numbers, shapes and detail.",
  source: "David's Battery of Differential Abilities · age & gender normed",
  kind: "dbda",
  access: "free",
  minutes: 42,
  itemCount: 245,
  feeds: "Ability profile (A–J grades) · report synthesis",
  reflections: APTITUDE_REFLECTIONS,
  factors: DBDA_ORDER.map((k) => ({ key: k, label: ABILITY_LABEL[k] })),
  items: [],
}

const CCPA_COMPETENCY: TestDef = {
  id: "aptitude",
  name: "Competency & Potential",
  tagline: "How you handle real work demands — measured three ways across twelve competencies.",
  source: "SetMyCareer CCPA · situational judgement + forced choice + self-ratings",
  kind: "ccpa",
  access: "free",
  minutes: 30,
  itemCount: 88,
  feeds: "Competency profile · report synthesis",
  reflections: APTITUDE_REFLECTIONS,
  factors: (Object.entries(COMPETENCIES) as [CompCode, { label: string; blurb: string }][]).map(([code, c]) => ({ key: code, label: c.label })),
  items: [],
}

/** The battery for a member's track — the third test is picked automatically. */
export function testsFor(track: "student" | "professional" | null | undefined): TestDef[] {
  return [SIGMA_PERSONALITY, SIGMA_INTEREST, track === "professional" ? CCPA_COMPETENCY : DBDA_ABILITY]
}

export function getTestFor(track: "student" | "professional" | null | undefined, id: string): TestDef | undefined {
  return testsFor(track).find((t) => t.id === id)
}

/** Legacy default (student battery) — prefer testsFor(track)/getTestFor(track). */
export const TESTS: TestDef[] = testsFor("student")

export const getTest = (id: string): TestDef | undefined => TESTS.find((t) => t.id === id)

// ── scoring ──────────────────────────────────────────────────────────────────

export interface ScoredResult {
  /** factorKey → 0–100 */
  scores: Record<string, number>
  /** overall 0–100 */
  overall: number
  /** top factors, high→low */
  ranked: { key: string; label: string; value: number }[]
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)

export function scoreTest(def: TestDef, answers: number[]): ScoredResult {
  // The two Likert instruments delegate to the FINAL engines (workbook / manual).
  if (def.id === "sigma_personality") {
    const p = scorePfin(answers)
    const scores = Object.fromEntries(p.factors.map((f) => [PFIN_KEY[f.label] ?? f.label, f.score ?? 0]))
    const ranked = p.factors
      .map((f) => ({ key: PFIN_KEY[f.label] ?? f.label, label: f.label, value: f.score ?? 0 }))
      .sort((a, b) => b.value - a.value)
    return { scores, overall: clamp(mean(ranked.map((r) => r.value))), ranked }
  }
  if (def.id === "sigma_interest") {
    // scores carry the CAREER-LEVEL number per cluster — the decision-relevant
    // read (50% engagement + 25% work-environment + 25% job-characteristics),
    // not raw attraction. Downstream ranking and market matching key on these.
    const r = scoreIfin(answers)
    const scores = Object.fromEntries(r.clusters.map((c) => [c.label, c.career ?? 0]))
    const ranked = r.clusters
      .map((c) => ({ key: c.label, label: c.label, value: c.career ?? 0 }))
      .sort((a, b) => b.value - a.value)
    return { scores, overall: clamp(mean(ranked.map((x) => x.value))), ranked }
  }

  if (def.kind === "likert") {
    const items = def.items as LikertItem[]
    const buckets: Record<string, number[]> = {}
    items.forEach((it, i) => {
      const a = answers[i] ?? 3
      const v = it.reverse ? 6 - a : a
      ;(buckets[it.factor] ??= []).push(v)
    })
    const scores: Record<string, number> = {}
    for (const f of def.factors) {
      const vals = buckets[f.key] ?? []
      scores[f.key] = clamp(((mean(vals.length ? vals : [3]) - 1) / 4) * 100)
    }
    const ranked = def.factors
      .map((f) => ({ key: f.key, label: f.label, value: scores[f.key] }))
      .sort((a, b) => b.value - a.value)
    return { scores, overall: clamp(mean(Object.values(scores))), ranked }
  }

  // aptitude — % correct per category + overall
  const items = def.items as AptitudeItem[]
  const correctBy: Record<string, { c: number; n: number }> = {}
  let totalCorrect = 0
  items.forEach((it, i) => {
    const bucket = (correctBy[it.category] ??= { c: 0, n: 0 })
    bucket.n += 1
    if (answers[i] === it.answer) { bucket.c += 1; totalCorrect += 1 }
  })
  const scores: Record<string, number> = {}
  for (const f of def.factors) {
    const b = correctBy[f.key]
    scores[f.key] = b && b.n ? clamp((b.c / b.n) * 100) : 0
  }
  const ranked = def.factors
    .map((f) => ({ key: f.key, label: f.label, value: scores[f.key] }))
    .sort((a, b) => b.value - a.value)
  return { scores, overall: clamp((totalCorrect / items.length) * 100), ranked }
}
