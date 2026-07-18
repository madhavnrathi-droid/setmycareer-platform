// Counsellor 360 — the admin's full view of one counsellor. For a LIVE navigator
// (numeric id from the production roster) this renders their REAL profile —
// identity, expertise/experience/education/location, active flag, photo — and
// their live caseload pulled from getclientbynaviId. Performance metrics
// (rating, utilization, notes-SLA, attributed revenue) have no backend source
// and render blank rather than fabricated. The seeded mock counsellors (cn_*)
// keep their original scorecard view.

import { useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, FileSearch, Star, UserCog, Mail, MapPin } from "lucide-react"
import { getCounsellor, fmtINR } from "../admin-data"
import { useCompanyClients } from "../company-store"
import { sessionsForClient } from "../admin-data"
import { seriesTo, MONTHS } from "../metrics"
import { TrendChart, Scorecard } from "../dash"
import { TranscriptModal } from "../parts/TranscriptModal"
import { useNavigators, useNaviClients } from "@/lib/live-queries"
import { profilePicUrl } from "@/lib/smc-live-api"
import { cn } from "@/lib/utils"

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" })
const STATUS_TONE: Record<string, string> = { active: "bg-well-50 text-well-700", on_leave: "bg-ink-100 text-ink-600", probation: "bg-warn-50 text-warn-700" }

// A live navigator id is numeric; the seeded mock counsellors use cn_* ids.
const isLiveId = (id?: string) => !!id && /^\d+$/.test(id)

export function AdminCounsellorDetail() {
  const { id } = useParams()
  if (isLiveId(id)) return <LiveCounsellorDetail id={id!} />
  return <MockCounsellorDetail id={id} />
}

