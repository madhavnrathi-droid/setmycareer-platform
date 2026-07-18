// The bridge from a member's OWN test signal to the world's live career market.
// Their top interest clusters + JCE job-group fit become keywords, matched
// against the Career Terminal dataset (the same WEF/BLS/NASSCOM-grounded rows the
// marketing site uses), and ranked by 10-year demand growth. So the dashboard can
// say, truthfully, "because your strongest fit is X, these rising paths match you"
// — real member data measured against the real market.

import { realJceFor, type GroupFitLike } from "./report-bridge"
import { getTestResult } from "./results-store"
import { scoreIfin } from "@/guest/interest-final"
import { ALL_ROWS, type Row } from "../terminal/careers-all"
import { trendPctOf } from "../terminal/insights"

export interface MemberCluster { label: string; score: number }
export interface MemberMarket {
  /** true once the interest test (or any JCE signal) exists */
  hasSignal: boolean
  /** the member's single strongest JCE job group + its fit % */
  topGroup?: GroupFitLike
  /** their strongest interest clusters (top 3), highest first */
  clusters: MemberCluster[]
  /** rising careers from the live market that match their signal, demand-ranked */
  careers: Row[]
  /** TRUE only when `careers` actually came from this member's own signal. When
   *  the keyword bridge finds nothing we still return rows so the panel is never
   *  empty — but they are the market's top risers, identical for every member.
   *  The UI MUST read this and stop calling them a personal match, or the same
   *  six careers get presented to everyone as "chosen for you". */
  matched: boolean
}

// Each of the 32 interest-cluster labels → search terms that substring-hit the
// terminal rows (name / cluster / one-line). Tuned to the dataset's vocabulary so
// a "Data Science & Analytics" reader surfaces analysts and data scientists, not
// the whole board. Falls back to the cluster label itself for anything unmapped.
const CLUSTER_KEYWORDS: Record<string, string[]> = {
  "Sales & Business Development": ["sales", "business develop", "account manager"],
  "Digital Marketing": ["marketing", "digital market", "seo", "growth"],
  "Finance & Banking": ["finance", "account", "bank", "invest"],
  "Entrepreneurship": ["founder", "entrepreneur", "product manager", "start-up"],
  "Leadership & Management": ["consultant", "strategy", "general manager", "operations"],
  "Human Resources": ["human resource", "talent", "recruit", "people"],
  "Law": ["law", "legal", "advocate", "lawyer"],
  "Public Policy & Governance": ["policy", "public", "civil service", "governance"],
  "Administration & Compliance": ["administrat", "operations", "office"],
  "Education & Teaching": ["teacher", "education", "professor", "tutor"],
  "Physical Science & Research": ["scientist", "research", "physic", "chemist"],
  "Social Science & Research": ["research", "economist", "social", "policy analyst"],
  "Core Engineering": ["engineer", "mechanical", "civil", "electrical"],
  "IT & Software Engineering": ["software", "developer", "engineer", "programmer"],
  "Data Science & Analytics": ["data scientist", "data analyst", "analytics", "data"],
  "AI & Robotics": ["ai", "machine learning", "robot", "ml engineer"],
  "Healthcare / Medicine": ["doctor", "physician", "nurse", "medic"],
  "Allied Health": ["pharmac", "therap", "physiother", "lab"],
  "Psychology": ["psycholog", "counsel", "therap", "clinical"],
  "Social Work": ["social work", "community", "welfare"],
  "Hospitality": ["hospitality", "hotel", "tourism", "chef"],
  "Event Management": ["event", "production", "experience"],
  "Creative Arts & Design": ["design", "ux", "graphic", "creative"],
  "Performing Arts": ["music", "actor", "perform", "film"],
  "Journalism & Mass Communication": ["journalis", "media", "communicat", "content"],
  "Writing & Content Creation": ["writer", "content", "copy", "author"],
  "Architecture": ["architect", "urban plan", "interior"],
  "Agriculture & Environment": ["agricultur", "environment", "sustainab", "climate"],
  "Defence Services": ["defence", "police", "security", "safety"],
  "Operations Management": ["operations", "supply", "logistics", "manager"],
  "Retail & Consumer Business": ["retail", "merchandis", "brand", "commerce"],
  "Supply Chain & Logistics": ["supply chain", "logistics", "procurement"],
  "Sports & Physical Fitness": ["sport", "fitness", "coach", "athlet"],
  "Adventure & Exploration": ["adventure", "outdoor", "travel", "expedition"],
}

