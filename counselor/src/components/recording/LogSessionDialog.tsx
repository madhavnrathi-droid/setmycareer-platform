import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ClipboardCheck, Clock, NotebookPen, Loader2, AudioLines, Plus, Check } from "lucide-react"
import { toast } from "sonner"
import { logRecording, parkUnlogged, addClient } from "@/lib/mock"
import { useCaseloadClients } from "@/lib/caseload"
import type { RecordingDraft } from "@/lib/types"
import { formatElapsed, useRecording } from "@/lib/recording"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

/* Log-session step (SPEC #4). Opens when a recording is stopped. Confirms the
   client (prefilled if the recording was client-scoped), an auto-suggested title
   and date=now, then creates a logged session WITH auto-draft notes — appearing
   in that client's Sessions list. "Log later" parks it as an unlogged recording
   the counselor can return to. */
export function LogSessionDialog({
  draft,
  open,
  onResolved,
}: {
  draft: RecordingDraft | null
  open: boolean
  /** Called once the draft is consumed (logged or parked / dismissed). */
  onResolved: () => void
}) {
  const nav = useNavigate()
  const { transcribing, processingStep } = useRecording()
  const procLabel = processingStep === "drafting" ? "Drafting notes…" : "Transcribing…"
  const [clientId, setClientId] = useState<string>("")
  const [title, setTitle] = useState("")
  // inline "+ New client" quick-add state
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState("")
  // the counsellor's LIVE caseload, plus any client quick-added in this dialog
  const { clients: caseload } = useCaseloadClients()
  const [added, setAdded] = useState<{ id: string; name: string }[]>([])
  const clients = useMemo(() => [...added, ...caseload], [added, caseload])

  const suggestedTitle = useMemo(() => {
    if (!draft) return "Recorded session"
    const first = draft.transcript.find((l) => l.speaker !== "Dr. Lin")?.text ?? ""
    if (/product|move|switch|direction/i.test(first)) return "Direction & next steps"
    if (/portfolio|interview|cv|prep/i.test(first)) return "Interview & portfolio prep"
    if (/drained|burn|workload|tired/i.test(first)) return "Check-in · wellbeing + search"
    return draft.source === "meeting" ? "Meeting session" : "Session recap"
  }, [draft])

  // (re)seed when a new draft arrives
  useEffect(() => {
    if (draft) {
      setClientId(draft.clientId ?? "")
      setTitle(suggestedTitle)
      setAdding(false)
      setNewName("")
    }
  }, [draft, suggestedTitle])

  function confirmNewClient() {
    const name = newName.trim()
    if (!name) {
      toast.error("Enter a name for the new client.")
      return
    }
    // Sensible defaults for fields the quick-add doesn't collect; the rest of the
    // intake can be completed later from the client's profile.
    const client = addClient({ name, relationship: "career coaching" })
    setAdded((a) => [{ id: client.id, name: client.name }, ...a]) // show in the picker
    setClientId(client.id) // auto-select so the counselor can log immediately
    setAdding(false)
    setNewName("")
    toast.success("Client added", { description: `${client.name} is now selected.` })
  }

  if (!draft) return null

  const durLabel = formatElapsed(draft.durationMin * 60000)
  const linesCount = draft.transcript.length

  function confirm() {
    if (!draft) return
    if (!clientId) {
      toast.error("Choose a client to log this session.")
      return
    }
    const client = clients.find((c) => c.id === clientId)
    const session = logRecording(draft, {
      clientId,
      clientName: client?.name,
      title: title.trim() || suggestedTitle,
    })
    toast.success("Session logged", {
      description: `${client?.name ?? "Client"} · draft notes generated`,
      action: {
        label: "Open",
        onClick: () => nav(`/clients/${clientId}/sessions/${session.id}`),
      },
    })
    onResolved()
  }

  function logLater() {
    if (!draft) return
    parkUnlogged(draft)
    toast("Saved to log later", { description: "Find it on your dashboard when you're ready." })
    onResolved()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // closing via Esc / overlay click = log later (don't lose the recording)
        if (!o) logLater()
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="rounded-2xl border-hairline bg-[var(--surface-frost-strong)] shadow-[var(--shadow-float)] backdrop-blur-xl sm:max-w-md"
      >
        <DialogHeader>
          <div className="mb-1 grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-600">
            <ClipboardCheck className="size-5 stroke-[1.5]" />
          </div>
          <DialogTitle className="font-display text-[19px] font-light tracking-tight">
            Log this session
          </DialogTitle>
          <DialogDescription className="text-[12.5px]">
            Confirm who it was with. Draft notes are generated automatically — nothing
            is shared with the client until you approve them.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-4 rounded-xl bg-secondary/60 px-3.5 py-2.5 text-[12px] text-ink-600">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 stroke-[1.5]" />
            <span className="font-medium tabular-nums text-foreground">{durLabel}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <NotebookPen className="size-3.5 stroke-[1.5]" />
            <span className="tabular-nums">{linesCount}</span> transcript lines
          </span>
          {transcribing ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-brand-600">
              <Loader2 className="size-3.5 animate-spin stroke-[1.75]" /> {procLabel}
            </span>
          ) : draft.transcribed ? (
            <span className="ml-auto inline-flex items-center gap-1.5 text-well-600">
              <AudioLines className="size-3.5 stroke-[1.5]" /> Whisper transcript
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300">Client</span>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger aria-label="Assign to client" className="h-10 w-full text-[13px]">
                <SelectValue placeholder="Assign to a client…" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-[13px]">
                    {c.name}
                  </SelectItem>
                ))}
                <div className="mt-1 border-t border-hairline pt-1">
                  <button
                    type="button"
                    onClick={() => { setAdding(true); setNewName("") }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] font-medium text-brand-600 outline-none transition-colors hover:bg-brand-100/60 focus-visible:bg-brand-100/60"
                  >
                    <Plus className="size-3.5 stroke-[1.75]" />
                    New client
                  </button>
                </div>
              </SelectContent>
            </Select>

            {adding ? (
              <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-hairline bg-card/70 p-1.5">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); confirmNewClient() }
                    if (e.key === "Escape") { e.preventDefault(); setAdding(false); setNewName("") }
                  }}
                  placeholder="New client's name…"
                  aria-label="New client name"
                  autoFocus
                  className="h-9 flex-1 rounded-md text-[13px]"
                />
                <Button
                  type="button"
                  className="h-9 px-3 text-[13px]"
                  onClick={confirmNewClient}
                  disabled={!newName.trim()}
                >
                  <Check className="size-4 stroke-[1.75]" /> Add
                </Button>
              </div>
            ) : null}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300">Title</span>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={suggestedTitle}
              aria-label="Session title"
              className="h-10 rounded-md text-[13px]"
            />
          </label>

          <p className="text-[11.5px] tabular-nums text-muted-foreground">
            Date · {new Date(draft.startedAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        <div className="mt-1 flex items-center justify-between gap-2">
          <Button variant="ghost" className="h-10 text-[13px] text-muted-foreground" onClick={logLater}>
            Log later
          </Button>
          <Button className="h-10 px-6 text-[13px]" onClick={confirm} disabled={transcribing}>
            {transcribing ? (
              <><Loader2 className="size-4 animate-spin stroke-[1.75]" /> {procLabel}</>
            ) : (
              "Log session"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
