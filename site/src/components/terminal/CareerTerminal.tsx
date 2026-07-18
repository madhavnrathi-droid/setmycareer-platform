import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { Search, Close, ArrowRight } from "@carbon/icons-react"
import { METHOD, TRAJ_HUE, TRAJ_GLYPH, TRAJ_LABEL, type Trajectory } from "@/content/careers"
import { ALL_ROWS, ALL_CLUSTERS, searchRows, trendPct, type Row } from "@/content/careers-all"
import { Spark, Delta, ExposureDots } from "@/components/terminal/parts"

// The Career Terminal — a LIGHT trading-desk screen for the whole career market:
// the hand-curated India-deep instruments plus the broad O*NET/BLS universe, so a
// visitor can look up almost any occupation. Trajectory is the one colour axis
// (purple growth / red decline / blue flat) and the demand line flows through
// those hues by its own slope.

type SortKey = "growth" | "pay" | "name" | "level"

const last = (t: number[]) => t[t.length - 1]

function marketStats() {
  const lasts = ALL_ROWS.map((r) => last(r.demandTrend))
  const level = Math.round((lasts.reduce((a, b) => a + b, 0) / lasts.length) * 10) / 10
  const deltas = ALL_ROWS.map((r) => trendPct(r.demandTrend))
  const avg = Math.round(deltas.reduce((a, b) => a + b, 0) / deltas.length)
  const adv = ALL_ROWS.filter((r) => r.trajectory === "up").length
  const dec = ALL_ROWS.filter((r) => r.trajectory === "down").length
  const fla = ALL_ROWS.filter((r) => r.trajectory === "flat").length
  const dir: Trajectory = adv > dec ? "up" : dec > adv ? "down" : "flat"
  return { level, avg, adv, dec, fla, dir }
}

const COLS = "grid-cols-[minmax(150px,1fr)_112px_52px_78px_124px_40px_46px_16px]"

