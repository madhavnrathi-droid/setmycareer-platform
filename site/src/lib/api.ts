// Live SetMyCareer data — open reads straight from the production backend
// (same source the apps use). No keys; CORS-open read endpoints.

import { useEffect, useMemo, useState } from "react"

const BASE = "https://api.setmycareer.com/api/"

// Client login + workspace live in the deployed product app. Clients sign in /
// register (phone-OTP or email) at the portal; counsellors sign in at the app
// root; new experts apply on this marketing site (/experts/apply) which creates
// the account, then hand off to the workspace to finish profile + documents.
export const PORTAL_URL = "https://setmycareer-counselor.vercel.app/portal" // client login / register + student portal
export const COUNSELLOR_URL = "https://setmycareer-counselor.vercel.app/" // counsellor workspace sign-in
export const EXPERT_APPLY_URL = "/experts/apply" // the dedicated onboarding page on this site

export interface Navigator {
  id: number | string
  name?: string
  displayimg?: string
  img?: string
  isActive?: boolean | string
  location?: string
  language?: string
  practicing_expertise?: string
  short_Description?: string
  experiance?: string
  work_Experience?: string
  // richer profile fields (present for many, absent for some — always guard)
  about_navigator?: string
  certifications?: string
  education?: string
  achievments?: string
  navigator_Services?: string
  online_mode?: string
  organzation_working_for?: string
  topic_Study?: string
  [k: string]: unknown
}
// PUBLIC-SAFE fields only — the detail page must NEVER render these: email,
// mobile, contact, meetinglink, address, zoho_calendar_uid/id, order_list.

export interface Stats {
  ClientCount?: number
  NavigatorCount?: number
  SessionCount?: number
  [k: string]: unknown
}

const clean = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" && s !== "undefined" ? s : undefined
}

// The live roster stores expertise/service fields as raw, inconsistently-spelled
// strings ("career_counseling", "CAREER COUNSELING", "Study_Abroad"). Surfacing
// them verbatim put the American "counseling" (one L) beside the site's British
// "counselling" and leaked snake_case onto public cards. Normalise on the way out:
// British spelling, underscores → spaces, single-spaced.
const normLabel = (v?: string) =>
  v?.replace(/_/g, " ")
    .replace(/counsel(l?)ing/gi, "counselling")
    .replace(/counsel(l?)or/gi, "counsellor")
    .replace(/\bresume\b/gi, "résumé")
    .replace(/\s+/g, " ")
    .trim()

// The live roster carries a few internal placeholder rows ("Test", "ZZ LOGIN
// PROBE - delete", …) that must never surface on the public site. Hide anything
// that reads as a test/placeholder rather than a person's name.
const JUNK_NAME = /\b(test|probe|delete|dummy|sample|placeholder|xxx+|asdf|qwerty|do\s*not\s*use)\b/i
export const looksReal = (name?: unknown) => {
  const s = clean(name)
  if (!s || JUNK_NAME.test(s)) return false
  // a real name has at least two letters and isn't just an id/punctuation
  return (s.match(/[A-Za-zÀ-ɏ]/g) ?? []).length >= 2
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path, { headers: { accept: "application/json" } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return (await r.json()) as T
}

// The roster payload is ~117KB and the endpoint occasionally stalls — cache it
// per session so navigation back to /experts is instant, and expose an error +
// retry so a failed load is visible instead of a silent blank grid.
const NAVI_CACHE = "smc-navigators-v1"
const NAVI_TTL = 10 * 60 * 1000

export function useNavigators(limit = 12) {
  const [data, setData] = useState<Navigator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    const accept = (rows: Navigator[]) => {
      const active = (Array.isArray(rows) ? rows : [])
        .filter((n) => { const a = n.isActive; if (a == null) return true; const s = String(a).toLowerCase(); return s === "true" || s === "1" })
        .filter((n) => looksReal(n.name))
      setData(active.slice(0, limit))
      setError(false)
      setLoading(false)
    }
    try {
      const raw = sessionStorage.getItem(NAVI_CACHE)
      if (raw) {
        const { at, rows } = JSON.parse(raw) as { at: number; rows: Navigator[] }
        if (Date.now() - at < NAVI_TTL && Array.isArray(rows) && rows.length) { accept(rows); return () => { alive = false } }
      }
    } catch { /* storage unavailable or corrupt — fall through to fetch */ }
    setLoading(true)
    setError(false)
    get<Navigator[]>("NavigatorList/getAllNavigator")
      .then((rows) => {
        try { sessionStorage.setItem(NAVI_CACHE, JSON.stringify({ at: Date.now(), rows })) } catch { /* quota — skip cache */ }
        if (alive) accept(rows)
      })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [limit, attempt])

  const retry = () => { try { sessionStorage.removeItem(NAVI_CACHE) } catch { /* noop */ } setAttempt((a) => a + 1) }
  return { data, loading, error, retry }
}

