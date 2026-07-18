// The in-dashboard Career Terminal's brain. Derives market metrics from the
// bundled careers dataset (a mirror of the marketing site's terminal data —
// WEF/BLS/NASSCOM-grounded trends, Indian pay bands, AI exposure) and shapes
// them PER AUDIENCE: students see stream/education-first reads, executives see
// pivot/leadership/comp reads. News comes live from the marketing site's daily
// scrape agent (/api/news, CORS-open) filtered to what each audience actually
// reads. Everything is deterministic — no fabricated numbers.

import { ALL_ROWS, trendPct, type Row } from "./careers-all"
import { CAREERS, MACRO } from "./careers"

/** 10-year demand change for a row, from its real trend series */
export const trendPctOf = (r: Row) => trendPct(r.demandTrend)

export type Audience = "student" | "executive"

export const MARKETING_URL = "https://site-madhavs-projects-56d7586e.vercel.app"

/* ── news (the daily agent) ─────────────────────────────────────────────── */

export interface NewsItem { title: string; source: string; link: string; date: string; tag?: string; stat?: string }

/** tag priority per audience — what each group actually engages with */
const NEWS_ORDER: Record<Audience, string[]> = {
  student: ["Education", "Skills", "Jobs", "AI", "Global"],
  executive: ["Jobs", "AI", "Global", "Skills", "Education"],
}

export function orderNews(items: NewsItem[], aud: Audience): NewsItem[] {
  const rank = new Map(NEWS_ORDER[aud].map((t, i) => [t, i]))
  return [...items].sort((a, b) => (rank.get(a.tag ?? "") ?? 9) - (rank.get(b.tag ?? "") ?? 9))
}

/* ── search ─────────────────────────────────────────────────────────────── */

export function searchCareers(q: string, limit = 8): Row[] {
  const s = q.trim().toLowerCase()
  if (s.length < 2) return []
  const scored = ALL_ROWS
    .map((r) => {
      const name = r.name.toLowerCase()
      const hit = name.startsWith(s) ? 3 : name.includes(s) ? 2
        : r.ticker.toLowerCase().includes(s) || r.cluster.toLowerCase().includes(s) ? 1 : 0
      return { r, hit }
    })
    .filter((x) => x.hit > 0)
    .sort((a, b) => b.hit - a.hit || trendPctOf(b.r) - trendPctOf(a.r))
  return scored.slice(0, limit).map((x) => x.r)
}

/* ── derived market metrics (all computed from the dataset) ─────────────── */

const pct = (r: Row) => trendPctOf(r)

const risers = [...ALL_ROWS].sort((a, b) => pct(b) - pct(a))
const fallers = [...ALL_ROWS].sort((a, b) => pct(a) - pct(b))

/** clusters each audience trades in — students scan everything early-career;
 *  executives watch leadership-weighted, pivot-friendly clusters. These MUST be
 *  exact Row.cluster labels — a mismatch silently collapses the executive scope
 *  to whatever happens to match, so the dev assert below fails loudly if the
 *  dataset's cluster vocabulary ever drifts. */
const EXEC_CLUSTERS = ["Technology & Data", "Business & Finance", "Engineering & Built", "Healthcare & Life Sciences", "Science & Research"]

if (import.meta.env.DEV) {
  const real = new Set(ALL_ROWS.map((r) => r.cluster))
  const dead = EXEC_CLUSTERS.filter((c) => !real.has(c))
  if (dead.length) console.error(`[insights] EXEC_CLUSTERS not in dataset — executive scope will silently shrink: ${dead.join(", ")}`)
}

const inScope = (r: Row, aud: Audience) => (aud === "student" ? true : EXEC_CLUSTERS.includes(r.cluster))

export interface Kpi { label: string; value: string; unit?: string; delta?: number; sub: string; bars: number[] }

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const round1 = (n: number) => Math.round(n * 10) / 10

/** a deterministic bar series for a KPI card (seeded off real trend data) */
function barsFrom(rows: Row[], n = 22): number[] {
  const out: number[] = []
  for (let i = 0; i < n; i++) {
    const r = rows[i % rows.length]
    const t = r.demandTrend
    out.push(t[(i * 3) % t.length])
  }
  const max = Math.max(...out, 1)
  return out.map((v) => Math.max(8, Math.round((v / max) * 100)))
}

