// ─────────────────────────────────────────────────────────────────────────────
// Vercel NODE serverless function: POST /api/razorpay — config/order/verify/refund.
//
// SELF-CONTAINED on purpose. Two hard constraints forced this:
//   1) Razorpay's API answers the Vercel EDGE runtime with HTTP 406 (Cloudflare),
//      while Node's fetch is accepted — so this MUST run on Node, not Edge.
//   2) Node serverless functions don't bundle cross-directory imports, so importing
//      ../src/server/* throws ERR_MODULE_NOT_FOUND at runtime — so the core lives here.
//
// The Vite dev middleware imports the exported `runRazorpay` from THIS file, so dev
// and prod stay identical and there's a single source of truth for the price catalog.
//
// SECURITY (non-negotiable): the secret key is read from env and never shipped to
// the browser; amounts come from the server catalog below, never the client; every
// payment is HMAC-verified before anything unlocks; coupons validate against this
// catalog. The browser only ever learns the publishable Key ID (the `config` action).
// ─────────────────────────────────────────────────────────────────────────────

import { createHmac } from "node:crypto"

const API = "https://api.razorpay.com/v1"

// server price catalog (paise) — the only source of truth for amounts. Keyed by id.
export const PRICES: Record<string, { label: string; amount: number }> = {
  stream_selector: { label: "Stream Selector", amount: 199000 },
  job_domain: { label: "Job Domain Selector", amount: 249900 },
  diy_career: { label: "DIY Career", amount: 399000 },
  consultation_student: { label: "Consultation · Student", amount: 49900 },
  consultation_executive: { label: "Consultation · Executive", amount: 69900 },
  accelerator: { label: "Career Success · Accelerator", amount: 599000 },
  big_picture: { label: "Career Success · Big Picture", amount: 899000 },
  true_north: { label: "Career Success · True North", amount: 1399000 },
  admission_basic: { label: "Admission · Basic", amount: 499000 },
  admission_advance: { label: "Admission · Advance", amount: 999000 },
  admission_premium: { label: "Admission · Premium", amount: 8999000 },
  psych_consult: { label: "Psychological Counselling", amount: 119900 },
  personality_dev: { label: "Personality Development", amount: 250000 },
  additional_session: { label: "Additional Session", amount: 299000 },
  coaching_mentoring: { label: "Coaching & Mentoring", amount: 15000000 },
  plan_starter: { label: "Starter plan", amount: 499900 },
  plan_growth: { label: "Growth plan", amount: 899900 },
  plan_premium: { label: "Premium plan", amount: 1599900 },
  ai_30: { label: "30 AI minutes", amount: 49900 },
  ai_90: { label: "90 AI minutes", amount: 119900 },
  ai_200: { label: "200 AI minutes", amount: 229900 },
  session_pack: { label: "1 counselling session", amount: 199900 },
  starter_1: { label: "₹1 Starter (smoke-test)", amount: 100 },

  // ── 2026 catalog (namespaced sj_/pro_/mk_/vclp_/cc_/vc_ — mirrors
  //    src/server/offerings-2026.ts; legacy ids above stay untouched) ─────────
  sj_navigator: { label: "Career Navigator", amount: 299000 },
  sj_consult_student: { label: "Consultation · Student", amount: 300000 },
  pro_consult: { label: "Consultation · Professional", amount: 400000 },
  sj_accelerator: { label: "Accelerator", amount: 799000 },
  sj_big_picture: { label: "The Big Picture", amount: 1499000 },
  sj_true_north: { label: "True North", amount: 2999000 },
  pro_pivot: { label: "Pivot", amount: 2499000 },
  pro_directors_cut: { label: "Director's Cut", amount: 5999000 },
  mk_meet_expert: { label: "Meet an Expert", amount: 299000 },
  sj_extra_session: { label: "Additional Session · Student", amount: 199000 },
  pro_extra_session: { label: "Additional Session · Professional", amount: 299000 },
  aptitude: { label: "Aptitude & Reasoning — Sigma battery", amount: 79900 },
  cc_100: { label: "100 Career Credits", amount: 49900 },
  cc_250: { label: "250 Career Credits", amount: 99900 },
  cc_500: { label: "500 Career Credits", amount: 179900 },
  vc_60: { label: "60 Voice Credits", amount: 79900 },
  vc_120: { label: "120 Voice Credits", amount: 149900 },
}

interface ServerCoupon { code: string; kind: "percent" | "flat"; value: number; maxOff?: number; minAmount?: number; active: boolean }
export const COUPONS: Record<string, ServerCoupon> = {
  WELCOME10: { code: "WELCOME10", kind: "percent", value: 10, maxOff: 150000, active: true },
  EARLY25: { code: "EARLY25", kind: "percent", value: 25, maxOff: 300000, minAmount: 199000, active: true },
  FLAT500: { code: "FLAT500", kind: "flat", value: 50000, active: true },
  STUDENT15: { code: "STUDENT15", kind: "percent", value: 15, active: true },
}

