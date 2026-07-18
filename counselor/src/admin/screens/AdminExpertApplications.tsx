// Expert applications — the approval queue. New domain-expert applications from
// the marketing site create an INACTIVE navigator (getAllNavigator · isActive
// false); they only reach the public roster + client portal once an admin
// approves them here. Approve = enableNavigator, Reject/hold = disableNavigator
// (both via the gated toggleNavigator write, which also refreshes every surface).
//
// "Pending" = every navigator not yet live, newest first — a site application
// lands at the top. The full submission (expertise, industries, services, bio,
// experience, location, languages) is shown so the reviewer can decide.

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { UserCheck, UserX, Search, ExternalLink, Mail, MapPin, Clock } from "lucide-react"
import { useNavigators } from "@/lib/live-queries"
import { toggleNavigator } from "@/lib/writes"
import type { FullNavigator } from "@/lib/smc-live-api"
import { Scorecard } from "../dash"
import { Modal, btnPrimary, btnGhost } from "../ui"
import { cn } from "@/lib/utils"

const isActiveFlag = (v: unknown) => v === true || v === 1 || v === "1" || v === "true" || v === "Active"
const clean = (v?: unknown) => { const s = v == null ? "" : String(v).trim(); return s && s !== "None" && s !== "null" ? s : undefined }
const initials = (name?: string) => (name ?? "?").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase()
// hide obvious test/probe placeholder rows from the queue
const JUNK = /\b(test|probe|delete|dummy|sample|placeholder|xxx+|asdf|qwerty|do\s*not\s*use)\b/i
const looksReal = (name?: unknown) => { const s = clean(name); return !!s && !JUNK.test(s) && (s.match(/[A-Za-z]/g)?.length ?? 0) >= 2 }
const chips = (v?: unknown) => (clean(v) ?? "").split(/[,;|/]/).map((s) => s.trim()).filter(Boolean).slice(0, 8)
// render a submitted doc/link line, turning any URL into a clickable link
function linkify(line: string) {
  const m = line.match(/https?:\/\/\S+/)
  if (!m) return <span>{line}</span>
  const url = m[0]
  const [before, after] = line.split(url)
  return <>{before}<a href={url} target="_blank" rel="noreferrer" className="break-all font-medium text-brand-600 hover:underline">{url}</a>{after}</>
}

type Action = { nav: FullNavigator; kind: "approve" | "reject" }

