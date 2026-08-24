// SSR entry — used ONLY at build time by scripts/prerender.mjs.
//
// Why this exists: the site is a client-rendered SPA, so every route used to ship
// the same empty `<div id="root">`. Google renders JS eventually, but the answer
// engines our robots.txt explicitly invites (GPTBot, ClaudeBot, PerplexityBot) do
// not — they were fetching a blank page. This renders each route to real HTML at
// build time so the markup, the headings and the internal links exist before a
// single byte of JavaScript runs.
//
// This is NOT a runtime server. Nothing here ships to the browser.

import { StrictMode } from "react"
import { renderToString } from "react-dom/server"
import { StaticRouter } from "react-router"
import App from "./App"
import { ALL_ROWS } from "./content/careers-all"
import { ARTICLES } from "./content/site"
import { ALL_LEGAL } from "./lib/legal"
import { LONGTERM } from "./content/offerings"
import { CAREER_TEST_PAGES } from "./content/career-test"
import { KW_ROUTES } from "./content/kw-map"

import { ssrHead, siteGraph, type SeoInput } from "./lib/seo"

export { SITE_URL, SITE_INDEXABLE } from "./lib/seo"
export { seoFor } from "./content/seo-meta"
export { siteGraph }

export interface RenderResult {
  html: string
  /** whatever the rendered page declared via useSeo — title, description,
   *  canonical override and JSON-LD — captured during the render itself */
  head: SeoInput | null
}

/** Render one route to markup. `url` is a path such as "/" or "/blog/foo". */
export function render(url: string): RenderResult {
  ssrHead.current = null
  const html = renderToString(
    <StrictMode>
      <StaticRouter location={url}>
        <App />
      </StaticRouter>
    </StrictMode>,
  )
  return { html, head: ssrHead.current }
}

/** Every concrete URL worth emitting as a static file, expanded from the same
 *  content modules the pages render from — so the prerendered set and the sitemap
 *  can never drift from what actually exists. Param routes whose data only arrives
 *  from a live API at runtime (/experts/:id) are deliberately absent: prerendering
 *  them would bake in a snapshot of a roster that changes. */
export function routes(): string[] {
  const staticPaths = [
    "/", "/product", "/framework", "/solutions", "/library", "/resources",
    "/resources/videos", "/trust", "/pricing", "/book", "/contact", "/cri",
    "/fit", "/counsellors", "/experts", "/experts/apply", "/blog", "/legal", "/signin",
  ]
  return [
    ...staticPaths,
    ...CAREER_TEST_PAGES.map((p) => p.slug),
    ...KW_ROUTES,
    ...ARTICLES.map((a) => `/blog/${a.slug}`),
    ...ALL_LEGAL.map((d) => `/legal/${d.slug}`),
    ...LONGTERM.map((p) => `/programs/${p.slug}`),
    ...ALL_ROWS.map((r) => `/library/${r.id}`),
  ]
}
