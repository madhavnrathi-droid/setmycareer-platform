// The profile gate, in its two shapes:
//  · ProfileNudge — the dashboard dropdown: a slim white bar with a progress
//    bar that expands into the missing-items checklist. Lives at the top of
//    Home until the intake is complete, then disappears entirely.
//  · ProfileGateCard — the inline lock used where an action is denied (session
//    booking). Same truth, quieter shape.
// Both read profileRequirements() from the store, so the Account page, the
// runners and these surfaces can never disagree about what's missing.

import { useState } from "react"
import { Link } from "react-router-dom"
import { ChevronDown, Check, ArrowRight, CircleUserRound } from "lucide-react"
import { usePortalAccount, profileRequirements, profileCompleteness, profileComplete } from "../portal-store"
import { cn } from "@/lib/utils"

export function ProfileNudge() {
  const account = usePortalAccount()
  const [open, setOpen] = useState(false)
  if (!account || profileComplete(account)) return null
  const reqs = profileRequirements(account)
  const missing = reqs.filter((r) => !r.done)
  const pct = profileCompleteness(account)

  return (
    <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-4 px-5 py-4 text-left"
      >
        <CircleUserRound className="size-5 shrink-0 text-ink-600" strokeWidth={1.5} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-normal text-foreground">
            Finish your profile to unlock tests and sessions
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-[3px] w-full max-w-[240px] overflow-hidden rounded-full bg-border">
              <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-ink-600">{pct}%</span>
          </div>
        </div>
        <ChevronDown className={cn("size-4 shrink-0 text-ink-300 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {reqs.map((r) => (
              <li key={r.key} className="flex items-center gap-2 text-[12.5px] font-light">
                <span className={cn(
                  "grid size-4 shrink-0 place-items-center rounded-full border",
                  r.done ? "border-transparent bg-foreground text-background" : "border-border text-transparent",
                )}>
                  <Check className="size-2.5 stroke-[3]" />
                </span>
                <span className={r.done ? "text-ink-300 line-through decoration-ink-300/50" : "text-ink-600"}>{r.label}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/portal/account#profile"
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition hover:opacity-90"
          >
            Complete your profile · {missing.length} left <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </div>
  )
}

export function ProfileGateCard({ action }: { action: string }) {
  const account = usePortalAccount()
  if (!account) return null
  const pct = profileCompleteness(account)
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">Profile first</p>
      <p className="mt-2 text-[14.5px] font-normal leading-snug text-foreground">
        {action} unlocks once your profile is complete.
      </p>
      <p className="mt-1.5 max-w-[46ch] text-[12.5px] font-light leading-relaxed text-ink-600">
        Your counsellor and your report are built on it — four minutes, once.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-[3px] w-full max-w-[200px] overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
        </div>
        <span className="font-mono text-[11px] tabular-nums text-ink-600">{pct}%</span>
      </div>
      <Link
        to="/portal/account#profile"
        className="mt-5 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition hover:opacity-90"
      >
        Complete your profile <ArrowRight className="size-3.5" />
      </Link>
    </div>
  )
}
