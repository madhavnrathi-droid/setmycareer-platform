// Live blog post reader. Fetches a post from setmycareer.com/blog/<slug>.php,
// extracts the ARTICLE ONLY (title + h2/h3/p/li flow — no nav, sidebar, share
// chrome, or links back to the old site) and returns a clean block model our
// editorial reader renders. This is how every one of the ~236 published posts
// reads ON THIS SITE instead of redirecting to the old website. Edge-cached 1h.

const ORIGIN = "https://setmycareer.com/"

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", "#39": "'", "#34": '"', nbsp: " ", ndash: "–", mdash: "—", rsquo: "'", lsquo: "'", rdquo: '"', ldquo: '"', hellip: "…" }
const decode = (s: string) =>
  s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (m, e: string) => {
    if (e[0] === "#") { const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isNaN(code) ? m : String.fromCharCode(code) }
    return ENTITIES[e] ?? m
  })
const text = (html: string) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim()

type Block = { t: "h2" | "h3" | "p" | "li" | "img"; text: string; src?: string }

export default async function handler(
  req: { query?: { slug?: string }; url?: string },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } },
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/json")
  const slug = (req.query?.slug || new URL(req.url || "", "http://x").searchParams.get("slug") || "").trim()
  if (!/^[a-z0-9-]{3,120}$/.test(slug)) { res.status(400).json({ error: "bad slug" }); return }
  try {
    const r = await fetch(`${ORIGIN}blog/${slug}.php`, { headers: { "user-agent": "Mozilla/5.0 (compatible; SetMyCareer/1.0)" } })
    if (!r.ok) { res.setHeader("Cache-Control", "public, s-maxage=300"); res.status(404).json({ error: "not found" }); return }
    const html = await r.text()

    const title = text(html.match(/<h1[^>]*class="[^"]*entry-title[^"]*"[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "")
    const description = decode(html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] || "")
    const heroImg = html.match(/<meta\s+property="og:image"\s+content="([^"]*)"/i)?.[1] || ""

    // article region: after the H1, before the "Recent Posts" sidebar/footer junk
    const h1End = html.search(/<\/h1>/i)
    let region = h1End >= 0 ? html.slice(h1End) : html
    const cut = region.search(/Recent\s+Posts|<footer/i)
    if (cut > 0) region = region.slice(0, cut)

    // ordered block scan — headings, paragraphs, list items only (text-only:
    // inline links/formatting are flattened so nothing routes to the old site)
    const blocks: Block[] = []
    const re = /<(h2|h3|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi
    let m: RegExpExecArray | null
    while ((m = re.exec(region))) {
      const t = text(m[2])
      if (!t || t.length < 3) continue
      if (/^(share|follow us|recent posts|categories|tags|read more|subscribe)/i.test(t)) continue
      blocks.push({ t: m[1].toLowerCase() as Block["t"], text: t })
      if (blocks.length > 220) break
    }

    if (!title && blocks.length === 0) { res.status(404).json({ error: "no content" }); return }
    res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400")
    res.status(200).json({ slug, title, description, heroImg, blocks, source: `${ORIGIN}blog/${slug}.php` })
  } catch {
    res.setHeader("Cache-Control", "public, s-maxage=120")
    res.status(200).json({ slug, title: "", description: "", heroImg: "", blocks: [], error: "fetch failed" })
  }
}
