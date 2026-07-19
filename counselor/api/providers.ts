// ─────────────────────────────────────────────────────────────────────────────
// Vercel NODE serverless function: POST /api/providers — REAL infrastructure usage.
//
// This replaces the old fabricated API_PROVIDERS table. Every number here is pulled
// LIVE from the provider, or the card honestly says "no usage feed" — there is no
// synthetic data. Self-contained (like api/razorpay.ts) because the Node runtime
// doesn't bundle ../src/server/* imports, and because Razorpay's API answers the
// Vercel EDGE runtime with HTTP 406 — only Node's fetch is accepted.
//
// What's genuinely fetchable, and from where:
//   • Razorpay   → GET /v1/payments (trailing 30d): real transaction count + captured ₹.
//   • OpenRouter → GET /api/v1/auth/key: real credits used / limit / remaining (USD).
//   • Groq       → no public usage/billing API → connection status only (key present).
//   • LiveKit    → no simple usage feed → connection status only (keys present).
//
// SECURITY: every secret is read from env, never shipped to the browser; the
// response carries only counts/totals and presence booleans — never a key value.
// ─────────────────────────────────────────────────────────────────────────────

export interface ProvidersEnv {
  razorpay?: { id?: string; secret?: string }
  openrouter?: string
  groq?: string
  livekit?: { key?: string; secret?: string; url?: string }
}

export interface ProviderStatus {
  id: string
  name: string
  purpose: string
  /** the relevant key(s) are present in the server env */
  configured: boolean
  /** for providers we actually probe: did the live call succeed */
  ok: boolean
  /** real, fetched metrics to render (null when there's no usage feed) */
  metrics: { label: string; value: string }[] | null
  /** honest one-liner when there's no usage feed, or extra context */
  note?: string
  error?: string
}

const inr = (paise: number) => "₹" + Math.round(paise / 100).toLocaleString("en-IN")
const usd = (n: number) => "$" + n.toFixed(2)

// ── Razorpay: real transaction count + captured volume over the trailing 30 days ──
async function razorpay(id?: string, secret?: string): Promise<ProviderStatus> {
  const base: ProviderStatus = { id: "razorpay", name: "Razorpay", purpose: "Payments", configured: Boolean(id && secret), ok: false, metrics: null }
  if (!id || !secret) return { ...base, note: "Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET to read live transactions." }
  try {
    const headers = {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      accept: "application/json",
      "user-agent": "SetMyCareer-Server/1.0",
    }
    const to = Math.floor(Date.now() / 1000)
    const from = to - 30 * 24 * 3600
    let skip = 0, pages = 0, count = 0, captured = 0, capturedPaise = 0, currency = "INR"
    for (; pages < 20; pages++) {
      const r = await fetch(`${API_RZP}/payments?from=${from}&to=${to}&count=100&skip=${skip}`, { headers })
      if (!r.ok) {
        const hint = r.status === 401 ? "Razorpay rejected the credentials (401)." : `Razorpay HTTP ${r.status}`
        return { ...base, error: hint }
      }
      const data = (await r.json()) as { items?: { amount?: number; status?: string; currency?: string }[] }
      const items = data.items ?? []
      for (const p of items) {
        count++
        if (p.status === "captured" || p.status === "refunded") { captured++; capturedPaise += p.amount ?? 0 }
        if (p.currency) currency = p.currency
      }
      if (items.length < 100) break
      skip += 100
    }
    const mode = id.startsWith("rzp_live") ? "live" : "test"
    const sym = currency === "INR" ? inr(capturedPaise) : `${currency} ${Math.round(capturedPaise / 100).toLocaleString()}`
    return {
      ...base, ok: true,
      metrics: [
        { label: "Transactions (30d)", value: count.toLocaleString("en-IN") },
        { label: "Captured (30d)", value: sym },
        { label: "Mode", value: mode },
      ],
      note: pages >= 20 ? "Showing the most recent 2,000 payments." : undefined,
    }
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "Razorpay error" }
  }
}
const API_RZP = "https://api.razorpay.com/v1"

// ── OpenRouter: real credit usage for the key (/auth/key) ──
async function openrouter(key?: string): Promise<ProviderStatus> {
  const base: ProviderStatus = { id: "openrouter", name: "OpenRouter", purpose: "LLM fallback (Llama 3.3 70B)", configured: Boolean(key), ok: false, metrics: null }
  if (!key) return { ...base, note: "Set OPENROUTER_API_KEY to read live credit usage." }
  try {
    const r = await fetch("https://openrouter.ai/api/v1/auth/key", { headers: { Authorization: `Bearer ${key}` } })
    if (!r.ok) return { ...base, error: `OpenRouter HTTP ${r.status}` }
    const { data } = (await r.json()) as { data?: { usage?: number; limit?: number | null; limit_remaining?: number | null; is_free_tier?: boolean } }
    const metrics: { label: string; value: string }[] = [{ label: "Credits used", value: usd(data?.usage ?? 0) }]
    if (data?.limit != null) metrics.push({ label: "Limit", value: usd(data.limit) })
    if (data?.limit_remaining != null) metrics.push({ label: "Remaining", value: usd(data.limit_remaining) })
    return { ...base, ok: true, metrics, note: data?.is_free_tier ? "Free-tier key." : undefined }
  } catch (e) {
    return { ...base, error: e instanceof Error ? e.message : "OpenRouter error" }
  }
}

// ── Groq + LiveKit: connection status only (no public usage/billing API) ──
function configuredOnly(id: string, name: string, purpose: string, ok: boolean, note: string): ProviderStatus {
  return { id, name, purpose, configured: ok, ok, metrics: null, note: ok ? note : `Not configured.` }
}

export async function runProviders(env: ProvidersEnv = {}): Promise<Response> {
  const [rzp, or] = await Promise.all([
    razorpay(env.razorpay?.id, env.razorpay?.secret),
    openrouter(env.openrouter),
  ])
  const providers: ProviderStatus[] = [
    rzp,
    or,
    configuredOnly("groq", "Groq", "Primary LLM (Llama 3.3 70B) + Whisper STT", Boolean(env.groq), "Connected · usage metered at Groq (no public billing API)."),
    configuredOnly("livekit", "LiveKit", "Video / voice session rooms", Boolean(env.livekit?.key && env.livekit?.secret), "Connected · room minutes metered at LiveKit."),
  ]
  return new Response(JSON.stringify({ providers }), { status: 200, headers: { "content-type": "application/json" } })
}

// ── Vercel Node handler (req/res). Reads server-only env; relays the Response. ──
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default async function handler(req: any, res: any) {
  if (req.method !== "POST" && req.method !== "GET") { res.statusCode = 405; return res.end("Method Not Allowed") }
  try {
    const response = await runProviders({
      razorpay: { id: process.env.RAZORPAY_KEY_ID, secret: process.env.RAZORPAY_KEY_SECRET },
      openrouter: process.env.OPENROUTER_API_KEY,
      groq: process.env.GROQ_API_KEY,
      livekit: { key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET, url: process.env.LIVEKIT_URL },
    })
    res.statusCode = response.status
    response.headers.forEach((v: string, k: string) => res.setHeader(k, v))
    res.end(Buffer.from(await response.arrayBuffer()))
  } catch (err) {
    res.statusCode = 500
    res.setHeader("content-type", "application/json")
    res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Providers error" }))
  }
}
