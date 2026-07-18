// Client 360 — the synthesised-but-deterministic layer behind the admin's full
// client view: which packages a member has taken, and a unified activity timeline
// stitched from every real touchpoint (purchases, tests, reports, sessions,
// notes, bookings, messages, account state). Reports + tests + notes come from the
// real fixtures; packages and the join date are modeled per client so every
// profile is populated. Swap for ledger + event-log pulls when the backend lands.

import { getProduct } from "@/portal/products"
import { offering2026ById, CREDIT_PACKS_2026, NEW_TIER_IDS } from "../server/offerings-2026"
import { clientTests, clientReports as mockClientReports, notes as allNotes } from "@/lib/mock"
import { sessionsForClient } from "./admin-data"
import type { PortalBooking, PortalMessage, Purchase } from "@/portal/portal-store"
import type { CompanyClient } from "./company-store"

function hash(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
const fmtINR = (n: number): string => (n >= 100000 ? `₹${(n / 100000).toFixed(2)}L` : n >= 1000 ? `₹${(n / 1000).toFixed(1)}K` : `₹${n}`)

// ── packages a member has taken ──────────────────────────────────────────────
export interface Enrollment {
  productId: string
  name: string
  tier?: string
  price: number
  at: string          // ISO purchase date
  status: "active" | "completed" | "scheduled"
  /** True when the purchase is a 2026-catalog tier id (NEW_TIER_IDS) — badge it. */
  is2026?: boolean
}

const STAGE_ORDER = ["profile", "testing", "sessions", "report", "complete"]

/** Deterministic package history for a client, plus any live portal purchases. */
export function clientPackages(c: CompanyClient, livePurchases: Purchase[] = []): Enrollment[] {
  const h = hash(c.id)
  const join = joinDate(c)
  const out: Enrollment[] = []
  const stageIdx = STAGE_ORDER.indexOf(c.stage)

  if (!c.manual) {
    // entry assessment everyone has
    const entry = ["job_domain", "stream_selector", "diy_career"][h % 3]
    const ep = getProduct(entry)
    if (ep) out.push({ productId: entry, name: ep.name, price: ep.priceFrom || 1990, at: addDays(join, 2), status: "completed" })

    // a success package once they're into sessions
    if (stageIdx >= 2) {
      const pkg = getProduct("success_package")
      const tier = pkg?.tiers?.[h % 3]
      if (pkg && tier) out.push({ productId: "success_package", name: pkg.name, tier: tier.name, price: tier.price, at: addDays(join, 9), status: stageIdx >= 4 ? "completed" : "active" })
    }
    // an ongoing add-on for some
    if (h % 2 === 0) {
      const a = getProduct("psych_consult")
      if (a) out.push({ productId: "psych_consult", name: a.name, price: a.priceFrom, at: addDays(join, 21), status: "active" })
    } else if (h % 3 === 0) {
      const a = getProduct("additional_session")
      if (a) out.push({ productId: "additional_session", name: a.name, price: a.priceFrom, at: addDays(join, 30), status: "active" })
    }
  }

  // live portal purchases (real)
  for (const p of livePurchases) {
    const is2026 = NEW_TIER_IDS.has(p.productId) || (!!p.tierId && NEW_TIER_IDS.has(p.tierId))
    const prod = getProduct(p.productId)
    if (prod) {
      const tier = prod.tiers?.find((t) => t.id === p.tierId)
      out.push({ productId: p.productId, name: prod.name, tier: tier?.name, price: tier?.price ?? prod.priceFrom, at: p.at, status: "active", is2026 })
      continue
    }
    // 2026-catalog ids aren't in the legacy portal product list — resolve them
    // from the 2026 contract so new purchases still show (with the 2026 badge).
    const id = p.tierId && NEW_TIER_IDS.has(p.tierId) ? p.tierId : p.productId
    const o = offering2026ById(id)
    const pack = CREDIT_PACKS_2026.find((k) => k.id === id)
    if (o) out.push({ productId: p.productId, name: o.name, price: o.inr, at: p.at, status: "active", is2026: true })
    else if (pack) out.push({ productId: p.productId, name: pack.name, price: pack.inr, at: p.at, status: "active", is2026: true })
  }
  return out
}

export const enrollmentPrice = fmtINR

// ── join date (deterministic) ────────────────────────────────────────────────
function joinDate(c: CompanyClient): string {
  if (c.createdAt) return c.createdAt
  const dates = sessionsForClient(c.id).map((s) => s.date).filter(Boolean).sort()
  const base = dates[0] ? new Date(dates[0]) : new Date("2026-03-01")
  base.setDate(base.getDate() - 24)
  return base.toISOString()
}
function addDays(iso: string, d: number): string { const x = new Date(iso); x.setDate(x.getDate() + d); return x.toISOString() }

// ── unified activity timeline ────────────────────────────────────────────────
export type ActivityKind = "join" | "package" | "test" | "report" | "session" | "booking" | "note" | "message" | "state"
export interface ActivityEvent { ts: string; kind: ActivityKind; title: string; detail?: string; tone: "brand" | "well" | "mind" | "warn" | "ink" }

export function clientActivity(c: CompanyClient, packages: Enrollment[], bookings: PortalBooking[], thread: PortalMessage[]): ActivityEvent[] {
  const ev: ActivityEvent[] = []
  ev.push({ ts: joinDate(c), kind: "join", title: c.manual ? "Added by admin" : "Joined SetMyCareer", detail: c.email, tone: "ink" })

  for (const p of packages) ev.push({ ts: p.at, kind: "package", title: `Purchased ${p.name}${p.tier ? ` · ${p.tier}` : ""}`, detail: `${enrollmentPrice(p.price)}${p.is2026 ? " · 2026 catalog" : ""}`, tone: "well" })

  if (!c.manual) {
    for (const t of clientTests(c.id)) ev.push({ ts: new Date(t.date).toISOString(), kind: "test", title: `Completed ${t.name}`, detail: t.result, tone: "mind" })
    for (const r of mockClientReports(c.id)) ev.push({ ts: new Date(r.date).toISOString(), kind: "report", title: `Report · ${r.title}`, detail: r.shared ? "Shared with client" : "Draft", tone: "brand" })
    for (const n of allNotes.filter((x) => x.clientId === c.id)) ev.push({ ts: new Date(n.createdAt).toISOString(), kind: "note", title: `Session note · ${n.type}`, detail: n.tags.join(", "), tone: "ink" })
    for (const s of sessionsForClient(c.id)) ev.push({ ts: new Date(s.date).toISOString(), kind: "session", title: s.summary ?? "Counselling session", detail: `${s.durationMin} min · ${s.status.replace("_", " ")}`, tone: s.status === "no_show" ? "warn" : "brand" })
  }
  for (const b of bookings) ev.push({ ts: b.at, kind: "booking", title: `Session ${b.status} · ${b.topic}`, detail: `${b.durationMin} min · ${b.mode.replace("_", " ")}`, tone: "brand" })
  for (const m of thread.slice(-4)) ev.push({ ts: m.ts, kind: "message", title: `Message from ${m.from}`, detail: m.text, tone: "mind" })

  return ev.sort((a, b) => b.ts.localeCompare(a.ts))
}
