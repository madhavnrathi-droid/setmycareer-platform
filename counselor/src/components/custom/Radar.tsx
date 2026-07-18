import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar as RRadar,
  RadarChart,
} from "recharts"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Radar / spider profile (centerpiece of Tests + Client overview): RIASEC, Big
   Five, the 5 career clusters. A thin ink grid with a single low-opacity polygon
   in the chosen tone (brand by default), drawn with a tasteful ease-out sweep.
   Axis ticks hidden (direct axis labels carry the read). Truthful — radius axis
   pinned to [0, max] so the polygon area always reflects absolute magnitude. */

type Tone = "brand" | "mind" | "ink"

const TONE: Record<Tone, string> = {
  brand: "var(--color-brand-500)",
  mind: "var(--color-mind-500)",
  ink: "var(--color-foreground)",
}

/* Wrap an axis label so it never clips: split on spaces into ≤2 balanced lines,
   or hard-break a single long word near its middle. */
function wrapLabel(s: string, maxLen = 9): string[] {
  if (s.length <= maxLen) return [s]
  // "X & Y" → two clean lines (drop the ampersand)
  if (s.includes(" & ")) return s.split(" & ")
  // multi-word → balanced two-line split at the word boundary nearest the middle
  if (s.includes(" ")) {
    const words = s.split(" ")
    let best = 1, bestDiff = Infinity
    for (let i = 1; i < words.length; i++) {
      const diff = Math.abs(words.slice(0, i).join(" ").length - words.slice(i).join(" ").length)
      if (diff < bestDiff) { bestDiff = diff; best = i }
    }
    return [words.slice(0, best).join(" "), words.slice(best).join(" ")]
  }
  // single long word → hard break near the middle
  const mid = Math.ceil(s.length / 2)
  return [s.slice(0, mid) + "-", s.slice(mid)]
}

/* Custom polar-angle tick: multi-line, smaller font, inherits recharts' computed
   textAnchor so side labels grow inward and never overrun the container. */
function AxisTick(props: {
  x?: number; y?: number; textAnchor?: "start" | "middle" | "end" | "inherit"; payload?: { value: string }
}) {
  const { x = 0, y = 0, textAnchor = "middle", payload } = props
  const lines = wrapLabel(payload?.value ?? "")
  return (
    <text x={x} y={y} textAnchor={textAnchor} fill="var(--color-ink-500)" fontSize={9.5}>
      {lines.map((ln, i) => (
        <tspan key={i} x={x} dy={i === 0 ? (lines.length > 1 ? -1 : 3) : 10}>{ln}</tspan>
      ))}
    </text>
  )
}

export function Radar({
  data,
  max = 100,
  size = 248,
  tone = "brand",
  label,
  className,
}: {
  data: { axis: string; value: number }[]
  max?: number
  size?: number
  tone?: Tone
  label?: string
  className?: string
}) {
  const color = TONE[tone]
  const config = {
    value: { label: label ?? "Score", color },
  } satisfies ChartConfig

  const reduced = prefersReducedMotion()
  const aria =
    `${label ? `${label}. ` : ""}Radar profile across ${data.length} axes: ` +
    data.map((d) => `${d.axis} ${d.value}`).join(", ")

  return (
    <ChartContainer
      config={config}
      className={cn("mx-auto aspect-square", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={aria}
    >
      <RadarChart data={data} outerRadius="62%" margin={{ top: 14, right: 14, bottom: 14, left: 14 }}>
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              indicator="dot"
              nameKey="value"
              labelKey="axis"
              className="rounded-xl border-hairline bg-surface-frost-strong shadow-[var(--shadow-e3)] backdrop-blur-md"
            />
          }
        />
        <PolarGrid stroke="var(--color-ink-100)" strokeWidth={1} />
        <PolarAngleAxis dataKey="axis" tick={<AxisTick />} />
        <PolarRadiusAxis
          domain={[0, max]}
          tick={false}
          axisLine={false}
          tickCount={5}
        />
        <RRadar
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          fill={color}
          fillOpacity={0.14}
          dot={{ r: 2, fillOpacity: 1, fill: color, strokeWidth: 0 }}
          isAnimationActive={!reduced}
          animationDuration={700}
          animationEasing="ease-out"
        />
      </RadarChart>
    </ChartContainer>
  )
}
