import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowLeft, UserPlus } from "lucide-react"
import { toast } from "sonner"
import { addClient, type NewClientForm } from "@/lib/mock"
import { useGsap, revealChildren } from "@/lib/gsap"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

const RELATIONSHIPS = ["career coaching", "career + wellbeing", "therapy", "academic guidance"]

/* New-client onboarding form (reached from the "New → New client" menu). A
   proper intake: identity, study/work context, and why they're reaching out.
   On save, the client is created (reads start empty until the first session)
   and we open their hub. */
export function NewClient() {
  const nav = useNavigate()
  const ref = useGsap((s) => revealChildren(s), [])
  const [f, setF] = useState<NewClientForm>({ name: "", relationship: "career coaching" })
  const set = <K extends keyof NewClientForm>(k: K, v: NewClientForm[K]) => setF((p) => ({ ...p, [k]: v }))

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!f.name.trim()) { toast.error("A name is required."); return }
    const c = addClient(f)
    toast.success("Client added", { description: `${c.name} · reads generate from the first session.` })
    nav(`/clients/${c.id}`)
  }

  return (
    <div ref={ref} className="mx-auto w-full max-w-2xl">
      <button
        onClick={() => nav(-1)}
        className="mb-5 inline-flex items-center gap-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-3.5 stroke-[1.5]" /> Back
      </button>

      <header data-reveal className="mb-7 flex items-center gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-600">
          <UserPlus className="size-5 stroke-[1.5]" />
        </span>
        <div>
          <h1 className="font-display text-[26px] font-extralight tracking-tight">Onboard a client</h1>
          <p className="text-[13px] text-muted-foreground">Capture the essentials — the read builds from your first session.</p>
        </div>
      </header>

      <form data-reveal onSubmit={submit} className="flex flex-col gap-6 rounded-2xl bg-card p-6 shadow-[var(--shadow-e2)]">
        <Field label="Full name" required>
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="Client's full name" autoFocus className="h-10" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Age">
            <Input type="number" min={0} value={f.age ?? ""} onChange={(e) => set("age", e.target.value ? Number(e.target.value) : undefined)} placeholder="e.g. 24" className="h-10" />
          </Field>
          <Field label="Relationship">
            <Select value={f.relationship} onValueChange={(v) => set("relationship", v)}>
              <SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Profession / role">
            <Input value={f.profession ?? ""} onChange={(e) => set("profession", e.target.value)} placeholder="e.g. Final-year student · PM track" className="h-10" />
          </Field>
          <Field label="Standard / year">
            <Input value={f.standard ?? ""} onChange={(e) => set("standard", e.target.value)} placeholder="e.g. Final year · 2026" className="h-10" />
          </Field>
        </div>

        <Field label="Education">
          <Input value={f.education ?? ""} onChange={(e) => set("education", e.target.value)} placeholder="e.g. B.Tech, Computer Science" className="h-10" />
        </Field>

        <Field label="Why are they reaching out?">
          <Textarea value={f.reason ?? ""} onChange={(e) => set("reason", e.target.value)} placeholder="The problem, goal, or transition they want help with…" rows={3} className="resize-none" />
        </Field>

        <Field label="Notes (optional)">
          <Textarea value={f.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Anything else worth recording on intake…" rows={2} className="resize-none" />
        </Field>

        <div className="flex items-center justify-end gap-2 border-t border-hairline pt-5">
          <Button type="button" variant="ghost" className="h-10 text-muted-foreground" onClick={() => nav(-1)}>Cancel</Button>
          <Button type="submit" className="h-10 gap-1.5 px-6"><UserPlus className="size-4 stroke-[1.75]" /> Add client</Button>
        </div>
      </form>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-ink-300">
        {label}{required && <span className="ml-0.5 text-brand-500">*</span>}
      </span>
      {children}
    </label>
  )
}
