// ── Business-metrics layer ───────────────────────────────────────────────────
// The deterministic, synthetic-but-coherent data behind the enriched dashboards:
// 12-month time-series, MRR movement (new/expansion/contraction/churn), the
// recurring-revenue retention metrics every SaaS dashboard shows (NRR, GRR, gross
// & net churn, quick ratio, MoM/YoY growth, Rule of 40), engagement (DAU/MAU
// stickiness, activation), an acquisition funnel, signup-cohort retention, segment
// splits, NPS/CSAT, and pacing-to-target. Everything is derived from fixed anchors
// (no Math.random / Date.now at module load) so numbers are stable across renders.
// Swap these accessors for warehouse / Stripe / product-analytics pulls later.

import { REVENUE_BY_PRODUCT, COUNSELLORS } from "./admin-data"

// ── time axis (12 months ending the current month) ───────────────────────────
export const MONTHS = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"]
const N = MONTHS.length

// fixed wobble so series look organic but never change between renders
const WOBBLE = [-0.03, 0.02, -0.01, 0.04, -0.02, 0.01, 0.05, -0.03, 0.02, 0.03, -0.01, 0.0]

/** Public: a deterministic 12-pt series ending at `end` (for per-entity trends). */
export function seriesTo(end: number, gMo = 0.05): number[] { return ramp(end, gMo) }

/** A 12-pt series that ENDS at `end`, growing ~`gMo`/mo backwards, with wobble. */
function ramp(end: number, gMo: number, round = true): number[] {
  const out: number[] = new Array(N)
  out[N - 1] = end
  for (let i = N - 2; i >= 0; i--) {
    const base = out[i + 1] / (1 + gMo)
    const v = base * (1 + WOBBLE[i])
    out[i] = round ? Math.round(v) : v
  }
  return out
}

// ── anchors (current month) ──────────────────────────────────────────────────
const TOTAL_REVENUE = REVENUE_BY_PRODUCT.reduce((s, p) => s + p.revenue, 0) // ~₹2.31Cr
export const ANCHOR = {
  revenue: TOTAL_REVENUE,
  mrr: Math.round(TOTAL_REVENUE * 0.34), // recurring portion — same 34% basis as economics.companyUE so MRR matches across screens
  activeClients: 1284,
  newClients: 168,
  sessions: 942,
  purchases: 5234,
  nps: 61,
  csat: 4.7,
  mau: 1284,
  wau: 742,
  dau: 286,
}

// ── core monthly series ──────────────────────────────────────────────────────
export const SERIES = {
  revenue: ramp(ANCHOR.revenue, 0.084),
  mrr: ramp(ANCHOR.mrr, 0.066),
  activeClients: ramp(ANCHOR.activeClients, 0.058),
  newClients: ramp(ANCHOR.newClients, 0.041),
  sessions: ramp(ANCHOR.sessions, 0.049),
  nps: ramp(ANCHOR.nps, 0.012),
  mau: ramp(ANCHOR.mau, 0.058),
  dau: ramp(ANCHOR.dau, 0.061),
}
export type SeriesKey = keyof typeof SERIES

// ── MRR movement (new / expansion / reactivation / contraction / churned) ─────
export interface MrrMovement {
  month: string
  start: number
  new: number
  expansion: number
  reactivation: number
  contraction: number
  churned: number
  net: number
  end: number
}
const CHURN_RATE = 0.042       // monthly gross revenue churn
const CONTRACTION_RATE = 0.013

export const MRR_MOVEMENT: MrrMovement[] = MONTHS.map((month, i) => {
  const start = i === 0 ? SERIES.mrr[0] / (1 + 0.066) : SERIES.mrr[i - 1]
  const end = SERIES.mrr[i]
  const churned = Math.round(start * CHURN_RATE)
  const contraction = Math.round(start * CONTRACTION_RATE)
  const reactivation = Math.round(start * 0.006)
  // net = new + expansion + reactivation - contraction - churned  →  solve gross adds
  const grossAdds = end - start + churned + contraction - reactivation
  const expansion = Math.max(0, Math.round(grossAdds * 0.34))
  const newM = Math.max(0, grossAdds - expansion)
  return { month, start, new: newM, expansion, reactivation, contraction, churned, net: end - start, end }
})
export const MRR_NOW = MRR_MOVEMENT[N - 1]

