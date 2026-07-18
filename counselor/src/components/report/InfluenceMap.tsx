import { useId } from "react"
import { useGsap, gsap, EASE, DUR } from "@/lib/gsap"

/* ── InfluenceMap ─────────────────────────────────────────────────────────────
   A RELATIONSHIP & INFLUENCE MAP: the person at the centre, with the forces
   around them placed on concentric "proximity" orbits — the STRONGER the
   influence, the CLOSER it sits and the heavier its connecting thread. Nodes are
   tone-coded by kind (support = well/green, strain = warn/amber, opportunity =
   brand/blue). Reads as a personal orbit chart, not a generic network graph.

   Report visual language: ink-scale orbits, semantic tones for data only, a soft
   radial centre, hairline edges weighted by strength, GSAP draw of orbits + edges
   then a settle of the nodes, reduced-motion safe, responsive viewBox, print-ok. */

export type InfluenceKind = "support" | "strain" | "opportunity"

export interface InfluenceNode {
  label: string
  strength: number // 0–100
  kind: InfluenceKind
}

const W = 640
const H = 460
const CX = W / 2
const CY = H / 2
const R_INNER = 60 // strength 100 → this radius (closest)
const R_OUTER = 196 // strength 0 → this radius (farthest)

const TONE: Record<InfluenceKind, { stroke: string; soft: string; label: string }> = {
  support: { stroke: "var(--color-well-600)", soft: "var(--color-well-100)", label: "Support" },
  strain: { stroke: "var(--color-warn-600)", soft: "var(--color-warn-100)", label: "Strain" },
  opportunity: { stroke: "var(--color-brand-500)", soft: "var(--color-brand-100)", label: "Opportunity" },
}

export function InfluenceMap({
  centerName,
  nodes,
}: {
  centerName: string
  nodes: InfluenceNode[]
}) {
  const uid = useId().replace(/[:]/g, "")

  const ref = useGsap<HTMLDivElement>((scope) => {
    const orbits = scope.querySelectorAll<SVGCircleElement>("[data-orbit]")
    const edges = scope.querySelectorAll<SVGLineElement>("[data-edge]")
    const nodeEls = scope.querySelectorAll<SVGGElement>("[data-node]")
    const core = scope.querySelector<SVGGElement>("[data-core]")
    const tl = gsap.timeline()
    if (orbits.length) tl.from(orbits, { opacity: 0, scale: 0.8, transformOrigin: "center", duration: DUR.enter, ease: EASE.soft, stagger: 0.06 })
    if (core) tl.from(core, { opacity: 0, scale: 0.6, transformOrigin: "center", duration: DUR.enter, ease: EASE.soft }, "-=0.3")
    edges.forEach((e) => {
      const len = e.getTotalLength?.() ?? 200
      tl.fromTo(e, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 0.6, ease: EASE.quart }, "<+=0.04")
    })
    if (nodeEls.length) tl.from(nodeEls, { opacity: 0, scale: 0.5, transformOrigin: "center", duration: DUR.enter, ease: EASE.soft, stagger: 0.05 }, "-=0.4")
  }, [nodes.length, centerName])

  if (!nodes?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-canvas px-6 py-12 text-center text-[13px] text-ink-400">
        The influence map appears once the people and forces around {centerName || "the client"} are mapped.
      </div>
    )
  }

  // place nodes around the circle; distribute evenly by angle (slightly rotated so
  // the first node isn't dead-top), radius inversely proportional to strength.
  const placed = nodes.map((node, i) => {
    const s = Math.max(0, Math.min(100, node.strength))
    const radius = R_OUTER - ((R_OUTER - R_INNER) * s) / 100
    const angle = (-Math.PI / 2) + (i / nodes.length) * Math.PI * 2 + 0.18
    const x = CX + Math.cos(angle) * radius
    const y = CY + Math.sin(angle) * radius
    const nodeR = 5 + (s / 100) * 6
    return { ...node, s, x, y, nodeR, tone: TONE[node.kind] }
  })

  // legend: only kinds actually present
  const present = (["support", "opportunity", "strain"] as InfluenceKind[]).filter((k) =>
    nodes.some((n) => n.kind === k),
  )

  const initials = centerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <figure ref={ref} className="w-full" aria-label={`Influence map for ${centerName}: ${nodes.length} surrounding forces placed by strength.`}>
      <div className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-canvas via-card to-ink-050/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img">
          <defs>
            <radialGradient id={`core-${uid}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.18} />
              <stop offset="70%" stopColor="var(--color-brand-500)" stopOpacity={0.05} />
              <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* concentric proximity orbits (closer ring = stronger influence) */}
          {[R_INNER + 24, (R_INNER + R_OUTER) / 2, R_OUTER].map((r, i) => (
            <circle
              key={i}
              data-orbit
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              stroke="var(--color-ink-200)"
              strokeOpacity={0.6 - i * 0.14}
              strokeWidth={1}
              strokeDasharray="1 5"
            />
          ))}

          {/* weighted edges centre → node (heavier/closer = stronger) */}
          {placed.map((p, i) => (
            <line
              key={`e-${i}`}
              data-edge
              x1={CX}
              y1={CY}
              x2={p.x}
              y2={p.y}
              stroke={p.tone.stroke}
              strokeOpacity={0.18 + (p.s / 100) * 0.42}
              strokeWidth={0.75 + (p.s / 100) * 2}
              strokeLinecap="round"
            />
          ))}

          {/* the person at the centre */}
          <g data-core>
            <circle cx={CX} cy={CY} r={64} fill={`url(#core-${uid})`} />
            <circle cx={CX} cy={CY} r={26} fill="var(--color-card)" stroke="var(--color-brand-500)" strokeWidth={1.5} />
            <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" className="fill-brand-600 font-display font-medium" fontSize={15}>
              {initials || "•"}
            </text>
            <text x={CX} y={CY + 42} textAnchor="middle" className="fill-ink-500" fontSize={9} fontWeight={600} letterSpacing="0.1em">
              {centerName.toUpperCase()}
            </text>
          </g>

          {/* surrounding forces */}
          {placed.map((p, i) => {
            const labelRight = p.x >= CX
            return (
              <g key={`n-${i}`} data-node>
                <circle cx={p.x} cy={p.y} r={p.nodeR + 4} fill={p.tone.soft} opacity={0.7} />
                <circle cx={p.x} cy={p.y} r={p.nodeR} fill="var(--color-card)" stroke={p.tone.stroke} strokeWidth={1.5} />
                <circle cx={p.x} cy={p.y} r={p.nodeR * 0.4} fill={p.tone.stroke} />
                <text
                  x={labelRight ? p.x + p.nodeR + 7 : p.x - p.nodeR - 7}
                  y={p.y - 1}
                  textAnchor={labelRight ? "start" : "end"}
                  className="fill-ink-700 font-medium"
                  fontSize={10.5}
                >
                  {p.label}
                </text>
                <text
                  x={labelRight ? p.x + p.nodeR + 7 : p.x - p.nodeR - 7}
                  y={p.y + 10}
                  textAnchor={labelRight ? "start" : "end"}
                  className="fill-ink-300 tabular-nums"
                  fontSize={8.5}
                >
                  {p.s}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1 text-[10.5px] text-ink-400">
        {present.map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: TONE[k].stroke }} aria-hidden />
            {TONE[k].label}
          </span>
        ))}
        <span className="ml-auto text-ink-300">Closer = stronger influence</span>
      </figcaption>
    </figure>
  )
}
