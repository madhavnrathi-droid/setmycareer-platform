import { Suspense, lazy, useEffect, useRef } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { JourneyObject } from "@/three/JourneyObject"
import { JOURNEY_UNIS } from "@/content/logos"

// The student journey — the Indian education pipeline as an avant-garde editorial
// sequence: giant numerals anchor each stage, one impactful line of type, and a
// LIVING INTERACTIVE ARTWORK ("Quiet Mechanics" — see src/journey-art/PHILOSOPHY.md)
// as the stage's visual: a portrait that resolves under attention, a stream that
// dams around a still cursor, a bow you draw, a puzzle that knows where it belongs,
// pendulums that share energy, a needle that returns to true north. Cursor is a
// force, never a button. Each artwork is code-split (lazy) and renders only in view.

const Art01 = lazy(() => import("@/journey-art/Art01Reveal").then((m) => ({ default: m.Art01Reveal })))
const Art02 = lazy(() => import("@/journey-art/Art02Stream").then((m) => ({ default: m.Art02Stream })))
const Art03 = lazy(() => import("@/journey-art/Art03Archery").then((m) => ({ default: m.Art03Archery })))
const Art04 = lazy(() => import("@/journey-art/Art04Puzzle").then((m) => ({ default: m.Art04Puzzle })))
const Art05 = lazy(() => import("@/journey-art/Art05Pendulum").then((m) => ({ default: m.Art05Pendulum })))
const Art06 = lazy(() => import("@/journey-art/Art06Compass").then((m) => ({ default: m.Art06Compass })))

const PURPLE = "var(--color-growth)"
const RED = "var(--color-decline)"

type Vis = "aptitude" | "fork" | "funnel" | "unis" | "gap" | "paths"
type Stage = {
  no: string; phase: string; tag?: string; head: string
  decision: string; wrong: string; smc: string; vis: Vis
}

const STAGES: Stage[] = [
  { no: "01", phase: "School — to Class 10", head: "Read the child,\nnot the rank", vis: "aptitude",
    decision: "Pick a board — then look closely enough that what they're strong at, and drawn to, comes into focus.",
    wrong: "Marks-factory schooling — the picture stays a blur.",
    smc: "One early read brings the whole child into focus." },
  { no: "02", phase: "After Class 10", tag: "the fork", head: "The stream\nyou can win in", vis: "fork",
    decision: "Science, Commerce or Humanities — the first stroke of a line you'll be drawing for years.",
    wrong: "The default stroke — 2 yrs & ₹3–8L to redraw.",
    smc: "Aptitude sets the line; the rest follows its curve." },
  { no: "03", phase: "Class 11–12", tag: "the gate", head: "One target,\na funded Plan B", vis: "funnel",
    decision: "Lock subjects to one entrance track — JEE, NEET, CLAT, CUET — but keep a second arrow nocked.",
    wrong: "A shot that was never on target. A lost dropper year.",
    smc: "A true aim, honest odds, and an arrow held in reserve." },
  { no: "04", phase: "College", tag: "the choice", head: "Fit first,\nbrand second", vis: "unis",
    decision: "Which degree, and where — the piece has to fit the rest of the picture, not just carry a name.",
    wrong: "The prestige trap — a piece forced where it never fit.",
    smc: "Match the shape to the gap; then the whole picture holds." },
  { no: "05", phase: "UG — the years", head: "Close the\nskills gap", vis: "gap",
    decision: "The degree years are stored momentum — spend them on real skills and it carries clean to the offer.",
    wrong: "Coasting — the swing dies halfway; ~1 in 2 leave job-ready.",
    smc: "A mid-degree nudge puts the momentum where it lands a job." },
  { no: "06", phase: "PG · Placements · PhD", head: "A direction,\nnot a default", vis: "paths",
    decision: "A job, a PG, or research — let the needle settle before you commit to a heading.",
    wrong: "One more degree while the needle still spins.",
    smc: "A mature profile lets it settle — onto a niche worth the walk." },
]

