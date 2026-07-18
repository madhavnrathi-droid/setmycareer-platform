// Admin oversight of the portal booking system — every upcoming session across
// every client and counsellor, nested clearly (who ↔ whom ↔ when ↔ state), with
// full control: confirm, cancel, reschedule, and per-client portal-access
// revocation. Reads the same shared store the portal and console write, so
// what the admin sees is exactly what the member and counsellor see.

import { useState } from "react"
import { Video, Mic, MapPin, Ban, CalendarClock, Check, X } from "lucide-react"
import { toast } from "sonner"
import {
  useAllBookings, setBookingStatus, cancelBooking, rescheduleBooking,
  isPortalRevoked, setPortalRevoked,
} from "@/portal/portal-store"
import { getCounsellor } from "@/portal/counsellors"
import { cn } from "@/lib/utils"

const MODE_ICON = { video: Video, voice: Mic, in_person: MapPin } as const

export function AdminBookingsPanel() {
  const all = useAllBookings()
  const [, bump] = useState(0)
  const upcoming = [...all]
    .filter((b) => b.status === "requested" || b.status === "confirmed")
    .sort((a, b) => +new Date(a.at) - +new Date(b.at))

  const reschedule = (id: string, at: string) => {
    const next = window.prompt("New date & time (YYYY-MM-DD HH:MM):", `${at.slice(0, 10)} ${at.slice(11, 16)}`)
    if (!next) return
    const iso = new Date(next.replace(" ", "T")).toISOString()
    if (Number.isNaN(+new Date(iso))) { toast.error("Couldn't read that date."); return }
    rescheduleBooking(id, iso)
    toast.success("Rescheduled — both sides see the new time as a request to re-confirm.")
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Portal bookings · live control</p>
          <h2 className="mt-1 text-[16px] font-semibold text-foreground">Every upcoming session</h2>
        </div>
        <p className="text-[12px] text-muted-foreground">{upcoming.length} upcoming · shared store, same truth as portal &amp; console</p>
      </div>

      {upcoming.length === 0 ? (
        <p className="mt-4 text-[13px] text-muted-foreground">No upcoming portal bookings.</p>
      ) : (
        <div className="mt-4 divide-y divide-border border-t border-border">
          {upcoming.map((b) => {
            const c = getCounsellor(b.counsellorId)
            const Icon = MODE_ICON[b.mode] ?? Video
            const revoked = isPortalRevoked(b.clientId)
            const d = new Date(b.at)
            return (
              <div key={b.id} className="grid gap-2 py-3.5 sm:grid-cols-[150px_1fr_auto] sm:items-center sm:gap-4">
                <div>
                  <p className="text-[14px] font-semibold tabular-nums text-foreground">
                    {d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </p>
                  <p className="text-[11.5px] tabular-nums text-muted-foreground">
                    {d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-medium text-foreground">{b.topic}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-muted-foreground">
                    <span>Client <span className="font-medium text-foreground">{b.clientId}</span></span>
                    <span>·</span>
                    <span>Counsellor <span className="font-medium text-foreground">{c?.name ?? b.counsellorId}</span></span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Icon className="size-3" /> {b.mode.replace("_", " ")}</span>
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                      b.status === "confirmed" ? "bg-well-50 text-well-700" : "bg-warn-50 text-warn-700",
                    )}>
                      {b.status === "confirmed" ? "Confirmed" : "Pending confirm"}
                    </span>
                    {revoked && <span className="rounded-full bg-risk-50 px-2 py-0.5 text-[10.5px] font-medium text-risk-600">Access revoked</span>}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  {b.status === "requested" && (
                    <button onClick={() => { setBookingStatus(b.id, "confirmed"); toast.success("Confirmed") }}
                      title="Confirm" className="grid size-8 place-items-center rounded-full border border-border text-well-600 hover:bg-well-50"><Check className="size-3.5" /></button>
                  )}
                  <button onClick={() => reschedule(b.id, b.at)}
                    title="Reschedule" className="grid size-8 place-items-center rounded-full border border-border text-ink-600 hover:bg-secondary"><CalendarClock className="size-3.5" /></button>
                  <button onClick={() => { if (window.confirm("Cancel this session?")) { cancelBooking(b.id); toast("Session cancelled") } }}
                    title="Cancel" className="grid size-8 place-items-center rounded-full border border-border text-risk-600 hover:bg-risk-50"><X className="size-3.5" /></button>
                  <button
                    onClick={() => { setPortalRevoked(b.clientId, !revoked); bump((n) => n + 1); toast(revoked ? "Portal access restored" : "Portal access revoked — the client is signed out on next load") }}
                    title={revoked ? "Restore portal access" : "Revoke portal access"}
                    className={cn("grid size-8 place-items-center rounded-full border", revoked ? "border-risk-200 bg-risk-50 text-risk-600" : "border-border text-ink-400 hover:bg-secondary")}
                  ><Ban className="size-3.5" /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
