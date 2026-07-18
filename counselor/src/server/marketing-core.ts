// ─────────────────────────────────────────────────────────────────────────────
// Marketing spend — reads Google Ads spend so the admin can see acquisition cost.
//
// The browser never touches Google; it POSTs to /api/marketing and this stateless
// core calls the Google Ads API with SERVER-ONLY credentials (env vars you set,
// same pattern as Razorpay/Groq). When the credentials aren't set it returns
// { connected:false } so the UI shows a clean "Connect Google Ads" state instead
// of fabricating numbers.
//
// Required env (all server-only, NO VITE_ prefix):
//   GOOGLE_ADS_DEVELOPER_TOKEN     – from your Google Ads API Center
//   GOOGLE_ADS_CLIENT_ID           – OAuth2 client id
//   GOOGLE_ADS_CLIENT_SECRET       – OAuth2 client secret
//   GOOGLE_ADS_REFRESH_TOKEN       – OAuth2 refresh token for the Ads account
//   GOOGLE_ADS_CUSTOMER_ID         – the ad account to read (digits only)
//   GOOGLE_ADS_LOGIN_CUSTOMER_ID   – optional, your manager (MCC) account id
//   GOOGLE_ADS_CURRENCY            – optional display currency (default INR)
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketingEnv {
  devToken?: string
  clientId?: string
  clientSecret?: string
  refreshToken?: string
  customerId?: string
  loginCustomerId?: string
  currency?: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })

export function marketingConfigured(env: MarketingEnv): boolean {
  return !!(env.devToken && env.clientId && env.clientSecret && env.refreshToken && env.customerId)
}

async function accessToken(env: MarketingEnv): Promise<string | null> {
  try {
    const r = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.clientId!,
        client_secret: env.clientSecret!,
        refresh_token: env.refreshToken!,
        grant_type: "refresh_token",
      }),
    })
    if (!r.ok) return null
    const j = (await r.json()) as { access_token?: string }
    return j.access_token ?? null
  } catch {
    return null
  }
}

const digits = (s?: string) => (s ?? "").replace(/\D/g, "")

export async function runMarketing(env: MarketingEnv): Promise<Response> {
  if (!marketingConfigured(env)) {
    // tell the admin EXACTLY which credentials are set vs still needed (never the
    // values — only presence) so the screen shows precise next steps.
    const present = {
      GOOGLE_ADS_DEVELOPER_TOKEN: !!env.devToken,
      GOOGLE_ADS_CLIENT_ID: !!env.clientId,
      GOOGLE_ADS_CLIENT_SECRET: !!env.clientSecret,
      GOOGLE_ADS_REFRESH_TOKEN: !!env.refreshToken,
      GOOGLE_ADS_CUSTOMER_ID: !!env.customerId,
    }
    return json({ connected: false, present })
  }
  const token = await accessToken(env)
  if (!token) return json({ connected: false, error: "Could not authenticate with Google Ads (check the OAuth credentials)." })

  const cid = digits(env.customerId)
  const query =
    "SELECT campaign.name, campaign.status, metrics.cost_micros, metrics.clicks, metrics.impressions, metrics.conversions " +
    "FROM campaign WHERE segments.date DURING LAST_30_DAYS ORDER BY metrics.cost_micros DESC"
  try {
    const r = await fetch(`https://googleads.googleapis.com/v17/customers/${cid}/googleAds:searchStream`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "developer-token": env.devToken!,
        ...(env.loginCustomerId ? { "login-customer-id": digits(env.loginCustomerId) } : {}),
        "content-type": "application/json",
      },
      body: JSON.stringify({ query }),
    })
    if (!r.ok) return json({ connected: false, error: (await r.text()).slice(0, 300) })

    const data = (await r.json()) as Array<{ results?: GAdsRow[] }> | { results?: GAdsRow[] }
    const rows: GAdsRow[] = (Array.isArray(data) ? data : [data]).flatMap((d) => d.results ?? [])
    let totalMicros = 0
    let clicks = 0
    let impressions = 0
    let conversions = 0
    const campaigns = rows.map((row) => {
      const micros = Number(row.metrics?.costMicros ?? 0)
      totalMicros += micros
      clicks += Number(row.metrics?.clicks ?? 0)
      impressions += Number(row.metrics?.impressions ?? 0)
      conversions += Number(row.metrics?.conversions ?? 0)
      return {
        name: row.campaign?.name ?? "Campaign",
        status: row.campaign?.status ?? "",
        spend: micros / 1e6,
        clicks: Number(row.metrics?.clicks ?? 0),
        impressions: Number(row.metrics?.impressions ?? 0),
        conversions: Number(row.metrics?.conversions ?? 0),
      }
    })
    return json({
      connected: true,
      period: "Last 30 days",
      currency: env.currency || "INR",
      totalSpend: totalMicros / 1e6,
      clicks,
      impressions,
      conversions,
      campaigns,
    })
  } catch (e) {
    return json({ connected: false, error: e instanceof Error ? e.message : "Google Ads request failed" })
  }
}

interface GAdsRow {
  campaign?: { name?: string; status?: string }
  metrics?: { costMicros?: string | number; clicks?: string | number; impressions?: string | number; conversions?: string | number }
}
