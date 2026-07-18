// Schedule-session dialog — books a session for a client straight into the live
// bookings store (auto-confirmed), so it shows on the client portal and the
// counsellor console at once.

import { useMemo, useState } from "react"
import { scheduleSession } from "../company-store"
import { useAdminCounsellors } from "../counsellor-roster"
import type { BookingMode } from "@/portal/portal-store"
import { Modal, Field, fieldBox, btnPrimary, btnGhost } from "../ui"
import { cn } from "@/lib/utils"

const MODES: { id: BookingMode; label: string }[] = [
  { id: "video", label: "Video" }, { id: "voice", label: "Voice" }, { id: "in_person", label: "In person" },
]
function defaultSlot(): string {
  const d = new Date(Date.now() + 24 * 3600 * 1000)
  d.setHours(11, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function ScheduleSessionModal({ clientId, clientName, counsellorId, clients, onClose }: {
  clientId?: string; clientName?: string; counsellorId?: string
  /** When no fixed client is given, pick from this list. */
  clients?: { id: string; name: string; counsellorId: string }[]
  onClose: () => void
}) {
  const { counsellors: roster } = useAdminCounsellors()
  const [picked, setPicked] = useState(clientId ?? "")
  const [q, setQ] = useState("")
  const matches = useMemo(() => {
    if (!clients) return []
    const needle = q.trim().toLowerCase()
    const filtered = needle ? clients.filter((c) => c.name.toLowerCase().includes(needle) || c.id.includes(needle)) : clients
    return filtered.slice(0, 50)
  }, [clients, q])
  const pickedClient = clients?.find((c) => c.id === picked)
  const [topic, setTopic] = useState("Counselling session")
  const [withId, setWithId] = useState(counsellorId ?? "")
  const [at, setAt] = useState(defaultSlot)
  const [durationMin, setDurationMin] = useState(45)
  const [mode, setMode] = useState<BookingMode>("video")

  const targetId = clientId ?? picked
  const targetName = clientName ?? pickedClient?.name ?? "client"

  const save = () => {
    if (!targetId) return
    scheduleSession({ clientId: targetId, counsellorId: withId, topic: topic.trim() || "Counselling session", at: new Date(at).toISOString(), durationMin, mode })
    onClose()
  }

  return (
    <Modal
      title={`Schedule a session`}
      subtitle={`For ${targetName} — added to their portal and counsellor calendar live.`}
      onClose={onClose}
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={save} disabled={!targetId} className={btnPrimary}>Schedule</button>
      </>}
    >
      <div className="grid gap-3.5">
        {!clientId && clients && (
          <>
            <Field label="Find client"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or id…" className={fieldBox} /></Field>
            <Field label="Client *"><select value={picked} onChange={(e) => { setPicked(e.target.value); const c = clients.find((x) => x.id === e.target.value); if (c && c.counsellorId) setWithId(c.counsellorId) }} className={fieldBox}>
              <option value="">{matches.length ? "Select a client…" : "No matching clients"}</option>
              {matches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select></Field>
          </>
        )}
        <Field label="Topic"><input value={topic} onChange={(e) => setTopic(e.target.value)} className={fieldBox} /></Field>
        <Field label="Counsellor"><select value={withId} onChange={(e) => setWithId(e.target.value)} className={fieldBox}><option value="">Select a counsellor…</option>{roster.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <div className="grid gap-3.5 sm:grid-cols-2">
          <Field label="When"><input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={fieldBox} /></Field>
          <Field label="Duration"><select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={fieldBox}>{[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
        </div>
        <div>
          <span className="mb-1 block text-[12px] font-medium text-foreground">Mode</span>
          <div className="flex gap-2">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => setMode(m.id)} className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-medium", mode === m.id ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary")}>{m.label}</button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
