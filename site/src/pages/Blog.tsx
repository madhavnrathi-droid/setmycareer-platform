import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Search } from "@carbon/icons-react"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ARTICLES, COPY } from "@/content/site"
import { newsArt } from "@/lib/art"
import { Kicker } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { useLivePosts, buildFeed, catLabel, artCaption, type FeedItem } from "@/lib/feed"
import { careersForCategory } from "@/lib/careers-link"

gsap.registerPlugin(ScrollTrigger)

/* Field Notes — an editorial PUBLICATION, not a card list. The reading path:
   Featured → Latest (two large) → a pull-quote interlude → The news desk
   (live, rotates daily) → From the library (the archive) → the letter → footer.
   Rhythm comes from three card scales + labelled hairline separators; artwork
   is a quiet Penguin-style plate; the title always leads. */

const fmtTs = (ts: number) => (ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")
const CAT_ORDER = ["originals", "career-guidance", "career-assessments", "career-transition", "professional-development", "job-search", "admission-assistance", "educational-opportunities", "psychology-counselling", "work-life-balance"]
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

type NewsItem = { title: string; source: string; link: string; date: string }

export function Blog() {
  const ref = useReveals()
  const { posts, state } = useLivePosts()
  const [cat, setCat] = useState<string>("all")
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(18)
  const bodyRef = useRef<HTMLDivElement>(null)

  useSeo({
    title: "Field Notes — Career Guidance Blog | SetMyCareer",
    description: "SetMyCareer's Field Notes — a live editorial library of career guidance: streams, courses, assessments, the job market, study-abroad, and deciding with evidence.",
    path: "/blog",
  })

  const feed = useMemo(() => buildFeed(posts), [posts])
  const cats = useMemo(() => {
    const present = new Set(feed.map((f) => f.category))
    return CAT_ORDER.filter((c) => present.has(c) && c !== "originals")
  }, [feed])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return feed.filter((f) =>
      (cat === "all" || (cat === "originals" ? f.original : f.category === cat)) &&
      (!query || f.title.toLowerCase().includes(query) || f.dek.toLowerCase().includes(query)))
  }, [feed, cat, q])

  const browsing = cat !== "all" || q.trim() !== ""
  // the reading path only composes on the unfiltered front page
  const featured = !browsing ? filtered[0] : null
  const latest = !browsing ? filtered.slice(1, 3) : []
  const rest = !browsing ? filtered.slice(3) : filtered
  const shown = rest.slice(0, limit)
  const quote = ARTICLES[2] ?? ARTICLES[0] // one pull-quote interlude, from our essays

  // stagger-in anything new (bands + grid share the [data-card] contract)
  useLayoutEffect(() => {
    const els = Array.from(bodyRef.current?.querySelectorAll<HTMLElement>("[data-card]:not([data-in])") ?? [])
    if (!els.length) return
    els.forEach((el) => el.setAttribute("data-in", "1"))
    if (reduced()) return
    gsap.fromTo(els, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out", stagger: 0.05, overwrite: "auto", clearProps: "transform" })
  }, [shown.map((s) => s.id).join("|"), featured?.id ?? "", latest.map((l) => l.id).join("|")])

  return (
    <main ref={ref} className="pt-28">
      <header className="wrap pb-8 pt-10">
        <Kicker>{COPY.insightsKicker}</Kicker>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-6">
          <h1 className="ed-display max-w-[14ch] text-[clamp(2.6rem,6.4vw,4.4rem)] leading-[0.98]">Field <span className="b">Notes</span></h1>
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-ink-40">
            {state === "loading" ? "Loading the library…" : "Updated live"}
          </p>
        </div>
        <p className="ed-deck mt-6 max-w-lg text-[clamp(1.05rem,1.6vw,1.4rem)]">Career guidance, assessments, the job market and study choices — our essays alongside the full published library.</p>

        {/* quiet controls: Latest · Essays · Topics ▾ · search (complexity hidden) */}
        <div className="mt-10 flex flex-col gap-3 border-b border-line pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Pill on={cat === "all"} onClick={() => { setCat("all"); setLimit(18) }}>Latest</Pill>
            <Pill on={cat === "originals"} onClick={() => { setCat("originals"); setLimit(18) }}>Essays</Pill>
            <div className="relative">
              <select
                value={cats.includes(cat) ? cat : ""}
                onChange={(e) => { if (e.target.value) { setCat(e.target.value); setLimit(18) } }}
                className={`mono cursor-pointer appearance-none rounded-full py-1.5 pl-3 pr-7 text-[11px] uppercase tracking-[0.07em] outline-none transition-colors ${cats.includes(cat) ? "bg-ink text-paper" : "bg-transparent text-ink-40 hover:bg-ink-10 hover:text-ink"}`}
                aria-label="Browse topics"
              >
                <option value="" disabled>{cats.includes(cat) ? catLabel(cat) : "Topics"}</option>
                {cats.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
              </select>
              <span className={`pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] ${cats.includes(cat) ? "text-paper" : "text-ink-40"}`}>▾</span>
            </div>
          </div>
          <label className="flex min-w-[220px] shrink-0 items-center gap-2 border-b border-line pb-1.5 text-ink-60 focus-within:border-ink">
            <Search size={15} className="shrink-0 text-ink-40" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(18) }} placeholder="Search field notes" className="w-full bg-transparent text-[14px] outline-none placeholder:text-ink-40" />
          </label>
        </div>
      </header>

      <div ref={bodyRef} className="wrap pb-24">
        {featured && <FeatureCard item={featured} />}

        {/* ──── Latest: two large stories */}
        {latest.length > 0 && (
          <>
            <Separator label="Latest" />
            <div className="grid gap-x-8 gap-y-12 md:grid-cols-2">
              {latest.map((it) => <CardLarge key={it.id} item={it} />)}
            </div>
          </>
        )}

        {/* pull-quote interlude — a reason to stop scrolling */}
        {!browsing && quote && (
          <Link to={`/blog/${quote.slug}`} data-card className="group my-16 block border-y border-line py-12 md:my-20">
            <p className="ed-quote mx-auto max-w-3xl text-center text-[clamp(1.4rem,2.8vw,2.15rem)] text-ink-80">“{quote.pullQuote}”</p>
            <p className="mt-6 text-center text-[13px] font-medium text-ink-60 transition-colors group-hover:text-ink-40">Read the essay <ArrowRight size={13} className="inline align-[-2px]" /></p>
          </Link>
        )}

        {/* ──── The news desk: live, rotates daily */}
        {!browsing && <NewsDesk />}

        {/* ──── From the library */}
        {shown.length > 0 && <Separator label={browsing ? "Results" : "From the library"} />}
        {state === "loading" && feed.length <= 8 ? (
          <SkeletonGrid />
        ) : shown.length === 0 ? (
          <p className="py-20 text-center text-[14px] text-ink-40">No notes match that. Try another topic or clear the search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((it) => <Card key={it.id} item={it} />)}
          </div>
        )}

        {shown.length < rest.length && (
          <div className="mt-16 flex justify-center">
            <button onClick={() => setLimit((n) => n + 18)} className="btn"><span>More from the library</span></button>
          </div>
        )}
      </div>

      {/* the letter — the page never just ends at "load more" */}
      <LetterBand />
    </main>
  )
}

