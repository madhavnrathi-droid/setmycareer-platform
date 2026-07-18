// Career-layer intelligence — deterministic, on-device, grounded in the bundled
// O*NET/BLS snapshot (lib/labor.js). Mirrors the mental-health layer's contract:
// signal-language + per-metric confidence, never authority, no risk-cap (career
// has no safety floor the way the personal index does). Everything is computed
// from the user's career profile against bundled labor data — nothing is sent out.
import { OCC_BY_TITLE, demand01, outlookLabel, OCCUPATIONS } from './labor'

// careerProfile shape:
// { current, target, skills:[name], riasec:[letter], goal, momentum(0-100|null) }

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)))

// importance-weighted share of the target role's key skills the user holds
export function skillCoverage(profile, occ) {
  if (!occ?.skills?.length) return null
  const have = new Set((profile.skills || []).map((s) => s.toLowerCase()))
  let got = 0, total = 0
  const matched = [], missing = []
  for (const [name, imp] of occ.skills) {
    total += imp
    if (have.has(name.toLowerCase())) { got += imp; matched.push(name) }
    else missing.push([name, imp])
  }
  missing.sort((a, b) => b[1] - a[1])
  return { pct: total ? clamp((got / total) * 100) : 0, matched, missing: missing.map((m) => m[0]) }
}

// RIASEC interest ↔ role fit: overlap of the user's top interests with the
// occupation's two-letter Holland code, weighted so the primary code counts most.
export function roleFit(profile, occ) {
  const user = profile.riasec || []
  if (!user.length || !occ?.riasec?.length) return null
  let score = 0
  occ.riasec.forEach((code, i) => {
    if (user.includes(code)) score += i === 0 ? 0.6 : 0.4
  })
  return clamp(score * 100)
}

// how defined the direction is: having a target + a stated goal + interest fit
export function careerClarity(profile, occ, fit) {
  let s = 0
  if (profile.target) s += 38
  if ((profile.goal || '').trim().length > 8) s += 22
  if (fit != null) s += fit * 0.4
  else if (profile.target) s += 16 // target set but no interest data → partial
  return clamp(s)
}

// readiness to compete = how much of the role you hold, scaled by how hot it is
export function marketReadiness(coverage, occ) {
  if (!coverage) return null
  const d = demand01(occ.growth)
  return clamp(coverage.pct * (0.62 + 0.38 * d))
}

// reachable roles within a small skill radius (shared skills) — "doors open"
export function opportunitySurface(profile, occ) {
  const have = new Set((profile.skills || []).map((s) => s.toLowerCase()))
  const near = OCCUPATIONS
    .filter((o) => o.title !== occ?.title)
    .map((o) => {
      const shared = o.skills.filter(([n]) => have.has(n.toLowerCase())).length
      return { title: o.title, growth: o.growth, shared }
    })
    .filter((o) => o.shared >= 2)
    .sort((a, b) => b.shared - a.shared || b.growth - a.growth)
  return near.slice(0, 4)
}

// confidence is honest about thin input — coverage needs skills, fit needs RIASEC,
// momentum/velocity need longitudinal history we may not have yet.
const conf = (ok) => (ok ? 'moderate' : 'tentative')

// The whole career read in one pass.
export function computeCareer(profile) {
  if (!profile?.target) return null
  const occ = OCC_BY_TITLE[profile.target]
  if (!occ) return null

  const coverage = skillCoverage(profile, occ)
  const fit = roleFit(profile, occ)
  const clarity = careerClarity(profile, occ, fit)
  const readiness = marketReadiness(coverage, occ)
  const opportunities = opportunitySurface(profile, occ)
  const momentum = profile.momentum != null ? clamp(profile.momentum) : null

  // composite — deterministic weighted mean over what we could compute (no risk-cap)
  const parts = [
    [readiness, 0.30], [coverage?.pct, 0.25], [clarity, 0.25], [fit, 0.20],
  ].filter(([v]) => v != null)
  const wsum = parts.reduce((a, [, w]) => a + w, 0)
  const index = parts.length ? clamp(parts.reduce((a, [v, w]) => a + v * w, 0) / wsum) : null

  return {
    index,
    occ,
    outlook: { growth: occ.growth, wage: occ.wage, label: outlookLabel(occ.growth) },
    dims: {
      market_readiness: { score: readiness, confidence: conf(coverage?.matched.length >= 2) },
      skill_coverage: { score: coverage?.pct ?? null, confidence: conf((profile.skills || []).length >= 3) },
      career_clarity: { score: clarity, confidence: conf(!!profile.target) },
      interest_role_fit: { score: fit, confidence: conf((profile.riasec || []).length >= 1) },
      execution_momentum: { score: momentum, confidence: 'tentative' },
    },
    coverage,
    opportunities,
  }
}

export const CAREER_DIMS = [
  { key: 'market_readiness', name: 'Market readiness', why: "How ready you are to compete for the role — what you hold, scaled by how in-demand it is.", hue: '#2563EB' },
  { key: 'skill_coverage', name: 'Skill coverage', why: "Share of the role's core skills already in your kit, weighted by how much each matters.", hue: '#0EA5E9' },
  { key: 'career_clarity', name: 'Career clarity', why: 'How defined your direction is — a target, a stated goal, and interests that line up.', hue: '#7C3AED' },
  { key: 'interest_role_fit', name: 'Interest fit', why: 'How well the role matches what energizes you (RIASEC interests).', hue: '#0891B2' },
  { key: 'execution_momentum', name: 'Momentum', why: 'Are intentions turning into moves. Sharpens as you log more sessions over time.', hue: '#0D9488' },
]
