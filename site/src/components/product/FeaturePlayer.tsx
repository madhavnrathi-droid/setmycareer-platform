// The Clay/Miter move: one framed viewport, a row of feature tabs above it. The
// active tab auto-advances (a thin progress rail fills), and the frame cross-fades
// to that feature's LIVE clip (a real screen-recording) or screenshot. Click the
// frame to zoom (Lightbox). Hover pauses the auto-advance; reduced-motion stops it
// and holds video on its poster. Monochrome frame, one purple accent on the rail.
import { useEffect, useRef, useState } from "react"
import { Maximize } from "@carbon/icons-react"
import { Lightbox } from "./Lightbox"

type Feature = {
  key: string
  label: string
  title: string
  blurb: string
  /** a screen-recording (preferred) … */
  video?: string
  /** …or a still. video wins if both are set. */
  img: string
}

const FEATURES: Feature[] = [
  {
    key: "dashboard", label: "Dashboard",
    title: "One home for the whole journey",
    blurb: "Assessments, the AI guide, sessions and the report — one login, whoever the client is.",
    video: "/product/dashboard-scroll.mp4", img: "/product/portal-dashboard.png",
  },
  {
    key: "assessments", label: "Assessments",
    title: "Validated instruments, scored live",
    blurb: "The real Sigma personality, interest and aptitude scales — scored the moment they answer.",
    video: "/product/test-flow.mp4", img: "/product/portal-test.png",
  },
  {
    key: "coach", label: "AI coach",
    title: "A counsellor, on call",
    blurb: "Chat or voice, grounded in the client's own results — thinking-partner between sessions.",
    img: "/product/portal-ai-voice.png",
  },
  {
    key: "report", label: "Report",
    title: "Scores become a story",
    blurb: "A continuous, cited Career Intelligence Report — every figure traced back to an instrument.",
    video: "/product/report-scroll.mp4", img: "/product/portal-report-cover.png",
  },
  {
    key: "sessions", label: "Sessions",
    title: "Meet, note, transcribe",
    blurb: "Counsellor-led video in the browser, with timestamped notes and a running transcript.",
    img: "/product/portal-call.png",
  },
]

const DWELL = 5000 // ms per feature before auto-advancing (≤5s, or manual)

export function FeaturePlayer() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [zoom, setZoom] = useState<Feature | null>(null)
  const paused = useRef(false)
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce.current) return
    let raf = 0, start = performance.now()
    const progressRef = { current: 0 }
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (paused.current) { start = now - progressRef.current * DWELL; return }
      const p = Math.min(1, (now - start) / DWELL)
      progressRef.current = p
      setProgress(p)
      if (p >= 1) { start = now; progressRef.current = 0; setActive((a) => (a + 1) % FEATURES.length) }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  const pick = (i: number) => { setActive(i); setProgress(0) }
  const f = FEATURES[active]

  return (
    <div
      className="not-prose"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* tabs */}
      <div className="mb-6 flex flex-wrap gap-x-1 gap-y-2">
        {FEATURES.map((ft, i) => (
          <button
            key={ft.key}
            onClick={() => pick(i)}
            className={`group relative px-3.5 py-2 text-[13.5px] font-medium tracking-tight transition-colors ${i === active ? "text-ink" : "text-ink-40 hover:text-ink-80"}`}
          >
            {ft.label}
            {/* base hairline + active progress fill */}
            <span className="absolute inset-x-0 bottom-0 h-px bg-line" />
            {i === active && (
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-growth"
                style={{ transform: `scaleX(${reduce.current ? 1 : progress})` }}
              />
            )}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_minmax(0,1.55fr)] lg:items-center lg:gap-12">
        {/* copy — crossfades with the active feature */}
        <div key={f.key} className="motion-safe:animate-[fpfade_.5s_ease-out]">
          <h3 className="h-lg max-w-[16ch] leading-[1.05]">{f.title}</h3>
          <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-ink-60">{f.blurb}</p>
          <button
            onClick={() => setZoom(f)}
            className="ul mt-6 inline-flex items-center gap-2 text-[13px] font-medium"
          >
            Open full size <Maximize size={14} />
          </button>
        </div>

        {/* the framed viewport */}
        <button
          onClick={() => setZoom(f)}
          aria-label={`Enlarge ${f.label}`}
          className="group relative block w-full cursor-zoom-in overflow-hidden rounded-[16px] border border-line bg-paper-pure text-left elev"
        >
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <span className="flex items-center gap-1.5" aria-hidden>
              <span className="size-2.5 rounded-full bg-ink/15" />
              <span className="size-2.5 rounded-full bg-ink/15" />
              <span className="size-2.5 rounded-full bg-ink/15" />
            </span>
            <span className="ml-2 truncate rounded-full border border-line px-3 py-1 text-[11px] text-ink-40">
              app.setmycareer.com/portal
            </span>
            <span className="mono ml-auto shrink-0 text-[10px] uppercase tracking-[0.14em] text-ink-40">{f.label}</span>
          </div>
          <div className="relative aspect-[16/10] overflow-hidden bg-paper">
            {FEATURES.map((ft) => {
              const on = ft.key === f.key
              return (
                <div key={ft.key} className={`absolute inset-0 transition-opacity duration-500 ${on ? "opacity-100" : "pointer-events-none opacity-0"}`}>
                  {ft.video && !reduce.current ? (
                    <video
                      src={ft.video}
                      poster={ft.img}
                      autoPlay={on}
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <img src={ft.img} alt={ft.title} loading="lazy" className="h-full w-full object-cover object-top" />
                  )}
                </div>
              )
            })}
            {/* zoom affordance */}
            <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border border-line bg-white/90 text-ink-60 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
              <Maximize size={16} />
            </span>
          </div>
        </button>
      </div>

      {zoom && (
        <Lightbox
          src={zoom.video && !reduce.current ? zoom.video : zoom.img}
          type={zoom.video && !reduce.current ? "video" : "image"}
          alt={zoom.title}
          onClose={() => setZoom(null)}
        />
      )}
    </div>
  )
}
