#!/usr/bin/env node
//
// Build-time static rendering for the marketing site.
//
// The site is a client-rendered SPA: before this script existed, every route shipped
// the identical ~11KB shell with an empty <div id="root">, no <h1>, no body copy and
// no internal links. Google renders JavaScript eventually; the answer engines our
// robots.txt explicitly invites (GPTBot, ClaudeBot, PerplexityBot) largely do not.
// They were being served a blank page.
//
// This runs after `vite build` (client) and `vite build --ssr` (server bundle):
//   1. render each route with renderToString
//   2. stamp the route's own title / description / canonical / robots / JSON-LD
//   3. write dist/<route>/index.html
//
// SAFETY CONTRACT — this script can never break the site:
//   • A route that throws is SKIPPED, not fatal. No file is written, so Vercel falls
//     back to the SPA shell and that route behaves exactly as it does today.
//   • The shell itself is emitted separately as dist/app.html and is what the SPA
//     rewrite serves for anything unprerendered (e.g. /experts/:id), so an unknown
//     URL never flashes the homepage before React takes over.
//   • Nothing here ships to the browser. It is a build step, not a runtime server.

import fs from "node:fs/promises"
import path from "node:path"
import { pathToFileURL } from "node:url"

const ROOT = process.cwd()
const DIST = path.join(ROOT, "dist")
const SSR_ENTRY = path.join(ROOT, "dist-ssr", "entry-server.js")

const t0 = Date.now()
const mod = await import(pathToFileURL(SSR_ENTRY).href)
const { render, routes, SITE_URL, SITE_INDEXABLE, siteGraph, routeSourceFor } = mod

// Vite's build manifest: page module -> its chunk + the shared chunks it imports.
// Used to tell the browser, in the HTML itself, which chunk this route will need.
let manifest = {}
try { manifest = JSON.parse(await fs.readFile(path.join(DIST, ".vite", "manifest.json"), "utf8")) } catch { /* no hints */ }
function preloadLinks(route) {
  const src = routeSourceFor?.(route)
  if (!src || !manifest[src]) return ""
  const files = new Set()
  const walk = (key) => {
    const e = manifest[key]
    if (!e || files.has(e.file)) return
    files.add(e.file)
    for (const imp of e.imports || []) walk(imp)
  }
  walk(src)
  // the entry chunk is already requested by its own <script>; skip it
  const entry = Object.values(manifest).find((e) => e.isEntry)?.file
  return [...files].filter((f) => f !== entry)
    .map((f) => `    <link rel="modulepreload" href="/${f}" />`).join("\n")
}
// seoFor is wired in once src/content/seo-meta.ts exists; until then each route
// keeps the template's default head rather than silently emitting a wrong one.
const seoFor = mod.seoFor ?? (() => undefined)

const template = await fs.readFile(path.join(DIST, "index.html"), "utf8")

const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

/** Replace a <meta> value in place, or append it before </head> if absent. */
function setMeta(html, key, value, attr = "name") {
  const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`, "i")
  if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`)
  return html.replace("</head>", `    <meta ${attr}="${key}" content="${esc(value)}" />\n  </head>`)
}