function TickerTape() {
  const items = useMemo(() => ALL_ROWS.slice(0, 40).map((r) => ({ t: r.name, p: trendPct(r.demandTrend), hue: TRAJ_HUE[r.trajectory] })), [])
  return (
    <div className="flex overflow-hidden border-b border-line py-1.5" aria-hidden>
      <div className="logo-row" style={{ ["--dur" as string]: "120s" }}>
        {[...items, ...items].map((it, i) => (
          <span key={i} className="mono flex shrink-0 items-center gap-1.5 whitespace-nowrap px-4 text-[10.5px] tabular-nums text-ink-60">
            <span className="text-ink">{it.t}</span>
            <span style={{ color: it.hue }}>{it.p >= 0 ? "▲" : "▼"} {it.p >= 0 ? "+" : ""}{it.p}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

export function CareerTerminal() {
  const [q, setQ] = useState("")
  const [cluster, setCluster] = useState("All")
  const [sort, setSort] = useState<SortKey>("growth")
  const inputRef = useRef<HTMLInputElement>(null)
  const stats = useMemo(marketStats, [])

  const results = useMemo(() => {
    let r = searchRows(q)
    if (cluster !== "All") r = r.filter((c) => c.cluster === cluster)
    const by: Record<SortKey, (a: Row, b: Row) => number> = {
      growth: (a, b) => trendPct(b.demandTrend) - trendPct(a.demandTrend),
      pay: (a, b) => b.payHi - a.payHi,
      level: (a, b) => last(b.demandTrend) - last(a.demandTrend),
      name: (a, b) => a.name.localeCompare(b.name),
    }
    return [...r].sort(by[sort])
  }, [q, cluster, sort])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA")) { e.preventDefault(); inputRef.current?.focus() }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const SortTh = ({ k, children, align = "right" }: { k: SortKey; children: ReactNode; align?: "left" | "right" }) => (
    <button onClick={() => setSort(k)} className={`group/th flex items-center gap-1 ${align === "right" ? "justify-end" : ""} ${sort === k ? "text-ink" : "text-ink-40 hover:text-ink-60"}`}>
      {children}<span className={sort === k ? "opacity-100" : "opacity-0 group-hover/th:opacity-50"}>▾</span>
    </button>
  )

  return (
    <div className="overflow-hidden border border-[rgba(11,11,11,0.14)] bg-paper-pure text-ink">
      {/* market status bar */}
      <div className="mono flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-line px-4 py-2.5 text-[10.5px] tabular-nums">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="flex items-center gap-2">
            <span className="live-dot inline-block size-1.5 rounded-full" style={{ background: TRAJ_HUE[stats.dir] }} />
            <span className="uppercase tracking-[0.14em] text-ink">SMC Career Index</span>
          </span>
          <span className="flex items-baseline gap-1.5">
            <span className="text-[13px] font-medium text-ink">{stats.level}</span>
            <span style={{ color: TRAJ_HUE[stats.dir] }}>{stats.avg >= 0 ? "▲" : "▼"} {stats.avg >= 0 ? "+" : ""}{stats.avg}% · 10Y</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 uppercase tracking-[0.1em] text-ink-40">
          <span>
            <span style={{ color: "var(--color-growth)" }}>▲ {stats.adv}</span> <span className="text-ink-20">grow</span> ·
            <span style={{ color: "var(--color-decline)" }}> ▼ {stats.dec}</span> <span className="text-ink-20">fall</span> ·
            <span style={{ color: "var(--color-flat)" }}> ▬ {stats.fla}</span> <span className="text-ink-20">flat</span>
          </span>
          <span className="hidden sm:inline">O*NET · BLS 2024–34</span>
        </div>
      </div>

      <TickerTape />

      {/* command search + filters */}
      <div className="border-b border-line px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="mono text-[12px] text-ink-40">/</span>
          <Search size={16} className="shrink-0 text-ink-40" />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${ALL_ROWS.length} careers — nurse, lawyer, pilot, data scientist, electrician…`}
            className="w-full bg-transparent text-[14.5px] text-ink outline-none placeholder:text-ink-40" aria-label="Search careers" />
          {q && <button onClick={() => setQ("")} aria-label="Clear" className="text-ink-40 hover:text-ink"><Close size={16} /></button>}
          <span className="mono hidden shrink-0 text-[10.5px] uppercase tracking-[0.1em] text-ink-40 sm:inline">{results.length} / {ALL_ROWS.length}</span>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap gap-1.5">
            {["All", ...ALL_CLUSTERS].map((c) => (
              <button key={c} onClick={() => setCluster(c)}
                className={`mono border px-2.5 py-1 text-[10.5px] uppercase tracking-[0.06em] transition-colors ${cluster === c ? "border-ink bg-ink text-paper-pure" : "border-[rgba(11,11,11,0.18)] text-ink-60 hover:border-ink hover:text-ink"}`}>
                {c === "All" ? "All sectors" : c.replace(" & ", "/")}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* rows — header shares the scroll context so columns stay aligned */}
      <div className="max-h-[620px] overflow-y-auto overflow-x-auto">
        <div className="min-w-[720px]">
          <div className={`mono sticky top-0 z-[1] grid ${COLS} items-center gap-3 border-b border-[rgba(11,11,11,0.12)] bg-paper-pure px-4 py-2 text-[9.5px] uppercase tracking-[0.11em]`}>
            <SortTh k="name" align="left">Instrument</SortTh>
            <span className="text-ink-40">’15–’25</span>
            <SortTh k="level">Last</SortTh>
            <SortTh k="growth">Δ 10Y</SortTh>
            <SortTh k="pay">Pay · LPA</SortTh>
            <span className="text-center text-ink-40">Traj</span>
            <span className="text-right text-ink-40">AI</span>
            <span />
          </div>
          {results.map((r) => {
            const pct = trendPct(r.demandTrend)
            const hue = TRAJ_HUE[r.trajectory]
            return (
              <Link key={r.id} to={`/library/${r.id}`}
                className={`group grid ${COLS} items-center gap-3 border-b border-[rgba(11,11,11,0.07)] px-4 py-2.5 transition-colors hover:bg-[rgba(11,11,11,0.035)]`}>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium tracking-tight text-ink">{r.name}</span>
                  <span className="mono block truncate text-[9px] uppercase tracking-[0.08em] text-ink-40">{r.cluster}</span>
                </span>
                <span><Spark data={r.demandTrend} hue={hue} w={108} h={26} area baseline /></span>
                <span className="mono text-right text-[12px] tabular-nums text-ink-60">{last(r.demandTrend)}</span>
                <Delta pct={pct} hue={hue} className="text-right text-[11.5px]" />
                <span className="mono text-right text-[11px] tabular-nums text-ink-60">{r.payLo}<span className="text-ink-20">→</span>{r.payHi}</span>
                <span className="text-center text-[11px] leading-none" style={{ color: hue }} title={TRAJ_LABEL[r.trajectory]}>{TRAJ_GLYPH[r.trajectory]}</span>
                <span className="flex justify-end">{r.aiLevel != null ? <ExposureDots level={r.aiLevel} /> : <span className="text-[10px] text-ink-20">·</span>}</span>
                <ArrowRight size={13} className="justify-self-end text-ink-20 transition-all group-hover:translate-x-0.5 group-hover:text-ink-60" />
              </Link>
            )
          })}
          {!results.length && (
            <div className="px-4 py-12 text-center text-[14px] text-ink-60">No instrument matches “{q}”. Try a skill, sector, or a broader term.</div>
          )}
        </div>
      </div>

      {/* legend + method */}
      <div className="mono flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[rgba(11,11,11,0.12)] px-4 py-2.5 text-[9px] uppercase leading-relaxed tracking-[0.08em] text-ink-40">
        <span className="text-ink">Trajectory</span>
        <span style={{ color: "var(--color-growth)" }}>▲ growth</span>
        <span style={{ color: "var(--color-decline)" }}>▼ decline</span>
        <span style={{ color: "var(--color-flat)" }}>▬ flat</span>
        <span className="text-ink-20">·</span>
        <span><span className="text-ink">Last</span> demand index</span>
        <span><span className="text-ink">Δ 10Y</span> 2015→2025</span>
        <span><span className="text-ink">AI</span> automation exposure (curated)</span>
      </div>
      <p className="mono border-t border-[rgba(11,11,11,0.12)] px-4 py-2.5 text-[9.5px] leading-relaxed text-ink-40">{ALL_ROWS.length} careers · US O*NET / BLS 2024-34 projections, India pay indicative. {METHOD}</p>
    </div>
  )
}
