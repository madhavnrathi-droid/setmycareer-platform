import { useEffect, useMemo, useState } from "react"
import { Link, useLocation, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight } from "@carbon/icons-react"
import { articleBySlug, ARTICLES } from "@/content/site"
import { artFor, type Art } from "@/lib/art"
import { editorialTitle } from "@/lib/title"
import { MarkdownLite, Magnetic } from "@/components/bits"
import { PORTAL_URL } from "@/lib/api"
import { useReveals } from "@/lib/motion"
import { useSeo, SITE_URL } from "@/lib/seo"
import { useLivePosts, buildFeed, catLabel, type FeedItem } from "@/lib/feed"
import { careersForCategory } from "@/lib/careers-link"
import { Spark, lpa } from "@/components/terminal/parts"

/* The reader. Two modes, one editorial voice:
   — ORIGINALS (our eight essays) render from local content as before.
   — LIVE posts (the ~236 published pieces) are fetched through /api/post, which
     extracts the article body server-side — so every post reads HERE, in this
     type system, with its artwork credited in place. No redirects to the old
     website, ever. */

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })
const fmtTs = (ts?: number) => (ts ? new Date(ts).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "")

export function BlogPost() {
  const { slug } = useParams()
  const a = slug ? articleBySlug(slug) : undefined
  return a ? <OriginalPost slug={slug!} /> : <LivePost slug={slug ?? ""} />
}

/* ── shared pieces ─────────────────────────────────────────────────────────── */

function ArtHero({ art, alt }: { art: Art; alt: string }) {
  return (
    <figure className="mx-auto mt-12 max-w-5xl">
      <div className="flex aspect-[16/8] items-center justify-center overflow-hidden rounded-[12px] border border-line bg-ink-10 p-[5%]">
        <img src={art.image} alt={alt} className="max-h-full max-w-full object-contain" />
      </div>
      <figcaption className="mono mt-3 text-[10.5px] uppercase tracking-[0.1em] text-ink-40">
        {art.artist} · {art.title}{art.year ? `, ${art.year}` : ""} — public domain (Wikimedia Commons)
      </figcaption>
    </figure>
  )
}