// ── LIVE navigator 360 ────────────────────────────────────────────────────────
const clean = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" ? s : undefined
}
const initials = (name?: string) => (name ?? "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
const isActiveFlag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true" || v === "Active"

function LiveCounsellorDetail({ id }: { id: string }) {
  const { data: navigators, loading } = useNavigators()
  const n = (navigators ?? []).find((x) => String(x.id) === id)
  const caseload = useNaviClients(id)

  if (loading && !n) return <Shell><p className="py-20 text-center text-[14px] text-muted-foreground">Loading counsellor…</p></Shell>
  if (!n) return <Shell><p className="py-20 text-center text-[14px] text-muted-foreground">Counsellor not found.</p></Shell>

  const name = clean(n.name) ?? `Navigator ${n.id}`
  const photo = profilePicUrl(clean(n.displayimg) ?? clean(n.img))
  const on = isActiveFlag(n.isActive)
  const expertise = clean(n.practicing_expertise)
  const experience = clean(n.work_Experience) ?? clean(n.experiance)
  const education = clean(n.education)
  const location = clean(n.location)
  const email = clean(n.email)
  const about = clean(n.about_navigator_full_des) ?? clean(n.about_navigator) ?? clean(n.short_Description)

  const facts = [
    expertise && { label: "Expertise", value: expertise },
    experience && { label: "Experience", value: experience },
    education && { label: "Education", value: education },
    location && { label: "Location", value: location },
    clean(n.language) && { label: "Languages", value: clean(n.language)! },
    clean(n.organzation_working_for) && { label: "Organisation", value: clean(n.organzation_working_for)! },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <Shell>
      {/* header */}
      <div className="flex flex-wrap items-center gap-4">
        {photo
          ? <img src={photo} alt={name} className="size-14 rounded-2xl object-cover" />
          : <span className="grid size-14 place-items-center rounded-2xl bg-brand-600 text-[18px] font-semibold text-white">{initials(name)}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[24px] font-semibold tracking-tight">{name}</h1>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", on ? "bg-well-50 text-well-700" : "bg-ink-100 text-ink-600")}>{on ? "active" : "inactive"}</span>
          </div>
          <p className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[13px] text-muted-foreground">
            <span className="inline-flex items-center gap-1"><UserCog className="size-3.5" /> {expertise ?? "Career counsellor"}</span>
            {email && <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {email}</span>}
            {location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" /> {location}</span>}
          </p>
        </div>
      </div>

      {/* live profile facts */}
      {facts.length > 0 && (
        <section>
          <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Profile</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
            {facts.map((f) => <div key={f.label}><p className="text-[11.5px] text-muted-foreground">{f.label}</p><p className="text-[13.5px] text-foreground">{f.value}</p></div>)}
          </div>
          {about && <p className="mt-4 max-w-3xl text-[13px] leading-relaxed text-ink-600">{about}</p>}
        </section>
      )}

      {/* performance — no backend source, blank rather than fabricated */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Scorecard label="Avg. rating" value="—" tone="ink" hint="No live source" />
        <Scorecard label="Utilization" value="—" tone="ink" hint="No live source" />
        <Scorecard label="Notes SLA" value="—" tone="ink" hint="No live source" />
        <Scorecard label="Attributed revenue" value="—" tone="ink" hint="No live source" />
      </div>

      {/* live caseload */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">
          Caseload
          {!caseload.loading && <span className="text-ink-400">· {naviRows(caseload.data).length} clients</span>}
        </h2>
        {caseload.loading ? (
          <p className="py-3 text-[13px] text-muted-foreground">Pulling live caseload…</p>
        ) : caseload.error ? (
          <p className="py-3 text-[13px] text-risk-600">Couldn’t reach the backend — {caseload.error}</p>
        ) : naviRows(caseload.data).length === 0 ? (
          <p className="py-3 text-[13px] text-muted-foreground">No clients on this counsellor’s caseload.</p>
        ) : (
          <div className="divide-y divide-border">
            {naviRows(caseload.data).slice(0, 40).map((r, i) => {
              const cname = clean(r.name) ?? clean(r.user_name) ?? (clean(r.user_id) ? `Client #${clean(r.user_id)}` : "Client")
              const pkg = clean(r.package_name)
              const date = clean(r.date)?.split(" ")[0] ?? clean(r.session_date)?.split(" ")[0]
              const amount = Number(r.total_payment_amout ?? r.package_amout)
              const inner = (
                <>
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">{initials(cname)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-foreground">{cname}</p>
                    <p className="truncate text-[11.5px] text-muted-foreground">{[pkg, date].filter(Boolean).join(" · ") || "—"}</p>
                  </div>
                  {Number.isFinite(amount) && amount > 0 && <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">{fmtINR(amount)}</span>}
                </>
              )
              return clean(r.user_id)
                ? <Link key={i} to={`/admin/clients/${clean(r.user_id)}`} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40">{inner}</Link>
                : <div key={i} className="flex items-center gap-3 py-2.5">{inner}</div>
            })}
          </div>
        )}
      </section>

      <p className="text-[11.5px] text-ink-300">Rating, utilization, notes-SLA and attributed revenue aren't tracked yet and stay blank.</p>
    </Shell>
  )
}

// Normalise the loosely-typed getclientbynaviId payload into rows.
type NaviRow = Record<string, unknown>
function naviRows(data: unknown): NaviRow[] {
  if (Array.isArray(data)) return data as NaviRow[]
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>
    for (const k of ["data", "result", "clients", "Data"]) if (Array.isArray(d[k])) return d[k] as NaviRow[]
  }
  return []
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-7">
      <Link to="/admin/counsellors" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All counsellors</Link>
      {children}
    </div>
  )
}

// ── seeded mock counsellor view (unchanged behaviour) ─────────────────────────
function MockCounsellorDetail({ id }: { id?: string }) {
  const clients = useCompanyClients()
  const [metric, setMetric] = useState<"revenue" | "sessions">("revenue")
  const [transcript, setTranscript] = useState<{ id: string; name: string; title: string } | null>(null)
  const c = id ? getCounsellor(id) : undefined
  if (!c) return <div className="py-20 text-center text-[14px] text-muted-foreground">Counsellor not found.</div>

  const caseload = clients.filter((x) => x.counsellorId === c.id && x.state !== "archived")
  const sessions = caseload.flatMap((x) => sessionsForClient(x.id).map((s) => ({ ...s, clientName: x.name })))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12)
  const revTrend = seriesTo(c.revenueMonth, 0.05)
  const sesTrend = seriesTo(c.sessionsMonth, 0.045)
  const data = metric === "revenue" ? revTrend : sesTrend

  const flag = (ok: boolean) => (ok ? undefined : "warn")
  const cards = [
    { label: "Revenue · MTD", value: fmtINR(c.revenueMonth), tone: "well", series: revTrend },
    { label: "Sessions · MTD", value: String(c.sessionsMonth), tone: "brand", series: sesTrend },
    { label: "Avg. rating", value: `★ ${c.rating}`, tone: flag(c.rating >= 4.5) ?? "well", hint: "Target ≥ 4.5" },
    { label: "Utilization", value: `${c.utilization}%`, tone: flag(c.utilization >= 60 && c.utilization <= 95) ?? "mind", hint: "Healthy 60–95%" },
    { label: "Notes SLA", value: `${c.notesSlaPct}%`, tone: flag(c.notesSlaPct >= 85) ?? "well", hint: "Target ≥ 85%" },
    { label: "Response time", value: `${c.responseHrs}h`, tone: flag(c.responseHrs <= 8) ?? "well", hint: "Target ≤ 8h" },
    { label: "Caseload", value: String(c.caseload), tone: "brand", hint: `${caseload.length} active` },
    { label: "Status", value: c.status.replace("_", " "), tone: c.status === "active" ? "well" : "warn" },
  ]

  return (
    <div className="space-y-7">
      <Link to="/admin/counsellors" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> All counsellors</Link>

      <div className="flex flex-wrap items-center gap-4">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-600 text-[18px] font-semibold text-white">{c.initials}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-[24px] font-semibold tracking-tight">{c.name}</h1>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE[c.status])}>{c.status.replace("_", " ")}</span>
          </div>
          <p className="flex items-center gap-1 text-[13px] text-muted-foreground">{c.title} · <Star className="size-3.5 fill-warn-400 text-warn-400" /> {c.rating}</p>
        </div>
      </div>

      {/* scorecards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((s) => <Scorecard key={s.label} label={s.label} value={s.value} tone={s.tone} series={s.series} hint={s.hint} />)}
      </div>

      {/* trend */}
      <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
        <div className="mb-3 flex items-center gap-2">
          {(["revenue", "sessions"] as const).map((m) => (
            <button key={m} onClick={() => setMetric(m)} className={cn("rounded-full px-2.5 py-1 text-[12px] font-medium capitalize transition-colors", metric === m ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}>{m}</button>
          ))}
          <span className="ml-auto text-[11.5px] text-ink-300">last 12 months</span>
        </div>
        <TrendChart data={data} labels={MONTHS} tone={metric === "revenue" ? "well" : "brand"} height={180} />
      </section>

      {/* caseload */}
      <section>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Caseload · {caseload.length} clients</h2>
        {caseload.length === 0 ? <p className="py-3 text-[13px] text-muted-foreground">No active clients assigned.</p> : (
          <div className="divide-y divide-border">
            {caseload.slice(0, 10).map((x) => (
              <Link key={x.id} to={`/admin/clients/${x.id}`} className="flex items-center gap-3 py-2.5 hover:bg-secondary/40">
                <span className="grid size-8 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background">{x.initials}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-[13px] font-medium text-foreground">{x.name}</p><p className="truncate text-[11.5px] text-muted-foreground">{x.headline}</p></div>
                <span className="text-[12px] tabular-nums text-muted-foreground">{x.ltv ? fmtINR(x.ltv) : "—"}</span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* recent sessions */}
      <section>
        <h2 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">Recent sessions</h2>
        <div className="divide-y divide-border">
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-medium text-foreground">{s.clientName} · {s.summary ?? "Session"}</p><p className="text-[12px] text-muted-foreground">{fmtDate(s.date)} · {s.durationMin} min · {s.platform.replace("_", " ")}</p></div>
              {s.hasTranscript && <button onClick={() => setTranscript({ id: s.clientId, name: s.clientName, title: s.summary ?? "Session transcript" })} className="inline-flex items-center gap-1 text-[12px] font-medium text-mind-600 hover:underline"><FileSearch className="size-3.5" /> Transcript</button>}
            </div>
          ))}
        </div>
      </section>

      {transcript && <TranscriptModal clientId={transcript.id} clientName={transcript.name} title={transcript.title} onClose={() => setTranscript(null)} />}
    </div>
  )
}
