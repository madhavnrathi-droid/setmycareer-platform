// The real Career Tests + career-fit scoring engine. Pure, deterministic, no app deps — so it
// can be unit-reasoned and reused on both client and counsellor sides.
//
//   • scorePersonality — 72 items → reverse-key → subfactor mean → factor mean →
//     norm-referenced percentile (244-sample norms) → Low/Average/High band.
//   • scoreInterest — cluster items → 0–100 cluster scores → mapped onto the 34
//     JCE Basic Interest scales (the space the weight matrices live in).
//   • jceFits — normalise the 34-scale profile, Pearson-correlate against each of
//     the 30 Job-Group and 17 Education-Group weight vectors → similarity, Fit%
//     and band, ranked. This is the JCE manual's profile-similarity method.

import { PERSONALITY_FACTORS } from "./personality-data"
import { JCE_SCALES, JOB_WEIGHTS, EDU_WEIGHTS } from "./jce-weights"
import { INTEREST_CLUSTERS } from "./interest-data"

const mean = (a: number[]) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0)
const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)))
const round = (n: number, d = 3) => Math.round(n * 10 ** d) / 10 ** d

/** Standard-normal CDF (Abramowitz & Stegun 26.2.17) — for norm-referenced %ile. */
function normalCdf(z: number): number {
  const az = Math.abs(z)
  const t = 1 / (1 + 0.2316419 * az)
  const d = 0.3989423 * Math.exp((-az * az) / 2)
  // tail probability Q(az) = P(X > az)
  const q = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return z >= 0 ? 1 - q : q
}

export type Band3 = "Low" | "Average" | "High"
const band3 = (pct: number): Band3 => (pct < 34 ? "Low" : pct <= 66 ? "Average" : "High")

// ── personality ──────────────────────────────────────────────────────────────

export interface SubResult { key: string; label: string; raw: number; percentile: number; band: Band3 }
export interface FactorResult extends SubResult { subfactors: SubResult[] }
export interface PersonalityResult { factors: FactorResult[]; overall: number }

/** Total number of personality items (72), in the order scorePersonality expects. */
export const PERSONALITY_ITEM_COUNT = PERSONALITY_FACTORS.reduce(
  (n, f) => n + f.subfactors.reduce((m, s) => m + s.items.length, 0),
  0,
)

export function scorePersonality(answers: number[]): PersonalityResult {
  let idx = 0
  const factors: FactorResult[] = PERSONALITY_FACTORS.map((f) => {
    const subfactors: SubResult[] = f.subfactors.map((s) => {
      const vals = s.items.map((it) => {
        const a = answers[idx++] ?? 3
        return it.reverse ? 6 - a : a
      })
      const raw = mean(vals)
      const z = s.normSd ? (raw - s.normMean) / s.normSd : 0
      const percentile = clamp(normalCdf(z) * 100)
      return { key: s.key, label: s.label, raw: round(raw, 2), percentile, band: band3(percentile) }
    })
    const raw = mean(subfactors.map((s) => s.raw))
    const z = f.normSd ? (raw - f.normMean) / f.normSd : 0
    const percentile = clamp(normalCdf(z) * 100)
    return { key: f.key, label: f.label, raw: round(raw, 2), percentile, band: band3(percentile), subfactors }
  })
  const overall = clamp(mean(factors.map((f) => f.percentile)))
  return { factors, overall }
}

// ── interest → 34 JCE scales ─────────────────────────────────────────────────

