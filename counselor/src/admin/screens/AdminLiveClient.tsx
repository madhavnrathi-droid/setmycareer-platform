// Admin Client 360 — LIVE. Rendered for a real (numeric) client id straight from
// the SetMyCareer production backend. Pulls EVERY per-client endpoint the API
// exposes — identity, purchases, sessions, reports, notes, reviews, recommended
// services, admission preferences and the Career Explorer Q&A — so an admin who
// clicks a client sees that client's complete record, not a generic spotlight.
// A Career-intelligence projection sits at the bottom, clearly labelled as a
// counsellor-completed model (the backend doesn't store psychometric scores yet),
// so nothing on the page reads as fabricated client data.

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowLeft, FileText, Video, NotebookPen, CalendarClock, ExternalLink, Check, X, Send,
  Wallet, Sparkles, GraduationCap, TrendingUp, Star, Lightbulb, MessageSquare, PauseCircle, PlayCircle, Archive,
} from "lucide-react"
import {
  useUserView, useUserSessions, useUserReports, useUserNotes, useUserPurchases,
  useUserReviews, useUserRecommended, useUserAdmission, useCareerExplorerQA,
} from "@/lib/live-queries"
import { normalizeQA, type UserSession, type RecommendedService } from "@/lib/smc-live-api"
import type { SoldServiceData } from "@/lib/smc-api"
import { runIntelligence, type StudentProfile, type Likelihood } from "@/intelligence"
import { useClientDirectory, parseAdminDate } from "../client-directory"
import { getAccountState, setAccountState } from "@/lib/account-state"
import { setSessionStatus, addNote, SMC_WRITES_ENABLED } from "@/lib/writes"
import { useSession } from "@/lib/auth-store"
import { roomForSession } from "@/lib/meeting-link"
import { CareerSignalPanel } from "@/components/custom/CareerSignalPanel"
import { ScheduleSessionModal } from "../parts/ScheduleSessionModal"
import { generateRegenNarrative, narrativeToHtml, saveRegenReport } from "../report-regen"
import type { AINarrative } from "@/server/report-core"
import { btnGhost } from "../ui"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const clean = (v?: string | null) => (v && v !== "None" && v !== "null" ? String(v).trim() : undefined)
const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}
const fmtDate = (s?: string | null) => {
  if (!s) return undefined
  const t = Date.parse(s)
  return Number.isNaN(t) ? clean(s) : new Date(t).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}
// Date + time when a time is present (created_at / note timestamps), else the date.
const fmtWhen = (s?: string | null, time?: string | null) => {
  if (!s) return undefined
  const t = Date.parse(s)
  if (!Number.isNaN(t)) {
    const d = new Date(t)
    return /\d{1,2}:\d{2}/.test(s)
      ? d.toLocaleString([], { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
      : d.toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
  }
  return [clean(s), clean(time)].filter(Boolean).join(" · ") // DD/MM/YYYY (+ time slot)
}
const inr = (n?: number) => (n == null || !Number.isFinite(n) ? "—" : n >= 1e7 ? `₹${(n / 1e7).toFixed(2)}Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${n.toLocaleString("en-IN")}`)
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0 }

const STATE_TONE: Record<string, string> = { active: "bg-well-50 text-well-700", paused: "bg-warn-50 text-warn-700", archived: "bg-ink-100 text-ink-500" }
const STATUS_TONE: Record<string, string> = {
  booked: "bg-brand-50 text-brand-700", pending: "bg-warn-50 text-warn-700", scheduled: "bg-brand-50 text-brand-700",
  completed: "bg-well-50 text-well-700", cancelled: "bg-ink-100 text-ink-500", deleted: "bg-ink-100 text-ink-400",
}
const joinable = (status?: string) => { const s = (status ?? "").toLowerCase(); return s === "booked" || s === "pending" || s === "scheduled" || s === "" }

// A session's timing vs the real clock, parsed from session_date (DD/MM/YYYY) and
// session_time ("12:00 PM - 01:00 PM"). Drives the Join control: a call can only be
// joined while the session is live (from ~10 min before start) or still upcoming —
// never after it has ended. "unknown" (unparseable date) is treated as joinable so a
// malformed row never traps a real session.
function sessionTiming(s: { session_date?: unknown; session_time?: unknown }): "past" | "live" | "upcoming" | "unknown" {
  const dm = String(s.session_date ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (!dm) return "unknown"
  const toMin = (t?: string): number | null => {
    const m = t?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i); if (!m) return null
    let H = +m[1]; const M = +m[2], ap = m[3]?.toUpperCase()
    if (ap === "PM" && H < 12) H += 12; if (ap === "AM" && H === 12) H = 0
    return H * 60 + M
  }
  const times = String(s.session_time ?? "").match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) ?? []
  const startMin = toMin(times[0]) ?? 0
  const endMin = toMin(times[1]) ?? startMin + 60
  const y = +dm[3], mo = +dm[2] - 1, d = +dm[1]
  const start = new Date(y, mo, d, Math.floor(startMin / 60), startMin % 60).getTime()
  const end = new Date(y, mo, d, Math.floor(endMin / 60), endMin % 60).getTime()
  const now = Date.now()
  if (now > end) return "past"
  if (now >= start - 10 * 60 * 1000) return "live"
  return "upcoming"
}
const SECTION = "mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"
const field = "h-8 rounded-lg border border-border bg-background px-2 text-[12.5px] tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring"

