// Recent-activity strip — a compact "what just happened" feed for the top of the
// Clients and Counsellors screens: purchases, refunds, coupon redemptions,
// sign-ups, sessions, reports. Live (admin actions append) + a baseline.

import { ShoppingBag, RotateCcw, Ticket, UserPlus, Video, FileText, UserCog } from "lucide-react"
import { useActivity, relTime, type AdminEventKind } from "../admin-events"
import { fmtINR } from "../admin-data"
import { cn } from "@/lib/utils"

const ICON: Record<AdminEventKind, typeof ShoppingBag> = {
  purchase: ShoppingBag, refund: RotateCcw, coupon: Ticket, signup: UserPlus, session: Video, report: FileText, counsellor: UserCog,
}
const TONE: Record<AdminEventKind, string> = {
  purchase: "bg-well-50 text-well-700", refund: "bg-risk-100 text-risk-600", coupon: "bg-mind-50 text-mind-700",
  signup: "bg-brand-50 text-brand-700", session: "bg-secondary text-ink-600", report: "bg-mind-50 text-mind-700", counsellor: "bg-brand-50 text-brand-700",
}

export function ActivityStrip({ limit = 6, filter, title = "Latest activity" }: {
  limit?: number; filter?: { counsellorId?: string }; title?: string
}) {
  const events = useActivity(filter).slice(0, limit)
  if (events.length === 0) return null
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e1)]">
      <h2 className="mb-2 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300">{title}</h2>
      <div className="divide-y divide-border/70">
        {events.map((e) => {
          const Icon = ICON[e.kind]
          return (
            <div key={e.id} className="flex items-center gap-3 py-2">
              <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", TONE[e.kind])}><Icon className="size-3.5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-medium text-foreground">{e.title}</p>
                {e.detail && <p className="truncate text-[11px] text-muted-foreground">{e.detail}</p>}
              </div>
              {e.amount != null && <span className={cn("shrink-0 text-[12px] font-medium tabular-nums", e.amount < 0 ? "text-risk-600" : "text-well-600")}>{e.amount < 0 ? "−" : "+"}{fmtINR(Math.abs(e.amount))}</span>}
              <span className="w-14 shrink-0 text-right text-[11px] tabular-nums text-ink-300">{relTime(e.at)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