function ContinueReading({ current }: { current: string }) {
  const { posts } = useLivePosts()
  const picks = useMemo(() => {
    const feed = buildFeed(posts).filter((f) => !f.href.endsWith(`/${current}`))
    return feed.slice(0, 3)
  }, [posts, current])
  if (!picks.length) return null
  return (
    <section className="hair-t mt-24 bg-paper-pure">
      <div className="wrap py-14">
        <p className="ed-eyebrow">Continue reading</p>
        <div className="mt-6 grid gap-x-7 gap-y-8 sm:grid-cols-3">
          {picks.map((it: FeedItem) => (
            <Link key={it.id} to={it.href} state={{ art: it.art, category: it.category, author: it.author, ts: it.ts, readMin: it.readMin, dek: it.dek }} className="group">
              <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-[10px] border border-line bg-ink-10 p-[8%]">
                <img src={it.image} alt={it.title} loading="lazy" className="edit-img max-h-full max-w-full object-contain transition-transform duration-700 group-hover:scale-[1.03]" />
              </div>
              <h4 className="ed-title mt-3 line-clamp-2 text-[16px] transition-colors group-hover:text-ink-40">{it.title}</h4>
              <p className="ed-label mt-1.5 text-[12.5px]">{catLabel(it.category)}{it.ts ? ` · ${fmtTs(it.ts)}` : ""}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* the bridge into the Career Terminal — the careers a note is really about */
function CareersInField({ category, seed }: { category: string; seed: string }) {
  const rows = careersForCategory(category, 3, seed)
  if (!rows.length) return null
  return (
    <div className="mt-14 border-t border-line pt-9">
      <p className="ed-eyebrow">Careers in this field</p>
      <div className="mt-4">
        {rows.map((row) => (
          <Link key={row.id} to={`/library/${row.id}`} className="group flex items-center justify-between gap-4 border-b border-line py-4">
            <div className="min-w-0">
              <p className="ed-title text-[16px] transition-colors group-hover:text-ink-40">{row.name}</p>
              <p className="ed-label text-[12.5px]">{row.cluster}</p>
            </div>
            <div className="flex shrink-0 items-center gap-4">
              <Spark data={row.demandTrend} w={92} h={26} area />
              <span className="mono w-[62px] text-right text-[11px] tabular-nums text-ink-60">{lpa(row.payLo, row.payHi)}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

/* ── mode 1: our essays ────────────────────────────────────────────────────── */

function OriginalPost({ slug }: { slug: string }) {
  const ref = useReveals([slug])
  const a = articleBySlug(slug)!
  // titles are authored lowercase; normalise the same way the feed does so the
  // reader masthead reads properly (and matches the card it was opened from)
  const title = editorialTitle(a.title)
  useSeo({
    title: `${title} — SetMyCareer`,
    description: a.dek,
    path: `/blog/${slug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: a.dek,
      datePublished: a.date,
      dateModified: a.date,
      author: { "@type": /Rathi/.test(a.author) ? "Person" : "Organization", name: a.author },
      publisher: { "@type": "Organization", name: "SetMyCareer", "@id": "https://setmycareer.com/#organization" },
      mainEntityOfPage: `${SITE_URL}/blog/${a.slug}`,
      inLanguage: "en-IN",
      articleSection: a.category,
    },
  })
  const idx = ARTICLES.findIndex((x) => x.slug === a.slug)
  const next = ARTICLES[(idx + 1) % ARTICLES.length]
  const art = artFor(a.slug, "originals", a.title)

  return (
    <main ref={ref} className="pt-28">
      <article className="wrap">
        <Link to="/blog" className="ul inline-flex items-center gap-2 text-[13px] text-ink-60"><ArrowLeft size={16} /> Field notes</Link>
        <header className="mx-auto mt-10 max-w-3xl">
          <div className="flex items-center gap-4">
            <span className="ed-label text-[14px]">Essay</span>
            <span className="mono text-[11px] text-ink-40">{fmtDate(a.date)}</span>
            <span className="mono text-[11px] text-ink-40">{a.readMin} min read</span>
          </div>
          <h1 className="ed-display mt-5 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.0]">{title}</h1>
          <p className="ed-deck mt-6 text-[clamp(1.05rem,1.6vw,1.4rem)]">{a.dek}</p>
          <p className="mono mt-6 text-[11px] uppercase tracking-[0.1em] text-ink-40">By {a.author}</p>
        </header>

        <ArtHero art={art} alt={art.title} />

        <div className="mx-auto mt-14 max-w-2xl">
          <MarkdownLite body={a.body} />
          <figure className="my-12 border-y border-line py-8">
            <blockquote className="ed-quote text-[clamp(1.5rem,2.8vw,2.2rem)]">“{a.pullQuote}”</blockquote>
          </figure>
          <CareersInField category={a.category} seed={slug} />
          <div className="mt-14 flex flex-col items-start gap-5 border-t border-line pt-10">
            <p className="h-lg max-w-[18ch]">Ready to decide with <span className="b">evidence</span>?</p>
            <Magnetic href={PORTAL_URL}>Begin now</Magnetic>
          </div>
        </div>
      </article>

      <Link to={`/blog/${next.slug}`} className="group mt-24 block hair-t">
        <div className="wrap flex items-center justify-between py-12">
          <div>
            <span className="mono text-[11px] uppercase tracking-[0.12em] text-ink-40">Next</span>
            <p className="ed-title-xl mt-2 text-[clamp(1.4rem,3vw,2.4rem)]">{editorialTitle(next.title)}</p>
          </div>
          <ArrowRight size={28} className="shrink-0 text-ink-40 transition-transform group-hover:translate-x-2" />
        </div>
      </Link>
    </main>
  )
}

/* ── mode 2: the live library, read here ───────────────────────────────────── */

type LiveBlock = { t: "h2" | "h3" | "p" | "li" | "img"; text: string }
type LiveDoc = { title: string; description: string; heroImg: string; blocks: LiveBlock[]; error?: string }
type LinkState = { art?: Art; category?: string; author?: string; ts?: number; readMin?: number; dek?: string } | null

function LivePost({ slug }: { slug: string }) {
  const ref = useReveals([slug])
  const state = (useLocation().state ?? null) as LinkState
  const [doc, setDoc] = useState<LiveDoc | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    setDoc(null); setFailed(false)
    window.scrollTo(0, 0)
    fetch(`/api/post?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((d: LiveDoc) => { if (!alive) return; if (d?.blocks?.length || d?.title) setDoc(d); else setFailed(true) })
      .catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [slug])

  const category = state?.category || "career-guidance"
  const title = doc?.title ? editorialTitle(doc.title) : ""
  const art = state?.art || artFor(slug, category, title || slug)

  useSeo({
    title: title ? `${title} — SetMyCareer` : "Field Notes — SetMyCareer",
    description: doc?.description || state?.dek || "A field note from the SetMyCareer library.",
    path: `/blog/${slug}`,
    jsonLd: title ? {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: title,
      description: doc?.description || "",
      author: { "@type": "Organization", name: state?.author || "SetMyCareer" },
      publisher: { "@type": "Organization", name: "SetMyCareer", "@id": "https://setmycareer.com/#organization" },
      mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
      inLanguage: "en-IN",
      articleSection: catLabel(category),
    } : null,
  })

  // group consecutive list items so bullets read as one list, not stray lines
  const grouped = useMemo(() => {
    if (!doc?.blocks) return []
    const out: ({ kind: "block"; b: LiveBlock } | { kind: "list"; items: string[] })[] = []
    for (const b of doc.blocks) {
      if (b.t === "li") {
        const last = out[out.length - 1]
        if (last?.kind === "list") last.items.push(b.text)
        else out.push({ kind: "list", items: [b.text] })
      } else out.push({ kind: "block", b })
    }
    return out
  }, [doc])

  return (
    <main ref={ref} className="pt-28">
      <article className="wrap">
        <Link to="/blog" className="ul inline-flex items-center gap-2 text-[13px] text-ink-60"><ArrowLeft size={16} /> Field notes</Link>

        {failed ? (
          <div className="mx-auto mt-24 max-w-xl pb-24 text-center">
            <p className="kicker text-ink-40">Unavailable</p>
            <p className="h-lg mt-3">That note couldn't be loaded just now.</p>
            <Link to="/blog" className="ul mt-6 inline-block text-[14px]">Back to the library</Link>
          </div>
        ) : !doc ? (
          <div className="mx-auto mt-12 max-w-3xl pb-24">
            <div className="h-4 w-40 animate-pulse rounded bg-ink-10" />
            <div className="mt-6 h-10 w-full animate-pulse rounded bg-ink-10" />
            <div className="mt-3 h-10 w-3/4 animate-pulse rounded bg-ink-10" />
            <div className="mt-10 aspect-[16/8] animate-pulse rounded-[12px] bg-ink-10" />
          </div>
        ) : (
          <>
            <header className="mx-auto mt-10 max-w-3xl">
              <div className="flex flex-wrap items-center gap-4">
                <span className="ed-label text-[14px]">{catLabel(category)}</span>
                {state?.ts ? <span className="mono text-[11px] text-ink-40">{fmtTs(state.ts)}</span> : null}
                {state?.readMin ? <span className="mono text-[11px] text-ink-40">{state.readMin} min read</span> : null}
              </div>
              <h1 className="ed-display mt-5 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.0]">{title}</h1>
              {doc.description && <p className="ed-deck mt-6 text-[clamp(1.05rem,1.6vw,1.4rem)]">{doc.description}</p>}
              <p className="mono mt-6 text-[11px] uppercase tracking-[0.1em] text-ink-40">{state?.author ? `By ${state.author} · ` : ""}SetMyCareer Field Notes</p>
            </header>

            <ArtHero art={art} alt={art.title} />

            <div className="mx-auto mt-14 max-w-2xl">
              <div className="editorial">
                {grouped.map((g, i) =>
                  g.kind === "list" ? (
                    <ul key={i} className="my-5 flex flex-col gap-2 pl-5">
                      {g.items.map((it, j) => <li key={j} className="relative text-[15.5px] leading-relaxed text-ink-80 before:absolute before:-left-5 before:text-ink-40 before:content-['—']">{it}</li>)}
                    </ul>
                  ) : g.b.t === "h2" ? (
                    <h2 key={i}>{g.b.text}</h2>
                  ) : g.b.t === "h3" ? (
                    <h3 key={i} className="mt-8 text-[17px] font-semibold tracking-tight">{g.b.text}</h3>
                  ) : (
                    <p key={i}>{g.b.text}</p>
                  ),
                )}
              </div>
              <CareersInField category={category} seed={slug} />
              <div className="mt-14 flex flex-col items-start gap-5 border-t border-line pt-10">
                <p className="h-lg max-w-[18ch]">Ready to decide with <span className="b">evidence</span>?</p>
                <Magnetic href={PORTAL_URL}>Begin now</Magnetic>
              </div>
            </div>
          </>
        )}
      </article>

      <ContinueReading current={slug} />
    </main>
  )
}
