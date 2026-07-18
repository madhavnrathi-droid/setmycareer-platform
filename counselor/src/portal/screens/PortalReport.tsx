// The client's own Career Intelligence Report — the exact same flagship document
// the counsellor authors, rendered read-only (no edit/share controls). It only
// appears once the counsellor has shared it; until then a calm "in progress"
// state stands in.

import { FileText } from "lucide-react"
import { CareerReportDoc } from "@/screens/client/CareerReportDoc"
import { useIsShared } from "@/lib/report-share"
import { getClient } from "@/lib/mock"
import { usePortalAccount } from "../portal-store"
import { getCounsellor } from "../counsellors"

export function PortalReport() {
  const account = usePortalAccount()
  const shared = useIsShared(account?.clientId ?? "")
  if (!account) return null

  // Demo personas (seeded mock clients) can always preview their report; fresh
  // sign-ups see it only after their counsellor shares.
  const isDemo = Boolean(getClient(account.clientId))
  const counsellor = getCounsellor(account.counsellorId)

  if (!shared && !isDemo) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-mind-50 text-mind-700">
          <FileText className="size-7" />
        </span>
        <h1 className="mt-5 font-display text-[22px] font-semibold tracking-tight">Your report is being prepared</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          {counsellor?.name ?? "Your counsellor"} is putting together your full Career Intelligence
          Report from your assessments and sessions. You'll see it here — and we'll let you know — the
          moment it's ready.
        </p>
      </div>
    )
  }

  return <CareerReportDoc clientIdOverride={account.clientId} readOnly />
}
