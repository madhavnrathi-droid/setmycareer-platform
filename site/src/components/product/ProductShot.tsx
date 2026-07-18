// A real product screenshot, framed like an app window — the Stripe/Clay/Palantir
// move: colourful product truth held inside a calm, monochrome editorial frame.
// Sharp corners + hairline border keep it on-brand; the only rounding is the
// traffic-light dots (the sanctioned pill/dot exception). Reveals on scroll via
// the site's `data-reveal`; an optional floating layer can sit over the corner.

import { useRef, useState, type ReactNode } from "react"
import { Maximize, Pause, Play } from "@carbon/icons-react"
import { Lightbox } from "./Lightbox"

export function ProductShot({
  src,
  video,
  alt,
  chrome = "app.setmycareer.com/portal",
  label,
  reveal = true,
  zoomable = true,
  className = "",
  imgClassName = "",
  children,
}: {
  src: string
  /** optional auto-playing screen recording; `src` is the reduced-motion poster */
  video?: string
  alt: string
  /** faux address-bar text; pass "" to hide the URL */
  chrome?: string
  /** small mono label shown top-right in the title bar */
  label?: string
  reveal?: boolean
  /** click the shot to open it full-size (default on) */
  zoomable?: boolean
  className?: string
  imgClassName?: string
  /** floating overlay(s) — e.g. a stat chip anchored over a corner */
  children?: ReactNode
}) {
  const [zoom, setZoom] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(false)
  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPaused(false) } else { v.pause(); setPaused(true) }
  }
  // the screen: an auto-playing recording when supplied (still poster under
  // reduced motion), else the static shot. Hover-scale is motion-safe-gated so
  // the reduced-motion poster gets no animation.
  const screen = (
    <>
      {video ? (
        <video ref={videoRef} src={video} poster={src} autoPlay muted loop playsInline className={`block w-full motion-reduce:hidden ${imgClassName}`} />
      ) : null}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className={`block w-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.015] ${video ? "motion-safe:hidden" : ""} ${imgClassName}`}
      />
    </>
  )
  return (
    <figure
      {...(reveal ? { "data-reveal": true } : {})}
      className={`group relative rounded-[16px] border border-line bg-paper-pure elev ${className}`}
    >
      {/* title bar */}
      <div className="flex items-center gap-2 rounded-t-[16px] border-b border-line px-3.5 py-2.5">
        <span className="flex items-center gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-ink/15" />
          <span className="size-2.5 rounded-full bg-ink/15" />
          <span className="size-2.5 rounded-full bg-ink/15" />
        </span>
        {chrome && (
          <span className="ml-2 truncate rounded-full border border-line px-3 py-1 text-[11px] text-ink-40">
            {chrome}
          </span>
        )}
        {label && (
          <span className="mono ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-40">{label}</span>
        )}
      </div>
      {/* the real screen — click to enlarge */}
      {zoomable ? (
        <button type="button" onClick={() => setZoom(true)} aria-label={`Enlarge: ${alt}`} className="block w-full cursor-zoom-in overflow-hidden rounded-b-[16px]">
          {screen}
          <span className="absolute right-3 top-12 grid size-9 place-items-center rounded-full border border-line bg-white/90 text-ink-60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Maximize size={16} />
          </span>
        </button>
      ) : (
        <div className="overflow-hidden rounded-b-[16px]">{screen}</div>
      )}
      {/* WCAG 2.2.2 — a persistent pause control for the auto-looping preview
          (sits outside the zoom button so it isn't a nested button) */}
      {video && (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? "Play the preview" : "Pause the preview"}
          className="absolute bottom-3 left-3 z-20 grid size-8 place-items-center rounded-full border border-line bg-white/90 text-ink-60 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
      {children}
      {zoom && <Lightbox src={video ?? src} type={video ? "video" : "image"} alt={alt} onClose={() => setZoom(false)} />}
    </figure>
  )
}

// A small stat/quote chip that floats over a screenshot corner — the Clay/Stripe
// "callout" that pulls one true number out of the UI behind it.
export function ShotChip({
  className = "",
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <div
      data-reveal
      className={`absolute z-10 border border-line bg-white px-4 py-3 text-ink shadow-[0_1px_0_rgba(11,11,11,0.04)] ${className}`}
    >
      {children}
    </div>
  )
}
