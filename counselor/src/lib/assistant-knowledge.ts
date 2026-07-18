// Knowledge brief for the counsellor's Compass copilot (the full-screen Assistant
// and the floating CompassBar). Turns the counsellor's LIVE account — their real
// caseload (SoldService/getclientbynaviId), today's real sessions, and the
// platform's scoring methodology — into a compact context string the agent reasons
// over. An @mentioned (or currently-open) client gets a deep, LIVE dossier appended
// (profile, sessions, reports, notes, assessments, and any recorded transcript) so
// the agent can answer specifics without inventing anything.
//
// Everything here is sourced from the live backend, NOT the demo store (which is
// now empty). The builders are pure/async and take the live caseload as input —
// the React surfaces read it from the live-queries hooks (see counsellor-brief.ts)
// and pass it in, since buildKnowledge can't call hooks itself.

import { query } from "./live-queries"
import {
  userView, getUserSessions, getUserReports, getUserNotes,
  type UserSession, type SessionNoteRow, type UserDetail,
} from "./smc-live-api"
import type { ReportData } from "./smc-api"
import { readClientTestResults, type SharedTestResult } from "./shared-store"
import { listRecordings } from "./recordings-store"

// ── shared helpers ────────────────────────────────────────────────────────────

const clean = (v?: unknown): string | undefined => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" && s !== "undefined" ? s : undefined
}
const initialsOf = (name: string): string => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}
// caseload service_date is US "M/D/YYYY h:mm:ss AM/PM"
const parseServiceDate = (s?: unknown): number => {
  const str = clean(s)
  if (!str) return 0
  const m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM))?/i)
  if (!m) { const t = Date.parse(str); return Number.isNaN(t) ? 0 : t }
  let H = m[4] ? +m[4] : 0
  if (m[7]) { const ap = m[7].toUpperCase(); if (ap === "PM" && H < 12) H += 12; if (ap === "AM" && H === 12) H = 0 }
  return new Date(+m[3], +m[1] - 1, +m[2], H, m[5] ? +m[5] : 0, m[6] ? +m[6] : 0).getTime()
}
// booked-session start: session_date "DD/MM/YYYY" + session_time "06:00 PM - 07:00 PM"
const parseSessionStart = (date?: string, time?: string): number => {
  if (!date) return 0
  const dm = String(date).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!dm) return 0
  let H = 0, M = 0
  const tm = String(time ?? "").trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i)
  if (tm) { H = +tm[1]; M = +tm[2]; const ap = tm[3]?.toUpperCase(); if (ap === "PM" && H < 12) H += 12; if (ap === "AM" && H === 12) H = 0 }
  return new Date(+dm[3], +dm[2] - 1, +dm[1], H, M).getTime()
}
const fmtDate = (ts: number): string | undefined =>
  ts ? new Date(ts).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : undefined
// parse a loose date STRING (ISO, US, or DD/MM/YYYY) to a short label; fall back to raw
const fmtDateStr = (s?: unknown): string | undefined => {
  const str = clean(s)
  if (!str) return undefined
  const us = parseServiceDate(str)
  if (us) return fmtDate(us)
  const dm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dm) return fmtDate(new Date(+dm[3], +dm[2] - 1, +dm[1]).getTime())
  const t = Date.parse(str)
  return Number.isNaN(t) ? str : fmtDate(t)
}

// ── live caseload ─────────────────────────────────────────────────────────────

/** One folded client from the counsellor's live caseload (getclientbynaviId
 *  returns one row per sold service; we fold them into one record per client). */
export interface AiCaseClient {
  id: string
  name: string
  initials: string
  packages: string[]
  services: number
  lastTs: number
  lastLabel?: string
  modes: string[]
}

