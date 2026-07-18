import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import type { Session } from "@/lib/types"
import { useGsap, gsap, EASE, DUR, prefersReducedMotion } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" })

/* A tiny area spark of index movement around one session. Pure SVG, no axes —
   a quiet read of where the index sat across the recent sessions. */
function Spark({ points, w = 56, h = 18 }: { points: number[]; w?: number; h?: number }) {
  if (points.length < 2) {
    return <div className="h-[18px] w-14 rounded bg-ink-100/60" aria-hidden />
  }
  const min = Math.min(...points)
  const max = Math.max(...points)
  const span = max - min || 1
  const stepX = w / (points.length - 1)
  const xy = points.map((p, i) => [i * stepX, h - ((p - min) / span) * (h - 2) - 1])
  const line = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const area = `${line} L${w},${h} L0,${h} Z`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <path d={area} fill="var(--color-foreground)" fillOpacity={0.06} />
      <path d={line} fill="none" stroke="var(--color-foreground)" strokeWidth={1} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

/* Recommendation chip under a node (REF-A medication-chip style): pill, faint fill,
   tiny tabular count. e.g. "CV rework ×1". */
function RecoChip({ label, count }: { label: string; count: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10.5px] text-ink-600">
      {label}
      {count > 1 && <span className="tabular-nums text-ink-300">×{count}</span>}
    </span>
  )
}

/* REF-A horizontal timeline/flow: a thin connector line that draws left→right on
   mount, with chronological event nodes (real <button>s, generous hit padding).
   The latest node carries a brand ring. Each node shows date + an index spark and
   recommendation chips. Clicking a node calls onSelect(id) or routes to the session.
   Reduced-motion renders the line already drawn. Horizontal scroll on overflow. */
export function TimelineFlow({
  sessions,
  clientId,
  onSelect,
}: {
  sessions: Session[]
  clientId: string
  onSelect?: (sessionId: string) => void
}) {
  const navigate = useNavigate()

  // chronological (oldest → newest), so DOM order matches reading order
  const ordered = useMemo(
    () => [...sessions].sort((a, b) => +new Date(a.date) - +new Date(b.date)),
    [sessions],
  )

  // running index series for the sparks (uses indexDelta deltas; baseline 60)
  const series = useMemo(() => {
    let acc = 60
    return ordered.map((s) => (acc += s.indexDelta ?? 0))
  }, [ordered])

  const ref = useGsap<HTMLDivElement>((scope) => {
    const line = scope.querySelector<SVGLineElement>("[data-flow-line]")
    const nodes = scope.querySelectorAll<HTMLElement>("[data-flow-node]")
    const tl = gsap.timeline()
    if (line) {
      tl.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: DUR.draw, ease: EASE.quart })
    }
    if (nodes.length) {
      tl.from(nodes, { opacity: 0, y: 8, duration: DUR.enter, ease: EASE.soft, stagger: 0.06 }, "-=0.45")
    }
  }, [clientId, ordered.length])

  const lastIdx = ordered.length - 1
  const handle = (id: string) => () => {
    if (onSelect) onSelect(id)
    else navigate(`/clients/${clientId}/sessions/${id}`)
  }

  return (
    <div
      ref={ref}
      className="overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink-200"
    >
      <div className="relative flex min-w-max items-stretch gap-10 px-2 pt-3">
        {/* connector line — drawn left→right (origin-left scaleX) */}
        <div
          className="pointer-events-none absolute left-2 right-2 top-[17px] h-px"
          aria-hidden
        >
          <svg className="h-px w-full overflow-visible" preserveAspectRatio="none">
            <line
              data-flow-line
              x1="0"
              y1="0.5"
              x2="100%"
              y2="0.5"
              stroke="var(--color-ink-200)"
              strokeWidth={1}
              className="origin-left"
              style={prefersReducedMotion() ? undefined : { transform: "scaleX(0)" }}
            />
          </svg>
        </div>

        {ordered.map((s, i) => {
          const latest = i === lastIdx
          const points = series.slice(Math.max(0, i - 2), i + 1)
          return (
            <div key={s.id} data-flow-node className="relative flex w-36 flex-col items-center">
              {/* node button — 24px hit padding around the dot */}
              <button
                type="button"
                onClick={handle(s.id)}
                aria-label={`Session ${fmtDate(s.date)}${latest ? " (latest)" : ""}`}
                aria-current={latest ? "true" : undefined}
                className="group relative -m-6 p-5 outline-none"
              >
                <span
                  className={cn(
                    "grid size-3.5 place-items-center rounded-full border bg-card transition-colors",
                    latest
                      ? "border-brand-500 ring-4 ring-brand-100"
                      : "border-ink-300 group-hover:border-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "size-1.5 rounded-full transition-colors",
                      latest ? "bg-brand-500" : "bg-ink-300 group-hover:bg-foreground",
                    )}
                  />
                </span>
              </button>

              <div className="mt-1 text-[11px] font-medium tabular-nums text-foreground">{fmtDate(s.date)}</div>

              <button
                type="button"
                onClick={handle(s.id)}
                className="mt-2 rounded-md outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-brand-500"
                aria-label={`Index trend for ${fmtDate(s.date)}`}
                tabIndex={-1}
              >
                <Spark points={points} />
              </button>

              {s.recos && s.recos.length > 0 && (
                <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                  {s.recos.map((r) => (
                    <RecoChip key={r.label} label={r.label} count={r.count} />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