// ── retention / growth ratios (current) ──────────────────────────────────────
export interface RetentionStats {
  nrr: number          // net revenue retention %
  grr: number          // gross revenue retention %
  grossChurn: number   // % revenue churn
  netChurn: number     // % (can be negative when expansion > churn)
  quickRatio: number   // (new+expansion)/(contraction+churned)
  growthMoM: number    // %
  growthYoY: number    // %
  ruleOf40: number     // growth% + margin%
  magicNumber: number
}
export function retention(): RetentionStats {
  const m = MRR_NOW
  const grossChurn = ((m.churned + m.contraction) / m.start) * 100
  const expansionPct = ((m.expansion + m.reactivation) / m.start) * 100
  const nrr = 100 - grossChurn + expansionPct
  const grr = 100 - grossChurn
  const quickRatio = (m.new + m.expansion) / Math.max(1, m.contraction + m.churned)
  const growthMoM = ((SERIES.mrr[N - 1] - SERIES.mrr[N - 2]) / SERIES.mrr[N - 2]) * 100
  const growthYoY = ((SERIES.mrr[N - 1] - SERIES.mrr[0]) / SERIES.mrr[0]) * 100
  const grossMarginPct = 58
  return {
    nrr: +nrr.toFixed(1), grr: +grr.toFixed(1), grossChurn: +grossChurn.toFixed(1),
    netChurn: +(grossChurn - expansionPct).toFixed(1),
    quickRatio: +quickRatio.toFixed(1), growthMoM: +growthMoM.toFixed(1),
    growthYoY: +growthYoY.toFixed(0), ruleOf40: Math.round(growthMoM * 12 / 12 + grossMarginPct),
    magicNumber: 1.3,
  }
}

// ── engagement ────────────────────────────────────────────────────────────────
export function engagement() {
  const stickiness = Math.round((ANCHOR.dau / ANCHOR.mau) * 100)
  return { dau: ANCHOR.dau, wau: ANCHOR.wau, mau: ANCHOR.mau, stickiness, activation: 64, // % of signups who complete first assessment
    dauSeries: SERIES.dau, mauSeries: SERIES.mau }
}

// ── acquisition funnel ────────────────────────────────────────────────────────
export interface FunnelStage { label: string; count: number; note: string }
export const FUNNEL: FunnelStage[] = (() => {
  const paid = 1284
  const consult = Math.round(paid / 0.42)   // lead→paid 31% overall; staged
  const assess = Math.round(consult / 0.58)
  const leads = Math.round(assess / 0.46)
  const visitors = Math.round(leads / 0.21)
  return [
    { label: "Site visitors", count: visitors, note: "unique, 30d" },
    { label: "Leads (signups)", count: leads, note: "created account" },
    { label: "Assessment taken", count: assess, note: "≥1 test completed" },
    { label: "Consultation booked", count: consult, note: "session scheduled" },
    { label: "Paid customer", count: paid, note: "purchased a package" },
  ]
})()

// ── signup-cohort retention grid ─────────────────────────────────────────────
// rows = signup month (oldest first), cols = months since signup. Triangular.
// Revenue retention only — see REVENUE_COHORTS below.
export interface Cohort { label: string; size: number; retention: number[] }

// ── segments ──────────────────────────────────────────────────────────────────
export interface Segment { label: string; value: number; tone?: string }
export const SEG_PLAN: Segment[] = [
  { label: "Accelerator", value: 0.31 }, { label: "Big Picture", value: 0.26 },
  { label: "True North", value: 0.18 }, { label: "Admission", value: 0.15 }, { label: "One-off", value: 0.10 },
].map((s) => ({ ...s, value: Math.round(ANCHOR.revenue * s.value) }))
export const SEG_GEO: Segment[] = [
  { label: "Bengaluru", value: 0.22 }, { label: "Delhi NCR", value: 0.19 }, { label: "Mumbai", value: 0.16 },
  { label: "Hyderabad", value: 0.12 }, { label: "Pune", value: 0.10 }, { label: "Chennai", value: 0.09 }, { label: "Rest + Online", value: 0.12 },
].map((s) => ({ ...s, value: Math.round(ANCHOR.revenue * s.value) }))
export const SEG_CHANNEL: Segment[] = [
  { label: "Direct / organic", value: 0.38 }, { label: "Counsellor referral", value: 0.24 },
  { label: "Paid campaign", value: 0.22 }, { label: "School partner", value: 0.16 },
].map((s) => ({ ...s, value: Math.round(ANCHOR.revenue * s.value) }))