export function applyCoupon(amount: number, code?: string): { amount: number; discount: number; code?: string } {
  if (!code) return { amount, discount: 0 }
  const c = COUPONS[code.trim().toUpperCase()]
  if (!c || !c.active) throw new Error("Invalid or expired coupon")
  if (c.minAmount && amount < c.minAmount) throw new Error("Order below the coupon's minimum")
  let off = c.kind === "percent" ? Math.round((amount * c.value) / 100) : c.value
  if (c.maxOff) off = Math.min(off, c.maxOff)
  off = Math.min(off, amount)
  return { amount: amount - off, discount: off, code: c.code }
}

export interface RazorpayKeys { id?: string; secret?: string }
const authHeader = (id: string, secret: string) => "Basic " + Buffer.from(`${id}:${secret}`).toString("base64")
const mode = (id?: string) => (!id ? "unconfigured" : id.startsWith("rzp_live") ? "live" : "test")
// Razorpay 406s requests missing a User-Agent / Accept, so set them explicitly.
const rzpHeaders = (id: string, secret: string) => ({
  Authorization: authHeader(id, secret),
  "content-type": "application/json",
  accept: "application/json",
  "user-agent": "SetMyCareer-Server/1.0",
})

const hmacHex = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("hex")

// CORS — the marketing site (a different origin) buys through this same endpoint.
// The API is safe to open: it exposes no secrets, prices come from the catalog
// above, and verify only succeeds with a genuine Razorpay HMAC signature.
export const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
}

/** Postgres/PostgREST credentials for the server-side purchase ledger (optional).
 *  CURRENTLY UNSET — the Supabase project behind this was retired 2026-07-19, so
 *  recordServerPurchase() returns false and no purchase is ledgered server-side.
 *  Payment verification is unaffected (it is best-effort by design), but see the
 *  RELEASE BLOCKER note on recordServerPurchase before switching to live keys. */
export interface StoreEnv { url?: string; key?: string }

/** RELEASE BLOCKER (2026-07-19): this is INERT until a server store is configured.
 *  The marketing-site checkout flow depended on it end-to-end:
 *    site/src/pages/Checkout.tsx → /api/razorpay verify → recordServerPurchase()
 *    writes "purchases:<clientId>" → portal-store.syncWalletAndPurchases() reads it
 *    back and grants the package exactly once.
 *  With no store, the write returns false and the read returns null, so a
 *  marketing-site purchase NEVER grants the package in the portal — the customer is
 *  charged and receives nothing. Harmless today because the deployed key is
 *  rzp_test_* (test mode), but this MUST be resolved before live keys go in.
 *  Proper fix: the purchase/entitlement endpoints in docs/BACKEND_API_SPEC.md.
 *
 *  Record a VERIFIED purchase into the app_state store — the exact
 *  table/columns/headers cloud-core uses (app_state: app, user_id, key, value,
 *  updated_at; merge-duplicates upsert), inlined because this file must stay
 *  self-contained (Node serverless can't import ../src). Appends
 *  {tierId, paymentId, orderId, amount, at} to the "purchases:<clientId>" array;
 *  the amount comes from the live Razorpay order (fallback: the catalog), never
 *  the client. Idempotent on paymentId so a retried verify never double-records. */
async function recordServerPurchase(
  store: StoreEnv,
  rzp: { id: string; secret: string },
  p: { clientId: string; tierId?: string; paymentId: string; orderId: string },
): Promise<boolean> {
  if (!store.url || !store.key) return false
  const base = store.url.replace(/\/$/, "") + "/rest/v1"
  const headers: Record<string, string> = {
    apikey: store.key,
    authorization: `Bearer ${store.key}`,
    "content-type": "application/json",
  }
  const enc = encodeURIComponent
  const stateKey = `purchases:${p.clientId}`

  // server-trusted amount: the real order first, the catalog base as fallback
  let amount: number | null = p.tierId && PRICES[p.tierId] ? PRICES[p.tierId].amount : null
  try {
    const r = await fetch(`${API}/orders/${enc(p.orderId)}`, { headers: rzpHeaders(rzp.id, rzp.secret) })
    if (r.ok) {
      const order = (await r.json().catch(() => null)) as { amount?: number } | null
      if (order && typeof order.amount === "number") amount = order.amount
    }
  } catch { /* keep the catalog amount */ }

  // read-modify-write the per-client purchases array
  let existing: unknown[] = []
  try {
    const r = await fetch(
      `${base}/app_state?app=eq.client&user_id=eq.${enc(p.clientId)}&key=eq.${enc(stateKey)}&select=value`,
      { headers },
    )
    if (r.ok) {
      const rows = (await r.json().catch(() => null)) as { value?: unknown }[] | null
      const v = Array.isArray(rows) && rows[0] ? rows[0].value : null
      if (Array.isArray(v)) existing = v
    }
  } catch { /* treat as empty */ }
  const dupe = existing.some(
    (r) => !!r && typeof r === "object" && (r as { paymentId?: string }).paymentId === p.paymentId,
  )
  if (dupe) return true

  const next = [
    ...existing,
    { tierId: p.tierId ?? null, paymentId: p.paymentId, orderId: p.orderId, amount, at: new Date().toISOString() },
  ]
  const w = await fetch(`${base}/app_state`, {
    method: "POST",
    headers: { ...headers, prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ app: "client", user_id: p.clientId, key: stateKey, value: next, updated_at: new Date().toISOString() }),
  })
  return w.ok
}

