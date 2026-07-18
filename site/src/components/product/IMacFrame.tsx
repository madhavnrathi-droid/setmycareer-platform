// The dashboard, set in a realistic aluminium iMac — device context for "how it's
// actually used", built in CSS (no heavy 3D asset). A silver slim-iMac: thin black
// screen glass with a faint sheen, a brushed-aluminium chin, the iconic curved neck
// + foot with a soft ground shadow. Monochrome — on brand (no green). Click the
// screen to zoom. Children (an optional callout chip) float over, un-clipped.
// Reduced-motion safe.
import { useRef, useState, type ReactNode } from "react"
import { Maximize, Pause, Play } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"
import { Lightbox } from "./Lightbox"

export function IMacFrame({
  src,
  video,
  alt,
  className = "",
  children,
}: {
  src: string
  /** optional auto-playing screen recording — the home scrolls itself so the
   *  frame reads as a live surface, not a slide. Falls back to `src` still. */
  video?: string
  alt: string
  className?: string
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
  const brushed = "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0 1px, rgba(0,0,0,0.015) 1px 3px)"
  return (
    <div data-reveal className={`relative mx-auto w-full max-w-[780px] ${className}`}>
      {/* body: brushed-aluminium unibody holding a black-glass screen; the extra
          bottom padding is the chin. Inset top highlight + a soft cast shadow. */}
      <div
        className="relative rounded-[24px] bg-gradient-to-b from-[#f2f3f4] via-[#dcdee1] to-[#bdc1c5] p-[10px] pb-[46px]"
        style={{ boxShadow: "inset 0 1.5px 0 rgba(255,255,255,0.75), inset 0 -1px 1px rgba(0,0,0,0.12), 0 34px 70px -30px rgba(11,11,11,0.42)" }}
      >
        {/* brushed texture over the aluminium */}
        <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[24px] opacity-60" style={{ backgroundImage: brushed }} />

        {/* the black glass panel: thin bezel around the screen */}
        <button
          type="button"
          onClick={() => setZoom(true)}
          aria-label={`Enlarge: ${alt}`}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[12px] bg-[#080809] p-[9px]"
          style={{ boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.6), 0 1px 2px rgba(0,0,0,0.35)" }}
        >
          <span className="relative block overflow-hidden rounded-[6px]">
            {video ? (
              // reduced-motion falls back to the still (poster) — no autoplay
              <video
                ref={videoRef}
                src={video}
                poster={src}
                autoPlay
                muted
                loop
                playsInline
                className="block w-full motion-reduce:hidden"
              />
            ) : null}
            <img
              src={src}
              alt={alt}
              loading="lazy"
              className={`block w-full transition-transform duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-safe:group-hover:scale-[1.015] ${video ? "motion-safe:hidden" : ""}`}
            />
            {/* glass sheen — a faint diagonal reflection so it reads as a screen */}
            <span aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden" style={{ background: "linear-gradient(118deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 16%, transparent 34%)" }} />
          </span>
          <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-black/10 bg-white/90 text-ink-60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Maximize size={16} />
          </span>
        </button>

        {/* chin mark — centred on the aluminium, subtle */}
        <span className="pointer-events-none absolute inset-x-0 bottom-[15px] flex justify-center text-ink/25">
          <LogoMark size={15} />
        </span>
      </div>

      {/* stand: the iconic curved aluminium neck + foot, front view */}
      <div className="relative mx-auto -mt-[1px] w-[240px]">
        <svg viewBox="0 0 240 104" className="block w-full" aria-hidden>
          <defs>
            <linearGradient id="imac-al" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#e2e4e7" />
              <stop offset="0.5" stopColor="#cfd2d6" />
              <stop offset="1" stopColor="#aeb2b7" />
            </linearGradient>
            <linearGradient id="imac-al-edge" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
              <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#000000" stopOpacity="0.14" />
            </linearGradient>
          </defs>
          {/* neck flaring into the foot — one continuous aluminium piece */}
          <path
            d="M104 0 C102 34 96 52 74 70 C60 81 46 84 40 88 L200 88 C194 84 180 81 166 70 C144 52 138 34 136 0 Z"
            fill="url(#imac-al)"
          />
          <path
            d="M104 0 C102 34 96 52 74 70 C60 81 46 84 40 88 L200 88 C194 84 180 81 166 70 C144 52 138 34 136 0 Z"
            fill="url(#imac-al-edge)"
          />
          {/* foot bar resting on the desk */}
          <rect x="30" y="86" width="180" height="12" rx="6" fill="url(#imac-al)" />
          <rect x="30" y="86" width="180" height="3" rx="1.5" fill="#ffffff" opacity="0.5" />
        </svg>
        {/* soft contact shadow on the ground */}
        <span aria-hidden className="absolute -bottom-1 left-1/2 h-3 w-[70%] -translate-x-1/2 rounded-[50%] bg-ink/20 blur-md" />
      </div>

      {/* WCAG 2.2.2 — a persistent pause control for the auto-looping screen
          recording (outside the zoom button; over the chin, not the glass) */}
      {video && (
        <button
          type="button"
          onClick={toggle}
          aria-label={paused ? "Play the preview" : "Pause the preview"}
          className="absolute bottom-[13px] right-3 z-20 grid size-8 place-items-center rounded-full border border-black/10 bg-white/90 text-ink-60 transition-colors hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink"
        >
          {paused ? <Play size={14} /> : <Pause size={14} />}
        </button>
      )}
      {children}
      {zoom && <Lightbox src={video ?? src} type={video ? "video" : "image"} alt={alt} onClose={() => setZoom(false)} />}
    </div>
  )
}
