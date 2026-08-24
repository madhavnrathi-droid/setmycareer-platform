#!/usr/bin/env node
//
// Keyword-strategy audit. Checks the RAW HTML of every keyword-mapped route against
// the targets in src/content/kw-map.ts — the same contract the founder's KW + Link
// Mapping doc specifies, made executable so it can be re-run after every change.
//
// Deliberately fetches without executing JavaScript, because that is what crawlers
// and answer engines do. Lighthouse cannot check any of this: it grades the hydrated
// page and knows nothing about which keyword a page is supposed to own.
//
// Usage: node scripts/seo-audit.mjs [baseUrl]

import { pathToFileURL } from "node:url"
import path from "node:path"

const BASE = (process.argv[2] || "http://127.0.0.1:4180").replace(/\/+$/, "")
const { KW_PAGES, KW_HUB } = await import(
  pathToFileURL(path.join(process.cwd(), "dist-ssr", "entry-server.js")).href
).then((m) => m.kwMap ?? import(pathToFileURL(path.join(process.cwd(), "dist-ssr", "entry-server.js")).href))
  .catch(() => ({}))
  .then(async (m) => (m.KW_PAGES ? m : await import(pathToFileURL(path.join(process.cwd(), "scripts", "kw-map.mjs")).href)))

const strip = (h) =>
  h.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
   .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
   .replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim()

const decode = (s) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
   .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&apos;/g, "'").replace(/&nbsp;/g, " ")

// Measure what a SERP measures. The prerenderer escapes "&" to "&amp;", which is
// correct HTML and four characters longer — comparing the raw markup against the
// intended title reported false failures on every page containing an ampersand.
const one = (h, re) => decode((h.match(re) || [])[1]?.trim() ?? "")

async function audit(p) {
  const r = await fetch(BASE + p.route, { headers: { "user-agent": "GPTBot/1.0" } })
  const html = await r.text()
  const body = (html.split(/<body[^>]*>/i)[1] || "").split(/<\/body>/i)[0] || ""
  const text = strip(body).toLowerCase()
  const h1 = strip((body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1] || "").toLowerCase()
  const title = one(html, /<title[^>]*>([\s\S]*?)<\/title>/i)
  const desc = one(html, /<meta\s+name="description"\s+content="([^"]*)"/i)
  const canon = one(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i)
  const links = new Set([...body.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1].replace(/\/+$/, "") || "/"))
  const prim = p.primary.toLowerCase()
  const first60 = text.split(" ").slice(0, 90).join(" ")

  const checks = {
    status: r.status === 200,
    titleMatch: title === p.title,
    titleLen: title.length > 0 && title.length <= 60,
    descLen: desc.length >= 140 && desc.length <= 158,
    h1One: (body.match(/<h1/gi) || []).length === 1,
    kwInH1: h1.includes(prim),
    kwEarly: first60.includes(prim),
    kwInBody: text.includes(prim),
    canonSelf: canon.endsWith(p.route),
    faqSchema: /"@type"\s*:\s*"FAQPage"/.test(html),
    hubLink: p.route === KW_HUB ? true : links.has(KW_HUB),
    words: strip(body).split(" ").filter(Boolean).length >= 400,
  }
  const semHit = p.secondary.filter((s) => text.includes(s.toLowerCase())).length
  return { route: p.route, checks, semHit, semTotal: p.secondary.length, titleLen: title.length, descLen: desc.length, words: strip(body).split(" ").filter(Boolean).length }
}

const rows = []
for (const p of KW_PAGES) rows.push(await audit(p))

const KEYS = ["status", "titleMatch", "titleLen", "descLen", "h1One", "kwInH1", "kwEarly", "kwInBody", "canonSelf", "faqSchema", "hubLink", "words"]
const pad = (s, n) => String(s).padEnd(n).slice(0, n)
console.log(`\nKEYWORD-STRATEGY AUDIT  base=${BASE}\n`)
console.log(pad("route", 42), KEYS.map((k) => pad(k.slice(0, 8), 9)).join(""), pad("sem", 6), "words")
console.log("-".repeat(158))
let fails = 0
for (const r of rows) {
  const cells = KEYS.map((k) => pad(r.checks[k] ? "ok" : "FAIL", 9)).join("")
  fails += KEYS.filter((k) => !r.checks[k]).length
  console.log(pad(r.route, 42), cells, pad(`${r.semHit}/${r.semTotal}`, 6), r.words)
}
const total = rows.length * KEYS.length
console.log(`\n  checks passed   ${total - fails}/${total}`)
console.log(`  pages clean     ${rows.filter((r) => KEYS.every((k) => r.checks[k])).length}/${rows.length}`)
const weak = rows.filter((r) => r.semHit / r.semTotal < 0.5)
if (weak.length) console.log(`  weak semantic coverage (<50%): ${weak.map((r) => r.route).join(", ")}`)
console.log()
process.exit(fails ? 1 : 0)
