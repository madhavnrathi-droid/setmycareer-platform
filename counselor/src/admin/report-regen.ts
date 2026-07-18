// ─────────────────────────────────────────────────────────────────────────────
// Regenerate a client's career report in the NEW format, from their REAL data.
//
// For ACTIVE clients (remaining package entitlement) the AI report agent
// (/api/report → report-core) turns the client's real record — profile, every
// counsellor comment/note, session history, Career-Explorer answers, reviews,
// admission preferences — into the new McKinsey-grade narrative, which we render
// to a self-contained report DOCUMENT (HTML; the in-app viewer + the backend both
// render HTML, and no PDF dependency is needed — same proven path as the Sigma
// report upload). On confirm it is saved to BOTH:
//   • the client's LIVE SetMyCareer record (Reports/uploadReport) — confirm + write-gated
//   • the admin DB (Supabase app_state, app="admin") so the office keeps a copy
//
// NOTHING is generated or written for legacy clients, and nothing writes unless
// the operator confirms AND live writes are enabled — there is no mass auto-run.
// ─────────────────────────────────────────────────────────────────────────────

import { toast } from "sonner"
import { uploadReport, normalizeQA, type UserSession, type CareerExplorerQA } from "@/lib/smc-live-api"
import { SMC_WRITES_ENABLED } from "@/lib/smc-api"
import { invalidateUser } from "@/lib/live-queries"
import { cloudStateSetFor } from "@/lib/cloud"
import type { AINarrative } from "@/server/report-core"

const clean = (v?: unknown) => { const s = v == null ? "" : String(v).trim(); return s && s !== "None" && s !== "null" && s !== "undefined" ? s : "" }
const esc = (s: string) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export interface RegenInput {
  clientId: string
  name: string
  sessions: UserSession[]
  comments: { text: string; date?: string; navigator?: string }[]
  careerExplorer: CareerExplorerQA[]
  packages: string[]
  countries?: string[]
  cities?: string[]
}

/** Build the AI scaffold payload from the client's REAL record (no fabrication). */
function buildPayload(input: RegenInput) {
  const firstName = input.name.split(/\s+/)[0] || input.name
  const qa = (input.careerExplorer ?? []).map(normalizeQA).filter((q) => q.question && q.answer)
  const sessionLines = (input.sessions ?? []).map((s) => {
    const parts = [clean(s.session_name), clean(s.session_date), clean(String(s.session_time ?? "")), clean(s.session_status), clean(s.navi_name)].filter(Boolean)
    return parts.length ? `• ${parts.join(" · ")}` : ""
  }).filter(Boolean)
  const commentLines = (input.comments ?? []).map((c) => {
    const who = [clean(c.navigator), clean(c.date)].filter(Boolean).join(", ")
    return clean(c.text) ? `• ${c.text}${who ? `  (${who})` : ""}` : ""
  }).filter(Boolean)

  const dossier = [
    `CLIENT: ${input.name}`,
    input.packages.length ? `\nPACKAGES / SERVICES TAKEN:\n${input.packages.map((p) => `• ${p}`).join("\n")}` : "",
    sessionLines.length ? `\nSESSION HISTORY:\n${sessionLines.join("\n")}` : "",
    commentLines.length ? `\nCOUNSELLOR NOTES & COMMENTS (high weight — let these drive the synthesis):\n${commentLines.join("\n")}` : "",
    qa.length ? `\nCAREER-EXPLORER (the client's own answers):\n${qa.map((q) => `Q: ${q.question}\nA: ${q.answer}`).join("\n\n")}` : "",
    (input.countries?.length || input.cities?.length) ? `\nADMISSION PREFERENCES: ${[...(input.countries ?? []), ...(input.cities ?? [])].join(", ")}` : "",
  ].filter(Boolean).join("\n")

  return {
    client: { name: input.name, preferredName: firstName },
    dossier,
    facts: {
      packages: input.packages,
      sessionCount: (input.sessions ?? []).length,
      noteCount: (input.comments ?? []).length,
      careerExplorerCount: qa.length,
    },
  }
}

/** Call the live AI report agent → the new-format narrative. */
export async function generateRegenNarrative(input: RegenInput): Promise<AINarrative> {
  const payload = buildPayload(input)
  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  })
  const data = await res.json()
  if (!res.ok) throw new Error((data && data.error) || `Report agent failed (HTTP ${res.status})`)
  return data as AINarrative
}

const sectionLabels: Record<keyof AINarrative["sectionNarratives"], string> = {
  personality: "Personality", interests: "Interests", abilities: "Abilities",
  clusters: "Strength clusters", jobGroups: "Best-fit job groups", workRoles: "Work roles", wellbeing: "Wellbeing & sustainability",
}

