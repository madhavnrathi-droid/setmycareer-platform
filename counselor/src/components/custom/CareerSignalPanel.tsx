// Career market — the live job-market viz (MarketRow / DemandSpark / PayBand),
// the SAME visual language the client sees on My Best Fit, dropped into the
// counsellor's and admin's client-detail views so all three dashboards read as
// one system (the founder's consistency rule).
//
// Deliberately NOT personalised here. A counsellor or admin viewing ANOTHER
// client cannot honestly derive that client's measured fit: the raw interest
// answers the fit maths needs live only on the client's own device, and the
// shared server store keeps scores but not answers. So rather than risk reading
// a stray/colliding local record and misattributing someone else's signal, this
// shows the live MARKET at large — clearly labelled, identical for every client
// — and never a per-client gauge. The client's own measured fit lives on their
// My Best Fit page; their scores are in this page's own Assessments + report.
//
// `bare` drops the card chrome so the host screen owns the surface (flat 360
// sections on admin, the screen's own card on the counsellor Overview).

import { Link } from "react-router-dom"
import { Pane, Eyebrow, Chip, MarketRow, type CareerViz } from "@/components/custom/ui-kit"
import { topRisingCareers, trendPctOf } from "@/portal/tests/market-match"
import type { Row } from "@/portal/terminal/careers-all"

const toViz = (r: Row): CareerViz => ({
  name: r.name,
  cluster: r.cluster,
  oneLine: r.oneLine,
  payLo: r.payLo,
  payHi: r.payHi,
  demand: r.demandTrend,
  demandPct: trendPctOf(r),
  aiLevel: r.aiLevel,
  to: "/portal/terminal",
})

export function CareerSignalPanel({ name, className, bare = false }: { name?: string; className?: string; bare?: boolean }) {
  const first = name?.trim().split(/\s+/)[0]
  const rows = topRisingCareers(5)

  const body = (
    <>
      <Eyebrow right={<Chip tone="neutral">Live market</Chip>}>Career market</Eyebrow>
      <p className="max-w-[60ch] text-[13px] leading-relaxed text-muted-foreground">
        The fastest-rising careers in the market right now — the landscape {first ? `${first} is` : "they're"} choosing within, from the same live data the client sees.
        {first ? ` ${first}'s` : " Their"} own measured profile is in the assessments and report on this page.
      </p>

      <div className="mt-5">
        <Eyebrow right={<Link to="/portal/terminal" className="shrink-0 text-[12px] font-medium text-brand-600 hover:underline">Career Terminal →</Link>}>
          Fastest-rising, ten-year demand
        </Eyebrow>
        <div className="divide-y divide-border border-y border-border">
          {rows.map((r, i) => <MarketRow key={r.id} c={toViz(r)} rank={i + 1} />)}
        </div>
      </div>
    </>
  )

  return bare ? <div className={className}>{body}</div> : <Pane className={className}>{body}</Pane>
}
