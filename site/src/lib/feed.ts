import { useEffect, useState } from "react"
import { ARTICLES, type Article } from "@/content/site"
import { artFor, type Art } from "@/lib/art"
import { editorialTitle } from "@/lib/title"

// Live blog feed — consumes the /api/blog serverless importer (which parses
// setmycareer.com's published posts). The marketing site reads it same-origin;
// the client portal reads the same endpoint cross-origin (CORS-open). New posts
// the editorial team publishes appear here automatically.

export interface LivePost {
  title: string
  description: string
  image: string
  author: string
  authorLink: string
  date: string
  url: string
  slug: string
  category: string
  tags: string[]
  ts: number
  art?: Art
}

// A unified card model — our own editorial essays (internal reader) and the live
// library (opens on setmycareer.com) render through the same premium card.
export interface FeedItem {
  id: string
  title: string
  dek: string
  image: string // the public-domain artwork
  art?: Art // the piece's provenance (its "backstory")
  category: string // raw key
  author: string
  ts: number
  href: string
  external: boolean
  readMin?: number
  original: boolean
}

/** A one-line "backstory" caption for a piece: "Artist · Title, Year". */
export const artCaption = (a?: Art) =>
  !a ? "" : [a.artist, [a.title, a.year].filter(Boolean).join(", ")].filter(Boolean).join(" · ")

// Human labels for the live category keys + our own taxonomy.
export const CAT_LABEL: Record<string, string> = {
  originals: "Essay",
  "career-guidance": "Career Guidance",
  "career-assessments": "Assessments",
  "career-transition": "Career Change",
  "job-search": "Job Search",
  "professional-development": "Professional Growth",
  "psychology-counselling": "Wellbeing",
  "admission-assistance": "Admissions",
  "educational-opportunities": "Education",
  "work-life-balance": "Work–Life",
}
export const catLabel = (key: string) =>
  CAT_LABEL[key] || key.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

const API = "/api/blog"

/** Fetch the live posts. `base` lets the portal point at the marketing origin. */
export function useLivePosts(base = "") {
  const [posts, setPosts] = useState<LivePost[]>([])
  const [state, setState] = useState<"loading" | "ready" | "error">("loading")
  useEffect(() => {
    let alive = true
    fetch(base + API)
      .then((r) => r.json())
      .then((d: { posts?: LivePost[] }) => { if (alive) { setPosts(d.posts || []); setState("ready") } })
      .catch(() => { if (alive) setState("error") })
    return () => { alive = false }
  }, [base])
  return { posts, state }
}

const articleToItem = (a: Article): FeedItem => {
  const art = artFor(a.slug, "originals", a.title)
  return {
    id: `smc-${a.slug}`,
    title: editorialTitle(a.title),
    dek: a.dek,
    image: art.image,
    art,
    category: "originals",
    author: a.author,
    ts: Date.parse(a.date) || 0,
    href: `/blog/${a.slug}`,
    external: false,
    readMin: a.readMin,
    original: true,
  }
}

const postToItem = (p: LivePost): FeedItem => {
  const art = p.art || artFor(p.slug, p.tags[0] || "career-guidance", p.title)
  return {
    id: p.slug,
    // idempotent — the API already normalises, but an edge-cached older response may not
    title: editorialTitle(p.title),
    dek: p.description,
    image: art.image,
    art,
    category: p.tags[0] || "career-guidance",
    author: p.author,
    ts: p.ts,
    // the live library READS ON THIS SITE (via /api/post) — never the old website
    href: `/blog/${p.slug}`,
    external: false,
    readMin: Math.max(3, Math.round((p.description || "").split(/\s+/).length / 40) + 3),
    original: false,
  }
}

/** Merge our editorial essays with the live library, newest first, deduped by slug. */
export function buildFeed(posts: LivePost[]): FeedItem[] {
  const originals = ARTICLES.map(articleToItem)
  const seen = new Set(originals.map((o) => o.id))
  const live = posts.map(postToItem).filter((p) => !seen.has(p.id))
  return [...originals, ...live].sort((a, b) => b.ts - a.ts)
}
