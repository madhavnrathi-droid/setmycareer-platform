import { useMemo, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { toast } from "sonner"
import {
  ShieldCheck, ArrowLeft, Quote, Check, SlidersHorizontal,
  ArrowRight, Lock, MessageSquareText,
} from "lucide-react"
import type { Confidence, ScoreDelta } from "@/lib/types"
import { getSession, getClient, transcript, proposedDeltas } from "@/lib/mock"
import { Delta } from "@/components/custom/StatCard"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const CONFIDENCE_TONE: Record<Confidence, string> = {
  none: "bg-ink-100 text-ink-500",
  low: "bg-ink-100 text-ink-600",
  tentative: "bg-warn-100 text-warn-600",
  moderate: "bg-brand-100 text-brand-600",
  high: "bg-well-100 text-well-600",
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

type DeltaState = { approved: boolean; after: number }

function DeltaRow({
  d, state, onApprove, onAdjust,
}: {
  d: ScoreDelta
  state: DeltaState
  onApprove: () => void
  onAdjust: (next: number) => void
}) {
  const [editing, setEditing] = useState(false)
  const movement = state.after - (d.before ?? 0)

  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 transition-colors",
        state.approved ? "border-well-600/40 bg-well-100/30" : "border-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-[13.5px] font-medium">{d.name}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]",
                CONFIDENCE_TONE[d.confidence],
              )}
            >
              {d.confidence}
            </span>
          </div>
          <div className="mt-0.5 font-mono text-[10.5px] text-ink-300">{d.id}</div>
        </div>
        {state.approved && (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-well-600">
            <Check className="size-3.5 stroke-[2]" /> Approved
          </span>
        )}
      </div>

      {/* before → after */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-display text-[26px] font-extralight leading-none tabular-nums text-ink-500">
            {d.before ?? "—"}
          </span>
          <ArrowRight className="size-4 shrink-0 stroke-[1.5] text-ink-300" />
          {editing ? (
            <input
              type="number"
              min={0}
              max={100}
              value={state.after}
              autoFocus
              onChange={(e) => onAdjust(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
              onBlur={() => setEditing(false)}
              onKeyDown={(e) => e.key === "Enter" && setEditing(false)}
              aria-label={`Adjusted score for ${d.name}`}
              className="w-16 rounded-md border border-brand-500 bg-background px-2 py-0.5 font-display text-[26px] font-extralight leading-none tabular-nums text-foreground outline-none [appearance:textfield] focus-visible:ring-2 focus-visible:ring-brand-500/40 [&::-webkit-inner-spin-button]:appearance-none"
            />
          ) : (
            <span className="font-display text-[26px] font-extralight leading-none tabular-nums text-foreground">
              {state.after}
            </span>
          )}
        </div>
        <Delta value={movement === 0 ? null : movement} className="mb-0.5" />
      </div>

      {/* source quote — the auditable evidence */}
      <figure className="mt-3 flex gap-2.5 rounded-lg bg-secondary px-3 py-2.5">
        <Quote className="mt-0.5 size-3.5 shrink-0 stroke-[1.5] text-ink-300" />
        <blockquote className="text-[12.5px] italic leading-snug text-ink-600">"{d.quote}"</blockquote>
      </figure>

      {/* actions */}
      <div className="mt-3.5 flex items-center gap-2">
        <button
          onClick={onApprove}
          aria-pressed={state.approved}
          className={cn(
            "inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-md text-[12.5px] font-medium transition-colors",
            state.approved
              ? "bg-well-100 text-well-600 hover:bg-well-100/70"
              : "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          <Check className="size-3.5 stroke-[2]" />
          {state.approved ? "Approved" : "Approve"}
        </button>
        <button
          onClick={() => setEditing((v) => !v)}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-ink-300 hover:text-foreground"
        >
          <SlidersHorizontal className="size-3.5 stroke-[1.5]" /> Adjust
        </button>
      </div>
    </div>
  )
}

export function TranscriptReview() {
  const { clientId, sessionId } = useParams()
  const client = getClient(clientId ?? "")
  const session = getSession(sessionId ?? "")
  const base = `/clients/${clientId}`

  const [states, setStates] = useState<Record<string, DeltaState>>(() =>
    Object.fromEntries(
      proposedDeltas.map((d) => [d.id, { approved: d.approved, after: d.after }]),
    ),
  )
  const [committed, setCommitted] = useState(false)

  const ref = useGsap((s) => revealChildren(s), [sessionId])

  const approvedCount = useMemo(
    () => proposedDeltas.filter((d) => states[d.id]?.approved).length,
    [states],
  )

  const setApproved = (id: string) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], approved: !prev[id].approved } }))
  const setAfter = (id: string, after: number) =>
    setStates((prev) => ({ ...prev, [id]: { ...prev[id], after } }))

  const commit = () => {
    if (approvedCount === 0) return
    setCommitted(true)
    toast.success(
      `${approvedCount} ${approvedCount === 1 ? "update" : "updates"} committed to the blueprint`,
      { description: "These now reach the client's shared read." },
    )
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
        <MessageSquareText className="size-6 stroke-[1.25] text-ink-300" />
        <div>
          <div className="text-[14px] font-medium">Transcript not found</div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            This session has no transcript on file.
          </p>
        </div>
        <Link
          to={`${base}/transcripts`}
          className="mt-1 inline-flex h-9 items-center rounded-md border border-border bg-background px-3.5 text-[13px] font-medium transition-colors hover:border-ink-300"
        >
          Back to transcripts
        </Link>
      </div>
    )
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {/* header */}
      <header data-reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            to={`${base}/transcripts`}
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5 stroke-[1.5]" /> Transcripts
          </Link>
          <h2 className="mt-2 font-display text-[clamp(20px,2.4vw,26px)] font-extralight tracking-tight">
            Transcript review · {fmtDate(session.date)}
          </h2>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {client?.name ?? "Client"} · {session.durationMin} min session
          </p>
        </div>
      </header>

      {/* the moat: nothing reaches the client until approved */}
      <div
        data-reveal
        className="flex items-start gap-3 rounded-2xl border border-l-2 border-border bg-brand-100/40 px-4 py-3.5"
        style={{ borderLeftColor: "var(--color-brand-500)" }}
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 stroke-[1.5] text-brand-600" />
        <div>
          <div className="text-[12.5px] font-medium text-brand-600">
            Nothing reaches the client until you approve.
          </div>
          <p className="mt-0.5 text-[12px] text-ink-600">
            The model proposes; you decide. Adjust any score, approve what holds up, then commit.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_minmax(360px,440px)]">
        {/* left — transcript */}
        <section data-reveal>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Transcript</p>
            <span className="text-[11px] tabular-nums text-muted-foreground">{transcript.length} turns</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <ol className="flex flex-col gap-5">
              {transcript.map((turn, i) => (
                <li key={i} className="flex gap-3.5">
                  <span className="w-12 shrink-0 pt-0.5 text-[11px] tabular-nums text-ink-300">{turn.ts}</span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-500">
                      {turn.speaker}
                    </div>
                    <p className="mt-1 text-[13.5px] leading-relaxed text-foreground">{turn.text}</p>
                    {turn.gatesMetric && (
                      <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 font-mono text-[10.5px] text-ink-500">
                        <span className="size-1.5 rounded-full bg-brand-500" />
                        gates {turn.gatesMetric}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* right — proposed deltas + sticky commit */}
        <section data-reveal className="flex flex-col">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Proposed updates</p>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {approvedCount}/{proposedDeltas.length} approved
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {proposedDeltas.map((d) => (
              <DeltaRow
                key={d.id}
                d={d}
                state={states[d.id]}
                onApprove={() => setApproved(d.id)}
                onAdjust={(next) => setAfter(d.id, next)}
              />
            ))}
          </div>

          {/* sticky commit bar */}
          <div className="sticky bottom-4 mt-4">
            <div className="rounded-2xl border border-border bg-card/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-card/80">
              {committed ? (
                <div className="flex items-center justify-center gap-2 py-1.5 text-[13px] font-medium text-well-600">
                  <Check className="size-4 stroke-[2]" />
                  Committed to blueprint
                </div>
              ) : (
                <>
                  <button
                    onClick={commit}
                    disabled={approvedCount === 0}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-500 text-[13.5px] font-medium text-white transition-colors hover:bg-brand-500/90 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-500"
                  >
                    <ShieldCheck className="size-4 stroke-[1.75]" />
                    Approve &amp; commit ({approvedCount})
                  </button>
                  <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
                    <Lock className="size-3 stroke-[1.5]" />
                    {approvedCount === 0
                      ? "Approve at least one update to commit."
                      : "Only approved updates are written."}
                  </p>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
