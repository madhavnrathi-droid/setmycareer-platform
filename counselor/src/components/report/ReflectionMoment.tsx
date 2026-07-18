import { useGsap, gsap, EASE, DUR } from "@/lib/gsap"
import { LogoMark } from "@/components/brand/Logo"

/* ── ReflectionMoment ─────────────────────────────────────────────────────────
   A full-page calm "breath between sections": one profound line set large in the
   display face, surrounded by generous negative space, with a whisper of a
   vertical gradient and a faint, oversized logomark drifting behind the text. It
   should read like a single page in a private journal — quiet, warm, unhurried.

   Shared visual language (used across the report set):
     • ink scale for type, brand-500 only as an accent hairline / glyph
     • uppercase tracked kicker, font-display for the large line
     • a soft top→bottom canvas gradient + a 6-stroke logomark watermark
     • a single hairline "rule" as punctuation
     • GSAP fade/rise on mount, reduced-motion safe, print-friendly. */

export function ReflectionMoment({
  quote,
  attribution,
  kicker = "A moment to reflect",
}: {
  quote: string
  attribution?: string
  kicker?: string
}) {
  const ref = useGsap<HTMLDivElement>((scope) => {
    const items = scope.querySelectorAll<HTMLElement>("[data-rise]")
    if (items.length) gsap.from(items, { opacity: 0, y: 14, duration: DUR.enter, ease: EASE.soft, stagger: 0.12 })
  }, [quote])

  if (!quote?.trim()) return null

  return (
    <section
      ref={ref}
      aria-label={kicker}
      className="relative isolate flex min-h-[60vh] w-full items-center justify-center overflow-hidden rounded-2xl border border-hairline bg-gradient-to-b from-canvas via-card to-brand-100/20 px-8 py-24 text-center print:min-h-0 print:py-20"
      style={{ breakInside: "avoid" }}
    >
      {/* logomark watermark — ONE joint shape: solid mark flattened by element
          opacity, so the five strokes never show their overlaps. */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 text-brand-500 opacity-[0.05]" aria-hidden>
        <LogoMark size={420} />
      </div>

      <div className="relative mx-auto max-w-2xl">
        <div data-rise className="flex items-center justify-center gap-2.5 text-brand-600">
          <span className="h-px w-7 bg-brand-500/40" aria-hidden />
          <span className="text-[10.5px] font-medium uppercase tracking-[0.24em]">{kicker}</span>
          <span className="h-px w-7 bg-brand-500/40" aria-hidden />
        </div>

        <blockquote
          data-rise
          className="mt-8 font-display text-[clamp(1.6rem,3.4vw,2.5rem)] font-light leading-[1.28] tracking-[-0.01em] text-balance text-ink-900"
        >
          <span aria-hidden className="mr-1 align-top text-brand-500/30">“</span>
          {quote}
          <span aria-hidden className="ml-0.5 align-top text-brand-500/30">”</span>
        </blockquote>

        {attribution && (
          <figcaption data-rise className="mt-7 text-[12.5px] font-medium tracking-wide text-ink-400">
            — {attribution}
          </figcaption>
        )}
      </div>
    </section>
  )
}
