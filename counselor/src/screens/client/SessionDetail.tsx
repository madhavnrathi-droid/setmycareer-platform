import { useState } from "react"
import { useParams, Link } from "react-router-dom"
import {
  Video, Quote, Clock, Calendar, CircleCheck, CalendarX2, ArrowLeft, FileText,
  Lock, UserRound, ShieldCheck, Pencil, Undo2, Send,
} from "lucide-react"
import { toast } from "sonner"
import { transcript, proposedDeltas, setSessionNotes } from "@/lib/mock"
import { useSession } from "@/lib/stores"
import type { TranscriptTurn, ScoreDelta, Session, SessionNotes } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { DeltaPill } from "@/components/custom/DeltaPill"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const PLATFORM: Record<string, string> = {
  google_meet: "Google Meet", zoom: "Zoom", teams: "Teams", in_person: "In person",
}
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })
const CONF_TONE: Record<string, string> = {
  high: "text-well-600", moderate: "text-foreground", tentative: "text-warn-600",
  low: "text-warn-600", none: "text-ink-300",
}

/* A single speaker-labeled turn. When it gated a pc.* metric a quote marker
   surfaces; clicking it toasts which metric the utterance moved. */
function Turn({ turn }: { turn: TranscriptTurn }) {
  const counselor = turn.speaker.startsWith("Dr")
  const gated = turn.gatesMetric
  return (
    <div data-reveal className="flex gap-3.5">
      <div className="w-12 shrink-0 pt-0.5 text-right text-[11px] tabular-nums text-ink-300">{turn.ts}</div>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "text-[11px] font-medium uppercase tracking-[0.1em]",
            counselor ? "text-brand-600" : "text-ink-500",
          )}
        >
          {turn.speaker}
        </div>
        <div
          className={cn(
            "mt-1 rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed",
            gated
              ? "border-l-2 border-brand-500 bg-brand-100/40 text-foreground"
              : counselor
                ? "bg-secondary text-foreground"
                : "bg-card text-ink-700",
            !gated && "border border-border",
          )}
        >
          {turn.text}
          {gated && (
            <button
              type="button"
              onClick={() =>
                toast(`Gated metric · ${gated}`, {
                  description: "This utterance moved the score for this signal.",
                })
              }
              className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2 py-0.5 text-[10.5px] font-medium text-brand-600 transition-colors hover:bg-brand-500 hover:text-background"
              aria-label={`Show metric gated by this quote: ${gated}`}
            >
              <Quote className="size-3 stroke-[1.75]" /> {gated}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* Right rail — session summary + the pc.* score deltas the session proposed,
   each with its confidence band. Read-only here; approval lives elsewhere. */
function SummaryPanel({ summary, deltas }: { summary?: string; deltas: ScoreDelta[] }) {
  return (
    <div className="flex flex-col gap-6">
      <section
        data-reveal
        className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]"
      >
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Session summary</p>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-foreground">
          {summary || "No summary recorded for this session."}
        </p>
      </section>

      <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Proposed score deltas</p>
          <span className="text-[11px] tabular-nums text-muted-foreground">{deltas.length}</span>
        </div>

        <div className="flex flex-col gap-4">
          {deltas.map((d) => {
            const change = d.before == null ? null : d.after - d.before
            return (
              <div key={d.id} className="flex flex-col gap-2 border-t border-border pt-4 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-foreground">{d.name}</span>
                  <DeltaPill value={change} />
                </div>
                <div className="flex items-center gap-2 text-[12px] tabular-nums text-muted-foreground">
                  <span>{d.before ?? "—"}</span>
                  <span className="text-ink-300">→</span>
                  <span className="font-medium text-foreground">{d.after}</span>
                  <span
                    className={cn(
                      "ml-auto text-[10px] font-medium uppercase tracking-[0.1em]",
                      CONF_TONE[d.confidence],
                    )}
                  >
                    {d.confidence}
                  </span>
                </div>
                {d.quote && (
                  <p className="text-[11.5px] italic leading-snug text-ink-500">“{d.quote}”</p>
                )}
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

const fmtStampTime = (iso: string) =>
  new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

/* Session notes + the client-approval gate (Feature B). Two layers:
   - Counselor notes — private working notes (never leave the console).
   - Client-facing notes — the plain-language version, shared ONLY once approved.
   The approval flips draft → approved, stamps sharedAt, and shows the shared
   badge. An honest gate: nothing reaches the client until the counselor approves. */
function SessionNotesPanel({ session }: { session: Session }) {
  const seeded: SessionNotes = session.notes ?? {
    counselor: "",
    client: "",
    status: "draft",
  }
  const [counselorText, setCounselorText] = useState(seeded.counselor)
  const [clientText, setClientText] = useState(seeded.client)
  const [editing, setEditing] = useState(false)

  const status = session.notes?.status ?? "draft"
  const approved = status === "approved"
  const sharedAt = session.notes?.sharedAt
  const locked = approved && !editing

  function persist(next: SessionNotes) {
    setSessionNotes(session.id, next)
  }

  function approveShare() {
    persist({
      counselor: counselorText,
      client: clientText,
      status: "approved",
      sharedAt: new Date().toISOString(),
    })
    setEditing(false)
    toast.success("Shared with client", {
      description: "The client can now see these notes on their dashboard.",
    })
  }

  function saveDraft() {
    persist({ counselor: counselorText, client: clientText, status: "draft" })
    toast.success("Draft saved", { description: "Not yet shared with the client." })
  }

  function unshare() {
    persist({ counselor: counselorText, client: clientText, status: "draft" })
    setEditing(true)
    toast("Unshared", { description: "The client can no longer see these notes." })
  }

  return (
    <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Session notes</p>
        {approved ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-well-100 px-2.5 py-1 text-[10.5px] font-medium text-well-600">
            <ShieldCheck className="size-3 stroke-[1.75]" /> Shared with client
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-100 px-2.5 py-1 text-[10.5px] font-medium text-warn-600">
            <Pencil className="size-3 stroke-[1.75]" /> Draft
          </span>
        )}
      </div>

      {/* counselor (private) */}
      <div className="flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
          <Lock className="size-3 stroke-[1.75] text-ink-300" /> Counselor notes
          <span className="font-normal text-ink-300">· private</span>
        </span>
        {locked ? (
          <p className="whitespace-pre-line rounded-lg bg-secondary/60 px-3.5 py-3 text-[12.5px] leading-relaxed text-foreground">
            {counselorText || "No counselor notes."}
          </p>
        ) : (
          <Textarea
            value={counselorText}
            onChange={(e) => setCounselorText(e.target.value)}
            rows={5}
            aria-label="Counselor notes"
            placeholder="Private working notes — observations, assessment, plan…"
            className="resize-none text-[12.5px] leading-relaxed"
          />
        )}
      </div>

      {/* client-facing */}
      <div className="mt-4 flex flex-col gap-1.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-ink-600">
          <UserRound className="size-3 stroke-[1.75] text-ink-300" /> Client-facing notes
          <span className="font-normal text-ink-300">· plain language</span>
        </span>
        {locked ? (
          <p className="whitespace-pre-line rounded-lg bg-brand-100/40 px-3.5 py-3 text-[12.5px] leading-relaxed text-foreground">
            {clientText || "No client-facing notes."}
          </p>
        ) : (
          <Textarea
            value={clientText}
            onChange={(e) => setClientText(e.target.value)}
            rows={5}
            aria-label="Client-facing notes"
            placeholder="What the client will see — warm, plain-language summary…"
            className="resize-none text-[12.5px] leading-relaxed"
          />
        )}
      </div>

      {/* actions / gate */}
      {approved ? (
        <div className="mt-4 flex flex-col gap-2.5">
          {sharedAt && (
            <p className="text-[11.5px] tabular-nums text-muted-foreground">
              Shared {fmtStampTime(sharedAt)}
            </p>
          )}
          {editing ? (
            <div className="flex items-center gap-2">
              <Button size="sm" className="h-9 gap-1.5" onClick={approveShare}>
                <Send className="size-3.5 stroke-[1.75]" /> Update &amp; re-share
              </Button>
              <Button size="sm" variant="ghost" className="h-9 text-muted-foreground" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-9 gap-1.5" onClick={() => setEditing(true)}>
                <Pencil className="size-3.5 stroke-[1.5]" /> Edit
              </Button>
              <Button size="sm" variant="ghost" className="h-9 gap-1.5 text-muted-foreground" onClick={unshare}>
                <Undo2 className="size-3.5 stroke-[1.5]" /> Unshare
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-9 gap-1.5" onClick={approveShare}>
              <ShieldCheck className="size-3.5 stroke-[1.75]" /> Approve &amp; share with client
            </Button>
            <Button size="sm" variant="outline" className="h-9" onClick={saveDraft}>
              Save draft
            </Button>
          </div>
          <p className="text-[11.5px] leading-snug text-muted-foreground">
            Nothing reaches the client until you approve. Approved notes appear on the
            client's own dashboard.
          </p>
        </div>
      )}
    </section>
  )
}

export function SessionDetail() {
  const { sessionId } = useParams()
  const session = useSession(sessionId)
  const ref = useGsap((s) => revealChildren(s), [sessionId])

  if (!session) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <FileText className="size-6 stroke-[1.25] text-ink-300" />
        <div className="text-[13.5px] font-medium">Session not found</div>
        <p className="max-w-xs text-[12.5px] text-muted-foreground">
          This session may have been removed or the link is out of date.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1 h-9 gap-1.5">
          <Link to="../sessions">
            <ArrowLeft className="size-4 stroke-[1.5]" /> Back to sessions
          </Link>
        </Button>
      </div>
    )
  }

  const live = session.status === "live"

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {/* header strip */}
      <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
        <Link
          to="../sessions"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5 stroke-[1.5]" /> Sessions
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-3">
          <div className="flex items-center gap-2.5">
            <Calendar className="size-4 stroke-[1.5] text-ink-300" />
            <span className="font-display text-[18px] font-light tracking-tight tabular-nums">
              {fmtDate(session.date)}
            </span>
          </div>

          <div className="flex items-center gap-2.5 text-[13px] text-ink-600">
            <Clock className="size-4 stroke-[1.5] text-ink-300" />
            <span className="tabular-nums">{session.durationMin} min</span>
          </div>

          <div className="flex items-center gap-2.5 text-[13px] text-ink-600">
            <Video className="size-4 stroke-[1.5] text-ink-300" />
            {PLATFORM[session.platform]}
          </div>

          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[12.5px]",
              session.attended ? "text-well-600" : "text-risk-600",
            )}
          >
            {session.attended ? (
              <CircleCheck className="size-4 stroke-[1.5]" />
            ) : (
              <CalendarX2 className="size-4 stroke-[1.5]" />
            )}
            {session.attended ? "Attended" : "No-show"}
          </span>

          {session.indexDelta != null && (
            <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
              Index <DeltaPill value={session.indexDelta} />
            </span>
          )}

          {live && (
            <Button size="sm" className="ml-auto h-9 gap-1.5">
              <Video className="size-4 stroke-[1.75]" /> Join live
            </Button>
          )}
        </div>
      </section>

      {/* two-pane */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* left — transcript */}
        <section data-reveal className="rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)]">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">Transcript</p>
            <span className="text-[11px] text-muted-foreground">
              Tap a <Quote className="inline size-3 stroke-[1.75] align-text-bottom text-brand-600" /> quote to see the metric it gated
            </span>
          </div>

          {session.hasTranscript ? (
            <div className="flex flex-col gap-5">
              {transcript.map((t, i) => (
                <Turn key={i} turn={t} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <FileText className="size-6 stroke-[1.25] text-ink-300" />
              <div className="text-[13px] font-medium">No transcript captured</div>
              <p className="max-w-xs text-[12.5px] text-muted-foreground">
                This session did not have a recording bot, so there is nothing to review here.
              </p>
            </div>
          )}
        </section>

        {/* right — summary + deltas + notes & approval */}
        <div className="flex flex-col gap-6 lg:sticky lg:top-32">
          <SummaryPanel summary={session.summary} deltas={proposedDeltas} />
          <SessionNotesPanel session={session} />
        </div>
      </div>
    </div>
  )
}
