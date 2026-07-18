import { useGsap, gsap, EASE, DUR } from "@/lib/gsap"
import { LogoMark } from "@/components/brand/Logo"

/* ── SignatureInsight ─────────────────────────────────────────────────────────
   A designed, full-width STATEMENT page for the report's framing thesis — the
   opening spread of a premium dossier. A short kicker, one large framed insight
   set in the display face, and an optional supporting line. Bracketed by fine
   corner rules and a small logomark so it reads as "the thesis", not body copy.

   Shares the report visual language: ink scale type, a single brand accent, a
   faint tinted gradient wash, hairline framing, GSAP rise on mount. */

export function SignatureInsight({
  kicker = "The through-line",
  insight,
  sub,
}: {
  kicker?: string
  insight: string
  sub?: string
}) {
  const ref = useGsap<HTMLDivElement>((scope) => {
    const items = scope.querySelectorAll<HTMLElement>("[data-rise]")
    const rules = scope.querySelectorAll<HTMLElement>("[data-rule]")
    const tl = gsap.timeline()
    if (rules.length) tl.fromTo(rules, { scaleX: 0 }, { scaleX: 1, duration: DUR.draw, ease: EASE.quart, stagger: 0.08 })
    if (items.length) tl.from(items, { opacity: 0, y: 16, duration: DUR.enter, ease: EASE.soft, stagger: 0.1 }, "-=0.5")
  }, [insight])

  if (!insight?.trim()) return null

  return (
    <section
      ref={ref}
      aria-label={kicker}
      className="relative isolate w-full overflow-hidden rounded-2xl border border-ink-900 bg-gradient-to-br from-ink-050 via-card to-brand-100/30 px-8 py-16 sm:px-14 sm:py-20"
      style={{ breakInside: "avoid" }}
    >
      {/* subtle corner brackets — the "framed statement" cue */}
      <Corner className="left-4 top-4" rot={0} />
      <Corner className="right-4 top-4" rot={90} />
      <Corner className="bottom-4 right-4" rot={180} />
      <Corner className="bottom-4 left-4" rot={270} />

      <div className="relative mx-auto max-w-3xl text-center">
        <div data-rise className="flex items-center justify-center gap-3 text-ink-400">
          <LogoMark size={18} className="text-brand-500" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.26em]">{kicker}</span>
        </div>

        <div data-rule className="mx-auto mt-6 h-px w-16 origin-center bg-ink-200" aria-hidden />

        <h2
          data-rise
          className="mt-8 font-display text-[clamp(1.9rem,4.2vw,3.1rem)] font-light leading-[1.16] tracking-[-0.018em] text-balance text-ink-900"
        >
          {insight}
        </h2>

        {sub && (
          <>
            <div data-rule className="mx-auto mt-9 h-px w-16 origin-center bg-ink-200" aria-hidden />
            <p data-rise className="mx-auto mt-7 max-w-xl text-[14px] leading-relaxed text-ink-500 text-balance">
              {sub}
            </p>
          </>
        )}
      </div>
    </section>
  )
}

/* A 16px right-angle corner bracket, rotated to each frame corner. */
function Corner({ className, rot }: { className: string; rot: number }) {
  return (
    <svg
      aria-hidden
      width={18}
      height={18}
      className={`absolute text-ink-300/70 ${className}`}
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <path d="M1 1 H13 M1 1 V13" stroke="currentColor" strokeWidth={1} fill="none" strokeLinecap="round" />
    </svg>
  )
}
