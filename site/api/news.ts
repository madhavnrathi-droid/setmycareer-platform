// The Career Terminal's daily news agent. Scrapes a curated set of Google News
// RSS queries spanning jobs, skilling, education and the future of work, then
// MERGES → DEDUPES → CATEGORISES → extracts a hero STAT → RANKS, and returns the
// top ~12 as insight cards. No API key, no database, no external deps (regex XML
// parse, same as /api/feed). It "changes every day" two ways: the underlying
// news changes continuously, and the response is edge-cached ~12h with
// stale-while-revalidate — a daily Vercel Cron (vercel.json) guarantees at least
// one refresh per day even with no traffic. Degrades to [] on any failure; the
// client then falls back to the curated cited-research desk.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#34": '"', nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "–", mdash: "—", hellip: "…" }
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e: string) => {
    if (e[0] === "#") { const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isNaN(code) ? m : String.fromCharCode(code) }
    return ENTITIES[e] ?? m
  }).replace(/\s+/g, " ").trim()

// each source query carries the TAG the terminal shows on the card.
type Tag = "Jobs" | "Skills" | "Education" | "AI" | "Global"
const QUERIES: { tag: Tag; q: string }[] = [
  { tag: "Jobs", q: 'India (hiring OR jobs OR "campus placements" OR recruitment OR "white-collar") when:10d' },
  { tag: "Skills", q: 'India (skilling OR upskilling OR reskilling OR "in-demand skills" OR "skills gap") when:14d' },
  { tag: "Education", q: 'India (admissions OR "entrance exam" OR "study abroad" OR "higher education" OR NEP) when:14d' },
  { tag: "AI", q: '("AI jobs" OR "AI skills" OR "generative AI" workforce OR "AI hiring") India OR global when:10d' },
  { tag: "Global", q: '("future of work" OR "labour market" OR "job market") (WEF OR OECD OR "World Bank" OR McKinsey OR LinkedIn) when:14d' },
]

interface Raw { title: string; source: string; link: string; date: string; tag: Tag }

const pick = (block: string, tag: string) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim() : ""
}

