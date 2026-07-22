import { useEffect, useRef, useState, type CSSProperties } from "react"

// Monochrome line diagrams — the framework, drawn instead of described (Prägnanz:
// minimal geometry). CSS-transition draw-in on IntersectionObserver; with reduced
// motion or no IO the diagram simply renders complete.

function useDrawn() {
  const ref = useRef<SVGSVGElement>(null)
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setDrawn(true); return }
    const el = ref.current
    if (!el) { setDrawn(true); return }
    // already in view on mount → draw immediately
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) { setDrawn(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setDrawn(true); io.disconnect() } }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" })
    io.observe(el)
    // safety net: a diagram must NEVER stay invisible if the observer never fires
    // (fast scroll, tiny viewport, threshold never crossed)
    const t = window.setTimeout(() => setDrawn(true), 2500)
    return () => { io.disconnect(); window.clearTimeout(t) }
  }, [])
  return { ref, drawn }
}

const line = (drawn: boolean, len: number, delay = 0): CSSProperties => ({
  strokeDasharray: len, strokeDashoffset: drawn ? 0 : len,
  transition: `stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
})
const fade = (drawn: boolean, delay = 0): CSSProperties => ({
  opacity: drawn ? 1 : 0, transition: `opacity 0.5s ease ${delay}s`,
})

/* ── the decision model as a mind map: four measured factors converge on Fit ── */
export function FactorMap({ className = "" }: { className?: string }) {
  const { ref, drawn } = useDrawn()
  const nodes = [
    { x: 130, y: 70, name: "Aptitude", sub: "Aptitude battery" },
    { x: 570, y: 70, name: "Interest", sub: "RIASEC inventory" },
    { x: 130, y: 330, name: "Personality", sub: "Big Five" },
    { x: 570, y: 330, name: "Market reality", sub: "Labour-market data" },
  ]
  return (
    <svg ref={ref} viewBox="0 0 700 400" className={className} role="img" aria-label="Four measured factors — aptitude, interest, personality and market reality — converge on one ranked shortlist">
      {nodes.map((n, i) => (
        <line key={`l${i}`} x1={n.x} y1={n.y} x2={350} y2={200} stroke="var(--color-ink-20)" strokeWidth="1.2" style={line(drawn, 300, 0.15 + i * 0.12)} />
      ))}
      {nodes.map((n, i) => (
        <g key={n.name} style={fade(drawn, 0.25 + i * 0.12)}>
          <circle cx={n.x} cy={n.y} r="7" fill="var(--color-paper-pure)" stroke="var(--color-ink)" strokeWidth="1.4" />
          <text x={n.x} y={n.y + (n.y < 200 ? -30 : 34)} textAnchor="middle" fontSize="16" fontWeight="500" fill="var(--color-ink)">{n.name}</text>
          <text x={n.x} y={n.y + (n.y < 200 ? -12 : 52)} textAnchor="middle" className="mono" fontSize="10.5" letterSpacing="1" fill="var(--color-ink-40)">{n.sub.toUpperCase()}</text>
        </g>
      ))}
      <g style={fade(drawn, 0.75)}>
        <circle cx="350" cy="200" r="46" fill="var(--color-paper-pure)" stroke="var(--color-ink)" strokeWidth="1.6" />
        <text x="350" y="196" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--color-ink)">Fit</text>
        <text x="350" y="214" textAnchor="middle" className="mono" fontSize="9.5" letterSpacing="1" fill="var(--color-ink-40)">WHERE ALL FOUR AGREE</text>
      </g>
      <g style={fade(drawn, 0.95)}>
        <line x1="350" y1="246" x2="350" y2="290" stroke="var(--color-ink)" strokeWidth="1.4" style={line(drawn, 44, 0.95)} />
        <path d="M350 296 l-5 -9 h10 Z" fill="var(--color-ink)" />
        <text x="350" y="320" textAnchor="middle" fontSize="13.5" fontWeight="500" fill="var(--color-ink)">A ranked shortlist, reasoning shown</text>
        <text x="350" y="338" textAnchor="middle" className="mono" fontSize="10" letterSpacing="1" fill="var(--color-ink-40)">READ, EDITED AND OWNED BY A CERTIFIED COUNSELLOR</text>
      </g>
    </svg>
  )
}

/* ── the five-step method as a flow ── */
export function MethodFlow({ steps, className = "" }: { steps: { no: string; title: string }[]; className?: string }) {
  const { ref, drawn } = useDrawn()
  const W = 700, y = 60, pad = 60
  const gap = (W - pad * 2) / (steps.length - 1)
  return (
    <svg ref={ref} viewBox={`0 0 ${W} 120`} className={className} role="img" aria-label={`The method: ${steps.map((s) => s.title).join(" → ")}`}>
      {steps.slice(0, -1).map((_, i) => (
        <g key={i}>
          <line x1={pad + gap * i + 16} y1={y} x2={pad + gap * (i + 1) - 22} y2={y} stroke="var(--color-ink-20)" strokeWidth="1.2" style={line(drawn, gap, 0.1 + i * 0.14)} />
          <path d={`M${pad + gap * (i + 1) - 16} ${y} l-8 -4.5 v9 Z`} fill="var(--color-ink-20)" style={fade(drawn, 0.28 + i * 0.14)} />
        </g>
      ))}
      {steps.map((s, i) => (
        <g key={s.no} style={fade(drawn, 0.12 + i * 0.14)}>
          <circle cx={pad + gap * i} cy={y} r="15" fill="var(--color-paper-pure)" stroke="var(--color-ink)" strokeWidth="1.4" />
          <text x={pad + gap * i} y={y + 4} textAnchor="middle" className="mono" fontSize="10.5" fill="var(--color-ink)">{s.no}</text>
          <text x={pad + gap * i} y={y + 40} textAnchor="middle" fontSize="13" fontWeight="500" fill="var(--color-ink)">{s.title}</text>
        </g>
      ))}
    </svg>
  )
}

/* ── the method as a vertical mind-map: a numbered spine with branching,
   underlined sub-activities. Hovering a step focuses it. (Editorial process
   diagram, drawn in on scroll.) ── */
export function ProcessLadder({ steps, className = "" }: {
  steps: { no: string; title: string; caption: string; branches: string[] }[]; className?: string
}) {
  const { ref, drawn } = useDrawn()
  const [hi, setHi] = useState<number | null>(null)
  const x0 = 108, top = 82, gap = 150
  const H = top + (steps.length - 1) * gap + 82
  return (
    <svg ref={ref} viewBox={`0 0 700 ${H}`} className={className} role="img" aria-label={`The method as a process: ${steps.map((s) => s.title).join(" → ")}`}>
      <line x1={x0} y1={top} x2={x0} y2={top + (steps.length - 1) * gap} stroke="var(--color-ink-20)" strokeWidth="1.2" style={line(drawn, (steps.length - 1) * gap, 0.1)} />
      {steps.map((s, i) => {
        const y = top + i * gap
        const on = hi === null || hi === i
        return (
          <g key={s.no} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ opacity: on ? 1 : 0.3, transition: "opacity 0.3s" }}>
            <line x1={20} y1={y} x2={680} y2={y} stroke="var(--color-ink)" strokeWidth="0.75" strokeDasharray="2 6" opacity="0.18" style={fade(drawn, 0.15 + i * 0.1)} />
            <text x={34} y={y + 4} className="mono" fontSize="13" fill="var(--color-ink-40)" style={fade(drawn, 0.2 + i * 0.1)}>{s.no}</text>
            <circle cx={x0} cy={y} r="16" fill={i % 2 === 0 ? "var(--color-ink)" : "var(--color-paper-pure)"} stroke="var(--color-ink)" strokeWidth="1.4" style={fade(drawn, 0.25 + i * 0.1)} />
            <g style={fade(drawn, 0.3 + i * 0.1)}>
              <text x={x0 + 30} y={y - 2} fontSize="17" fontWeight="500" fill="var(--color-ink)">{s.title}</text>
              <text x={x0 + 30} y={y + 16} className="mono" fontSize="9.5" letterSpacing="0.5" fill="var(--color-ink-40)">{s.caption.toUpperCase()}</text>
            </g>
            <line x1={248} y1={y} x2={330} y2={y} stroke="var(--color-ink-20)" strokeWidth="1" style={fade(drawn, 0.38 + i * 0.1)} />
            {s.branches.map((b, j) => {
              const by = y - (s.branches.length - 1) * 13 + j * 26
              return (
                <g key={b} style={fade(drawn, 0.42 + i * 0.1 + j * 0.06)}>
                  <line x1={330} y1={y} x2={366} y2={by} stroke="var(--color-ink-20)" strokeWidth="1" />
                  <text x={374} y={by + 4} fontSize="12.5" fill="var(--color-ink-80)" style={{ textDecoration: "underline", textUnderlineOffset: "3px" }}>{b}</text>
                </g>
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}

/* ── the decision model as an overlap: three measured circles converge on Fit,
   framed by market reality. Hover a circle to weigh it. ── */
export function OverlapVenn({ className = "" }: { className?: string }) {
  const { ref, drawn } = useDrawn()
  const [hi, setHi] = useState<number | null>(null)
  const r = 108, circ = 2 * Math.PI * r
  const circles = [
    { name: "Aptitude", instr: "Aptitude battery", cx: 288, cy: 185, lx: 196, ly: 96 },
    { name: "Interest", instr: "RIASEC inventory", cx: 412, cy: 185, lx: 504, ly: 96 },
    { name: "Personality", instr: "Big Five", cx: 350, cy: 288, lx: 350, ly: 418 },
  ]
  return (
    <svg ref={ref} viewBox="0 0 700 440" className={className} role="img" aria-label="Aptitude, interest and personality overlap; where all three agree — grounded in market reality — is Fit">
      <circle cx="350" cy="222" r="202" fill="none" stroke="var(--color-ink)" strokeWidth="1.1" strokeDasharray="3 7" opacity="0.3" style={fade(drawn, 0.1)} />
      <text x="350" y="34" textAnchor="middle" className="mono" fontSize="9.5" letterSpacing="1.5" fill="var(--color-ink-40)" style={fade(drawn, 0.2)}>· GROUNDED IN MARKET REALITY ·</text>
      {circles.map((c, i) => {
        const on = hi === null || hi === i
        return (
          <circle key={c.name} cx={c.cx} cy={c.cy} r={r} fill={hi === i ? "rgba(11,11,11,0.05)" : "none"} stroke="var(--color-ink)" strokeWidth="1.3"
            onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)}
            style={{ ...line(drawn, circ, 0.2 + i * 0.18), opacity: on ? 1 : 0.4, transition: "stroke-dashoffset 0.9s cubic-bezier(0.16,1,0.3,1), opacity 0.3s, fill 0.3s" }} />
        )
      })}
      <g style={fade(drawn, 0.9)}>
        <circle cx="350" cy="222" r="6" fill="var(--color-ink)" />
        <text x="350" y="204" textAnchor="middle" fontSize="15" fontWeight="600" fill="var(--color-ink)">Fit</text>
      </g>
      {circles.map((c, i) => (
        <g key={`l${i}`} style={fade(drawn, 0.5 + i * 0.15)}>
          <text x={c.lx} y={c.ly} textAnchor="middle" fontSize="15" fontWeight="500" fill="var(--color-ink)">{c.name}</text>
          <text x={c.lx} y={c.ly + 16} textAnchor="middle" className="mono" fontSize="9" letterSpacing="1" fill="var(--color-ink-40)">{c.instr.toUpperCase()}</text>
        </g>
      ))}
    </svg>
  )
}

/* ── the diverging fan: from one measured person, four readings that point one
   way (the "true north" metaphor, made geometric). Hover a reading to isolate. ── */
export function DecisionFan({ className = "" }: { className?: string }) {
  const { ref, drawn } = useDrawn()
  const [hi, setHi] = useState<number | null>(null)
  const hub = { x: 556, y: 230 }
  const spokes = [
    { no: "01", name: "Aptitude", note: "What you can do well" },
    { no: "02", name: "Interest", note: "What genuinely pulls you" },
    { no: "03", name: "Personality", note: "How you actually work" },
    { no: "04", name: "Market reality", note: "Where the work is going" },
  ]
  return (
    <svg ref={ref} viewBox="0 0 700 450" className={className} role="img" aria-label="From one measured person, four readings that point one direction">
      {spokes.map((s, i) => {
        const ey = 82 + i * 96
        const on = hi === null || hi === i
        const len = Math.hypot(hub.x - 152, hub.y - ey) // exact spoke length so the draw-in aligns
        return (
          <g key={s.no} onMouseEnter={() => setHi(i)} onMouseLeave={() => setHi(null)} style={{ opacity: on ? 1 : 0.34, transition: "opacity 0.3s" }}>
            <line x1={hub.x} y1={hub.y} x2={152} y2={ey} stroke="var(--color-ink-20)" strokeWidth="1.1" style={line(drawn, len, 0.2 + i * 0.12)} />
            <circle cx={152} cy={ey} r="4" fill="var(--color-ink)" style={fade(drawn, 0.5 + i * 0.12)} />
            <g style={fade(drawn, 0.55 + i * 0.12)}>
              <text x={64} y={ey - 4} className="mono" fontSize="11" fill="var(--color-ink-40)">{s.no}</text>
              <text x={64} y={ey + 13} fontSize="14.5" fontWeight="500" fill="var(--color-ink)">{s.name}</text>
              <text x={64} y={ey + 30} fontSize="11.5" fill="var(--color-ink-60)">{s.note}</text>
            </g>
          </g>
        )
      })}
      <g style={fade(drawn, 0.35)}>
        <circle cx={hub.x} cy={hub.y} r="34" fill="var(--color-ink)" />
        <text x={hub.x} y={hub.y - 3} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--color-paper)">You,</text>
        <text x={hub.x} y={hub.y + 13} textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--color-paper)">measured</text>
      </g>
      <text x={hub.x} y={hub.y + 60} textAnchor="middle" className="mono" fontSize="9.5" letterSpacing="1" fill="var(--color-ink-40)" style={fade(drawn, 0.8)}>ONE DIRECTION, NOT A GUESS</text>
    </svg>
  )
}

/* ── the CRI path — three steps from answers to a named next step ── */
export function CriPath({ className = "" }: { className?: string }) {
  const { ref, drawn } = useDrawn()
  const stops = [
    { x: 110, t: "Honest answers", s: "10–20 MINUTES" },
    { x: 350, t: "Scored factor by factor", s: "THE DOCUMENTED SCORING KEY" },
    { x: 590, t: "A named next step", s: "MATCHED TO YOUR GAP" },
  ]
  return (
    <svg ref={ref} viewBox="0 0 700 110" className={className} role="img" aria-label="How the index works: your answers are scored factor by factor and end in a named next step">
      {stops.slice(0, -1).map((s, i) => (
        <g key={i}>
          <line x1={s.x + 18} y1={45} x2={stops[i + 1].x - 24} y2={45} stroke="var(--color-ink-20)" strokeWidth="1.2" style={line(drawn, 220, 0.15 + i * 0.2)} />
          <path d={`M${stops[i + 1].x - 18} 45 l-8 -4.5 v9 Z`} fill="var(--color-ink-20)" style={fade(drawn, 0.35 + i * 0.2)} />
        </g>
      ))}
      {stops.map((s, i) => (
        <g key={s.t} style={fade(drawn, 0.1 + i * 0.2)}>
          <circle cx={s.x} cy={45} r="6.5" fill="var(--color-ink)" />
          <text x={s.x} y={80} textAnchor="middle" fontSize="13.5" fontWeight="500" fill="var(--color-ink)">{s.t}</text>
          <text x={s.x} y={98} textAnchor="middle" className="mono" fontSize="9.5" letterSpacing="1" fill="var(--color-ink-40)">{s.s}</text>
        </g>
      ))}
    </svg>
  )
}
