// The in-dashboard Career Terminal — shared by the client portal and the
// counsellor console. A trading-terminal read on the career market, drawn to
// the Flux/Finsera/Quantro references: a welcome-grade header with a real
// SEARCH bar (typeahead over every tracked career), a KPI row of big thin
// numerals with soft delta chips, the movers board (a live-runs style table),
// the WEF-2030 outlook as a segmented bar, an AI-exposure gauge, and the daily
// news wire from the marketing site's scrape agent. Every number derives from
// the bundled research-grounded dataset — nothing invented. The audience
// toggle re-scopes metrics, watchlists, copy and news ordering for students
// vs executives; "Ask" hooks hand any career straight to the AI guide.

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Sparkles, ArrowUpRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  AUDIENCE_COPY, OUTLOOK, SELL, SIGNALS, SIGNAL_BRIDGE, askPromptsFor, kpisFor,
  moversFor, orderNews, searchCareers, trendPctOf, watchlistFor, MARKETING_URL,
  ALL_ROWS, type Audience, type NewsItem, type Row,
} from "./insights"
import { rowById } from "./careers-all"
import { CAREERS } from "./careers"
import { AiDots, DeltaChip, Gauge, KpiCard, RowSpark, SegBar } from "./viz"
import { PackageGradient } from "../product/PackageGradient"

const SIGNAL_TONE: Record<string, string> = {
  risk: "text-risk-600", warn: "text-warn-600", brand: "text-brand-600", well: "text-well-600",
}

const ago = (d: string) => {
  const t = Date.parse(d); if (Number.isNaN(t)) return ""
  const h = Math.round((Date.now() - t) / 3.6e6)
  return h < 1 ? "now" : h < 24 ? `${h}h` : `${Math.round(h / 24)}d`
}