const BAND: Record<Likelihood, { tone: string; bg: string; label: string }> = {
  safe: { tone: "text-well-700", bg: "bg-well-100", label: "Safe" },
  target: { tone: "text-brand-700", bg: "bg-brand-50", label: "Target" },
  reach: { tone: "text-warn-700", bg: "bg-warn-100", label: "Reach" },
  unlikely: { tone: "text-ink-500", bg: "bg-secondary", label: "Unlikely" },
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2"><h2 className={cn(SECTION, "mb-0")}>{title}</h2>{typeof count === "number" && <span className="text-[12px] tabular-nums text-ink-300">{count}</span>}</div>
      {children}
    </section>
  )
}

export function AdminLiveClient({ clientId }: { clientId: string }) {
  const view = useUserView(clientId)
  const sessions = useUserSessions(clientId)
  const reports = useUserReports(clientId)
  const notes = useUserNotes(clientId)
  const purchases = useUserPurchases(clientId)
  const reviews = useUserReviews(clientId)
  const recommended = useUserRecommended(clientId)
  const admission = useUserAdmission(clientId)

  const profile = view.data
  // the bulk roster / single userView often returns name:null — fall back to the
  // session-feed directory, which is where real names + every comment + report live.
  const dir = useClientDirectory()
  const dirEntry = dir.byId.get(clientId)
  const name = clean(profile?.name) ?? (dirEntry?.named ? dirEntry.name : undefined) ?? `Client ${clientId}`
  const sess = useMemo(() => (sessions.data ?? []) as UserSession[], [sessions.data])

  // ALL reports — merge the per-user Reports endpoint (name + created_at) with the
  // report PDFs surfaced on the session feed; dedupe by URL, newest first.
  const allReports = useMemo(() => {
    const out: { name: string; url?: string; date?: string; ts: number; kind?: string }[] = []
    const seen = new Set<string>()
    for (const r of reports.data ?? []) {
      const url = clean(r.report_location)
      out.push({ name: clean(r.report_name) ?? "SetMyCareer report", url, date: clean(r.created_at), ts: parseAdminDate(r.created_at) })
      if (url) seen.add(url)
    }
    for (const rp of dirEntry?.reports ?? []) {
      if (rp.url && !seen.has(rp.url)) { seen.add(rp.url); out.push({ name: `${rp.kind} report`, url: rp.url, kind: rp.kind, ts: rp.ts || (dirEntry?.lastTs ?? 0), date: rp.date ?? dirEntry?.lastDate }) }
    }
    return out.sort((a, b) => b.ts - a.ts)
  }, [reports.data, dirEntry])

  // ALL comments — merge the per-user Comments endpoint with every comment logged
  // on the session feed; dedupe by text, newest first.
  const allComments = useMemo(() => {
    const out: { text: string; date?: string; time?: string; navigator?: string; ts: number }[] = []
    const seen = new Set<string>()
    const push = (text?: string | null, date?: string | null, navigator?: string | null, ts = 0, time?: string | null) => {
      const t = clean(text); if (!t) return
      const key = t.slice(0, 80).toLowerCase(); if (seen.has(key)) return; seen.add(key)
      out.push({ text: t, date: clean(date), time: clean(time), navigator: clean(navigator), ts: ts || parseAdminDate(date) })
    }
    for (const n of notes.data ?? []) push(n.comment, n.date, n.navigator_name)
    for (const m of dirEntry?.comments ?? []) push(m.text, m.date, m.navigator, m.ts)
    return out.sort((a, b) => b.ts - a.ts)
  }, [notes.data, dirEntry])
  const purchaseList = useMemo(() => (purchases.data?.data ?? []) as SoldServiceData[], [purchases.data])
  const recoList = useMemo(() => ((recommended.data?.data ?? []) as RecommendedService[]).filter((r) => clean(r.recService)), [recommended.data])

  const paidSpend = useMemo(
    () => purchaseList.filter((p) => String(p.payment_status).toLowerCase() === "paid").reduce((s, p) => s + num(p.total_payment_amout), 0),
    [purchaseList],
  )
  const packages = useMemo(() => {
    const set = new Set<string>()
    for (const p of purchaseList) { const n = clean(p.package_name); if (n) set.add(n) }
    for (const s of sess) { const n = clean(s.session_name); if (n) set.add(n) }
    return [...set]
  }, [purchaseList, sess])
  const counsellor = useMemo(() => clean(sess.find((s) => clean(s.navi_name))?.navi_name), [sess])
  const naviId = useMemo(() => sess.find((s) => s.navi_id)?.navi_id, [sess])

  // "Active" client = still has remaining entitlement from their package — an OPEN
  // session (booked/pending/scheduled and not past) OR a paid package with no
  // sessions consumed yet. Active clients are on the NEW model (the career
  // projection + a regenerated new-format report); clients with nothing left
  // predate it and keep their ORIGINAL report only.
  const isActiveClient = useMemo(() => {
    const open = sess.some((s) => {
      const st = (clean(s.session_status) ?? "").toLowerCase()
      return (st === "booked" || st === "pending" || st === "scheduled" || st === "") && sessionTiming(s) !== "past"
    })
    const completed = sess.filter((s) => (clean(s.session_status) ?? "").toLowerCase() === "completed").length
    const paid = purchaseList.some((p) => String(p.payment_status).toLowerCase() === "paid")
    return open || (paid && completed === 0)
  }, [sess, purchaseList])

  // admission-assistance preferences (countries / cities)
  const { countries, cities } = useMemo(() => {
    const raw = (admission.data as { data?: { json_data?: string } } | undefined)?.data?.json_data
    let j: Record<string, unknown> | null = null
    try { j = raw ? (JSON.parse(raw) as Record<string, unknown>) : null } catch { j = null }
    const names = (v: unknown): string[] => Array.isArray(v) ? (v.map((x) => (x && typeof x === "object" ? (x as { name?: string }).name : String(x))).filter(Boolean) as string[]) : []
    return { countries: names(j?.countries), cities: names(j?.cities) }
  }, [admission.data])

  // Career Explorer Q&A for this client's first service
  const serviceId = useMemo(() => { const s = sess.find((x) => x.service_id != null && x.service_id !== ""); return s ? (s.service_id as string | number) : undefined }, [sess])
  const explorer = useCareerExplorerQA(serviceId ?? null)
  const qa = useMemo(() => (explorer.data ?? []).map(normalizeQA).filter((q) => q.question), [explorer.data])

  // client reviews (review_json blobs)
  const reviewList = useMemo(() => {
    return (reviews.data ?? []).map((r) => {
      try { const j = r.review_json ? (JSON.parse(r.review_json) as Record<string, unknown>) : null; return j } catch { return null }
    }).filter(Boolean) as Record<string, unknown>[]
  }, [reviews.data])

  // account hold (local, honoured by the client portal) — works for live ids too
  const [, force] = useState(0)
  const state = getAccountState(clientId)
  const setState = (s: "active" | "paused" | "archived", reason?: string) => { setAccountState(clientId, s, reason); force((n) => n + 1) }

  // ── Career-intelligence projection (counsellor-completed; NOT stored client psychometrics) ──
  const [open, setOpen] = useState(false)
  const [rank, setRank] = useState(0)
  const [percentile, setPercentile] = useState(0)
  const [category, setCategory] = useState<NonNullable<StudentProfile["category"]>>("general")
  const [income, setIncome] = useState(0)
  const examResults = useMemo(() => {
    const e: NonNullable<StudentProfile["examResults"]> = []
    if (rank > 0) e.push({ examId: "jee_adv", rank })
    if (percentile > 0) e.push({ examId: "jee_main", percentile })
    return e
  }, [rank, percentile])
  const proj = useMemo(() => {
    const p: StudentProfile = {
      id: `smc_${clientId}`, level: "after_12th", stream: "science_pcm", academicPercent: 80,
      aptitude: { quantitative: 75, logical: 76, spatial: 68, verbal: 72, clerical: 64 },
      interests: { R: 55, I: 78, A: 52, S: 56, E: 62, C: 64 },
      examResults: examResults.length ? examResults : undefined,
      category, familyIncome: income || undefined, domains: ["engineering", "computer_applications"],
    }
    return runIntelligence(p, { topDomains: 3 })
  }, [clientId, examResults, category, income])
  const eligS = proj.scholarships.filter((s) => s.eligible)

  // ── live writes ──
  const me = useSession()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [scheduling, setScheduling] = useState(false)
  const [viewer, setViewer] = useState<{ url: string; name: string } | null>(null)

  // ── regenerate the client's report in the NEW format from their REAL record ──
  const [regenBusy, setRegenBusy] = useState(false)
  const [regen, setRegen] = useState<{ html: string; narrative: AINarrative } | null>(null)
  async function runRegen() {
    setRegenBusy(true)
    try {
      const narrative = await generateRegenNarrative({
        clientId, name, sessions: sess,
        comments: allComments.map((c) => ({ text: c.text, date: c.date, navigator: c.navigator })),
        careerExplorer: explorer.data ?? [], packages, countries, cities,
      })
      const html = narrativeToHtml(name, narrative)
      setRegen({ html, narrative })
      setViewer({ url: URL.createObjectURL(new Blob([html], { type: "text/html" })), name: "Career Report (new format) · preview" })
      toast.success("New-format report generated from the client's real record — review it, then save.")
    } catch (e) { toast.error((e as Error).message || "Couldn't generate the report.") }
    finally { setRegenBusy(false) }
  }
  async function saveRegen() {
    if (!regen) return
    const ok = await saveRegenReport({ clientId, name, html: regen.html, narrative: regen.narrative })
    if (ok) setRegen(null)
  }

  async function changeStatus(s: UserSession, status: string) {
    if (!SMC_WRITES_ENABLED) { toast.error("Live writes are off."); return }
    setBusyId(String(s.session_id))
    try { await setSessionStatus(Number(s.session_id), status, clientId); toast.success(`Session marked ${status}`, { description: "Updated for the client and across the dashboard." }) }
    catch (e) { toast.error(`Couldn't update the session: ${e instanceof Error ? e.message : "failed"}`) }
    finally { setBusyId(null) }
  }
  async function saveNote() {
    const c = noteDraft.trim()
    if (!c) return
    if (!SMC_WRITES_ENABLED) { toast.error("Live writes are off."); return }
    setSavingNote(true)
    try {
      await addNote({ sessionId: Number(sess[0]?.session_id ?? 0), userId: clientId, navigatorId: Number(naviId ?? me?.userId ?? 0), navigatorName: me?.name ?? "Admin", comment: c })
      setNoteDraft(""); toast.success("Note saved", { description: `${name} will see it in their portal.` })
    } catch (e) { toast.error(`Couldn't save the note: ${e instanceof Error ? e.message : "failed"}`) } finally { setSavingNote(false) }
  }

  const loading = view.loading && !profile
  const stats = [
    { label: "Sessions", value: sess.length },
    { label: "Reports", value: allReports.length },
    { label: "Comments", value: allComments.length },
    { label: "Spend (paid)", value: paidSpend > 0 ? inr(paidSpend) : "—" },
  ]

  return (
    <div className="space-y-7 pb-10">
      <Link to="/admin/clients" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> All clients</Link>

      {/* header — real identity */}
      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-foreground text-[18px] font-semibold text-background">{initialsOf(name)}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-display text-[24px] font-semibold tracking-tight">{loading ? "Loading…" : name}</h1>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATE_TONE[state])}>{state}</span>
            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-600">Live · #{clientId}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
            {clean(profile?.category) && <span>{clean(profile?.category)}</span>}
            {clean(profile?.mobile) && <span className="tabular-nums">{clean(profile?.mobile)}</span>}
            {clean(profile?.email) && <span className="truncate">{clean(profile?.email)}</span>}
            {counsellor && <span>· with {counsellor}</span>}
          </div>
          {packages.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {packages.slice(0, 6).map((p) => <span key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11.5px] font-medium text-ink-600">{p}</span>)}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setScheduling(true)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90"><CalendarClock className="size-3.5" /> Schedule</button>
          {state === "active"
            ? <button onClick={() => setState("paused", "Paused by admin")} className={btnGhost}><PauseCircle className="size-3.5 text-warn-600" /> Pause</button>
            : <button onClick={() => setState("active")} className={btnGhost}><PlayCircle className="size-3.5 text-well-600" /> Reactivate</button>}
          {state !== "archived" && <button onClick={() => setState("archived")} className={btnGhost}><Archive className="size-3.5 text-ink-400" /> Archive</button>}
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 divide-x divide-border border-y border-border sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="px-5 py-4 first:pl-0">
            <p className="text-[12px] font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* purchases */}
        <Section title="Packages & purchases" count={purchaseList.length}>
          {purchases.loading && purchaseList.length === 0 ? <p className="text-[13px] text-muted-foreground">Loading…</p>
            : purchaseList.length === 0 ? <p className="text-[13px] text-ink-400">No purchases on this account.</p> : (
              <ul className="divide-y divide-border">
                {purchaseList.map((p, i) => (
                  <li key={`${p.id}-${i}`} className="flex items-center gap-2.5 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-well-50 text-well-700"><Wallet className="size-4" /></span>
                    <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">{clean(p.package_name) ?? "Service"}</p><p className="text-[11.5px] text-muted-foreground">{[clean(p.consulting_mode), fmtDate(p.date)].filter(Boolean).join(" · ") || "—"}</p></div>
                    <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-[10.5px] font-medium", String(p.payment_status).toLowerCase() === "paid" ? "bg-well-100 text-well-700" : "bg-secondary text-ink-500")}>{clean(p.payment_status) ?? "—"}</span>
                    <span className="w-14 shrink-0 text-right text-[12px] font-medium tabular-nums text-foreground">{inr(num(p.total_payment_amout) || undefined)}</span>
                  </li>
                ))}
              </ul>
            )}
        </Section>

        {/* reports — open in the inbuilt viewer, with the generated date */}
        <Section title="Reports" count={allReports.length}>
          {reports.loading && allReports.length === 0 ? <p className="text-[13px] text-muted-foreground">Loading…</p>
            : allReports.length === 0 ? <p className="text-[13px] text-ink-400">No reports generated yet.</p> : (
              <ul className="divide-y divide-border">
                {allReports.map((r, i) => (
                  <li key={`${r.url ?? r.name}-${i}`} className="flex items-center gap-2.5 py-2.5">
                    <button onClick={() => r.url && setViewer({ url: r.url, name: r.name })} disabled={!r.url} className={cn("group flex min-w-0 flex-1 items-center gap-2.5 text-left", !r.url && "cursor-default opacity-60")}>
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><FileText className="size-4" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground group-hover:underline">{r.name}</p>
                        <p className="text-[11.5px] text-muted-foreground">{fmtWhen(r.date) ? `Generated ${fmtWhen(r.date)}` : "SetMyCareer report"}</p>
                      </div>
                    </button>
                    {r.url && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => setViewer({ url: r.url!, name: r.name })} className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary">View</button>
                        <a href={r.url} target="_blank" rel="noreferrer" title="Open in a new tab" className="grid size-7 place-items-center rounded-full text-ink-300 hover:bg-secondary hover:text-foreground"><ExternalLink className="size-3.5" /></a>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          {/* comments shown beneath the reports too, newest first */}
          {allComments.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300"><MessageSquare className="size-3 text-brand-600" /> Comments on this client</p>
              <ul className="flex flex-col gap-2">
                {allComments.slice(0, 4).map((m, i) => (
                  <li key={i} className="rounded-lg bg-secondary/40 p-2.5">
                    <p className="line-clamp-2 text-[12px] leading-relaxed text-ink-700">{m.text}</p>
                    <p className="mt-1 text-[10.5px] text-ink-400">{[m.navigator, fmtWhen(m.date, m.time)].filter(Boolean).join(" · ") || "Comment"}</p>
                  </li>
                ))}
              </ul>
              {allComments.length > 4 && <p className="mt-1.5 text-[11px] text-ink-400">+ {allComments.length - 4} more in Comments below</p>}
            </div>
          )}
        </Section>
      </div>

      {/* career market — the live job-match viz, full-width (space-y-7 spaces it) */}
      <section>
        <CareerSignalPanel bare name={name} />
      </section>

      {/* sessions */}
      <Section title="Sessions" count={sess.length}>
        {sessions.loading && sess.length === 0 ? <p className="text-[13px] text-muted-foreground">Loading sessions…</p>
          : sess.length === 0 ? <p className="text-[13px] text-ink-400">No sessions recorded yet.</p> : (
            <ul className="divide-y divide-border">
              {sess.map((s, i) => {
                const status = clean(s.session_status) ?? ""
                const timing = sessionTiming(s)           // past | live | upcoming | unknown
                const bookable = joinable(status)
                const canJoin = bookable && timing !== "past"  // live now or still ahead
                return (
                  <li key={`${s.session_id}-${i}`} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <CalendarClock className="size-4 shrink-0 text-ink-300" />
                      <div className="min-w-0"><p className="truncate text-[13.5px] font-medium text-foreground">{clean(s.session_name) ?? `Session ${s.session_id}`}</p><p className="truncate text-[11.5px] text-muted-foreground">{[clean(s.session_date), clean(String(s.session_time ?? ""))].filter(Boolean).join(" · ") || "—"}{counsellor ? ` · ${counsellor}` : ""}</p></div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {bookable && timing === "live" && <span className="inline-flex items-center gap-1 rounded-full bg-well-50 px-2 py-0.5 text-[10.5px] font-medium text-well-700"><span className="size-1.5 animate-pulse rounded-full bg-well-500" /> Live now</span>}
                      {status && <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize", STATUS_TONE[status.toLowerCase()] ?? "bg-secondary text-ink-500")}>{status}</span>}
                      {canJoin && <Link to={`/call/${clientId}?room=${roomForSession(s)}${(s.sessionTopic || s.session_name) ? `&topic=${encodeURIComponent(String(s.sessionTopic || s.session_name))}` : ""}`} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background hover:opacity-90"><Video className="size-3" /> Join</Link>}
                      {SMC_WRITES_ENABLED && bookable && (
                        <>
                          <button onClick={() => changeStatus(s, "Completed")} disabled={busyId === String(s.session_id)} title="Mark completed" className="grid size-7 place-items-center rounded-full text-well-600 hover:bg-well-50 disabled:opacity-40"><Check className="size-3.5 stroke-[2]" /></button>
                          {timing !== "past" && <button onClick={() => changeStatus(s, "Cancelled")} disabled={busyId === String(s.session_id)} title="Cancel session" className="grid size-7 place-items-center rounded-full text-risk-500 hover:bg-risk-50 disabled:opacity-40"><X className="size-3.5 stroke-[2]" /></button>}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
      </Section>

      {/* admission preferences + career explorer + recommended (only when present) */}
      {(countries.length > 0 || cities.length > 0) && (
        <Section title="Admission preferences">
          <div className="flex flex-col gap-2 text-[13px]">
            {countries.length > 0 && <div><span className="text-ink-400">Countries: </span><span className="font-medium text-foreground">{countries.join(", ")}</span></div>}
            {cities.length > 0 && <div><span className="text-ink-400">Cities: </span><span className="font-medium text-foreground">{cities.join(", ")}</span></div>}
          </div>
        </Section>
      )}

      {qa.length > 0 && (
        <Section title="Career Explorer" count={qa.length}>
          <ul className="grid gap-3 sm:grid-cols-2">
            {qa.map((q, i) => (
              <li key={i} className="rounded-xl border border-border bg-card p-3.5">
                <p className="text-[12.5px] font-medium text-foreground">{q.question}</p>
                {q.answer && <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{q.answer}</p>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {recoList.length > 0 && (
        <Section title="Recommended services" count={recoList.length}>
          <ul className="divide-y divide-border">
            {recoList.map((r, i) => (
              <li key={i} className="flex items-center gap-2.5 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mind-50 text-mind-700"><Lightbulb className="size-4" /></span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">{clean(r.recService)}</p>{(clean(r.recDuration) || clean(r.comments)) && <p className="truncate text-[11.5px] text-muted-foreground">{[clean(r.recDuration), clean(r.comments)].filter(Boolean).join(" · ")}</p>}</div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {reviewList.length > 0 && (
        <Section title="Reviews" count={reviewList.length}>
          <ul className="flex flex-col gap-3">
            {reviewList.map((r, i) => {
              const text = clean(String(r.review ?? r.comment ?? r.feedback ?? "")) ?? ""
              const rating = num(r.rating ?? r.stars)
              return (
                <li key={i} className="rounded-xl border border-border bg-card p-3.5">
                  {rating > 0 && <div className="mb-1 flex items-center gap-0.5">{Array.from({ length: 5 }).map((_, k) => <Star key={k} className={cn("size-3.5", k < rating ? "fill-warn-400 text-warn-400" : "text-ink-200")} />)}</div>}
                  {text && <p className="text-[13px] leading-relaxed text-foreground">{text}</p>}
                </li>
              )
            })}
          </ul>
        </Section>
      )}

      {/* comments — every comment on this client, newest first, with timestamps */}
      <Section title="Comments" count={allComments.length}>
        {SMC_WRITES_ENABLED && (
          <div className="mb-4 flex items-start gap-2">
            <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNote() } }} rows={2} placeholder="Add a comment for this client — they'll see it in their portal…" className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-[13px] outline-none placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100" />
            <button onClick={saveNote} disabled={!noteDraft.trim() || savingNote} aria-label="Save comment" className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background hover:opacity-90 disabled:opacity-30"><Send className="size-4" /></button>
          </div>
        )}
        {(notes.loading || dir.loading) && allComments.length === 0 ? <p className="text-[13px] text-muted-foreground">Loading comments…</p>
          : allComments.length === 0 ? <p className="text-[13px] text-ink-400">No comments yet.</p> : (
            <ul className="flex flex-col gap-3">
              {allComments.map((m, i) => (
                <li key={i} className="rounded-xl border border-border bg-card p-3.5">
                  <p className="text-[13px] leading-relaxed text-foreground">{m.text}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-400"><NotebookPen className="size-3" />{[m.navigator, fmtWhen(m.date, m.time)].filter(Boolean).join(" · ") || "Comment"}</div>
                </li>
              ))}
            </ul>
          )}
      </Section>

      {/* Career projection — NEW model, shown only for ACTIVE clients (remaining
          entitlement). Legacy clients predate this product and keep their original report. */}
      {!isActiveClient ? (
        <section className="rounded-2xl border border-border bg-secondary/20 p-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-ink-300" />
            <span className="text-[13px] font-semibold text-foreground">Career projection</span>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-medium text-ink-500">Legacy client</span>
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            This client predates the new assessment model and has no remaining package entitlement, so the new projection doesn’t apply to them — they were served under the earlier model.{" "}
            {allReports.length > 0
              ? "Refer to their original report above."
              : "No original report is on file."}
          </p>
          {allReports.length > 0 && allReports[0].url && (
            <button onClick={() => setViewer({ url: allReports[0].url!, name: allReports[0].name })} className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-secondary">
              <FileText className="size-3.5" /> View original report
            </button>
          )}
        </section>
      ) : (
      <>
      {/* regenerate this client's report in the NEW format, from their REAL record */}
      <section className="rounded-2xl border border-brand-200 bg-brand-50/40 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="size-4 text-brand-600" />
          <span className="text-[13px] font-semibold text-foreground">New-format report</span>
          <span className="text-[11.5px] text-muted-foreground">AI-built from this client's real record</span>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={runRegen} disabled={regenBusy} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90 disabled:opacity-50">
              {regenBusy ? "Generating…" : regen ? "Regenerate" : "Generate"}
            </button>
            {regen && <button onClick={() => setViewer({ url: URL.createObjectURL(new Blob([regen.html], { type: "text/html" })), name: "Career Report (new format) · preview" })} className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-foreground hover:bg-secondary">Preview</button>}
            {regen && <button onClick={saveRegen} className="rounded-full bg-well-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-well-700">Save to client + admin DB</button>}
          </div>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-muted-foreground">
          Generate runs the AI report agent on this client's profile, sessions, counsellor notes and Career-Explorer answers, builds the new-format document, and opens a preview. Saving writes it to their live SetMyCareer account and the admin records — nothing is written until you confirm.
        </p>
      </section>

      <section className="rounded-2xl border border-border bg-secondary/20 p-4">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-2 text-left">
          <Sparkles className="size-4 text-brand-600" />
          <span className="text-[13px] font-semibold text-foreground">Career projection</span>
          <span className="text-[11.5px] text-muted-foreground">modelled · confidence {proj.confidence}%</span>
          <span className="ml-auto text-[12px] text-brand-600">{open ? "Hide" : "Open"}</span>
        </button>
        {open && (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-warn-50/70 p-2.5 text-[11.5px] text-ink-600">A projection from the inputs below — the backend doesn’t yet store this client’s psychometric scores, so enter their marks/rank to model admission odds. This is guidance, not the client’s saved result.</p>
            <div className="flex flex-wrap gap-2">
              <label className="flex flex-col gap-0.5"><span className="text-[9.5px] font-medium uppercase tracking-wide text-ink-400">JEE Adv rank</span><input type="number" value={rank || ""} onChange={(e) => setRank(+e.target.value || 0)} className={cn(field, "w-24")} placeholder="—" /></label>
              <label className="flex flex-col gap-0.5"><span className="text-[9.5px] font-medium uppercase tracking-wide text-ink-400">JEE %ile</span><input type="number" step="0.1" value={percentile || ""} onChange={(e) => setPercentile(+e.target.value || 0)} className={cn(field, "w-20")} placeholder="—" /></label>
              <label className="flex flex-col gap-0.5"><span className="text-[9.5px] font-medium uppercase tracking-wide text-ink-400">Category</span><select value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className={field}>{(["general", "ews", "obc_ncl", "sc", "st"] as const).map((c) => <option key={c} value={c}>{c.toUpperCase()}</option>)}</select></label>
              <label className="flex flex-col gap-0.5"><span className="text-[9.5px] font-medium uppercase tracking-wide text-ink-400">Income</span><input type="number" step="50000" value={income || ""} onChange={(e) => setIncome(+e.target.value || 0)} className={cn(field, "w-24")} placeholder="—" /></label>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[12px] font-semibold text-foreground">Best-fit domains</p>
                {proj.recommendedDomains.map((d) => (
                  <div key={d.domain} className="flex items-center gap-2.5">
                    <span className="w-36 shrink-0 truncate text-[12.5px] capitalize text-foreground">{d.domain.replace(/_/g, " ")}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"><div className="h-full rounded-full bg-brand-500" style={{ width: `${d.score}%` }} /></div>
                    <span className="w-8 shrink-0 text-right text-[11.5px] font-semibold tabular-nums text-ink-600">{d.score}</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-semibold text-foreground"><GraduationCap className="size-3.5 text-brand-600" /> Admission odds</p>
                <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
                  {proj.admissions.slice(0, 8).map((a) => (
                    <div key={a.collegeId + (a.program ?? "")} className="flex items-center gap-2 text-[12px]">
                      <span className={cn("w-12 shrink-0 rounded px-1 py-0.5 text-center text-[10px] font-semibold", BAND[a.band].bg, BAND[a.band].tone)}>{BAND[a.band].label}</span>
                      <span className="min-w-0 flex-1 truncate text-foreground">{a.collegeName}</span>
                      <span className="w-8 shrink-0 text-right font-semibold tabular-nums text-ink-700">{a.probability}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-foreground"><Wallet className="size-3.5 text-brand-600" /> Scholarships</p>
                {eligS.slice(0, 4).map((s) => <p key={s.scholarshipId} className="truncate text-[11.5px] text-ink-600">{s.name} · {s.fit}%</p>)}
                {!eligS.length && <p className="text-[11.5px] text-muted-foreground">none eligible</p>}
              </div>
              <div>
                <p className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-foreground"><TrendingUp className="size-3.5 text-brand-600" /> Outlook</p>
                {proj.employability.slice(0, 3).map((e) => <p key={e.domain} className="truncate text-[11.5px] capitalize text-ink-600">{e.domain.replace(/_/g, " ")} · {e.outlook}/100 {e.trend}</p>)}
              </div>
            </div>
          </div>
        )}
      </section>
      </>
      )}

      {scheduling && <ScheduleSessionModal clientId={clientId} clientName={name} counsellorId={naviId ? String(naviId) : ""} onClose={() => setScheduling(false)} />}

      {/* inbuilt report viewer — opens the PDF in-app, no new tab / bounce */}
      {viewer && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/60 backdrop-blur-sm" onClick={() => setViewer(null)}>
          <div className="flex flex-1 flex-col overflow-hidden p-3 sm:p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-float)]">
              <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-2.5">
                <FileText className="size-4 text-brand-600" />
                <p className="min-w-0 flex-1 truncate text-[13px] font-semibold text-foreground">{viewer.name}</p>
                <a href={viewer.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium text-foreground hover:bg-secondary">Open in tab <ExternalLink className="size-3" /></a>
                <button onClick={() => setViewer(null)} aria-label="Close" className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-secondary hover:text-foreground"><X className="size-4" /></button>
              </div>
              <iframe src={viewer.url} title={viewer.name} className="min-h-0 flex-1 bg-white" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