/* ── chrome pieces ─────────────────────────────────────────────────────────── */

function Separator({ label }: { label: string }) {
  return (
    <div className="mb-8 mt-16 flex items-center gap-4 first:mt-0 md:mt-20">
      <span className="ed-eyebrow shrink-0">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`mono whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.07em] transition-all duration-200 ${on ? "bg-ink text-paper" : "text-ink-40 hover:bg-ink-10 hover:text-ink"}`}>
      {children}
    </button>
  )
}

function CardShell({ item, className, children }: { item: FeedItem; className: string; children: ReactNode }) {
  const state = { art: item.art, category: item.category, author: item.author, ts: item.ts, readMin: item.readMin, dek: item.dek }
  return <Link to={item.href} state={state} data-card className={className}>{children}</Link>
}

/* the Penguin plate — artwork whole, quiet ground, hairline frame */
function Plate({ item, aspect, pad = "p-[9%]", eager }: { item: FeedItem; aspect: string; pad?: string; eager?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-line bg-ink-10" title={item.art ? `${artCaption(item.art)} · public domain` : undefined}>
      <div className={`flex ${aspect} items-center justify-center ${pad}`}>
        <img src={item.image} alt={item.title} loading={eager ? "eager" : "lazy"} className="edit-img max-h-full max-w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]" />
      </div>
    </div>
  )
}