// A single counsellor by id, for the dedicated landing page. Reuses the same
// roster payload + session cache as the grid, then finds the row — so every
// existing counsellor AND every future onboard gets a page automatically, with
// no extra endpoint. Returns the full list too, for "recommended" cross-sell.
export function useNavigator(id?: string) {
  const [all, setAll] = useState<Navigator[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    const accept = (rows: Navigator[]) => { setAll(Array.isArray(rows) ? rows : []); setError(false); setLoading(false) }
    try {
      const raw = sessionStorage.getItem(NAVI_CACHE)
      if (raw) {
        const { at, rows } = JSON.parse(raw) as { at: number; rows: Navigator[] }
        if (Date.now() - at < NAVI_TTL && Array.isArray(rows) && rows.length) { accept(rows); return () => { alive = false } }
      }
    } catch { /* fall through */ }
    setLoading(true); setError(false)
    get<Navigator[]>("NavigatorList/getAllNavigator")
      .then((rows) => { try { sessionStorage.setItem(NAVI_CACHE, JSON.stringify({ at: Date.now(), rows })) } catch { /* quota */ } if (alive) accept(rows) })
      .catch(() => { if (alive) { setError(true); setLoading(false) } })
    return () => { alive = false }
  }, [attempt])

  const navigator = useMemo(() => {
    if (!id) return undefined
    const found = all.find((n) => String(n.id) === String(id))
    return found && looksReal(found.name) ? found : undefined
  }, [all, id])
  const active = useMemo(() => all.filter((n) => { const a = n.isActive; if (a == null) return true; const s = String(a).toLowerCase(); return s === "true" || s === "1" }).filter((n) => looksReal(n.name)), [all])
  const retry = () => { try { sessionStorage.removeItem(NAVI_CACHE) } catch { /* noop */ } setAttempt((a) => a + 1) }
  return { navigator, all, active, loading, error, retry }
}

export function useStats() {
  const [data, setData] = useState<Stats | null>(null)
  useEffect(() => {
    let alive = true
    get<Stats & { data?: Stats }>("Admin/GetStatistics")
      .then((d) => { if (alive) setData((d && (d.data ?? d)) as Stats) })
      .catch(() => {})
    return () => { alive = false }
  }, [])
  return data
}

/** Live expert application — the same main-server write the portal recruit flow
 *  uses to create a counsellor account (they then complete profile, documents and
 *  the onboarding agreement inside the portal). */
// Accepts the account fields plus any real navigator columns (about_navigator,
// practicing_expertise, …) — every extra key maps to a column the roster already
// returns, so the insert is safe. New records default to inactive (pending) and
// an admin approves them; we never send isActive.
export async function applyAsExpert(p: { name: string; email: string; password: string } & Record<string, unknown>) {
  const r = await fetch(BASE + "NavigatorDetail/AddNavigator", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(p),
  })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json().catch(() => ({}))
}

// The full domain-expert application (the Master Onboarding Agreement, sections
// A–I + consent). Only account fields reach the server today — the rest is
// captured for the workspace handoff.
export interface ExpertApplication {
  // A — account + personal
  name: string; email: string; password: string
  mobile?: string; whatsapp?: string; city?: string; state?: string; country?: string; linkedin?: string
  // B — professional
  designation?: string; organization?: string; employmentType?: string
  totalExperience?: string; coachingExperience?: string; qualification?: string; certifications?: string; languages?: string
  // C–F — expertise / industries / audience / services
  expertise: string[]; industries: string[]; audience: string[]; services: string[]
  // G — availability
  formats: string[]; days: string[]; slots: string[]
  // H — bio
  bio?: string
  // I — supporting documents & links (links reach the reviewer; files are noted
  // on the application and uploaded securely in the workspace)
  docLinks?: { url: string; note: string }[]
  docFiles?: { name: string; size: number; note: string }[]
  // consent
  consent: boolean[]
}

const APPLICATION_KEY = "smc-expert-application-v1"

