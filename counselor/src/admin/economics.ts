// Unit economics + accounting model. A clearer accounting lens over the raw
// revenue: per-product contribution (price − COGS), company-level CAC / LTV /
// payback, and the channel / geography / trend breakdowns the revenue drill-down
// uses. COGS ratios and the acquisition assumptions are explicit, editable
// DRIVERS — the one place to change when the real finance numbers land.

import { REVENUE_BY_PRODUCT, type ProductRevenue } from "./admin-data"

// ── editable drivers (assumptions) ───────────────────────────────────────────
export const DRIVERS = {
  blendedCac: 1850,          // ₹ to acquire one paying member (blended)
  grossMarginTargetPct: 70,  // finance target
  monthlyChurnPct: 4.2,      // monthly subscription churn
  refDiscountPct: 12,        // avg counsellor-referral discount
  paymentFeePct: 2.0,        // Razorpay
}

// service-heavy products carry counsellor time as COGS; digital ones are light.
const SERVICE_RE = /session|consult|counsel|domain|admission|coaching|mentor|guidance|package|true north/i
const cogsPctFor = (name: string): number => (SERVICE_RE.test(name) ? 0.44 : 0.19) + DRIVERS.paymentFeePct / 100

export interface ProductUE {
  productId: string
  name: string
  units: number
  revenue: number
  price: number
  cogs: number          // per unit
  contribution: number  // per unit
  marginPct: number
}

export function productUE(p: ProductRevenue): ProductUE {
  const price = p.units > 0 ? Math.round(p.revenue / p.units) : 0
  const cogs = Math.round(price * cogsPctFor(p.name))
  const contribution = price - cogs
  return { productId: p.productId, name: p.name, units: p.units, revenue: p.revenue, price, cogs, contribution, marginPct: price > 0 ? Math.round((contribution / price) * 100) : 0 }
}

export const ALL_UE: ProductUE[] = REVENUE_BY_PRODUCT.map(productUE)

// ── company-level unit economics ─────────────────────────────────────────────
export interface CompanyUE {
  members: number
  arpu: number              // revenue / paying member (this month)
  grossMarginPct: number
  contributionPerMember: number
  blendedCac: number
  ltv: number
  ltvCac: number
  paybackMonths: number
  mrr: number
  totalRevenue: number
  totalContribution: number
}

export function companyUE(): CompanyUE {
  const totalRevenue = ALL_UE.reduce((s, p) => s + p.revenue, 0)
  const totalCogs = ALL_UE.reduce((s, p) => s + p.cogs * p.units, 0)
  const totalContribution = totalRevenue - totalCogs
  const units = ALL_UE.reduce((s, p) => s + p.units, 0)
  // treat unique paying members as ~62% of purchases (some buy multiple products)
  const members = Math.round(units * 0.62)
  const arpu = Math.round(totalRevenue / Math.max(1, members))
  const grossMarginPct = Math.round((totalContribution / totalRevenue) * 100)
  const contributionPerMember = Math.round(totalContribution / Math.max(1, members))
  // lifespan from churn (months) → LTV = contribution/member/month × lifespan.
  // ARPU here is monthly-ish; approximate avg member life at 1/churn capped.
  const lifeMonths = Math.min(36, Math.round(100 / DRIVERS.monthlyChurnPct))
  const ltv = Math.round(contributionPerMember * (lifeMonths / 6)) // contribution is ~per 6-mo engagement
  const ltvCac = +(ltv / DRIVERS.blendedCac).toFixed(1)
  const paybackMonths = +((DRIVERS.blendedCac / Math.max(1, contributionPerMember)) * 6).toFixed(1)
  const mrr = Math.round(totalRevenue * 0.34) // subscription portion
  return { members, arpu, grossMarginPct, contributionPerMember, blendedCac: DRIVERS.blendedCac, ltv, ltvCac, paybackMonths, mrr, totalRevenue, totalContribution }
}

// ── revenue drill-down: trend, channel + geography splits ─────────────────────
function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }

const CHANNELS = ["Direct", "Counsellor referral", "Campaign", "School partner"]
const CITIES = ["Bengaluru", "Delhi NCR", "Mumbai", "Hyderabad", "Pune", "Chennai", "Online"]

export interface ProductBreakdown {
  trend: number[]             // last 8 months of units
  channels: { label: string; units: number; revenue: number }[]
  cities: { label: string; pct: number }[]
  ue: ProductUE
}

export function productBreakdown(p: ProductRevenue): ProductBreakdown {
  const h = hash(p.productId)
  const ue = productUE(p)
  const trend = Array.from({ length: 8 }, (_, i) => {
    const wobble = ((h >> (i % 12)) & 7) / 10 // 0–0.7
    return Math.round((p.units / 8) * (0.7 + 0.06 * i + wobble))
  })
  // channel split — deterministic weights summing to ~1
  const w = CHANNELS.map((_, i) => 1 + ((h >> (i * 3)) & 7))
  const wSum = w.reduce((s, x) => s + x, 0)
  const channels = CHANNELS.map((label, i) => {
    const units = Math.round((p.units * w[i]) / wSum)
    return { label, units, revenue: units * ue.price }
  })
  // top cities
  const cw = CITIES.map((_, i) => 1 + ((h >> (i * 2)) & 15))
  const cSum = cw.reduce((s, x) => s + x, 0)
  const cities = CITIES.map((label, i) => ({ label, pct: Math.round((cw[i] / cSum) * 100) }))
    .sort((a, b) => b.pct - a.pct).slice(0, 5)
  return { trend, channels, cities, ue }
}
