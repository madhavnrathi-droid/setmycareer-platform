import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowLeft, FileText, Video, NotebookPen, CalendarClock, ExternalLink, Check, X, Send, ClipboardCheck } from "lucide-react"
import {
  useUserView, useUserSessions, useUserReports, useUserNotes, useUserPurchases,
  useUserAdmission, useCareerExplorerQA,
} from "@/lib/live-queries"
import { normalizeQA } from "@/lib/smc-live-api"
import { useClientTestResults } from "@/lib/shared-store"
import { getTest } from "@/portal/tests/catalog"
import { useSession } from "@/lib/auth-store"
import { setSessionStatus, addNote, SMC_WRITES_ENABLED } from "@/lib/writes"
import { roomForSession } from "@/lib/meeting-link"
import { CareerSignalPanel } from "@/components/custom/CareerSignalPanel"
import type { UserSession } from "@/lib/smc-live-api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

/* Live client detail for the counsellor console — rendered for a numeric (real)
   client id that has no mock persona. Everything here is the production backend:
   the client's profile, the sessions they had with this counsellor (each with a
   gmeet-style room link), their report PDFs and the counsellor's notes. Fields
   the backend can't supply are left out rather than faked. */

const clean = (v?: string | null) => (v && v !== "None" && v !== "null" ? String(v).trim() : undefined)
const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}
const fmtDate = (s?: string | null) => {
  if (!s) return undefined
  const t = Date.parse(s)
  return Number.isNaN(t) ? s : new Date(t).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

const STATUS_TONE: Record<string, string> = {
  booked: "bg-brand-50 text-brand-700",
  pending: "bg-warn-50 text-warn-700",
  completed: "bg-well-50 text-well-700",
  cancelled: "bg-ink-100 text-ink-500",
  deleted: "bg-ink-100 text-ink-400",
}
const joinable = (status?: string) => {
  const s = (status ?? "").toLowerCase()
  return s === "booked" || s === "pending" || s === "scheduled" || s === ""
}
// A session's timing vs the real clock (session_date DD/MM/YYYY + session_time
// "12:00 PM - 01:00 PM"), so Join only shows while the session is live (from ~10 min
// before) or still upcoming — never after it has ended.
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
const callHref = (clientId: string, s: UserSession) => {
  const q = new URLSearchParams({ room: roomForSession(s) })
  const topic = (s.sessionTopic as string) || s.session_name
  if (topic) q.set("topic", String(topic))
  return `/call/${clientId}?${q.toString()}`
}

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-6">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-[13px] font-medium uppercase tracking-[0.1em] text-ink-400">{title}</h2>
        {typeof count === "number" && <span className="text-[12px] tabular-nums text-ink-300">{count}</span>}
      </div>
      {children}
    </section>
  )
}

