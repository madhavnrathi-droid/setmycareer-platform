// Marketing & spend — Google Ads acquisition cost for the admin. Reads /api/marketing
// (server-only Google Ads credentials). When not connected it shows exactly what to
// set, rather than fabricating numbers.

import { useEffect, useState } from "react"
import { RefreshCw, MousePointerClick, Eye, Target, IndianRupee } from "lucide-react"
import { DashHead } from "../dash"

interface Campaign { name: string; status: string; spend: number; clicks: number; impressions: number; conversions: number }
interface MarketingData {
  connected: boolean
  error?: string
  period?: string
  currency?: string
  totalSpend?: number
  clicks?: number
  impressions?: number
  conversions?: number
  campaigns?: Campaign[]
  present?: Record<string, boolean>
}

const fmtMoney = (n: number, ccy = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: ccy, maximumFractionDigits: 0 }).format(n || 0)
const fmtNum = (n: number) => new Intl.NumberFormat("en-IN").format(Math.round(n || 0))

function Kpi({ icon: Icon, label, value, sub }: { icon: React.ElementType; label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-400">
        <Icon className="size-3.5 stroke-[1.75]" /> {label}
      </div>
      <span className="mt-1.5 font-display text-[24px] font-light leading-none tabular-nums text-foreground">{value}</span>
      {sub && <span className="mt-1 text-[11.5px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

const ENV_VARS: { key: string; how: string }[] = [
  { key: "GOOGLE_ADS_DEVELOPER_TOKEN", how: "Google Ads → Tools → API Center (needs a Manager/MCC account; starts as a test token, then apply for Basic access)" },
  { key: "GOOGLE_ADS_CLIENT_ID", how: "OAuth2 client id" },
  { key: "GOOGLE_ADS_CLIENT_SECRET", how: "OAuth2 client secret" },
  { key: "GOOGLE_ADS_REFRESH_TOKEN", how: "run the OAuth consent once (OAuth Playground or a one-off script) with the Google account that has access to the ad account" },
  { key: "GOOGLE_ADS_CUSTOMER_ID", how: "the ad account id, digits only (e.g. 3465490381)" },
]

export function AdminMarketing() {
  const [data, setData] = useState<MarketingData | null>(null)
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch("/api/marketing", { method: "POST" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData({ connected: false, error: "Couldn't reach the marketing endpoint." }))
      .finally(() => setLoading(false))
  }
  useEffect(load, [])

  const ccy = data?.currency || "INR"
  const cpa = data?.conversions ? (data.totalSpend ?? 0) / data.conversions : 0
  const cpc = data?.clicks ? (data.totalSpend ?? 0) / data.clicks : 0

  return (
    <div>
      <DashHead
        title="Marketing & spend"
        subtitle="Google Ads acquisition cost — last 30 days."
        right={
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12.5px] text-foreground transition hover:bg-secondary">
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
        }
      />

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-card" />)}
        </div>
      ) : data?.connected ? (
        <div className="flex flex-col gap-6">
          {/* hero spend */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">Ad spend · {data.period}</p>
            <div className="mt-1 font-display text-[40px] font-extralight leading-none tabular-nums">{fmtMoney(data.totalSpend ?? 0, ccy)}</div>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              {fmtNum(data.conversions ?? 0)} conversions · {fmtMoney(cpa, ccy)} per conversion (CPA)
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi icon={IndianRupee} label="Spend" value={fmtMoney(data.totalSpend ?? 0, ccy)} sub={data.period} />
            <Kpi icon={MousePointerClick} label="Clicks" value={fmtNum(data.clicks ?? 0)} sub={`${fmtMoney(cpc, ccy)} / click`} />
            <Kpi icon={Eye} label="Impressions" value={fmtNum(data.impressions ?? 0)} />
            <Kpi icon={Target} label="Conversions" value={fmtNum(data.conversions ?? 0)} sub={`${fmtMoney(cpa, ccy)} CPA`} />
          </div>

          {/* campaigns */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="hidden grid-cols-[1fr_auto_auto_auto_auto] items-center gap-6 border-b border-border px-5 py-3 md:grid">
              {["Campaign", "Spend", "Clicks", "Impr.", "Conv."].map((h) => (
                <div key={h} className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-border">
              {(data.campaigns ?? []).length === 0 ? (
                <p className="px-5 py-6 text-[13px] text-muted-foreground">No campaign spend in the last 30 days.</p>
              ) : (
                (data.campaigns ?? []).map((c, i) => (
                  <div key={`${c.name}-${i}`} className="grid grid-cols-1 items-center gap-x-6 gap-y-1 px-5 py-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-medium text-foreground">{c.name}</div>
                      {c.status && <div className="text-[11px] text-ink-300 capitalize">{c.status.toLowerCase()}</div>}
                    </div>
                    <span className="text-[12.5px] font-medium tabular-nums md:w-24">{fmtMoney(c.spend, ccy)}</span>
                    <span className="text-[12.5px] tabular-nums text-muted-foreground md:w-16">{fmtNum(c.clicks)}</span>
                    <span className="text-[12.5px] tabular-nums text-muted-foreground md:w-20">{fmtNum(c.impressions)}</span>
                    <span className="text-[12.5px] tabular-nums text-muted-foreground md:w-16">{fmtNum(c.conversions)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        // not connected — show exactly which credentials are set vs still needed
        (() => {
          const present = data?.present
          const setCount = present ? Object.values(present).filter(Boolean).length : 0
          return (
            <div className="rounded-2xl border border-dashed border-border bg-card p-6">
              <h2 className="font-display text-[20px] font-light tracking-tight">Connect Google Ads</h2>
              <p className="mt-1.5 max-w-[68ch] text-[13px] leading-relaxed text-muted-foreground">
                {present ? <><span className="font-medium text-foreground">{setCount} of 5</span> server-only credentials are set. </> : ""}
                The page goes live automatically once all five are present (in Vercel, and locally in <code className="rounded bg-secondary px-1">.env.local</code>). Credentials never reach the browser — only the backend calls Google.
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {ENV_VARS.map((v) => {
                  const ok = present ? present[v.key] : false
                  return (
                    <li key={v.key} className="flex items-start gap-2.5 text-[12.5px]">
                      <span className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${ok ? "bg-well-600" : "bg-ink-300"}`}>{ok ? "✓" : "!"}</span>
                      <div className="min-w-0">
                        <code className="rounded bg-secondary px-1.5 py-0.5 text-[12px] text-foreground">{v.key}</code>
                        <span className={`ml-2 text-[11.5px] ${ok ? "text-well-600" : "text-warn-600"}`}>{ok ? "set" : "needed"}</span>
                        {!ok && <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-400">{v.how}</p>}
                      </div>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-4 max-w-[68ch] text-[12px] leading-relaxed text-ink-400">
                The developer token requires a Google Ads <span className="font-medium">Manager (MCC)</span> account and API access approval; the refresh token requires running the OAuth consent once. Both are Google-side actions on your account — once you add those two env vars and redeploy, this page lights up with real spend, clicks, CPA and per-campaign breakdowns. Optional: <code className="rounded bg-secondary px-1">GOOGLE_ADS_LOGIN_CUSTOMER_ID</code> (your MCC id) and <code className="rounded bg-secondary px-1">GOOGLE_ADS_CURRENCY</code>.
              </p>
              {data?.error && <p className="mt-3 rounded-lg bg-risk-50 px-3 py-2 text-[12px] text-risk-600">{data.error}</p>}
            </div>
          )
        })()
      )}
    </div>
  )
}
