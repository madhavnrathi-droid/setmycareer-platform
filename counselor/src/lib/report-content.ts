// Career Intelligence Report — content derivation layer.
//
// Given a Client (the read-only scored record), this module DERIVES the
// structured, consultancy-grade narrative the print document renders: the
// dominant RIASEC code, per-trait / per-cluster interpretation, a job-market
// extrapolation, 3–4 concrete career routes with computed success
// probabilities, and a prioritised 90-day plan.
//
// Nothing here re-scores the client. It reads the existing signals/composites/
// radar/clinical values and turns them into well-crafted, specific prose that
// always weaves in the client's real numbers and names. The probabilities are
// computed (not hand-set) so they move with the client's profile and differ
// meaningfully across routes — see `routeProbability` for the model.

import type {
  Client, Signal, Composite, ClusterKey, RadarAxis, Confidence,
} from "./types"
import { CLUSTER_LABELS, clientSessions, clientTests, transcript } from "./mock"

// ── small numeric helpers ─────────────────────────────────────────────────────

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))
const firstName = (full: string) => full.trim().split(/\s+/)[0] || full

/** The name to address the client by in the report (preferredName → first token). */
const addressName = (client: Client) => client.preferredName ?? firstName(client.name)

/** Third-person pronouns parsed from `client.pronouns` (defaults to neutral they/them). */
function pronounSet(client: Client): { subject: string; object: string; possessive: string } {
  const raw = (client.pronouns ?? "").toLowerCase()
  if (raw.includes("she")) return { subject: "she", object: "her", possessive: "her" }
  if (raw.includes("he")) return { subject: "he", object: "him", possessive: "his" }
  return { subject: "they", object: "them", possessive: "their" }
}

/** A 0–1 weight for each confidence level — used to discount soft evidence. */
export const CONFIDENCE_WEIGHT: Record<Confidence, number> = {
  none: 0.45,
  low: 0.6,
  tentative: 0.72,
  moderate: 0.86,
  high: 1,
}

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  none: "no read yet",
  low: "low confidence",
  tentative: "tentative",
  moderate: "moderate confidence",
  high: "high confidence",
}

/** Qualitative band for a 0–100 index, with a human label. */
export function indexBand(v: number | null): { key: "low" | "emerging" | "ready" | "strong"; label: string } {
  if (v == null) return { key: "low", label: "Not yet scored" }
  if (v >= 80) return { key: "strong", label: "Strong" }
  if (v >= 65) return { key: "ready", label: "Market-ready" }
  if (v >= 50) return { key: "emerging", label: "Emerging" }
  return { key: "low", label: "Forming" }
}

// ── RIASEC / Holland code ─────────────────────────────────────────────────────

const RIASEC_LETTER: Record<string, string> = {
  Realistic: "R", Investigative: "I", Artistic: "A",
  Social: "S", Enterprising: "E", Conventional: "C",
}

const RIASEC_ENVIRONMENT: Record<string, string> = {
  Realistic: "hands-on, build-and-operate settings — engineering, field, hardware, or ops roles where the work is concrete and measurable",
  Investigative: "analytical, research-led environments — data, science, strategy and technical problem-solving where depth is rewarded",
  Artistic: "open-ended, design-driven settings — product, brand, content and creative roles that prize originality and self-direction",
  Social: "people-centred work — coaching, enablement, customer success, teaching and roles built on helping others grow",
  Enterprising: "persuasion- and ownership-heavy environments — sales, product leadership, founding and commercial roles that reward initiative",
  Conventional: "structured, detail-exact settings — operations, finance, programme management and roles where order and reliability matter",
}

const RIASEC_TRAIT: Record<string, string> = {
  Realistic: "a pragmatic, get-it-built instinct",
  Investigative: "a strong analytical, evidence-first drive",
  Artistic: "an originality- and design-led streak",
  Social: "a genuine pull toward people and impact",
  Enterprising: "an enterprising, take-the-lead orientation",
  Conventional: "a methodical, reliability-first temperament",
}

export interface HollandCode {
  code: string // e.g. "I-E-A"
  top: RadarAxis[] // top 3 axes, sorted desc
  primary: RadarAxis
  secondary: RadarAxis
  narrative: string
  environments: string
}

export function hollandCode(client: Client): HollandCode {
  const sorted = [...client.radar.riasec].sort((a, b) => b.value - a.value)
  const top = sorted.slice(0, 3)
  const code = top.map((a) => RIASEC_LETTER[a.axis] ?? a.axis[0]).join("-")
  const primary = top[0]
  const secondary = top[1]

  const narrative =
    `Your interest profile resolves to a ${code} (Holland) code, led by ${primary.axis} ` +
    `(${primary.value}) with ${secondary.axis} (${secondary.value}) close behind. ` +
    `Think of it as the compass needle of your working life: it reads as ${RIASEC_TRAIT[primary.axis]} balanced by ${RIASEC_TRAIT[secondary.axis]} — ` +
    `a combination that tends to thrive where rigorous thinking has a visible commercial or human payoff, ` +
    `rather than in either purely abstract or purely process-bound roles.`

  const environments =
    `Your best-fit environments lean toward ${RIASEC_ENVIRONMENT[primary.axis]}. ` +
    `The ${secondary.axis} secondary widens the fit into ${RIASEC_ENVIRONMENT[secondary.axis].split(" — ")[0]}, ` +
    `which is where you are most likely to feel both stretched and at home.`

  return { code, top, primary, secondary, narrative, environments }
}

// ── Big Five interpretation ───────────────────────────────────────────────────

export interface TraitRead {
  axis: string
  value: number
  level: "high" | "moderate" | "low"
  interpretation: string
}

function bigFiveLevel(v: number): TraitRead["level"] {
  return v >= 62 ? "high" : v >= 42 ? "moderate" : "low"
}

const BIG_FIVE_READS: Record<string, Record<TraitRead["level"], string>> = {
  Openness: {
    high: "Your high Openness points to curiosity, comfort with ambiguity and an appetite for novel problems — like a mind that prefers open water to a marked channel. It is an asset in fast-moving, design- or strategy-led roles, with the caveat that routine execution may need deliberate structure to anchor it.",
    moderate: "Your balanced Openness suggests practical creativity: you are open to new approaches without chasing novelty for its own sake, which suits roles that blend invention with delivery.",
    low: "Your grounded Openness indicates a preference for the proven and the concrete — a strength in roles that reward consistency and depth over constant reinvention.",
  },
  Conscientiousness: {
    high: "Your high Conscientiousness is a powerful career multiplier: reliable follow-through, organisation and self-discipline that compound like interest over time and signal strongly to employers — provided it doesn't tip into perfectionism.",
    moderate: "Your moderate Conscientiousness shows dependable delivery with room to tighten the systems around it — building one or two consistent habits would convert good intentions into a visible track record.",
    low: "Your lower Conscientiousness flags follow-through as the area to engineer around: external structure, deadlines and accountability will do more for your outcomes here than willpower alone — scaffolding, not grit.",
  },
  Extraversion: {
    high: "Your high Extraversion supports visibility, networking and roles with a strong interpersonal or persuasive component — energy that, channelled deliberately like a current through a turbine, accelerates the flow of opportunity toward you.",
    moderate: "Your ambivert tendencies let you flex between focused solo work and collaboration — a versatile profile that fits most modern team roles.",
    low: "Your more introverted profile favours depth, focused work and written influence; build opportunity through a few strong relationships and a strong portfolio rather than broad networking.",
  },
  Agreeableness: {
    high: "Your high Agreeableness reads as collaboration, trust-building and low-friction teamwork — valuable in cross-functional and client-facing settings, with assertiveness and boundary-setting as your deliberate growth edge.",
    moderate: "Your balanced Agreeableness combines cooperation with the ability to hold a position — a healthy profile for negotiation, leadership and stakeholder work.",
    low: "Your more challenging, candour-first profile can sharpen decisions and standards; pairing it with visible warmth protects the relationships that careers ultimately run on.",
  },
  Neuroticism: {
    high: "Your elevated Neuroticism means stress sensitivity is a real variable: you perform strongly when your reserves are protected, so workload design and recovery are not soft extras but core fuel — like a high-performance engine that needs the right coolant to run hard.",
    moderate: "Your moderate emotional reactivity is normal and manageable; noticing your own stress signals and keeping a light routine around them stops it from interfering with momentum.",
    low: "Your low Neuroticism reads as steadiness under pressure — composure that is an asset in high-stakes, ambiguous or fast-moving decision roles.",
  },
}

