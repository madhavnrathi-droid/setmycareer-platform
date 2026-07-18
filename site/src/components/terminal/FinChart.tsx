import { useEffect, useId, useState } from "react"
import { slopeStops } from "@/components/terminal/parts"

// A dense, interactive finance chart — the stock-terminal read. Gridlines + axes,
// an optional lo/hi band (the pay range), a "price" line, a right-edge value tag,
// and a pointer crosshair with a tooltip that snaps to the nearest point. Works
// with pointer + touch. `hue` colours the line/area by trajectory (purple/red/
// blue); `baseline` draws the starting-level reference; `projection` appends a
// dashed forward segment (the 2030 outlook). Monochrome unless `hue` is given.

export interface Band { lo: number; hi: number; mid: number }
export type TipContent = { title: string; rows: [string, string][] }

export function FinChart({
  bands, line, projection, xLabels, yUnit = "", tag, height = 300, tooltip, ariaLabel, dark = false, hue, baseline = false,
}: {
  bands?: Band[]
  line?: number[]
  projection?: number[] // dashed continuation after `line` (forward outlook)
  xLabels: string[] // must cover line + projection points
  yUnit?: string
  tag?: string
  height?: number
  tooltip: (i: number) => TipContent
  ariaLabel: string
  dark?: boolean
  hue?: string
  baseline?: boolean
}) {
  const [hover, setHover] = useState<number | null>(null)
  const gid = useId()
  const solid = bands ? bands.map((b) => b.mid) : (line ?? [])
  const proj = projection ?? []
  const allMid = [...solid, ...proj]
  const n = xLabels.length
  // the data changes when the range chip flips or the user navigates to another
  // instrument (same FinChart instance, no key) — clear any stale hover so a
  // now-out-of-range index can't render a phantom crosshair or "undefined" tip
  const sig = allMid.join(",")
  useEffect(() => { setHover(null) }, [sig])
  // guard every read of hover against the current point count (belt + braces
  // for the one render before the effect above commits)
  const hv = hover != null && hover < n ? hover : null
  const vals = bands ? bands.flatMap((b) => [b.lo, b.hi]) : allMid
  const maxV = Math.max(...vals) * 1.06
  const minV = bands ? 0 : Math.min(...vals) * 0.92
  const W = 760, H = height, padL = 46, padR = 52, padT = 16, padB = 28
  const iw = W - padL - padR, ih = H - padT - padB
  const x = (i: number) => padL + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v: number) => padT + (1 - (v - minV) / (maxV - minV || 1)) * ih
  const ink = dark ? "var(--color-paper)" : "var(--color-ink)"
  const stroke = hue || ink
  const linePath = solid.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ")
  const areaPath = bands
    ? [...bands.map((b, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(b.hi).toFixed(1)}`), ...[...bands].reverse().map((b, k) => `L${x(n - 1 - proj.length - k).toFixed(1)} ${y(b.lo).toFixed(1)}`), "Z"].join(" ")
    : (() => {
        // fill to the chart floor (a conventional area chart); the starting
        // level is shown separately as the dashed baseline reference. Filling to
        // solid[0] would straddle the reference for rise-then-fall series and
        // muddy the read.
        const base = y(minV)
        return `${linePath} L${x(solid.length - 1).toFixed(1)} ${base.toFixed(1)} L${x(0).toFixed(1)} ${base.toFixed(1)} Z`
      })()
  // dashed projection: connect from the last solid point through the forward pts
  const projPath = proj.length
    ? [`M${x(solid.length - 1).toFixed(1)} ${y(solid[solid.length - 1]).toFixed(1)}`, ...proj.map((v, k) => `L${x(solid.length + k).toFixed(1)} ${y(v).toFixed(1)}`)].join(" ")
    : ""
  // the line flows through trajectory hues by its own slope (purple up / red
  // down / blue flat) — only in line-mode; the pay ladder (bands) stays ink
  const grad = !bands && solid.length > 1 ? slopeStops(solid) : null
  const ticks = 4
  const tickVals = Array.from({ length: ticks + 1 }, (_, k) => minV + (k / ticks) * (maxV - minV))
  // min / max markers on the historical (solid) series
  const sMin = solid.length ? solid.indexOf(Math.min(...solid)) : -1
  const sMax = solid.length ? solid.indexOf(Math.max(...solid)) : -1

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = 0, bd = Infinity
    for (let i = 0; i < n; i++) { const d = Math.abs(x(i) - px); if (d < bd) { bd = d; best = i } }
    setHover(best)
  }

  const tip = hv != null ? tooltip(hv) : null
  const tipPct = hv != null ? (x(hv) / W) * 100 : 0
  const lastY = y(allMid[allMid.length - 1])
  const nowX = x(solid.length - 1)

  return (
    <div className="relative select-none">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label={ariaLabel} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={bands ? 0.12 : 0.16} />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
          {grad && (
            <linearGradient id={`l-${gid}`} gradientUnits="userSpaceOnUse" x1={x(0)} y1="0" x2={x(solid.length - 1)} y2="0">
              {grad.stops.map((s, i) => <stop key={i} offset={`${s.off}%`} stopColor={s.color} stopOpacity={s.op} />)}
            </linearGradient>
          )}
        </defs>
        {/* gridlines + Y labels */}
        {tickVals.map((tv, k) => (
          <g key={k}>
            <line x1={padL} y1={y(tv)} x2={W - padR} y2={y(tv)} stroke={ink} strokeWidth="0.5" opacity="0.08" />
            <text x={padL - 8} y={y(tv) + 3} textAnchor="end" className="mono" fontSize="9" fill={ink} opacity="0.45">{Math.round(tv)}{yUnit}</text>
          </g>
        ))}
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke={ink} strokeWidth="0.75" opacity="0.22" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke={ink} strokeWidth="0.75" opacity="0.22" />
        {/* starting-level baseline reference */}
        {baseline && !bands && <line x1={padL} y1={y(solid[0])} x2={W - padR} y2={y(solid[0])} stroke={ink} strokeWidth="0.75" strokeDasharray="3 3" opacity="0.3" />}
        {/* area (gradient) */}
        <path d={areaPath} fill={`url(#g-${gid})`} />
        {/* now / projection divider */}
        {proj.length > 0 && (
          <>
            <rect x={nowX} y={padT} width={W - padR - nowX} height={ih} fill={stroke} opacity="0.04" />
            <line x1={nowX} y1={padT} x2={nowX} y2={H - padB} stroke={ink} strokeWidth="0.5" strokeDasharray="2 3" opacity="0.35" />
          </>
        )}
        {/* solid line — slope-coloured gradient in line-mode */}
        <path d={linePath} fill="none" stroke={grad ? `url(#l-${gid})` : stroke} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
        {/* dashed projection */}
        {projPath && <path d={projPath} fill="none" stroke={stroke} strokeWidth="1.6" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" opacity="0.7" />}
        {/* min / max ticks on the historical series */}
        {sMin >= 0 && <circle cx={x(sMin)} cy={y(solid[sMin])} r="2.4" fill="none" stroke={stroke} strokeWidth="1" opacity="0.6" />}
        {sMax >= 0 && sMax !== sMin && <circle cx={x(sMax)} cy={y(solid[sMax])} r="2.4" fill="none" stroke={stroke} strokeWidth="1" opacity="0.6" />}
        {/* points */}
        {solid.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hv === i ? 4 : 2.1} fill={stroke} style={{ transition: "r 0.15s" }} />)}
        {proj.map((v, k) => <circle key={`p${k}`} cx={x(solid.length + k)} cy={y(v)} r={hv === solid.length + k ? 4 : 2} fill="none" stroke={stroke} strokeWidth="1.2" style={{ transition: "r 0.15s" }} />)}
        {/* right-edge value tag (the "current price") */}
        {tag && (
          <g>
            <line x1={x(n - 1)} y1={lastY} x2={W - padR + 2} y2={lastY} stroke={stroke} strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
            <rect x={W - padR + 2} y={lastY - 9} width={padR - 4} height="18" fill={stroke} />
            <text x={W - padR / 2} y={lastY + 4} textAnchor="middle" className="mono" fontSize="10" fontWeight="600" fill={dark ? "var(--color-ink)" : "var(--color-paper)"}>{tag}</text>
          </g>
        )}
        {/* X labels */}
        {xLabels.map((lb, i) => lb && <text key={i} x={x(i)} y={H - 9} textAnchor="middle" className="mono" fontSize="9.5" fill={ink} opacity="0.45">{lb}</text>)}
        {/* crosshair */}
        {hv != null && (
          <>
            <line x1={x(hv)} y1={padT} x2={x(hv)} y2={H - padB} stroke={ink} strokeWidth="1" opacity="0.4" />
            {bands && hv < bands.length && <><circle cx={x(hv)} cy={y(bands[hv].hi)} r="2.6" fill={ink} /><circle cx={x(hv)} cy={y(bands[hv].lo)} r="2.6" fill={ink} /></>}
          </>
        )}
      </svg>
      {tip && (
        <div className={`pointer-events-none absolute top-1 z-10 -translate-x-1/2 border px-3 py-2 ${dark ? "border-paper/40 bg-ink text-paper" : "border-ink bg-paper-pure"}`}
          style={{ left: `${Math.min(Math.max(tipPct, 13), 82)}%`, boxShadow: "0 10px 26px -14px rgba(11,11,11,0.45)" }}>
          <div className="mono text-[9.5px] uppercase tracking-[0.1em] opacity-50">{tip.title}</div>
          {tip.rows.map(([k, v]) => (
            <div key={k} className="mt-0.5 flex items-baseline justify-between gap-5 text-[12px]"><span className="opacity-60">{k}</span><span className="mono font-medium tabular-nums">{v}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}
