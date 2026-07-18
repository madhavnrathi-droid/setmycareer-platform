import { cn } from "@/lib/utils"

/* Live amplitude waveform — a row of rounded bars driven by `levels` (0–1).
   Used large in the full-screen overlay and tiny in the top-right pill. Pure
   CSS heights (no canvas) so it stays crisp and theme-aware. When `paused` the
   bars settle to a calm baseline. Reduced-motion friendly: heights still reflect
   real/simulated amplitude but there's no decorative looping. */
export function Waveform({
  levels,
  className,
  barClassName,
  bars,
  paused = false,
  rounded = true,
}: {
  levels: number[]
  className?: string
  barClassName?: string
  /** Optional downsample to fewer bars (e.g. the compact pill). */
  bars?: number
  paused?: boolean
  rounded?: boolean
}) {
  const data = bars && bars < levels.length ? downsample(levels, bars) : levels
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center gap-[3px]", className)}
      role="img"
      aria-label={paused ? "Recording paused" : "Live audio waveform"}
    >
      {data.map((v, i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] shrink-0 bg-current transition-[height,opacity] duration-100 ease-out",
            rounded && "rounded-full",
            paused && "opacity-40",
            barClassName,
          )}
          style={{ height: `${Math.max(6, Math.round((paused ? 0.06 : v) * 100))}%` }}
        />
      ))}
    </div>
  )
}

function downsample(arr: number[], n: number): number[] {
  if (arr.length <= n) return arr
  const step = arr.length / n
  return Array.from({ length: n }, (_, i) => {
    const start = Math.floor(i * step)
    const end = Math.floor((i + 1) * step)
    let max = 0
    for (let j = start; j < end; j++) max = Math.max(max, arr[j] ?? 0)
    return max
  })
}
