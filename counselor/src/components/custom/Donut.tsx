import { Cell, Pie, PieChart } from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Thin composition donut (REF "caseload by status / risk mix"): a slim ring with
   a big thin total in the hole. Slices default to an ink ramp so it reads in
   grayscale; pass a `tone` per slice only where the hue carries meaning
   (brand/well/risk/mind/warn). Frosted tooltip, single ease-out grow on reveal. */

const TONE: Record<string, string> = {
  brand: "var(--color-brand-500)",
  well: "var(--color-well-600)",
  risk: "var(--color-risk-500)",
  mind: "var(--color-mind-500)",
  warn: "var(--color-warn-600)",
  ink: "var(--color-foreground)",
}

// neutral ink ramp for untoned slices (dark → light, AA on white)
const INK_RAMP = [
  "var(--color-ink-700)",
  "var(--color-ink-500)",
  "var(--color-ink-300)",
  "var(--color-ink-200)",
]

export function Donut({
  data,
  total,
  size = 160,
  centerLabel,
  className,
}: {
  data: { label: string; value: number; tone?: string }[]
  total?: number | string
  size?: number
  centerLabel?: string
  className?: string
}) {
  const reduced = prefersReducedMotion()
  const sum = data.reduce((s, d) => s + d.value, 0)
  const totalValue = total ?? sum

  const stroke = Math.max(10, Math.round(size * 0.11))
  const outer = size / 2
  const inner = outer - stroke

  const colorOf = (d: { tone?: string }, i: number) =>
    (d.tone && (TONE[d.tone] ?? d.tone)) || INK_RAMP[i % INK_RAMP.length]

  const config = Object.fromEntries(
    data.map((d, i) => [d.label, { label: d.label, color: colorOf(d, i) }]),
  ) satisfies ChartConfig

  const aria =
    `Composition donut. Total ${totalValue}. ` +
    data.map((d) => `${d.label} ${d.value}`).join(", ")

  return (
    <div
      className={cn("relative inline-grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      <ChartContainer
        config={config}
        className="aspect-square"
        style={{ width: size, height: size }}
        role="img"
        aria-label={aria}
      >
        <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                nameKey="label"
                hideLabel
                className="rounded-xl border-hairline bg-surface-frost-strong shadow-[var(--shadow-e3)] backdrop-blur-md"
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="label"
            innerRadius={inner}
            outerRadius={outer}
            paddingAngle={1.5}
            cornerRadius={3}
            strokeWidth={0}
            isAnimationActive={!reduced}
            animationDuration={700}
            animationEasing="ease-out"
          >
            {data.map((d, i) => (
              <Cell key={i} fill={colorOf(d, i)} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>

      {/* center total */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="font-display text-[26px] font-extralight leading-none tracking-tight tabular-nums text-foreground">
          {totalValue}
        </span>
        {centerLabel && (
          <span className="mt-1 text-[9.5px] font-medium uppercase tracking-[0.12em] text-ink-300">
            {centerLabel}
          </span>
        )}
      </div>
    </div>
  )
}