export function kpisFor(aud: Audience): Kpi[] {
  const scope = ALL_ROWS.filter((r) => inScope(r, aud))
  const up = scope.filter((r) => r.trajectory === "up")
  const scopeRisers = risers.filter((r) => inScope(r, aud))
  const growth10y = round1(avg(scopeRisers.slice(0, 25).map(pct)))
  const senior = round1(avg(scope.map((r) => r.payHi)))
  const entry = round1(avg(scope.map((r) => r.payLo)))
  const curated = scope.filter((r) => r.aiLevel != null)
  const aiHigh = curated.filter((r) => (r.aiLevel ?? 0) >= 3).length
  const aiShare = curated.length ? Math.round((aiHigh / curated.length) * 100) : 0

  if (aud === "student") {
    return [
      { label: "Careers tracked", value: String(scope.length), delta: undefined, sub: `${up.length} in a rising trajectory`, bars: barsFrom(scope) },
      { label: "Top-25 demand growth", value: `+${growth10y}`, unit: "%", delta: growth10y, sub: "10-year demand, fastest risers", bars: barsFrom(scopeRisers.slice(0, 25)) },
      { label: "Entry pay, tracked set", value: `₹${entry}`, unit: "L", delta: undefined, sub: "average entry-level band (LPA)", bars: barsFrom(scope.slice(0, 30)) },
      { label: "Youth employability", value: "54.8", unit: "%", delta: 3.5, sub: "India Skills Report 2025 (↑ from 51.3%)", bars: barsFrom(scopeRisers.slice(10, 40)) },
    ]
  }
  return [
    { label: "Pivot-ready careers", value: String(scope.length), delta: undefined, sub: `${up.length} rising in your clusters`, bars: barsFrom(scope) },
    { label: "Top-25 demand growth", value: `+${growth10y}`, unit: "%", delta: growth10y, sub: "10-year demand, fastest risers", bars: barsFrom(scopeRisers.slice(0, 25)) },
    { label: "Senior pay, tracked set", value: `₹${senior}`, unit: "L", delta: undefined, sub: "average senior band (LPA)", bars: barsFrom(scope.slice(0, 30)) },
    { label: "High AI-exposure roles", value: String(aiShare), unit: "%", delta: undefined, sub: "of curated roles read high exposure", bars: barsFrom(fallers.filter((r) => inScope(r, aud)).slice(0, 25)) },
  ]
}

/** the movers board — audience-scoped risers + a couple of honest fallers */
export function moversFor(aud: Audience, n = 8): Row[] {
  const scopeRisers = risers.filter((r) => inScope(r, aud))
  const scopeFallers = fallers.filter((r) => inScope(r, aud) && pct(r) < 0)
  return [...scopeRisers.slice(0, n - 2), ...scopeFallers.slice(0, 2)]
}

/** the watchlist — curated set the audience most asks about */
const STUDENT_WATCH = ["data-scientist", "ai-ml-engineer", "product-manager", "clinical-psychologist", "chartered-accountant", "ux-designer"]
const EXEC_WATCH = ["product-manager", "ai-ml-engineer", "management-consultant", "data-scientist", "investment-banking-analyst", "cybersecurity-analyst"]

export function watchlistFor(aud: Audience): Row[] {
  const ids = aud === "student" ? STUDENT_WATCH : EXEC_WATCH
  const byId = new Map(ALL_ROWS.map((r) => [r.id, r]))
  return ids.map((id) => byId.get(id)).filter((r): r is Row => !!r)
}

/** the 2030 outlook segments (WEF Future of Jobs 2025 — real report figures) */
export const OUTLOOK = {
  headline: "170M", headlineLabel: "new jobs created globally by 2030",
  segments: [
    { label: "Created", value: 170, tone: "well" as const },
    { label: "Displaced", value: 92, tone: "warn" as const },
    { label: "Net new", value: 78, tone: "brand" as const },
  ],
  note: "22% of today's jobs disrupted; 39% of core skills change by 2030 — WEF Future of Jobs 2025",
}

export { MACRO, CAREERS, ALL_ROWS }
export type { Row }

