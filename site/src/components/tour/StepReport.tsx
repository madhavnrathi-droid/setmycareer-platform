import { useLayoutEffect, useRef, type JSX } from "react"
import { gsap } from "gsap"
import { PortalFrame, FrameChip } from "./AppFrame"

/* Step 05 — the Career Intelligence Report, staged as the REAL portal Reports
   screen: sidebar + topbar chrome (PortalFrame) and a full document page filling
   the canvas. Scores resolve into a readable story: a big MATCH RING draws to
   92% (the one purple accent), three strength bars fill with counting %, a fit
   sparkline draws, and the report's contents rows settle in. Authored in its
   finished frame; GSAP animates INTO it and loops. Motion is transform/opacity
   + SVG stroke-dash only. Reduced-motion holds the resting DOM. */

const R = 40
const C = 2 * Math.PI * R // ring circumference ≈ 251.33
const OFF_92 = C * (1 - 0.92) // dash offset at 92% ≈ 20.11

const BARS = [
  { label: "Analytical", pct: 88 },
  { label: "Verbal", pct: 74 },
  { label: "Spatial", pct: 61 },
]

const SECTIONS = [
  { label: "Matched paths", page: "p.04" },
  { label: "Strengths & gaps", page: "p.09" },
  { label: "Roadmap", page: "p.16" },
]

// a jagged, rising "fit over roles" trend
const SPARK = "M2,34 L28,30 L54,32 L80,23 L106,26 L132,17 L158,19 L184,11 L210,13 L238,5"