export function bigFiveReads(client: Client): TraitRead[] {
  return client.radar.bigFive.map((t) => {
    const level = bigFiveLevel(t.value)
    return { axis: t.axis, value: t.value, level, interpretation: BIG_FIVE_READS[t.axis]?.[level] ?? "" }
  })
}

// ── clusters ──────────────────────────────────────────────────────────────────

export interface ClusterRead {
  key: ClusterKey
  label: string
  /** confidence-weighted mean of the cluster's scored signals (0–100) */
  score: number
  signals: Signal[]
  analysis: string
}

const CLUSTER_ORDER: ClusterKey[] = [
  "direction_identity", "market_readiness", "execution_momentum",
  "confidence_decision", "network_environment",
]

/** Confidence-weighted mean of a set of signals (ignores null scores). */
export function weightedMean(signals: Signal[]): number {
  let num = 0, den = 0
  for (const s of signals) {
    if (s.score == null) continue
    const w = CONFIDENCE_WEIGHT[s.confidence]
    num += s.score * w
    den += w
  }
  return den ? num / den : 0
}

function clusterAnalysis(key: ClusterKey, score: number, signals: Signal[]): string {
  const top = [...signals].filter((s) => s.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  const strongest = top[0]
  const weakest = top[top.length - 1]
  const band = score >= 70 ? "a clear strength" : score >= 55 ? "a working strength" : score >= 45 ? "a developing area" : "your principal constraint"
  const quote = signals.find((s) => s.quote)?.quote

  switch (key) {
    case "direction_identity":
      return `Direction and identity is ${band} for you (${Math.round(score)}/100). ` +
        `${strongest ? `${strongest.name} anchors the cluster at ${strongest.score}` : "Clarity anchors the cluster"}, ` +
        `${weakest && weakest !== strongest ? `while ${weakest.name.toLowerCase()} (${weakest.score}) is the softer thread to firm up` : "with values alignment the thread to firm up"}. ` +
        (quote ? `In your own words: “${quote}.” ` : "") +
        `When clarity outruns confidence, the work is consolidation — like wearing in a new pair of boots by repeatedly naming the chosen direction until it feels owned, not borrowed.`
    case "market_readiness":
      return `Your market readiness sits at ${Math.round(score)}/100 — ${band}. ` +
        `${strongest ? `${strongest.name} (${strongest.score}) is the asset to lead with` : "Skill coverage is the asset to lead with"}; ` +
        `${weakest && weakest !== strongest ? `${weakest.name.toLowerCase()} (${weakest.score}) is the gap most worth closing before a serious search` : "skill-gap severity is the gap most worth closing"}. ` +
        (quote ? `Evidence on record: “${quote}.” ` : "") +
        `Readiness at this level converts to interviews; your limiting factor is usually packaging the evidence — polishing the shop window — not building more of it.`
    case "execution_momentum":
      return `Your execution and momentum reads as ${band} (${Math.round(score)}/100). ` +
        `${strongest ? `${strongest.name} is running hot at ${strongest.score}` : "Momentum is running hot"}` +
        `${weakest && weakest !== strongest ? `, with ${weakest.name.toLowerCase()} (${weakest.score}) the lagging half — the gap between starting and finishing` : ""}. ` +
        (quote ? `“${quote}” is the kind of concrete output that moves this cluster. ` : "") +
        `Your job here is to protect the cadence and convert motion into a small number of completed, showable artefacts — momentum you can point to, not just feel.`
    case "confidence_decision":
      return `Confidence and decision is ${band} (${Math.round(score)}/100) — and for you it is the most important number in this report to read carefully. ` +
        `${weakest ? `${weakest.name} (${weakest.score})` : "Professional confidence"} sits below the capability the rest of your profile demonstrates, which is the classic signature of a confidence gap rather than a competence gap — the bridge is built, you simply haven't trusted your weight to it yet. ` +
        (quote ? `“${quote}” captures the internal state precisely. ` : "") +
        `Your lever is evidence and exposure — structured wins and reps — not more preparation in the abstract.`
    case "network_environment":
      return `Your network and environment is ${band} (${Math.round(score)}/100). ` +
        `${strongest ? `${strongest.name} (${strongest.score}) is the steadier side` : "Networking is the steadier side"}` +
        `${weakest && weakest !== strongest ? `, while ${weakest.name.toLowerCase()} (${weakest.score}) is the watch-item — the soil the rest of your profile is trying to grow in, which can quietly erode the gains` : ""}. ` +
        (quote ? `“${quote}” is worth taking literally. ` : "") +
        `A small, deliberate increase in warm connections plus sustainable working conditions is the highest-leverage, lowest-cost move available to you.`
  }
}

export function clusterReads(client: Client): ClusterRead[] {
  return CLUSTER_ORDER.map((key) => {
    const signals = client.blueprint.signals.filter((s) => s.cluster === key)
    const score = weightedMean(signals)
    return {
      key,
      label: CLUSTER_LABELS[key] ?? key,
      score: Math.round(score),
      signals,
      analysis: clusterAnalysis(key, score, signals),
    }
  })
}

// ── composites ────────────────────────────────────────────────────────────────

export interface CompositeRead extends Composite {
  confidenceLabel: string
}

export function compositeReads(client: Client): CompositeRead[] {
  return client.blueprint.composites.map((c) => ({
    ...c,
    confidenceLabel: CONFIDENCE_LABEL[c.confidence],
  }))
}

// ── RIASEC normalisation (shared by job groups, work roles, routes) ───────────

type Riasec6 = { R: number; I: number; A: number; S: number; E: number; C: number }

/** Lookup a RIASEC axis value (0 if absent). */
function riasec(client: Client, axis: string): number {
  return client.radar.riasec.find((a) => a.axis === axis)?.value ?? 0
}

const RIASEC_KEYS = ["R", "I", "A", "S", "E", "C"] as const

/**
 * MEAN-CENTRE a six-axis RIASEC vector, then unit-normalise it. Centring (subtract
 * the vector's own mean) is what makes the later dot-product behave like a Pearson
 * correlation rather than a raw cosine: because real interest profiles are all-
 * positive, an un-centred cosine scores almost every job group "high" (every vector
 * points into the same positive orthant). Centring removes that shared baseline so
 * only the *relative shape* — where this person is spiky vs flat — drives the match,
 * which is what lets a profile read as genuinely dissimilar to some groups.
 */
function centredUnit(v: Riasec6): Riasec6 {
  const vals = RIASEC_KEYS.map((k) => v[k])
  const mean = vals.reduce((a, x) => a + x, 0) / vals.length
  const centred = RIASEC_KEYS.map((k) => v[k] - mean)
  const norm = Math.sqrt(centred.reduce((a, x) => a + x * x, 0)) || 1
  const out = {} as Riasec6
  RIASEC_KEYS.forEach((k, i) => { out[k] = centred[i] / norm })
  return out
}

/** The client's RIASEC profile, mean-centred + unit-normalised (correlation-ready). */
function riasecUnit(client: Client): Riasec6 {
  return centredUnit({
    R: riasec(client, "Realistic"),
    I: riasec(client, "Investigative"),
    A: riasec(client, "Artistic"),
    S: riasec(client, "Social"),
    E: riasec(client, "Enterprising"),
    C: riasec(client, "Conventional"),
  })
}

/**
 * Pearson-style similarity (0–100) between the client's centred-unit RIASEC vector
 * and a job group's interest signature. The dot of two centred-unit vectors is a
 * correlation in [-1, 1]; we rescale to 0–100 (anti-correlated → ~0, matched → ~100)
 * with a mild gamma so the mid-band isn't over-populated. Result: profiles land
 * across ≥66 (similar) / 40–65 (midrange) / <40 (dissimilar), as intended.
 */
function riasecSimilarity(unit: Riasec6, sig: Riasec6): number {
  const su = centredUnit(sig)
  const corr = RIASEC_KEYS.reduce((a, k) => a + unit[k] * su[k], 0) // [-1, 1]
  const scaled = (corr + 1) / 2 // → [0, 1]
  return clamp(Math.pow(scaled, 1.15) * 100)
}

/** Score a single contributing role's level from the relevant RIASEC axes (raw 0–100). */
function roleLevel(client: Client, axes: string[]): "High" | "Average" | "Low" {
  const v = axes.reduce((a, ax) => a + riasec(client, ax), 0) / Math.max(1, axes.length)
  return v >= 60 ? "High" : v >= 40 ? "Average" : "Low"
}

// ── counsellor signal → bounded outcome adjustment ────────────────────────────

export interface CounsellorWeighting {
  /** 0–1 — how much trustworthy counsellor signal is present in this record. */
  weight: number
  /** ±points applied to the lead route's probability + outlook (bounded ±8). */
  probabilityAdjustment: number
  /** Months added to / removed from time-to-offer (bounded ±2; negative = faster). */
  timeAdjustment: number
  /** True when notes/wellbeing signal that recovery should be elevated. */
  elevateWellbeing: boolean
  /** Short human-readable rationale lines (what moved the number and why). */
  rationale: string[]
}

/**
 * Counsellor notes must MATERIALLY (but transparently + bounded) move the final
 * outcomes — the human in the loop is real evidence, not decoration.
 *
 * weight  = 0.25·(notesPresence) + 0.45·(alliance/100) + 0.30·(engagement/100),
 *           clamped 0–1. More notes + stronger alliance + higher engagement ⇒
 *           the counsellor read carries more of the final call.
 *
 * Then we scan the raw note text for two opposing signal sets:
 *   • POSITIVE  (ready / strong / motivated / momentum / high self-efficacy …)
 *   • NEGATIVE  (burnout / risk / drained / over-commit / doubt / monitor …)
 * plus the structured wellbeing/risk fields. The net sentiment, scaled BY the
 * weight, becomes:
 *   probabilityAdjustment = weight · (positiveHits − negativeHits) · 3   → clamp ±8
 *   timeAdjustment        = −probabilityAdjustment / 5                    → clamp ±2
 * so a strong, well-engaged, "ready" client gets a real lift to the lead route
 * and a shorter time-to-offer, while burnout / risk / low-engagement tempers the
 * outlook and flips `elevateWellbeing` so the plan leads with recovery.
 */
const POSITIVE_NOTE_RE = /\bready|strong|motivat|momentum|high self.?efficacy|confiden|progress|engaged|articulate|self.?efficacy\b/i
const NEGATIVE_NOTE_RE = /\bburn.?out|risk|drain|over.?commit|doubt|monitor|strain|fatigue|exhaust|elevated|gap|impostor|disrupt|sub.?threshold\b/i

export function counsellorWeighting(client: Client): CounsellorWeighting {
  const c = client.clinical
  const notes = c.notes ?? []
  const notesPresence = clamp(notes.length * 28, 0, 100) / 100 // 0,~0.28,0.56,0.84,1
  const alliance = (c.alliance ?? 0) / 100
  const engagement = (c.engagement ?? 0) / 100
  const weight = Math.max(0, Math.min(1, 0.25 * notesPresence + 0.45 * alliance + 0.30 * engagement))

  // Count opposing sentiment hits across the raw note text.
  const blob = notes.join("  ")
  const positiveHits = (blob.match(POSITIVE_NOTE_RE) ? 1 : 0) + (notes.filter((n) => POSITIVE_NOTE_RE.test(n)).length)
  let negativeHits = (blob.match(NEGATIVE_NOTE_RE) ? 1 : 0) + (notes.filter((n) => NEGATIVE_NOTE_RE.test(n)).length)
  // Structured risk + low wellbeing are strong negative evidence regardless of prose.
  const riskWeight = c.riskFlag === "high" ? 3 : c.riskFlag === "moderate" ? 2 : c.riskFlag === "low" ? 1 : 0
  negativeHits += riskWeight
  const lowWellbeing = (c.wellbeingIndex ?? 100) < 60
  if (lowWellbeing) negativeHits += 1
  // Strong alliance + engagement is itself positive evidence of readiness to act.
  const positiveBoost = alliance >= 0.8 && engagement >= 0.8 ? 1 : 0

  const netSentiment = positiveHits + positiveBoost - negativeHits
  const probabilityAdjustment = clamp(Math.round(weight * netSentiment * 3), -8, 8)
  const timeAdjustment = Math.max(-2, Math.min(2, Math.round((-probabilityAdjustment / 5) * 10) / 10))
  const elevateWellbeing = lowWellbeing || riskWeight >= 2 || (netSentiment < 0 && weight >= 0.4)

  const name = addressName(client)
  const pn = pronounSet(client)
  const rationale: string[] = []
  if (notes.length === 0) {
    rationale.push(`No counsellor notes are on file yet, so the outcome leans almost entirely on the test data — the counsellor's read can only sharpen ${name}'s picture once sessions accrue.`)
  } else {
    rationale.push(
      `Counsellor signal weight is ${(weight * 100).toFixed(0)}% — derived from ${notes.length} note${notes.length === 1 ? "" : "s"} on file, ` +
      `alliance ${c.alliance ?? "—"}/100 and engagement ${c.engagement ?? "—"}/100. The stronger that triad, the more the counsellor's read of ${name} and ${pn.possessive} progress is allowed to move the model.`,
    )
    if (probabilityAdjustment > 0) {
      rationale.push(`The notes read as readiness and strong engagement, so the lead route is lifted +${probabilityAdjustment} points and time-to-offer shortened by ${Math.abs(timeAdjustment)} month${Math.abs(timeAdjustment) === 1 ? "" : "s"}.`)
    } else if (probabilityAdjustment < 0) {
      rationale.push(`The notes flag strain or risk, so the outlook is tempered ${probabilityAdjustment} points and time-to-offer extended by ${Math.abs(timeAdjustment)} month${Math.abs(timeAdjustment) === 1 ? "" : "s"} — an honest hedge, not pessimism.`)
    } else {
      rationale.push(`Positive and cautionary notes roughly balance, so the counsellor read holds the modelled outcome steady rather than moving it.`)
    }
    if (elevateWellbeing) {
      rationale.push(`Because wellbeing or risk signal is present, recovery is elevated in the plan — the gains only hold if reserves are protected.`)
    }
  }

  return { weight, probabilityAdjustment, timeAdjustment, elevateWellbeing, rationale }
}

// ── JVIS-style Job Groups (similarity to people working in each group) ────────

export interface JobGroup {
  name: string
  similarity: number // 0–100
  band: "similar" | "midrange" | "dissimilar"
  topRoles: { name: string; level: "High" | "Average" | "Low" }[]
}

/** Each group's RIASEC interest signature + its contributing work roles (with the
 *  axes that drive each role's High/Average/Low level). The signature weights are
 *  the JVIS-style "interests of people who work in this group" fingerprint. */
const JOB_GROUP_DEFS: Array<{
  name: string
  sig: Riasec6
  roles: { name: string; axes: string[] }[]
}> = [
  {
    name: "Sales & Business Development",
    sig: { R: 0, I: 0, A: 0.1, S: 0.5, E: 1, C: 0.3 },
    roles: [
      { name: "Account Executive", axes: ["Enterprising", "Social"] },
      { name: "Business Development Lead", axes: ["Enterprising"] },
      { name: "Partnerships Manager", axes: ["Enterprising", "Social"] },
    ],
  },
  {
    name: "Engineering & Technical",
    sig: { R: 1, I: 0.9, A: 0.1, S: 0, E: 0.2, C: 0.5 },
    roles: [
      { name: "Software Engineer", axes: ["Investigative", "Realistic"] },
      { name: "Systems Engineer", axes: ["Realistic", "Investigative"] },
      { name: "Hardware / Field Engineer", axes: ["Realistic"] },
    ],
  },
  {
    name: "Life Science & Research",
    sig: { R: 0.4, I: 1, A: 0.2, S: 0.3, E: 0, C: 0.4 },
    roles: [
      { name: "Research Scientist", axes: ["Investigative"] },
      { name: "Lab / Bio Analyst", axes: ["Investigative", "Conventional"] },
      { name: "Clinical Researcher", axes: ["Investigative", "Social"] },
    ],
  },
  {
    name: "Management & Administration",
    sig: { R: 0.2, I: 0.3, A: 0.1, S: 0.5, E: 0.9, C: 0.8 },
    roles: [
      { name: "Operations Manager", axes: ["Enterprising", "Conventional"] },
      { name: "Programme Manager", axes: ["Conventional", "Enterprising"] },
      { name: "Team Lead", axes: ["Enterprising", "Social"] },
    ],
  },
  {
    name: "Creative & Design",
    sig: { R: 0.2, I: 0.3, A: 1, S: 0.3, E: 0.3, C: 0.1 },
    roles: [
      { name: "Product Designer", axes: ["Artistic", "Investigative"] },
      { name: "Brand / Visual Designer", axes: ["Artistic"] },
      { name: "Content Designer", axes: ["Artistic", "Social"] },
    ],
  },
  {
    name: "Social Service & Counselling",
    sig: { R: 0.1, I: 0.3, A: 0.3, S: 1, E: 0.3, C: 0.2 },
    roles: [
      { name: "Counsellor / Coach", axes: ["Social"] },
      { name: "Community Programme Lead", axes: ["Social", "Enterprising"] },
      { name: "Customer Success Manager", axes: ["Social", "Enterprising"] },
    ],
  },
  {
    name: "Finance & Business Services",
    sig: { R: 0.1, I: 0.6, A: 0, S: 0.2, E: 0.6, C: 1 },
    roles: [
      { name: "Financial Analyst", axes: ["Conventional", "Investigative"] },
      { name: "Business Operations", axes: ["Conventional", "Enterprising"] },
      { name: "Risk / Audit Analyst", axes: ["Conventional", "Investigative"] },
    ],
  },
  {
    name: "Information Technology",
    sig: { R: 0.7, I: 0.9, A: 0.2, S: 0.2, E: 0.4, C: 0.7 },
    roles: [
      { name: "Product Manager (Technical)", axes: ["Enterprising", "Investigative"] },
      { name: "Data / Platform Specialist", axes: ["Investigative", "Conventional"] },
      { name: "IT Project Lead", axes: ["Conventional", "Enterprising"] },
    ],
  },
  {
    name: "Healthcare & Diagnosis",
    sig: { R: 0.4, I: 0.9, A: 0.1, S: 0.8, E: 0.2, C: 0.5 },
    roles: [
      { name: "Diagnostic Specialist", axes: ["Investigative", "Social"] },
      { name: "Allied Health Practitioner", axes: ["Social", "Investigative"] },
      { name: "Health Data Analyst", axes: ["Investigative", "Conventional"] },
    ],
  },
  {
    name: "Education & Instruction",
    sig: { R: 0.1, I: 0.5, A: 0.4, S: 1, E: 0.3, C: 0.3 },
    roles: [
      { name: "Instructor / Trainer", axes: ["Social", "Artistic"] },
      { name: "Curriculum Designer", axes: ["Social", "Investigative"] },
      { name: "Enablement Lead", axes: ["Social", "Enterprising"] },
    ],
  },
  {
    name: "Law & Government",
    sig: { R: 0.1, I: 0.6, A: 0.2, S: 0.4, E: 0.7, C: 0.8 },
    roles: [
      { name: "Policy Analyst", axes: ["Investigative", "Conventional"] },
      { name: "Legal / Compliance Associate", axes: ["Conventional", "Investigative"] },
      { name: "Public Affairs Lead", axes: ["Enterprising", "Social"] },
    ],
  },
  {
    name: "Skilled Trades",
    sig: { R: 1, I: 0.3, A: 0.2, S: 0.2, E: 0.2, C: 0.5 },
    roles: [
      { name: "Technician / Operator", axes: ["Realistic"] },
      { name: "Maker / Fabricator", axes: ["Realistic", "Artistic"] },
      { name: "Field Service Specialist", axes: ["Realistic", "Conventional"] },
    ],
  },
  {
    name: "Research & Academia",
    sig: { R: 0.3, I: 1, A: 0.4, S: 0.4, E: 0.1, C: 0.5 },
    roles: [
      { name: "Researcher", axes: ["Investigative"] },
      { name: "Lecturer / Educator", axes: ["Investigative", "Social"] },
      { name: "Technical Writer (Research)", axes: ["Investigative", "Artistic"] },
    ],
  },
  {
    name: "Operations & Logistics",
    sig: { R: 0.6, I: 0.3, A: 0.1, S: 0.3, E: 0.6, C: 1 },
    roles: [
      { name: "Operations Analyst", axes: ["Conventional", "Investigative"] },
      { name: "Supply / Logistics Coordinator", axes: ["Conventional", "Realistic"] },
      { name: "Process / Delivery Manager", axes: ["Conventional", "Enterprising"] },
    ],
  },
]

export function jobGroups(client: Client): JobGroup[] {
  const unit = riasecUnit(client)
  return JOB_GROUP_DEFS
    .map((g) => {
      const similarity = riasecSimilarity(unit, g.sig)
      const band: JobGroup["band"] = similarity >= 66 ? "similar" : similarity >= 40 ? "midrange" : "dissimilar"
      return {
        name: g.name,
        similarity,
        band,
        topRoles: g.roles.map((r) => ({ name: r.name, level: roleLevel(client, r.axes) })),
      }
    })
    .sort((a, b) => b.similarity - a.similarity)
}

// ── JVIS-style Work Roles (percentile per occupational role) ──────────────────

export interface WorkRole {
  name: string
  percentile: number // 0–100
  band: "low" | "average" | "high"
}

/** Each work role's driving RIASEC axes + an optional signal id whose score nudges
 *  the percentile (so relevant evidence, not just interest shape, is reflected). */
const WORK_ROLE_DEFS: Array<{ name: string; axes: string[]; signal?: string }> = [
  { name: "Law", axes: ["Enterprising", "Conventional"] },
  { name: "Mathematics", axes: ["Investigative", "Conventional"] },
  { name: "Business", axes: ["Enterprising", "Conventional"], signal: "pc.market_readiness" },
  { name: "Finance", axes: ["Conventional", "Enterprising"] },
  { name: "Physical Science", axes: ["Investigative", "Realistic"] },
  { name: "Consulting", axes: ["Enterprising", "Investigative"], signal: "pc.career_clarity" },
  { name: "Engineering", axes: ["Realistic", "Investigative"], signal: "pc.skill_coverage" },
  { name: "Life Science", axes: ["Investigative"] },
  { name: "Office Work", axes: ["Conventional"] },
  { name: "Leadership", axes: ["Enterprising", "Social"], signal: "pc.professional_confidence" },
  { name: "Author / Journalism", axes: ["Artistic", "Investigative"] },
  { name: "Medical Service", axes: ["Social", "Investigative"] },
  { name: "Teaching", axes: ["Social", "Artistic"] },
  { name: "Technical Writing", axes: ["Artistic", "Investigative"], signal: "pc.skill_coverage" },
  { name: "Creative Arts", axes: ["Artistic"] },
  { name: "Performing Arts", axes: ["Artistic", "Enterprising"] },
  { name: "Sales", axes: ["Enterprising"], signal: "pc.networking_momentum" },
  { name: "Social Service", axes: ["Social"] },
  { name: "Social Science", axes: ["Investigative", "Social"] },
  { name: "Nature / Agriculture", axes: ["Realistic"] },
]

function signalScore(client: Client, id?: string): number | null {
  if (!id) return null
  return client.blueprint.signals.find((s) => s.id === id)?.score ?? null
}

export function workRoles(client: Client): WorkRole[] {
  return WORK_ROLE_DEFS
    .map((d) => {
      // Base percentile = mean of the role's raw RIASEC axes (0–100); if a relevant
      // signal exists, blend it 65/35 so concrete evidence shifts the percentile.
      const interest = d.axes.reduce((a, ax) => a + riasec(client, ax), 0) / Math.max(1, d.axes.length)
      const sig = signalScore(client, d.signal)
      const percentile = sig == null ? clamp(interest) : clamp(0.65 * interest + 0.35 * sig)
      const band: WorkRole["band"] = percentile >= 60 ? "high" : percentile >= 40 ? "average" : "low"
      return { name: d.name, percentile, band }
    })
    .sort((a, b) => b.percentile - a.percentile)
}

// ── career routes + computed success probabilities ────────────────────────────

export interface CareerRoute {
  id: string
  title: string
  /** which RIASEC/cluster pattern this route plays to */
  fitTag: string
  rationale: string
  moves: string[]
  horizon: string
  probability: number // 0–100 computed success probability
  confidence: Confidence
}

/**
 * Success-probability model (transparent + reproducible).
 *
 * Each route is scored as a confidence-discounted blend of:
 *   • the overall career index            (40%) — baseline employability
 *   • the cluster(s) the route depends on (35%) — route-specific readiness
 *   • interest fit to the route           (15%) — RIASEC alignment, 0–100
 *   • a route stretch factor              (10%) — how far the role is from "now"
 * The blend is multiplied by the blueprint confidence weight, then clamped to a
 * realistic 30–92 band (no career outcome is a certainty, and even a soft profile
 * has a floor with the right strategy). Routes therefore differ because they pull
 * on different clusters and different interest axes — an analytical route rewards
 * a high-Investigative profile, a leadership route rewards Enterprising + network,
 * and so on.
 */
function routeProbability(opts: {
  careerIndex: number
  clusterScores: number[] // 0–100, the clusters the route leans on
  interestFit: number // 0–100
  stretch: number // 0 (lateral) … 1 (large leap) — higher stretch lowers odds
  confidence: Confidence
}): number {
  const clusterMean = opts.clusterScores.length
    ? opts.clusterScores.reduce((a, b) => a + b, 0) / opts.clusterScores.length
    : opts.careerIndex
  const stretchFactor = (1 - opts.stretch) * 100 // lateral = 100, big leap → lower
  const raw =
    0.40 * opts.careerIndex +
    0.35 * clusterMean +
    0.15 * opts.interestFit +
    0.10 * stretchFactor
  const discounted = raw * (0.78 + 0.22 * CONFIDENCE_WEIGHT[opts.confidence])
  return clamp(discounted, 30, 92)
}

export function careerRoutes(client: Client): CareerRoute[] {
  const ci = client.blueprint.careerIndex ?? 0
  const conf = client.blueprint.confidence
  const clusters = Object.fromEntries(clusterReads(client).map((c) => [c.key, c.score])) as Record<ClusterKey, number>
  const holland = hollandCode(client)
  const headline = client.headline

  // Candidate routes, each tagged to the profile facets it depends on. We compute
  // every candidate, then return the strongest-fit four, sorted by probability.
  const candidates: Array<CareerRoute & { _fitWeight: number }> = []

  const push = (
    r: Omit<CareerRoute, "probability" | "confidence">,
    deps: { clusters: ClusterKey[]; interestAxes: string[]; stretch: number; fitWeight: number },
  ) => {
    const interestFit = clamp(
      deps.interestAxes.reduce((a, ax) => a + riasec(client, ax), 0) / Math.max(1, deps.interestAxes.length),
    )
    const probability = routeProbability({
      careerIndex: ci,
      clusterScores: deps.clusters.map((k) => clusters[k]),
      interestFit,
      stretch: deps.stretch,
      confidence: conf,
    })
    candidates.push({
      ...r,
      probability,
      confidence: conf,
      _fitWeight: deps.fitWeight + interestFit / 100, // bias selection toward true interest fit
    })
  }

  // 1. The "double down on the stated direction" route — lowest stretch, leans on
  //    direction + readiness. Title borrows the client's own headline track.
  const directionRole = headline.includes("·") ? headline.split("·").pop()!.trim() : headline
  push(
    {
      id: "r_direction",
      title: `Commit to the ${directionRole} track`,
      fitTag: "Direction + Market readiness",
      rationale:
        `This is the route your data most clearly supports: a focused move into ${directionRole.toLowerCase()}, ` +
        `building directly on the direction clarity and market-readiness already on your record. It is the lowest-stretch, ` +
        `highest-base-rate option — like sailing with the current rather than across it. The question is your execution and confidence, not your fit.`,
      moves: [
        "Package your existing evidence into one tight, role-specific portfolio and CV",
        "Run two to three mock interviews to convert capability into composure",
        "Apply in a focused batch of 8–12 well-matched roles rather than a broad spray",
      ],
      horizon: "3–5 months to a credible offer",
    },
    { clusters: ["direction_identity", "market_readiness"], interestAxes: [holland.primary.axis], stretch: 0.15, fitWeight: 0.9 },
  )

  // 2. Analytical / specialist deepening — for Investigative-leaning profiles.
  push(
    {
      id: "r_specialist",
      title: "Deepen into a technical / specialist lane",
      fitTag: "Investigative strength",
      rationale:
        `Your profile carries real analytical weight (Investigative ${riasec(client, "Investigative")}), ` +
        `which opens a specialist path — going deeper on craft until you become the person a team relies on for the hard problems, the way a sharpened tool earns its place on the bench. ` +
        `It rewards depth over breadth and suits the steadier, evidence-first side of you.`,
      moves: [
        "Choose one signature capability and build a visible depth project around it",
        "Publish or present the work so your expertise is externally legible",
        "Target roles that name the specialism explicitly in the job spec",
      ],
      horizon: "4–7 months, with stronger compounding after",
    },
    { clusters: ["market_readiness", "execution_momentum"], interestAxes: ["Investigative", "Conventional"], stretch: 0.3, fitWeight: 0.7 },
  )

  // 3. Leadership / ownership — for Enterprising + network-leaning profiles.
  push(
    {
      id: "r_leadership",
      title: "Move toward ownership & leadership",
      fitTag: "Enterprising + Network",
      rationale:
        `With Enterprising at ${riasec(client, "Enterprising")} and a workable network base, you have the raw orientation ` +
        `for a path that trades pure individual contribution for scope, people and outcomes — stepping back from the instrument to conduct the orchestra. This is a higher-stretch route ` +
        `that pays off most when you build up confidence and network deliberately first.`,
      moves: [
        "Take visible ownership of one cross-functional outcome, end to end",
        "Build five to eight genuine senior relationships in your target field",
        "Reframe your narrative around impact and judgement, not tasks",
      ],
      horizon: "6–12 months to a step-up role",
    },
    { clusters: ["confidence_decision", "network_environment", "direction_identity"], interestAxes: ["Enterprising", "Social"], stretch: 0.5, fitWeight: 0.6 },
  )

  // 4. Adjacent pivot — a hedged, exploratory route, higher stretch.
  push(
    {
      id: "r_pivot",
      title: "Test an adjacent pivot",
      fitTag: "Exploration hedge",
      rationale:
        `If your primary direction proves narrower than hoped, an adjacent pivot keeps your options alive without restarting. ` +
        `For you this means a role one step sideways from the core track — same strengths, different context, like changing the key of a song you already know. It is the ` +
        `highest-stretch option here, best used as a parallel experiment rather than your main bet.`,
      moves: [
        "Run two low-cost experiments (a project, a conversation, a short brief) before committing",
        "Validate fit against your secondary interest axis before reorienting the search",
        "Keep your primary route warm so the pivot is a choice, not a fallback",
      ],
      horizon: "5–9 months, contingent on early signals",
    },
    { clusters: ["direction_identity", "confidence_decision"], interestAxes: [holland.secondary.axis], stretch: 0.65, fitWeight: 0.4 },
  )

  // Return the best-fitting four, ordered by probability (so the chart reads as a
  // ranked set). Selection bias toward fit weight keeps the set coherent.
  const ranked = candidates
    .sort((a, b) => b._fitWeight - a._fitWeight)
    .slice(0, 4)
    .sort((a, b) => b.probability - a.probability)
    .map(({ _fitWeight, ...r }) => { void _fitWeight; return r })

  // Fold in the counsellor's read: their note signal materially (but bounded)
  // shifts the LEAD route — readiness/strong-alliance notes lift it, burnout/risk
  // notes temper it. This is what makes the human-in-the-loop count in the number.
  const cw = counsellorWeighting(client)
  if (ranked.length && cw.probabilityAdjustment !== 0) {
    ranked[0] = { ...ranked[0], probability: clamp(ranked[0].probability + cw.probabilityAdjustment, 30, 92) }
    // Re-sort in case the adjustment changed the order.
    ranked.sort((a, b) => b.probability - a.probability)
  }
  return ranked
}

// ── narrative blocks ──────────────────────────────────────────────────────────

export interface ExecutiveSummary {
  paragraphs: string[]
  topStrengths: { label: string; score: number }[]
  keyRisks: { label: string; note: string }[]
  outlook: { label: string; probability: number }
}

export function executiveSummary(client: Client): ExecutiveSummary {
  const name = addressName(client)
  const ci = client.blueprint.careerIndex ?? 0
  const band = indexBand(ci)
  const holland = hollandCode(client)
  const clusters = clusterReads(client)
  const routes = careerRoutes(client)
  const lead = routes[0]
  const clinical = client.clinical
  const cw = counsellorWeighting(client)
  const allSignals = client.blueprint.signals.filter((s) => s.score != null)
  const strengths = [...allSignals].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 3)
  const weakest = [...allSignals].sort((a, b) => (a.score ?? 0) - (b.score ?? 0)).slice(0, 2)
  const lowestCluster = [...clusters].sort((a, b) => a.score - b.score)[0]

  const p1 =
    `${name}, at ${client.age}, your profile reads as “${client.blueprint.headline}” against a ${client.headline.toLowerCase()} starting point. ` +
    `Your overall Career Index stands at ${ci}/100 — ${band.label.toLowerCase()} — held at ${CONFIDENCE_LABEL[client.blueprint.confidence]}. ` +
    `Your interests resolve to a ${holland.code} (Holland) code led by ${holland.primary.axis}: you do your best work where rigour meets real-world payoff.`

  const p2 =
    `Your strongest threads are ${strengths.map((s) => `${s.name.toLowerCase()} (${s.score})`).join(", ")} — concrete, transferable assets that should anchor any near-term move, the load-bearing beams of the build. ` +
    `Across your five clusters, the binding constraint is ${lowestCluster.label.toLowerCase()} at ${lowestCluster.score}/100; ` +
    `your limiting numbers are ${weakest.map((s) => `${s.name.toLowerCase()} (${s.score})`).join(" and ")}. ` +
    `Read together, your capability base runs ahead of your felt sense of it — the gap to close is conviction and packaging more than raw skill.`

  const p3 =
    (clinical.wellbeingIndex != null
      ? `Your wellbeing sits at ${clinical.wellbeingIndex}/100 (${clinical.wellbeingBand ?? "—"}) with ${clinical.riskFlag === "none" ? "no active risk flag" : `a ${clinical.riskFlag} risk flag`}; ` +
        `your engagement (${clinical.engagement ?? "—"}) and therapeutic alliance (${clinical.alliance ?? "—"}) are ${
          (clinical.engagement ?? 0) >= 70 ? "healthy" : "an area to nurture"
        }, which matters because your career gains only hold if your reserves are protected — the engine only runs as long as there's fuel in the tank. `
      : "") +
    (client.blueprint.contradiction
      ? `One tension is worth naming directly: ${client.blueprint.contradiction.text.toLowerCase()} `
      : "")

  // The counsellor's read is woven into the recommendation so the human-in-the-loop
  // is visible in the headline outlook, not buried in an appendix.
  const counsellorClause = cw.weight >= 0.4 && cw.probabilityAdjustment !== 0
    ? (cw.probabilityAdjustment > 0
        ? ` Your counsellor's notes — readiness and strong engagement — lift this outlook a further ${cw.probabilityAdjustment} points.`
        : ` Your counsellor's notes temper this ${cw.probabilityAdjustment} points, an honest hedge against the strain on record.`)
    : ""

  const p4 =
    `The recommended direction is unambiguous: ${lead.title.toLowerCase()}. Of the routes modelled for you, it carries the highest estimated probability of success at ${lead.probability}% ` +
    `because it leans on exactly the clusters where you are strongest while asking the least stretch.${counsellorClause} ` +
    `With a focused 90-day plan — package your evidence, run interview reps, protect your reserves — a credible offer inside ${lead.horizon} is a realistic, well-supported outlook for you.`

  return {
    paragraphs: [p1, p2, p3, p4].filter((s) => s.trim().length > 0),
    topStrengths: strengths.map((s) => ({ label: s.name, score: s.score ?? 0 })),
    keyRisks: [
      ...weakest.map((s) => ({ label: s.name, note: `Lagging signal at ${s.score}/100 — the most actionable gap.` })),
      ...(client.blueprint.contradiction ? [{ label: "Career×wellbeing tension", note: client.blueprint.contradiction.text }] : []),
    ],
    outlook: { label: lead.title, probability: lead.probability },
  }
}

