import { useEffect, useMemo, useState } from "react"
import { ArrowUpRight } from "@carbon/icons-react"
import { CITED_RESEARCH, type Research } from "@/content/research"
import { newsArt } from "@/lib/art"
import { artCaption } from "@/lib/feed"

// The wire — three layers, each on-brand and non-AI-looking. (1) A live ticker.
// (2) TODAY'S SIGNAL: fresh career/job/education insight cards from /api/news
// (a daily agent that scrapes + curates Google-News wires), each with a real
// public-domain-artwork thumbnail that ROTATES DAILY (newsArt, date-seeded) — so
// the desk shows new news every day. (3) THE SOURCES: the authoritative reports
// the terminal is built on, each an information-forward report cover anchored on
// its hero stat. Everything renders even if the wire is down (the sources are
// static), and every thumbnail is generated/PD — nothing fragile hotlinked.

interface NewsItem { title: string; source: string; link: string; date: string; tag?: string; stat?: string }

const ago = (d: string) => {
  if (!d) return ""
  const t = Date.parse(d)
  if (Number.isNaN(t)) return ""
  const h = Math.round((Date.now() - t) / 3.6e6)
  if (h < 1) return "just now"
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

// a hairline bar motif — deterministic heights from a seed, quiet ink/paper
// texture that gives each report cover a "data" footer without any colour.
function MiniBars({ seed, ink }: { seed: string; ink: boolean }) {
  const bars = useMemo(() => {
    let h = 2166136261
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619) }
    return Array.from({ length: 9 }, (_, i) => { h = Math.imul(h ^ (i + 1), 16777619); return 24 + (((h >>> 8) % 76)) })
  }, [seed])
  return (
    <span aria-hidden className="flex h-5 items-end gap-[3px]">
      {bars.map((v, i) => (
        <span key={i} className={`w-[2px] ${ink ? "bg-paper/45" : "bg-ink/35"}`} style={{ height: `${v}%` }} />
      ))}
    </span>
  )
}

// split a hero stat into a small prefix ($ + −), a big number, and a small unit
// (M/B/T/%) so the numeral reads as the anchor and the sigils stay quiet.
const splitStat = (s: string) => {
  const m = s.match(/^([+\-−$]*)([\d.,]+)(.*)$/)
  return m ? { pre: m[1], num: m[2], unit: m[3].trim() } : { pre: "", num: s, unit: "" }
}

// an information-forward report cover — hero stat as the visual anchor, the
// source wordmark + tag/year in the corners, a hairline data motif at the foot.
function ReportCover({ r }: { r: Research }) {
  const ink = r.tone === "ink"
  const { pre, num, unit } = splitStat(r.stat)
  return (
    <div className={`relative flex aspect-[5/4] flex-col justify-between overflow-hidden rounded-[10px] border p-4 transition-colors ${ink ? "border-ink bg-ink text-paper" : "border-line bg-paper-pure text-ink group-hover:border-ink/40"}`}>
      <div className={`flex items-center justify-between mono text-[9px] uppercase tracking-[0.14em] ${ink ? "text-paper/55" : "text-ink-60"}`}>
        <span>{r.tag}</span><span className="tabular-nums">{r.year}</span>
      </div>
      <div className="-mt-1">
        <div className={`inline-flex items-baseline font-light leading-[0.9] tracking-tight tabular-nums ${num.length > 4 ? "text-[clamp(1.7rem,3.6vw,2.5rem)]" : "text-[clamp(2rem,4.4vw,3.1rem)]"}`}>
          {pre && <span className="mr-[0.03em] text-[0.5em] font-normal opacity-70">{pre}</span>}
          <span className="font-normal">{num}</span>
          {unit && <span className="ml-[0.06em] text-[0.46em] font-medium opacity-85">{unit}</span>}
        </div>
        <div className={`mono mt-1.5 max-w-[20ch] text-[9px] uppercase leading-snug tracking-[0.1em] line-clamp-2 ${ink ? "text-paper/60" : "text-ink-60"}`}>{r.statLabel}</div>
      </div>
      <div className="flex items-end justify-between gap-2">
        <span className={`mono font-medium leading-none tracking-tight ${r.code.length > 6 ? "text-[12px]" : "text-[15px]"}`}>{r.code}</span>
        <MiniBars seed={r.code} ink={ink} />
      </div>
    </div>
  )
}