/** Match + demand-rank the live market against a member's test signal. */
export function careersForMember(clientId: string, n = 6): MemberMarket {
  const jce = realJceFor(clientId)
  const intr = getTestResult(clientId, "sigma_interest")
  if (!jce && !intr) return { hasSignal: false, clusters: [], careers: [], matched: false }

  const clusters: MemberCluster[] = intr && intr.answers.length
    ? [...scoreIfin(intr.answers).clusters]
        .sort((a, b) => (b.career ?? 0) - (a.career ?? 0))
        .slice(0, 3)
        .map((c) => ({ label: c.label, score: c.career ?? 0 }))
    : []
  const topGroup = jce?.jobs[0]

  // build the keyword set from the top clusters (fall back to the job group)
  const kws = new Set<string>()
  for (const c of clusters) for (const k of CLUSTER_KEYWORDS[c.label] ?? [c.label.toLowerCase()]) kws.add(k)
  if (!kws.size && topGroup) kws.add(topGroup.group.toLowerCase())
  const terms = [...kws]

  const matched = ALL_ROWS.filter((r) => {
    const hay = `${r.name} ${r.cluster} ${r.oneLine}`.toLowerCase()
    return terms.some((k) => hay.includes(k))
  })
  let careers = matched.sort((a, b) => trendPctOf(b) - trendPctOf(a)).slice(0, n)
  // never render empty: if the signal was too narrow, fall back to top risers —
  // but SAY SO via `matched:false`. Presenting the market's generic risers as a
  // personal match is a claim we cannot back, and one screenshot comparison
  // between two members would expose it.
  const didMatch = careers.length > 0
  if (!didMatch) {
    careers = [...ALL_ROWS].sort((a, b) => trendPctOf(b) - trendPctOf(a)).slice(0, n)
  }
  return { hasSignal: true, topGroup, clusters, careers, matched: didMatch }
}

/** A chosen career's cluster → the JCE job GROUP it belongs to. There is no
 *  per-career fit % in the engine (fit lives at job-group granularity), so the
 *  honest per-target read is "your measured fit for the job FAMILY this career
 *  sits in" — a real JCE number, never fabricated. All 10 terminal clusters map
 *  to a real JOB_WEIGHTS group name. */
const CLUSTER_TO_JOBGROUP: Record<string, string> = {
  "Technology & Data": "IT & Software Engineering",
  "Business & Finance": "Finance & Banking",
  "Design & Media": "Creative Arts & Design",
  "Engineering & Built": "Core Engineering",
  "Healthcare & Life Sciences": "Healthcare / Medicine",
  "Science & Research": "Physical Science & Research",
  "Sales, Service & Hospitality": "Sales & Business Development",
  "Law, Public & Safety": "Law",
  "Education & Social": "Education & Teaching",
  "Skilled Trades & Operations": "Operations Management",
}

export interface CareerFit { fitPct?: number; group?: string; band?: string }

/** The member's measured fit for the job family a target career belongs to. Empty
 *  ({}) when the interest test isn't taken or the cluster has no mapping — the UI
 *  then falls back to the per-target motivation verdict instead of a gauge. */
export function careerFitFor(clientId: string, cluster: string): CareerFit {
  const jce = realJceFor(clientId)
  if (!jce) return {}
  const group = CLUSTER_TO_JOBGROUP[cluster]
  if (!group) return {}
  const g = jce.jobs.find((j) => j.group === group)
  return g ? { fitPct: g.fitPct, group: g.group, band: g.band } : {}
}

/** The market at large — the fastest-rising careers, for members with no signal
 *  yet (the "here's the world you're deciding in" invite). */
export function topRisingCareers(n = 4): Row[] {
  return [...ALL_ROWS].sort((a, b) => trendPctOf(b) - trendPctOf(a)).slice(0, n)
}

export { trendPctOf }