export function jobMarketExtrapolation(client: Client): string[] {
  const ci = client.blueprint.careerIndex ?? 0
  const band = indexBand(ci)
  const clusters = clusterReads(client)
  const readiness = clusters.find((c) => c.key === "market_readiness")?.score ?? 0
  const momentum = clusters.find((c) => c.key === "execution_momentum")?.score ?? 0
  const confidenceCluster = clusters.find((c) => c.key === "confidence_decision")?.score ?? 0
  const holland = hollandCode(client)
  const lead = careerRoutes(client)[0]
  const cw = counsellorWeighting(client)

  // Time-to-offer estimate, derived from readiness + momentum (better both → faster),
  // then nudged by the counsellor's read (readiness shortens it; strain extends it).
  const speed = (readiness * 0.6 + momentum * 0.4)
  const ttoLow = clamp(Math.round(9 - speed / 14) + cw.timeAdjustment, 2, 10)
  const ttoHigh = clamp(ttoLow + 3, 4, 12)

  const p1 =
    `On your current numbers, you would enter the market as a ${band.label.toLowerCase()} candidate. ` +
    `Your market readiness (${readiness}/100) is the figure recruiters effectively see first; at this level you clear the initial screen for well-matched ${holland.primary.axis.toLowerCase()}-leaning roles, ` +
    `and the differentiator becomes how cleanly you package the evidence rather than whether it exists.`

  const p2 =
    `Demand for your chosen direction (${lead.title.toLowerCase()}) is structurally healthy, but the funnel rewards focus: ` +
    `a tight batch of 8–12 well-targeted applications will out-perform a broad spray, and a warm introduction is worth roughly a dozen cold applications — one open door beats knocking on twelve. ` +
    `Your execution momentum (${momentum}/100) suggests ${momentum >= 60 ? "the cadence to sustain that search without stalling" : "your search will need light external structure to avoid losing momentum mid-process"}.`

  const p3 =
    `The realistic gap to close before your serious push is ${confidenceCluster < 55 ? "primarily confidence and interview composure, not capability — the capability evidence is already on your record" : "narrow: a final tightening of your materials and targeting"}. ` +
    `Factoring your readiness and momentum together${cw.probabilityAdjustment !== 0 ? ", and your counsellor's read of where you actually are," : ""}, a credible time-to-offer estimate is ${ttoLow}–${ttoHigh} months of focused effort. ` +
    `That estimate compresses with each interview rep you complete and each warm connection you open, and lengthens if you let your reserves erode mid-search.`

  return [p1, p2, p3]
}

