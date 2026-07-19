// Admin data layer — the company-wide view. Everything the admin dashboard
// renders comes from here, behind typed accessors so the source can swap from
// these synthesised values to live server pulls (FastAPI/Appwrite) without
// touching a screen. Where real fixtures exist (clients, the lead counsellor,
// sessions, the product catalogue) we reuse them; the rest (the wider team, API
// usage, revenue) is realistic synthetic data tagged for replacement.
//
// NOTE: deterministic only — no Date.now()/Math.random() at module load, so the
// numbers are stable across renders.

import { clients as mockClients, sessions as mockSessions } from "@/lib/mock"
import { PRODUCTS, getProduct } from "@/portal/products"
import type { Client } from "@/lib/types"

export type Trend = "up" | "down" | "flat"

export interface Kpi {
  key: string
  label: string
  value: string
  /** % change vs previous period (signed) */
  delta: number
  trend: Trend
  /** tiny sparkline series */
  series: number[]
  tone: "brand" | "well" | "mind" | "warn" | "risk"
  /** target for red/amber/green; optional */
  target?: string
  hint?: string
}

// ── KPI matrix (custom-configurable later) ───────────────────────────────────
const spark = (base: number, n = 12): number[] =>
  Array.from({ length: n }, (_, i) => Math.round(base * (0.82 + 0.04 * i + (i % 3 === 0 ? 0.05 : -0.02))))

export const KPIS: Kpi[] = [
  { key: "active_clients", label: "Active clients", value: "1,284", delta: 8.2, trend: "up", series: spark(1100), tone: "brand", target: "1,500", hint: "Engaged in the last 30 days" },
  { key: "sessions_month", label: "Sessions this month", value: "942", delta: 5.1, trend: "up", series: spark(880), tone: "mind", target: "1,000" },
  { key: "revenue_month", label: "Revenue (MTD)", value: "₹48.6L", delta: 12.4, trend: "up", series: spark(40), tone: "well", target: "₹55L" },
  { key: "reports", label: "Reports generated", value: "613", delta: 3.0, trend: "up", series: spark(560), tone: "mind" },
  { key: "tests_taken", label: "Tests taken", value: "2,071", delta: 9.7, trend: "up", series: spark(1800), tone: "brand" },
  { key: "ai_minutes", label: "AI minutes used", value: "18,420", delta: 21.5, trend: "up", series: spark(14000), tone: "mind", hint: "Across guide + voice" },
  { key: "conversion", label: "Lead → paid", value: "31%", delta: 1.8, trend: "up", series: spark(28), tone: "well", target: "35%" },
  { key: "csat", label: "Avg. rating", value: "4.7", delta: 0.1, trend: "up", series: spark(46), tone: "well", target: "4.8" },
  { key: "active_counsellors", label: "Active counsellors", value: "55", delta: 0, trend: "flat", series: spark(54), tone: "brand" },
  { key: "no_show", label: "No-show rate", value: "6.4%", delta: -1.2, trend: "down", series: spark(8), tone: "warn", target: "<5%", hint: "Lower is better" },
  { key: "ai_cost", label: "AI/voice cost (MTD)", value: "₹1.12L", delta: 18.0, trend: "up", series: spark(95), tone: "warn", hint: "Provider spend" },
  { key: "ai_margin", label: "AI credit margin", value: "62%", delta: 2.4, trend: "up", series: spark(58), tone: "well", hint: "Credits billed vs cost" },
]

// ── Counsellors / team ───────────────────────────────────────────────────────
export interface Counsellor {
  id: string
  name: string
  title: string
  initials: string
  caseload: number
  sessionsMonth: number
  rating: number
  utilization: number // %
  notesSlaPct: number // % notes approved within SLA
  revenueMonth: number // INR
  responseHrs: number
  status: "active" | "on_leave" | "probation"
}

// The live counsellor roster (81 real navigators) drives the admin — see
// counsellor-roster.ts (useAdminCounsellors). This demo array is intentionally
// EMPTY so no fabricated counsellor (names / caseload / rating / revenue) renders.
export const COUNSELLORS: Counsellor[] = []

// NOTE: provider usage/cost is no longer modelled here. The API & usage screen
// (src/admin/screens/AdminApi.tsx) reads REAL figures live from /api/providers
// (Razorpay transactions, OpenRouter credits) — no
// synthetic provider table.

// ── Revenue by product ───────────────────────────────────────────────────────
export interface ProductRevenue { productId: string; name: string; units: number; revenue: number }
export const REVENUE_BY_PRODUCT: ProductRevenue[] = PRODUCTS.map((p, i) => {
  const units = [620, 410, 980, 340, 210, 540, 1240, 88, 36, 150][i % 10]
  const price = p.priceFrom || p.tiers?.[0].price || 1990
  return { productId: p.id, name: p.name, units, revenue: units * price }
}).sort((a, b) => b.revenue - a.revenue)

// ── client journey stage (for the admin client list) ─────────────────────────
export type JourneyStage = "profile" | "testing" | "sessions" | "report" | "complete"
export interface AdminClient extends Client {
  stage: JourneyStage
  ltv: number
  lastActiveDays: number
  counsellorId: string
}

const STAGES: JourneyStage[] = ["profile", "testing", "sessions", "report", "complete"]
export const ADMIN_CLIENTS: AdminClient[] = mockClients.map((c, i) => ({
  ...c,
  stage: STAGES[(c.sessionCount + i) % STAGES.length],
  ltv: 4990 + (c.sessionCount ?? 0) * 2990 + (i % 3) * 2000,
  lastActiveDays: (i * 2) % 9,
  counsellorId: COUNSELLORS.length ? COUNSELLORS[i % COUNSELLORS.length].id : "",
}))

export const getAdminClient = (id: string) => ADMIN_CLIENTS.find((c) => c.id === id)
export const getCounsellor = (id: string) => COUNSELLORS.find((c) => c.id === id)
export const sessionsForClient = (id: string) => mockSessions.filter((s) => s.clientId === id)

export const fmtINR = (n: number): string => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)}Cr`
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`
  return `₹${n}`
}

export const STAGE_LABEL: Record<JourneyStage, string> = {
  profile: "Profile", testing: "Testing", sessions: "Sessions", report: "Report", complete: "Complete",
}

export { PRODUCTS, getProduct }
