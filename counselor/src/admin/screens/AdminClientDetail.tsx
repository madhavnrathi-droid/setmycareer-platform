// Client 360 — the admin's complete view of one member, built so that whatever
// issue comes up, the answer is on this page: identity + account state, any
// attention flags, the assigned counsellor, key indices + billing, the packages
// they've bought, their assessments and reports, where they are on the journey,
// every session (upcoming + logged, with transcripts), the counsellor↔client
// message thread, and a unified activity timeline of every touchpoint. All of it
// is live where the data is live (state, counsellor, bookings, messages,
// purchases) and drawn from the real fixtures elsewhere.

import { useRef, useState } from "react"
import { Link, useParams } from "react-router-dom"
import {
  ArrowLeft, FileText, MessageSquare, CalendarClock, PauseCircle, PlayCircle, Archive,
  FileSearch, AlertTriangle, Package, ClipboardCheck, Video, UserPlus, StickyNote, ShieldAlert, Wallet,
} from "lucide-react"
import { sessionsForClient, fmtINR, STAGE_LABEL, ADMIN_CLIENTS, type JourneyStage } from "../admin-data"
import { useAdminCounsellors } from "../counsellor-roster"
import { getCompanyClient, useCompanyClients, setClientState, assignCounsellor, fmtState, counsellorName } from "../company-store"
import { useBookings, useThread, getPortalAccount } from "@/portal/portal-store"
import { clientPackages, clientActivity, enrollmentPrice, type ActivityKind } from "../client-360"
import { clientTests, clientReports as mockReports, attention as allAttention } from "@/lib/mock"
import { ScheduleSessionModal } from "../parts/ScheduleSessionModal"
import { TranscriptModal } from "../parts/TranscriptModal"
import { Badge2026 } from "../parts/Catalogue2026"
import { AdminLiveClient } from "./AdminLiveClient"
import { CareerSignalPanel } from "@/components/custom/CareerSignalPanel"
import { btnGhost } from "../ui"
import { cn } from "@/lib/utils"

const STAGES: JourneyStage[] = ["profile", "testing", "sessions", "report", "complete"]
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" })
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
const STATE_TONE: Record<string, string> = { active: "bg-well-50 text-well-700", paused: "bg-warn-50 text-warn-700", archived: "bg-ink-100 text-ink-500" }
const SECTION = "mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"

const ACT_ICON: Record<ActivityKind, typeof Package> = {
  join: UserPlus, package: Package, test: ClipboardCheck, report: FileText, session: Video, booking: CalendarClock, note: StickyNote, message: MessageSquare, state: ShieldAlert,
}
const TONE_BG: Record<string, string> = {
  brand: "bg-brand-50 text-brand-600", well: "bg-well-50 text-well-700", mind: "bg-mind-50 text-mind-700", warn: "bg-warn-50 text-warn-700", ink: "bg-secondary text-ink-500",
}

