import { useEffect, useRef, useState, type CSSProperties } from "react"
import { DEMOS } from "@/content/demos"
import { LogoMark } from "@/components/Brand"

const R = DEMOS.report

// A mock career report that BUILDS itself when scrolled into view: blocks rise in,
// strength meters fill, fit bars draw. Pure CSS transitions (no rAF) so it resolves
// reliably. Match rows reveal their reasoning on hover (progressive disclosure).
export function ReportReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setShown(true); io.disconnect() } }, { threshold: 0.25 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  const block = (i: number): CSSProperties => ({
    opacity: shown ? 1 : 0,
    transform: shown ? "none" : "translateY(16px)",
    transition: "opacity .7s var(--ease-out), transform .7s var(--ease-out)",
    transitionDelay: `${i * 0.1}s`,
  })

  return (
    <div ref={ref} className="border border-line bg-paper-pure">
      {/* dossier header */}
      <div className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8" style={block(0)}>
        <span className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">Career Report · Sample</span>
        <LogoMark size={16} className="text-ink-40" />
      </div>
      <div className="px-6 py-7 md:px-8 md:py-9">
        <div style={block(1)}>
          <h3 className="text-[clamp(1.6rem,3vw,2.4rem)] font-light tracking-tight">{R.student.name}</h3>
          <p className="mono mt-1 text-[11px] uppercase tracking-[0.14em] text-ink-40">{R.student.grade}</p>
          <p className="mt-3 max-w-lg text-[14px] text-ink-60">{R.student.line}</p>
        </div>

        <p className="serif mt-7 max-w-xl text-[1.05rem] leading-relaxed text-ink-80" style={block(2)}>{R.summary}</p>

        {/* strengths — meters fill on reveal */}
        <div className="mt-9" style={block(3)}>
          <span className="kicker text-ink-40">Measured strengths</span>
          <div className="mt-4 grid gap-3">
            {R.strengths.map((s, i) => (
              <div key={s.label} className="grid grid-cols-[1fr_auto] items-center gap-4">
                <div className="flex items-center gap-3">
                  <span className="w-44 shrink-0 text-[13px] text-ink-80">{s.label}</span>
                  <span className="relative h-px w-full bg-line">
                    <span className="absolute inset-y-0 left-0 -top-px block h-[3px] bg-ink" style={{ width: shown ? `${s.score}%` : "0%", transition: "width 1.1s var(--ease-out)", transitionDelay: `${0.4 + i * 0.08}s` }} />
                  </span>
                </div>
                <span className="mono text-[12px] tabular-nums text-ink-60">{s.score}</span>
              </div>
            ))}
          </div>
        </div>

        {/* matches — hover to reveal the reasoning */}
        <div className="mt-9" style={block(4)}>
          <span className="kicker text-ink-40">Career matches</span>
          <div className="mt-3">
            {R.matches.map((m) => (
              <div key={m.title} tabIndex={0} className="unlock group border-t border-line py-4 outline-none last:border-b">
                <div className="grid grid-cols-[1fr_auto] items-baseline gap-4">
                  <h4 className="text-[16px] font-medium tracking-tight">{m.title}</h4>
                  <span className="mono text-[13px] tabular-nums text-ink-80">{m.fit}% fit</span>
                </div>
                <span className="mt-2 block h-px w-full bg-line">
                  <span className="block h-[2px] bg-ink" style={{ width: shown ? `${m.fit}%` : "0%", transition: "width 1s var(--ease-out)", transitionDelay: "0.6s" }} />
                </span>
                <div className="more"><span className="text-[13px] leading-relaxed text-ink-60">{m.why}</span></div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-9 border-l-2 border-ink pl-4 text-[14.5px] italic leading-relaxed text-ink-80" style={block(5)}>{R.prediction}</p>
      </div>
    </div>
  )
}
