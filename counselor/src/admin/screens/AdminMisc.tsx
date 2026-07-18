// The remaining admin sections — Journeys (funnel), Reports & transcripts,
// Sessions (live + logged, organized), Access & roles, and Settings. Sessions
// are live from the production backend; the funnel / cohort and aggregate
// reports/transcripts views have no backend source yet and show a calm
// placeholder instead of fabricated data.

import { useMemo, useState } from "react"
import { ShieldCheck, KeyRound, Search, CalendarClock, X, Video, Mic, MapPin } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { useAllBookings, setBookingStatus, type BookingMode } from "@/portal/portal-store"
import { useCompanyClients, getCompanyClient, counsellorName } from "../company-store"
import { useClientDirectory } from "../client-directory"
import { useAdminSessions } from "@/lib/live-queries"
import type { AdminSession } from "@/lib/smc-live-api"
import { Scorecard } from "../dash"
import { ScheduleSessionModal } from "../parts/ScheduleSessionModal"
import { tableHead, td } from "../ui"
import { cn } from "@/lib/utils"
import { AdminBookingsPanel } from "./AdminBookingsPanel"

const fmtDateTime = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const MODE_ICON: Record<BookingMode, typeof Video> = { video: Video, voice: Mic, in_person: MapPin }
const clean = (v?: string | null) => (v && v !== "None" && v !== "null" ? String(v).trim() : undefined)

/** A calm placeholder for sections whose metric has no live backend source. */
function NoSource({ note }: { note?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-8 text-center">
      <p className="text-[12.5px] text-muted-foreground">No live source — connect the backend metric to populate.</p>
      {note && <p className="mt-1 text-[11px] text-ink-300">{note}</p>}
    </div>
  )
}

// ── Journeys (funnel) — no live source ───────────────────────────────────────
export function AdminJourneys() {
  const ref = useGsap((s) => revealChildren(s), [])
  return (
    <div ref={ref} className="space-y-6">
      <div data-reveal>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Journeys</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">The guided path, as a funnel.</p>
      </div>
      <section data-reveal className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
        <h2 className="mb-4 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Journey funnel · stage-to-stage conversion</h2>
        <NoSource note="Per-stage journey progression isn't exposed by the backend contract yet." />
      </section>
    </div>
  )
}

// ── Reports & transcripts — no admin-side aggregate source ───────────────────
export function AdminReports() {
  const ref = useGsap((s) => revealChildren(s), [])
  return (
    <div ref={ref} className="space-y-7">
      <div data-reveal>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Reports &amp; transcripts</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Career Intelligence reports and session transcripts.</p>
      </div>
      <section data-reveal>
        <h2 className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Career Intelligence Reports</h2>
        <NoSource note="Reports are available per client from their profile; an admin-wide listing has no backend source yet." />
      </section>
      <section data-reveal>
        <h2 className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Recent transcripts</h2>
        <NoSource note="Session transcripts have no backend source yet." />
      </section>
    </div>
  )
}

// ── Sessions (live from the production backend + local schedule) ─────────────
const STATUS_TONE = (s?: string) => {
  const v = (s ?? "").toLowerCase()
  if (v.includes("complet")) return "bg-well-50 text-well-700"
  if (v.includes("cancel") || v.includes("delete") || v.includes("no")) return "bg-risk-100 text-risk-600"
  if (v.includes("pend") || v.includes("book")) return "bg-brand-50 text-brand-700"
  return "bg-secondary text-muted-foreground"
}