type Body = { action?: string; tier?: string; coupon?: string; order_id?: string; payment_id?: string; signature?: string; amount?: number; notes?: Record<string, string>; clientId?: string; tierId?: string }

export async function runRazorpay(body: Body, keys: RazorpayKeys = {}, store: StoreEnv = {}): Promise<Response> {
  const { id, secret } = keys
  const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", ...CORS_HEADERS } })

  if (body.action === "config") return json({ keyId: id ?? null, mode: mode(id), configured: Boolean(id && secret) })

  // Price preview — base, coupon discount and final total for a tier, WITHOUT
  // creating an order. Keyless on purpose so the checkout rail can render a live
  // bill (and validate coupons) even before Razorpay credentials are set.
  if (body.action === "quote") {
    const item = body.tier ? PRICES[body.tier] : undefined
    if (!item) return json({ error: "Unknown tier" }, 400)
    try {
      const priced = applyCoupon(item.amount, body.coupon)
      return json({ label: item.label, base: item.amount, amount: priced.amount, discount: priced.discount, coupon: priced.code ?? null })
    } catch (e) { return json({ error: e instanceof Error ? e.message : "Coupon error" }, 400) }
  }

  if (!id || !secret) return json({ error: "Razorpay not configured — set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the host env.", mode: "unconfigured" }, 503)

  if (body.action === "order") {
    const item = body.tier ? PRICES[body.tier] : undefined
    if (!item) return json({ error: "Unknown tier" }, 400)
    let priced
    try { priced = applyCoupon(item.amount, body.coupon) } catch (e) { return json({ error: e instanceof Error ? e.message : "Coupon error" }, 400) }
    const res = await fetch(`${API}/orders`, {
      method: "POST", headers: rzpHeaders(id, secret),
      body: JSON.stringify({ amount: priced.amount, currency: "INR", receipt: `smc_${Date.now()}`, notes: { tier: body.tier, coupon: priced.code ?? "", ...body.notes } }),
    })
    const raw = await res.text()
    let order: { id?: string; error?: { description?: string } } | null = null
    try { order = raw ? JSON.parse(raw) : null } catch { /* non-JSON body */ }
    if (!res.ok || !order?.id) {
      const hint = res.status === 401
        ? "Razorpay rejected the credentials (401) — the RAZORPAY_KEY_SECRET doesn't match the key id."
        : order?.error?.description ?? `Razorpay order failed (HTTP ${res.status})`
      return json({ error: hint, status: res.status }, 502)
    }
    return json({ orderId: order.id, amount: priced.amount, discount: priced.discount, coupon: priced.code, keyId: id, label: item.label })
  }

  if (body.action === "verify") {
    if (!body.order_id || !body.payment_id || !body.signature) return json({ valid: false, error: "Missing fields" }, 400)
    const valid = hmacHex(secret, `${body.order_id}|${body.payment_id}`) === body.signature
    if (!valid) return json({ valid })
    // Optionally ledger the VERIFIED purchase server-side (marketing-site buys):
    // best-effort — a store failure never invalidates a genuine payment.
    const clientId = typeof body.clientId === "string" ? body.clientId.trim() : ""
    if (clientId) {
      const recorded = await recordServerPurchase(store, { id, secret }, {
        clientId,
        tierId: typeof body.tierId === "string" && body.tierId ? body.tierId : undefined,
        paymentId: body.payment_id,
        orderId: body.order_id,
      }).catch(() => false)
      return json({ valid, recorded })
    }
    return json({ valid })
  }

  if (body.action === "refund") {
    if (!body.payment_id) return json({ error: "payment_id required" }, 400)
    const res = await fetch(`${API}/payments/${body.payment_id}/refund`, {
      method: "POST", headers: rzpHeaders(id, secret),
      body: JSON.stringify(body.amount ? { amount: body.amount, notes: body.notes } : { notes: body.notes }),
    })
    const refund = await res.json().catch(() => null)
    if (!res.ok) return json({ error: refund?.error?.description ?? "Refund failed" }, 502)
    return json({ refundId: refund.id, status: refund.status, amount: refund.amount })
  }

  return json({ error: "Unknown action" }, 400)
}

// ── Vercel Node handler (req/res). Relays the Web Response from runRazorpay. ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  for (const [k, v] of Object.entries(CORS_HEADERS)) res.setHeader(k, v)
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end() }
  if (req.method !== "POST") { res.statusCode = 405; return res.end("Method Not Allowed") }
  try {
    const chunks: Buffer[] = []
    for await (const c of req) chunks.push(c as Buffer)
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}")
    const response = await runRazorpay(
      body,
      { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET },
      { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_KEY },
    )
    res.statusCode = response.status
    response.headers.forEach((v: string, k: string) => res.setHeader(k, v))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (err) {
    res.statusCode = 500
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Razorpay error" }))
  }
}