export interface PlanItem {
  horizon: "First 30 days" | "Days 31–60" | "Days 61–90"
  priority: "P1" | "P2" | "P3"
  title: string
  detail: string
}

export function ninetyDayPlan(client: Client): PlanItem[] {
  const clusters = clusterReads(client)
  const lowest = [...clusters].sort((a, b) => a.score - b.score)[0]
  const confidenceLow = (clusters.find((c) => c.key === "confidence_decision")?.score ?? 100) < 55
  const cw = counsellorWeighting(client)
  // Wellbeing is elevated either by the raw signal (low index / a contradiction)
  // OR by the counsellor's read (their notes flag strain/risk) — the human signal
  // can promote recovery to a P1 deliverable even when the index alone wouldn't.
  const strained = (client.clinical.wellbeingIndex ?? 100) < 60 || !!client.blueprint.contradiction || cw.elevateWellbeing
  const lead = careerRoutes(client)[0]

  const plan: PlanItem[] = [
    {
      horizon: "First 30 days",
      priority: "P1",
      title: "Package your evidence",
      detail: `Consolidate your existing wins into one role-specific CV and a tight portfolio aimed squarely at ${lead.title.toLowerCase()}. The evidence already exists; your task is making it legible at a glance — polishing the shop window, not restocking the shelves.`,
    },
    {
      horizon: "First 30 days",
      priority: confidenceLow ? "P1" : "P2",
      title: confidenceLow ? "Close your confidence gap with reps" : "Sharpen your targeting",
      detail: confidenceLow
        ? "Schedule two to three mock interviews. Your confidence here is built by exposure and structured wins, not by more solo preparation — the reps are the intervention, the way a muscle only grows under load."
        : "Define your 8–12 best-matched target roles and tailor outreach to each rather than applying broadly.",
    },
    {
      horizon: "Days 31–60",
      priority: "P2",
      title: `Address your ${lowest.label.toLowerCase()}`,
      detail: `${lowest.label} is your binding constraint at ${lowest.score}/100. Pick one concrete, time-boxed action against it this month — small and finished beats large and pending.`,
    },
    {
      horizon: "Days 31–60",
      priority: "P2",
      title: "Open warm connections",
      detail: "Reach out to five to eight people in your target field with a specific, low-ask message. Warm introductions are the single highest-leverage move available to you in the search.",
    },
    {
      horizon: "Days 61–90",
      priority: "P2",
      title: "Run your focused application batch",
      detail: `Apply to your targeted set in a concentrated push, track every response, and review the funnel weekly. Treat each interview as a rep that compounds, not a pass/fail.`,
    },
    {
      horizon: "Days 61–90",
      priority: strained ? "P1" : "P3",
      title: strained ? "Protect your reserves as a deliverable" : "Review and recalibrate",
      detail: strained
        ? "Your energy is the variable that decides whether the gains hold. Set one firm boundary (a hard stop, a protected evening) and treat it with the same seriousness as any career task — the tank, not the throttle, is what runs you out of road."
        : "Review your progress against this plan, retire what is done, and recalibrate targets with fresh interview signal in hand.",
    },
  ]
  return plan
}