export function AdminSessions() {
  const ref = useGsap((s) => revealChildren(s), [])
  const clients = useCompanyClients()
  const dir = useClientDirectory()
  const bookings = useAllBookings()
  const { data: liveSessions, loading, error } = useAdminSessions()
  const [q, setQ] = useState("")
  const [couns, setCouns] = useState("all")
  const [scheduling, setScheduling] = useState(false)

  // prefer a real name (company store first, then the live directory), else the id
  const nameOf = (id: string) => getCompanyClient(id)?.name ?? dir.nameOf(id) ?? id
  const all = liveSessions ?? []
  const counsellors = useMemo(() => [...new Set(all.map((s) => clean(s.navigator)).filter(Boolean) as string[])].sort(), [all])

  const recent = useMemo(() => {
    const needle = q.toLowerCase().trim()
    return all.filter((s: AdminSession) =>
      (!needle || (clean(s.name) ?? "").toLowerCase().includes(needle)) &&
      (couns === "all" || clean(s.navigator) === couns),
    ).slice(0, 60)
  }, [all, q, couns])

  const now = Date.now()
  const upcoming = bookings.filter((b) => b.status !== "canceled" && b.status !== "completed" && new Date(b.at).getTime() >= now - 36e5)
  // schedule picker draws from the REAL client base (live directory) + hand-added
  // company clients, deduped by id
  const pickList = (() => {
    const seen = new Set<string>()
    const out: { id: string; name: string; counsellorId: string }[] = []
    for (const c of clients) if (c.state !== "archived" && !seen.has(c.id)) { seen.add(c.id); out.push({ id: c.id, name: c.name, counsellorId: c.counsellorId }) }
    for (const c of dir.clients) if (c.named && !seen.has(c.id)) { seen.add(c.id); out.push({ id: c.id, name: c.name, counsellorId: c.navigatorId ?? "" }) }
    return out
  })()

  return (
    <>
      <AdminBookingsPanel />
    <div ref={ref} className="space-y-6">
      <div data-reveal className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[24px] font-semibold tracking-tight">Sessions</h1>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{loading ? "Loading live sessions…" : `${upcoming.length} scheduled (local) · ${all.length.toLocaleString("en-IN")} live across the team`}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3">
            <Search className="size-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by client…" className="w-28 bg-transparent text-[13px] outline-none placeholder:text-ink-300" />
          </div>
          <select value={couns} onChange={(e) => setCouns(e.target.value)} className="h-9 max-w-[170px] rounded-full border border-border bg-card px-3 text-[13px] outline-none">
            <option value="all">All counsellors</option>
            {counsellors.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <button onClick={() => setScheduling(true)} className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3.5 text-[12.5px] font-medium text-background hover:opacity-90"><CalendarClock className="size-4" /> Schedule</button>
        </div>
      </div>

      {/* session health — total is live; completion / no-show / avg-duration have no source */}
      <div data-reveal className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Scorecard label="Sessions (live)" value={loading ? "…" : all.length.toLocaleString("en-IN")} tone="brand" />
        <Scorecard label="Completion rate" value="—" tone="ink" hint="No live source" />
        <Scorecard label="No-show rate" value="—" tone="ink" hint="No live source" />
        <Scorecard label="Avg. duration" value="—" tone="ink" hint="No live source" />
      </div>

      {/* upcoming (local schedule — does not persist to the backend) */}
      <section data-reveal>
        <h2 className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Upcoming · scheduled here (local)</h2>
        {upcoming.length === 0 ? (
          <p className="py-3 text-[13px] text-muted-foreground">No upcoming sessions. Use Schedule to book one — a local hold until the backend exposes a create-session endpoint.</p>
        ) : (
          <div className="divide-y divide-border">
            {upcoming.map((b) => {
              const Icon = MODE_ICON[b.mode]
              return (
                <div key={b.id} className="flex items-center gap-4 py-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Icon className="size-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-medium text-foreground">{nameOf(b.clientId)} · {b.topic}</p>
                    <p className="text-[12px] text-muted-foreground">{fmtDateTime(b.at)} · {b.durationMin} min · with {counsellorName(b.counsellorId)}</p>
                  </div>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium capitalize text-brand-700">{b.status}</span>
                  <button onClick={() => setBookingStatus(b.id, "canceled")} className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-risk-600" aria-label="Cancel"><X className="size-3.5" /></button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* live sessions from the production backend */}
      <section data-reveal>
        <h2 className="mb-1 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Recent sessions · live</h2>
        {error ? <p className="py-3 text-[13px] text-risk-600">Couldn’t reach the backend — {error}</p> : loading ? <p className="py-3 text-[13px] text-muted-foreground">Loading live sessions…</p> : (
          <div className="divide-y divide-border">
            {recent.map((s, i) => (
              <div key={`${s.id}-${s.sessionsid ?? ""}-${i}`} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-medium text-foreground">{clean(s.name) ?? "Client"}</p>
                  <p className="truncate text-[12px] text-muted-foreground">{[clean(s.session_name) ?? clean(s.package_name) ?? "Counselling session", clean(s.session_date), clean(s.session_time), clean(s.navigator) && `with ${clean(s.navigator)}`].filter(Boolean).join(" · ")}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE(s.session_status))}>{clean(s.session_status) ?? "—"}</span>
              </div>
            ))}
            {recent.length === 0 && <p className="py-3 text-[13px] text-muted-foreground">No sessions match.</p>}
          </div>
        )}
      </section>

      {scheduling && <ScheduleSessionModal clients={pickList} onClose={() => setScheduling(false)} />}
    </div>
    </>
  )
}

// ── Access & roles ───────────────────────────────────────────────────────────
const ROLES = [
  { role: "Owner", access: "Everything — billing, access, all data + controls", members: 2 },
  { role: "Operations", access: "Clients, journeys, sessions, counsellor assignment", members: 4 },
  { role: "Finance", access: "Revenue, subscriptions, API cost — read + export", members: 2 },
  { role: "Counsellor lead", access: "Their team's caseload, quality + SLA", members: 6 },
  { role: "Support", access: "Client lookup + messaging (no financials)", members: 9 },
]
export function AdminAccess() {
  const ref = useGsap((s) => revealChildren(s), [])
  return (
    <div ref={ref} className="space-y-6">
      <div data-reveal>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Access &amp; roles</h1>
        <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground"><ShieldCheck className="size-3.5 text-well-600" /> Role-based access · every action audit-logged</p>
      </div>
      <div data-reveal className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e2)]">
        <table className="w-full border-collapse">
          <thead><tr className={tableHead}><th className="py-2.5 pl-4 pr-3">Role</th><th className="py-2.5 pr-3">What they can access</th><th className="py-2.5 pr-3">People</th></tr></thead>
          <tbody>
            {ROLES.map((r) => (
              <tr key={r.role} className="border-b border-border/60 last:border-0">
                <td className="py-3 pl-4 pr-3 text-[13px] font-semibold text-foreground">{r.role}</td>
                <td className={cn(td, "pr-3 text-muted-foreground")}>{r.access}</td>
                <td className={cn(td, "pr-3 tabular-nums")}>{r.members}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p data-reveal className="text-[11.5px] text-ink-300">Invite, role changes and SSO connect with the backend. Counsellors have their own scoped console logins.</p>
    </div>
  )
}

// ── Settings ─────────────────────────────────────────────────────────────────
// The integrations the platform runs on. Secrets are NOT shown here: API keys live
// server-side as environment variables and are never exposed to the browser (a key
// rendered in the client would be a leaked key). The live health probe for the
// SetMyCareer Core API lives on the API & usage screen.
const INTEGRATIONS: { name: string; purpose: string; where: string }[] = [
  { name: "SetMyCareer Core API", purpose: "Clients, navigators, sessions, reports, packages", where: "Live · see API & usage for health" },
  { name: "Groq", purpose: "Primary LLM (Llama 3.3 70B) + Whisper speech-to-text", where: "Server env" },
  { name: "OpenRouter", purpose: "LLM fallback (same Llama 3.3 70B)", where: "Server env" },
  { name: "Razorpay", purpose: "Payments, coupons & refunds", where: "Server env (test mode)" },
  { name: "LiveKit", purpose: "Video / voice session rooms", where: "Server-issued tokens" },
  { name: "Supabase", purpose: "Chats + app state persistence", where: "Server env" },
  { name: "Google Ads", purpose: "Marketing performance", where: "Server env · dev-token pending" },
]

export function AdminSettings() {
  const ref = useGsap((s) => revealChildren(s), [])
  return (
    <div ref={ref} className="space-y-7">
      <div data-reveal>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">Company configuration and the integrations the platform runs on.</p>
      </div>
      <section data-reveal>
        <h2 className="mb-2 flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"><KeyRound className="size-3.5" /> Integrations</h2>
        <div className="divide-y divide-border">
          {INTEGRATIONS.map((p) => (
            <div key={p.name} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1"><p className="text-[13.5px] font-medium text-foreground">{p.name}</p><p className="text-[12px] text-muted-foreground">{p.purpose}</p></div>
              <span className="text-[12px] text-ink-500">{p.where}</span>
            </div>
          ))}
        </div>
      </section>
      <p data-reveal className="text-[11.5px] text-ink-300">Keys are managed server-side as environment variables and never sent to the browser. The Core API connection is probed live on the API &amp; usage screen.</p>
    </div>
  )
}