// Each modern interest cluster loads onto 1–3 classic JCE Basic Interest scales
// (the space the JCE weight matrices use). Keyed by cluster label.
const CLUSTER_TO_JCE: Record<string, string[]> = {
  "Sales & Business Development": ["Sales", "Business", "Mediation & Persuasion"],
  "Digital & Search-based Marketing": ["Sales", "Business", "Creative Arts"],
  "Finance, Accounting & Banking": ["Finance", "Mathematics", "Office Work"],
  "Entrepreneurship & Start-ups": ["Business", "Supervising Others", "Adventure"],
  "General Management & Strategy": ["Supervising Others", "Business", "Consulting"],
  "Human Resource Management": ["Social Service", "Supervising Others", "Personal Service"],
  "Law & Legal Services": ["Law", "Mediation & Persuasion", "Social Science"],
  "Public Policy & Governance": ["Social Science", "Law", "Authoritarian Leadership"],
  "Administration & Office Support": ["Office Work", "Organization", "Accountability"],
  "Education & Teaching": ["Teaching", "Elementary Education", "Social Service"],
  "Physical Science & Research": ["Physical Science", "Mathematics", "Life Science"],
  "Social Science & Research": ["Social Science", "Author-Journalism", "Technical Writing"],
  "Engineering (Core)": ["Engineering", "Physical Science", "Mathematics"],
  "IT & Software Development": ["Engineering", "Mathematics", "Technical Writing"],
  "Data Science & Analytics": ["Mathematics", "Physical Science", "Engineering"],
  "Artificial Intelligence & Robotics": ["Engineering", "Mathematics", "Physical Science"],
  "Healthcare (Medicine & Nursing)": ["Medical Service", "Life Science", "Personal Service"],
  "Allied Health (Pharmacy, Therapy, Lab)": ["Medical Service", "Life Science", "Skilled Trades"],
  "Psychology & Counselling": ["Social Service", "Social Science", "Personal Service"],
  "Social Work & Community Service": ["Social Service", "Personal Service", "Elementary Education"],
  "Hospitality & Tourism": ["Personal Service", "Adventure", "Sales"],
  "Event Management": ["Supervising Others", "Performing Arts", "Sales"],
  "Creative Arts & Design": ["Creative Arts", "Performing Arts", "Author-Journalism"],
  "Performing Arts & Music": ["Performing Arts", "Creative Arts"],
  "Journalism, Media & Communication": ["Author-Journalism", "Technical Writing", "Mediation & Persuasion"],
  "Writing & Content Creation": ["Author-Journalism", "Technical Writing", "Creative Arts"],
  "Architecture & Planning": ["Engineering", "Creative Arts", "Physical Science"],
  "Agriculture & Environment": ["Nature-Agriculture", "Life Science", "Skilled Trades"],
  "Defence, Police & Safety Services": ["Adventure", "Authoritarian Leadership", "Skilled Trades"],
  "Operations Management": ["Supervising Others", "Organization", "Business"],
  "Retail & Merchandising": ["Sales", "Business", "Personal Service"],
  "Supply Chain Management": ["Organization", "Business", "Mathematics"],
}

export interface ClusterResult { key: string; label: string; score: number }
export interface InterestResult { clusters: ClusterResult[]; profile34: number[] }

/** Number of interest items, in the order scoreInterest expects. */
export const INTEREST_ITEM_COUNT = INTEREST_CLUSTERS.reduce((n, c) => n + c.items.length, 0)

export function scoreInterest(answers: number[]): InterestResult {
  let idx = 0
  const clusters: ClusterResult[] = INTEREST_CLUSTERS.map((c) => {
    const vals = c.items.map(() => answers[idx++] ?? 3)
    return { key: c.key, label: c.label, score: clamp(((mean(vals) - 1) / 4) * 100) }
  })
  // project clusters onto the 34 JCE scales (unmeasured scales stay neutral at 50)
  const acc: Record<string, number[]> = {}
  for (const c of clusters) {
    for (const scale of CLUSTER_TO_JCE[c.label] ?? []) (acc[scale] ??= []).push(c.score)
  }
  const profile34 = JCE_SCALES.map((scale) => (acc[scale]?.length ? clamp(mean(acc[scale])) : 50))
  return { clusters, profile34 }
}

// ── JCE fit (education + job groups) ──────────────────────────────────────────

function pearson(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length)
  if (!n) return 0
  const ma = mean(a.slice(0, n))
  const mb = mean(b.slice(0, n))
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    const xa = a[i] - ma, xb = b[i] - mb
    num += xa * xb; da += xa * xa; db += xb * xb
  }
  const den = Math.sqrt(da * db)
  return den === 0 ? 0 : num / den
}

// Contiguous band scan (the workbook's Read Me states contiguous cut-points; the
// literal Lookup table left ~0.01 gaps that would mislabel a fit as "Neutral").
function jceBand(sim: number): string {
  if (sim < -0.6) return "Very Low"
  if (sim < -0.25) return "Low"
  if (sim <= 0.25) return "Neutral"
  if (sim <= 0.4) return "Moderately High"
  if (sim <= 0.6) return "High"
  return "Very High"
}

export interface GroupFit { group: string; similarity: number; fitPct: number; band: string }
export interface JceResult { education: GroupFit[]; jobs: GroupFit[] }

/** Rank Education + Job groups by JCE profile-similarity to a 34-scale profile. */
export function jceFits(profile34: number[]): JceResult {
  const z = profile34.map((p) => (p - 50) / 25)
  const fit = (weights: Record<string, number[]>): GroupFit[] =>
    Object.entries(weights)
      .map(([group, w]) => {
        const sim = pearson(z, w)
        return { group, similarity: round(sim, 3), fitPct: clamp((sim + 1) / 2 * 100), band: jceBand(sim) }
      })
      .sort((a, b) => b.similarity - a.similarity)
  return { education: fit(EDU_WEIGHTS), jobs: fit(JOB_WEIGHTS) }
}

/** Convenience: interest answers → ranked JCE education + job fits. */
export function interestToJce(answers: number[]): InterestResult & JceResult {
  const interest = scoreInterest(answers)
  return { ...interest, ...jceFits(interest.profile34) }
}
