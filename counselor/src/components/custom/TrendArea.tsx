import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  XAxis,
  YAxis,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Larger area trend (REF "career index over sessions"): a single brand-blue focus
   series over a soft gradient fill, with an optional overlaid comparison line
   (e.g. wellbeing in `mind`) so the "are they climbing, and at what cost" read is
   one glance. Hover shows a crosshair + a frosted tooltip with tabular values.
   Truthful — YAxis is pinned to a true 0 baseline (domain={[0, "auto"]},
   allowDataOverflow=false) so a 60→78 climb never reads off a near-60 floor;
   entrance is a single ease-out sweep. */

const tickStyle = { fontSize: 10, fill: "var(--color-ink-300)" }

const TONE: Record<string, string> = {
  brand: "var(--color-brand-500)",
  mind: "var(--color-mind-500)",
  ink: "var(--color-foreground)",
  well: "var(--color-well-600)",
  risk: "var(--color-risk-500)",
}

export function TrendArea({
  data,
  dataKey,
  xKey = "label",
  series2,
  series2Tone = "mind",
  height = 200,
  label,
  className,
}: {
  data: Record<string, number | string>[]
  dataKey: string
  xKey?: string
  series2?: string
  series2Tone?: string
  height?: number
  label?: string
  className?: string
}) {
  const reduced = prefersReducedMotion()
  const focus = "var(--color-brand-500)"
  const overlay = TONE[series2Tone] ?? series2Tone

  const config = {
    [dataKey]: { label: label ?? dataKey, color: focus },
    ...(series2 ? { [series2]: { label: series2, color: overlay } } : {}),
  } satisfies ChartConfig

  const gid = `trend-fill-${dataKey}`

  return (
    <ChartContainer config={config} className={cn("w-full", className)} style={{ height }}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={focus} stopOpacity={0.18} />
            <stop offset="100%" stopColor={focus} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
        <YAxis
          domain={[0, "auto"]}
          allowDataOverflow={false}
          tickLine={false}
          axisLine={false}
          width={42}
          tick={tickStyle}
          className="tabular-nums"
        />
        <ChartTooltip
          cursor={{ stroke: "var(--color-ink-200)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              indicator="line"
              className="rounded-xl border-hairline bg-surface-frost-strong shadow-[var(--shadow-e3)] backdrop-blur-md"
            />
          }
        />
        <Area
          dataKey={dataKey}
          type="monotone"
          stroke={focus}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={`url(#${gid})`}
          dot={false}
          activeDot={{ r: 3.5, strokeWidth: 0 }}
          isAnimationActive={!reduced}
          animationDuration={700}
          animationEasing="ease-out"
        />
        {series2 && (
          <Line
            dataKey={series2}
            type="monotone"
            stroke={overlay}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            strokeLinecap="round"
            dot={false}
            activeDot={{ r: 3, strokeWidth: 0 }}
            isAnimationActive={!reduced}
            animationDuration={700}
            animationEasing="ease-out"
          />
        )}
      </AreaChart>
    </ChartContainer>
  )
}
