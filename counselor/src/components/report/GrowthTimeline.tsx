import { useGsap, gsap, EASE, DUR } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* ── GrowthTimeline ───────────────────────────────────────────────────────────
   A personal GROWTH TIMELINE: a vertical dated spine running top→bottom, with
   milestone nodes marking the counselling journey. Warm and reflective rather
   than a project gantt — the most recent milestone carries a soft brand ring and
   reads as "where you are now". The spine itself draws in on mount.

   Report visual language: hairline spine, ink scale type, brand accent on the
   live node, dates in the mono-ish tabular treatment, GSAP draw + stagger,
   print-friendly (break-avoid per milestone). */

export interface Milestone {
  date: string
  label: string
  detail?: string
}

const fmtDate = (raw: string) => {
  const d = new Date(raw)
  return Number.isNaN(+d) ? raw : d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
}

export function GrowthTimeline({ milestones }: { milestones: Milestone[] }) {
  const ref = useGsap<HTMLDivElement>((scope) => {
    const spine = scope.querySelector<HTMLElement>("[data-spine]")
    const rows = scope.querySelectorAll<HTMLElement>("[data-row]")
    const tl = gsap.timeline()
    if (spine) tl.fromTo(spine, { scaleY: 0 }, { scaleY: 1, duration: DUR.draw + 0.3, ease: EASE.quart })
    if (rows.length) tl.from(rows, { opacity: 0, x: -10, duration: DUR.enter, ease: EASE.soft, stagger: 0.1 }, "-=0.7")
  }, [milestones.length])

  if (!milestones?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-canvas px-6 py-12 text-center text-[13px] text-ink-400">
        The growth timeline fills in as the journey unfolds.
      </div>
    )
  }

  // chronological, oldest → newest (latest reads as "now")
  const ordered = [...milestones].sort((a, b) => +new Date(a.date) - +new Date(b.date))
  const lastIdx = ordered.length - 1

  return (
    <div ref={ref} className="relative w-full">
      <ol className="relative ml-1 space-y-7 pl-9">
        {/* the spine — a hairline that grows top→bottom on mount */}
        <span
          data-spine
          aria-hidden
          className="absolute left-[7px] top-1.5 bottom-1.5 w-px origin-top bg-gradient-to-b from-ink-200 via-ink-200 to-brand-300/60"
        />

        {ordered.map((m, i) => {
          const live = i === lastIdx
          return (
            <li key={`${m.date}-${i}`} data-row className="relative" style={{ breakInside: "avoid" }}>
              {/* node sitting on the spine */}
              <span
                aria-hidden
                className={cn(
                  "absolute -left-9 top-1 grid size-3.5 -translate-x-px place-items-center rounded-full border bg-card",
                  live ? "border-brand-500 ring-4 ring-brand-100" : "border-ink-300",
                )}
              >
                <span className={cn("size-1.5 rounded-full", live ? "bg-brand-500" : "bg-ink-300")} />
              </span>

              <time className="block text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">
                {fmtDate(m.date)}
                {live && <span className="ml-2 text-brand-600">· now</span>}
              </time>
              <h4 className="mt-1.5 font-display text-[16px] font-medium leading-snug text-ink-900">{m.label}</h4>
              {m.detail && <p className="mt-1.5 max-w-prose text-[13px] leading-relaxed text-ink-500">{m.detail}</p>}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