function Eyebrow({ item }: { item: FeedItem }) {
  return <p className="ed-label text-[13px]">{catLabel(item.category)}</p>
}

/* ── the three story scales ────────────────────────────────────────────────── */

function FeatureCard({ item }: { item: FeedItem }) {
  const img = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (reduced() || !img.current) return
    const inner = img.current.querySelector("img")
    if (!inner) return
    const st = gsap.fromTo(inner, { yPercent: -4 }, { yPercent: 4, ease: "none", scrollTrigger: { trigger: img.current, start: "top bottom", end: "bottom top", scrub: 0.6 } })
    return () => { st.scrollTrigger?.kill(); st.kill() }
  }, [item.id])
  const careers = careersForCategory(item.category, 2, item.id)
  return (
    <article className="group mb-4 grid grid-cols-12 items-center gap-8">
      <CardShell item={item} className="col-span-12 block md:col-span-7">
        <div ref={img}><Plate item={item} aspect="aspect-[16/9]" pad="p-[6%]" eager /></div>
      </CardShell>
      <div className="col-span-12 md:col-span-5">
        <CardShell item={item} className="block">
          <Eyebrow item={item} />
          <h2 className="ed-title-xl mt-3 line-clamp-3 text-[clamp(1.7rem,3.2vw,2.5rem)]">{item.title}</h2>
          <p className="ed-deck mt-4 line-clamp-3 max-w-md text-[15px]">{item.dek}</p>
          <p className="mono mt-5 text-[12px] text-ink-40">{[fmtTs(item.ts), item.readMin ? `${item.readMin} min` : ""].filter(Boolean).join(" · ")}</p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink transition-colors group-hover:text-ink-40">
            Read article <ArrowRight size={15} className="transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </CardShell>
        {careers.length > 0 && (
          <p className="ed-label mt-5 text-[13px] leading-relaxed">
            In this field —{" "}
            {careers.map((row, i) => (
              <span key={row.id}>
                {i > 0 && ", "}
                <Link to={`/library/${row.id}`} className="ul text-ink-60 transition-colors hover:text-ink">{row.name}</Link>
              </span>
            ))}
          </p>
        )}
      </div>
    </article>
  )
}

function CardLarge({ item }: { item: FeedItem }) {
  return (
    <CardShell item={item} className="group flex flex-col">
      <Plate item={item} aspect="aspect-[4/3]" />
      <div className="mt-4"><Eyebrow item={item} /></div>
      <h3 className="ed-title mt-2 line-clamp-3 text-[clamp(1.35rem,2vw,1.75rem)] transition-colors duration-200 group-hover:text-ink-60">{item.title}</h3>
      <p className="ed-deck mt-3 line-clamp-2 max-w-lg text-[14px]">{item.dek}</p>
      <p className="mono mt-5 text-[12px] text-ink-40">{[fmtTs(item.ts), item.readMin ? `${item.readMin} min` : ""].filter(Boolean).join(" · ")}</p>
    </CardShell>
  )
}

