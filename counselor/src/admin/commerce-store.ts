// Coupons + refunds — the admin-managed money layer. Coupons mirror the server
// catalog (src/server/razorpay-core.ts COUPONS, the authoritative validator);
// admin edits here track display + usage, and a redeem bumps the count + logs
// activity. Refunds call the REAL Razorpay refund API when a payment id + keys
// are present, and always record locally + post to the activity stream and the
// revenue metrics. localStorage-backed + reactive (cross-tab live).

import { useSyncExternalStore } from "react"
import { logEvent } from "./admin-events"

export interface Coupon {
  code: string
  kind: "percent" | "flat"
  value: number          // percent (0–100) or flat paise
  maxOff?: number        // paise cap for percent coupons
  minAmount?: number     // paise minimum order
  active: boolean
  limit?: number         // max redemptions (undefined = unlimited)
  uses: number
  expiry?: string        // YYYY-MM-DD
  serverBacked: boolean  // true = present in the server catalog (discounts real orders)
}

export interface Refund {
  id: string
  at: string
  clientId?: string
  clientName: string
  amount: number         // paise (positive)
  reason: string
  status: "processed" | "pending" | "failed"
  paymentId?: string
  razorpayRefundId?: string
}

// ── persisted reactive stores ────────────────────────────────────────────────
type L = () => void
function store<T>(key: string, initial: T) {
  const read = (): T => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : initial } catch { return initial } }
  let value = read()
  const ls = new Set<L>()
  const emit = () => ls.forEach((l) => l())
  if (typeof window !== "undefined") window.addEventListener("storage", (e) => { if (e.key === key) { value = read(); emit() } })
  return {
    get: () => value,
    set: (v: T) => { value = v; try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* */ } emit() },
    sub: (l: L) => { ls.add(l); return () => { ls.delete(l) } },
  }
}

// The 4 real, server-backed coupons — these codes apply genuine discounts at
// checkout (validated in api/razorpay.ts → razorpay-core.ts COUPONS). Usage starts
// at 0 and increments only on a real redemption; no fabricated counts.
const SEED_COUPONS: Coupon[] = [
  { code: "WELCOME10", kind: "percent", value: 10, maxOff: 150000, active: true, uses: 0, serverBacked: true },
  { code: "EARLY25", kind: "percent", value: 25, maxOff: 300000, minAmount: 199000, active: true, limit: 500, uses: 0, expiry: "2026-07-31", serverBacked: true },
  { code: "FLAT500", kind: "flat", value: 50000, active: true, uses: 0, serverBacked: true },
  { code: "STUDENT15", kind: "percent", value: 15, active: true, uses: 0, serverBacked: true },
]
// Real refunds only — issued via the live Razorpay flow; no fabricated client refunds.
const SEED_REFUNDS: Refund[] = []

const couponsStore = store<Coupon[]>("smc.admin.coupons", SEED_COUPONS)
const refundsStore = store<Refund[]>("smc.admin.refunds", SEED_REFUNDS)

function uid(p: string) { return `${p}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10)}` }

// ── coupons ───────────────────────────────────────────────────────────────────
export function useCoupons(): Coupon[] { return useSyncExternalStore(couponsStore.sub, couponsStore.get, couponsStore.get) }
export function getCoupons(): Coupon[] { return couponsStore.get() }
export function createCoupon(c: Omit<Coupon, "uses" | "serverBacked">): void {
  const code = c.code.trim().toUpperCase()
  if (!code || couponsStore.get().some((x) => x.code === code)) return
  couponsStore.set([{ ...c, code, uses: 0, serverBacked: false }, ...couponsStore.get()])
}
export function toggleCoupon(code: string): void {
  couponsStore.set(couponsStore.get().map((c) => (c.code === code ? { ...c, active: !c.active } : c)))
}
/** Permanently remove a coupon code from the catalogue. */
export function deleteCoupon(code: string): void {
  const existing = couponsStore.get().find((c) => c.code === code)
  if (!existing) return
  couponsStore.set(couponsStore.get().filter((c) => c.code !== code))
  logEvent({ kind: "coupon", title: `Coupon ${code} removed`, detail: existing.kind === "percent" ? `${existing.value}% off` : "flat discount" })
}
export function redeemCoupon(code: string, clientName: string, discount: number): void {
  couponsStore.set(couponsStore.get().map((c) => (c.code === code ? { ...c, uses: c.uses + 1 } : c)))
  logEvent({ kind: "coupon", title: `Coupon ${code} redeemed`, detail: `${clientName}`, amount: -discount })
}

// ── refunds ────────────────────────────────────────────────────────────────────
export function useRefunds(): Refund[] { return useSyncExternalStore(refundsStore.sub, refundsStore.get, refundsStore.get) }
export function getRefunds(): Refund[] { return refundsStore.get() }

/** Issue a refund — hits the real Razorpay refund API when a payment id is given
 *  (and keys are configured), then records it locally + logs activity. Falls back
 *  to a local record (status pending) when there's no payment id (demo data). */
export async function issueRefund(input: { clientId?: string; clientName: string; amount: number; reason: string; paymentId?: string }): Promise<Refund> {
  let status: Refund["status"] = input.paymentId ? "processed" : "pending"
  let razorpayRefundId: string | undefined
  if (input.paymentId) {
    try {
      const res = await fetch("/api/razorpay", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "refund", payment_id: input.paymentId, amount: input.amount, notes: { reason: input.reason } }),
      })
      const data = await res.json()
      if (res.ok && data.refundId) { razorpayRefundId = data.refundId; status = data.status === "processed" ? "processed" : "pending" }
      else status = "failed"
    } catch { status = "failed" }
  }
  const refund: Refund = { id: uid("rf"), at: new Date().toISOString(), ...input, status, razorpayRefundId }
  refundsStore.set([refund, ...refundsStore.get()])
  logEvent({ kind: "refund", title: `Refund ${status === "failed" ? "failed" : "issued"} · ${input.clientName}`, detail: input.reason, amount: -input.amount, clientId: input.clientId })
  return refund
}

// ── metrics rollup (paise) for Revenue & subscriptions ───────────────────────
export function commerceMetrics() {
  const coupons = couponsStore.get()
  const refunds = refundsStore.get()
  const activeCoupons = coupons.filter((c) => c.active).length
  const redemptions = coupons.reduce((s, c) => s + c.uses, 0)
  const refundsThisMonth = refunds.filter((r) => r.status !== "failed").reduce((s, r) => s + r.amount, 0)
  const refundCount = refunds.filter((r) => r.status !== "failed").length
  return { activeCoupons, totalCoupons: coupons.length, redemptions, refundsThisMonth, refundCount }
}
export function useCommerceMetrics() {
  useSyncExternalStore(couponsStore.sub, couponsStore.get, couponsStore.get)
  useSyncExternalStore(refundsStore.sub, refundsStore.get, refundsStore.get)
  return commerceMetrics()
}
