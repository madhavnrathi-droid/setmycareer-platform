import { useEffect, useRef } from "react"
import { ArrowUpRight, ArrowDownRight } from "lucide-react"
import { countUp } from "@/lib/gsap"
import { Sparkline } from "@/components/custom/Sparkline"
import { cn } from "@/lib/utils"

export function Delta({ value, className }: { value: number | null | undefined; className?: string }) {
  if (value == null || value === 0) return null
  const up = value > 0
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
      up ? "text-well-600" : "text-risk-600", className,
    )}>
      {up ? <ArrowUpRight className="size-3 stroke-[2]" /> : <ArrowDownRight className="size-3 stroke-[2]" />}
      {Math.abs(value)}
    </span>
  )
}

/* Big thin number card (REF-D "$128k ↑36.8%"): giant Montserrat-extralight value,
   tiny uppercase eyebrow, semantic delta. Number counts up on mount. An optional
   `spark` renders an inline Sparkline at the right — the glanceable trend behind
   the number — toned to match the delta (well up / risk down, brand if flat). */
export function StatCard({
  label, value, prefix = "", suffix = "", delta, hint, spark, className,
}: {
  label: string
  value: number | string
  prefix?: string
  suffix?: string
  delta?: number | null
  hint?: string
  spark?: number[]
  className?: string
}) {
  const numRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    if (typeof value === "number") countUp(numRef.current, value, 0.8, suffix)
  }, [value, suffix])

  const sparkTone =
    delta == null || delta === 0 ? "brand" : delta > 0 ? "well" : "risk"

  return (
    <div className={cn("rounded-2xl bg-card p-5 shadow-[var(--shadow-e2)] transition-colors", className)}>
      <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-ink-300">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex items-end gap-2">
          <span className="font-display text-[34px] font-extralight leading-none tracking-tight tabular-nums text-foreground">
            {prefix}
            {typeof value === "number" ? <span ref={numRef}>{value}{suffix}</span> : value}
          </span>
          <Delta value={delta} className="mb-1.5" />
        </div>
        {spark && spark.length > 1 && (
          <Sparkline data={spark} tone={sparkTone} width={72} height={28} className="mb-0.5 shrink-0" />
        )}
      </div>
      {hint && <div className="mt-1.5 text-[11.5px] text-muted-foreground">{hint}</div>}
    </div>
  )
}