// ── targets / pacing ──────────────────────────────────────────────────────────
const DAY_OF_MONTH = 21, DAYS_IN_MONTH = 30
export interface Pace { label: string; target: number; mtd: number; projected: number; pacePct: number; fmt: (n: number) => string }
export function pacing(fmtINR: (n: number) => string): Pace[] {
  const frac = DAY_OF_MONTH / DAYS_IN_MONTH
  const mk = (label: string, target: number, attainMtd: number, fmt: (n: number) => string): Pace => {
    const mtd = Math.round(attainMtd)
    const projected = Math.round(mtd / frac)
    return { label, target, mtd, projected, pacePct: Math.round((projected / target) * 100), fmt }
  }
  const num = (n: number) => n.toLocaleString("en-IN")
  return [
    mk("Revenue", 26_000_000, ANCHOR.revenue * frac * 1.02, fmtINR),
    mk("New customers", 1500, ANCHOR.activeClients * frac * 0.95, num),
    mk("Sessions", 1000, ANCHOR.sessions * frac * 1.0, num),
    mk("MRR", 8_200_000, ANCHOR.mrr * frac * 0.98, fmtINR),
  ]
}

// ── alerts / anomalies (company-level) ───────────────────────────────────────
export interface Alert { id: string; severity: "high" | "medium" | "info"; title: string; detail: string; href?: string }
export const ALERTS: Alert[] = [
  { id: "al_churn", severity: "high", title: "Revenue churn up 0.8pts MoM", detail: "Big Picture tier seeing higher cancellations — 14 at-risk accounts.", href: "/admin/revenue" },
  { id: "al_aicost", severity: "high", title: "AI/voice cost +18% MoM", detail: "LiveKit minutes trending over plan; margin compressing.", href: "/admin/api" },
  { id: "al_sla", severity: "medium", title: "2 counsellors below notes-SLA", detail: "Sana 79%, Dev 84% — both under the 85% target.", href: "/admin/counsellors" },
  { id: "al_noshow", severity: "medium", title: "No-show rate 6.4% (target <5%)", detail: "Concentrated in first-session bookings.", href: "/admin/sessions" },
  { id: "al_deepgram", severity: "info", title: "Deepgram key not set", detail: "Voice STT failing over to backup; configure in Settings.", href: "/admin/settings" },
]

// ── recurring vs transactional revenue split ─────────────────────────────────
// The #1 adaptation for a hybrid business: MRR is the RECURRING slice only
// (counselling retainers + B2B school/college seats). One-off assessments and
// admission-help packages are TRANSACTIONAL — blending them into MRR would
// inflate it and corrupt churn/NRR. Here we report both, side by side.
export const REVENUE_SPLIT = {
  recurring: ANCHOR.mrr,
  transactional: ANCHOR.revenue - ANCHOR.mrr,
  recurringSeries: SERIES.mrr,
  transactionalSeries: SERIES.revenue.map((v, i) => v - SERIES.mrr[i]),
  get recurringPct() { return Math.round((this.recurring / (this.recurring + this.transactional)) * 100) },
}

// ── finance header (cash / burn / runway) ────────────────────────────────────
export const FINANCE = {
  cash: 72_000_000,        // ₹7.2Cr in bank
  grossBurn: 24_000_000,   // monthly operating cost
  get netBurn() { return Math.max(0, this.grossBurn - Math.round(ANCHOR.revenue * 0.86)) }, // burn after collected revenue
  get runwayMonths() { return this.netBurn > 0 ? Math.round(this.cash / this.netBurn) : 99 },
  get netMarginPct() { return Math.round(((ANCHOR.revenue * 0.86 - this.grossBurn) / ANCHOR.revenue) * 100) },
}

