// ─────────────────────────────────────────────────────────────────────────────
// Shared context — the bridge that lets EVERY AI surface (counsellor Compass,
// client guide, report agents, admin + in-call assistants) speak the engine's
// findings. `buildIntelligenceContext` runs the deterministic orchestrator for a
// profile and renders a compact, source-grounded text snapshot the LLM narrates.
// The LLM never invents these numbers — it explains them.
// ─────────────────────────────────────────────────────────────────────────────

import type { StudentProfile, IntelligenceReport } from "./types"
import { runIntelligence } from "./orchestrator"
import { DATA_SOURCES } from "./sources"
import { AGENTS } from "./agents"

const inr = (n?: number) => (n == null ? "—" : n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`)

/** One-paragraph description of the engine — included in every AI system prompt so
 *  all tools know the capability exists and how grounded it is. */
export const CAREER_INTELLIGENCE_KNOWLEDGE = `SetMyCareer runs a Career Intelligence engine: a multi-agent system (${AGENTS.length} specialised agents + a supervisor) reasoning over ${DATA_SOURCES.length} official Indian sources — ${DATA_SOURCES.map((s) => s.name).join(", ")}. It produces deterministic, explainable estimates: psychometric domain fit (ability battery + interest profile), admission probability vs real JoSAA/MCC closing cutoffs (safe/target/reach), ROI (program cost vs expected CTC, payback years), employability outlook (NCS/NSDC demand signals), and scholarship matching (eligibility vs income/category/merit). When you cite a number, it comes from this engine — never fabricate cutoffs, fees, ranks, or scholarship rules; if the profile lacks an input, say what's missing rather than guessing.`

/** Renders the orchestrator's report into a compact context block for the model. */
export function buildIntelligenceContext(profile: StudentProfile): string {
  const r = runIntelligence(profile)
  return formatReport(r)
}

export function formatReport(r: IntelligenceReport): string {
  const lines: string[] = []
  lines.push(`CAREER INTELLIGENCE — profile ${r.profile.name ?? r.profile.id} · confidence ${r.confidence}%`)

  lines.push(`\nBEST-FIT DOMAINS:`)
  for (const d of r.recommendedDomains) lines.push(`  • ${d.domain.replace(/_/g, " ")} — ${d.score}/100 (${d.why})`)

  if (r.admissions.length) {
    lines.push(`\nADMISSION ODDS (vs real closing cutoffs):`)
    for (const a of r.admissions.slice(0, 8)) lines.push(`  • ${a.collegeName}${a.program ? ` ${a.program}` : ""}: ${a.probability}% [${a.band}] — ${a.basis}`)
  }

  if (r.roi.length) {
    lines.push(`\nROI LEADERS:`)
    for (const x of r.roi.slice(0, 5)) lines.push(`  • ${x.collegeName}: cost ${inr(x.totalCost)} · start ${inr(x.expectedStartCTC)} · payback ${x.paybackYears}y · 10y-net ${inr(x.tenYearNet)} (score ${x.roiScore})`)
  }

  if (r.employability.length) {
    lines.push(`\nEMPLOYABILITY OUTLOOK:`)
    for (const e of r.employability) lines.push(`  • ${e.domain.replace(/_/g, " ")}: ${e.outlook}/100 ${e.trend} — drivers: ${e.demandDrivers.slice(0, 2).join(", ")}; roles: ${e.roles.slice(0, 2).join(", ")}`)
  }

  const elig = r.scholarships.filter((s) => s.eligible)
  if (elig.length) {
    lines.push(`\nSCHOLARSHIP MATCHES (eligible):`)
    for (const s of elig.slice(0, 6)) lines.push(`  • ${s.name} — fit ${s.fit}% · ${s.benefit}${s.approxAnnualValue ? ` (~${inr(s.approxAnnualValue)}/yr)` : ""}`)
  }

  if (r.highlights.length) lines.push(`\nHEADLINES: ${r.highlights.join(" ")}`)
  return lines.join("\n")
}

/** Best-effort StudentProfile from whatever a portal account exposes — so the
 *  client guide can run intelligence without a separate intake. */
export function profileFromAccount(a: { clientId: string; name?: string; goal?: string } | null, extra?: Partial<StudentProfile>): StudentProfile {
  return {
    id: a?.clientId ?? "guest",
    name: a?.name,
    level: extra?.level ?? "after_12th",
    ...extra,
  }
}

export { DATA_SOURCES, AGENTS }
