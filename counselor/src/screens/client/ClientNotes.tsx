import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Lock, Link2, NotebookPen, Tag, ShieldCheck, Pencil, ChevronRight } from "lucide-react"
import { toast } from "sonner"
import type { Client, Note } from "@/lib/types"
import { clientNotes, counselor, getSession } from "@/lib/mock"
import { useClientSessions } from "@/lib/stores"
import { useGsap, revealChildren } from "@/lib/gsap"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

type ComposerType = Extract<Note["type"], "soap" | "progress" | "private">

const TYPE_META: Record<Note["type"], { label: string; tone: string }> = {
  soap: { label: "SOAP", tone: "bg-mind-100 text-mind-600" },
  progress: { label: "Progress", tone: "bg-brand-100 text-brand-600" },
  intake: { label: "Intake", tone: "bg-secondary text-ink-700" },
  private: { label: "Private", tone: "bg-warn-100 text-warn-600" },
}

const COMPOSER_TYPES: { value: ComposerType; label: string }[] = [
  { value: "soap", label: "SOAP note" },
  { value: "progress", label: "Progress note" },
  { value: "private", label: "Private note" },
]

const fmtStamp = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })

function TypeBadge({ type }: { type: Note["type"] }) {
  const m = TYPE_META[type]
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.08em]", m.tone)}>
      {m.label}
    </span>
  )
}

const fmtSessionDate = (iso: string) =>
  new Date(iso).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })

export function ClientNotes({ client }: { client: Client }) {
  const [notes, setNotes] = useState<Note[]>(() => clientNotes(client.id))
  const [body, setBody] = useState("")
  const [type, setType] = useState<ComposerType>("soap")
  const ref = useGsap((s) => revealChildren(s), [client.id])

  // session-attached notes (the recorded/logged ones) carry an approval status
  const sessions = useClientSessions(client.id)
  const sessionNotes = useMemo(
    () =>
      sessions
        .filter((s) => s.notes)
        .sort((a, b) => +new Date(b.date) - +new Date(a.date)),
    [sessions],
  )
  const pendingCount = sessionNotes.filter((s) => s.notes?.status === "draft").length

  const sorted = useMemo(
    () => [...notes].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
    [notes],
  )

  function save() {
    const trimmed = body.trim()
    if (!trimmed) {
      toast.error("Write something before saving.")
      return
    }
    const note: Note = {
      id: `nt_${Date.now()}`,
      clientId: client.id,
      body: trimmed,
      type,
      author: counselor.name,
      createdAt: new Date().toISOString(),
      tags: [],
    }
    setNotes((prev) => [note, ...prev]) // optimistic
    setBody("")
    setType("soap")
    toast.success("Note saved", { description: `${TYPE_META[note.type].label} · counselor-only` })
  }

  return (
    <div ref={ref} className="flex flex-col gap-6">
      {/* composer */}
      <section data-reveal className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NotebookPen className="size-4 stroke-[1.5] text-ink-700" />
            <span className="text-[13px] font-medium">New note</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-100 px-2.5 py-1 text-[10.5px] font-medium text-warn-600">
            <Lock className="size-3 stroke-[1.75]" /> Counselor-only
          </span>
        </div>

        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Document the session — observations, assessment, plan…"
          rows={4}
          aria-label="Note body"
          className="resize-none text-[13px]"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Select value={type} onValueChange={(v) => setType(v as ComposerType)}>
            <SelectTrigger aria-label="Note type" className="h-9 w-44 text-[13px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COMPOSER_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value} className="text-[13px]">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" className="ml-auto h-9 px-5" onClick={save} disabled={!body.trim()}>
            Save note
          </Button>
        </div>
      </section>

      {/* session notes + approval status — what's pending vs shared */}
      {sessionNotes.length > 0 && (
        <section data-reveal>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
              Session notes · approval
            </p>
            {pendingCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warn-100 px-2.5 py-1 text-[10.5px] font-medium text-warn-600">
                <Pencil className="size-3 stroke-[1.75]" />
                <span className="tabular-nums">{pendingCount}</span> awaiting approval
              </span>
            )}
          </div>

          <div className="overflow-hidden rounded-2xl bg-card shadow-[var(--shadow-e2)]">
            <div className="flex flex-col divide-y divide-border">
              {sessionNotes.map((s) => {
                const approved = s.notes?.status === "approved"
                return (
                  <Link
                    key={s.id}
                    to={`../sessions/${s.id}`}
                    className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary"
                  >
                    <div className="w-24 shrink-0 text-[13px] font-medium tabular-nums">
                      {fmtSessionDate(s.date)}
                    </div>
                    <p className="hidden min-w-0 flex-1 truncate text-[12.5px] text-ink-600 sm:block">
                      {s.notes?.client || s.summary || "Session notes"}
                    </p>
                    <span
                      className={cn(
                        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[10.5px] font-medium",
                        approved ? "bg-well-100 text-well-600" : "bg-warn-100 text-warn-600",
                      )}
                    >
                      {approved ? (
                        <><ShieldCheck className="size-3 stroke-[1.75]" /> Shared</>
                      ) : (
                        <><Pencil className="size-3 stroke-[1.75]" /> Draft</>
                      )}
                    </span>
                    <ChevronRight className="size-4 shrink-0 stroke-[1.5] text-ink-300 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                )
              })}
            </div>
          </div>
          <p className="mt-2.5 text-[11.5px] leading-snug text-muted-foreground">
            Draft notes stay private. Shared notes appear on the client's own dashboard.
          </p>
        </section>
      )}

      {/* feed */}
      <section data-reveal>
        <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">
          Notes · {sorted.length}
        </p>

        {sorted.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-14 text-center">
            <NotebookPen className="mx-auto size-6 stroke-[1.25] text-ink-300" />
            <p className="mt-3 text-[13px] text-muted-foreground">No notes yet — start with the composer above.</p>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {sorted.map((n) => {
              const session = n.sessionId ? getSession(n.sessionId) : undefined
              return (
                <li key={n.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <TypeBadge type={n.type} />
                    <span className="text-[12.5px] font-medium tabular-nums">{fmtStamp(n.createdAt)}</span>
                    <span className="text-[12px] text-muted-foreground">{n.author}</span>
                    {session && (
                      <span className="inline-flex items-center gap-1 text-[11.5px] text-brand-600">
                        <Link2 className="size-3 stroke-[1.5]" />
                        Session {fmtStamp(session.date).replace(/^\w+,\s/, "")}
                      </span>
                    )}
                  </div>

                  <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-foreground">{n.body}</p>

                  {n.tags.length > 0 && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
                      {n.tags.map((tg) => (
                        <span
                          key={tg}
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-ink-600"
                        >
                          <Tag className="size-2.5 stroke-[1.5]" /> {tg}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </section>
    </div>
  )
}
