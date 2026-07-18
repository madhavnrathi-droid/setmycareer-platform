// Book and manage counselling sessions. A booking is a REQUEST written to the
// shared store (the counsellor confirms from their side); upcoming requests and
// past sessions both show here. Styled as a scheduler: tinted cards for
// confirmed time, the DASHED signature for pending requests, avatar stacks for
// who's in the room, and a round-button action cluster.

import { useState } from "react"
import { Link } from "react-router-dom"
import { Video, Mic, MapPin, Clock, X, Check, CalendarPlus, FileText, ChevronDown, NotebookPen } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUserSessions, useUserPurchases } from "@/lib/live-queries"
import type { UserSession } from "@/lib/smc-live-api"
import { sessionCallHref } from "@/lib/meeting-link"
import { toast } from "sonner"
import { Pane, Eyebrow, Chip, AvatarStack, RoundAction, timeRange } from "@/components/custom/ui-kit"
import {
  usePortalAccount,
  useBookings,
  requestBooking,
  cancelBooking,
  setBookingStatus,
  portalCallHref,
  profileComplete,
  type BookingMode,
} from "../portal-store"
import { ProfileGateCard } from "../components/ProfileGate"
import { useAllBookings, chooseCounsellor } from "../portal-store"
import { useLiveCounsellors } from "../counsellors"
import { autoAssign } from "../assignment"
import { usePortalCounsellor } from "../counsellors"
import { cn } from "@/lib/utils"

const MODES: { id: BookingMode; label: string; icon: typeof Video }[] = [
  { id: "video", label: "Video", icon: Video },
  { id: "voice", label: "Voice", icon: Mic },
  { id: "in_person", label: "In person", icon: MapPin },
]

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })
const fmtTs = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`


/* transcript helpers — export as a text file; stash context so Compass can
   reference "my last session transcript" (the chat reads this key). */
function exportTranscript(b: { topic: string; at: string; transcript?: string; notes?: { ts: number; text: string }[] }) {
  const lines = [
    `SetMyCareer session transcript`, `Topic: ${b.topic}`, `Date: ${new Date(b.at).toLocaleString()}`, "",
    ...(b.notes?.length ? ["NOTES:", ...b.notes.map((n) => `[${Math.floor(n.ts / 60)}:${String(n.ts % 60).padStart(2, "0")}] ${n.text}`), ""] : []),
    "TRANSCRIPT:", b.transcript ?? "",
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/plain" })
  const a = document.createElement("a")
  a.href = URL.createObjectURL(blob)
  a.download = `session-${b.at.slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(a.href)
}
function rememberTranscriptContext(b: { id: string; topic: string; at: string; transcript?: string }) {
  try {
    localStorage.setItem("smc.portal.compass.context", JSON.stringify({
      kind: "session_transcript", id: b.id, topic: b.topic, at: b.at,
      excerpt: (b.transcript ?? "").slice(0, 4000),
    }))
  } catch { /* noop */ }
}

function tomorrowISODate(): string {
  const d = new Date(Date.now() + 86400000)
  return d.toISOString().slice(0, 10)
}


/* ── the planner — reference layout: mini month + a day timeline overview ──── */
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