function Card({ item }: { item: FeedItem }) {
  return (
    <CardShell item={item} className="group flex flex-col">
      <Plate item={item} aspect="aspect-square" />
      <div className="mt-4"><Eyebrow item={item} /></div>
      <h3 className="ed-title mt-2 line-clamp-3 min-h-[3.5em] text-[20px] text-ink transition-colors duration-200 group-hover:text-ink-60">{item.title}</h3>
      <p className="mono mt-3 text-[12px] text-ink-40">{[fmtTs(item.ts), item.readMin ? `${item.readMin} min` : ""].filter(Boolean).join(" · ")}</p>
    </CardShell>
  )
}

/* ── the news desk — live headlines, art rotates with the day ──────────────── */

function NewsDesk() {
  const [items, setItems] = useState<NewsItem[]>([])
  useEffect(() => {
    let alive = true
    fetch("/api/feed").then((r) => r.json())
      .then((d: { items?: NewsItem[] }) => { if (alive && d.items?.length) setItems(d.items.slice(0, 4)) })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  if (!items.length) return null
  const dayKey = new Date().toISOString().slice(0, 10) // the desk re-hangs its art daily
  return (
    <>
      <Separator label="The news desk · today" />
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
        {items.map((n) => {
          const art = newsArt(n.title, dayKey)
          return (
            <a key={n.link} href={n.link} target="_blank" rel="noopener noreferrer" data-card className="group flex flex-col">
              <div className="overflow-hidden rounded-[10px] border border-line bg-ink-10" title={`${art.artist} · ${art.title} · public domain`}>
                <div className="flex aspect-[3/2] items-center justify-center p-[10%]">
                  <img src={art.image} alt="" loading="lazy" className="edit-img max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]" />
                </div>
              </div>
              <p className="ed-label mt-3 text-[12.5px]">News · {n.source || "the wire"}</p>
              <h4 className="ed-title mt-1.5 line-clamp-3 text-[15px] transition-colors group-hover:text-ink-60">{n.title}</h4>
              <span className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-ink-40">Read at source <ArrowUpRight size={12} /></span>
            </a>
          )
        })}
      </div>
    </>
  )
}

/* ── the letter — the page closes deliberately, never on a button ──────────── */

function LetterBand() {
  const [v, setV] = useState("")
  const [done, setDone] = useState(false)
  return (
    <section className="hair-t bg-paper-pure">
      <div className="wrap grid gap-8 py-16 md:grid-cols-2 md:items-center md:py-20">
        <div>
          <p className="kicker text-ink-40">The letter</p>
          <h2 className="ed-title-xl mt-4 text-[clamp(1.6rem,2.8vw,2.2rem)]">Field notes, to your inbox.</h2>
          <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-60">One considered letter when there's something worth your time — essays, the job market, and what we're learning from the counselling room.</p>
        </div>
        <div>
          {done ? (
            <p className="text-[14.5px] text-ink-80">Noted — we'll write only when it matters.</p>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); if (v.includes("@")) setDone(true) }} className="flex max-w-md items-center border-b border-ink-20 focus-within:border-ink">
              <input value={v} onChange={(e) => setV(e.target.value)} type="email" required placeholder="you@email.com" className="w-full bg-transparent py-3 text-[15px] outline-none placeholder:text-ink-40" />
              <button type="submit" className="shrink-0 p-2 text-ink-60 transition-colors hover:text-ink" aria-label="Subscribe"><ArrowRight size={18} /></button>
            </form>
          )}
          <p className="mt-3 text-[11px] text-ink-40">By subscribing you agree to our <Link to="/legal/privacy-policy" className="ul">Privacy Policy</Link>. Unsubscribe anytime.</p>
        </div>
      </div>
    </section>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="aspect-square animate-pulse rounded-[10px] bg-ink-10" />
          <div className="mt-4 h-3.5 w-24 animate-pulse rounded bg-ink-10" />
          <div className="mt-2.5 h-5 w-full animate-pulse rounded bg-ink-10" />
          <div className="mt-2 h-5 w-4/5 animate-pulse rounded bg-ink-10" />
        </div>
      ))}
    </div>
  )
}
