// ─────────────────────────────────────────────────────────────────────────────
// Supervisor / orchestrator — runs the agent DAG over the engines and curated
// data and assembles one IntelligenceReport. Pure + synchronous: deterministic
// given a profile, so any AI surface can call it and narrate the result. The LLM
// agents (server side) wrap this with reasoning + source-grounded explanation;
// this is the spine they share.
// ─────────────────────────────────────────────────────────────────────────────

import type { StudentProfile, IntelligenceReport, College, Domain, AdmissionEstimate } from "./types"
import { domainFit, admissionProbability, roiEstimate, employabilityForecast, scholarshipMatch } from "./engines"
import { COLLEGES, SCHOLARSHIPS } from "./data"

const DURATION_BY_DOMAIN: Partial<Record<Domain, number>> = {
  medical: 5.5, law: 5, architecture: 5, engineering: 4, pharmacy: 4,
}

/** How complete is the profile? Drives the report's confidence. */
function profileConfidence(p: StudentProfile): number {
  const checks = [
    p.level != null, p.stream != null, p.academicPercent != null,
    !!p.aptitude, !!p.interests, (p.examResults?.length ?? 0) > 0,
    p.category != null, p.familyIncome != null, p.homeState != null,
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}

export interface IntelligenceOptions {
  /** how many domains to pursue. */
  topDomains?: number
  /** cap colleges considered per domain. */
  collegesPerDomain?: number
}

export function runIntelligence(profile: StudentProfile, opts: IntelligenceOptions = {}): IntelligenceReport {
  const { topDomains = 3, collegesPerDomain = 8 } = opts

  // wave 2 — psychometric fit → ranked domains (respect explicit preferences)
  let domains = domainFit(profile)
  if (profile.domains?.length) {
    const pref = new Set(profile.domains)
    domains = [...domains].sort((a, b) => (pref.has(b.domain) ? 1 : 0) - (pref.has(a.domain) ? 1 : 0))
  }
  const recommendedDomains = domains.slice(0, topDomains)
  const pursued = recommendedDomains.map((d) => d.domain)

  // wave 3 — college discovery (quality-screened candidates per pursued domain)
  const candidates: College[] = []
  for (const d of pursued) {
    const inDomain = COLLEGES
      .filter((c) => c.domains.includes(d))
      .filter((c) => !profile.budget || (c.annualFee ?? 0) * 4 <= profile.budget * 1.1)
      .sort((a, b) => (a.nirfRank ?? 999) - (b.nirfRank ?? 999))
      .slice(0, collegesPerDomain)
    for (const c of inDomain) if (!candidates.find((x) => x.id === c.id)) candidates.push(c)
  }

  // wave 4 — admission probability + ROI (parallel agents, run per candidate)
  const admissions: AdmissionEstimate[] = candidates
    .map((c) => admissionProbability(profile, c))
    .filter((a): a is AdmissionEstimate => a != null)
    .sort((a, b) => b.probability - a.probability)

  const roi = candidates
    .map((c) => roiEstimate(c, DURATION_BY_DOMAIN[c.domains[0]] ?? 4))
    .sort((a, b) => b.roiScore - a.roiScore)
    .slice(0, 10)

  // wave 4 — employability per pursued domain
  const employability = pursued.map(employabilityForecast)

  // wave 4 — scholarships (eligible first, ranked by fit then value)
  const scholarships = SCHOLARSHIPS
    .map((s) => scholarshipMatch(profile, s))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.fit - a.fit || (b.approxAnnualValue ?? 0) - (a.approxAnnualValue ?? 0))
    .slice(0, 8)

  // wave 5 — supervisor assembles highlights + confidence
  const confidence = profileConfidence(profile)
  const highlights = buildHighlights({ recommendedDomains, admissions, roi, employability, scholarships, confidence })

  return {
    profile, recommendedDomains, admissions, roi, employability, scholarships, confidence, highlights,
  }
}

function buildHighlights(r: Pick<IntelligenceReport, "recommendedDomains" | "admissions" | "roi" | "employability" | "scholarships" | "confidence">): string[] {
  const h: string[] = []
  const top = r.recommendedDomains[0]
  if (top) h.push(`Strongest fit: ${top.domain.replace(/_/g, " ")} (${top.score}/100).`)
  const safe = r.admissions.find((a) => a.band === "safe")
  const target = r.admissions.find((a) => a.band === "target")
  if (safe) h.push(`Safe option: ${safe.collegeName} — ${safe.probability}% odds.`)
  if (target) h.push(`Worth a push: ${target.collegeName} — ${target.probability}% (target).`)
  const bestRoi = r.roi[0]
  if (bestRoi) h.push(`Best ROI: ${bestRoi.collegeName} — payback ~${bestRoi.paybackYears} yrs.`)
  const elig = r.scholarships.filter((s) => s.eligible)
  if (elig.length) h.push(`${elig.length} scholarship${elig.length === 1 ? "" : "s"} you likely qualify for, incl. ${elig[0].name}.`)
  const rising = r.employability.find((e) => e.trend === "rising")
  if (rising) h.push(`Market tailwind in ${rising.domain.replace(/_/g, " ")} (${rising.outlook}/100 outlook).`)
  if (r.confidence < 60) h.push(`Profile is ${r.confidence}% complete — add test results + income to sharpen these.`)
  return h
}