export function AdminClientDetail() {
  const { id } = useParams()
  useCompanyClients() // subscribe so state/counsellor edits re-render
  const { counsellors: roster } = useAdminCounsellors() // live navigator list for assignment
  // Rendered statically (no entrance stagger): this is a long, data-dense page
  // with several live store subscriptions, and the gsap reveal could strand
  // content mid-tween. Reliability of the data view beats the flourish here.
  const ref = useRef<HTMLDivElement>(null)
  const [scheduling, setScheduling] = useState(false)
  const [transcript, setTranscript] = useState<string | null>(null)
  const c = id ? getCompanyClient(id) : undefined
  const bookings = useBookings(id ?? "")
  const thread = useThread(id ?? "", c?.counsellorId ?? "")
  // A numeric id with no seeded/hand-added match is a LIVE client — render their
  // full live 360 (identity, purchases, sessions, reports, notes, reviews,
  // recommended, admission, Career Explorer + a modelled projection), pulled
  // straight from the production backend for THIS client.
  if (!c && id && /^\d+$/.test(id)) return <AdminLiveClient clientId={id} />
  if (!c) return <div className="py-20 text-center text-[14px] text-muted-foreground">Client not found.</div>

  const full = ADMIN_CLIENTS.find((x) => x.id === c.id) // seeded blueprint/clinical/radar (undefined for hand-added)
  const acct = getPortalAccount()
  const livePurchases = acct?.clientId === c.id ? (acct.purchases ?? []) : []
  const packages = clientPackages(c, livePurchases)
  const tests = c.manual ? [] : clientTests(c.id)
  const reports = c.manual ? [] : mockReports(c.id)
  const flags = allAttention.filter((a) => a.clientId === c.id)
  const logged = sessionsForClient(c.id)
  const upcoming = bookings.filter((b) => b.status !== "canceled" && b.status !== "completed")
  const activity = clientActivity(c, packages, bookings, thread)
  const stageIdx = STAGES.indexOf(c.stage)

  const stats = [
    { label: "Career index", value: c.careerIndex ?? "—" },
    { label: "Wellbeing", value: c.wellbeingIndex ?? "—" },
    { label: "Sessions", value: c.sessionCount + upcoming.length },
    { label: "Lifetime value", value: c.ltv ? fmtINR(c.ltv) : "—" },
  ]
  const contact = [
    c.email && { label: "Email", value: c.email },
    c.phone && { label: "Phone", value: c.phone },
    c.gender && { label: "Gender", value: c.gender },
    c.age && { label: "Age", value: String(c.age) },
  ].filter(Boolean) as { label: string; value: string }[]

  const topRiasec = full ? [...full.radar.riasec].sort((a, b) => b.value - a.value).slice(0, 3) : []
  const topBig = full ? [...full.radar.bigFive].sort((a, b) => b.value - a.value).slice(0, 2) : []

  return (
    <div ref={ref} className="space-y-7">
      <Link to="/admin/clients" data-reveal className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All clients</Link>

      {/* header */}
      <div data-reveal className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-foreground text-[18px] font-semibold text-background">{c.initials}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[24px] font-semibold tracking-tight">{c.name}</h1>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", STATE_TONE[c.state])}>{fmtState(c.state)}</span>
          </div>
          <p className="text-[13px] text-muted-foreground">{c.headline}{full?.blueprint.headline ? ` · ${full.blueprint.headline}` : ""}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setScheduling(true)} className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-2 text-[12.5px] font-medium text-background hover:opacity-90"><CalendarClock className="size-3.5" /> Schedule session</button>
          {c.state === "active"
            ? <button onClick={() => setClientState(c.id, "paused", "Paused by admin")} className={btnGhost}><PauseCircle className="size-3.5 text-warn-600" /> Pause</button>
            : <button onClick={() => setClientState(c.id, "active")} className={btnGhost}><PlayCircle className="size-3.5 text-well-600" /> Reactivate</button>}
          {c.state !== "archived" && <button onClick={() => setClientState(c.id, "archived")} className={btnGhost}><Archive className="size-3.5 text-ink-400" /> Archive</button>}
        </div>
      </div>

      {/* attention flags — the "if any issue comes up" surface */}
      {flags.length > 0 && (
        <div data-reveal className="space-y-2 rounded-2xl border border-warn-200 bg-warn-50/60 p-4">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wide text-warn-700"><AlertTriangle className="size-3.5" /> Needs attention</p>
          {flags.map((f) => <p key={f.id} className="text-[13px] text-foreground">{f.text}</p>)}
        </div>
      )}

      {/* assignment + quick links */}
      <div data-reveal className="flex flex-wrap items-center gap-3">
        <span className="text-[12.5px] text-muted-foreground">Counsellor</span>
        <select value={c.counsellorId} onChange={(e) => assignCounsellor(c.id, e.target.value)} className="h-9 rounded-full border border-border bg-card px-3 text-[13px] outline-none">
          <option value="">Unassigned</option>
          {roster.map((cc) => <option key={cc.id} value={cc.id}>{cc.name}</option>)}
        </select>
        <div className="ml-auto flex flex-wrap gap-2">
          <Link to={`/reports/preview?client=${c.id}`} className={btnGhost}><FileText className="size-3.5" /> Report</Link>
          <Link to={`/messages/${c.id}`} className={btnGhost}><MessageSquare className="size-3.5" /> Messages</Link>
          <Link to={`/clients/${c.id}`} className={btnGhost}>Open in console</Link>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 divide-x divide-border border-y border-border sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} data-reveal className="px-5 py-4 first:pl-0">
            <p className="text-[12px] font-medium text-muted-foreground">{s.label}</p>
            <p className="mt-1 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* packages */}
        <section data-reveal>
          <h2 className={SECTION}>Packages &amp; purchases</h2>
          {packages.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No packages yet.</p> : (
            <div className="divide-y divide-border">
              {packages.map((p, i) => (
                <div key={p.productId + i} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-well-50 text-well-700"><Package className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"><span className="truncate">{p.name}{p.tier ? ` · ${p.tier}` : ""}</span>{p.is2026 && <Badge2026 />}</p><p className="text-[11.5px] text-muted-foreground">{fmtDate(p.at)} · {enrollmentPrice(p.price)}</p></div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", p.status === "active" ? "bg-brand-50 text-brand-700" : p.status === "scheduled" ? "bg-mind-50 text-mind-700" : "bg-secondary text-muted-foreground")}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* billing snapshot */}
        <section data-reveal>
          <h2 className={SECTION}>Billing</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Lifetime value", value: c.ltv ? fmtINR(c.ltv) : "—" },
              { label: "Packages", value: String(packages.length) },
              ...(acct?.clientId === c.id ? [
                { label: "Plan", value: acct.plan },
                { label: "Credits", value: `${acct.credits.sessions} ses · ${acct.credits.aiMinutes} min` },
              ] : [{ label: "Spend (paid)", value: fmtINR(packages.reduce((s, p) => s + p.price, 0)) }, { label: "Counsellor", value: counsellorName(c.counsellorId) }]),
            ].map((b) => (
              <div key={b.label} className="rounded-xl border border-border bg-card p-3"><p className="text-[11.5px] text-muted-foreground">{b.label}</p><p className="mt-0.5 truncate text-[14px] font-semibold capitalize text-foreground"><Wallet className="mr-1 inline size-3.5 text-ink-300" />{b.value}</p></div>
            ))}
          </div>
        </section>
      </div>

      {/* assessment snapshot */}
      {full && (
        <section data-reveal>
          <h2 className={SECTION}>Assessment snapshot</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-3">
            <div><p className="text-[11.5px] text-muted-foreground">Headline</p><p className="text-[13.5px] font-medium text-foreground">{full.blueprint.headline}</p></div>
            {topRiasec.length > 0 && <div><p className="text-[11.5px] text-muted-foreground">Top interests (RIASEC)</p><p className="text-[13.5px] text-foreground">{topRiasec.map((r) => `${r.axis} ${r.value}`).join(" · ")}</p></div>}
            {topBig.length > 0 && <div><p className="text-[11.5px] text-muted-foreground">Personality</p><p className="text-[13.5px] text-foreground">{topBig.map((r) => `${r.axis} ${r.value}`).join(" · ")}</p></div>}
            <div><p className="text-[11.5px] text-muted-foreground">Risk</p><p className={cn("text-[13.5px] font-medium capitalize", c.riskFlag === "high" || c.riskFlag === "moderate" ? "text-risk-600" : "text-well-600")}>{c.riskFlag}</p></div>
          </div>
        </section>
      )}

      {/* career market — the live job-match viz, flat to match the 360 sections */}
      <section data-reveal>
        <CareerSignalPanel bare name={c.name} />
      </section>

      <div className="grid gap-7 lg:grid-cols-2">
        {/* assessments / tests */}
        <section data-reveal>
          <h2 className={SECTION}>Assessments</h2>
          {tests.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No assessments completed yet.</p> : (
            <div className="divide-y divide-border">
              {tests.map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-mind-50 text-mind-700"><ClipboardCheck className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">{t.name}</p><p className="truncate text-[11.5px] text-muted-foreground">{t.result}{t.score != null ? ` · ${t.score}` : ""}</p></div>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", t.status === "completed" ? "bg-well-50 text-well-700" : "bg-secondary text-muted-foreground")}>{t.status.replace("_", " ")}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* reports */}
        <section data-reveal>
          <h2 className={SECTION}>Reports</h2>
          {reports.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No reports yet.</p> : (
            <div className="divide-y divide-border">
              {reports.map((r) => (
                <div key={r.id} className="flex items-center gap-3 py-2.5">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><FileText className="size-4" /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">{r.title}</p><p className="text-[11.5px] text-muted-foreground">{fmtDate(r.date)} · {r.shared ? "Shared" : "Draft"} · {r.format}</p></div>
                  <Link to={`/reports/preview?client=${c.id}`} className="text-[12px] font-medium text-brand-600 hover:underline">View</Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* journey */}
      <section data-reveal>
        <h2 className={SECTION}>Journey</h2>
        <div className="flex items-center gap-2">
          {STAGES.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div className={cn("h-1.5 w-full rounded-full", i <= stageIdx ? "bg-brand-500" : "bg-secondary")} />
              <span className={cn("text-[11px]", i === stageIdx ? "font-semibold text-foreground" : "text-muted-foreground")}>{STAGE_LABEL[s]}</span>
            </div>
          ))}
        </div>
      </section>

      {/* upcoming */}
      {upcoming.length > 0 && (
        <section data-reveal>
          <h2 className={SECTION}>Upcoming sessions</h2>
          <div className="divide-y divide-border">
            {upcoming.map((b) => (
              <div key={b.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium text-foreground">{b.topic}</p><p className="text-[12px] text-muted-foreground">{fmtDateTime(b.at)} · {b.durationMin} min · {b.mode.replace("_", " ")} · with {counsellorName(b.counsellorId)}</p></div>
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium capitalize text-brand-700">{b.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* logged sessions */}
      <section data-reveal>
        <h2 className={SECTION}>Session history</h2>
        {logged.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No sessions logged yet.</p> : (
          <div className="divide-y divide-border">
            {logged.map((s) => (
              <div key={s.id} className="flex items-center gap-4 py-3">
                <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium text-foreground">{s.summary ?? "Counselling session"}</p><p className="text-[12px] text-muted-foreground">{fmtDate(s.date)} · {s.durationMin} min · {s.platform.replace("_", " ")}</p></div>
                {s.notes?.status === "approved" && <span className="text-[11.5px] text-well-600">Notes shared</span>}
                {s.hasTranscript && <button onClick={() => setTranscript(s.summary ?? "Session transcript")} className="inline-flex items-center gap-1 text-[11.5px] font-medium text-mind-600 hover:underline"><FileSearch className="size-3.5" /> Transcript</button>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* messages */}
      <section data-reveal>
        <h2 className={SECTION}>Recent messages</h2>
        {thread.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No messages with their counsellor yet.</p> : (
          <div className="space-y-2">
            {thread.slice(-5).map((m) => (
              <div key={m.id} className={cn("max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px]", m.from === "client" ? "bg-secondary text-foreground" : "ml-auto bg-brand-600 text-white")}>
                <p>{m.text}</p>
                <p className={cn("mt-0.5 text-[10.5px]", m.from === "client" ? "text-ink-400" : "text-white/70")}>{m.from} · {fmtDateTime(m.ts)}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* activity timeline */}
      <section data-reveal>
        <h2 className={SECTION}>Activity timeline</h2>
        <div className="relative space-y-3 pl-2">
          {activity.map((e, i) => {
            const Icon = ACT_ICON[e.kind]
            return (
              <div key={i} className="flex gap-3">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", TONE_BG[e.tone])}><Icon className="size-3.5" /></span>
                <div className="min-w-0 flex-1 border-b border-border/60 pb-3">
                  <div className="flex items-baseline justify-between gap-3"><p className="truncate text-[13px] font-medium text-foreground">{e.title}</p><span className="shrink-0 text-[11px] tabular-nums text-ink-300">{fmtDate(e.ts)}</span></div>
                  {e.detail && <p className="truncate text-[12px] text-muted-foreground">{e.detail}</p>}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* contact */}
      {contact.length > 0 && (
        <section data-reveal>
          <h2 className={SECTION}>Contact</h2>
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {contact.map((f) => <div key={f.label}><span className="text-[11.5px] text-muted-foreground">{f.label}</span><p className="text-[13.5px] text-foreground">{f.value}</p></div>)}
          </div>
        </section>
      )}

      {scheduling && <ScheduleSessionModal clientId={c.id} clientName={c.name} counsellorId={c.counsellorId} onClose={() => setScheduling(false)} />}
      {transcript && <TranscriptModal clientId={c.id} clientName={c.name} title={transcript} onClose={() => setTranscript(null)} />}
    </div>
  )
}