/* ── audience copy + chatbot hooks ──────────────────────────────────────── */

export const AUDIENCE_COPY: Record<Audience, { title: string; sub: string; searchPlaceholder: string; readingLabel: string }> = {
  student: {
    title: "Terminal",
    sub: "Live demand, pay and AI-exposure for every path you're weighing — grounded in WEF, BLS, NASSCOM and India Skills Report data.",
    searchPlaceholder: "Search any career — “data scientist”, “psychologist”, “pilot”…",
    readingLabel: "What students are reading",
  },
  executive: {
    title: "Terminal",
    sub: "The pivot market on one screen — demand, senior comp and AI-exposure for the moves professionals actually make.",
    searchPlaceholder: "Search a role or a pivot — “product manager”, “consultant”…",
    readingLabel: "What professionals are reading",
  },
}

export function askPromptsFor(aud: Audience, career?: Row): string[] {
  if (career) {
    return aud === "student"
      ? [`Is ${career.name} a good fit for me?`, `What should I study to become a ${career.name}?`, `How AI-proof is ${career.name}?`]
      : [`How do I pivot into ${career.name} from my current role?`, `What does ${career.name} pay at a senior level?`, `Is ${career.name} resilient to AI?`]
  }
  return aud === "student"
    ? ["Which of these rising careers fits my test results?", "What stream should I pick for a tech career?", "Compare data science vs product management for me"]
    : ["Which pivot fits my experience best?", "What's the smartest AI-era move from my role?", "How do I benchmark my compensation?"]
}

/* ── the signals — why this decision can't wait ─────────────────────────────
   The board that names what the audience is actually up against. Every figure
   is real and carries its source (same discipline as the marketing site's
   Stakes section — several figures are shared with it deliberately). */

export interface Signal {
  stat: string
  label: string
  source: string
  tone: "risk" | "warn" | "brand" | "well"
}

export const SIGNALS: Record<Audience, Signal[]> = {
  student: [
    { stat: "93%", label: "of Indian schools have no dedicated career counsellor", source: "Higher Education Digest, 2023", tone: "risk" },
    { stat: "1:3,000", label: "counsellor-to-student ratio — the guideline is 1:250", source: "Global Career Counsellor, 2023", tone: "warn" },
    { stat: "51%", label: "of graduates assessed employable — years and fees later", source: "India Skills Report, 2024", tone: "risk" },
    { stat: "23 lakh", label: "sat NEET in 2024 — most deciding under pressure", source: "NTA, 2024", tone: "brand" },
    { stat: "47%", label: "of adults wish they had chosen a different path", source: "Harris Poll for CNBC, 2021", tone: "warn" },
  ],
  executive: [
    { stat: "86%", label: "of Indian professionals want to switch jobs", source: "foundit Appraisal Survey, 2024–25", tone: "risk" },
    { stat: "59%", label: "workplace burnout in India — the highest measured globally", source: "McKinsey Health Institute", tone: "warn" },
    { stat: "1.3L+", label: "tech workers laid off across 2025 alone", source: "Layoffs.fyi tracker, 2025", tone: "risk" },
    { stat: "23%", label: "employee engagement in India — a four-year low", source: "Gallup, 2025", tone: "warn" },
    { stat: "39%", label: "of core skills change by 2030", source: "WEF Future of Jobs, 2025", tone: "brand" },
  ],
}

/** the line under the numbers — what the board actually means for this reader */
export const SIGNAL_BRIDGE: Record<Audience, string> = {
  student: "The system measures the exam, never the student. That is the gap a measured decision closes.",
  executive: "The market is repricing careers faster than loyalty can. A pivot is safest priced early — on evidence.",
}

/** the terminal's one sell — the track's anchor programme (2026 catalog ids) */
export const SELL: Record<Audience, { offeringId: string; name: string; priceInr: number; line: string }> = {
  student: { offeringId: "sj_big_picture", name: "Big Picture", priceInr: 14990, line: "The full map — every option weighed, parents in the room, anxiety handled." },
  executive: { offeringId: "pro_pivot", name: "Pivot", priceInr: 24990, line: "A structured switch — what transfers, what it costs, what it pays on the other side." },
}
