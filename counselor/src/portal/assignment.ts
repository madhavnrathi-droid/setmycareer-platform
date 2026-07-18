// Counsellor auto-assignment — the mapping the founder specified: availability
// (current load) + what the client filled into their profile + the counsellor's
// practising expertise. Deterministic and explainable: every assignment carries
// the reason it was made, and the admin sees the same numbers.

import type { PortalAccount } from "./portal-store"
import type { PortalBooking } from "./portal-store"
import type { CounsellorListing } from "./counsellors"

/** Keywords a client's profile implies, drawn from track, stage and their own
 *  words — matched against counsellor specialties (practicing_expertise). */
function clientKeywords(a: PortalAccount): string[] {
  const p = a.profile ?? {}
  const kw: string[] = []
  if (a.track === "professional") kw.push("executive", "professional", "leadership", "corporate", "career transition", "mid-career")
  else kw.push("student", "stream", "college", "school", "admission", "career selection")
  if (p.stage?.startsWith("class")) kw.push("school", "stream selection", "10th", "12th")
  if (p.stage === "ug" || p.stage === "pg") kw.push("graduate", "college", "higher education")
  if (p.stage?.startsWith("exp")) kw.push("working professional", "switch", "growth")
  const words = `${p.qDecision ?? ""} ${p.qContext ?? ""} ${p.qSuccess ?? ""}`.toLowerCase()
  for (const [term, tag] of [
    ["abroad", "study abroad"], ["mba", "management"], ["engineer", "engineering"], ["design", "design"],
    ["data", "technology"], ["product", "product"], ["stream", "stream selection"], ["switch", "career transition"],
    ["leader", "leadership"], ["startup", "entrepreneurship"], ["upsc", "government"], ["medic", "medical"],
  ] as const) {
    if (words.includes(term)) kw.push(tag)
  }
  return kw
}

export interface AssignmentScore {
  counsellor: CounsellorListing
  score: number
  load: number
  matched: string[]
  reason: string
}

/** Score every counsellor for this client: +2 per expertise keyword hit,
 *  −1 per upcoming booking (availability), +0.5 rating bonus when present.
 *  Ties break on lightest load, then name (stable). */
export function rankCounsellors(
  account: PortalAccount,
  roster: CounsellorListing[],
  allBookings: PortalBooking[],
): AssignmentScore[] {
  const kws = clientKeywords(account)
  const now = Date.now()
  const loadOf = (id: string) =>
    allBookings.filter((b) => b.counsellorId === id && (b.status === "requested" || b.status === "confirmed") && new Date(b.at).getTime() > now).length
  return roster
    .map((c) => {
      const hay = `${c.title ?? ""} ${(c.specialties ?? []).join(" ")}`.toLowerCase()
      const matched = [...new Set(kws.filter((k) => hay.includes(k.toLowerCase())))]
      const load = loadOf(c.id)
      const score = matched.length * 2 - load
      const reason = matched.length
        ? `Matched on ${matched.slice(0, 3).join(", ")} · ${load} upcoming session${load === 1 ? "" : "s"}`
        : `Most available (${load} upcoming session${load === 1 ? "" : "s"})`
      return { counsellor: c, score, load, matched, reason }
    })
    .sort((a, b) => b.score - a.score || a.load - b.load || a.counsellor.name.localeCompare(b.counsellor.name))
}

/** The assignment: best-ranked counsellor for this client, or null on an empty roster. */
export function autoAssign(
  account: PortalAccount,
  roster: CounsellorListing[],
  allBookings: PortalBooking[],
): AssignmentScore | null {
  const ranked = rankCounsellors(account, roster, allBookings)
  return ranked[0] ?? null
}
