// Resources — a live, premium career-guidance feed for clients. The blog library
// is imported live from the marketing site's /api/blog importer (CORS-open) so new
// posts appear automatically. Every post now opens our ON-SITE reader — never the
// old setmycareer.com website. This page is the seed for a wider resources hub
// (colleges, degrees, courses) — those arrive next.

import { useEffect, useMemo, useState, type ReactNode, type CSSProperties } from "react"
import { Newspaper, Search, ArrowUpRight, GraduationCap, BookOpen, Compass, Layers } from "lucide-react"

// Where the live feed lives. Repoint to setmycareer.com/api once the marketing
// site moves to the brand domain. [CONFIRM domain before launch]
const FEED = "https://site-madhavs-projects-56d7586e.vercel.app/api/blog"
// The marketing-site origin (its NEW on-site reader). Post links resolve to
// `${SITE_ORIGIN}/blog/${slug}` — this is the new reader, NOT the old website.
const SITE_ORIGIN = FEED.replace(/\/api\/blog$/, "")

// Editorial serif for mastheads, titles and the category label. Source Serif 4 is
// loaded in counselor/index.html; body copy stays on the portal's sans.
const serif: CSSProperties = { fontFamily: '"Source Serif 4", Georgia, serif' }

type Art = { image: string; title: string; artist: string; year: string }
type Post = {
  title: string; description: string; image: string; author: string
  date: string; url: string; slug: string; category: string; tags: string[]; ts: number; art?: Art
}
const artCaption = (a?: Art) => (!a ? "" : `${a.artist} · ${a.title}${a.year ? `, ${a.year}` : ""}`)
const cover = (p: Post) => p.art?.image || p.image
const postHref = (p: Post) => `${SITE_ORIGIN}/blog/${p.slug}`

const CAT_LABEL: Record<string, string> = {
  "career-guidance": "Career Guidance", "career-assessments": "Assessments",
  "career-transition": "Career Change", "job-search": "Job Search",
  "professional-development": "Professional Growth", "psychology-counselling": "Wellbeing",
  "admission-assistance": "Admissions", "educational-opportunities": "Education",
  "work-life-balance": "Work–Life",
}
const catLabel = (k: string) => CAT_LABEL[k] || k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
const CAT_ORDER = ["career-guidance", "career-assessments", "career-transition", "professional-development", "job-search", "admission-assistance", "educational-opportunities", "psychology-counselling", "work-life-balance"]
const fmtTs = (ts: number) => (ts ? new Date(ts).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "")

const COMING = [
  { icon: Newspaper, label: "Field Notes", live: true },
  { icon: GraduationCap, label: "Colleges", live: false },
  { icon: BookOpen, label: "Degrees", live: false },
  { icon: Layers, label: "Courses", live: false },
  { icon: Compass, label: "Careers", live: false },
]