export function StepReport({ active }: { active: boolean }): JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!active) return
    const root = rootRef.current
    if (!root) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const ctx = gsap.context(() => {
      const ringNum = root.querySelector<HTMLElement>(".ring-num")
      const svals = Array.from(root.querySelectorAll<HTMLElement>(".sval"))
      const spark = root.querySelector<SVGPathElement>(".spark")
      const sparkLen = spark ? spark.getTotalLength() : 260

      const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.7, defaults: { ease: "power3.out" } })

      // (0) document header settles
      tl.from(".rp-head > *", { autoAlpha: 0, y: -8, duration: 0.4, stagger: 0.08 })

      // (1) the payoff — ring draws 0 → 92% while the number counts up
      const ringProxy = { v: 0 }
      tl.fromTo(
        ".ring-fill",
        { strokeDashoffset: C },
        { strokeDashoffset: OFF_92, duration: 0.95, ease: "power2.inOut" },
        0.15,
      )
        .to(
          ringProxy,
          {
            v: 92,
            duration: 0.95,
            ease: "power2.inOut",
            onUpdate: () => {
              if (ringNum) ringNum.textContent = Math.round(ringProxy.v) + "%"
            },
          },
          "<",
        )
        .from(".ring-cap > *", { autoAlpha: 0, x: 10, duration: 0.45, stagger: 0.07 }, "-=0.55")

      // (2) strength bars fill (scaleX from left) with their % counting
      tl.addLabel("bars", "-=0.35")
      tl.from(".sbar-label", { autoAlpha: 0, x: -6, duration: 0.4, stagger: 0.09 }, "bars")
        .fromTo(
          ".sbar-fill",
          { scaleX: 0 },
          { scaleX: 1, transformOrigin: "left center", duration: 0.75, stagger: 0.09, ease: "power2.out" },
          "bars",
        )
      svals.forEach((el, i) => {
        const to = Number(el.dataset.to) || 0
        const o = { v: 0 }
        tl.to(
          o,
          {
            v: to,
            duration: 0.7,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = Math.round(o.v) + "%"
            },
          },
          `bars+=${i * 0.09}`,
        )
      })

      // (3) fit sparkline draws left → right, then the end dot pops
      gsap.set(".spark", { strokeDasharray: sparkLen })
      tl.fromTo(
        ".spark",
        { strokeDashoffset: sparkLen },
        { strokeDashoffset: 0, duration: 0.85, ease: "power2.out" },
        "-=0.45",
      ).from(".spark-dot", { autoAlpha: 0, scale: 0, duration: 0.35, ease: "back.out(2)" }, "-=0.15")

      // (4) contents rows settle in
      tl.from(".sect-row", { autoAlpha: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.3")

      // (5) hold on the finished report, then repeatDelay resets the loop
      tl.to({}, { duration: 1.1 })
    }, rootRef)

    return () => ctx.revert()
  }, [active])

  return (
    <PortalFrame
      activeItem="Reports"
      title="Career Intelligence Report"
      chips={
        <>
          <FrameChip>PDF</FrameChip>
          <FrameChip accent>Share</FrameChip>
        </>
      }
    >
      <div ref={rootRef} className="flex h-full w-full flex-col overflow-hidden bg-paper-pure px-6 py-5">
        {/* ── document header — report identity ── */}
        <div className="rp-head flex items-center gap-3 border-b border-line pb-3">
          <span className="mono truncate text-[10px] uppercase tracking-[0.16em] text-ink-60">
            Career Intelligence Report
          </span>
          <span className="mono shrink-0 rounded-full border border-line px-2 py-0.5 text-[8.5px] uppercase tracking-[0.12em] text-ink-40">
            Final · v2
          </span>
          <span className="ml-auto hidden shrink-0 text-[10.5px] text-ink-40 sm:block">Arjun Menon · Grade 12</span>
          <span className="mono shrink-0 text-[9px] tabular-nums text-ink-40">08 Jul 2026</span>
        </div>

        {/* ── hero — match ring left, aptitude profile + fit trend right ── */}
        <div className="grid min-h-0 flex-1 content-center gap-6 py-4 md:grid-cols-[auto_1fr]">
          {/* left: the 96px match ring + top-match caption */}
          <div className="flex items-center gap-4 md:w-[176px] md:flex-col md:items-start md:gap-3">
            <div className="relative size-[96px] shrink-0">
              <svg viewBox="0 0 96 96" className="size-full -rotate-90" aria-hidden>
                <circle cx="48" cy="48" r={R} fill="none" strokeWidth="8" className="text-ink/10" stroke="currentColor" />
                <circle
                  cx="48"
                  cy="48"
                  r={R}
                  fill="none"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={C}
                  strokeDashoffset={OFF_92}
                  className="ring-fill text-growth"
                  stroke="currentColor"
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="ring-num text-[22px] font-medium leading-none tracking-tight text-ink tabular-nums">
                    92%
                  </div>
                  <div className="mono mt-1 text-[8px] uppercase tracking-[0.16em] text-ink-40">match</div>
                </div>
              </div>
            </div>
            <div className="ring-cap min-w-0">
              <div className="mono text-[9px] uppercase tracking-[0.16em] text-ink-40">Top match</div>
              <div className="mt-0.5 text-[15px] font-medium tracking-tight text-ink">Data Science</div>
              <div className="mt-1 text-[11px] leading-snug text-ink-40">3 paths within 6% · strong fit</div>
              <div className="mt-2.5 w-full space-y-1 border-t border-line-faint pt-2">
                <div className="mono flex items-center justify-between gap-3 text-[9px] text-ink-40">
                  <span className="truncate">02 · UX Research</span>
                  <span className="tabular-nums">86%</span>
                </div>
                <div className="mono flex items-center justify-between gap-3 text-[9px] text-ink-40">
                  <span className="truncate">03 · Product Analytics</span>
                  <span className="tabular-nums">84%</span>
                </div>
              </div>
            </div>
          </div>

          {/* right: strength bars + fit sparkline */}
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <span className="mono text-[9px] uppercase tracking-[0.16em] text-ink-40">Aptitude profile</span>
              <span className="mono text-[9px] tabular-nums text-ink-40">14 dimensions · top 3</span>
            </div>
            <div className="mt-3 space-y-3">
              {BARS.map((b) => (
                <div key={b.label} className="flex items-center gap-3">
                  <span className="sbar-label mono w-[64px] shrink-0 text-[10px] uppercase tracking-[0.06em] text-ink-60">
                    {b.label}
                  </span>
                  <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-ink/10">
                    <span
                      className="sbar-fill absolute inset-y-0 left-0 rounded-full bg-ink"
                      style={{ width: `${b.pct}%` }}
                    />
                  </span>
                  <span
                    className="sval mono w-[34px] shrink-0 text-right text-[10px] tabular-nums text-ink-60"
                    data-to={b.pct}
                  >
                    {b.pct}%
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[10px] border border-line bg-paper px-3.5 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="mono text-[9px] uppercase tracking-[0.14em] text-ink-40">Fit over roles</span>
                <span className="mono text-[9px] tabular-nums text-ink-40">10 roles · +18%</span>
              </div>
              <div className="relative mt-2">
                <svg viewBox="0 0 240 40" preserveAspectRatio="none" className="h-12 w-full" aria-hidden>
                  <path
                    d={SPARK}
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    className="spark text-ink"
                    stroke="currentColor"
                  />
                </svg>
                <span
                  className="spark-dot absolute size-[6px] -translate-y-1/2 translate-x-1/2 rounded-full bg-ink"
                  style={{ right: 0, top: "12%" }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── contents — the report's chapters ── */}
        <div className="border-t border-line pt-2">
          <div className="sect-row flex items-center justify-between gap-3 py-1.5">
            <span className="mono text-[9px] uppercase tracking-[0.16em] text-ink-40">In this report</span>
            <span className="mono text-[9px] tabular-nums text-ink-40">24 pages</span>
          </div>
          {SECTIONS.map((s, i) => (
            <div key={s.label} className="sect-row flex items-center gap-3 border-t border-line-faint py-2">
              <span className="mono text-[9px] tabular-nums text-ink-40">{`0${i + 1}`}</span>
              <span className="whitespace-nowrap text-[11px] font-medium text-ink">{s.label}</span>
              <span className="h-1.5 flex-1 rounded-full bg-ink/10" />
              <span className="hidden h-1.5 w-14 shrink-0 rounded-full bg-ink/10 sm:block" />
              <span className="mono shrink-0 text-[9px] tabular-nums text-ink-40">{s.page}</span>
              <span className="mono text-[11px] leading-none text-ink-40">›</span>
            </div>
          ))}
        </div>
      </div>
    </PortalFrame>
  )
}