// which living system carries each stage, its frame, and the one-line invitation
const VIS_META: Record<Vis, { El: React.LazyExoticComponent<React.ComponentType<{ className?: string }>>; frame: string; hint: string }> = {
  aptitude: { El: Art01, frame: "aspect-[1000/1181] max-w-[340px]", hint: "Move the lens — see what was there all along" },
  fork:     { El: Art02, frame: "aspect-[5/4] max-w-[420px]", hint: "Draw across — the current follows your hand" },
  funnel:   { El: Art03, frame: "aspect-[4/3] max-w-[440px]", hint: "Grab the string. Draw. Release." },
  unis:     { El: Art04, frame: "aspect-square max-w-[380px]", hint: "Drag the four pieces together" },
  gap:      { El: Art05, frame: "aspect-square max-w-[400px]", hint: "Pull the end weight — let it swing" },
  paths:    { El: Art06, frame: "aspect-square max-w-[300px]", hint: "Come close — watch the needle settle" },
}

function StageVisual({ vis }: { vis: Vis }) {
  const { El, frame, hint } = VIS_META[vis]
  return (
    <div className="w-full">
      <Suspense fallback={<div className={`w-full ${frame}`} />}>
        <El className={`w-full ${frame}`} />
      </Suspense>
      <p className="mono mt-3 text-[9px] uppercase tracking-[0.16em] text-ink-40">{hint}</p>
    </div>
  )
}

