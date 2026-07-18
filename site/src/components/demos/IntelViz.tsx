import { DEMOS } from "@/content/demos"

// Career Intelligence, made visible. A rotating 3D ring of bars (CSS 3D, no WebGL)
// where each blade is a fast-growing field sized by its projected growth; alongside,
// the headline magnitudes and a sourced legend. Every figure is real and cited —
// hover a row to see where it comes from.
const pct = DEMOS.market.filter((m) => m.unit === "%")
const big = DEMOS.market.filter((m) => m.unit !== "%")
const maxPct = Math.max(...pct.map((m) => m.value))

export function IntelViz() {
  return (
    <div className="grid gap-14 md:grid-cols-2 md:items-center">
      {/* the 3D ring */}
      <div className="relative mx-auto h-[360px] w-full max-w-[440px]" style={{ perspective: "1100px" }}>
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", transform: "rotateX(-16deg)" }}>
          {/* floor ring */}
          <span className="absolute left-1/2 top-1/2 rounded-full border border-paper/15" style={{ width: 320, height: 320, transform: "translate(-50%,-50%) rotateX(90deg)" }} />
          <div className="ring-spin absolute left-1/2 top-1/2" style={{ transformStyle: "preserve-3d" }}>
            {pct.map((m, i) => {
              const ang = (i / pct.length) * 360
              const h = 30 + (m.value / maxPct) * 150
              return (
                <span key={m.label} className="absolute left-0 top-0 block w-[7px] bg-paper" style={{ height: `${h}px`, opacity: 0.9, transform: `rotateY(${ang}deg) translateZ(160px) translateY(${-h / 2}px) translateX(-3.5px)` }} />
              )
            })}
          </div>
        </div>
        <p className="mono absolute inset-x-0 bottom-0 text-center text-[10px] uppercase tracking-[0.16em] text-paper/40">Projected role growth · live sources</p>
      </div>

      {/* the facts */}
      <div>
        <div className="grid grid-cols-2 gap-8 border-b border-paper/15 pb-8">
          {big.map((m) => (
            <div key={m.label}>
              <div className="display !text-[clamp(2.2rem,5.5vw,3.6rem)] font-extralight leading-none tabular-nums text-paper">
                {m.value}<span className="ml-1 align-top text-[0.4em] text-paper/45">{m.unit}</span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-paper">{m.label}</p>
              <p className="mt-0.5 text-[11.5px] leading-snug text-paper/45">{m.metric}</p>
              <p className="mono mt-1 text-[10px] uppercase tracking-[0.12em] text-paper/35">{m.source}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <span className="kicker text-paper/40">Fastest-growing fields</span>
          <div className="mt-3">
            {pct.map((m) => (
              <div key={m.label} tabIndex={0} className="unlock group grid grid-cols-[1fr_auto] items-baseline gap-4 border-t border-paper/12 py-2.5 outline-none last:border-b">
                <div>
                  <span className="text-[13.5px] text-paper/90">{m.label}</span>
                  <div className="more"><span className="mono text-[10px] uppercase tracking-[0.12em] text-paper/45">{m.metric} · {m.source}</span></div>
                </div>
                <span className="mono text-[13px] tabular-nums text-paper">+{m.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
