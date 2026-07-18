// Live careers / job-market headline feed for the Career Terminal.
// Proxies Google News RSS (free, no API key) for India-relevant future-of-work
// headlines, parses to JSON, and caches at the edge. The client degrades to a
// curated resource list if this ever returns empty.

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#34": '"', nbsp: " " }
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e: string) => {
    if (e[0] === "#") { const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isNaN(code) ? m : String.fromCharCode(code) }
    return ENTITIES[e] ?? m
  }).replace(/\s+/g, " ").trim()

const QUERY = 'India (jobs OR hiring OR "future of work" OR skilling OR "AI jobs" OR careers OR "campus placements") when:14d'

export default async function handler(_req: unknown, res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } }) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(QUERY)}&hl=en-IN&gl=IN&ceid=IN:en`
  try {
    const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; SetMyCareer/1.0)" } })
    const xml = await r.text()
    const pick = (block: string, tag: string) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
      return m ? m[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim() : ""
    }
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 20).map((m) => {
      const b = m[1]
      const rawTitle = decode(pick(b, "title"))
      let source = decode(pick(b, "source"))
      let title = rawTitle
      // Google News titles are "Headline - Publisher"
      if (!source && rawTitle.includes(" - ")) { const parts = rawTitle.split(" - "); source = parts.pop() || ""; title = parts.join(" - ") }
      else if (source && rawTitle.endsWith(" - " + source)) { title = rawTitle.slice(0, -(source.length + 3)) }
      const date = pick(b, "pubDate")
      return { title: title.trim(), source: source.trim(), link: pick(b, "link").trim(), date }
    }).filter((i) => i.title.length > 12)
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=7200")
    res.setHeader("Content-Type", "application/json")
    res.status(200).json({ items, fetchedAt: new Date().toISOString() })
  } catch {
    res.setHeader("Cache-Control", "public, s-maxage=120")
    res.status(200).json({ items: [], fetchedAt: new Date().toISOString() })
  }
}