async function fetchQuery({ tag, q }: { tag: Tag; q: string }): Promise<Raw[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`
  // per-fetch timeout: one stalled Google-News request must never hold the whole
  // allSettled merge to the platform maxDuration (a 504 instead of a partial feed)
  const r = await fetch(url, { signal: AbortSignal.timeout(6000), headers: { "user-agent": "Mozilla/5.0 (compatible; SetMyCareer/1.0)" } })
  const xml = await r.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 12).map((m) => {
    const b = m[1]
    const rawTitle = decode(pick(b, "title"))
    let source = decode(pick(b, "source"))
    let title = rawTitle
    // Google News titles are "Headline - Publisher"
    if (!source && rawTitle.includes(" - ")) { const parts = rawTitle.split(" - "); source = parts.pop() || ""; title = parts.join(" - ") }
    else if (source && rawTitle.endsWith(" - " + source)) { title = rawTitle.slice(0, -(source.length + 3)) }
    return { title: title.trim(), source: source.trim(), link: pick(b, "link").trim(), date: pick(b, "pubDate"), tag }
  })
}

// a normalized key for dedupe (lowercase alnum, first ~8 words)
const dedupeKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9 ]/g, "").split(/\s+/).slice(0, 8).join(" ")

// pull a headline STAT: a percentage, a money figure, or a magnitude (10M / 5 lakh / 2x).
// Multi-char units are ordered BEFORE the single-letter class so "bn"/"tn" don't get
// consumed as a bare "b"/"t"; single letters must be ATTACHED to the digits ("$50M",
// "5M jobs") so "Class 10 B" never false-positives.
const STAT_RE = /(?:[₹$]\s?\d[\d,.]*(?:\s?(?:trillion|billion|million|lakh|crore|cr|bn|tn|mn|k)|[bmtk])?)|(?:[+\-]?\d[\d,.]*\s?%)|(?:\d[\d,.]*(?:\s?(?:x|times|percent|trillion|billion|million|lakh|crore|cr|bn|tn|mn|k)|[bmtk])\b)/i
function extractStat(title: string): string | undefined {
  const m = title.match(STAT_RE)
  if (!m) return undefined
  return m[0].replace(/\s+/g, "").replace(/percent/i, "%").replace(/,$/, "")
    .replace(/([kmbt])$/i, (c) => c.toUpperCase()).slice(0, 12)
}

// quality signal — reputable outlets rank higher
const QUALITY = /(economic times|business standard|mint|hindu|times of india|indian express|moneycontrol|reuters|bloomberg|forbes|financial express|hindustan times|cnbc|linkedin|world economic|mckinsey|nasscom|business today|livemint|the print|scroll)/i

const ms = (d: string) => { const t = Date.parse(d); return Number.isNaN(t) ? 0 : t }

// normalized token set for the near-duplicate pass — the same story retold by
// different outlets shares most of its long tokens even when the wording shifts.
const STOP = new Set(["the", "and", "for", "with", "from", "that", "this", "into", "over", "amid", "after", "says", "will", "could", "here", "what", "how", "why", "india", "indian"])
const tokensOf = (title: string): Set<string> =>
  new Set(title.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)))

function curate(all: Raw[]): (Raw & { stat?: string })[] {
  const seen = new Set<string>()
  const now = Date.now()
  const scored = all
    // stat first, THEN the length gate — a punchy short stat headline ("AI hiring
    // up 54%") survives; a ≥12 floor still blocks junk fragments
    .map((r) => ({ ...r, stat: extractStat(r.title) }))
    .filter((r) => (r.title.length >= 22 || (r.stat && r.title.length >= 12)) && r.link && !/^\s*(sponsored|advertisement)/i.test(r.title))
    .filter((r) => { const k = dedupeKey(r.title); if (seen.has(k)) return false; seen.add(k); return true })
    .map((r) => {
      const ageH = r.date ? (now - ms(r.date)) / 3.6e6 : 999
      // freshness tie-breaks (≤ ~19) rather than dominating: a day-old Reuters
      // piece with a number must beat an hour-old stat-less blog post
      const freshness = Math.min(20, Math.max(0, 48 - ageH) * 0.4)
      const score = freshness + (r.stat ? 26 : 0) + (QUALITY.test(r.source) ? 20 : 0)
      return { r, score, ts: ms(r.date) }
    })
    .sort((a, b) => b.score - a.score || b.ts - a.ts)

  // greedy near-dup pass AFTER the sort — the highest-scored telling of each
  // story survives; cross-outlet retellings drop. Measured on the live wire:
  // the same story reworded lands at ~0.50–0.56 token overlap, so ≥0.5 is the
  // working threshold (0.6 let three copies of one report through).
  const kept: { r: Raw & { stat?: string }; toks: Set<string> }[] = []
  for (const { r } of scored) {
    const toks = tokensOf(r.title)
    const dup = toks.size > 0 && kept.some(({ toks: k }) => {
      let inter = 0
      for (const t of toks) if (k.has(t)) inter++
      return inter / Math.min(toks.size, k.size || 1) >= 0.5
    })
    if (!dup) kept.push({ r, toks })
  }
  return kept.map((x) => x.r)
}

export default async function handler(
  _req: unknown,
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } },
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/json")
  const day = new Date().toISOString().slice(0, 10)
  try {
    const settled = await Promise.allSettled(QUERIES.map(fetchQuery))
    const all = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []))
    const items = curate(all).slice(0, 12)
    // 12h fresh, serve stale up to a day while revalidating — the daily cron
    // guarantees a refresh; the underlying news changes continuously.
    res.setHeader("Cache-Control", "public, s-maxage=43200, stale-while-revalidate=86400")
    res.status(200).json({ items, day, fetchedAt: new Date().toISOString() })
  } catch {
    res.setHeader("Cache-Control", "public, s-maxage=300")
    res.status(200).json({ items: [], day, fetchedAt: new Date().toISOString() })
  }
}