// ── methodology / appendix copy ───────────────────────────────────────────────

export const METHODOLOGY_NOTES: { title: string; body: string }[] = [
  {
    title: "From signals to index",
    body: "The Career Index is built bottom-up: 31 underlying pc.* signals are grouped into five clusters — Direction & Identity, Market Readiness, Execution & Momentum, Confidence & Decision, and Network & Environment. Cluster scores in this report are confidence-weighted means of their signals, and the headline index is a composite (cx.*) across them. The console renders these values; it never re-scores them.",
  },
  {
    title: "Confidence weighting",
    body: "Each signal carries a confidence level (none → high). Throughout this report, softer evidence is discounted before it contributes to any aggregate, so a high-confidence signal moves a cluster more than a tentative one. Reported confidence labels reflect the weakest meaningful input, not the strongest.",
  },
  {
    title: "Wellbeing proxies",
    body: "The wellbeing layer draws on validated brief measures (e.g. PHQ-2 / GAD-7 screens), engagement and adherence behaviour, and therapeutic-alliance ratings. These are proxies for reserve and sustainability, included because career gains rarely hold when reserves are depleted. They are not a clinical diagnosis.",
  },
  {
    title: "Success probabilities",
    body: "Route probabilities are computed, not assigned: each blends the overall Career Index (40%), the specific clusters the route depends on (35%), RIASEC interest fit (15%), and a stretch factor for distance from the current position (10%), then discounts by blueprint confidence and clamps to a realistic 30–92% band. Probabilities differ across routes because each pulls on different strengths.",
  },
  {
    title: "Limitations",
    body: "This is a structured decision aid, not a guarantee or a diagnosis. Scores are point-in-time and norm-referenced; they move with new evidence and should be interpreted by a qualified counsellor alongside interview, history and the client's own judgement. The market, not the model, ultimately decides outcomes.",
  },
]

