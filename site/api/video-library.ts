// The full curated video library. Scrapes setmycareer.com/video-resources.php —
// which renders its videos from an inline `let cardData = [...]` array (title +
// link=YouTube-id + categories) — into clean, categorised JSON so every talk,
// story, insight, deep-dive and webinar reads in OUR editorial video page instead
// of the old website. New videos the team adds to that page appear automatically.
// Thumbnails come straight from YouTube (i.ytimg.com); nothing depends on the old
// site's assets. Edge-cached 1h.

const ORIGIN = "https://setmycareer.com/"

// the taxonomy the old page uses → the labels our publication shows
const CAT_LABEL: Record<string, string> = {
  dr_rathis_advice: "Dr. Rathi's Advice",
  smc_stories: "Success Stories",
  career_insights: "Career Insights",
  career_deepdives: "Career Deep-Dives",
  webinars: "Webinars",
}
const CAT_ORDER = ["dr_rathis_advice", "smc_stories", "career_insights", "career_deepdives", "webinars"]

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#34": '"', nbsp: " ", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', ndash: "–", mdash: "—", hellip: "…" }
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e: string) => {
    if (e[0] === "#") { const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isNaN(code) ? m : String.fromCharCode(code) }
    return ENTITIES[e] ?? m
  })

type Vid = { id: string; title: string; category: string; categoryLabel: string; thumb: string; thumbHi: string; url: string }

export default async function handler(
  req: { method?: string },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } },
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/json")
  try {
    const r = await fetch(`${ORIGIN}video-resources.php`, { headers: { "user-agent": "Mozilla/5.0 (compatible; SetMyCareer/1.0)" } })
    if (!r.ok) throw new Error(`HTTP ${r.status}`)
    const html = await r.text()

    // isolate the cardData array literal
    const start = html.indexOf("cardData")
    const open = start >= 0 ? html.indexOf("[", start) : -1
    const close = open >= 0 ? html.indexOf("];", open) : -1
    const arr = open >= 0 && close > open ? html.slice(open + 1, close) : ""

    const videos: Vid[] = []
    const seen = new Set<string>()
    // each object is a { … } block; parse title, link (yt id) and categories
    for (const m of arr.matchAll(/\{[^{}]*\}/g)) {
      const o = m[0]
      const title = decode((o.match(/title:\s*'([^']*)'/) || o.match(/title:\s*"([^"]*)"/) || [])[1] || "").trim()
      const id = ((o.match(/link:\s*'([^']*)'/) || o.match(/link:\s*"([^"]*)"/) || [])[1] || "").trim()
      const catBlock = (o.match(/categories:\s*\[([^\]]*)\]/) || [])[1] || ""
      const cats = [...catBlock.matchAll(/'([^']*)'|"([^"]*)"/g)].map((c) => (c[1] || c[2] || "").trim()).filter(Boolean)
      const category = cats[0] || "career_insights"
      if (!id || !/^[A-Za-z0-9_-]{6,20}$/.test(id) || !title || seen.has(id)) continue
      seen.add(id)
      videos.push({
        id, title, category,
        categoryLabel: CAT_LABEL[category] || category.replace(/_/g, " "),
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        thumbHi: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
      })
    }

    if (!videos.length) { res.setHeader("Cache-Control", "public, s-maxage=300"); res.status(200).json({ count: 0, categories: [], videos: [], error: "no videos parsed" }); return }

    const present = new Set(videos.map((v) => v.category))
    const categories = CAT_ORDER.filter((k) => present.has(k)).map((k) => ({ key: k, label: CAT_LABEL[k], count: videos.filter((v) => v.category === k).length }))

    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
    res.status(200).json({ count: videos.length, categories, videos, source: `${ORIGIN}video-resources.php` })
  } catch {
    res.setHeader("Cache-Control", "public, s-maxage=120")
    res.status(200).json({ count: 0, categories: [], videos: [], error: "fetch failed" })
  }
}