function setTitle(html, value) {
  return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(value)}</title>`)
}

function setCanonical(html, href) {
  const re = /(<link\s+rel="canonical"\s+href=")[^"]*(")/i
  if (re.test(html)) return html.replace(re, `$1${esc(href)}$2`)
  return html.replace("</head>", `    <link rel="canonical" href="${esc(href)}" />\n  </head>`)
}

/** JSON-LD injected as its own script, escaped so a "</script>" inside a string
 *  can never terminate the block early. */
function appendJsonLd(html, objects) {
  if (!objects?.length) return html
  const blocks = objects
    .map((o) => `    <script type="application/ld+json" data-route-ld="true">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`)
    .join("\n")
  return html.replace("</head>", `${blocks}\n  </head>`)
}

/** The homepage FAQ graph must not ride along on other routes — a page claiming
 *  FAQPage while showing no FAQ is a structured-data mismatch. */
function stripHomeOnlySchema(html) {
  return html.replace(/\s*<script type="application\/ld\+json" data-home-only="true">[\s\S]*?<\/script>/gi, "")
}

const outPathFor = (route) =>
  route === "/" ? path.join(DIST, "index.html") : path.join(DIST, route.replace(/^\//, ""), "index.html")

const all = routes()
let written = 0
const failed = []
const emitted = []

for (const route of all) {
  let appHtml, declared
  try {
    const out = await render(route)
    appHtml = out.html
    declared = out.head // what the page itself declared via useSeo
  } catch (err) {
    // Skip, never abort: the SPA shell still serves this route correctly.
    failed.push({ route, error: err?.message || String(err) })
    continue
  }

  // The page's own useSeo call is the source of truth; the seo-meta table only
  // fills gaps. That keeps one declaration per route instead of two that drift.
  const table = seoFor(route)
  const seo = { ...table, ...Object.fromEntries(Object.entries(declared || {}).filter(([, v]) => v != null)) }
  const canonical = seo.canonicalUrl || SITE_URL + route
  const noindex = !SITE_INDEXABLE || seo.robots === "noindex" || seo.noindex === true

  let html = template
  if (route !== "/") html = stripHomeOnlySchema(html)
  if (seo.title) {
    html = setTitle(html, seo.title)
    html = setMeta(html, "og:title", seo.title, "property")
    html = setMeta(html, "twitter:title", seo.title)
  }
  if (seo.description) {
    html = setMeta(html, "description", seo.description)
    html = setMeta(html, "og:description", seo.description, "property")
    html = setMeta(html, "twitter:description", seo.description)
  }
  html = setCanonical(html, canonical)
  html = setMeta(html, "og:url", canonical, "property")
  html = setMeta(html, "robots", noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large")
  const routeLd = seo.jsonLd ? (Array.isArray(seo.jsonLd) ? seo.jsonLd : [seo.jsonLd]) : []
  // sitewide identity (Organization + WebSite) on every page, route-specific graph
  // on top. Both come from src/lib/schema.ts so the @ids stay consistent.
  html = appendJsonLd(html, [...siteGraph(), ...routeLd])
  const hints = preloadLinks(route)
  if (hints) html = html.replace("</head>", `${hints}\n  </head>`)
  html = html.replace("<!--app-html-->", appHtml)

  const out = outPathFor(route)
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, html, "utf8")
  written++
  // The sitemap is an inventory of real URLs, not an indexing directive, so it lists
  // every route regardless of the staging flag — only per-route noindex pages (thin
  // or transactional ones) are held back. It is therefore correct the instant
  // VITE_SITE_INDEXABLE flips, with no rebuild of this logic.
  if (seo.robots !== "noindex" && seo.noindex !== true) emitted.push(route)
}

// The SPA fallback document: the untouched shell, no prerendered body. Vercel's
// rewrite points here so an unprerendered URL renders itself rather than briefly
// painting the homepage.
// It still carries the sitewide identity graph, because the routes it serves are
// real pages (/experts/:id) — they just render client-side.
await fs.writeFile(
  path.join(DIST, "app.html"),
  appendJsonLd(stripHomeOnlySchema(template), siteGraph()).replace("<!--app-html-->", ""),
  "utf8",
)

// ── robots.txt + sitemap.xml, generated from the same origin ─────────────────
// Both used to be hand-maintained static files pointing at the *.vercel.app URL.

const robots = `# SetMyCareer — open to search and to answer engines.
# Generated at build time from VITE_SITE_URL. Do not hand-edit.
User-agent: *
Allow: /

# AI assistants & answer engines are explicitly welcome to read and cite this site.
${["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-Web", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "CCBot"]
  .map((ua) => `User-agent: ${ua}\nAllow: /`)
  .join("\n")}
${SITE_INDEXABLE ? "" : `
# NOTE: this deployment is staging. Crawling stays ALLOWED on purpose — every page
# carries <meta name="robots" content="noindex">, and a crawler must be able to fetch
# the page to see that tag. Disallowing here would hide the noindex and risk the URL
# being indexed without content.
`}
Sitemap: ${SITE_URL}/sitemap.xml
`

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated at build time from the route table. Do not hand-edit. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${emitted
  .map((r) => `  <url>\n    <loc>${SITE_URL}${r === "/" ? "/" : r}</loc>\n  </url>`)
  .join("\n")}
</urlset>
`

await fs.writeFile(path.join(DIST, "robots.txt"), robots, "utf8")
await fs.writeFile(path.join(DIST, "sitemap.xml"), sitemap, "utf8")

// ── report ───────────────────────────────────────────────────────────────────
const secs = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`\nprerender: ${written}/${all.length} routes → static HTML in ${secs}s`)
console.log(`  origin      ${SITE_URL}`)
console.log(`  indexable   ${SITE_INDEXABLE ? "yes" : "no (staging: every page noindex)"}`)
console.log(`  sitemap     ${emitted.length} URLs`)
if (failed.length) {
  // Loud but non-fatal — these routes fall back to the SPA shell.
  console.log(`\n  ${failed.length} route(s) fell back to client rendering:`)
  for (const f of failed.slice(0, 20)) console.log(`    ${f.route} — ${f.error}`)
  if (failed.length > 20) console.log(`    … and ${failed.length - 20} more`)
}
console.log()