/** Render the narrative to a self-contained report document (the NEW format). */
export function narrativeToHtml(name: string, n: AINarrative): string {
  const today = new Date().toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })
  const para = (s: string) => `<p>${esc(s)}</p>`
  const paras = (a: string[]) => a.filter(Boolean).map(para).join("")
  const journey = n.journey.filter((j) => clean(j.narrative)).map((j) => `<h3>${esc(j.key)}</h3>${para(j.narrative)}`).join("")
  const sections = (Object.keys(sectionLabels) as (keyof AINarrative["sectionNarratives"])[])
    .filter((k) => clean(n.sectionNarratives[k]))
    .map((k) => `<h3>${esc(sectionLabels[k])}</h3>${para(n.sectionNarratives[k])}`).join("")
  const list = (title: string, a: string[]) => a.filter(Boolean).length ? `<h2>${esc(title)}</h2><ul>${a.filter(Boolean).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""

  return `<!doctype html><html><head><meta charset="utf-8"><title>Career Report — ${esc(name)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,system-ui,sans-serif;color:#15171a;max-width:780px;margin:0 auto;padding:44px 30px;line-height:1.6}
    .brand{display:flex;align-items:center;gap:10px;border-bottom:2px solid #111;padding-bottom:12px}
    .wm{font-family:Georgia,"Cambo",serif;font-size:18px} .sub{margin-left:auto;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280}
    h1{font-family:Georgia,"Cambo",serif;font-size:30px;margin:20px 0 2px} .meta{color:#9ca3af;font-size:12px;margin-bottom:8px}
    .thesis{font-size:15px;line-height:1.7;color:#15171a;border-left:3px solid #165794;padding:6px 0 6px 16px;margin:18px 0 6px}
    h2{font-size:17px;margin:30px 0 8px;font-family:Georgia,"Cambo",serif} h3{font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#165794;margin:20px 0 4px}
    p{font-size:13.5px;margin:0 0 12px} ul{margin:0 0 12px;padding-left:18px} li{font-size:13.5px;margin:0 0 6px}
    .quote{font-family:Georgia,"Cambo",serif;font-size:14px;font-style:italic;color:#374151;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;padding:14px 0;margin:18px 0}
    .footer{margin-top:32px;border-top:1px solid #e5e7eb;padding-top:10px;color:#9ca3af;font-size:10.5px}
  </style></head><body>
    <div class="brand"><span class="wm">Setmycareer</span><span class="sub">Career Intelligence Report</span></div>
    <h1>Career Report</h1>
    <div class="meta">${esc(name)} · Generated ${esc(today)} · Synthesised by SetMyCareer from the client's record</div>
    ${n.framingThesis ? `<div class="thesis">${esc(n.framingThesis)}</div>` : ""}
    ${n.executiveSummary.length ? `<h2>Executive summary</h2>${paras(n.executiveSummary)}` : ""}
    ${journey ? `<h2>Your journey</h2>${journey}` : ""}
    ${sections ? `<h2>What the assessment shows</h2>${sections}` : ""}
    ${list("The job market", n.jobMarket)}
    ${n.counsellorSynthesis ? `<h2>Counsellor synthesis</h2>${para(n.counsellorSynthesis)}` : ""}
    ${list("Recommended next moves", n.recommendations)}
    ${n.pullQuotes.filter(Boolean).map((q) => `<div class="quote">${esc(q)}</div>`).join("")}
    <div class="footer">Generated by SetMyCareer's Career Intelligence agent from the client's own record (assessments, sessions and counsellor notes). Estimates are directional, point-in-time, and complement the counsellor's judgment.</div>
  </body></html>`
}

/** Persist a regenerated report: client's LIVE record + the admin DB. Confirm-gated
 *  and write-flag-gated — never writes silently or in bulk. Returns true on success. */
export async function saveRegenReport(input: { clientId: string; name: string; html: string; narrative: AINarrative }): Promise<boolean> {
  if (!SMC_WRITES_ENABLED) { toast.error("Live writes are off in this environment — can't save to the client's account."); return false }
  const ok = window.confirm(`Save the regenerated new-format report to ${input.name}'s SetMyCareer account and the admin records?\n\nThis writes to their live record.`)
  if (!ok) return false
  const reportName = `Career Report (new format) — ${input.name}`
  try {
    // 1) admin DB copy (Supabase app_state, app="admin") — keep the office's copy first
    await cloudStateSetFor("admin", String(input.clientId), "regen-report", {
      name: reportName, html: input.html, narrative: input.narrative, savedAt: new Date().toISOString(),
    })
    // 2) the client's LIVE SetMyCareer record (shows in portal + counsellor + admin)
    const file = new File([input.html], `Career_Report_${input.clientId}.html`, { type: "text/html" })
    await uploadReport(String(input.clientId), reportName, file)
    invalidateUser(input.clientId)
    toast.success("New-format report saved — to the client's account and the admin records.")
    return true
  } catch (e) {
    toast.error((e as Error).message || "Couldn't save the report. Please try again.")
    return false
  }
}