export function PortalResources() {
  const [posts, setPosts] = useState<Post[]>([])
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  const [cat, setCat] = useState("all")
  const [q, setQ] = useState("")
  const [limit, setLimit] = useState(15)

  useEffect(() => {
    let alive = true
    fetch(FEED).then((r) => r.json())
      .then((d: { posts?: Post[] }) => { if (alive) { setPosts(d.posts || []); setState("ready") } })
      .catch(() => { if (alive) setState("error") })
    return () => { alive = false }
  }, [])

  const cats = useMemo(() => {
    const present = new Set(posts.map((p) => p.tags[0] || p.category))
    return CAT_ORDER.filter((c) => present.has(c))
  }, [posts])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return posts.filter((p) => {
      const c = p.tags[0] || p.category
      return (cat === "all" || c === cat) && (!query || p.title.toLowerCase().includes(query) || p.description.toLowerCase().includes(query))
    })
  }, [posts, cat, q])

  // Newest first, for the side-scroll rail of recent notes.
  const recent = useMemo(() => [...posts].sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 14), [posts])

  const browsing = cat !== "all" || q.trim() !== ""
  const featured = !browsing ? filtered[0] : null
  const rest = featured ? filtered.slice(1) : filtered
  const shown = rest.slice(0, limit)
  const rail = featured ? recent.filter((p) => p.slug !== featured.slug) : recent

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* masthead */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Newspaper className="size-4" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">Field Notes</span>
          </div>
          <h1 className="mt-3 text-[34px] font-medium leading-[1.05] tracking-tight text-foreground md:text-[44px]" style={serif}>
            Field Notes <span className="italic text-muted-foreground">&amp; guides</span>
          </h1>
          <p className="mt-3 max-w-xl text-[14.5px] leading-relaxed text-muted-foreground" style={serif}>
            Career guidance, assessments, the job market and study choices — updated live from our editorial desk.
          </p>
        </div>
        {state !== "error" && (
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground">
            {state === "loading" ? "Loading…" : <><span className="size-1.5 rounded-full bg-brand-600" />Live</>}
          </span>
        )}
      </div>

      {/* what's here / what's coming */}
      <div className="mt-7 flex flex-wrap gap-2">
        {COMING.map((c) => (
          <span key={c.label} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium ${c.live ? "border-brand-600/30 bg-brand-600/5 text-brand-600" : "border-border text-muted-foreground"}`}>
            <c.icon className="size-3.5" />{c.label}
            {c.live ? <span className="ml-0.5 size-1.5 rounded-full bg-brand-600" /> : <span className="ml-0.5 text-[10px] uppercase tracking-wide opacity-70">soon</span>}
          </span>
        ))}
      </div>

      {/* recent notes — side-scroll rail */}
      {!browsing && state === "ready" && rail.length > 0 && (
        <div className="mt-9">
          <div className="mb-4 flex items-center gap-3">
            <span className="text-[13px] italic text-muted-foreground" style={serif}>Latest notes</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="-mx-4 flex snap-x gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:-mx-6 sm:px-6">
            {rail.map((p) => <RailCard key={p.slug} p={p} />)}
          </div>
        </div>
      )}

      {/* controls */}
      <div className="mt-8 flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5">
          <Pill on={cat === "all"} onClick={() => { setCat("all"); setLimit(15) }}>All</Pill>
          {cats.map((c) => <Pill key={c} on={cat === c} onClick={() => { setCat(c); setLimit(15) }}>{catLabel(c)}</Pill>)}
        </div>
        <label className="flex min-w-[200px] items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-muted-foreground focus-within:border-brand-600">
          <Search className="size-4 shrink-0" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(15) }} placeholder="Search resources" className="w-full bg-transparent text-[13.5px] text-foreground outline-none placeholder:text-muted-foreground" />
        </label>
      </div>

      {/* featured */}
      {featured && (
        <a href={postHref(featured)} target="_blank" rel="noopener noreferrer" className="group mt-8 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
          <div>
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary" title={featured.art ? artCaption(featured.art) : undefined}>
              <div className="flex aspect-[16/9] items-center justify-center p-[6%]">
                <img src={cover(featured)} alt={featured.title} className="max-h-full max-w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.02]" />
              </div>
            </div>
          </div>
          <div>
            <Meta cat={featured.tags[0] || featured.category} ts={featured.ts} />
            <h2 className="mt-3 text-[26px] font-medium leading-snug tracking-tight text-foreground group-hover:text-brand-600 md:text-[30px]" style={serif}>{featured.title}</h2>
            <p className="mt-2.5 line-clamp-3 text-[14.5px] leading-relaxed text-muted-foreground">{featured.description}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600">Read the note <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
          </div>
        </a>
      )}

      {/* grid */}
      <div className="mt-10">
        {state === "loading" ? (
          <SkeletonGrid />
        ) : state === "error" ? (
          <p className="py-16 text-center text-[13.5px] text-muted-foreground">Couldn't load resources right now. Please try again shortly.</p>
        ) : shown.length === 0 ? (
          <p className="py-16 text-center text-[13.5px] text-muted-foreground">Nothing matches that yet. Try another topic.</p>
        ) : (
          <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((p) => <Card key={p.slug} p={p} />)}
          </div>
        )}
        {shown.length < rest.length && (
          <div className="mt-12 flex justify-center">
            <button onClick={() => setLimit((n) => n + 15)} className="rounded-full border border-border px-5 py-2.5 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary">Load more</button>
          </div>
        )}
      </div>
    </div>
  )
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors ${on ? "bg-foreground text-background" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>{children}</button>
  )
}

// Category label: italic serif, muted — no coloured tag, no dot.
function Meta({ cat, ts }: { cat: string; ts: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[13px] italic text-muted-foreground" style={serif}>{catLabel(cat)}</span>
      {ts ? <span className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-muted-foreground/80">{fmtTs(ts)}</span> : null}
    </div>
  )
}

function RailCard({ p }: { p: Post }) {
  return (
    <a href={postHref(p)} target="_blank" rel="noopener noreferrer" className="group flex w-[248px] shrink-0 snap-start flex-col">
      <div className="overflow-hidden rounded-xl border border-border bg-secondary" title={p.art ? artCaption(p.art) : undefined}>
        <div className="flex aspect-[4/3] items-center justify-center p-[7%]">
          <img src={cover(p)} alt={p.title} loading="lazy" className="max-h-full max-w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]" />
        </div>
      </div>
      <span className="mt-2.5 text-[12.5px] italic text-muted-foreground" style={serif}>{catLabel(p.tags[0] || p.category)}</span>
      <h4 className="mt-1 line-clamp-2 text-[15px] font-medium leading-snug text-foreground transition-colors group-hover:text-brand-600" style={serif}>{p.title}</h4>
    </a>
  )
}

function Card({ p }: { p: Post }) {
  return (
    <a href={postHref(p)} target="_blank" rel="noopener noreferrer" className="group flex flex-col">
      <div className="overflow-hidden rounded-xl border border-border bg-secondary" title={p.art ? artCaption(p.art) : undefined}>
        <div className="flex aspect-square items-center justify-center p-[9%]">
          <img src={cover(p)} alt={p.title} loading="lazy" className="max-h-full max-w-full object-contain transition-transform duration-[900ms] ease-out group-hover:scale-[1.03]" />
        </div>
      </div>
      <div className="mt-3 flex flex-1 flex-col">
        <Meta cat={p.tags[0] || p.category} ts={p.ts} />
        <h3 className="mt-2 line-clamp-2 text-[17px] font-medium leading-snug tracking-tight text-foreground transition-colors group-hover:text-brand-600" style={serif}>{p.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{p.description}</p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="truncate text-[11.5px] font-medium text-muted-foreground">{p.author}</span>
          <span className="inline-flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-muted-foreground transition-colors group-hover:text-brand-600">Read the note <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" /></span>
        </div>
      </div>
    </a>
  )
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col">
          <div className="aspect-[16/10] animate-pulse rounded-xl bg-secondary" />
          <div className="mt-3.5 h-3 w-24 animate-pulse rounded bg-secondary" />
          <div className="mt-2.5 h-4 w-full animate-pulse rounded bg-secondary" />
          <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-secondary" />
        </div>
      ))}
    </div>
  )
}