function MiniMonth({ selected, onSelect, busyDays }: { selected: Date; onSelect: (d: Date) => void; busyDays: Set<string> }) {
  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1))
  const first = new Date(view.getFullYear(), view.getMonth(), 1)
  const startPad = first.getDay()
  const days = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const label = view.toLocaleDateString([], { month: "long", year: "numeric" })
  const key = (d: Date) => d.toISOString().slice(0, 10)
  const today = new Date()
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-[13.5px] font-medium text-foreground">{label}</p>
        <div className="flex gap-1">
          <button aria-label="Previous month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))} className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-secondary">‹</button>
          <button aria-label="Next month" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))} className="grid size-7 place-items-center rounded-full text-ink-400 hover:bg-secondary">›</button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-y-1 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span key={i} className="font-mono text-[9.5px] uppercase text-ink-300">{d}</span>
        ))}
        {Array.from({ length: startPad }).map((_, i) => <span key={`p${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = new Date(view.getFullYear(), view.getMonth(), i + 1)
          const sel = sameDay(d, selected)
          const busy = busyDays.has(key(d))
          return (
            <button
              key={i} onClick={() => onSelect(d)}
              className={cn(
                "relative mx-auto grid size-8 place-items-center rounded-full text-[12.5px] tabular-nums transition-colors",
                sel ? "bg-foreground font-medium text-background ring-2 ring-[#d8e94f]" : sameDay(d, today) ? "font-medium text-brand-600 hover:bg-secondary" : "text-ink-600 hover:bg-secondary",
              )}
            >
              {i + 1}
              {busy && !sel && <span className="absolute bottom-0.5 size-1 rounded-full bg-brand-500" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayTimeline({ date, bookings }: { date: Date; bookings: { at: string; topic: string; status: string; who: string }[] }) {
  const dayBookings = bookings.filter((b) => sameDay(new Date(b.at), date))
  const label = date.toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })
  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] font-medium text-foreground">Overview · {label}</p>
        <div className="flex items-center gap-4 text-[11px] text-ink-400">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-well-500" /> Confirmed</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warn-500" /> Pending</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ink-300" /> Done</span>
        </div>
      </div>
      <div className="relative mt-5 h-[132px]">
        <div className="absolute inset-x-0 bottom-5 top-0 flex">
          {HOURS.map((h) => (
            <div key={h} className="relative flex-1 border-l border-dashed border-border first:border-l-0" />
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex text-center">
          {HOURS.map((h) => (
            <span key={h} className="flex-1 font-mono text-[9.5px] tabular-nums text-ink-300">
              {h <= 12 ? h : h - 12}{h < 12 ? "am" : "pm"}
            </span>
          ))}
        </div>
        {dayBookings.map((b, i) => {
          const d = new Date(b.at)
          const hour = d.getHours() + d.getMinutes() / 60
          const left = Math.min(97, Math.max(0, ((hour - HOURS[0]) / HOURS.length) * 100))
          const tone = b.status === "confirmed" ? "border-well-200 bg-well-50 text-well-700" : b.status === "requested" ? "border-warn-200 bg-warn-50 text-warn-700" : "border-border bg-secondary text-ink-600"
          const dot = b.status === "confirmed" ? "bg-well-500" : b.status === "requested" ? "bg-warn-500" : "bg-ink-300"
          return (
            <div key={i} className="absolute" style={{ left: `${left}%`, top: `${8 + (i % 3) * 34}px` }}>
              <span className={cn("absolute -left-1 top-1/2 size-2 -translate-y-1/2 rounded-full", dot)} />
              <span className={cn("ml-2 inline-block max-w-[180px] truncate rounded-lg border px-2.5 py-1 text-[11.5px] font-medium", tone)}>
                {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · {b.topic || b.who}
              </span>
            </div>
          )
        })}
        {dayBookings.length === 0 && (
          <p className="absolute left-0 top-2 text-[12px] font-light text-ink-300">Nothing on this day — request a session below.</p>
        )}
      </div>
    </div>
  )
}

export function PortalSessions() {
  const account = usePortalAccount()
  const bookings = useBookings(account?.clientId ?? "")
  // the member's assigned counsellor — resolved LIVE (from sessions' navi / roster)
  const { counsellor } = usePortalCounsellor()
  const [topic, setTopic] = useState("")
  const [date, setDate] = useState(tomorrowISODate())
  const [time, setTime] = useState("16:00")
  const [mode, setMode] = useState<BookingMode>("video")
  const [justBooked, setJustBooked] = useState(false)
  const [planDay, setPlanDay] = useState(() => new Date())
  const allBookings = useAllBookings()
  const roster = useLiveCounsellors()
  const [reviewId, setReviewId] = useState<string | null>(null)
  const [readerId, setReaderId] = useState<string | null>(null)

  if (!account) return null

  const upcoming = bookings.filter((b) => b.status === "requested" || b.status === "confirmed")
  const pastBookings = bookings.filter((b) => b.status === "completed")
  const memberInitials = account.name.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase()

  const book = () => {
    // auto-assignment: no counsellor yet → match on expertise + availability +
    // what the client wrote in their profile (assignment.ts), then book with them
    let cid = counsellor?.id
    if (!cid) {
      const pick = autoAssign(account, roster.counsellors, allBookings)
      if (!pick) { toast("We couldn't reach the counsellor roster — try again in a moment."); return }
      chooseCounsellor(pick.counsellor.id)
      toast.success(`Matched with ${pick.counsellor.name} — ${pick.reason}`)
      cid = pick.counsellor.id
    }
    const at = new Date(`${date}T${time}:00`).toISOString()
    requestBooking({
      clientId: account.clientId,
      counsellorId: cid,
      topic: topic.trim() || "Counselling session",
      at,
      durationMin: 60,
      mode,
    })
    setTopic("")
    setJustBooked(true)
    setTimeout(() => setJustBooked(false), 3500)
  }

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-300">The hour that moves things</p>
          <h1 className="mt-2 font-editorial text-[32px] font-light tracking-tight sm:text-[38px]">Sessions</h1>
          <p className="mt-1.5 max-w-[52ch] text-[14px] text-muted-foreground">
            Book time with {counsellor?.name ?? "your counsellor"} — each session runs <span className="font-medium text-foreground">60 minutes</span>.
            {account.credits.sessions <= 0 && " Pay-as-you-go — you're only charged once your counsellor confirms."}
          </p>
        </div>
        {/* the balance — one honest number with a segmented bar */}
        <div className="flex min-w-[240px] flex-col gap-2 rounded-[20px] bg-card p-4 ring-1 ring-[rgba(24,24,27,0.06)] shadow-[0_1px_2px_rgba(24,24,27,0.03),0_12px_32px_-20px_rgba(24,24,27,0.20)]">
          <div className="flex items-baseline justify-between gap-4">
            <p className="font-display text-[32px] font-semibold leading-none tabular-nums text-foreground">{account.credits.sessions}</p>
            <Link to="/portal/billing" className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-[11.5px] font-medium text-background transition-opacity hover:opacity-90">Buy more</Link>
          </div>
          <p className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-400">session{account.credits.sessions === 1 ? "" : "s"} remaining</p>
          <div className="flex gap-1">
            {Array.from({ length: Math.max(account.credits.sessions + pastBookings.length, 4) }).slice(0, 10).map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < pastBookings.length ? "bg-ink-200" : i < pastBookings.length + account.credits.sessions ? "bg-[#d8e94f]" : "bg-border")} />
            ))}
          </div>
          <p className="text-[10.5px] font-light text-ink-400">{pastBookings.length} used · <span className="text-ink-600">lime = ready to book</span></p>
        </div>
      </div>

      {/* the planner — mini month + day overview, per the reference layout */}
      <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
        <MiniMonth
          selected={planDay} onSelect={setPlanDay}
          busyDays={new Set(bookings.filter((b) => b.status !== "canceled").map((b) => new Date(b.at).toISOString().slice(0, 10)))}
        />
        <DayTimeline
          date={planDay}
          bookings={bookings.filter((b) => b.status !== "canceled").map((b) => ({ at: b.at, topic: b.topic, status: b.status, who: counsellor?.name ?? "Session" }))}
        />
      </div>

      {/* upcoming — the scheduler cards, first because they're the commitment */}
      {upcoming.length > 0 && (
        <section data-reveal={undefined} className="space-y-3">
          <Eyebrow className="mb-0">Upcoming</Eyebrow>
          {upcoming.map((b) => {
            const pending = b.status === "requested"
            return (
              <div
                key={b.id}
                className={cn(
                  "flex flex-wrap items-center gap-4 rounded-2xl px-4 py-4 sm:px-5",
                  pending
                    ? "border border-dashed border-ink-200 bg-transparent"
                    : "bg-well-50/70 ring-1 ring-well-100",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Chip tone={pending ? "dashed" : "well"} icon={Clock} className="tabular-nums">
                      {timeRange(b.at, b.durationMin)}
                    </Chip>
                    <Chip tone="neutral" className="tabular-nums">{fmtWhen(b.at)}</Chip>
                    <Chip tone={pending ? "warn" : "well"}>{pending ? "Pending confirm" : "Confirmed"}</Chip>
                  </div>
                  <p className="mt-2.5 truncate text-[15px] font-semibold text-foreground">{b.topic}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <AvatarStack
                      size={7}
                      people={[
                        { initials: counsellor?.initials ?? "C", img: counsellor?.img },
                        { initials: memberInitials, tone: "ink" },
                      ]}
                    />
                    <span className="text-[12px] text-muted-foreground">
                      You + {counsellor?.name?.split(" ")[0] ?? "your counsellor"} · <span className="capitalize">{b.mode.replace("_", " ")}</span>
                    </span>
                  </div>
                </div>
                {/* the round action cluster */}
                <div className="flex shrink-0 items-center gap-2">
                  {b.status === "confirmed" && (
                    <Link to={portalCallHref(account.clientId)} aria-label="Join session" title="Join session"
                      className="grid size-9 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700">
                      <Video className="size-4 stroke-[1.75]" />
                    </Link>
                  )}
                  <RoundAction
                    icon={X}
                    label="Cancel session"
                    tone="risk"
                    onClick={() => {
                      if (!window.confirm("Cancel this session request?")) return
                      const prev = b.status
                      cancelBooking(b.id)
                      toast("Session cancelled", { action: { label: "Undo", onClick: () => setBookingStatus(b.id, prev) } })
                    }}
                  />
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* no activity yet — name the state and point at the one thing to do */}
      {bookings.length === 0 && profileComplete(account) && (
        <div className="rounded-2xl border border-dashed border-ink-200 px-5 py-4">
          <p className="text-[13.5px] font-normal text-foreground">No sessions yet.</p>
          <p className="mt-1 max-w-[56ch] text-[12.5px] font-light leading-relaxed text-muted-foreground">
            Your first hour with your counsellor is where your results become a plan — request one below
            and they'll confirm a time that works.
          </p>
        </div>
      )}

      {/* request a session — locked until the profile intake is complete, because
          the counsellor who takes the session is matched + briefed from it */}
      {!profileComplete(account) ? (
        <ProfileGateCard action="Booking a session" />
      ) : (
      <Pane>
        <Eyebrow><span className="inline-flex items-center gap-1.5"><CalendarPlus className="size-3.5" /> Request a session</span></Eyebrow>
        {counsellor || roster.counsellors.length > 0 ? (
          <>
            <div className="flex items-center gap-2.5">
              {counsellor ? (
                <>
                  <AvatarStack size={8} people={[{ initials: counsellor.initials, img: counsellor.img }]} />
                  <p className="text-[13px] text-muted-foreground">with <span className="font-medium text-foreground">{counsellor.name}</span></p>
                </>
              ) : (
                <p className="text-[13px] text-muted-foreground">
                  Your counsellor is <span className="font-medium text-foreground">matched automatically</span> — expertise + availability, from your profile.
                </p>
              )}
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="topic" className="text-[12px] font-medium text-ink-600">What would you like to focus on?</Label>
                <Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Deciding between two job offers" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="date" className="text-[12px] font-medium text-ink-600">Date</Label>
                <Input id="date" type="date" value={date} min={tomorrowISODate()} onChange={(e) => setDate(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="time" className="text-[12px] font-medium text-ink-600">Time</Label>
                <Input id="time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label className="text-[12px] font-medium text-ink-600">How would you like to meet?</Label>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => {
                    const Icon = m.icon
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        aria-pressed={mode === m.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition",
                          mode === m.id
                            ? "bg-foreground text-background"
                            : "bg-secondary text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon className="size-4" /> {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
            <button
              onClick={book}
              className="mt-6 flex w-fit items-center justify-center gap-1.5 rounded-full bg-brand-600 px-6 py-2.5 text-[13px] font-medium text-white transition hover:bg-brand-700"
            >
              {justBooked ? (<><Check className="size-4" /> Request sent</>) : "Request session"}
            </button>
          </>
        ) : (
          <p className="text-[13px] text-muted-foreground">
            Your counsellor is assigned with your first session — request one and we'll match you from your results.
          </p>
        )}
      </Pane>
      )}

      {/* live sessions from the SetMyCareer backend (real history) */}
      <LiveSessions clientId={account.clientId} />

      {/* past — in-app reviewable bookings */}
      {pastBookings.length > 0 && (
        <Pane>
          <Eyebrow>Past sessions</Eyebrow>
          <div className="divide-y divide-border">
            {[...pastBookings].reverse().map((b) => {
              const open = reviewId === b.id
              const hasRecap = (b.notes?.length ?? 0) > 0 || !!b.transcript
              return (
                <div key={b.id} className="py-1">
                  <button
                    onClick={() => setReviewId(open ? null : b.id)}
                    className="flex w-full items-center gap-4 py-2.5 text-left"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-well-50 text-well-700"><Check className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-foreground">{b.topic}</p>
                      <p className="text-[12.5px] text-muted-foreground">
                        {fmtWhen(b.endedAt ?? b.at)} · {b.actualMin ?? b.durationMin} min
                        {(b.notes?.length ?? 0) > 0 && <> · {b.notes!.length} note{b.notes!.length === 1 ? "" : "s"}</>}
                      </p>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-[11.5px] font-medium text-brand-600">
                      {hasRecap ? "Review" : "Details"}
                      <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
                    </span>
                  </button>

                  {open && (
                    <div className="mb-3 ml-12 space-y-4 rounded-2xl bg-secondary/50 p-4 ring-1 ring-border">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">
                            <NotebookPen className="size-3.5" /> Session notes
                          </p>
                          {b.notes?.length ? (
                            <ul className="space-y-2">
                              {b.notes.map((n, i) => (
                                <li key={i} className="flex gap-2.5 text-[13px]">
                                  <span className="shrink-0 rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[11px] tabular-nums text-brand-700">{fmtTs(n.ts)}</span>
                                  <span className="text-foreground">{n.text}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-[13px] text-muted-foreground">No notes were taken in this session.</p>
                          )}
                        </div>
                        <div>
                          <p className="mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-300">
                            <FileText className="size-3.5" /> Transcript
                          </p>
                          {b.transcript ? (
                            <>
                            <div className="mb-2 flex flex-wrap gap-2">
                              <button onClick={() => setReaderId(b.id)} className="rounded-full bg-foreground px-3 py-1.5 text-[11.5px] font-medium text-background hover:opacity-90">Read full screen</button>
                              <button onClick={() => exportTranscript(b)} className="rounded-full border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground hover:bg-secondary">Export .txt</button>
                              <Link to="/portal/therapy" onClick={() => rememberTranscriptContext(b)} className="rounded-full border border-border px-3 py-1.5 text-[11.5px] font-medium text-foreground hover:bg-secondary">Discuss with Compass</Link>
                            </div>
                            <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">{b.transcript}</p>
                            </>
                          ) : (
                            <p className="text-[13px] text-muted-foreground">The transcript is generated from the recording and attaches here once processed.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Pane>
      )}

      {/* nudge */}
      <div className="flex flex-col gap-4 rounded-[20px] bg-secondary/50 p-5 ring-1 ring-border sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">Want more time?</p>
          <p className="text-[12.5px] text-muted-foreground">Book an additional session, or talk it through with Compass right now.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/portal/services/additional_session" className="shrink-0 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-medium text-background hover:opacity-90">Buy a session</Link>
          <Link to="/portal/therapy" className="shrink-0 rounded-full border border-border px-4 py-2 text-[12.5px] font-medium text-foreground hover:bg-secondary">Ask Compass</Link>
        </div>
      </div>
      {/* full-screen transcript reader */}
      {readerId && (() => {
        const b = bookings.find((x) => x.id === readerId)
        if (!b) return null
        return (
          <div className="fixed inset-0 z-[80] overflow-y-auto bg-background p-6 sm:p-12" role="dialog" aria-modal="true">
            <div className="mx-auto max-w-3xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">Session transcript</p>
                  <h2 className="mt-1 font-editorial text-[24px] font-light tracking-tight">{b.topic}</h2>
                  <p className="text-[12px] text-muted-foreground">{new Date(b.at).toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => exportTranscript(b)} className="rounded-full border border-border px-4 py-2 text-[12.5px] font-medium hover:bg-secondary">Export .txt</button>
                  <button onClick={() => setReaderId(null)} className="rounded-full bg-foreground px-4 py-2 text-[12.5px] font-medium text-background hover:opacity-90">Close</button>
                </div>
              </div>
              <p className="mt-6 whitespace-pre-wrap text-[14.5px] leading-[1.8] text-foreground">{b.transcript}</p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

// ── live session history from the SetMyCareer backend ────────────────────────
const parseLiveDate = (d?: string): number => {
  if (!d) return 0
  const [dd, mm, yy] = d.split("/").map(Number)
  return new Date(yy || 0, (mm || 1) - 1, dd || 1).getTime()
}
const fmtLiveDate = (d?: string): string => {
  const t = parseLiveDate(d)
  return t ? new Date(t).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) : (d ?? "")
}
const STATUS_TONE: Record<string, "well" | "brand" | "warn" | "neutral"> = {
  Completed: "well", Booked: "brand", Pending: "warn", Cancelled: "neutral", Deleted: "neutral",
}
const isUpcoming = (status?: string) => /book|pending|scheduled|upcoming/i.test(String(status))

function LiveSessions({ clientId }: { clientId: string }) {
  const { data: sessions, loading } = useUserSessions(clientId)
  const { data: purchases } = useUserPurchases(clientId)
  const pkg = purchases?.data?.[0]
  const list = (sessions ?? []).slice().sort((a, b) => parseLiveDate(b.session_date) - parseLiveDate(a.session_date))
  const lead = list[0]

  if (loading) return <div className="h-24 animate-pulse rounded-[20px] bg-secondary" />
  if (!list.length && !pkg) return null

  return (
    <Pane>
      {(pkg || lead?.navi_name) && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <AvatarStack size={11} people={[{ initials: (lead?.navi_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2), img: lead?.navi_img }]} />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-brand-600">Your counsellor</p>
            <p className="truncate text-[14.5px] font-semibold text-foreground">{lead?.navi_name ?? "—"}</p>
          </div>
          {pkg && <Chip tone="mind" className="ml-auto">{pkg.package_name}</Chip>}
        </div>
      )}

      {list.length > 0 && (
        <>
          <Eyebrow><span>Session history · <span className="tabular-nums">{list.length}</span></span></Eyebrow>
          <div className="divide-y divide-border">
            {list.map((s) => <LiveSessionRow key={String(s.session_id)} s={s} clientId={clientId} />)}
          </div>
        </>
      )}
    </Pane>
  )
}

function LiveSessionRow({ s, clientId }: { s: UserSession; clientId: string }) {
  const up = isUpcoming(s.session_status)
  return (
    <div className="flex items-center gap-3 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium text-foreground">{s.sessionTopic || s.session_name || "Counselling session"}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Chip tone="neutral" icon={Clock} className="tabular-nums">{fmtLiveDate(s.session_date)}{s.session_time ? ` · ${s.session_time}` : ""}</Chip>
          {s.navi_name && <Chip tone="outline">{s.navi_name}</Chip>}
        </div>
      </div>
      <Chip tone={STATUS_TONE[String(s.session_status)] ?? "neutral"} className="shrink-0">{s.session_status}</Chip>
      {up && (
        <Link to={sessionCallHref(clientId, s)} className="shrink-0 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-medium text-background transition hover:opacity-90">Join</Link>
      )}

    </div>
  )
}