// ── the narrative journey (problem → assessment → sessions → synthesis → future) ─

export interface JourneyStage {
  key: "problem" | "assessment" | "sessions" | "synthesis" | "future"
  title: string
  facts: string[] // short bullet strings carrying real numbers / quotes
}

/**
 * The structured DATA for the client's arc. Everything here is pulled from the
 * client's own record + the mock session/test/transcript stores — no fabrication.
 * The AI prose layer narrates over this; the bullets are the load-bearing facts.
 */
export function journey(client: Client): JourneyStage[] {
  const name = addressName(client)
  const ci = client.blueprint.careerIndex ?? 0
  const band = indexBand(ci)
  const holland = hollandCode(client)
  const clusters = clusterReads(client)
  const lead = careerRoutes(client)[0]
  const sessions = clientSessions(client.id)
  const tests = clientTests(client.id)
  const lowestCluster = [...clusters].sort((a, b) => a.score - b.score)[0]
  const topClusters = [...clusters].sort((a, b) => b.score - a.score).slice(0, 2)

  // PROBLEM — the presenting concern, from the headline + the lead direction signal.
  const directionSignal = client.blueprint.signals.find((s) => s.id === "pc.career_clarity")
  const problem: string[] = [
    `Starting point: ${client.headline} — read on intake as “${client.blueprint.headline}.”`,
    `Presenting concern: ${client.blueprint.contradiction?.text ?? "translating a forming sense of direction into a confident, evidenced move."}`,
    directionSignal?.quote ? `In your words: “${directionSignal.quote}.”` : `${name} arrived seeking a clearer, better-evidenced next step.`,
  ]

  // ASSESSMENT — the key test/score findings actually on file.
  const completedTests = tests.filter((t) => t.status === "completed")
  const assessment: string[] = [
    `Career Index ${ci}/100 (${band.label}); interests resolve to a ${holland.code} Holland code led by ${holland.primary.axis} (${holland.primary.value}).`,
    ...completedTests.slice(0, 3).map((t) => `${t.name}: ${t.result}${t.score != null ? ` (${t.score})` : ""}.`),
    `Strongest clusters: ${topClusters.map((c) => `${c.label} (${c.score})`).join(" and ")}; binding constraint: ${lowestCluster.label} (${lowestCluster.score}).`,
  ]

  // SESSIONS — real session summaries + 1–2 transcript quotes from the mock store.
  const attendedSessions = sessions.filter((s) => s.attended && s.summary)
  const sessionFacts: string[] = attendedSessions.slice(0, 3).map((s) => {
    const delta = s.indexDelta != null ? ` (${s.indexDelta > 0 ? "+" : ""}${s.indexDelta} index)` : ""
    return `${s.date}: ${s.summary}${delta}`
  })
  // Pull 1–2 client-voice transcript quotes (the live transcript store is global,
  // most representative for the demo's anchor client; gracefully empty otherwise).
  const clientQuotes = transcript
    .filter((t) => t.speaker !== "Dr. Lin" && t.text)
    .slice(0, 2)
    .map((t) => `“${t.text}” (${t.ts})`)
  const sessionsStage: string[] = [
    sessionFacts.length ? `${attendedSessions.length} session${attendedSessions.length === 1 ? "" : "s"} on record.` : `Sessions are just beginning — the arc below fills in as you meet.`,
    ...sessionFacts,
    ...clientQuotes,
  ]

  // SYNTHESIS — top clusters + the career-index read.
  const synthesis: string[] = [
    `The through-line: your capability base (${topClusters[0]?.label} ${topClusters[0]?.score}) runs ahead of ${lowestCluster.label} (${lowestCluster.score}) — a packaging-and-conviction gap, not a skill gap.`,
    `Career Index ${ci}/100 holds at ${CONFIDENCE_LABEL[client.blueprint.confidence]}; the evidence to move is already on record.`,
    client.clinical.wellbeingIndex != null
      ? `Wellbeing ${client.clinical.wellbeingIndex}/100 (${client.clinical.wellbeingBand ?? "—"}) — the reserve that determines whether the gains stick.`
      : `Wellbeing not yet scored.`,
  ]

  // FUTURE — the top route(s) + the outlook.
  const others = careerRoutes(client).slice(1, 3)
  const future: string[] = [
    `Recommended route: ${lead.title} — ${lead.probability}% modelled success, ${lead.horizon}.`,
    others.length ? `Alternatives held open: ${others.map((r) => `${r.title} (${r.probability}%)`).join("; ")}.` : `Single clear route on current evidence.`,
    `Outlook: a credible offer inside ${lead.horizon} with the 90-day plan run as written.`,
  ]

  return [
    { key: "problem", title: "The Presenting Problem", facts: problem.filter(Boolean) },
    { key: "assessment", title: "What the Assessment Found", facts: assessment.filter(Boolean) },
    { key: "sessions", title: "Through the Sessions", facts: sessionsStage.filter(Boolean) },
    { key: "synthesis", title: "The Synthesis", facts: synthesis.filter(Boolean) },
    { key: "future", title: "The Road Ahead", facts: future.filter(Boolean) },
  ]
}

