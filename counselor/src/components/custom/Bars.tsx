import {
  Bar,
  BarChart as RBarChart,
  CartesianGrid,
  Cell,
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

const tickStyle = { fontSize: 10, fill: "var(--color-ink-300)" }

const FROST_TOOLTIP =
  "rounded-xl border-hairline bg-surface-frost-strong shadow-[var(--shadow-e3)] backdrop-blur-md"

export type BarDatum = { label: string; value: number; highlight?: boolean }

/* Thin vertical bar chart (smart-home energy / "Team Performance" reference):
   slim mono bars sitting on a 0-baseline over ink-100 gridlines, tabular ticks.
   Bars default to ink-700; any datum flagged `highlight` paints in brand-500 so a
   single focus bar reads instantly. Truthful scale — always starts at 0. */
export function Bars({
  data,
  unit,
  height = 160,
  className,
}: {
  data: BarDatum[]
  unit?: string
  height?: number
  className?: string
}) {
  const config = {
    value: { label: unit ?? "Value", color: "var(--color-foreground)" },
  } satisfies ChartConfig
  const reduced = prefersReducedMotion()

  return (
    <ChartContainer config={config} className={cn("w-full", className)} style={{ height }}>
      <RBarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
        <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} tick={tickStyle} />
        <YAxis
          tickLine={false} axisLine={false} width={42} tick={tickStyle}
          className="tabular-nums" allowDecimals={false}
        />
        <ChartTooltip
          cursor={{ fill: "var(--color-ink-100)", fillOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" className={FROST_TOOLTIP} />}
        />
        <Bar
          dataKey="value"
          radius={[3, 3, 0, 0]}
          maxBarSize={22}
          isAnimationActive={!reduced}
          animationDuration={700}
          animationEasing="ease-out"
        >
          {data.map((d, i) => (
            <Cell
              key={i}
              fill={d.highlight ? "var(--color-brand-500)" : "var(--color-ink-700)"}
            />
          ))}
        </Bar>
      </RBarChart>
    </ChartContainer>
  )
}

/* ── Calendar density heatmap (project "April totals" reference) ─────────────
   A small week × day grid of cells shaded on an ink scale by intensity (0–1).
   No color hue — pure ink ramp so it reads in grayscale and stays accessible
   (each cell carries an aria-label with its date + value). */

export type HeatCell = {
  date?: string
  /** normalized 0–1 intensity; null renders as an empty (no-data) cell */
  value: number | null
}
/** weeks: outer = columns (weeks), inner = 7 days top→bottom (Mon→Sun) */
export function Heatmap({
  weeks,
  unit,
  className,
}: {
  weeks: HeatCell[][]
  unit?: string
  className?: string
}) {
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"]

  const shade = (value: number | null): string => {
    if (value == null) return "bg-ink-050"
    const steps = [
      "bg-ink-100",
      "bg-ink-200",
      "bg-ink-300",
      "bg-ink-500",
      "bg-ink-700",
    ]
    const idx = Math.min(steps.length - 1, Math.max(0, Math.floor(value * steps.length)))
    return value <= 0 ? "bg-ink-100" : steps[idx]
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {/* day-of-week rail */}
      <div className="flex flex-col justify-between py-px">
        {dayLabels.map((d, i) => (
          <div key={i} className="h-3 text-[9px] leading-3 text-ink-300">{d}</div>
        ))}
      </div>
      {/* week columns */}
      <div className="flex gap-1.5">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1.5">
            {week.map((cell, di) => (
              <div
                key={di}
                role="img"
                aria-label={
                  cell.value == null
                    ? `${cell.date ?? `week ${wi + 1}`}: no data`
                    : `${cell.date ?? `week ${wi + 1}`}: ${Math.round(cell.value * 100)}%${unit ? ` ${unit}` : ""}`
                }
                title={cell.date}
                className={cn("size-3 rounded-[3px]", shade(cell.value))}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