// ── revenue leakage (gross bookings → net collected) ─────────────────────────
export interface FlowStep { label: string; value: number; kind: "base" | "up" | "down" }
export function leakageSteps(): FlowStep[] {
  const net = ANCHOR.revenue
  const gross = Math.round(net / 0.83) // ~17% total leakage
  const discounts = Math.round(gross * 0.09)
  const refunds = Math.round(gross * 0.025)
  const fees = Math.round(gross * 0.02)
  const failed = gross - discounts - refunds - fees - net
  return [
    { label: "Gross bookings", value: gross, kind: "base" },
    { label: "Discounts", value: -discounts, kind: "down" },
    { label: "Refunds", value: -refunds, kind: "down" },
    { label: "Payment fees", value: -fees, kind: "down" },
    { label: "Failed / dunning", value: -failed, kind: "down" },
    { label: "Net collected", value: net, kind: "base" },
  ]
}

// ── capacity vs demand (counsellor control tower) ────────────────────────────
export interface CapacityRow { id: string; name: string; initials: string; booked: number; capacity: number; util: number }
export function capacity() {
  const rows: CapacityRow[] = COUNSELLORS.map((c) => {
    const util = Math.max(1, c.utilization) // guard against a 0/invalid utilization → Infinity capacity
    const capacity = Math.max(c.sessionsMonth, Math.round(c.sessionsMonth / (util / 100)))
    return { id: c.id, name: c.name, initials: c.initials, booked: c.sessionsMonth, capacity, util: c.utilization }
  })
  const totalCapacity = rows.reduce((s, r) => s + r.capacity, 0)
  const totalBooked = rows.reduce((s, r) => s + r.booked, 0)
  const utilPct = Math.round((totalBooked / totalCapacity) * 100)
  const demand = Math.round(totalBooked * 1.14)      // requests this month (incl. waitlist)
  const waitlisted = Math.max(0, demand - totalCapacity)
  return { rows, totalCapacity, totalBooked, utilPct, demand, waitlisted, headroom: totalCapacity - totalBooked }
}

// ── customer health score (0–100) ────────────────────────────────────────────
export interface HealthInput { riskFlag: "none" | "low" | "moderate" | "high"; lastActiveDays: number; sessionCount: number; careerIndex: number | null; state: string }
export function healthScore(c: HealthInput): number {
  if (c.state === "archived") return 8
  if (c.state === "paused") return 28
  let s = 58
  s += Math.min(18, (c.careerIndex ?? 50) / 100 * 18)               // outcome signal
  s += Math.min(14, c.sessionCount * 2.2)                           // engagement
  s -= Math.min(20, c.lastActiveDays * 2.4)                         // recency decay
  s -= { none: 0, low: 4, moderate: 14, high: 26 }[c.riskFlag]      // risk
  return Math.max(2, Math.min(100, Math.round(s)))
}
export type HealthBand = "thriving" | "healthy" | "watch" | "at_risk"
export function healthBand(score: number): HealthBand {
  return score >= 78 ? "thriving" : score >= 58 ? "healthy" : score >= 38 ? "watch" : "at_risk"
}

// ── dunning / failed-payment recovery ────────────────────────────────────────
export function dunning() {
  const failed = 142, inRetry = 58, recovered = 71, lost = 13
  return { failed, inRetry, recovered, lost, recoveryRate: Math.round((recovered / failed) * 100), atRiskValue: 286000 }
}

// ── activation funnel (post-signup product activation) ───────────────────────
export const ACTIVATION: FunnelStage[] = (() => {
  const signups = 11459
  const s = (n: number) => Math.round(n)
  return [
    { label: "Signed up", count: signups, note: "created account" },
    { label: "Completed an assessment", count: s(signups * 0.64), note: "activation event" },
    { label: "Booked first session", count: s(signups * 0.34), note: "" },
    { label: "Received a report", count: s(signups * 0.21), note: "" },
    { label: "Repeat purchase", count: s(signups * 0.12), note: "expansion" },
  ]
})()

