// The unified career universe — the hand-curated, India-deep set (CAREERS) plus
// the broad O*NET/BLS-grounded set (EXT_CAREERS), flattened into one board model
// so the terminal can search, sort and filter across every occupation. Curated
// rows open the full deep-dive; extended rows open a focused, projection-first
// one. This is what makes "look up almost any career" real.

import { CAREERS, AI_LEVEL, trendPct, type Trajectory } from "./careers"
import { EXT_CAREERS, extById, type ExtCareer } from "./careers-ext"

export interface Row {
  id: string
  ticker: string
  name: string
  cluster: string
  oneLine: string
  demandTrend: number[]
  trajectory: Trajectory
  payLo: number   // entry (LPA)
  payHi: number   // senior (LPA)
  aiLevel: number | null // 1-3 for curated; null for extended (no AI read)
  kind: "curated" | "ext"
}

const curatedRows: Row[] = CAREERS.map((c) => ({
  id: c.id, ticker: c.ticker, name: c.name, cluster: c.cluster, oneLine: c.oneLine,
  demandTrend: c.demandTrend, trajectory: c.trajectory,
  payLo: c.payEntry[0], payHi: c.paySenior[1], aiLevel: AI_LEVEL[c.aiExposure], kind: "curated",
}))

const extRows: Row[] = EXT_CAREERS.map((c) => ({
  id: c.id, ticker: c.ticker, name: c.name, cluster: c.cluster, oneLine: c.oneLine,
  demandTrend: c.demandTrend, trajectory: c.trajectory,
  payLo: c.indiaEntry, payHi: c.indiaSenior, aiLevel: null, kind: "ext",
}))

// curated first so the richest instruments lead ties; the rest follow
export const ALL_ROWS: Row[] = [...curatedRows, ...extRows]
export const ALL_CLUSTERS = Array.from(new Set(ALL_ROWS.map((r) => r.cluster)))
export const TOTAL_CAREERS = ALL_ROWS.length

export const rowById = (id?: string): Row | undefined => ALL_ROWS.find((r) => r.id === id)

export function searchRows(q: string): Row[] {
  const t = q.trim().toLowerCase()
  if (!t) return ALL_ROWS
  return ALL_ROWS.filter((r) =>
    r.name.toLowerCase().includes(t) || r.ticker.toLowerCase().includes(t) ||
    r.cluster.toLowerCase().includes(t) || r.oneLine.toLowerCase().includes(t))
}

// resolve a related-occupation NAME to a linkable id (curated or extended).
// Exact first; else the row whose (more specific) name CONTAINS the term, taking
// the tightest wrapper — so "Network Architect" → "Computer Network Architect",
// never the shorter, unrelated "Architect". The reverse direction (a term
// containing a shorter row name) is deliberately dropped: it swallowed longer
// names into shorter, semantically-different careers.
export function rowIdByName(name: string): string | undefined {
  const t = name.toLowerCase()
  const exact = ALL_ROWS.find((r) => r.name.toLowerCase() === t)
  if (exact) return exact.id
  const contains = ALL_ROWS.filter((r) => r.name.toLowerCase().includes(t))
  if (!contains.length) return undefined
  return [...contains].sort((a, b) => a.name.length - b.name.length)[0].id
}

export { extById, trendPct, type ExtCareer }
