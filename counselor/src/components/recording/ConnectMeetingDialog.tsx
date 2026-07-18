import { useEffect, useRef, useState } from "react"
import {
  Link2, Loader2, CircleCheck, Bot, Radio, TriangleAlert,
} from "lucide-react"
import type { RecordingDraft, RecordingLine } from "@/lib/types"
import { RECORDING_SCRIPT } from "@/lib/mock"
import { useRecording } from "@/lib/recording"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

/* Connect-meeting / bot auto-join (SPEC #6) — wired to the REAL Recall.ai bot via
   the backend (`POST /api/meetings/bot` → dispatch; `GET /api/meetings/bot/:id`
   → poll for the transcript). On a live call with the bot admitted, the real
   transcript flows back and seeds the log step. If the bot can't be dispatched
   (no credits / not a live call) we degrade to a sample transcript so the flow
   still completes — never a dead end.

   Opens via the `compass:connect-meeting` CustomEvent (fired by the registry). */

// Dev proxies /api → the backend; in prod we call the backend origin directly
// (CORS is enabled there). The counselor app has no /api/meetings function itself.
const API_BASE = import.meta.env.DEV ? "" : "https://setmycareer.vercel.app"
const POLL_MS = 3000
const POLL_MAX = 6 // ~18s of polling before we offer the sample preview

type Phase = "input" | "joining" | "transcribing" | "done"

const STEPS: { key: Phase; label: string }[] = [
  { key: "joining", label: "Dispatching the note-taking bot…" },
  { key: "transcribing", label: "Bot in the call · transcribing" },
  { key: "done", label: "Transcript ready" },
]

function parseTranscript(text: string): RecordingLine[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^([^:]{1,40}):\s*(.*)$/)
      return m ? { speaker: m[1].trim(), text: m[2].trim() } : { speaker: "", text: l }
    })
    .filter((l) => l.text)
}

