// SetMyCareer YouTube channel feed. Proxies the channel's public RSS (no API key)
// to JSON: id, title, published, thumbnail, watch URL, views. Edge-cached and
// CORS-open so the client portal can reuse it. New uploads appear automatically.

const CHANNEL_ID = "UCrPxXwRZDEDrBT4TFPnSvqQ"

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#34": '"' }
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e: string) => {
    if (e[0] === "#") { const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isNaN(code) ? m : String.fromCharCode(code) }
    return ENTITIES[e] ?? m
  }).replace(/\s+/g, " ").trim()

export default async function handler(_req: unknown, res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } }) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/json")
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`, { headers: { "user-agent": "Mozilla/5.0 (compatible; SetMyCareer/1.0)" } })
    const xml = await r.text()
    const pick = (block: string, re: RegExp) => block.match(re)?.[1] ?? ""
    const videos = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const b = m[1]
      const id = pick(b, /<yt:videoId>([^<]+)</)
      return {
        id,
        title: decode(pick(b, /<title>([^<]*)</)),
        published: pick(b, /<published>([^<]+)</),
        views: Number(pick(b, /<media:statistics[^>]*views="(\d+)"/)) || 0,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        thumbHi: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
        url: `https://www.youtube.com/watch?v=${id}`,
      }
    }).filter((v) => v.id && v.title)
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400")
    res.status(200).json({ videos, channel: `https://www.youtube.com/channel/${CHANNEL_ID}`, fetchedAt: new Date().toISOString() })
  } catch {
    res.setHeader("Cache-Control", "public, s-maxage=120")
    res.status(200).json({ videos: [], channel: `https://www.youtube.com/channel/${CHANNEL_ID}`, fetchedAt: new Date().toISOString() })
  }
}