/** Fold the raw navi-caseload rows into one record per client, newest-first. */
export function foldCaseload(data: unknown): AiCaseClient[] {
  const rows = (Array.isArray(data) ? data : []) as Record<string, unknown>[]
  const byId = new Map<string, AiCaseClient>()
  for (const r of rows) {
    const id = String(r.user_id ?? r.id ?? "").trim()
    if (!id || id === "undefined") continue
    const name = clean(r.name) ?? `Client ${id}`
    const c = byId.get(id) ?? { id, name, initials: initialsOf(name), packages: [], services: 0, lastTs: 0, lastLabel: undefined, modes: [] }
    c.services += 1
    const pkg = clean(r.package_name); if (pkg && !c.packages.includes(pkg)) c.packages.push(pkg)
    const md = clean(r.mode); if (md && !c.modes.includes(md)) c.modes.push(md)
    const ts = parseServiceDate(r.service_date)
    if (ts > c.lastTs) { c.lastTs = ts; c.lastLabel = fmtDate(ts) }
    byId.set(id, c)
  }
  return [...byId.values()].sort((a, b) => b.lastTs - a.lastTs)
}

/** A client for the "@" mention autocomplete (full-screen assistant composer). */
export interface MentionClient { id: string; name: string; initials: string; headline: string; riskFlag?: "none" | "low" | "moderate" | "high" }

/** Map the live caseload to the composer's mention list. Live clients carry no
 *  risk flag (the backend doesn't track one), so it's always "none". */
