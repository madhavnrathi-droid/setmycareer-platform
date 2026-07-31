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

import { seoFor } from "@/content/seo-meta"
import { breadcrumbSchema, orgSchema, websiteSchema, serviceSchema, type JsonLd } from "@/lib/schema"

// the origin lives in a leaf module so this file can import schema.ts without
// closing the import graph into a cycle — see src/lib/site.ts
export { SITE_URL, SITE_INDEXABLE, abs } from "@/lib/site"
import { SITE_INDEXABLE, abs } from "@/lib/site"

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
  const resolved = resolveSeo(input)
  if (IS_SERVER) ssrHead.current = resolved
  useSeoEffect(resolved)
}

/** Merge a page's own useSeo call with the tuned per-route table.
 *
 *  Precedence is deliberate. STATIC routes (/pricing, /framework…) take the table's
 *  title and description, because those were written to a keyword and to the 60- and
 *  158-character limits the SERP actually truncates at. DYNAMIC routes (/blog/:slug,
 *  /library/:id) keep whatever the page passed, because the table cannot know which
 *  article or career is being rendered — seoFor is matched on the exact path only,
 *  so a param route simply finds nothing and the page's own value stands.
 *
 *  Doing this here rather than editing 25 pages means the table is authoritative for
 *  BOTH the prerendered head and the client-side head, with one declaration. */
function resolveSeo(input: SeoInput): SeoInput {
  const t = seoFor(input.path)
  const crumbs = t?.breadcrumb?.length ? breadcrumbSchema([...t.breadcrumb, { name: t.h1 || t.title, path: input.path }]) : null
  const pageLd = input.jsonLd ? (Array.isArray(input.jsonLd) ? input.jsonLd : [input.jsonLd]) : []
  // Service + its offer catalogue belongs only where the page actually presents the
  // offering. It used to sit in index.html and therefore rode along on all 20 routes,
  // including /blog posts that sell nothing.
  const service = input.path === "/" || input.path === "/pricing" ? serviceSchema() : null
  const ld: JsonLd[] = [...pageLd, service, crumbs].filter(Boolean) as JsonLd[]
  return {
    ...input,
    title: t?.title || input.title,
    description: t?.description || input.description,
    noindex: input.noindex ?? t?.robots === "noindex",
    jsonLd: ld.length ? ld : null,
  }
}

/** Sitewide identity graph — emitted once, in the prerendered head of every page. */
export const siteGraph = (): JsonLd[] => [orgSchema(), websiteSchema()]

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