// ── counsellor's raw notes ────────────────────────────────────────────────────

/** The counsellor's raw observations (verbatim clinical notes). */
export function counsellorNotes(client: Client): string[] {
  return client.clinical.notes ?? []
}

// ── the assembled report model ────────────────────────────────────────────────

export interface ReportModel {
  client: Client
  generatedOn: string
  band: ReturnType<typeof indexBand>
  holland: HollandCode
  bigFive: TraitRead[]
  clusters: ClusterRead[]
  composites: CompositeRead[]
  jobGroups: JobGroup[]
  workRoles: WorkRole[]
  routes: CareerRoute[]
  summary: ExecutiveSummary
  jobMarket: string[]
  plan: PlanItem[]
  journey: JourneyStage[]
  counsellorNotes: string[]
  /** 0–1 — how much counsellor signal is present (drives the outcome adjustment). */
  counsellorWeight: number
  /** Full transparent breakdown of how the counsellor read shifted the outcome. */
  counsellorWeighting: CounsellorWeighting
  methodology: typeof METHODOLOGY_NOTES
}

export function buildReport(client: Client, generatedOn: string): ReportModel {
  const cw = counsellorWeighting(client)
  return {
    client,
    generatedOn,
    band: indexBand(client.blueprint.careerIndex),
    holland: hollandCode(client),
    bigFive: bigFiveReads(client),
    clusters: clusterReads(client),
    composites: compositeReads(client),
    jobGroups: jobGroups(client),
    workRoles: workRoles(client),
    routes: careerRoutes(client),
    summary: executiveSummary(client),
    jobMarket: jobMarketExtrapolation(client),
    plan: ninetyDayPlan(client),
    journey: journey(client),
    counsellorNotes: counsellorNotes(client),
    counsellorWeight: cw.weight,
    counsellorWeighting: cw,
    methodology: METHODOLOGY_NOTES,
  }
}

// Section catalogue for the table of contents (kept in one place so the TOC and
// the rendered headings can never drift apart).
export const REPORT_SECTIONS: { no: string; id: string; title: string }[] = [
  { no: "01", id: "executive-summary", title: "Executive Summary" },
  { no: "02", id: "the-journey", title: "The Journey" },
  { no: "03", id: "personality", title: "Personality" },
  { no: "04", id: "interests", title: "Interests" },
  { no: "05", id: "work-roles", title: "Work Roles" },
  { no: "06", id: "job-groups", title: "Job Groups" },
  { no: "07", id: "abilities", title: "Abilities" },
  { no: "08", id: "career-index", title: "Career Index & Clusters" },
  { no: "09", id: "wellbeing", title: "Wellbeing" },
  { no: "10", id: "trajectory", title: "Trajectory" },
  { no: "11", id: "job-market", title: "Job-Market Outlook" },
  { no: "12", id: "routes", title: "Career Routes" },
  { no: "13", id: "plan", title: "90-Day Plan" },
  { no: "14", id: "counsellors-notes", title: "Counsellor's Notes" },
]