export function toMentionClients(cs: AiCaseClient[]): MentionClient[] {
  return cs.map((c) => ({ id: c.id, name: c.name, initials: c.initials, headline: c.packages.join(" · ") || "Client", riskFlag: "none" }))
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
// Whole-word containment, so "Ana" doesn't match inside "banana".
const wordBoundaryIncludes = (haystack: string, needle: string): boolean => {
  try { return new RegExp(`(?:^|\\W)${escapeRegex(needle)}(?:\\W|$)`, "i").test(haystack) } catch { return haystack.includes(needle) }
}

/** Clients referenced in a message (by @firstname / @fullname, or a full name).
 *  CRITICAL: a real caseload has thousands of clients, some with a single common
 *  word for a name ("Day", "My", "Raj") — so an IMPLICIT (no-@) match requires a
 *  multi-token full name on word boundaries, or "summarise my day" would pull a
 *  random client's dossier. An explicit @mention always resolves. */
export function clientsMentioned(text: string, cs: AiCaseClient[]): AiCaseClient[] {
  const t = text.toLowerCase()
  const out: AiCaseClient[] = []
  for (const c of cs) {
    const name = c.name.toLowerCase().trim()
    if (!name) continue
    const tokens = name.split(/\s+/).filter(Boolean)
    const first = tokens[0]
    if ((first && t.includes("@" + first)) || t.includes("@" + name)) { out.push(c); continue }
    if (tokens.length >= 2 && wordBoundaryIncludes(t, name)) out.push(c)
  }
  return out
}

const METHODOLOGY = `HOW THE PLATFORM'S SCORES ARE BUILT (background — use to explain "why" a number reads as it does when a client actually has these scores; do NOT invent them for a client who has none):
- Career Index (cx.career_index, 0–100): a weighted roll-up of 31 person–career signals (pc.*) grouped into 5 clusters — Direction & identity, Market readiness, Execution & momentum, Confidence & decision, Network & environment. Signals are scored from session evidence; cluster averages roll into the index, and higher-confidence signals carry more weight.
- Confidence (none → low → tentative → moderate → high): each signal's confidence reflects how much corroborating evidence exists. Low-confidence signals are down-weighted — so a high index at low confidence means "promising but thinly evidenced".
- Life-performance / Bloom index (cx.bloom_index): a broader flourishing measure blending career progress with wellbeing and engagement.
- Wellbeing (index 0–100 + band Heavy/Steady/Bright): from clinical check-ins (PHQ-2 / GAD-7-style proxies), sleep, energy and engagement notes. The risk flag (none/low/moderate/high) escalates as markers cross thresholds.
- Alliance / engagement / adherence (0–100): relationship and follow-through measures from session cadence and kept commitments.
- Contradiction detection: flags when the career index climbs while wellbeing falls (or vice-versa) — the "climbing, at what cost" signal — so the counselor protects reserves.
- Approval gate: client-facing reads only reach the client app once the counselor approves them. Exact weights are internal — explain shape and inputs, never fabricate precise weights.`

const ROSTER_CAP = 80

/** The always-on brief: counselor identity, real caseload roster, methodology. */
export function buildCaseloadKnowledge(cs: AiCaseClient[], opts: { counselorName?: string } = {}): string {
  const counselor = opts.counselorName?.trim() || "Counsellor"
  if (cs.length === 0) {
    return [
      `COUNSELLOR: ${counselor}.`,
      "PRACTICE: no clients are on your live caseload yet, or your caseload is still loading from the SetMyCareer backend. Don't invent clients — if asked about your caseload, say it's empty or still loading.",
      "",
      METHODOLOGY,
    ].join("\n")
  }
  const totalServices = cs.reduce((n, c) => n + c.services, 0)
  const shown = cs.slice(0, ROSTER_CAP)
  const roster = shown
    .map((c) => {
      const pk = c.packages.length ? c.packages.join(", ") : "—"
      const md = c.modes.length ? ` · ${c.modes.map((m) => (m === "Offline" ? "in-person" : m.toLowerCase())).join("/")}` : ""
      const last = c.lastLabel ? ` · last ${c.lastLabel}` : ""
      return `- ${c.name} (${c.initials}) · ${pk} · ${c.services} ${c.services === 1 ? "service" : "services"}${md}${last}.`
    })
    .join("\n")

  return [
    `COUNSELLOR: ${counselor}.`,
    `PRACTICE: ${cs.length.toLocaleString("en-IN")} clients on your live caseload; ${totalServices.toLocaleString("en-IN")} services on record.`,
    "",
    `CASELOAD${cs.length > ROSTER_CAP ? ` (most-recent ${ROSTER_CAP} of ${cs.length.toLocaleString("en-IN")} — @mention or open any client for their full live record)` : ""}:`,
    roster,
    "",
    "WHAT THE BACKEND TRACKS PER CLIENT: who your clients are, the packages/services they took with you, their sessions, report PDFs, and your notes. It does NOT yet track a per-client career index, journey stage, wellbeing band or risk flag — so never state or invent those numbers for a live client. For a specific client's read, use their LIVE record (@mention them, or open them) and be honest about what isn't measured yet.",
    "",
    METHODOLOGY,
  ].join("\n")
}

/** The live "TODAY" snapshot from the counsellor's real dashboard-sessions feed
 *  (getclientbynaviIdNavi). Uses the real current date — never a hardcoded one. */
export function buildTodayLine(sessionData: unknown): string {
  const rows = (Array.isArray(sessionData) ? sessionData : []) as Record<string, unknown>[]
  const now = new Date()
  const startToday = new Date(now); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(now); endToday.setHours(23, 59, 59, 999)
  const floor = startToday.getTime(), ceil = endToday.getTime()

  const todays: { ts: number; name: string; label: string; time?: string; status?: string }[] = []
  let upcoming = 0
  for (const r of rows) {
    const status = (clean(r.session_status) ?? "").toLowerCase()
    if (status === "deleted" || status === "cancelled") continue
    const ts = parseSessionStart(clean(r.session_date), clean(String(r.session_time ?? "")))
    if (!ts) continue
    if (ts >= floor && ts <= ceil) {
      todays.push({
        ts,
        name: clean(r.name) ?? (clean(r.user_id) ? `Client ${clean(r.user_id)}` : "a client"),
        label: clean(r.session_name) ?? "session",
        time: clean(String(r.session_time ?? "")),
        status,
      })
    } else if (ts > ceil) upcoming++
  }
  todays.sort((a, b) => a.ts - b.ts)

  const dateLabel = now.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const sess = todays.length
    ? todays.map((t) => `${t.time || new Date(t.ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} ${t.name} — ${t.label}`).join("; ")
    : "no sessions booked"
  const up = upcoming > 0 ? ` ${upcoming} more session${upcoming === 1 ? "" : "s"} booked ahead.` : ""
  return `Today is ${dateLabel}. Sessions today: ${sess}.${up}`
}

// ── deep, LIVE per-client dossier (appended on @mention / open) ────────────────

/** Cap a single client's dossier so multiple @mentions can't blow up context. */
const DOSSIER_CHAR_CAP = 12_000

// Recorded-session transcripts live ON-DEVICE (IndexedDB), keyed by client NAME.
// This is the only real transcript source for a live client — matched by name,
// best-effort. Never throws.
async function readClientRecordings(name: string): Promise<{ startedAt: string; transcript: { speaker: string; text: string }[] }[]> {
  try {
    const recs = await listRecordings()
    const target = name.trim().toLowerCase()
    return recs
      .filter((r) => r.transcript && r.transcript.length > 0 && (r.clientName ?? "").trim().toLowerCase() === target)
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((r) => ({ startedAt: r.startedAt, transcript: r.transcript! }))
  } catch { return [] }
}

/**
 * Deep brief for ONE client — appended when the counsellor @mentions them (or is
 * viewing them). Pulls the client's LIVE record from the backend (profile,
 * sessions, reports, notes) plus their shared assessments and any on-device
 * recorded transcript, and lays it out as grounded plain text. Degrades honestly:
 * when a section has no data it says so, and when there's no transcript it tells
 * the model NOT to quote one. Reads through the same cache keys the client-detail
 * screen uses, so an already-open client resolves instantly.
 */
export async function buildLiveClientDossier(c: AiCaseClient): Promise<string> {
  const id = c.id
  const [profile, sessions, reports, notes, tests, recordings] = await Promise.all([
    query<UserDetail>(`user:${id}`, () => userView(id)).catch(() => undefined),
    query<UserSession[]>(`sessions:${id}`, () => getUserSessions(id)).catch(() => [] as UserSession[]),
    query<ReportData[]>(`reports:${id}`, () => getUserReports(id)).catch(() => [] as ReportData[]),
    query<SessionNoteRow[]>(`notes:${id}`, () => getUserNotes(id)).catch(() => [] as SessionNoteRow[]),
    readClientTestResults(id),
    readClientRecordings(c.name),
  ])

  const out: string[] = []
  out.push(`# CLIENT DOSSIER — ${c.name} (${id})`)
  out.push(
    `This is ${c.name}'s LIVE record from the SetMyCareer backend — ground every statement about this client in what's below. ` +
      `The backend does NOT track a career index, life-performance/bloom index, wellbeing band, psychometric profile or risk flag for this client, so do not state or infer those numbers; if asked, say they aren't measured for this client yet.`,
  )

  // Identity
  out.push("\n## Identity")
  out.push(
    [
      `Name: ${clean(profile?.name) ?? c.name}`,
      clean(profile?.category) && `Category: ${clean(profile?.category)}`,
      clean(profile?.mobile) && `Mobile: ${clean(profile?.mobile)}`,
      clean(profile?.email) && `Email: ${clean(profile?.email)}`,
      clean(profile?.gender) && `Gender: ${clean(profile?.gender)}`,
      c.packages.length ? `Packages with you: ${c.packages.join(", ")}` : undefined,
    ].filter(Boolean).join("\n"),
  )

  // Sessions
  const sess = [...(sessions ?? [])].sort((a, b) => parseSessionStart(clean(b.session_date), clean(String(b.session_time ?? ""))) - parseSessionStart(clean(a.session_date), clean(String(a.session_time ?? ""))))
  out.push(`\n## Sessions (${sess.length})`)
  out.push(
    sess.length
      ? sess
          .map((s) => {
            const when = [clean(s.session_date), clean(String(s.session_time ?? ""))].filter(Boolean).join(" ")
            const who = clean(s.navi_name) ? ` · with ${clean(s.navi_name)}` : ""
            return `- ${when || "date —"} · ${clean(s.session_name) ?? `Session ${s.session_id}`} · ${clean(s.session_status) ?? "—"}${who}`
          })
          .join("\n")
      : "No sessions recorded yet.",
  )

  // Reports
  const reps = (reports ?? []).filter((r) => clean(r.report_location) || clean(r.report_name))
  out.push(`\n## Reports (${reps.length})`)
  out.push(
    reps.length
      ? reps
          .map((r) => {
            const gen = fmtDateStr(r.created_at)
            return `- ${clean(r.report_name) ?? "SetMyCareer report"}${gen ? ` (generated ${gen})` : ""}${clean(r.report_location) ? ` — ${clean(r.report_location)}` : ""}`
          })
          .join("\n")
      : "No reports generated for this client yet.",
  )

  // Assessments (shared test results the client completed)
  out.push(`\n## Assessments (${tests.length})`)
  out.push(tests.length ? tests.map(assessmentLine).join("\n") : "No Career Tests completed yet.")

  // Counsellor notes
  const nts = (notes ?? []).filter((n) => clean(n.comment))
  out.push(`\n## Counsellor notes (${nts.length})`)
  out.push(
    nts.length
      ? nts.map((n) => `- ${[fmtDateStr(n.date), clean(n.navigator_name)].filter(Boolean).join(" · ") || "Note"}: ${clean(n.comment)}`).join("\n")
      : "No session notes on record yet.",
  )

  // Transcripts — the honest part: only what actually exists on-device
  out.push("\n## Session transcripts")
  if (recordings.length) {
    out.push(`${recordings.length} recorded session transcript${recordings.length === 1 ? "" : "s"} on this device (matched to this client by name). You may quote these verbatim:`)
    for (const rec of recordings) {
      out.push(`\n— Recorded ${fmtDateStr(rec.startedAt) ?? "session"} —`)
      out.push(rec.transcript.map((tn) => `${tn.speaker}: ${tn.text}`).join("\n"))
    }
  } else {
    out.push(
      "No session transcripts are available for this client yet — their sessions haven't been recorded or transcribed. " +
        "Do NOT quote, paraphrase or invent a transcript for this client; answer from the sessions, reports and notes above, and say a transcript isn't available if asked for verbatim quotes.",
    )
  }

  const text = out.join("\n")
  return text.length <= DOSSIER_CHAR_CAP ? text : text.slice(0, DOSSIER_CHAR_CAP) + "\n…[record truncated to keep context within limits]"
}

// testId → a readable label (no dependency on the portal test catalog).
function assessmentLine(t: SharedTestResult): string {
  const name = t.testId.replace(/[-_]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase())
  const when = fmtDateStr(t.takenAt)
  const score = typeof t.overall === "number" && t.overall > 0 ? ` · overall ${t.overall}/100` : ""
  return `- ${name}${when ? ` (${when})` : ""}${score}`
}

// ── the full knowledge for one message ─────────────────────────────────────────

export interface KnowledgeOpts {
  /** The counsellor's live caseload (folded) — the always-on roster. */
  caseload: AiCaseClient[]
  /** Counsellor display name for the brief header. */
  counselorName?: string
  /** A client the counsellor is currently viewing — always include their dossier
   *  even if the message text doesn't name them (e.g. CompassBar on a client page). */
  focusClientId?: string
}

/** Full knowledge for a message: the always-on caseload brief + a deep LIVE
 *  dossier for any @mentioned (or currently-open) client. Async, because the
 *  per-client dossier is fetched live (cached/deduped). */
export async function buildKnowledge(text: string, opts: KnowledgeOpts): Promise<{ knowledge: string; primaryClient?: string }> {
  const { caseload, counselorName, focusClientId } = opts
  const mentioned = clientsMentioned(text, caseload)
  if (focusClientId) {
    const f = caseload.find((c) => c.id === String(focusClientId))
    if (f && !mentioned.some((m) => m.id === f.id)) mentioned.unshift(f)
  }
  const base = buildCaseloadKnowledge(caseload, { counselorName })
  // cap concurrent dossiers so several @mentions can't explode the context/latency
  const dossiers = await Promise.all(mentioned.slice(0, 3).map(buildLiveClientDossier))
  return { knowledge: [base, ...dossiers].join("\n\n"), primaryClient: mentioned[0]?.name }
}
