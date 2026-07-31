import { useEffect } from "react"

// Head management for the site. Two layers, deliberately:
//
//  1. BUILD TIME — scripts/prerender.mjs renders every route to real HTML and stamps
//     the correct <title>/description/canonical/robots/JSON-LD into each emitted
//     dist/<route>/index.html. This is the layer crawlers and answer engines see,
//     because most of them never execute JavaScript.
//  2. CLIENT SIDE — useSeo() below keeps the head correct as a visitor navigates
//     within the SPA, where no new document is ever fetched.
//
// Both layers read the SAME per-route table (src/content/seo-meta.ts), so they can
// never disagree. Serving crawlers different content from users is cloaking; serving
// them the same content earlier is just static rendering.

// ── origin ───────────────────────────────────────────────────────────────────
// ONE definition of the site's origin. It used to be hardcoded in four places
// (index.html, this file, robots.txt, sitemap.xml) and they had already drifted —
// the sitemap and every canonical pointed at the raw *.vercel.app deployment URL,
// which tells Google the real site lives there.
//
// Set VITE_SITE_URL at build time (see .env). At domain cutover this one variable
// moves and index.html, canonicals, OG tags, JSON-LD @ids, robots.txt and the
// sitemap all follow.
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://test.setmycareer.com").replace(/\/+$/, "")

// Staging must not compete with the live site at setmycareer.com for its own brand
// terms, so it ships `noindex` until this flips to "1". Nothing else changes.
export const SITE_INDEXABLE = import.meta.env.VITE_SITE_INDEXABLE === "1"

/** Absolute URL for a site-relative path. */
export const abs = (path: string) => SITE_URL + (path.startsWith("/") ? path : "/" + path)

// ── client-side head updates ─────────────────────────────────────────────────

function meta(key: string, content: string, attr: "name" | "property" = "name") {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) { el = document.createElement("meta"); el.setAttribute(attr, key); document.head.appendChild(el) }
  el.setAttribute("content", content)
}

function linkRel(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!el) { el = document.createElement("link"); el.rel = rel; document.head.appendChild(el) }
  el.href = href
}

export interface SeoInput {
  title: string
  description: string
  /** site-relative path; ignored when `canonicalUrl` is given */
  path: string
  /** absolute override — used by mirrored blog posts, which must point at their
   *  original setmycareer.com URL rather than claiming the copy as canonical */
  canonicalUrl?: string
  /** per-page noindex, on top of the global staging flag */
  noindex?: boolean
  jsonLd?: object | object[] | null
}

// ── SSR head sink ────────────────────────────────────────────────────────────
// useSeo does its work in an effect, and effects never run under renderToString —
// so at build time the prerenderer had no way to learn the title a page declares.
// Rather than maintain a second, parallel copy of every title (which would drift
// the moment someone edited one), useSeo records its input synchronously during
// the server render and scripts/prerender.mjs reads it back. One declaration, used
// by both layers, so the static head and the client head cannot disagree.
const IS_SERVER = typeof window === "undefined"
export const ssrHead: { current: SeoInput | null } = { current: null }

export function useSeo(input: SeoInput) {
  if (IS_SERVER) ssrHead.current = input
  useSeoEffect(input)
}

function useSeoEffect({ title, description, path, canonicalUrl, noindex, jsonLd }: SeoInput) {
  const ld = jsonLd ? JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : ""
  useEffect(() => {
    if (IS_SERVER) return
    const canon = canonicalUrl || abs(path)
    document.title = title
    meta("description", description)
    meta("og:title", title, "property")
    meta("og:description", description, "property")
    meta("og:url", canon, "property")
    meta("twitter:title", title)
    meta("twitter:description", description)
    linkRel("canonical", canon)
    meta("robots", !SITE_INDEXABLE || noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large")

    // route-scoped JSON-LD: removed on unmount so a stale graph never leaks onto the
    // next route (previously the homepage FAQPage rode along on every single page)
    const nodes: HTMLScriptElement[] = []
    if (ld) {
      for (const obj of JSON.parse(ld) as object[]) {
        const s = document.createElement("script")
        s.type = "application/ld+json"
        s.setAttribute("data-route-ld", "true")
        s.textContent = JSON.stringify(obj)
        document.head.appendChild(s)
        nodes.push(s)
      }
    }
    return () => { nodes.forEach((n) => n.remove()) }
  }, [title, description, path, canonicalUrl, noindex, ld])
}