export function AdminExpertApplications() {
  const { data, loading, error } = useNavigators()
  const all = useMemo(() => data ?? [], [data])
  const activeCount = all.filter((n) => isActiveFlag(n.isActive)).length

  const [q, setQ] = useState("")
  const [confirm, setConfirm] = useState<Action | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ tone: "ok" | "err"; msg: string } | null>(null)

  // pending = not-yet-live navigators, newest first (highest id = newest apply)
  const pending = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all
      .filter((n) => !isActiveFlag(n.isActive) && looksReal(n.name))
      .filter((n) => !term || [n.name, n.email, n.practicing_expertise, n.location].some((f) => String(f ?? "").toLowerCase().includes(term)))
      .sort((a, b) => Number(b.id) - Number(a.id))
  }, [all, q])

  const run = async () => {
    if (!confirm) return
    const { nav, kind } = confirm
    const email = clean(nav.email)
    setConfirm(null)
    if (!email) { setFlash({ tone: "err", msg: `No email on ${clean(nav.name) ?? "this record"} — can't ${kind} it.` }); return }
    setBusyId(String(nav.id)); setFlash(null)
    try {
      await toggleNavigator(email, kind === "approve")
      setFlash({ tone: "ok", msg: kind === "approve" ? `Approved ${clean(nav.name) ?? "counsellor"} — now live on the roster and portal.` : `${clean(nav.name) ?? "Counsellor"} kept off the roster.` })
    } catch (e) {
      setFlash({ tone: "err", msg: `Couldn't ${kind} — ${(e as Error).message}. Live writes may be disabled.` })
    } finally { setBusyId(null) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-[24px] font-semibold tracking-tight">Expert applications</h1>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          {loading ? "Loading applications…" : `${pending.length} pending review · applications from the site appear here for approval`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Scorecard label="Pending review" value={loading ? "…" : String(pending.length)} tone="warn" />
        <Scorecard label="Live on roster" value={loading ? "…" : String(activeCount)} tone="well" />
        <Scorecard label="Total counsellors" value={loading ? "…" : String(all.length)} tone="brand" />
      </div>

      {flash && (
        <div className={cn("flex items-center gap-2 rounded-xl border px-4 py-3 text-[13px]", flash.tone === "ok" ? "border-well-200 bg-well-50 text-well-700" : "border-border bg-risk-50 text-risk-600")}>
          {flash.tone === "ok" ? <UserCheck className="size-4 shrink-0" /> : <UserX className="size-4 shrink-0" />}
          {flash.msg}
        </div>
      )}

      {/* search */}
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-300" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search pending by name, email, expertise…"
          className="w-full rounded-full border border-border bg-card py-2 pl-9 pr-3 text-[13px] text-foreground outline-none placeholder:text-ink-300 focus:border-brand-400"
        />
      </div>

      {/* the queue */}
      {loading && all.length === 0 ? (
        <p className="py-16 text-center text-[13px] text-muted-foreground">Loading the live roster…</p>
      ) : error ? (
        <p className="py-16 text-center text-[13px] text-risk-600">Couldn’t reach the backend — {error}</p>
      ) : pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 py-16 text-center">
          <UserCheck className="mx-auto size-7 text-ink-300" />
          <p className="mt-3 text-[14px] font-medium text-foreground">{q ? "No matches" : "No applications pending"}</p>
          <p className="mt-1 text-[12.5px] text-muted-foreground">{q ? "Try a different search." : "New expert applications from the site will appear here for approval."}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {pending.map((n) => (
            <ApplicationCard
              key={String(n.id)} n={n} busy={busyId === String(n.id)}
              onApprove={() => setConfirm({ nav: n, kind: "approve" })}
              onReject={() => setConfirm({ nav: n, kind: "reject" })}
            />
          ))}
        </div>
      )}

      {confirm && (
        <Modal
          title={confirm.kind === "approve" ? "Approve this expert?" : "Keep off the roster?"}
          subtitle={confirm.kind === "approve"
            ? "This publishes their profile to the public network and client portal, and lets clients be matched to them."
            : "This keeps their profile hidden from the public network. You can approve them later from this queue."}
          onClose={() => setConfirm(null)}
          footer={<>
            <button onClick={() => setConfirm(null)} className={btnGhost}>Cancel</button>
            <button onClick={run} className={btnPrimary}>{confirm.kind === "approve" ? "Approve & publish" : "Keep hidden"}</button>
          </>}
        >
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-[13px] font-semibold text-white">{initials(clean(confirm.nav.name))}</span>
            <div className="min-w-0">
              <p className="truncate text-[14.5px] font-semibold text-foreground">{clean(confirm.nav.name) ?? `Navigator ${confirm.nav.id}`}</p>
              <p className="truncate text-[12.5px] text-muted-foreground">{clean(confirm.nav.email) ?? "no email on file"}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function ApplicationCard({ n, busy, onApprove, onReject }: {
  n: FullNavigator; busy: boolean; onApprove: () => void; onReject: () => void
}) {
  const name = clean(n.name) ?? `Navigator ${n.id}`
  const email = clean(n.email)
  const expertise = chips(n.practicing_expertise)
  const services = chips(n.navigator_Services).map((s) => s.replace(/_/g, " "))
  const industries = chips(n.topic_Study)
  const bio = clean(n.about_navigator) ?? clean(n.short_Description)
  const exp = clean(n.work_Experience) ?? clean(n.experiance)
  const location = clean(n.location)
  const langs = clean(n.language)
  // supporting documents & links the applicant submitted (stored in the internal
  // long-description field by the site's onboarding form)
  const docsRaw = clean(n.about_navigator_full_des)
  const docLines = docsRaw && /^supporting documents/i.test(docsRaw) ? docsRaw.split("\n").slice(1).filter(Boolean) : []
  const facts = [exp && { icon: Clock, v: exp }, location && { icon: MapPin, v: location }, email && { icon: Mail, v: email }].filter(Boolean) as { icon: typeof Clock; v: string }[]

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-600 text-[13px] font-semibold text-white">{initials(name)}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15.5px] font-semibold text-foreground">{name}</h3>
              <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-medium text-ink-600">Pending</span>
            </div>
            {expertise.length > 0 && <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{expertise.slice(0, 3).join(" · ")}</p>}
            {facts.length > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
                {facts.map((f, i) => <span key={i} className="inline-flex items-center gap-1"><f.icon className="size-3.5 text-ink-300" /> {f.v}</span>)}
              </div>
            )}
          </div>
        </div>
        {/* actions */}
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={onReject} disabled={busy} className={cn(btnGhost, "!py-1.5 disabled:opacity-40")}><UserX className="size-3.5" /> Hold</button>
          <button onClick={onApprove} disabled={busy} className={cn(btnPrimary, "!py-1.5 disabled:opacity-40")}>
            <UserCheck className="size-3.5" /> {busy ? "Working…" : "Approve"}
          </button>
        </div>
      </div>

      {(bio || services.length > 0 || industries.length > 0 || langs || docLines.length > 0) && (
        <div className="mt-4 space-y-3 border-t border-border/70 pt-4">
          {bio && <p className="max-w-3xl text-[13px] leading-relaxed text-ink-600">{bio}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            {services.length > 0 && <TagRow label="Services" tags={services} />}
            {industries.length > 0 && <TagRow label="Industries" tags={industries} />}
          </div>
          {langs && <p className="text-[12px] text-muted-foreground"><span className="text-ink-400">Languages:</span> {langs}</p>}
          {docLines.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">Documents &amp; links</p>
              <ul className="space-y-1">
                {docLines.map((line, i) => <li key={i} className="text-[12.5px] text-ink-600">{linkify(line)}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
        <span className="text-[11.5px] text-ink-300">Applicant #{String(n.id)}</span>
        <Link to={`/admin/counsellors/${n.id}`} className="inline-flex items-center gap-1 text-[12px] font-medium text-brand-600 hover:underline">
          Full profile <ExternalLink className="size-3" />
        </Link>
      </div>
    </div>
  )
}

function TagRow({ label, tags }: { label: string; tags: string[] }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => <span key={t} className="rounded-full bg-muted px-2.5 py-1 text-[11.5px] font-medium text-ink-600">{t}</span>)}
      </div>
    </div>
  )
}