export function LiveClientHub({ clientId }: { clientId: string }) {
  const view = useUserView(clientId)
  const sessions = useUserSessions(clientId)
  const reports = useUserReports(clientId)
  const notes = useUserNotes(clientId)
  const purchases = useUserPurchases(clientId)
  const tests = useClientTestResults(clientId) // shared-by-client: Career Tests the client completed

  const profile = view.data
  const name = clean(profile?.name) ?? `Client ${clientId}`
  const sess = useMemo(() => (sessions.data ?? []) as UserSession[], [sessions.data])
  const reportList = useMemo(() => (reports.data ?? []).filter((r) => r.report_location || r.report_name), [reports.data])
  const noteList = useMemo(() => (notes.data ?? []).filter((n) => clean(n.comment)), [notes.data])
  const packages = useMemo(() => {
    const set = new Set<string>()
    for (const p of purchases.data?.data ?? []) { const n = clean(p.package_name); if (n) set.add(n) }
    for (const s of sess) { const n = clean(s.session_name); if (n) set.add(n) }
    return [...set]
  }, [purchases.data, sess])
  const counsellor = useMemo(() => clean(sess.find((s) => clean(s.navi_name))?.navi_name), [sess])

  // admission-assistance preferences (countries/cities) for this client
  const admission = useUserAdmission(clientId)
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

  const loading = view.loading && !profile

  // ── live write actions (counsellor → client). Both write to the SetMyCareer
  // backend and invalidate the shared cache, so the change shows up on the
  // client's own portal (their sessions / notes) and the admin dashboard too. ──
  const me = useSession()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)

  async function changeStatus(s: UserSession, status: string) {
    if (!SMC_WRITES_ENABLED) { toast.error("Live writes are off."); return }
    setBusyId(String(s.session_id))
    try {
      await setSessionStatus(Number(s.session_id), status, clientId)
      toast.success(`Session marked ${status}`, { description: "Updated for the client and across the dashboard." })
    } catch (e) {
      toast.error(`Couldn't update the session: ${e instanceof Error ? e.message : "failed"}`)
    } finally { setBusyId(null) }
  }

  async function saveNote() {
    const c = noteDraft.trim()
    if (!c) return
    if (!SMC_WRITES_ENABLED) { toast.error("Live writes are off."); return }
    setSavingNote(true)
    try {
      await addNote({
        sessionId: Number(sess[0]?.session_id ?? 0), userId: clientId,
        navigatorId: Number(me?.userId ?? 0), navigatorName: me?.name ?? "Counsellor", comment: c,
      })
      setNoteDraft("")
      toast.success("Note saved", { description: `${name} will see it in their portal.` })
    } catch (e) {
      toast.error(`Couldn't save the note: ${e instanceof Error ? e.message : "failed"}`)
    } finally { setSavingNote(false) }
  }

  return (
    <div className="pb-10">
      <Link to="/clients" className="mb-5 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5 stroke-[1.75]" /> All clients
      </Link>

      {/* header — real identity */}
      <header className="mb-7 flex items-start gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-ink-100 text-[16px] font-medium text-ink-700">
          {initialsOf(name)}
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-light leading-tight tracking-tight">{loading ? "Loading…" : name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-muted-foreground">
            {clean(profile?.category) && <span>{clean(profile?.category)}</span>}
            {clean(profile?.mobile) && <span className="tabular-nums">{clean(profile?.mobile)}</span>}
            {clean(profile?.email) && <span className="truncate">{clean(profile?.email)}</span>}
          </div>
          {(packages.length > 0 || counsellor) && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {packages.map((p) => (
                <span key={p} className="rounded-full bg-secondary px-2.5 py-0.5 text-[11.5px] font-medium text-ink-600">{p}</span>
              ))}
              {counsellor && <span className="text-[11.5px] text-ink-400">· with {counsellor}</span>}
            </div>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-7">
        {/* sessions */}
        <Section title="Sessions" count={sess.length}>
          {sessions.loading && sess.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Loading sessions…</p>
          ) : sess.length === 0 ? (
            <p className="text-[13px] text-ink-400">No sessions recorded yet.</p>
          ) : (
            <ul className="flex flex-col">
              {sess.map((s, i) => {
                const status = clean(s.session_status) ?? ""
                const timing = sessionTiming(s)
                const bookable = joinable(status)
                const canJoin = bookable && timing !== "past"
                return (
                  <li key={`${s.session_id}-${i}`} className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <CalendarClock className="size-4 shrink-0 stroke-[1.5] text-ink-300" />
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium text-foreground">{clean(s.session_name) ?? `Session ${s.session_id}`}</div>
                        <div className="truncate text-[11.5px] text-muted-foreground">
                          {[clean(s.session_date), clean(String(s.session_time ?? ""))].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {bookable && timing === "live" && <span className="inline-flex items-center gap-1 rounded-full bg-well-50 px-2 py-0.5 text-[10.5px] font-medium text-well-700"><span className="size-1.5 animate-pulse rounded-full bg-well-500" /> Live now</span>}
                      {status && <span className={cn("rounded-full px-2 py-0.5 text-[10.5px] font-medium capitalize", STATUS_TONE[status.toLowerCase()] ?? "bg-secondary text-ink-500")}>{status}</span>}
                      {canJoin && (
                        <Link to={callHref(clientId, s)} className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-[11px] font-medium text-background transition-opacity hover:opacity-90">
                          <Video className="size-3 stroke-[1.75]" /> Join
                        </Link>
                      )}
                      {SMC_WRITES_ENABLED && bookable && (
                        <>
                          <button onClick={() => changeStatus(s, "Completed")} disabled={busyId === String(s.session_id)} title="Mark completed" className="grid size-7 place-items-center rounded-full text-well-600 transition-colors hover:bg-well-50 disabled:opacity-40">
                            <Check className="size-3.5 stroke-[2]" />
                          </button>
                          {timing !== "past" && (
                            <button onClick={() => changeStatus(s, "Cancelled")} disabled={busyId === String(s.session_id)} title="Cancel session" className="grid size-7 place-items-center rounded-full text-risk-500 transition-colors hover:bg-risk-50 disabled:opacity-40">
                              <X className="size-3.5 stroke-[2]" />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {/* career market — the live job-match viz, flat like the other sections */}
        <section className="border-t border-border pt-6">
          <CareerSignalPanel bare name={name} />
        </section>

        {/* reports */}
        <Section title="Reports" count={reportList.length}>
          {reports.loading && reportList.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Loading reports…</p>
          ) : reportList.length === 0 ? (
            <p className="text-[13px] text-ink-400">No reports generated for this client yet.</p>
          ) : (
            <ul className="flex flex-col">
              {reportList.map((r, i) => (
                <li key={`${r.id}-${i}`} className="border-b border-border/60 py-3 last:border-0">
                  <a
                    href={r.report_location ?? undefined}
                    target="_blank" rel="noreferrer"
                    className={cn("group flex items-center gap-3", !r.report_location && "pointer-events-none opacity-60")}
                  >
                    <FileText className="size-4 shrink-0 stroke-[1.5] text-ink-300" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-medium text-foreground group-hover:underline">{clean(r.report_name) ?? "SetMyCareer report"}</div>
                      <div className="text-[11.5px] text-muted-foreground">{fmtDate(r.created_at) ? `Generated ${fmtDate(r.created_at)}` : "SetMyCareer report"}</div>
                    </div>
                    {r.report_location && <ExternalLink className="size-3.5 shrink-0 stroke-[1.5] text-ink-300 group-hover:text-foreground" />}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* assessments — shared-by-client Sigma test results */}
        <Section title="Assessments" count={tests.data.length}>
          {tests.loading && tests.data.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Loading assessments…</p>
          ) : tests.data.length === 0 ? (
            <p className="text-[13px] text-ink-400">No Career Tests completed yet.</p>
          ) : (
            <ul className="flex flex-col">
              {tests.data.map((t, i) => {
                const def = getTest(t.testId)
                return (
                  <li key={`${t.testId}-${i}`} className="flex items-center justify-between gap-3 border-b border-border/60 py-3 last:border-0">
                    <div className="flex min-w-0 items-center gap-3">
                      <ClipboardCheck className="size-4 shrink-0 stroke-[1.5] text-ink-300" />
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-medium text-foreground">{def?.name ?? t.testId}</div>
                        <div className="text-[11.5px] text-muted-foreground">{fmtDate(t.takenAt) ? `Completed ${fmtDate(t.takenAt)}` : "Completed"}</div>
                      </div>
                    </div>
                    {typeof t.overall === "number" && t.overall > 0 && (
                      <span className="shrink-0 rounded-full bg-secondary px-2.5 py-0.5 text-[11.5px] font-medium tabular-nums text-ink-600">{t.overall}/100</span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </Section>

        {/* admission preferences (admission-assistance clients) */}
        {(countries.length > 0 || cities.length > 0) && (
          <Section title="Admission preferences">
            <div className="flex flex-col gap-2 text-[13px]">
              {countries.length > 0 && <div><span className="text-ink-400">Countries: </span><span className="font-medium text-foreground">{countries.join(", ")}</span></div>}
              {cities.length > 0 && <div><span className="text-ink-400">Cities: </span><span className="font-medium text-foreground">{cities.join(", ")}</span></div>}
            </div>
          </Section>
        )}

        {/* career explorer answers (counsellor view of the client's Q&A) */}
        {qa.length > 0 && (
          <Section title="Career Explorer" count={qa.length}>
            <ul className="flex flex-col gap-3">
              {qa.map((q, i) => (
                <li key={i} className="rounded-xl bg-card p-3.5 shadow-[var(--shadow-e1)]">
                  <p className="text-[12.5px] font-medium text-foreground">{q.question}</p>
                  {q.answer && <p className="mt-1 text-[13px] leading-relaxed text-ink-600">{q.answer}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* notes */}
        <Section title="Notes" count={noteList.length}>
          {SMC_WRITES_ENABLED && (
            <div className="mb-4 flex items-start gap-2">
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveNote() } }}
                rows={2}
                placeholder="Add a note for this client — they'll see it in their portal…"
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-border bg-card px-3 py-2 text-[13px] outline-none placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              />
              <button onClick={saveNote} disabled={!noteDraft.trim() || savingNote} aria-label="Save note" className="grid size-10 shrink-0 place-items-center rounded-xl bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30">
                <Send className="size-4 stroke-[1.75]" />
              </button>
            </div>
          )}
          {notes.loading && noteList.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">Loading notes…</p>
          ) : noteList.length === 0 ? (
            <p className="text-[13px] text-ink-400">No session notes yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {noteList.map((n, i) => (
                <li key={`${n.id}-${i}`} className="rounded-xl bg-card p-3.5 shadow-[var(--shadow-e1)]">
                  <p className="text-[13px] leading-relaxed text-foreground">{clean(n.comment)}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-ink-400">
                    <NotebookPen className="size-3 stroke-[1.5]" />
                    {[clean(n.navigator_name), fmtDate(n.date)].filter(Boolean).join(" · ") || "Note"}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  )
}