// College destinations — the best-known name in each field, colour crests, kept
// as a quiet strip in the text column (the puzzle owns the visual slot).
function UniStrip() {
  return (
    <div className="mt-8">
      <div className="mono mb-4 text-[9px] uppercase tracking-[0.18em] text-ink-40">Best-in-field destinations</div>
      <div className="flex flex-wrap items-center gap-x-9 gap-y-5">
        {JOURNEY_UNIS.map((u) => (
          <span key={u.name} className="group/l inline-flex items-center gap-2.5" title={`${u.name} — ${u.field}`}>
            <img src={u.src} alt={u.name} loading="lazy" className="h-8 w-auto max-w-[60px] object-contain transition-transform duration-300 group-hover/l:scale-110" />
            <span className="text-[12.5px] font-medium tracking-tight text-ink-80">{u.name}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

/* ── one editorial band ───────────────────────────────────────────────── */
function StageRow({ s }: { s: Stage }) {
  const [l1, l2] = s.head.split("\n")
  return (
    <article className="stage border-t border-line pt-9 md:pt-12" data-reveal>
      <div className="grid gap-x-10 gap-y-10 pb-16 md:pb-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)] lg:gap-x-16">
        <div className="flex items-start gap-5 md:gap-9">
          <span aria-hidden className="shrink-0 font-extralight leading-[0.72] tracking-tight text-ink/25 tabular-nums" style={{ fontSize: "clamp(2.6rem,6vw,5.2rem)" }}>{s.no}</span>
          <div className="min-w-0">
            <div className="mono flex flex-wrap items-center gap-x-2 text-[10px] uppercase tracking-[0.16em] text-ink-40">
              <span>{s.phase}</span>{s.tag && <span className="text-ink-20">· {s.tag}</span>}
            </div>
            <h3 className="mt-3 font-light leading-[0.98] tracking-tight" style={{ fontSize: "clamp(1.65rem,4.6vw,3.4rem)" }}>{l1}<br />{l2}</h3>
            <p className="serif mt-5 max-w-[34ch] leading-snug text-ink-80" style={{ fontSize: "clamp(1.02rem,1.5vw,1.28rem)" }}>{s.decision}</p>
            <div className="mt-7 max-w-[44ch] space-y-2.5">
              <p className="flex gap-2.5 text-[13.5px] leading-snug"><span aria-hidden className="mt-px shrink-0" style={{ color: RED }}>✕</span><span className="text-ink-60">{s.wrong}</span></p>
              <p className="flex gap-2.5 text-[13.5px] leading-snug"><span aria-hidden className="mt-px shrink-0" style={{ color: PURPLE }}>◆</span><span className="text-ink-80">{s.smc}</span></p>
            </div>
            {s.vis === "unis" && <UniStrip />}
          </div>
        </div>
        <div className="flex items-center lg:justify-end">
          <StageVisual vis={s.vis} />
        </div>
      </div>
    </article>
  )
}

export function StudentJourney() {
  const ref = useReveals([])
  const wrapRef = useRef<HTMLDivElement>(null)
  const spineRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)

  // the left path inks in as you scroll through the stages; a playhead rides it.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      if (spineRef.current) spineRef.current.style.transform = "scaleY(1)"
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const el = wrapRef.current; if (!el) return
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 800
      const p = Math.max(0, Math.min(1, (vh * 0.5 - r.top) / (r.height * 0.82)))
      if (spineRef.current) spineRef.current.style.transform = `scaleY(${p})`
      if (dotRef.current) { dotRef.current.style.top = `${p * 100}%`; dotRef.current.style.opacity = p > 0.001 && p < 0.999 ? "1" : "0" }
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf) }
  }, [])

  return (
    <section id="journey" ref={ref} className="hair-t bg-paper-pure">
      <div className="wrap py-20 md:py-28">
        {/* header — giant type + the 3D signature */}
        <div className="grid items-center gap-y-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:gap-x-16">
          <div>
            <Kicker>The student journey</Kicker>
            <SplitReveal className="mt-5 font-light leading-[0.92] tracking-tight text-[clamp(2.8rem,7.2vw,5.4rem)]" as="h2">Where students<br /><span className="b">actually go</span>.</SplitReveal>
            <p data-reveal className="serif mt-7 max-w-[40ch] leading-[1.5] text-ink-80" style={{ fontSize: "clamp(1.1rem,1.7vw,1.35rem)" }}>
              A career is decided less by one exam than by a chain of quiet, early choices — and the earlier the mismatch, the more it costs to undo.
            </p>
            <div data-reveal className="mt-7 flex flex-wrap items-center gap-x-7 gap-y-2 text-[11px] text-ink-60">
              <span className="mono uppercase tracking-[0.16em] text-ink-40">Read the colour</span>
              <span className="inline-flex items-center gap-2"><span aria-hidden style={{ color: PURPLE }}>◆</span> the assisted path</span>
              <span className="inline-flex items-center gap-2"><span aria-hidden style={{ color: RED }}>✕</span> left to chance</span>
            </div>
          </div>
          <JourneyObject className="mx-auto aspect-square w-[min(78vw,360px)] lg:mx-0 lg:ml-auto" />
        </div>

        {/* the six bands, threaded by the scroll-inked spine on the left */}
        <div ref={wrapRef} className="relative mt-14 pl-7 md:mt-20 md:pl-12">
          <span aria-hidden className="absolute left-[2px] top-0 h-full w-px bg-line md:left-[4px]" />
          <span ref={spineRef} aria-hidden className="absolute left-[2px] top-0 h-full w-px origin-top bg-ink md:left-[4px]" style={{ transform: "scaleY(0)" }} />
          <span ref={dotRef} aria-hidden className="absolute left-[2px] z-[2] size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink opacity-0 shadow-[0_0_0_4px_var(--color-paper-pure,#faf9f6)] md:left-[4px]" style={{ top: 0 }} />
          {STAGES.map((s) => <StageRow key={s.no} s={s} />)}
        </div>

        <div data-reveal className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-line pt-9">
          <p className="max-w-[46ch] font-light leading-snug text-ink-80" style={{ fontSize: "clamp(1.15rem,1.9vw,1.5rem)" }}>Every fork compounds. We make the early ones on evidence.</p>
          <Link to="/cri" className="ul inline-flex items-center gap-2 text-[14px] font-medium">Not sure you need counselling? Take the free test <ArrowUpRight size={16} /></Link>
        </div>
        <p className="mt-8 text-[11px] leading-relaxed text-ink-40">University marks belong to their owners — shown as the best-known name in each field, for reference, not endorsement. La Gioconda (Leonardo da Vinci) and the gilded frame (Rijksmuseum, SK-L-1592) are public domain.</p>
      </div>
    </section>
  )
}