/* ── the career detail sheet (opens from search or the board) ── */
function CareerDetail({ row, audience, onAsk, onClose }: {
  row: Row; audience: Audience; onAsk?: (prompt: string) => void; onClose: () => void
}) {
  const full = CAREERS.find((c) => c.id === row.id)
  const pct = trendPctOf(row)
  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 shadow-[var(--shadow-e1)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{row.ticker} · {row.cluster}</p>
          <h3 className="mt-1 font-display text-[22px] font-semibold tracking-tight text-foreground">{row.name}</h3>
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{row.oneLine}</p>
        </div>
        <button onClick={onClose} aria-label="Close career detail" className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-card text-muted-foreground transition hover:text-foreground"><X className="size-4" /></button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">10-yr demand</p>
          <p className="mt-1 flex items-center gap-2 font-display text-[18px] font-semibold tabular-nums">{pct >= 0 ? "+" : ""}{pct}% <RowSpark trend={row.demandTrend} up={pct >= 0} /></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">{audience === "student" ? "Entry pay" : "Senior pay"}</p>
          <p className="mt-1 font-display text-[18px] font-semibold tabular-nums">₹{audience === "student" ? row.payLo : row.payHi}L <span className="text-[11px] font-normal text-ink-400">/yr</span></p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">Pay band</p>
          <p className="mt-1 font-display text-[18px] font-semibold tabular-nums">₹{row.payLo}–{row.payHi}L</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-3">
          <p className="text-[11px] text-muted-foreground">AI exposure</p>
          <p className="mt-1.5"><AiDots level={row.aiLevel} /></p>
        </div>
      </div>

      {full && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">{audience === "student" ? "How you get there" : "The read"}</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{full.growthNote}. {full.aiNote}.</p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {(audience === "student" ? full.education : full.skills).slice(0, 5).map((s) => (
                <span key={s} className="rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-ink-600">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-400">The pay ladder</p>
            <div className="mt-1.5 space-y-1.5">
              {full.stages.slice(0, 3).map((st) => (
                <div key={st.label} className="flex items-baseline justify-between gap-3 text-[12.5px]">
                  <span className="text-ink-600">{st.label} <span className="text-ink-300">· {st.years}</span></span>
                  <span className="font-medium tabular-nums text-foreground">₹{st.payLo}–{st.payHi}L</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {onAsk && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border/70 pt-4">
          {askPromptsFor(audience, row).map((p) => (
            <button key={p} onClick={() => onAsk(p)}
              className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-medium text-background transition hover:opacity-85">
              <Sparkles className="size-3" /> {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── the panel ── */
export function CareerTerminalPanel({ defaultAudience = "student", onAsk, onSell, whoLabel }: {
  defaultAudience?: Audience
  /** hand a prompt to the AI guide (Compass / Assistant) */
  onAsk?: (prompt: string) => void
  /** route to a programme in the catalogue — the terminal's one sell (portal only) */
  onSell?: (offeringId: string) => void
  /** counsellor console framing, e.g. "for your caseload" */
  whoLabel?: string
}) {
  const [audience, setAudience] = useState<Audience>(defaultAudience)
  useEffect(() => setAudience(defaultAudience), [defaultAudience])
  const [q, setQ] = useState("")
  const [openSearch, setOpenSearch] = useState(false)
  const [selected, setSelected] = useState<Row | null>(null)
  const [news, setNews] = useState<NewsItem[]>([])
  const boxRef = useRef<HTMLDivElement>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const copy = AUDIENCE_COPY[audience]
  const kpis = useMemo(() => kpisFor(audience), [audience])
  const movers = useMemo(() => moversFor(audience), [audience])
  const watch = useMemo(() => watchlistFor(audience), [audience])
  const results = useMemo(() => searchCareers(q), [q])

  useEffect(() => {
    let alive = true
    fetch(`${MARKETING_URL}/api/news`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { items?: NewsItem[] }) => { if (alive && d?.items?.length) setNews(d.items) })
      .catch(() => { /* the wire column collapses gracefully */ })
    return () => { alive = false }
  }, [])
  const wire = useMemo(() => orderNews(news, audience).slice(0, 6), [news, audience])

  // close the typeahead on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpenSearch(false) }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const pick = (r: Row) => {
    setSelected(r); setQ(""); setOpenSearch(false)
    requestAnimationFrame(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }))
  }
  const curatedAi = ALL_ROWS.filter((r) => r.aiLevel != null)
  const aiSafePct = Math.round((curatedAi.filter((r) => (r.aiLevel ?? 3) <= 2).length / Math.max(1, curatedAi.length)) * 100)

  return (
    <div className="space-y-5">
      {/* ── header: title, audience toggle, the search bar ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[26px] font-semibold tracking-tight sm:text-[30px]">{copy.title}</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-well-50 px-2.5 py-1 text-[10.5px] font-semibold text-well-700">
              <span className="size-1.5 animate-pulse rounded-full bg-well-500" /> Live{whoLabel ? ` · ${whoLabel}` : ""}
            </span>
          </div>
          <p className="mt-1 max-w-[62ch] text-[13.5px] leading-relaxed text-muted-foreground">{copy.sub}</p>
        </div>
        <div className="flex rounded-full border border-border bg-card p-1 shadow-[var(--shadow-e1)]" role="tablist" aria-label="Audience">
          {(["student", "executive"] as const).map((a) => (
            <button key={a} role="tab" aria-selected={audience === a} onClick={() => { setAudience(a); setSelected(null) }}
              className={cn("rounded-full px-3.5 py-1.5 text-[12.5px] font-medium capitalize transition",
                audience === a ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground")}>
              {a === "student" ? "Students" : "Executives"}
            </button>
          ))}
        </div>
      </div>

      {/* the search bar — typeahead over every tracked career */}
      <div ref={boxRef} className="relative">
        <div className="flex items-center gap-2.5 rounded-full border border-border bg-card px-4 py-3 shadow-[var(--shadow-e1)] focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
          <Search className="size-4 shrink-0 text-ink-400" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpenSearch(true) }}
            onFocus={() => setOpenSearch(true)}
            placeholder={copy.searchPlaceholder}
            aria-label="Search careers"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-300"
          />
          <span className="hidden rounded-md border border-border px-1.5 py-0.5 text-[10px] text-ink-300 sm:inline">{ALL_ROWS.length} careers</span>
        </div>
        {openSearch && results.length > 0 && (
          <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
            {results.map((r) => {
              const pct = trendPctOf(r)
              return (
                <button key={r.id} onClick={() => pick(r)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-ink-50">
                  <span className="w-14 shrink-0 text-[10.5px] font-semibold uppercase tracking-wide text-ink-400">{r.ticker}</span>
                  <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-foreground">{r.name}</span>
                  <span className="hidden truncate text-[11.5px] text-ink-400 sm:inline">{r.cluster}</span>
                  <DeltaChip pct={pct} />
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── selected career detail ── */}
      <div ref={detailRef}>
        {selected && <CareerDetail row={selected} audience={audience} onAsk={onAsk} onClose={() => setSelected(null)} />}
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      {/* ── the signals — why this decision can't wait (sourced, audience-shaped) ── */}
      <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-e1)]">
        <div className="flex flex-wrap items-baseline justify-between gap-2 px-5 pt-4">
          <p className="text-[13px] font-semibold text-foreground">The signals</p>
          <p className="text-[11px] text-muted-foreground">
            {audience === "student" ? "what the system isn't telling students" : "what the market is telling professionals"} · every figure sourced
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-5 px-5 pb-2 pt-3 sm:grid-cols-3 lg:grid-cols-5">
          {SIGNALS[audience].map((s) => (
            <div key={s.source + s.stat} className="pb-3">
              <p className={cn("font-display text-[25px] font-semibold leading-none tracking-tight tabular-nums", SIGNAL_TONE[s.tone])}>{s.stat}</p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-ink-600">{s.label}</p>
              <p className="mt-1 text-[9.5px] uppercase tracking-[0.08em] text-ink-300">{s.source}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3.5">
          <p className="max-w-[52ch] text-[12.5px] leading-relaxed text-muted-foreground">{SIGNAL_BRIDGE[audience]}</p>
          {onSell && (
            <button
              onClick={() => onSell(SELL[audience].offeringId)}
              className="group relative overflow-hidden rounded-xl px-4 py-2.5 text-left text-white"
            >
              <PackageGradient offeringId={SELL[audience].offeringId} interactive={false} />
              <span className="relative z-10 flex items-center gap-3">
                <span className="min-w-0">
                  <span className="block text-[12.5px] font-semibold">
                    {SELL[audience].name} — ₹{SELL[audience].priceInr.toLocaleString("en-IN")}
                  </span>
                  <span className="block max-w-[40ch] truncate text-[10.5px] text-white/70">{SELL[audience].line}</span>
                </span>
                <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </button>
          )}
        </div>
      </div>

      {/* ── main grid: movers board + right column ── */}
      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          {/* movers board */}
          <div className="rounded-2xl border border-border bg-card shadow-[var(--shadow-e1)]">
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="text-[13px] font-semibold text-foreground">{audience === "student" ? "Movers — the careers rising fastest" : "Movers — where the pivots are heading"}</p>
              <span className="text-[11px] text-ink-400">10-yr demand · WEF/BLS-grounded</span>
            </div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left">
                <thead>
                  <tr className="border-b border-border text-[10.5px] uppercase tracking-[0.08em] text-ink-400">
                    <th className="px-5 py-2 font-medium">Career</th>
                    <th className="px-3 py-2 font-medium">Trend</th>
                    <th className="px-3 py-2 font-medium">10-yr</th>
                    <th className="px-3 py-2 font-medium">{audience === "student" ? "Entry ₹" : "Senior ₹"}</th>
                    <th className="px-3 py-2 font-medium">AI</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {movers.map((r) => {
                    const pct = trendPctOf(r)
                    return (
                      <tr key={r.id} className="cursor-pointer border-b border-border/60 transition hover:bg-ink-50/60 last:border-0" onClick={() => pick(r)}>
                        <td className="px-5 py-2.5">
                          <p className="text-[13px] font-medium text-foreground">{r.name}</p>
                          <p className="text-[11px] text-ink-400">{r.cluster}</p>
                        </td>
                        <td className="px-3 py-2.5"><RowSpark trend={r.demandTrend} up={pct >= 0} /></td>
                        <td className="px-3 py-2.5"><DeltaChip pct={pct} /></td>
                        <td className="px-3 py-2.5 text-[12.5px] font-medium tabular-nums">₹{audience === "student" ? r.payLo : r.payHi}L</td>
                        <td className="px-3 py-2.5"><AiDots level={r.aiLevel} /></td>
                        <td className="px-3 py-2.5 text-right"><ArrowUpRight className="ml-auto size-3.5 text-ink-300" /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* outlook — the 2030 read */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e1)]">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[13px] font-semibold text-foreground">The 2030 outlook</p>
              <span className="text-[11px] text-ink-400">WEF Future of Jobs 2025</span>
            </div>
            <p className="mt-2 font-display text-[30px] font-semibold tracking-tight">{OUTLOOK.headline} <span className="text-[13px] font-normal text-muted-foreground">{OUTLOOK.headlineLabel}</span></p>
            <div className="mt-4"><SegBar segments={OUTLOOK.segments} /></div>
            <p className="mt-3 rounded-xl bg-warn-50 px-3 py-2 text-[11.5px] text-warn-700">⚠ {OUTLOOK.note}</p>
          </div>
        </div>

        {/* right column: gauge + watchlist (watchlist flex-fills to match the
            movers table height, so the two columns stay balanced — no dead space) */}
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e1)]">
            <p className="text-[13px] font-semibold text-foreground">AI-resilience of the tracked set</p>
            <div className="mt-3"><Gauge pct={aiSafePct} label="read low–moderate AI exposure" sub="curated careers, O*NET/BLS grounded" /></div>
          </div>

          <div className="flex-1 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e1)]">
            <p className="text-[13px] font-semibold text-foreground">{audience === "student" ? "Most-asked careers" : "Most-watched pivots"}</p>
            <div className="mt-2 divide-y divide-border/60">
              {watch.map((r) => {
                const pct = trendPctOf(r)
                return (
                  <button key={r.id} onClick={() => pick(r)} className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-75">
                    <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{r.name}</span>
                    <RowSpark trend={r.demandTrend} up={pct >= 0} />
                    <DeltaChip pct={pct} />
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── the daily wire — full-width headline grid, so the news gets its own
          bento row instead of leaving the columns above lopsided ── */}
      {wire.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e1)]">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground">{copy.readingLabel}</p>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-medium text-well-700"><span className="size-1.5 animate-pulse rounded-full bg-well-500" /> Daily wire</span>
          </div>
          <div className="mt-3 grid gap-x-6 gap-y-1 sm:grid-cols-2 xl:grid-cols-3">
            {wire.map((n) => (
              <a key={n.link || n.title} href={n.link} target="_blank" rel="noopener noreferrer" className="group flex items-start gap-3 border-t border-border/60 py-2.5 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 xl:[&:nth-child(3)]:border-t-0">
                <span className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-medium leading-snug text-foreground line-clamp-2 group-hover:underline">{n.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-[10.5px] text-ink-400">
                    {n.tag && <span className="rounded-full border border-border px-1.5 py-px text-[9.5px] font-medium text-ink-500">{n.tag}</span>}
                    <span className="truncate">{n.source}</span>{ago(n.date) && <span>· {ago(n.date)}</span>}
                  </p>
                </span>
                <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-ink-300 transition group-hover:text-ink-500" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* ── ask the guide, from wherever you are ── */}
      {onAsk && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e1)]">
          <span className="mr-1 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground"><Sparkles className="size-3.5 text-brand-600" /> Ask the guide</span>
          {askPromptsFor(audience).map((p) => (
            <button key={p} onClick={() => onAsk(p)} className="rounded-full border border-border px-3 py-1.5 text-[12px] text-ink-600 transition hover:border-ink-400 hover:text-foreground">{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}

export { rowById }
