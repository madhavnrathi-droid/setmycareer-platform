// ─────────────────────────────────────────────────────────────────────────────
// Test → report → storage. Turns a completed in-app Sigma test (the real engine
// output) into a clean report document and uploads it to the client's LIVE
// SetMyCareer record via `Reports/uploadReport`. Once stored it shows up
// everywhere the live reports read flows already render: the client's portal
// Reports list, the counsellor's client detail, and the admin client profile.
//
// Confirm-gated and write-flag-gated — it mutates a real production record, so it
// asks first and is a no-op when live writes are disabled.
// ─────────────────────────────────────────────────────────────────────────────

import { toast } from "sonner"
import { uploadReport } from "@/lib/smc-live-api"
import { SMC_WRITES_ENABLED } from "@/lib/smc-api"
import { invalidateUser } from "@/lib/live-queries"
import { scorePersonality, interestToJce } from "@/lib/sigma/engine"
import { FACTOR_READS, FACET_READS, readFor } from "@/lib/sigma/descriptions"
import type { TestDef } from "./catalog"
import type { StoredTestResult } from "./results-store"

const esc = (s: string) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

const row = (label: string, value: number, sub: string) => `
  <div class="row">
    <div class="rl"><span>${esc(label)}</span><span class="sub">${esc(sub)}</span></div>
    <div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, value))}%"></div></div>
  </div>`

/** Build the report body for whichever test was taken (real engine output). */
function reportBody(def: TestDef, result: StoredTestResult): string {
  if (def.id === "sigma_personality") {
    const p = scorePersonality(result.answers)
    const factors = [...p.factors].sort((a, b) => b.percentile - a.percentile)
    return `<h2>Personality profile — 6-factor (norm-referenced)</h2>` +
      `<p class="lead">Percentiles against a norm group — High is the top third, Low the bottom third. Neither pole is “better”; each names a different strength. The side you lean toward is in bold.</p>` +
      factors.map((f) => {
        const fr = FACTOR_READS[f.key]
        return `<h3>${esc(fr?.label ?? f.label)} <span class="band">${f.band} · ${f.percentile}th</span></h3>` +
          `<p>You're ${esc(readFor(fr, f.band))}</p>` +
          f.subfactors.map((s) => {
            const sr = FACET_READS[s.key]
            return row(sr?.label ?? s.label, s.percentile, `${s.band} · ${s.percentile}th`) +
              (sr
                ? `<p class="facet"><span class="${s.band === "Low" ? "lean" : ""}">Low · ${esc(sr.low)}</span> / <span class="${s.band === "High" ? "lean" : ""}">High · ${esc(sr.high)}</span></p>`
                : "")
          }).join("")
      }).join("")
  }
  if (def.id === "sigma_interest") {
    const r = interestToJce(result.answers)
    return `<h2>Career fit — JCE interest engine</h2><h3>Top job groups</h3>` +
      r.jobs.slice(0, 8).map((g) => row(g.group, g.fitPct, `${g.fitPct}% · ${g.band}`)).join("") +
      `<h3>Best-fit fields of study</h3>` +
      r.education.slice(0, 6).map((g) => row(g.group, g.fitPct, `${g.fitPct}%`)).join("") +
      `<h3>Strongest interest clusters</h3><p>` +
      [...r.clusters].sort((a, b) => b.score - a.score).slice(0, 6).map((c) => `${esc(c.label)} (${c.score})`).join(", ") + `.</p>`
  }
  // aptitude
  const cats = def.factors.map((f) => ({ ...f, value: result.scores[f.key] ?? 0 })).sort((a, b) => b.value - a.value)
  return `<h2>Aptitude &amp; reasoning</h2><p><strong>Overall: ${result.overall}/100</strong></p>` +
    cats.map((f) => row(f.label, f.value, `${f.value}/100`)).join("")
}

function buildHtml(clientName: string, def: TestDef, result: StoredTestResult): string {
  const date = new Date(result.takenAt).toLocaleDateString([], { day: "numeric", month: "long", year: "numeric" })
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(def.name)} — ${esc(clientName)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,system-ui,sans-serif;color:#15171a;max-width:760px;margin:0 auto;padding:40px 28px}
    .brand{display:flex;align-items:center;gap:10px;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:8px}
    .wm{font-family:Georgia,"Cambo",serif;font-size:18px} .sub-brand{margin-left:auto;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:#6b7280}
    h1{font-family:Georgia,"Cambo",serif;font-size:28px;margin:18px 0 2px} .meta{color:#9ca3af;font-size:12px;margin-bottom:22px}
    h2{font-size:16px;margin:26px 0 8px} h3{font-size:13.5px;color:#15171a;margin:22px 0 6px} h3 .band{font-weight:400;font-size:11px;color:#9ca3af;margin-left:6px}
    .lead{color:#6b7280;font-size:12px;line-height:1.55;margin:0 0 16px} .facet{color:#9ca3af;font-size:11px;line-height:1.5;margin:-4px 0 12px} .facet .lean{color:#15171a;font-weight:600}
    p{font-size:13px;line-height:1.6} .row{margin:0 0 10px} .rl{display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px}
    .rl .sub{color:#9ca3af;font-size:11.5px} .track{height:6px;background:#eef0f2;border-radius:99px;overflow:hidden} .fill{height:100%;background:#165794;border-radius:99px}
    .footer{margin-top:28px;border-top:1px solid #e5e7eb;padding-top:10px;color:#9ca3af;font-size:10.5px}
  </style></head><body>
    <div class="brand"><span class="wm">Setmycareer</span><span class="sub-brand">Career Test report</span></div>
    <h1>${esc(def.name)}</h1>
    <div class="meta">${esc(clientName)} · Taken ${esc(date)} · ${esc(def.source ?? "SetMyCareer Career Tests")}</div>
    ${reportBody(def, result)}
    <div class="footer">Generated by SetMyCareer from the client's completed assessment. The full Career Intelligence Report synthesises this with their other instruments.</div>
  </body></html>`
}

/** Generate + upload the report for a completed test to the client's live record.
 *  Returns true on success. Confirm-gated; no-op when live writes are disabled. */
export async function uploadTestReport(clientId: string, clientName: string, def: TestDef, result: StoredTestResult): Promise<boolean> {
  if (!SMC_WRITES_ENABLED) {
    toast("Saving to your profile isn't enabled in this environment.")
    return false
  }
  const ok = window.confirm(`Save your ${def.name} report to your SetMyCareer profile?\n\nYour counsellor will be able to see it.`)
  if (!ok) return false
  const html = buildHtml(clientName, def, result)
  const file = new File([html], `${def.name.replace(/[^\w]+/g, "_")}.html`, { type: "text/html" })
  try {
    await uploadReport(String(clientId), `${def.name} — ${clientName}`, file)
    invalidateUser(clientId) // refetch this client's reports everywhere
    toast.success("Report saved to your profile — your counsellor can now see it.")
    return true
  } catch (e) {
    toast.error((e as Error).message || "Couldn't save the report. Please try again.")
    return false
  }
}
