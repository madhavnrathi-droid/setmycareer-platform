// The bridge between the two publications: Field Notes (the reading) and the
// Career Terminal (the data). The blog taxonomy and the career-cluster taxonomy
// were built separately, so this file maps between them — letting a field note
// surface the careers it's really about, and a career surface the reading that
// explains its field. Everything is derived from the live ALL_ROWS data (no
// hard-coded ids), so it survives dataset edits.

import { ALL_ROWS, type Row } from "@/content/careers-all"

// blog category → the career clusters that best fit it (ordered by relevance)
export const CAT_TO_CLUSTERS: Record<string, string[]> = {
  "career-guidance": ["Business & Finance", "Technology & Data", "Engineering & Built"],
  "career-assessments": ["Science & Research", "Healthcare & Life Sciences", "Education & Social"],
  "career-transition": ["Technology & Data", "Business & Finance", "Sales, Service & Hospitality"],
  "job-search": ["Business & Finance", "Sales, Service & Hospitality", "Technology & Data"],
  "professional-development": ["Technology & Data", "Business & Finance", "Engineering & Built"],
  "psychology-counselling": ["Healthcare & Life Sciences", "Education & Social", "Law, Public & Safety"],
  "admission-assistance": ["Education & Social", "Science & Research", "Healthcare & Life Sciences"],
  "educational-opportunities": ["Education & Social", "Science & Research", "Engineering & Built"],
  "work-life-balance": ["Sales, Service & Hospitality", "Skilled Trades & Operations", "Education & Social"],
  originals: ["Technology & Data", "Business & Finance", "Design & Media"],
}

// career cluster → the single blog category most relevant to it (for "related reading")
const CLUSTER_TO_CAT: Record<string, string> = {
  "Technology & Data": "professional-development",
  "Business & Finance": "career-guidance",
  "Design & Media": "career-guidance",
  "Engineering & Built": "educational-opportunities",
  "Healthcare & Life Sciences": "psychology-counselling",
  "Education & Social": "admission-assistance",
  "Law, Public & Safety": "career-guidance",
  "Sales, Service & Hospitality": "job-search",
  "Science & Research": "career-assessments",
  "Skilled Trades & Operations": "job-search",
}

// deterministic hash so a note always shows the same careers (no Math.random)
const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const rank = (r: Row) => (r.trajectory === "up" ? 0 : r.trajectory === "flat" ? 1 : 2)

/** Careers that best match a blog category — trajectory-up first, cluster-diverse,
 *  stable per `seed` (pass the post slug so different notes surface different careers). */
export function careersForCategory(cat: string, n = 4, seed = ""): Row[] {
  const clusters = CAT_TO_CLUSTERS[cat] || CAT_TO_CLUSTERS["career-guidance"]
  const pool = ALL_ROWS.filter((r) => clusters.includes(r.cluster)).sort((a, b) => rank(a) - rank(b))
  if (!pool.length) return []
  const off = seed ? hash(seed + cat) % pool.length : 0
  const rotated = [...pool.slice(off), ...pool.slice(0, off)]
  const seen = new Set<string>()
  const out: Row[] = []
  for (const r of rotated) { if (out.length >= n) break; if (!seen.has(r.cluster)) { seen.add(r.cluster); out.push(r) } }
  for (const r of rotated) { if (out.length >= n) break; if (!out.includes(r)) out.push(r) }
  return out.slice(0, n)
}

/** The blog category most relevant to a career cluster (for "related reading"). */
export function categoryForCluster(cluster: string): string {
  return CLUSTER_TO_CAT[cluster] || "career-guidance"
}

/** A curated, cluster-diverse "featured careers" set for the Resources career rail —
 *  round-robins one rising career from each cluster so the strip spans the whole map. */
export function featuredCareers(n = 12): Row[] {
  const byCluster = new Map<string, Row[]>()
  for (const r of ALL_ROWS) {
    if (r.trajectory !== "up") continue
    const arr = byCluster.get(r.cluster) || []
    arr.push(r)
    byCluster.set(r.cluster, arr)
  }
  const clusters = [...byCluster.keys()]
  const out: Row[] = []
  let i = 0
  while (out.length < n && clusters.some((c) => (byCluster.get(c)?.length ?? 0) > 0)) {
    const arr = byCluster.get(clusters[i % clusters.length])
    if (arr && arr.length) out.push(arr.shift()!)
    i++
    if (i > 1000) break
  }
  return out.slice(0, n)
}