export function ConnectMeetingDialog() {
  const rec = useRecording()
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState("")
  const [phase, setPhase] = useState<Phase>("input")
  const [lines, setLines] = useState(0)
  const [notice, setNotice] = useState<string | null>(null)
  const [realTranscript, setRealTranscript] = useState<RecordingLine[] | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const cancelled = useRef(false)

  useEffect(() => {
    const onOpen = () => { reset(); setOpen(true) }
    window.addEventListener("compass:connect-meeting", onOpen)
    return () => window.removeEventListener("compass:connect-meeting", onOpen)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => { cancelled.current = true; clearTimers() }, [])

  function clearTimers() { timers.current.forEach(clearTimeout); timers.current = [] }
  function reset() {
    cancelled.current = false
    clearTimers()
    setLink(""); setPhase("input"); setLines(0); setNotice(null); setRealTranscript(null)
  }

  // sample preview cadence (fallback so the flow always completes)
  function runSample(note?: string) {
    if (note) setNotice(note)
    setPhase("transcribing")
    let n = 0
    const id = setInterval(() => {
      n += 1; setLines(n)
      if (n >= RECORDING_SCRIPT.length) clearInterval(id)
    }, 260)
    timers.current.push(id as unknown as ReturnType<typeof setTimeout>)
    timers.current.push(setTimeout(() => setPhase("done"), RECORDING_SCRIPT.length * 260 + 400))
  }

  async function pollTranscript(botId: string, attempt = 0) {
    if (cancelled.current) return
    try {
      const r = await fetch(`${API_BASE}/api/meetings/bot/${botId}`)
      const data = await r.json()
      if (data?.transcript_ready && typeof data.transcript === "string") {
        const parsed = parseTranscript(data.transcript)
        if (parsed.length) {
          setRealTranscript(parsed)
          setLines(parsed.length)
          setPhase("done")
          return
        }
      }
    } catch { /* keep polling */ }
    if (attempt + 1 >= POLL_MAX) {
      // the bot is in the call but the meeting is still ongoing — let the
      // counselor preview the flow now; the real transcript persists server-side.
      runSample("Bot is in the call — the full transcript saves when the meeting ends. Previewing with a sample for now.")
      return
    }
    timers.current.push(setTimeout(() => pollTranscript(botId, attempt + 1), POLL_MS))
  }

  async function submit() {
    if (!isMeetingLink(link)) return
    setPhase("joining"); setNotice(null)
    try {
      const r = await fetch(`${API_BASE}/api/meetings/bot`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ meeting_url: link.trim() }),
      })
      const data = await r.json()
      if (data?.bot_id) {
        setPhase("transcribing")
        pollTranscript(String(data.bot_id))
        return
      }
      runSample(data?.message || "Live bot unavailable — previewing with a sample transcript.")
    } catch {
      runSample("Couldn't reach the meeting service — previewing with a sample transcript.")
    }
  }

  function finish() {
    const transcript = realTranscript ?? RECORDING_SCRIPT
    const draft: RecordingDraft = {
      id: `rec_meet_${Date.now()}`,
      durationMin: 42,
      startedAt: new Date().toISOString(),
      transcript,
      source: "meeting",
      transcribed: !!realTranscript,
    }
    setOpen(false)
    setTimeout(() => rec.setPendingDraftFromMeeting?.(draft), 60)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { cancelled.current = true; setOpen(false); reset() } }}>
      <DialogContent
        showCloseButton={phase === "input"}
        className="rounded-2xl border-hairline bg-[var(--surface-frost-strong)] shadow-[var(--shadow-float)] backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-600">
            <Bot className="size-5 stroke-[1.5]" />
          </div>
          <DialogTitle className="font-display text-[19px] font-light tracking-tight">
            Connect a meeting
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Paste a Zoom or Google Meet link. A note-taking bot joins the call and
            transcribes it live — no software for your client to install.
          </DialogDescription>
        </DialogHeader>

        {phase === "input" ? (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 stroke-[1.5] text-ink-300" />
              <Input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && isMeetingLink(link)) submit() }}
                placeholder="https://zoom.us/j/…  ·  meet.google.com/…"
                aria-label="Meeting link"
                className="h-11 rounded-xl pl-9 text-[13px]"
                autoFocus
              />
            </div>
            <Button className="h-11 gap-2 text-[13px]" disabled={!isMeetingLink(link)} onClick={submit}>
              <Bot className="size-4 stroke-[1.75]" /> Send bot to join
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">Powered by the Recall.ai meeting bot</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-1">
            <ol className="flex flex-col gap-3">
              {STEPS.map((step) => {
                const reached = phaseIndex(phase) >= phaseIndex(step.key)
                const active = phase === step.key && step.key !== "done"
                const complete =
                  phaseIndex(phase) > phaseIndex(step.key) || (phase === "done" && step.key === "done")
                return (
                  <li key={step.key} className={cn("flex items-center gap-3 text-[13px]", reached ? "text-foreground" : "text-ink-300")}>
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-secondary">
                      {complete ? (
                        <CircleCheck className="size-4 stroke-[1.75] text-well-600" />
                      ) : active ? (
                        step.key === "transcribing"
                          ? <Radio className="size-4 stroke-[1.75] text-brand-600" />
                          : <Loader2 className="size-4 animate-spin stroke-[1.75] text-brand-600" />
                      ) : (
                        <span className="size-1.5 rounded-full bg-ink-300" />
                      )}
                    </span>
                    <span className={cn(active && "font-medium")}>
                      {step.label}
                      {step.key === "transcribing" && phase === "transcribing" && (
                        <span className="ml-1.5 tabular-nums text-muted-foreground">· {lines} lines</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>

            {notice && (
              <div className="flex items-start gap-2 rounded-xl bg-warn-100 px-3 py-2 text-[11.5px] leading-snug text-warn-600">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0 stroke-[1.75]" />
                <span>{notice}</span>
              </div>
            )}

            {phase === "done" && (
              <Button className="mt-1 h-11 text-[13px]" onClick={finish}>
                {realTranscript ? "Log this session (real transcript)" : "Log this session"}
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function phaseIndex(p: Phase): number {
  return ["input", "joining", "transcribing", "done"].indexOf(p)
}
function isMeetingLink(v: string): boolean {
  return /zoom\.us|meet\.google|teams\.microsoft|whereby|webex|\.zoom\./i.test(v.trim()) || v.trim().length > 12
}
