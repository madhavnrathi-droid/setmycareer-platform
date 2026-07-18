// Setmycareer brand identity primitives, extracted from the brand manual.
//
//  • LogoMark   — the official compass / north-star glyph (the brand SVG, with the
//                 central lens). Single path, inherits `currentColor`.
//  • Wordmark   — the serif wordmark "Setmycareer" (Cambo). Only the S is capital;
//                 never all-caps, reordered, or given gradients/effects.
//  • LogoLockup — the OFFICIAL lockup: <LogoMark/> ALWAYS to the LEFT of the
//                 <Wordmark/>, with the optional Montserrat tagline
//                 "Find Your True North" below the wordmark. The mark never sits
//                 above the wordmark or on its right; never rotate / skew / mirror /
//                 stretch the lockup, and never place it over a busy photo.
//
// Some app chrome (e.g. the console top-left) still shows the mark alone — that is
// allowed; the rule is only that when the wordmark IS present, the mark sits left.

import { cn } from "@/lib/utils"

export function LogoMark({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 119.41 124.52"
      fill="currentColor" className={className} role="img" aria-label="Setmycareer"
    >
      <path d="M118.27,81.65l-14.24-19.6,13.94-19.18c1.93-2.66,1.34-6.38-1.32-8.31-2.67-1.93-6.38-1.34-8.31,1.32l-11.66,16.05-14.66-20.17,19.36-6.29c3.12-1.02,4.83-4.37,3.82-7.5-1.01-3.12-4.36-4.83-7.5-3.82l-23.04,7.49L60.73,2.45c-1.93-2.66-5.65-3.25-8.31-1.32-2.66,1.93-3.25,5.65-1.32,8.31l11.66,16.05-23.71,7.71V13.08c0-3.29-2.66-5.95-5.95-5.95s-5.95,2.67-5.95,5.95v23.99l-22.55,7.33c-3.12,1.02-4.83,4.37-3.82,7.5.82,2.52,3.15,4.11,5.66,4.11.61,0,1.23-.09,1.84-.29l18.87-6.13v24.93l-19.36-6.29c-3.14-1-6.48.7-7.5,3.82-1.02,3.13.69,6.48,3.82,7.5l23.03,7.48v23.83c0,3.29,2.66,5.95,5.95,5.95s5.95-2.67,5.95-5.95v-19.96l23.72,7.71-11.96,16.47c-1.93,2.66-1.34,6.38,1.32,8.31,1.06.77,2.28,1.14,3.49,1.14,1.84,0,3.65-.85,4.82-2.45l14.24-19.6,22.56,7.33c.61.2,1.23.29,1.84.29,2.51,0,4.84-1.6,5.66-4.11,1.02-3.13-.69-6.48-3.82-7.5l-18.87-6.13,14.66-20.17,11.97,16.47c1.16,1.6,2.98,2.45,4.82,2.45,1.21,0,2.44-.37,3.49-1.14,2.66-1.93,3.25-5.65,1.32-8.31ZM70.12,88.48l-31.07-10.1v-32.66l31.07-10.1,19.2,26.43-19.2,26.43Z" />
    </svg>
  )
}

/**
 * Wordmark — the brand wordmark "Setmycareer" set in Cambo (serif), via the
 * `font-wordmark` utility. Exactly one capital (the S); the text is rendered
 * verbatim with no gradient, outline, or other effect per the brand manual.
 *
 * `size` is the font-size in px (defaults to 18, matching the old console label).
 */
export function Wordmark({ size = 18, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("font-wordmark leading-none tracking-[-0.01em]", className)}
      style={{ fontSize: size }}
    >
      Setmycareer
    </span>
  )
}

/**
 * LogoLockup — the official Setmycareer lockup.
 *
 * Layout (immovable): <LogoMark/> on the LEFT, <Wordmark/> immediately to its
 * right, and — when `tagline` is true — the Montserrat tagline
 * "Find Your True North" sits BELOW the wordmark (smaller, muted). The mark is
 * never placed above the wordmark or to its right.
 *
 * `tone` controls colour only:
 *   • "dark"  (default) — ink wordmark for light surfaces.
 *   • "light"           — white wordmark for dark / brand panels.
 * The caller may still colour the mark via `className` (it inherits currentColor).
 *
 * `size` is the wordmark font-size in px; the mark and tagline scale from it.
 */
export function LogoLockup({
  size = 22,
  tagline = false,
  tone = "dark",
  className = "",
}: {
  size?: number
  /** Show the "Find Your True North" tagline. OFF by default — the lockup reads as
   *  mark + wordmark almost everywhere; only the brand panel opts the tagline in. */
  tagline?: boolean
  tone?: "dark" | "light"
  className?: string
}) {
  // Mark scaled to sit at the wordmark's cap-height (≈1.32×) so it has real
  // presence beside the serif — the thin 1.18× read looked under-weighted.
  const markSize = Math.round(size * 1.32)
  const taglineSize = Math.max(9, Math.round(size * 0.42))
  const ink = tone === "light" ? "text-white" : "text-foreground"
  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      {/* mark — ALWAYS left of the wordmark */}
      <LogoMark size={markSize} className={cn("shrink-0", ink)} />
      <span className="inline-flex flex-col justify-center">
        <Wordmark size={size} className={ink} />
        {tagline && (
          <span
            className={cn(
              "mt-1 font-display font-medium uppercase tracking-[0.2em] leading-none",
              tone === "light" ? "text-white/65" : "text-muted-foreground",
            )}
            style={{ fontSize: taglineSize }}
          >
            Find Your True North
          </span>
        )}
      </span>
    </div>
  )
}
