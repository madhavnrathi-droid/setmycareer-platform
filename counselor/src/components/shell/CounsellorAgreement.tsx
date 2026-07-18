// The counsellor service agreement gate — before a counsellor can offer
// services or connect with clients, they confirm their professional profile and
// accept SetMyCareer's terms, confidentiality/data-handling rules (DPDP) and
// the professional-conduct standards of the counsellor role. Shown once as a
// full-screen gate over the console; acceptance is stamped locally per device
// (the backend contract rides the expert-application flow).

import { useState } from "react"
import { ShieldCheck, Check } from "lucide-react"
import { cn } from "@/lib/utils"

const KEY = "smc.counsellor.agreement.v1"

export function counsellorAgreementAccepted(): boolean {
  try { return !!localStorage.getItem(KEY) } catch { return true }
}

const TERMS = [
  {
    id: "tos",
    label: "Terms of service & counsellor agreement",
    detail: "I accept SetMyCareer's counsellor terms — scheduling and cancellation standards, platform-only client contact, and fee settlement through SetMyCareer.",
  },
  {
    id: "privacy",
    label: "Confidentiality & data handling (DPDP)",
    detail: "Client results, reports, documents and session notes are confidential. I will handle them only inside the platform, per India's DPDP Act and SetMyCareer's privacy policy.",
  },
  {
    id: "conduct",
    label: "Professional conduct & session standards",
    detail: "I will run sessions on time and prepared, ground my guidance in the client's measured results, and never guarantee admissions, jobs or outcomes.",
  },
]

export function CounsellorAgreement({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState("")
  const [title, setTitle] = useState("")
  const [expertise, setExpertise] = useState("")
  const [checks, setChecks] = useState<Record<string, boolean>>({})
  const ready = name.trim() && title.trim() && expertise.trim() && TERMS.every((t) => checks[t.id])

  const accept = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ name: name.trim(), title: title.trim(), expertise: expertise.trim(), acceptedAt: new Date().toISOString() }))
    } catch { /* noop */ }
    onDone()
  }

  return (
    <div className="fixed inset-0 z-[90] overflow-y-auto bg-black/45 p-4 backdrop-blur-sm sm:p-8">
      <div className="mx-auto my-6 w-full max-w-2xl rounded-3xl border border-border bg-card p-6 sm:p-9">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Before you take clients</p>
        <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-foreground">Your counsellor profile &amp; agreement</h1>
        <p className="mt-2 max-w-[58ch] text-[13.5px] leading-relaxed text-muted-foreground">
          Clients are matched to you from this profile, and sessions unlock only after you accept the standards
          that protect them. Two minutes, once.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-600">Full name *</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="As shown to clients"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-ink-600">Professional title *</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Senior Career Counsellor"
              className="rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] outline-none focus:border-foreground" />
          </label>
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="text-[12px] font-medium text-ink-600">Practising expertise * <span className="font-normal text-muted-foreground">— drives client auto-assignment</span></span>
            <textarea value={expertise} onChange={(e) => setExpertise(e.target.value)} rows={2}
              placeholder="e.g. stream selection, engineering admissions, mid-career transitions, executive coaching"
              className="resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-[14px] leading-relaxed outline-none focus:border-foreground" />
          </label>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          {TERMS.map((t) => {
            const on = !!checks[t.id]
            return (
              <button key={t.id} onClick={() => setChecks((c) => ({ ...c, [t.id]: !on }))} aria-pressed={on}
                className={cn("flex items-start gap-3 rounded-2xl border p-4 text-left transition-colors", on ? "border-foreground bg-secondary/40" : "border-border hover:border-ink-300")}>
                <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border", on ? "border-foreground bg-foreground text-background" : "border-ink-300 text-transparent")}>
                  <Check className="size-3.5 stroke-[3]" />
                </span>
                <span>
                  <span className="block text-[13.5px] font-medium text-foreground">{t.label}</span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-muted-foreground">{t.detail}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-4">
          <button disabled={!ready} onClick={accept}
            className={cn("inline-flex items-center gap-2 rounded-full px-6 py-3 text-[13.5px] font-medium transition",
              ready ? "bg-foreground text-background hover:opacity-90" : "cursor-not-allowed bg-secondary text-muted-foreground")}>
            <ShieldCheck className="size-4" /> Accept &amp; start taking clients
          </button>
          <p className="text-[11.5px] leading-snug text-muted-foreground">
            Acceptance is stamped with today's date. The full documents live at setmycareer.com/legal.
          </p>
        </div>
      </div>
    </div>
  )
}
