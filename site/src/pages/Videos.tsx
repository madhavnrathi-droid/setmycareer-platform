import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, ArrowRight, ArrowUpRight, PlayFilledAlt, List } from "@carbon/icons-react"
import { gsap } from "gsap"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { VideoBento } from "@/components/VideoBento"

/* The films — a full editorial video page, sibling to Field Notes. The whole
   library, opened up: the latest from the channel, then every talk, story,
   insight, deep-dive and webinar the practice has published — categorised, read
   HERE, never on the old website. Two live sources: /api/videos (channel RSS —
   the freshest uploads, with dates) and /api/video-library (the curated,
   categorised collection). Photographic thumbnails sit in quiet rounded frames
   (object-cover, monochrome chrome). Async-safe: the grid animates with its own
   gsap stagger keyed on the count — never data-reveal. */

type Rss = { id: string; title: string; published: string; views: number; thumb: string; thumbHi: string; url: string }
type LibVid = { id: string; title: string; category: string; categoryLabel: string; thumb: string; thumbHi: string; url: string }
type Cat = { key: string; label: string; count: number }
type AnyVid = { id: string; title: string; thumb: string; thumbHi: string; url: string }

// the one featured webinar series from the old webinar page — a YouTube playlist
// (not the old site). Surfaced at the head of the Webinars section.
const WEBINAR_SERIES = {
  url: "https://www.youtube.com/playlist?list=PL21MDQNj5zQ5Uu_-p0EYpYZ_XGT8lEyHo",
  title: "Charting Your Career Path — the webinar series",
  note: "Guided sessions with SetMyCareer's experts on choosing, changing and future-proofing a career.",
}
const CHANNEL = "https://www.youtube.com/channel/UCrPxXwRZDEDrBT4TFPnSvqQ"

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")
const fmtViews = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k views` : n > 0 ? `${n} views` : "")
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

export function Videos() {
  const ref = useReveals()
  const [rss, setRss] = useState<Rss[]>([])
  const [lib, setLib] = useState<LibVid[]>([])
  const [cats, setCats] = useState<Cat[]>([])
  const [channel, setChannel] = useState(CHANNEL)
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [cat, setCat] = useState<string>("all")
  const bodyRef = useRef<HTMLDivElement>(null)

  useSeo({
    title: "The Films — Career Videos, Stories & Webinars | SetMyCareer",
    description: "SetMyCareer's full video library — Dr. Rathi's advice, real success stories, career insights, deep-dives and webinars, straight from the channel and read here on the site.",
    path: "/resources/videos",
  })

  useEffect(() => {
    let alive = true
    Promise.allSettled([
      fetch("/api/video-library").then((r) => r.json()),
      fetch("/api/videos").then((r) => r.json()),
    ]).then(([libRes, rssRes]) => {
      if (!alive) return
      const L = libRes.status === "fulfilled" ? libRes.value : {}
      const R = rssRes.status === "fulfilled" ? rssRes.value : {}
      const libVids: LibVid[] = L?.videos || []
      const rssVids: Rss[] = R?.videos || []
      setLib(libVids)
      setCats(L?.categories || [])
      setRss(rssVids)
      if (R?.channel) setChannel(R.channel)
      setState(libVids.length || rssVids.length ? "ready" : "error")
    })
    return () => { alive = false }
  }, [])

  // stagger the async cards in (never data-reveal — that registers once at mount)
  useLayoutEffect(() => {
    const els = Array.from(bodyRef.current?.querySelectorAll<HTMLElement>("[data-vid]:not([data-in])") ?? [])
    if (!els.length) return
    els.forEach((el) => el.setAttribute("data-in", "1"))
    if (reduced()) return
    gsap.fromTo(els, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.55, ease: "power3.out", stagger: 0.04, overwrite: "auto", clearProps: "transform" })
  }, [lib.length, rss.length, cat])

  const featured = rss[0] || lib[0]
  const fresh = useMemo(() => rss.filter((v) => v.id !== featured?.id).slice(0, 10), [rss, featured])
  const byCat = useMemo(() => cats.map((c) => ({ ...c, items: lib.filter((v) => v.category === c.key) })).filter((c) => c.items.length), [cats, lib])
  const webinars = useMemo(() => lib.filter((v) => v.category === "webinars"), [lib])
  const filtered = useMemo(() => (cat === "all" ? [] : lib.filter((v) => v.category === cat)), [cat, lib])
  const total = lib.length
  // the reel — every film (fresh channel uploads + the curated library), deduped
  // and minus the hero, fed to the rotating bento (a live pool bigger than what
  // shows, so the mosaic can rotate to off-screen films).
  const reel = useMemo(() => {
    const seen = new Set<string>(featured?.id ? [featured.id] : [])
    const out: AnyVid[] = []
    for (const v of [...fresh, ...lib]) { if (v.id && !seen.has(v.id)) { seen.add(v.id); out.push(v) } }
    return out
  }, [fresh, lib, featured])

  const tag = state === "loading" ? "Loading the library…"
    : state === "error" ? "Live on YouTube"
    : `Updated live · ${total || rss.length} film${(total || rss.length) === 1 ? "" : "s"}`

  return (
    <main ref={ref} className="pt-28">
      {/* ── masthead ── */}
      <header className="wrap pb-6 pt-10">
        <div className="flex items-center justify-between gap-4">
          <Link to="/resources" className="ul mono flex items-center gap-1.5 text-[11px] uppercase tracking-[0.14em] text-ink-40"><ArrowLeft size={13} /> Resources</Link>
          <p className="mono text-[11px] uppercase tracking-[0.14em] text-ink-40">{tag}</p>
        </div>
        <h1 data-reveal className="ed-display mt-6 max-w-[14ch] text-[clamp(2.6rem,7vw,5rem)]">The <em>films</em>.</h1>
        <p data-reveal className="ed-deck mt-6 max-w-2xl text-[clamp(1.05rem,1.6vw,1.35rem)]">Dr. Rathi's advice, real career switches, insights, deep-dives and the webinars — the whole channel, watched here. Pick a thread or scroll the reel.</p>

        {/* category filter */}
        {cats.length > 0 && (
          <div className="mt-9 flex flex-wrap items-center gap-1.5 border-b border-line pb-4">
            <Pill on={cat === "all"} onClick={() => setCat("all")}>All</Pill>
            {cats.map((c) => <Pill key={c.key} on={cat === c.key} onClick={() => setCat(c.key)}>{c.label}</Pill>)}
          </div>
        )}
      </header>

      <div ref={bodyRef} className="wrap pb-24">
        {state === "loading" ? (
          <SkeletonReel />
        ) : state === "error" ? (
          <a href={channel} target="_blank" rel="noopener noreferrer" className="group flex flex-wrap items-center justify-between gap-6 border-t border-line py-10">
            <span className="ed-deck max-w-lg text-[15px]">The channel is live on YouTube — talks, stories and webinars.</span>
            <span className="ul flex shrink-0 items-center gap-1.5 text-[13.5px] font-medium">Open the channel <ArrowUpRight size={15} /></span>
          </a>
        ) : cat !== "all" ? (
          /* ── a single thread — a dynamic bento of the whole category ── */
          <>
            <Separator label={cats.find((c) => c.key === cat)?.label || "Films"} />
            {cat === "webinars" && <WebinarLead first={webinars[0]} />}
            {filtered.length > 3 ? <VideoBento videos={filtered} max={filtered.length} /> : <Grid items={filtered} />}
          </>
        ) : (
          /* ── the reel — a hero, then the rotating bento, then category grids ── */
          <>
            {featured && (
              <a href={featured.url} target="_blank" rel="noopener noreferrer" data-vid className="group grid grid-cols-12 items-center gap-8">
                <div className="col-span-12 md:col-span-8"><Frame v={featured} hero /></div>
                <div className="col-span-12 md:col-span-4">
                  <p className="ed-label text-[13px]">Latest{"published" in featured && featured.published ? ` · ${fmtDate((featured as Rss).published)}` : ""}{"views" in featured && (featured as Rss).views ? ` · ${fmtViews((featured as Rss).views)}` : ""}</p>
                  <h2 className="ed-title-xl mt-3 line-clamp-3 text-[clamp(1.5rem,3vw,2.3rem)]">{featured.title}</h2>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink transition-colors group-hover:text-ink-40">Watch now <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                </div>
              </a>
            )}

            {reel.length > 0 && (
              <>
                <Separator label="The reel — a live cut" aside="Rotates as you watch" />
                <VideoBento videos={reel} max={11} />
              </>
            )}

            {byCat.filter((c) => c.key !== "webinars").map((c) => (
              <section key={c.key}>
                <Separator label={c.label} to={{ onClick: () => setCat(c.key), label: `All ${c.label.toLowerCase()}` }} />
                <Grid items={c.items} />
              </section>
            ))}

            {webinars.length > 0 && (
              <section>
                <Separator label="Webinars" />
                <WebinarLead first={webinars[0]} />
                <Grid items={webinars} />
              </section>
            )}
          </>
        )}
      </div>

      {/* ── the page closes on the channel + a nudge to the next live session ── */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap grid gap-8 py-16 md:grid-cols-2 md:items-center md:py-20">
          <div>
            <p className="ed-eyebrow">Don't miss the next one</p>
            <h2 className="ed-title-xl mt-4 text-[clamp(1.6rem,2.8vw,2.4rem)]">Webinars, live — and every talk after.</h2>
            <p className="ed-deck mt-4 max-w-md text-[15px]">Subscribe for each new film, or leave your details and we'll tell you when the next live session is on.</p>
          </div>
          <div className="flex flex-wrap items-center gap-5 md:justify-self-end">
            <a href={channel} target="_blank" rel="noopener noreferrer" className="btn btn--solid"><span>Open the channel</span> <ArrowUpRight size={15} className="btn-arrow" /></a>
            <Link to="/contact" className="ul inline-flex items-center gap-1.5 text-[13.5px] text-ink-60">Get notified <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>
    </main>
  )
}

/* ── the webinar-series lead card (the old webinar page's featured playlist) ── */
function WebinarLead({ first }: { first?: LibVid }) {
  return (
    <a href={WEBINAR_SERIES.url} target="_blank" rel="noopener noreferrer" data-vid className="group mb-10 grid grid-cols-12 items-center gap-8 rounded-[14px] border border-line bg-paper-pure p-5 md:p-6">
      <div className="col-span-12 sm:col-span-5 md:col-span-4">
        <div className="relative overflow-hidden rounded-[10px] bg-ink">
          <div className="aspect-video overflow-hidden">
            {first ? <img src={first.thumbHi} onError={(e) => { const t = e.currentTarget; if (t.src !== first.thumb) t.src = first.thumb }} alt={WEBINAR_SERIES.title} className="size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none" /> : <div className="size-full bg-ink-10" />}
          </div>
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-ink/75 px-2 py-1 text-[10px] font-medium text-paper"><List size={12} /> Playlist</span>
        </div>
      </div>
      <div className="col-span-12 sm:col-span-7 md:col-span-8">
        <p className="ed-label text-[13px]">Webinar series</p>
        <h3 className="ed-title-xl mt-2 text-[clamp(1.3rem,2.2vw,1.9rem)]">{WEBINAR_SERIES.title}</h3>
        <p className="ed-deck mt-2 max-w-lg text-[14.5px]">{WEBINAR_SERIES.note}</p>
        <span className="mt-4 inline-flex items-center gap-1.5 text-[13.5px] font-medium text-ink transition-colors group-hover:text-ink-40">Watch the series <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
      </div>
    </a>
  )
}

/* ── shared pieces ── */

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`mono whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] uppercase tracking-[0.06em] transition-all duration-200 ${on ? "bg-ink text-paper" : "text-ink-40 hover:bg-ink-10 hover:text-ink"}`}>{children}</button>
  )
}

function Grid({ items }: { items: AnyVid[] }) {
  return (
    <div className="grid grid-cols-1 gap-x-7 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((v) => (
        <a key={v.id} href={v.url} target="_blank" rel="noopener noreferrer" data-vid className="group flex flex-col">
          <Frame v={v} />
          <h4 className="ed-title mt-3 line-clamp-2 min-h-[2.6em] text-[16px] transition-colors duration-200 group-hover:text-ink-40">{v.title}</h4>
        </a>
      ))}
    </div>
  )
}

/* photographic thumbnail in a quiet rounded frame — object-cover, a play glyph */
function Frame({ v, hero = false }: { v: AnyVid; hero?: boolean }) {
  return (
    <div className={`relative overflow-hidden bg-ink ${hero ? "rounded-[12px]" : "rounded-[10px]"}`}>
      <div className="aspect-video overflow-hidden">
        <img
          src={hero ? v.thumbHi : v.thumb}
          onError={(e) => { const t = e.currentTarget; if (t.src !== v.thumb) t.src = v.thumb }}
          alt={v.title} loading={hero ? "eager" : "lazy"}
          className="size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      </div>
      {hero ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-16 place-items-center rounded-full bg-paper/90 text-ink shadow-lg transition-transform duration-300 group-hover:scale-110"><PlayFilledAlt size={22} /></span>
        </span>
      ) : (
        <span className="absolute bottom-2.5 right-2.5 grid size-9 place-items-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity duration-300 group-hover:opacity-100"><PlayFilledAlt size={13} /></span>
      )}
    </div>
  )
}

function Separator({ label, to, aside }: { label: string; to?: { onClick: () => void; label: string }; aside?: string }) {
  return (
    <div className="mb-8 mt-16 flex items-center gap-4 md:mt-20">
      <span className="ed-eyebrow shrink-0">{label}</span>
      <span className="h-px flex-1 bg-line" />
      {aside && <span className="mono hidden shrink-0 whitespace-nowrap text-[10px] uppercase tracking-[0.13em] text-ink-40 sm:inline">{aside}</span>}
      {to && <button onClick={to.onClick} className="ul shrink-0 whitespace-nowrap text-[12.5px] text-ink-60 transition-colors hover:text-ink">{to.label}</button>}
    </div>
  )
}

function SkeletonReel() {
  return (
    <>
      <div className="grid grid-cols-12 items-center gap-8">
        <div className="col-span-12 md:col-span-8"><div className="aspect-video animate-pulse rounded-[12px] bg-ink-10" /></div>
        <div className="col-span-12 space-y-3 md:col-span-4">
          <div className="h-3 w-28 animate-pulse rounded bg-ink-10" />
          <div className="h-7 w-full animate-pulse rounded bg-ink-10" />
          <div className="h-7 w-3/4 animate-pulse rounded bg-ink-10" />
        </div>
      </div>
      <div className="mt-16 flex gap-5 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-[300px] shrink-0">
            <div className="aspect-video animate-pulse rounded-[10px] bg-ink-10" />
            <div className="mt-3 h-4 w-full animate-pulse rounded bg-ink-10" />
          </div>
        ))}
      </div>
    </>
  )
}
