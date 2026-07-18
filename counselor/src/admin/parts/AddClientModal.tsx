// Add-client dialog — the admin's manual intake. Captures identity + contact, an
// assigned counsellor, and (optionally) schedules the first session, which is
// written to the live bookings store so it appears on the client + counsellor
// apps immediately.

import { useState } from "react"
import { CalendarClock } from "lucide-react"
import { addClient } from "../company-store"
import { useAdminCounsellors } from "../counsellor-roster"
import type { BookingMode } from "@/portal/portal-store"
import { Modal, Field, fieldBox, btnPrimary, btnGhost } from "../ui"
import { cn } from "@/lib/utils"

const GENDERS = ["Female", "Male", "Non-binary", "Prefer not to say"]
const MODES: { id: BookingMode; label: string }[] = [
  { id: "video", label: "Video" }, { id: "voice", label: "Voice" }, { id: "in_person", label: "In person" },
]

function defaultSlot(): string {
  // tomorrow 10:00, formatted for <input type=datetime-local>
  const d = new Date(Date.now() + 24 * 3600 * 1000)
  d.setHours(10, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function AddClientModal({ onClose }: { onClose: () => void }) {
  const { counsellors } = useAdminCounsellors()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [gender, setGender] = useState("")
  const [age, setAge] = useState("")
  const [headline, setHeadline] = useState("")
  const [counsellorId, setCounsellorId] = useState(counsellors[0]?.id ?? "")
  const [schedule, setSchedule] = useState(true)
  const [at, setAt] = useState(defaultSlot)
  const [durationMin, setDurationMin] = useState(45)
  const [mode, setMode] = useState<BookingMode>("video")

  const canSave = name.trim().length > 1 && /\S+@\S+/.test(email)

  const save = () => {
    if (!canSave) return
    addClient({
      name, email, phone, gender, age: age ? Number(age) : undefined, headline, counsellorId,
      firstSession: schedule ? { at: new Date(at).toISOString(), durationMin, mode, topic: "Initial consultation" } : undefined,
    })
    onClose()
  }

  return (
    <Modal
      title="Add a client"
      subtitle="Create a record by hand and optionally book the first session."
      onClose={onClose}
      wide
      footer={<>
        <button onClick={onClose} className={btnGhost}>Cancel</button>
        <button onClick={save} disabled={!canSave} className={btnPrimary}>Add client</button>
      </>}
    >
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Field label="Full name *"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ananya Sharma" className={fieldBox} autoFocus /></Field>
        <Field label="Email *"><input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" className={fieldBox} type="email" /></Field>
        <Field label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 ‑" className={fieldBox} /></Field>
        <Field label="Gender"><select value={gender} onChange={(e) => setGender(e.target.value)} className={fieldBox}><option value="">Select…</option>{GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
        <Field label="Age"><input value={age} onChange={(e) => setAge(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 17" className={fieldBox} inputMode="numeric" /></Field>
        <Field label="Assign counsellor"><select value={counsellorId} onChange={(e) => setCounsellorId(e.target.value)} className={fieldBox}>{counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <div className="sm:col-span-2"><Field label="Headline / context"><input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="e.g. Class 12 · Science · undecided between Eng & Med" className={fieldBox} /></Field></div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-secondary/30 p-3.5">
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="size-4 accent-[var(--brand-600,#000)]" />
          <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground"><CalendarClock className="size-4 text-brand-600" /> Schedule the first session</span>
        </label>
        {schedule && (
          <div className="mt-3 grid gap-3.5 sm:grid-cols-3">
            <div className="sm:col-span-2"><Field label="When"><input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} className={fieldBox} /></Field></div>
            <Field label="Duration"><select value={durationMin} onChange={(e) => setDurationMin(Number(e.target.value))} className={fieldBox}>{[30, 45, 60, 90].map((m) => <option key={m} value={m}>{m} min</option>)}</select></Field>
            <div className="sm:col-span-3">
              <span className="mb-1 block text-[12px] font-medium text-foreground">Mode</span>
              <div className="flex gap-2">
                {MODES.map((m) => (
                  <button key={m.id} onClick={() => setMode(m.id)} className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-medium", mode === m.id ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground hover:bg-secondary")}>{m.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
