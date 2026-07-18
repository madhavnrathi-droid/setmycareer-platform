// Live 1:1 messaging with the member's counsellor — full-width, file/resource aware.
// The thread is the SHARED store the counsellor inbox reads, so it's genuinely
// two-way and updates across tabs/devices in real time.

import { useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Video } from "lucide-react"
import { ChatThread } from "@/components/comms/ChatThread"
import { Chip, AvatarStack, RoundAction } from "@/components/custom/ui-kit"
import { usePortalAccount, markThreadSeenByClient, useThread, startCallInvite, portalCallHref } from "../portal-store"
import { usePortalCounsellor } from "../counsellors"
import { credentialSummary } from "../components/CounsellorCredentials"

export function PortalMessages() {
  const account = usePortalAccount()
  const { counsellor, loading: counsellorLoading } = usePortalCounsellor()
  const nav = useNavigate()
  const thread = useThread(account?.clientId ?? "", counsellor?.id ?? "")
  useEffect(() => {
    if (account && counsellor) markThreadSeenByClient(account.clientId, counsellor.id)
  }, [account?.clientId, counsellor?.id, thread.length])
  if (!account) return null

  if (!counsellor) {
    if (counsellorLoading) {
      return <div className="mx-auto max-w-md py-16 text-center text-[14px] text-muted-foreground">Loading your counsellor…</div>
    }
    // Counsellors are assigned, never chosen — so the empty state books the
    // session that triggers the assignment; it must not send the member off to
    // "find" someone.
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <h1 className="font-display text-[22px] font-semibold tracking-tight">No counsellor yet</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          We match you with a counsellor from your results. Book your first session and they'll be assigned — then you can message them any time.
        </p>
        <Link to="/portal/sessions" className="mt-5 inline-flex rounded-full bg-brand-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-brand-700">Book a session</Link>
      </div>
    )
  }

  const startCall = () => {
    const room = `smc-${account.clientId}`
    startCallInvite({ clientId: account.clientId, counsellorId: counsellor.id, counsellorName: counsellor.name, mode: "video", topic: "Quick call", room })
    nav(portalCallHref(account.clientId))
  }

  return (
    // break out of the content well's bottom padding and fill the width edge-to-edge
    <div className="-mb-28 flex h-[calc(100svh-8.5rem)] w-full flex-col">
      {/* thread header — the person, their credentials, and the call action */}
      <div className="mb-1 flex items-center gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-[rgba(24,24,27,0.06)] shadow-[0_1px_2px_rgba(24,24,27,0.03),0_12px_32px_-20px_rgba(24,24,27,0.20)]">
        <AvatarStack size={11} people={[{ initials: counsellor.initials, img: counsellor.img }]} />
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-foreground">{counsellor.name}</p>
          <p className="truncate text-[12px] text-muted-foreground">
            {credentialSummary(counsellor) || counsellor.title}
          </p>
        </div>
        <Chip tone="well" className="ml-auto hidden sm:inline-flex">
          <span className="size-1.5 rounded-full bg-well-500" /> Replies within a day
        </Chip>
        <RoundAction icon={Video} label="Start a call" tone="dark" onClick={startCall} />
      </div>

      <ChatThread
        clientId={account.clientId}
        counsellorId={counsellor.id}
        me="client"
        otherName={counsellor.name.split(" ").slice(-1)[0]}
        className="pt-2"
      />
    </div>
  )
}
