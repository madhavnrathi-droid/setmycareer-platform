import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight, ArrowLeft, PlayFilledAlt } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { Spark, lpa } from "@/components/terminal/parts"
import { featuredCareers } from "@/lib/careers-link"
import type { Row } from "@/content/careers-all"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { useLivePosts, buildFeed, catLabel, artCaption, type FeedItem } from "@/lib/feed"
import { VideoBento } from "@/components/VideoBento"

/* Resources — the working library, opened as an issue. A fashion-magazine reading
   room: masthead + numbered index, then the films (live /api/videos), the Field
   Notes library (live /api/blog, the biggest surface), the Career Terminal (live
   career data, cross-referenced with the notes), the e-book (gated by a lead form
   that forwards into the team's FormTracker pipeline), and events. Bodoni + News-
   reader serif, monochrome ink-on-paper, side-scroll rails throughout. */

type Video = { id: string; title: string; published: string; views: number; thumb: string; thumbHi: string; url: string }

const INDEX = [
  { no: "01", label: "Watch", to: "#videos" },
  { no: "02", label: "Read", to: "#notes" },
  { no: "03", label: "Careers", to: "#careers" },
  { no: "04", label: "The e-book", to: "#ebook" },
  { no: "05", label: "Events", to: "#events" },
]

const fmtDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")
const fmtTs = (ts: number) => (ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "")
const fmtViews = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k views` : n > 0 ? `${n} views` : "")

export function Resources() {
  const ref = useReveals()
  useSeo({
    title: "Resources — Videos, Field Notes & the E-book | SetMyCareer",
    description: "SetMyCareer's working library — expert videos from the channel, the live Field Notes blog, the 13 Career-Success Strategies e-book, the live Career Terminal, and events.",
    path: "/resources",
  })

  return (
    <main ref={ref} className="pt-28">
      {/* ── masthead + index ── */}
      <header className="wrap pb-14 pt-10 md:pb-20">
        <Kicker>Resources</Kicker>
        <SplitReveal as="h1" className="h-xl mt-6 max-w-[14ch]">The <span className="b">library</span>.</SplitReveal>
        <p data-reveal className="ed-deck mt-7 max-w-xl text-[clamp(1.1rem,1.7vw,1.35rem)]">Everything the practice publishes, gathered as one issue — the films, the field notes, the career data underneath them, and the e-book.</p>
        <nav data-reveal className="mt-10 flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-6">
          {INDEX.map((s) => (
            <a key={s.no} href={s.to} className="group/ix flex items-baseline gap-2.5">
              <span className="mono text-[10.5px] text-ink-40">{s.no}</span>
              <span className="ed-title text-[16px] text-ink-60 transition-colors group-hover/ix:text-ink">{s.label}</span>
            </a>
          ))}
        </nav>
      </header>

      <Videos />
      <Notes />
      <Careers />
      <Ebook />
      <Events />
    </main>
  )
}

/* ── 01 · Watch — the films, straight from the channel ─────────────────────── */
function Videos() {
  const [videos, setVideos] = useState<Video[]>([])
  const [channel, setChannel] = useState("https://www.youtube.com/channel/UCrPxXwRZDEDrBT4TFPnSvqQ")
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  useEffect(() => {
    let alive = true
    fetch("/api/videos").then((r) => r.json())
      .then((d: { videos?: Video[]; channel?: string }) => { if (!alive) return; setVideos(d.videos || []); if (d.channel) setChannel(d.channel); setState(d.videos?.length ? "ready" : "error") })
      .catch(() => { if (alive) setState("error") })
    return () => { alive = false }
  }, [])
  const featured = videos[0]
  const rest = videos.slice(1)

  return (
    <section id="videos" className="hair-t bg-paper-pure">
      <div className="wrap py-16 md:py-24">
        <SectionHead no="01" title="Watch" sub="Experts, alumni and Dr. Rathi — straight from the SetMyCareer channel, updated as we upload." cta={{ label: "The full film index", to: "/resources/videos" }} />

        {state === "loading" ? (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="aspect-video animate-pulse rounded-[12px] bg-ink-10" />
            <div className="grid grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="aspect-video animate-pulse rounded-[10px] bg-ink-10" />)}</div>
          </div>
        ) : state === "error" ? (
          <a href={channel} target="_blank" rel="noopener noreferrer" className="group mt-10 flex items-center justify-between gap-6 border-t border-line py-8">
            <span className="ed-deck text-[15px]">The channel is live on YouTube — sessions, expert talks and success stories.</span>
            <span className="ul flex shrink-0 items-center gap-1.5 text-[13.5px] text-ink">Open the channel <ArrowUpRight size={15} /></span>
          </a>
        ) : (
          <>
            {featured && (
              <a href={featured.url} target="_blank" rel="noopener noreferrer" className="group mt-12 grid grid-cols-12 items-center gap-8">
                <div className="relative col-span-12 overflow-hidden rounded-[12px] bg-ink md:col-span-8">
                  <div className="aspect-video overflow-hidden">
                    <img src={featured.thumbHi} onError={(e) => { const t = e.currentTarget; if (t.src !== featured.thumb) t.src = featured.thumb }} alt={featured.title} className="size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none" />
                  </div>
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid size-16 place-items-center rounded-full bg-paper/90 text-ink shadow-lg transition-transform duration-300 group-hover:scale-110"><PlayFilledAlt size={22} /></span>
                  </span>
                </div>
                <div className="col-span-12 md:col-span-4">
                  <p className="ed-label text-[13px]">Film · {fmtDate(featured.published)}{featured.views ? ` · ${fmtViews(featured.views)}` : ""}</p>
                  <h3 className="ed-title-xl mt-3 line-clamp-3 text-[clamp(1.5rem,2.6vw,2.1rem)]">{featured.title}</h3>
                  <span className="mt-5 inline-flex items-center gap-1.5 text-[13.5px] text-ink transition-colors group-hover:text-ink-40">Watch now <ArrowUpRight size={15} className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
                </div>
              </a>
            )}

            {/* the bento — a dynamic mosaic of the channel, not a scroll-rail */}
            {rest.length > 0 && (
              <div className="mt-12">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <p className="mono text-[10.5px] uppercase tracking-[0.13em] text-ink-40">More from the channel</p>
                  <a href={channel} target="_blank" rel="noopener noreferrer" className="ul whitespace-nowrap text-[12.5px] text-ink-60 transition-colors hover:text-ink">On YouTube ↗</a>
                </div>
                <VideoBento videos={rest} max={7} />
              </div>
            )}
          </>
        )}
      </div>
    </section>
  )
}

/* ── 02 · Read — the Field Notes library, opened up ────────────────────────── */
function Notes() {
  const { posts } = useLivePosts()
  const items = useMemo(() => buildFeed(posts), [posts])
  const { ref: rail, by } = useRailScroll()
  const feature = items[0]
  const medium = items.slice(1, 3)
  const trio = items.slice(3, 6)
  const railItems = items.slice(6, 14)
  const list = items.slice(14, 20)
  const st = (it: FeedItem) => ({ art: it.art, category: it.category, author: it.author, ts: it.ts, readMin: it.readMin, dek: it.dek })

  return (
    <section id="notes" className="hair-t">
      <div className="wrap py-16 md:py-24">
        <SectionHead no="02" title={<>Field <em>notes</em></>} sub="The working library — essays, guides and the job market, kept live. The long read of the practice." cta={{ label: "All field notes", to: "/blog" }} />

        {/* large feature + two medium */}
        <div className="mt-12 grid gap-x-10 gap-y-12 lg:grid-cols-12">
          {feature && (
            <Link to={feature.href} state={st(feature)} className="group flex flex-col lg:col-span-7">
              <Plate item={feature} aspect="aspect-[3/2]" eager />
              <p className="ed-label mt-5 text-[13px]">{catLabel(feature.category)}</p>
              <h3 className="ed-title-xl mt-2 text-[clamp(1.7rem,3vw,2.5rem)]">{feature.title}</h3>
              <p className="ed-deck mt-3 line-clamp-3 max-w-xl text-[16px]">{feature.dek}</p>
              <p className="mono mt-4 text-[11px] text-ink-40">{[fmtTs(feature.ts), feature.readMin ? `${feature.readMin} min` : ""].filter(Boolean).join(" · ")}</p>
            </Link>
          )}
          <div className="grid content-start gap-y-10 lg:col-span-5">
            {medium.map((it) => (
              <Link key={it.id} to={it.href} state={st(it)} className="group grid grid-cols-12 items-center gap-5">
                <div className="col-span-5 sm:col-span-4 lg:col-span-5"><Plate item={it} aspect="aspect-[4/5]" /></div>
                <div className="col-span-7 sm:col-span-8 lg:col-span-7 flex flex-col justify-center">
                  <p className="ed-label text-[12.5px]">{catLabel(it.category)}</p>
                  <h4 className="ed-title mt-1.5 line-clamp-3 text-[clamp(1.05rem,1.6vw,1.3rem)]">{it.title}</h4>
                  <p className="mono mt-2 text-[11px] text-ink-40">{fmtTs(it.ts)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* an editorial trio — three bigger plates, art doing the talking */}
        {trio.length > 0 && (
          <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-3">
            {trio.map((it) => (
              <Link key={it.id} to={it.href} state={st(it)} className="group flex flex-col">
                <Plate item={it} aspect="aspect-[4/5]" />
                <p className="ed-label mt-4 text-[12.5px]">{catLabel(it.category)}</p>
                <h4 className="ed-title mt-1.5 line-clamp-3 text-[clamp(1.1rem,1.7vw,1.35rem)]">{it.title}</h4>
                <p className="mono mt-2 text-[11px] text-ink-40">{fmtTs(it.ts)}</p>
              </Link>
            ))}
          </div>
        )}

        {/* side-scroll rail of more notes — bigger tiles */}
        {railItems.length > 0 && (
          <div className="mt-16">
            <RailHead hint="More field notes — scroll →" by={by} />
            <div ref={rail} className="no-bar -mx-1 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pb-3">
              {railItems.map((it) => (
                <Link key={it.id} to={it.href} state={st(it)} className="group w-[250px] shrink-0 snap-start sm:w-[290px]">
                  <Plate item={it} aspect="aspect-[4/5]" />
                  <p className="ed-label mt-3 text-[12px]">{catLabel(it.category)}</p>
                  <h4 className="ed-title mt-1 line-clamp-3 min-h-[3.4em] text-[16px]">{it.title}</h4>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* compact text list — no thumbnails, just titles + datelines */}
        {list.length > 0 && (
          <div className="mt-16">
            <p className="ed-eyebrow mb-2">More in the library</p>
            <div className="border-t border-line">
              {list.map((it) => (
                <Link key={it.id} to={it.href} state={st(it)} className="group flex items-baseline justify-between gap-6 border-b border-line py-4">
                  <span className="ed-title min-w-0 flex-1 truncate text-[16px] text-ink transition-colors group-hover:text-ink-40">{it.title}</span>
                  <span className="mono shrink-0 text-[11px] text-ink-40">{fmtTs(it.ts)}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ── 03 · Careers — the Career Terminal, cross-referenced with the notes ────── */
function Careers() {
  const careers = useMemo(() => featuredCareers(12), [])
  const { ref: rail, by } = useRailScroll()
  return (
    <section id="careers" className="hair-t bg-paper-pure">
      <div className="wrap py-16 md:py-24">
        <SectionHead no="03" title={<>The career <em>terminal</em></>} sub="Not articles — instruments. Live demand, pay and AI-exposure for the careers the field notes keep pointing at — cross-referenced, both ways." />

        <div className="mt-12">
          <RailHead hint="Rising careers — scroll →" by={by} />
          <div ref={rail} className="no-bar -mx-1 flex snap-x snap-mandatory gap-5 overflow-x-auto px-1 pb-3">
            {careers.map((c) => <CareerCard key={c.id} c={c} />)}
          </div>
        </div>

        <div data-reveal className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-line pt-6">
          <Link to="/library" className="ul flex items-center gap-1.5 text-[13.5px] text-ink-60 transition-colors hover:text-ink">Open the full terminal <ArrowRight size={15} /></Link>
          <Link to="/experts" className="ul flex items-center gap-1.5 text-[13.5px] text-ink-60 transition-colors hover:text-ink">Meet the counsellor network <ArrowRight size={15} /></Link>
        </div>
      </div>
    </section>
  )
}

/* a single career card — ticker, name, cluster, its demand sparkline (the one
   place a trajectory colour is allowed on these editorial surfaces) and pay */
function CareerCard({ c }: { c: Row }) {
  return (
    <Link to={`/library/${c.id}`} className="group flex w-[220px] shrink-0 snap-start flex-col rounded-[10px] border border-line bg-paper p-5 transition-colors hover:bg-paper-pure sm:w-[240px]">
      <p className="mono text-[10.5px] tracking-[0.06em] text-ink-40">{c.ticker}</p>
      <h3 className="ed-title mt-1.5 line-clamp-2 min-h-[2.3em] text-[17px] leading-[1.12]">{c.name}</h3>
      <p className="ed-label mt-1 line-clamp-1 text-[12px]">{c.cluster}</p>
      <div className="mt-4"><Spark data={c.demandTrend} h={34} area className="w-full" /></div>
      <p className="mono mt-3 text-[12px] text-ink-60">{lpa(c.payLo, c.payHi)}</p>
    </Link>
  )
}

/* ── 04 · The e-book — gated by the lead form, delivered by the team ────────── */
function Ebook() {
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", age: "" })
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value })
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(""); setBusy(true)
    try {
      const r = await fetch("/api/ebook", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f) })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error || "That didn't go through — try again.")
      setDone(true)
    } catch (ex) { setErr(ex instanceof Error ? ex.message : "That didn't go through — try again.") }
    setBusy(false)
  }
  const field = "w-full border-b border-line bg-transparent py-2.5 text-[14.5px] outline-none transition-colors placeholder:text-ink-40 focus:border-ink"
  return (
    <section id="ebook" className="hair-t">
      <div className="wrap py-16 md:py-24">
        <SectionHead no="04" title={<>The <em>e-book</em></>} sub="Dr. Rathi's playbook — forty years of career counselling, distilled." />
        <div className="mt-12 grid gap-12 md:grid-cols-2">
          {/* typographic cover — an avant-garde text object, no stock imagery */}
          <div data-reveal className="relative flex flex-col justify-between overflow-hidden rounded-[12px] bg-ink p-8 text-paper md:min-h-[380px]">
            <p className="mono text-[10.5px] uppercase tracking-[0.16em] text-paper/50">E-book · free</p>
            <div className="py-10">
              <p className="ed-display text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.04]">13 Career-Success<br /><span className="b">Strategies</span></p>
              <p className="mono mt-5 text-[11px] uppercase tracking-[0.13em] text-paper/60">Dr. Nandkishore Rathi · SetMyCareer</p>
            </div>
            <p className="max-w-sm text-[13px] leading-relaxed text-paper/60">The habits, decisions and course-corrections behind 970+ successful placements — for students and professionals deciding what's next.</p>
          </div>

          {/* the gate */}
          <div data-reveal>
            {done ? (
              <div className="flex h-full flex-col justify-center">
                <p className="ed-title-xl text-[26px]">Request received.</p>
                <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-60">Your copy of <b className="text-ink">13 Career-Success Strategies</b> is on its way to <b className="text-ink">{f.email}</b> — check your inbox (and spam folder) in the next few minutes.</p>
                <Link to="/blog" className="btn mt-7 self-start"><span>Read the field notes meanwhile</span> <ArrowRight size={15} className="btn-arrow" /></Link>
              </div>
            ) : (
              <form onSubmit={submit} className="flex h-full flex-col justify-center gap-5">
                <div className="grid gap-5 sm:grid-cols-2">
                  <input value={f.name} onChange={set("name")} placeholder="Full name" required className={field} autoComplete="name" />
                  <input value={f.email} onChange={set("email")} type="email" placeholder="Email" required className={field} autoComplete="email" />
                  <input value={f.city} onChange={set("city")} placeholder="City" required className={field} autoComplete="address-level2" />
                  <select value={f.age} onChange={set("age")} required className={`${field} appearance-none ${f.age ? "" : "text-ink-40"}`}>
                    <option value="" disabled>Age group</option>
                    {["13–15", "16–18", "19–22", "23–30", "31–45", "45+"].map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <input value={f.phone} onChange={set("phone")} placeholder="Phone (optional)" className={`${field} sm:col-span-2`} autoComplete="tel" inputMode="tel" />
                </div>
                {err && <p className="text-[12.5px] text-red-600">{err}</p>}
                <button type="submit" disabled={busy} className="btn btn--solid self-start disabled:opacity-60"><span>{busy ? "Sending…" : "Send me the e-book"}</span> <ArrowRight size={15} className="btn-arrow" /></button>
                <p className="max-w-md text-[11px] leading-relaxed text-ink-40">We use these details to send your copy and follow up once, per our <Link to="/legal/privacy-policy" className="ul">Privacy Policy</Link>. Under 18? Ask a parent or guardian to request it for you.</p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── 05 · Events — webinars, gatherings, the gallery ───────────────────────── */
function Events() {
  const rows: { tag: string; label: string; sub: string; to?: string; href?: string }[] = [
    { tag: "Watch", label: "Webinars & the series", sub: "The webinar series and every recorded session — watched here, in the film library.", to: "/resources/videos" },
    { tag: "Register", label: "Get notified about the next one", sub: "Leave your details and we'll tell you when the next live session is on.", to: "/contact" },
    { tag: "Archive", label: "Gallery", sub: "Workshops, school programmes and campus visits, in pictures.", href: "https://setmycareer.com/gallery.php" },
    { tag: "Channel", label: "The channel", sub: "Every talk and story, as it's uploaded.", href: "https://www.youtube.com/channel/UCrPxXwRZDEDrBT4TFPnSvqQ" },
  ]
  const cls = "group flex items-center gap-6 border-t border-line py-6 last:border-b"
  const inner = (r: (typeof rows)[number], ext: boolean) => (
    <>
      <div className="min-w-0 flex-1">
        <p className="ed-label text-[12px]">{r.tag}</p>
        <p className="ed-title mt-1 text-[19px] transition-colors group-hover:text-ink-40">{r.label}</p>
        <p className="ed-deck mt-1 truncate text-[13.5px]">{r.sub}</p>
      </div>
      {ext
        ? <ArrowUpRight size={17} className="shrink-0 text-ink-40 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        : <ArrowRight size={17} className="shrink-0 text-ink-40 transition-transform duration-200 group-hover:translate-x-0.5" />}
    </>
  )
  return (
    <section id="events" className="hair-t bg-paper-pure">
      <div className="wrap py-16 md:py-24">
        <SectionHead no="05" title="Events" sub="Where the work happens — the webinars, the archive, and how to catch the next one." />
        <div data-reveal className="mt-10">
          {rows.map((r) => r.to
            ? <Link key={r.label} to={r.to} className={cls}>{inner(r, false)}</Link>
            : <a key={r.label} href={r.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner(r, true)}</a>,
          )}
        </div>
      </div>
    </section>
  )
}

/* ── shared pieces ─────────────────────────────────────────────────────────── */

/* section head — serif number + title (ed-title-xl), ed-deck sub, optional link */
function SectionHead({ no, title, sub, cta }: { no: string; title: ReactNode; sub: string; cta?: { label: string; to?: string; href?: string } }) {
  return (
    <div data-reveal className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
      <div className="max-w-2xl">
        <div className="flex items-center gap-3">
          <span className="mono text-[11px] tracking-[0.18em] text-ink-40">{no}</span>
          <span className="h-px w-10 bg-line" />
        </div>
        <h2 className="ed-title-xl mt-4 text-[clamp(2rem,4.4vw,3.1rem)]">{title}</h2>
        <p className="ed-deck mt-3 text-[clamp(1rem,1.5vw,1.18rem)]">{sub}</p>
      </div>
      {cta && (cta.to
        ? <Link to={cta.to} className="ul flex shrink-0 items-center gap-1.5 text-[13.5px] text-ink-60 transition-colors hover:text-ink">{cta.label} <ArrowRight size={15} /></Link>
        : <a href={cta.href} target="_blank" rel="noopener noreferrer" className="ul flex shrink-0 items-center gap-1.5 text-[13.5px] text-ink-60 transition-colors hover:text-ink">{cta.label} <ArrowUpRight size={15} /></a>)}
    </div>
  )
}

/* the plate — the artwork filling its frame, big and full-bleed (a magazine
   image, not a floated thumbnail); the piece's provenance rides the native
   tooltip. A hairline frame + the editorial desaturate keep it on-brand. */
function Plate({ item, aspect, eager }: { item: FeedItem; aspect: string; eager?: boolean }) {
  return (
    <div
      className={`overflow-hidden rounded-[10px] border border-line bg-ink-10 ${aspect}`}
      title={item.art ? `${artCaption(item.art)} · public domain` : undefined}
    >
      <img
        src={item.image} alt={item.title} loading={eager ? "eager" : "lazy"}
        className="edit-img size-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
      />
    </div>
  )
}

/* a horizontal overflow rail with a hint + arrow controls */
function useRailScroll() {
  const ref = useRef<HTMLDivElement>(null)
  const by = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth * 0.8), behavior: "smooth" })
  return { ref, by }
}

function RailHead({ hint, by, aside }: { hint: string; by: (dir: 1 | -1) => void; aside?: ReactNode }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4">
      <p className="mono text-[10.5px] uppercase tracking-[0.13em] text-ink-40">{hint}</p>
      <div className="flex items-center gap-4">
        {aside}
        <div className="hidden gap-2 md:flex">
          <button onClick={() => by(-1)} aria-label="Scroll back" className="grid size-9 place-items-center rounded-full border border-line text-ink-60 transition-colors hover:border-ink hover:text-ink"><ArrowLeft size={15} /></button>
          <button onClick={() => by(1)} aria-label="Scroll forward" className="grid size-9 place-items-center rounded-full border border-line text-ink-60 transition-colors hover:border-ink hover:text-ink"><ArrowRight size={15} /></button>
        </div>
      </div>
    </div>
  )
}
