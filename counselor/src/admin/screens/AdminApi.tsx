// API & usage — REAL infrastructure status. The live SetMyCareer Core API health
// probe sits up top; below it, each provider's genuine connection + usage, pulled
// live from /api/providers (Razorpay transactions,
// OpenRouter credits). Groq + LiveKit show connection status only — they have no
// public usage API, and we never fabricate a number to fill the gap.

import { useCallback, useEffect, useState } from "react"
import { RefreshCw, CheckCircle2, XCircle, MinusCircle } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { SmcCoreApiPanel } from "../parts/SmcCoreApi"
import { cn } from "@/lib/utils"

interface ProviderMetric { label: string; value: string }
interface ProviderStatus {
  id: string
  name: string
  purpose: string
  configured: boolean
  ok: boolean
  metrics: ProviderMetric[] | null
  note?: string
  error?: string
}

function useProviders() {
  const [data, setData] = useState<ProviderStatus[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const r = await fetch("/api/providers", { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? `HTTP ${r.status}`)
      setData(Array.isArray(j.providers) ? j.providers : [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { void load() }, [load])
  return { data, loading, error, reload: load }
}

function StateChip({ p }: { p: ProviderStatus }) {
  if (!p.configured) return <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-ink-400"><MinusCircle className="size-3.5" /> Not configured</span>
  if (p.error) return <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-risk-600"><XCircle className="size-3.5" /> Error</span>
  return <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-well-600"><CheckCircle2 className="size-3.5" /> Connected</span>
}

function ProviderCard({ p }: { p: ProviderStatus }) {
  return (
    <div data-reveal className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e2)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("mt-1 size-2 shrink-0 rounded-full", !p.configured ? "bg-ink-300" : p.error ? "bg-risk-500" : "bg-well-500")} />
          <div>
            <p className="text-[14px] font-semibold text-foreground">{p.name}</p>
            <p className="text-[12px] text-muted-foreground">{p.purpose}</p>
          </div>
        </div>
        <StateChip p={p} />
      </div>

      {p.metrics && p.metrics.length > 0 && (
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
          {p.metrics.map((m) => (
            <div key={m.label}>
              <p className="text-[11px] text-muted-foreground">{m.label}</p>
              <p className="font-display text-[17px] font-semibold tabular-nums tracking-tight text-foreground">{m.value}</p>
            </div>
          ))}
        </div>
      )}

      {p.error && <p className="mt-2.5 text-[12px] text-risk-600">{p.error}</p>}
      {!p.error && p.note && <p className="mt-2.5 text-[12px] text-muted-foreground">{p.note}</p>}
    </div>
  )
}

export function AdminApi() {
  const ref = useGsap((s) => revealChildren(s), [])
  const { data, loading, error, reload } = useProviders()

  return (
    <div ref={ref} className="space-y-6">
      <div data-reveal className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight">API &amp; usage</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Live connection health and real usage for every service the platform runs on.</p>
        </div>
        <button
          onClick={() => void reload()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      {/* the real SetMyCareer backend — live connection + contract */}
      <div data-reveal>
        <SmcCoreApiPanel />
      </div>

      {/* real provider usage — pulled live from each service, never fabricated */}
      <div className="space-y-3">
        {error ? (
          <p data-reveal className="rounded-2xl border border-border bg-card p-4 text-[13px] text-risk-600">Couldn't reach the usage service: {error}</p>
        ) : !data ? (
          <p data-reveal className="rounded-2xl border border-border bg-card p-4 text-[13px] text-muted-foreground">Loading live provider usage…</p>
        ) : (
          data.map((p) => <ProviderCard key={p.id} p={p} />)
        )}
      </div>

      <p data-reveal className="text-[11.5px] text-ink-300">
        Razorpay and OpenRouter report live figures from their own APIs. Groq and LiveKit have no public usage feed, so they show connection status only — no number is ever invented to fill the gap. Keys are server-side environment variables, never exposed to the browser.
      </p>
    </div>
  )
}