// ── feature adoption (% of active members using each) ────────────────────────
export const ADOPTION: Segment[] = [
  { label: "Assessments", value: 92 }, { label: "Career report", value: 71 }, { label: "AI guide chat", value: 63 },
  { label: "Counselling sessions", value: 48 }, { label: "Voice agent", value: 27 }, { label: "Messages", value: 41 },
]

// ── lifecycle distribution ───────────────────────────────────────────────────
export const LIFECYCLE: Segment[] = [
  { label: "New", value: 168 }, { label: "Activated", value: 392 }, { label: "Engaged", value: 514 },
  { label: "At-risk", value: 96 }, { label: "Dormant", value: 84 }, { label: "Churned", value: 41 },
]
export const TIME_TO_VALUE_DAYS = 4.2  // signup → first assessment (median)

// ── support & sentiment ──────────────────────────────────────────────────────
export function support() {
  return {
    speedToLeadMin: 7,          // median minutes to first contact a new lead
    firstResponseHrs: 2.4,
    resolutionHrs: 9.6,
    csat: 94,                   // %
    ces: 4.3,                   // /5 (ease)
    nps: ANCHOR.nps,
    slaAttainment: 91,          // %
    ticketsOpen: 38,
    ticketsWeek: 214,
    ticketTrend: seriesTo(214, 0.03),
  }
}

// ── revenue retention cohorts (₹, expansion-capable → can exceed 100%) ───────
export const REVENUE_COHORTS: Cohort[] = MONTHS.map((label, i) => {
  const monthsSince = N - 1 - i
  const size = SERIES.newClients[i]
  const retention: number[] = []
  for (let m = 0; m <= monthsSince; m++) {
    // dip from churn early, then expansion lifts good cohorts above 100
    const dip = 100 - 9 * (1 - Math.exp(-0.6 * m))
    const expand = m * (2.2 + (i % 3))
    retention.push(m === 0 ? 100 : Math.round(dip + expand))
  }
  return { label, size, retention }
})

// ── forecast (project a series forward with a band) ──────────────────────────
export function forecast(series: number[], ahead = 3): { proj: number[]; lo: number[]; hi: number[] } {
  const last = series[series.length - 1]
  const prev = series[series.length - 2]
  // clamp the projected growth so an anomalous last step can't explode the forecast
  const g = series.length > 1 && prev !== 0 ? Math.max(-0.4, Math.min(0.4, (last - prev) / prev)) : 0.05
  const proj: number[] = [], lo: number[] = [], hi: number[] = []
  let v = last
  for (let i = 1; i <= ahead; i++) {
    v = v * (1 + g)
    proj.push(Math.round(v))
    lo.push(Math.round(v * (1 - 0.06 * i)))
    hi.push(Math.round(v * (1 + 0.06 * i)))
  }
  return { proj, lo, hi }
}

// ── segmentation filter (re-scopes widgets) ──────────────────────────────────
export interface SegFilter { id: string; label: string; factor: number }
export const SEG_AUDIENCE: SegFilter[] = [
  { id: "all", label: "All", factor: 1 }, { id: "b2c", label: "B2C consumer", factor: 0.62 }, { id: "b2b", label: "B2B schools", factor: 0.38 },
]
export const SEG_TIER: SegFilter[] = [
  { id: "all", label: "All tiers", factor: 1 }, { id: "premium", label: "Premium", factor: 0.44 }, { id: "core", label: "Core", factor: 0.41 }, { id: "entry", label: "Entry", factor: 0.15 },
]

// ── period selector ───────────────────────────────────────────────────────────
export interface Period { id: string; label: string; scale: number; compare: string }
export const PERIODS: Period[] = [
  { id: "7d", label: "7 days", scale: 0.25, compare: "vs prev 7 days" },
  { id: "30d", label: "30 days", scale: 1, compare: "vs prev 30 days" },
  { id: "qtd", label: "QTD", scale: 2.6, compare: "vs prev quarter" },
  { id: "ytd", label: "YTD", scale: 8.4, compare: "vs prev year" },
]
export const periodById = (id: string) => PERIODS.find((p) => p.id === id) ?? PERIODS[1]
