import {
  Area,
  AreaChart,
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
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

type Row = Record<string, number | string | null>

const tickStyle = { fontSize: 10, fill: "var(--color-ink-300)" }

/* Frosted tooltip surface shared by both mini charts (Apple/Rams): translucent
   glass, soft layered shadow, curved. Tabular numbers come from ChartTooltipContent. */
const FROST_TOOLTIP =
  "rounded-xl border-hairline bg-surface-frost-strong shadow-[var(--shadow-e3)] backdrop-blur-md"

/* Thin restrained line/area chart: a single mono ink line over a faint fill,
   ink-100 gridlines, tabular axis ticks. Rounded caps, soft gradient, a dashed
   hover crosshair, frosted tooltip, and a single ease-out draw on mount.
   Truthful — YAxis is pinned to a true 0 baseline (domain={[0, "auto"]},
   allowDataOverflow=false) so the area never sits above 0. */
export function LineChart({
  data,
  dataKey,
  xKey = "label",
  label,
  height = 120,
  className,
}: {
  data: Row[]
  dataKey: string
  xKey?: string
  label?: string
  height?: number
  className?: string
}) {
  const config = { [dataKey]: { label: label ?? dataKey, color: "var(--color-foreground)" } } satisfies ChartConfig
  const gid = `mini-fill-${dataKey}`
  const reduced = prefersReducedMotion()
  return (
    <ChartContainer config={config} className={cn("w-full", className)} style={{ height }}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-foreground)" stopOpacity={0.08} />
            <stop offset="100%" stopColor="var(--color-foreground)" stopOpacity={0} />
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
          content={<ChartTooltipContent indicator="line" className={FROST_TOOLTIP} />}
        />
        <Area
          dataKey={dataKey}
          type="monotone"
          stroke="var(--color-foreground)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={`url(#${gid})`}
          dot={false}
          activeDot={{ r: 3, strokeWidth: 0 }}
          isAnimationActive={!reduced}
          animationDuration={700}
          animationEasing="ease-out"
        />
      </AreaChart>
    </ChartContainer>
  )
}

/* Thin restrained bar chart: slim mono ink bars, ink-100 gridlines, tabular axis,
   frosted tooltip, single ease-out grow on mount. Truthful — sits on a 0 baseline. */
export function BarChart({
  data,
  dataKey,
  xKey = "label",
  label,
  height = 120,
  className,
}: {
  data: Row[]
  dataKey: string
  xKey?: string
  label?: string
  height?: number
  className?: string
}) {
  const config = { [dataKey]: { label: label ?? dataKey, color: "var(--color-foreground)" } } satisfies ChartConfig
  const reduced = prefersReducedMotion()
  return (
    <ChartContainer config={config} className={cn("w-full", className)} style={{ height }}>
      <RBarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
        <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
        <YAxis tickLine={false} axisLine={false} width={42} tick={tickStyle} className="tabular-nums" />
        <ChartTooltip
          cursor={{ fill: "var(--color-ink-100)", fillOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" className={FROST_TOOLTIP} />}
        />
        <Bar
          dataKey={dataKey}
          fill="var(--color-foreground)"
          radius={[3, 3, 0, 0]}
          maxBarSize={22}
          isAnimationActive={!reduced}
          animationDuration={700}
          animationEasing="ease-out"
        />
      </RBarChart>
    </ChartContainer>
  )
}
