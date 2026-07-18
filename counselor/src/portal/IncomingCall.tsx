// Incoming-call ring — surfaces in the client portal the moment their counsellor
// starts a call (live cross-tab via the call store). A soft pulsing ring + the
// call details drop down from the top with Accept / Decline. Accept joins the
// LiveKit room; the session timer only starts once both are actually in.

import { useNavigate } from "react-router-dom"
import { Phone, PhoneOff, Video } from "lucide-react"
import { usePortalAccount, useCallInvite, setCallStatus, portalCallHref } from "./portal-store"

export function IncomingCall() {
  const nav = useNavigate()
  const account = usePortalAccount()
  const invite = useCallInvite(account?.clientId)
  if (!account || !invite || invite.status !== "ringing") return null
  const Icon = invite.mode === "voice" ? Phone : Video

  // Join the EXACT room the counsellor opened (carried on the invite), so both
  // sides always land together — never a per-side room-derivation mismatch.
  const accept = () => { setCallStatus(account.clientId, "accepted"); nav(portalCallHref(account.clientId)) }
  const decline = () => setCallStatus(account.clientId, "declined")

  return (
    <div className="fixed left-1/2 top-4 z-[70] w-[min(92vw,440px)] -translate-x-1/2 animate-in slide-in-from-top-4 fade-in duration-300">
      <div className="flex items-center gap-3.5 rounded-2xl border border-border bg-card/95 p-3.5 shadow-[var(--shadow-float)] backdrop-blur-xl">
        {/* pulsing avatar */}
        <span className="relative grid size-12 shrink-0 place-items-center">
          <span className="absolute inline-flex size-12 animate-ping rounded-full bg-brand-500/40" />
          <span className="relative grid size-12 place-items-center rounded-full bg-brand-600 text-[14px] font-semibold text-white">
            {invite.counsellorName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-brand-600"><Icon className="size-3.5" /> Incoming {invite.mode === "voice" ? "voice" : "video"} call</p>
          <p className="truncate text-[14.5px] font-semibold text-foreground">{invite.counsellorName}</p>
          <p className="truncate text-[12px] text-muted-foreground">{invite.topic}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button onClick={decline} aria-label="Decline" className="grid size-10 place-items-center rounded-full bg-risk-500 text-white transition hover:bg-risk-600"><PhoneOff className="size-5 stroke-[1.75]" /></button>
          <button onClick={accept} aria-label="Accept" className="grid size-10 place-items-center rounded-full bg-well-500 text-white transition hover:bg-well-600"><Phone className="size-5 stroke-[1.75]" /></button>
        </div>
      </div>
    </div>
  )
}
