import { Link } from "react-router-dom"
import { CalendarPlus, FileUp, Mic, Video, Phone } from "lucide-react"

import type { Client } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { useRecording } from "@/lib/recording"
import { cn } from "@/lib/utils"

function RiskDot({ flag }: { flag: Client["riskFlag"] }) {
  if (flag === "none") return null
  const tone = flag === "high" || flag === "moderate" ? "bg-risk-500" : "bg-warn-600"
  return <span aria-label={`${flag} risk`} title={`${flag} risk`} className={cn("size-2 rounded-full", tone)} />
}

function MiniStat({ label, value, tone }: { label: string; value: React.ReactNode; tone?: string }) {
  return (
    <div className="hidden md:block">
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</div>
      <div className={cn("font-display text-[22px] font-extralight leading-none tabular-nums", tone)}>{value}</div>
    </div>
  )
}

/** The linchpin wayfinding component: persistent client identity + the two
 *  counselor-exclusive powers (Export/Share, Schedule). Sticky under the top bar. */
export function ContextHeader({ client }: { client: Client }) {
  const recording = useRecording()
  return (
    <div className="sticky top-16 z-20 -mx-8 mb-7 border-b border-border bg-background/90 px-8 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-ink-100 text-[14px] font-medium text-ink-700">
            {client.initials}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-[19px] font-light tracking-tight text-foreground">{client.name}</h1>
              <RiskDot flag={client.riskFlag} />
            </div>
            <p className="truncate text-[12.5px] text-muted-foreground">
              {client.age} · {client.headline} · {client.sessionCount} sessions · {client.relationship}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <MiniStat label="Career index" value={client.careerIndex ?? "—"} />
          <MiniStat label="Wellbeing" value={client.wellbeingBand ?? "—"} tone="text-mind-600 text-[15px] font-normal pt-1" />
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* impromptu video / voice call — like dialling the client directly */}
          <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
            <Button asChild variant="ghost" size="sm" className="size-8 p-0" title="Video call">
              <Link to={`/call/${client.id}`} aria-label="Start video call">
                <Video className="size-4 stroke-[1.5]" />
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm" className="size-8 p-0" title="Voice call">
              <Link to={`/call/${client.id}?mode=voice`} aria-label="Start voice call">
                <Phone className="size-4 stroke-[1.5]" />
              </Link>
            </Button>
          </div>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
            <Link to="/calendar">
              <CalendarPlus className="size-4 stroke-[1.5]" /> Schedule
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={() => recording.start({ clientId: client.id, clientName: client.name })}
          >
            <Mic className="size-4 stroke-[1.5]" /> Record session
          </Button>
          <Button asChild size="sm" className="h-8 gap-1.5">
            <Link to={`/reports/new?client=${client.id}`}>
              <FileUp className="size-4 stroke-[1.75]" /> Export report
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