// a fresh insight card — a daily-rotating PD-art thumbnail, the tag + timeago,
// the headline (readable), a stat chip if the wire carried a number, the source.
function SignalCard({ it, day }: { it: NewsItem; day: string }) {
  const art = newsArt(it.title, day)
  return (
    <a href={it.link} target="_blank" rel="noopener noreferrer" className="group block">
      <div className="overflow-hidden rounded-[10px] border border-line bg-ink-10" title={art ? `${artCaption(art)} · public domain` : undefined}>
        <div className="aspect-[4/3] overflow-hidden">
          <img src={art.image} alt="" loading="lazy" className="edit-img size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.04] motion-reduce:transition-none" />
        </div>
      </div>
      <div className="mt-3">
        <div className="mono flex items-center gap-2.5 text-[9.5px] uppercase tracking-[0.12em] text-ink-60">
          {it.tag && <span className="border border-line px-1.5 py-0.5 text-ink-60">{it.tag}</span>}
          {ago(it.date) && <span className="tabular-nums">{ago(it.date)}</span>}
        </div>
        <p className="mt-2 text-[14px] font-medium leading-snug tracking-tight text-ink-80 line-clamp-3">{it.title}</p>
        <div className="mono mt-2.5 flex items-center justify-between gap-2 text-[9.5px] uppercase tracking-[0.1em] text-ink-60">
          <span className="truncate">{it.stat ? <span className="text-ink-80">{it.stat}</span> : null}{it.stat ? " · " : ""}{it.source}</span>
          <ArrowUpRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </div>
    </a>
  )
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10))
  const [live, setLive] = useState(false)
  // WCAG 2.2.2 — the marquee needs a pointer-independent pause; hover-pause
  // alone leaves keyboard/touch users with permanently moving content
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    let alive = true
    fetch("/api/news")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { items?: NewsItem[]; day?: string }) => {
        if (!alive || !d?.items?.length) return
        setNews(d.items); if (d.day) setDay(d.day); setLive(true)
      })
      .catch(() => { /* stays on the cited-research desk */ })
    return () => { alive = false }
  }, [])

  const signal = news.slice(0, 6)
  const ticker = (live ? news.map((i) => i.title) : CITED_RESEARCH.map((r) => `${r.publisher}: ${r.finding}`)).slice(0, 14)

  return (
    <div>
      {/* live ticker marquee */}
      <div className="group relative overflow-hidden border-y border-line py-2.5">
        <div
          className="marquee flex w-max gap-8 group-hover:[animation-play-state:paused]"
          style={paused ? { animationPlayState: "paused" } : undefined}
        >
          {[...ticker, ...ticker].map((t, i) => (
            <span key={i} className="mono flex shrink-0 items-center gap-2 text-[11.5px] text-ink-60"><span className="text-ink-60">▪</span>{t}</span>
          ))}
        </div>
      </div>

      {/* status + the pointer-independent ticker pause */}
      <div className="mono mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] uppercase tracking-[0.14em] text-ink-60">
        <span className="flex items-center gap-2">
          <span className={`size-[7px] rounded-full ${live ? "live-dot bg-ink" : "bg-ink/30"}`} />
          {live ? "Live · scraped daily from the careers wire" : "Curated · the sources behind the board"}
        </span>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          aria-pressed={paused}
          className="ul text-ink-60 transition-colors hover:text-ink"
        >
          <span>{paused ? "Play ticker" : "Pause ticker"}</span>
        </button>
      </div>

      {/* today's signal — the daily-scraped, daily-rotating insight cards */}
      {signal.length > 0 && (
        <>
          <div className="mt-6 flex items-baseline justify-between gap-3">
            <h3 className="mono text-[10.5px] uppercase tracking-[0.14em] text-ink-60">Today's signal — jobs, skills &amp; education</h3>
            <p className="mono text-[9.5px] uppercase tracking-[0.1em] text-ink-60 tabular-nums">Updated {day}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {signal.map((it) => <SignalCard key={it.link || it.title} it={it} day={day} />)}
          </div>
        </>
      )}

      {/* the sources behind the board — authoritative reports, stat-forward covers */}
      <h3 className="mono mt-12 text-[10.5px] uppercase tracking-[0.14em] text-ink-60">The sources behind the board</h3>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5 lg:grid-cols-4">
        {CITED_RESEARCH.map((r) => (
          <a key={r.title} href={r.url} target="_blank" rel="noopener noreferrer" className="group block">
            <ReportCover r={r} />
            <div className="mt-2.5">
              <p className="text-[12.5px] leading-snug tracking-tight text-ink-80 line-clamp-3">{r.finding}</p>
              <div className="mono mt-2 flex items-center justify-between gap-2 text-[9px] uppercase tracking-[0.1em] text-ink-60">
                <span className="truncate">{r.publisher}</span>
                <ArrowUpRight size={13} className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