// Create the expert account on the live server (the sanctioned write) with the
// submitted profile mapped onto real navigator columns, so an admin reviewing
// the application sees the full submission. The account is created inactive
// (pending) — an admin approves it before it reaches the public roster. Also
// stashes the application locally so nothing the applicant typed is lost.
export async function submitExpertApplication(app: ExpertApplication) {
  const one = (s?: string) => (s && s.trim() ? s.trim() : undefined)
  const list = (a: string[]) => (a.length ? a.join(", ") : undefined)
  const profile: Record<string, unknown> = {
    about_navigator: one(app.bio),
    practicing_expertise: list(app.expertise),
    navigator_Services: list(app.services),
    topic_Study: list(app.industries),
    online_mode: list(app.formats),
    work_Experience: one(app.totalExperience),
    experiance: one(app.coachingExperience) ?? one(app.totalExperience),
    location: one([app.city, app.state].filter(Boolean).join(", ")),
    language: one(app.languages),
    education: one(app.qualification),
    certifications: one(app.certifications),
    organzation_working_for: one(app.organization),
    short_Description: one(app.designation),
    mobile: one(app.mobile),
    contact: one(app.whatsapp) ?? one(app.mobile),
  }
  // supporting documents & links → an INTERNAL long-description note the reviewer
  // sees (not about_navigator, which renders on the public profile). Links are
  // shown as-is; attached files are listed by name (bytes upload in the workspace).
  const docLines: string[] = []
  for (const l of app.docLinks ?? []) { const u = one(l.url); if (u) docLines.push(`Link: ${u}${one(l.note) ? ` — ${l.note!.trim()}` : ""}`) }
  for (const d of app.docFiles ?? []) docLines.push(`File: ${d.name} (${(d.size / 1048576).toFixed(1)} MB)${one(d.note) ? ` — ${d.note!.trim()}` : ""} [to upload in workspace]`)
  if (docLines.length) profile.about_navigator_full_des = "Supporting documents & links —\n" + docLines.join("\n")
  for (const k of Object.keys(profile)) if (profile[k] === undefined) delete profile[k]
  const res = await applyAsExpert({ name: app.name.trim(), email: app.email.trim(), password: app.password, ...profile })
  try {
    const { password: _pw, ...safe } = app // never persist the password
    localStorage.setItem(APPLICATION_KEY, JSON.stringify({ ...safe, submittedAt: new Date().toISOString() }))
  } catch { /* storage may be unavailable — the account still exists */ }
  return res
}

export const naviImage = (n: Navigator) => clean(n.displayimg) ?? clean(n.img)
export const naviExpertise = (n: Navigator) =>
  normLabel(clean(n.practicing_expertise)?.split(/[,;/|]/)[0]?.trim() ?? clean(n.short_Description)?.split(/[.,]/)[0]?.trim() ?? clean(n.navigator_Services)?.split(/[,]/)[0]?.trim())
export const cleanField = clean

// counsellor field helpers (all guard for missing/"None")
export const naviYears = (n: Navigator) => (clean(n.experiance) ?? clean(n.work_Experience))?.match(/\d+\+?/)?.[0]
export const naviBio = (n: Navigator) => clean(n.about_navigator) ?? clean(n.work_Experience) ?? clean(n.experiance)
export const naviTags = (n: Navigator, max = 8) =>
  (clean(n.practicing_expertise)?.split(/[,;/|]/).map((s) => normLabel(s.trim())!).filter(Boolean).slice(0, max)) ?? []

const SERVICE_LABELS: Record<string, string> = {
  career_counseling: "Career counselling", career_counselling: "Career counselling",
  personality_development: "Personality development", coaching_mentoring: "Coaching & mentoring",
  psychological_counseling: "Psychological counselling", psychometric_assessment: "Psychometric assessment",
  interview_preparation: "Interview preparation", resume_building: "Résumé building",
  study_abroad: "Study-abroad guidance", admission_guidance: "Admission guidance",
}
export const naviServices = (n: Navigator) =>
  (clean(n.navigator_Services)?.split(/[,]/).map((s) => s.trim()).filter(Boolean)
    .map((s) => SERVICE_LABELS[s.toLowerCase()] ?? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))) ?? []

// normalised, public-safe helpers used to keep the detail page's record full
// even when the free-text credential fields are blank (these three are ~100%
// covered on the live roster: language, online_mode, navigator_Services).
export const naviLanguages = (n: Navigator) =>
  clean(n.language)?.replace(/^speaks\s+/i, "").split(/[,/]/).map((s) => s.trim()).filter(Boolean).join(", ")
export const naviMode = (n: Navigator) =>
  clean(n.online_mode)?.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
    .map((s) => s.replace(/\b\w/g, (c) => c.toUpperCase())).join(" · ")
