// SVG figure assets for the Ability battery (MA mechanical diagrams + the SA
// figure renderer). Every MA drawing is rebuilt as clean line art from the
// booklet extraction's imageDesc — verbatim geometry where the description was
// unambiguous. Items whose descriptions carried a CAUTION (MA 5 levers, MA 12
// treadle, MA 23 mirror figure) get an AssetPlaceholder panel instead: the item
// is still presented in booklet order, but the founder must supply the original
// art (see scratchpad ASSET-LIST.md).
//
// Conventions: stroke = currentColor so figures follow the theme; grey shading
// via fill-opacity; labels in the app's mono size. viewBoxes vary per figure.

import type { SpatialShapeDef, SpatialMarker } from "./ability-bank"

const S = "currentColor"
const lbl = { fontFamily: "ui-monospace, monospace", fontSize: 11, fill: S } as const
const lblB = { ...lbl, fontSize: 13, fontWeight: 700 } as const

function Arrow({ x1, y1, x2, y2, w = 1.8 }: { x1: number; y1: number; x2: number; y2: number; w?: number }) {
  const a = Math.atan2(y2 - y1, x2 - x1)
  const h = 6
  return (
    <g stroke={S} strokeWidth={w} fill={S}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polygon
        points={`${x2},${y2} ${x2 - h * Math.cos(a - 0.45)},${y2 - h * Math.sin(a - 0.45)} ${x2 - h * Math.cos(a + 0.45)},${y2 - h * Math.sin(a + 0.45)}`}
        strokeWidth={0.5}
      />
    </g>
  )
}

/** curved rotation arrow around (cx,cy) between two angles (deg), arrowhead at the end */
function ArcArrow({ cx, cy, r, from, to, w = 1.8 }: { cx: number; cy: number; r: number; from: number; to: number; w?: number }) {
  const rad = (d: number) => (d * Math.PI) / 180
  const x1 = cx + r * Math.cos(rad(from)), y1 = cy + r * Math.sin(rad(from))
  const x2 = cx + r * Math.cos(rad(to)), y2 = cy + r * Math.sin(rad(to))
  const sweep = to > from ? 1 : 0
  const large = Math.abs(to - from) > 180 ? 1 : 0
  // tangent direction at the end point
  const tang = rad(to) + (sweep ? Math.PI / 2 : -Math.PI / 2)
  const h = 6
  return (
    <g stroke={S} fill="none" strokeWidth={w}>
      <path d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} ${sweep} ${x2} ${y2}`} />
      <polygon
        fill={S} strokeWidth={0.5}
        points={`${x2 + h * Math.cos(tang)},${y2 + h * Math.sin(tang)} ${x2 + h * 0.35 * Math.cos(tang + 2.2)},${y2 + h * 0.35 * Math.sin(tang + 2.2)} ${x2 + h * 0.35 * Math.cos(tang - 2.2)},${y2 + h * 0.35 * Math.sin(tang - 2.2)}`}
      />
    </g>
  )
}

/** simple spur gear as a circle with radial teeth */
function Gear({ cx, cy, r, teeth = 12 }: { cx: number; cy: number; r: number; teeth?: number }) {
  const lines = []
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2
    lines.push(
      <line key={i}
        x1={cx + r * Math.cos(a)} y1={cy + r * Math.sin(a)}
        x2={cx + (r + 5) * Math.cos(a)} y2={cy + (r + 5) * Math.sin(a)} />
    )
  }
  return (
    <g stroke={S} strokeWidth={1.6} fill="none">
      <circle cx={cx} cy={cy} r={r} />
      <circle cx={cx} cy={cy} r={4} />
      {lines}
    </g>
  )
}

function Zigzag({ x, y, len, vertical = false }: { x: number; y: number; len: number; vertical?: boolean }) {
  const seg = len / 6
  const pts: string[] = [`${x},${y}`]
  for (let i = 0; i < 6; i++) {
    const off = i % 2 === 0 ? 6 : -6
    const t = (i + 0.5) * seg
    pts.push(vertical ? `${x + off},${y + t}` : `${x + t},${y + off}`)
  }
  pts.push(vertical ? `${x},${y + len}` : `${x + len},${y}`)
  return <polyline points={pts.join(" ")} fill="none" stroke={S} strokeWidth={1.6} />
}

function Hatch({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const lines = []
  for (let t = 8; t < w + h; t += 8) {
    const x1 = Math.max(x, x + t - h), y1 = Math.min(y + h, y + t)
    const x2 = Math.min(x + w, x + t), y2 = Math.max(y, y + t - w)
    lines.push(<line key={t} x1={x1} y1={y1} x2={x2} y2={y2} />)
  }
  return (
    <g stroke={S} strokeWidth={0.8} opacity={0.6}>
      <rect x={x} y={y} width={w} height={h} fill="none" strokeWidth={1.4} opacity={1} />
      {lines}
    </g>
  )
}

// ── Placeholder for figures the founder must supply ──────────────────────────
export function AssetPlaceholder({ id }: { id: string }) {
  const n = id.replace(/^\w+-/, "")
  return (
    <div
      className="flex min-h-[160px] w-full flex-col items-center justify-center gap-2 rounded-[10px] border border-dashed p-6 text-center"
      style={{ borderColor: "var(--gline)", color: "var(--gmut)" }}
    >
      <span className="font-mono text-[11px] uppercase tracking-[0.2em]">Diagram to come — item MA-{n}</span>
      <span className="max-w-[36ch] text-[12.5px] leading-relaxed">
        The original booklet figure for this question is being restored. Answer from the question and options.
      </span>
    </div>
  )
}

// ── MA figures ───────────────────────────────────────────────────────────────

function Ma1Chisel() {
  return (
    <svg viewBox="0 0 260 150" className="w-full" aria-label="A chisel with a wooden handle and a flat steel blade">
      <g transform="rotate(24 130 75)">
        {/* turned wooden handle */}
        <path d="M30 62 C42 54 66 54 76 60 L76 90 C66 96 42 96 30 88 C24 80 24 70 30 62 Z" fill={S} fillOpacity={0.16} stroke={S} strokeWidth={1.8} />
        <path d="M30 62 C26 70 26 80 30 88" fill="none" stroke={S} strokeWidth={1} />
        {/* ferrule / striking cap */}
        <rect x={18} y={64} width={12} height={22} rx={3} fill={S} fillOpacity={0.35} stroke={S} strokeWidth={1.6} />
        {/* neck + blade */}
        <rect x={76} y={69} width={64} height={12} fill={S} fillOpacity={0.1} stroke={S} strokeWidth={1.6} />
        <path d="M140 66 L212 66 L226 75 L212 84 L140 84 Z" fill={S} fillOpacity={0.08} stroke={S} strokeWidth={1.8} />
        <line x1={212} y1={66} x2={212} y2={84} stroke={S} strokeWidth={1} />
      </g>
    </svg>
  )
}

function Ma2Bevel() {
  return (
    <svg viewBox="0 0 300 170" className="w-full" aria-label="A crown gear on a vertical shaft, driven by a left shaft, with output arrows A, B and C at the right shaft">
      {/* vertical support shaft */}
      <rect x={143} y={108} width={14} height={48} fill={S} fillOpacity={0.2} stroke={S} strokeWidth={1.5} />
      {/* crown gear: two toothed elliptical faces angled toward each other */}
      <g stroke={S} strokeWidth={1.8} fill={S} fillOpacity={0.1}>
        <ellipse cx={122} cy={82} rx={16} ry={34} />
        <ellipse cx={178} cy={82} rx={16} ry={34} />
        <path d="M122 48 Q150 40 178 48" fill="none" />
        <path d="M122 116 Q150 124 178 116" fill="none" />
      </g>
      {/* teeth ticks on inner rims */}
      <g stroke={S} strokeWidth={1}>
        {[-24, -12, 0, 12, 24].map((dy) => (
          <g key={dy}>
            <line x1={130} y1={82 + dy} x2={138} y2={82 + dy} />
            <line x1={162} y1={82 + dy} x2={170} y2={82 + dy} />
          </g>
        ))}
      </g>
      {/* left input shaft + rotation arrow (turning down over the shaft) */}
      <rect x={16} y={76} width={92} height={12} fill={S} fillOpacity={0.2} stroke={S} strokeWidth={1.5} />
      <ArcArrow cx={58} cy={82} r={17} from={210} to={330} />
      {/* right output shaft */}
      <rect x={192} y={76} width={92} height={12} fill={S} fillOpacity={0.2} stroke={S} strokeWidth={1.5} />
      {/* A: straight arrow along the axis */}
      <Arrow x1={252} y1={60} x2={288} y2={60} />
      <text x={266} y={50} {...lblB}>A</text>
      {/* B: curled under the shaft */}
      <ArcArrow cx={240} cy={82} r={16} from={30} to={150} />
      <text x={234} y={118} {...lblB}>B</text>
      {/* C: curled above the shaft (opposite sense) */}
      <ArcArrow cx={268} cy={82} r={16} from={330} to={210} />
      <text x={262} y={54} {...lblB}>C</text>
    </svg>
  )
}

function Ma3Solder() {
  return (
    <svg viewBox="0 0 260 160" className="w-full" aria-label="A pistol-grip tool with a long tip extending from the front of the body">
      <g transform="rotate(12 130 80)">
        {/* body */}
        <path d="M60 50 L170 50 C182 50 186 58 184 66 L180 78 L64 78 C54 78 50 68 52 60 Z" fill={S} fillOpacity={0.1} stroke={S} strokeWidth={1.8} />
        {/* grip + trigger */}
        <path d="M108 78 L138 78 L132 128 C130 136 112 136 110 128 Z" fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.8} />
        <path d="M104 84 C98 90 98 98 104 102" fill="none" stroke={S} strokeWidth={1.6} />
        {[0, 1, 2].map((i) => <circle key={i} cx={118 + i * 7} cy={92 + i * 9} r={1} fill={S} />)}
        {/* tapered nozzle + soldering tip */}
        <path d="M60 54 L34 62 L34 70 L62 76 Z" fill={S} fillOpacity={0.15} stroke={S} strokeWidth={1.6} />
        <line x1={34} y1={66} x2={4} y2={74} stroke={S} strokeWidth={2.4} />
      </g>
    </svg>
  )
}

function Ma6Highway() {
  return (
    <svg viewBox="0 0 280 200" className="w-full" aria-label="A road curving 90 degrees into a highway, with positions A to E marked around the curve">
      <g stroke={S} strokeWidth={2} fill="none">
        {/* outer kerb: up the left, big curve, along the top */}
        <path d="M60 196 L60 70 Q60 24 106 24 L272 24" />
        {/* inner kerb */}
        <path d="M108 196 L108 96 Q108 72 132 72 L272 72" />
      </g>
      {/* dashed centre line */}
      <path d="M84 196 L84 84 Q84 48 120 48 L272 48" fill="none" stroke={S} strokeWidth={1.2} strokeDasharray="8 7" />
      {/* Highway label + arrow */}
      <text x={196} y={12} {...lbl}>Highway</text>
      <Arrow x1={222} y1={14} x2={206} y2={30} />
      {/* letters */}
      <text x={38} y={40} {...lblB}>D</text>
      <text x={40} y={186} {...lblB}>A</text>
      <text x={118} y={186} {...lblB}>B</text>
      <text x={124} y={92} {...lblB}>C</text>
      <text x={200} y={92} {...lblB}>E</text>
    </svg>
  )
}

function Shelf({ x, brace, cable = false, tall = false, mid = false }: { x: number; brace: "tip" | "near" | "mid"; cable?: boolean; tall?: boolean; mid?: boolean }) {
  // wall from (x, 10) down to (x, 120); shelf from wall at y=100 to x+80
  const anchorY = tall ? 20 : mid ? 55 : 40
  const endX = brace === "near" ? x + 26 : brace === "mid" ? x + 42 : x + 78
  return (
    <g>
      <g stroke={S} strokeWidth={2} fill="none">
        <line x1={x} y1={10} x2={x} y2={120} />
        <line x1={x + 4} y1={10} x2={x + 4} y2={120} />
        <line x1={x + 4} y1={100} x2={x + 82} y2={100} />
        <line x1={x + 4} y1={105} x2={x + 82} y2={105} />
      </g>
      <line x1={x + 4} y1={anchorY} x2={endX} y2={100} stroke={S} strokeWidth={cable ? 1 : 1.8} strokeDasharray={cable ? "4 3" : undefined} />
    </g>
  )
}

function Ma7Shelves() {
  return (
    <svg viewBox="0 0 440 150" className="w-full" aria-label="Four wall shelves supported by a cable or brace anchored at different heights and reaches">
      <Shelf x={20} brace="near" cable tall />
      <Shelf x={130} brace="tip" mid />
      <Shelf x={240} brace="tip" tall />
      <Shelf x={350} brace="mid" mid />
      <text x={55} y={144} {...lblB}>A</text>
      <text x={165} y={144} {...lblB}>B</text>
      <text x={275} y={144} {...lblB}>C</text>
      <text x={385} y={144} {...lblB}>D</text>
    </svg>
  )
}

function Ma8GearTrain() {
  return (
    <svg viewBox="0 0 340 170" className="w-full" aria-label="Three meshed gears in a row: large gear X, a small idler, and large gear Y with direction arrows A and B">
      <Gear cx={70} cy={90} r={40} teeth={14} />
      <Gear cx={148} cy={90} r={22} teeth={9} />
      <Gear cx={226} cy={90} r={40} teeth={14} />
      {/* X turns clockwise */}
      <ArcArrow cx={70} cy={90} r={14} from={200} to={340} />
      <text x={52} y={146} {...lblB}>GEAR X</text>
      <text x={252} y={38} {...lblB}>GEAR Y</text>
      <Arrow x1={268} y1={44} x2={248} y2={62} w={1.2} />
      {/* A over the top (anticlockwise), B under the bottom (clockwise) */}
      <ArcArrow cx={226} cy={90} r={54} from={-20} to={-120} />
      <text x={266} y={56} {...lblB}>A</text>
      <ArcArrow cx={226} cy={90} r={54} from={160} to={80} />
      <text x={214} y={162} {...lblB}>B</text>
    </svg>
  )
}

function Ma10Pulleys() {
  return (
    <svg viewBox="0 0 340 190" className="w-full" aria-label="A motor driving pulley A, belted to a larger pulley on shaft B, belted again to the largest pulley on shaft C">
      {/* motor */}
      <Hatch x={20} y={16} w={58} h={34} />
      <text x={26} y={10} {...lbl}>MOTOR</text>
      <line x1={49} y1={50} x2={49} y2={128} stroke={S} strokeWidth={3} />
      {/* disc A (small) */}
      <ellipse cx={49} cy={132} rx={22} ry={7} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.8} />
      <ArcArrow cx={49} cy={132} r={13} from={210} to={330} w={1.2} />
      <text x={44} y={158} {...lblB}>A</text>
      {/* shaft B with medium disc */}
      <line x1={165} y1={40} x2={165} y2={150} stroke={S} strokeWidth={3} />
      <ellipse cx={165} cy={96} rx={34} ry={9} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.8} />
      <ellipse cx={165} cy={46} rx={12} ry={4.5} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.4} />
      <ellipse cx={165} cy={148} rx={12} ry={4.5} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.4} />
      <text x={160} y={172} {...lblB}>B</text>
      {/* shaft C with large disc */}
      <line x1={286} y1={36} x2={286} y2={152} stroke={S} strokeWidth={3} />
      <ellipse cx={286} cy={100} rx={46} ry={11} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.8} />
      <ellipse cx={286} cy={42} rx={12} ry={4.5} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.4} />
      <ellipse cx={286} cy={150} rx={12} ry={4.5} fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.4} />
      <text x={281} y={176} {...lblB}>C</text>
      {/* belts */}
      <line x1={62} y1={128} x2={140} y2={94} stroke={S} strokeWidth={1.2} />
      <line x1={66} y1={136} x2={146} y2={102} stroke={S} strokeWidth={1.2} />
      <line x1={192} y1={92} x2={248} y2={98} stroke={S} strokeWidth={1.2} />
      <line x1={192} y1={101} x2={248} y2={107} stroke={S} strokeWidth={1.2} />
    </svg>
  )
}

function Ma14Drill() {
  return (
    <svg viewBox="0 0 260 170" className="w-full" aria-label="A power drill; an X marks the tapered part that grips the bit">
      <g transform="rotate(14 130 85)">
        {/* motor housing */}
        <path d="M74 44 L186 44 C198 44 202 54 200 62 L196 76 L78 76 C68 76 64 64 66 54 Z" fill={S} fillOpacity={0.1} stroke={S} strokeWidth={1.8} />
        {[0, 1, 2, 3].map((i) => <line key={i} x1={150 + i * 9} y1={48} x2={146 + i * 9} y2={72} stroke={S} strokeWidth={1} />)}
        {/* grip + trigger loop */}
        <path d="M118 76 L148 76 L142 132 C140 140 122 140 120 132 Z" fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.8} />
        <path d="M112 84 C104 90 104 100 112 106" fill="none" stroke={S} strokeWidth={1.6} />
        {/* chuck (tapered nose) + bit */}
        <path d="M74 50 L44 58 L44 68 L76 74 Z" fill={S} fillOpacity={0.18} stroke={S} strokeWidth={1.6} />
        <line x1={44} y1={63} x2={16} y2={70} stroke={S} strokeWidth={2.2} />
        <text x={48} y={48} {...lblB}>X</text>
        <line x1={54} y1={51} x2={58} y2={60} stroke={S} strokeWidth={1} />
      </g>
    </svg>
  )
}

function Ma15Plumb() {
  return (
    <svg viewBox="0 0 160 190" className="w-full" aria-label="A plumb bob hanging point-down from a cord">
      <line x1={80} y1={8} x2={80} y2={64} stroke={S} strokeWidth={1.6} />
      <ellipse cx={80} cy={70} rx={26} ry={8} fill={S} fillOpacity={0.25} stroke={S} strokeWidth={1.8} />
      <path d="M54 74 L80 168 L106 74 Z" fill={S} fillOpacity={0.12} stroke={S} strokeWidth={1.8} />
    </svg>
  )
}

function Ma17Worm() {
  // Drawn so that the worm's rotation drives the gear ANTICLOCKWISE — i.e. the
  // correct choice is A (left arrow). The key is consistent with THIS drawing;
  // the booklet's own arrow sense could not be resolved (provisional key).
  return (
    <svg viewBox="0 0 300 190" className="w-full" aria-label="A worm on a horizontal shaft meshing with a gear below; arrows A and B show the two possible gear rotations">
      {/* supports */}
      <path d="M40 74 L58 46 L76 74 Z" fill={S} fillOpacity={0.2} stroke={S} strokeWidth={1.5} />
      <path d="M224 74 L242 46 L260 74 Z" fill={S} fillOpacity={0.2} stroke={S} strokeWidth={1.5} />
      {/* shaft */}
      <line x1={24} y1={58} x2={276} y2={58} stroke={S} strokeWidth={3} />
      {/* worm helix */}
      <rect x={96} y={40} width={108} height={36} rx={8} fill={S} fillOpacity={0.08} stroke={S} strokeWidth={1.6} />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <line key={i} x1={102 + i * 17} y1={74} x2={114 + i * 17} y2={42} stroke={S} strokeWidth={2} />
      ))}
      {/* shaft rotation arrow (top of shaft moving toward the viewer/right) */}
      <ArcArrow cx={84} cy={58} r={13} from={240} to={80} />
      {/* gear below */}
      <Gear cx={150} cy={128} r={34} teeth={12} />
      <ArcArrow cx={116} cy={128} r={12} from={40} to={-160} w={1.4} />
      <text x={92} y={166} {...lblB}>A</text>
      <ArcArrow cx={184} cy={128} r={12} from={140} to={340} w={1.4} />
      <text x={198} y={166} {...lblB}>B</text>
    </svg>
  )
}

function Ma18Circuits() {
  return (
    <svg viewBox="0 0 380 170" className="w-full" aria-label="Two circuits labelled A and B: in A the resistors R1 and R2 are in series, in B they are in parallel">
      <text x={150} y={14} {...lbl}>R — RESISTOR</text>
      {/* A: series */}
      <g>
        <rect x={16} y={62} width={40} height={52} fill={S} fillOpacity={0.35} stroke={S} strokeWidth={1.5} />
        <text x={8} y={132} {...lbl}>Power supply</text>
        <line x1={56} y1={70} x2={78} y2={70} stroke={S} strokeWidth={1.6} />
        <Zigzag x={78} y={70} len={44} />
        <text x={88} y={58} {...lbl}>R1</text>
        <line x1={122} y1={70} x2={156} y2={70} stroke={S} strokeWidth={1.6} />
        <line x1={156} y1={70} x2={156} y2={78} stroke={S} strokeWidth={1.6} />
        <Zigzag x={156} y={78} len={30} vertical />
        <text x={162} y={96} {...lbl}>R2</text>
        <line x1={156} y1={108} x2={156} y2={116} stroke={S} strokeWidth={1.6} />
        <line x1={156} y1={116} x2={36} y2={116} stroke={S} strokeWidth={1.6} />
        <line x1={36} y1={116} x2={36} y2={114} stroke={S} strokeWidth={1.6} />
        <text x={84} y={148} {...lblB}>A</text>
      </g>
      {/* B: parallel */}
      <g transform="translate(210 0)">
        <rect x={16} y={62} width={40} height={52} fill={S} fillOpacity={0.35} stroke={S} strokeWidth={1.5} />
        <text x={8} y={132} {...lbl}>Power supply</text>
        <line x1={56} y1={70} x2={156} y2={70} stroke={S} strokeWidth={1.6} />
        <line x1={100} y1={70} x2={100} y2={78} stroke={S} strokeWidth={1.6} />
        <Zigzag x={100} y={78} len={30} vertical />
        <text x={78} y={96} {...lbl}>R1</text>
        <line x1={100} y1={108} x2={100} y2={116} stroke={S} strokeWidth={1.6} />
        <line x1={156} y1={70} x2={156} y2={78} stroke={S} strokeWidth={1.6} />
        <Zigzag x={156} y={78} len={30} vertical />
        <text x={162} y={96} {...lbl}>R2</text>
        <line x1={156} y1={108} x2={156} y2={116} stroke={S} strokeWidth={1.6} />
        <line x1={36} y1={114} x2={36} y2={116} stroke={S} strokeWidth={1.6} />
        <line x1={36} y1={116} x2={156} y2={116} stroke={S} strokeWidth={1.6} />
        <text x={84} y={148} {...lblB}>B</text>
      </g>
    </svg>
  )
}

function Ma19Carrom() {
  return (
    <svg viewBox="0 0 220 220" className="w-full" aria-label="A carrom board seen from above; the striker travels up into the black coin, with directions A, B, C, D marked">
      <rect x={14} y={14} width={192} height={192} fill="none" stroke={S} strokeWidth={2.4} />
      <rect x={24} y={24} width={172} height={172} fill="none" stroke={S} strokeWidth={1.2} />
      {[[32, 32], [188, 32], [32, 188], [188, 188]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={9} fill="none" stroke={S} strokeWidth={1.6} />
      ))}
      <circle cx={110} cy={128} r={26} fill="none" stroke={S} strokeWidth={1} />
      {/* black coin (left) + striker (right, open) just above centre */}
      <circle cx={102} cy={86} r={8} fill={S} />
      <circle cx={117} cy={92} r={8} fill="none" stroke={S} strokeWidth={1.8} />
      {/* striker's straight-up travel */}
      {[176, 160, 144, 128].map((y) => <Arrow key={y} x1={117} y1={y + 12} x2={117} y2={y} w={1.2} />)}
      {/* direction lines from the contact point */}
      <Arrow x1={108} y1={84} x2={78} y2={54} w={1.2} />
      <text x={64} y={48} {...lblB}>A</text>
      <Arrow x1={120} y1={84} x2={150} y2={56} w={1.2} />
      <text x={154} y={50} {...lblB}>B</text>
      <Arrow x1={124} y1={96} x2={156} y2={118} w={1.2} />
      <text x={162} y={128} {...lblB}>C</text>
      <Arrow x1={106} y1={98} x2={76} y2={120} w={1.2} />
      <text x={58} y={130} {...lblB}>D</text>
    </svg>
  )
}

function Ma20Beakers() {
  return (
    <svg viewBox="0 0 300 190" className="w-full" aria-label="Two beakers, A containing oil and B containing water, with a coin dropped into each">
      <text x={130} y={16} {...lbl}>Coins</text>
      <ellipse cx={112} cy={26} rx={9} ry={4} fill={S} fillOpacity={0.5} stroke={S} strokeWidth={1.2} />
      <ellipse cx={190} cy={26} rx={9} ry={4} fill={S} fillOpacity={0.5} stroke={S} strokeWidth={1.2} />
      <Arrow x1={104} y1={34} x2={88} y2={52} w={1.2} />
      <Arrow x1={198} y1={34} x2={214} y2={52} w={1.2} />
      {/* beaker A */}
      <g>
        <path d="M40 60 L40 160 Q40 168 48 168 L112 168 Q120 168 120 160 L120 60" fill="none" stroke={S} strokeWidth={2} />
        <ellipse cx={80} cy={60} rx={40} ry={9} fill="none" stroke={S} strokeWidth={1.6} />
        <ellipse cx={80} cy={140} rx={38} ry={8} fill={S} fillOpacity={0.18} />
        <rect x={43} y={140} width={74} height={24} fill={S} fillOpacity={0.18} />
        <text x={74} y={186} {...lblB}>A</text>
        <text x={64} y={116} {...lbl}>Oil</text>
      </g>
      {/* beaker B */}
      <g transform="translate(142 0)">
        <path d="M40 60 L40 160 Q40 168 48 168 L112 168 Q120 168 120 160 L120 60" fill="none" stroke={S} strokeWidth={2} />
        <ellipse cx={80} cy={60} rx={40} ry={9} fill="none" stroke={S} strokeWidth={1.6} />
        <ellipse cx={80} cy={140} rx={38} ry={8} fill={S} fillOpacity={0.18} />
        <rect x={43} y={140} width={74} height={24} fill={S} fillOpacity={0.18} />
        <text x={74} y={186} {...lblB}>B</text>
        <text x={56} y={116} {...lbl}>Water</text>
      </g>
    </svg>
  )
}

function Ma21Boxes() {
  return (
    <svg viewBox="0 0 400 180" className="w-full" aria-label="Three containers of equal height: a triangular prism A, a cylinder B and a rectangular box C">
      {/* A: triangular prism */}
      <g>
        <path d="M30 130 L90 130 L60 148 Z" fill={S} fillOpacity={0.15} stroke={S} strokeWidth={1.6} />
        <path d="M30 50 L90 50 L60 68 Z" fill="none" stroke={S} strokeWidth={1.6} />
        <line x1={30} y1={50} x2={30} y2={130} stroke={S} strokeWidth={1.6} />
        <line x1={90} y1={50} x2={90} y2={130} stroke={S} strokeWidth={1.6} />
        <line x1={60} y1={68} x2={60} y2={148} stroke={S} strokeWidth={1.2} strokeDasharray="4 3" />
        <Arrow x1={16} y1={130} x2={16} y2={52} w={1} /><Arrow x1={16} y1={52} x2={16} y2={130} w={1} />
        <text x={2} y={94} {...lbl}>H</text>
        <text x={54} y={170} {...lblB}>A</text>
      </g>
      {/* B: cylinder */}
      <g transform="translate(140 0)">
        <ellipse cx={60} cy={52} rx={32} ry={10} fill="none" stroke={S} strokeWidth={1.6} />
        <path d="M28 52 L28 132 A32 10 0 0 0 92 132 L92 52" fill="none" stroke={S} strokeWidth={1.6} />
        <ellipse cx={60} cy={132} rx={32} ry={10} fill={S} fillOpacity={0.15} stroke={S} strokeWidth={1} />
        <Arrow x1={12} y1={132} x2={12} y2={54} w={1} /><Arrow x1={12} y1={54} x2={12} y2={132} w={1} />
        <text x={-2} y={96} {...lbl}>H</text>
        <text x={54} y={170} {...lblB}>B</text>
      </g>
      {/* C: cuboid */}
      <g transform="translate(280 0)">
        <rect x={26} y={58} width={62} height={76} fill="none" stroke={S} strokeWidth={1.6} />
        <path d="M26 58 L44 44 L106 44 L88 58" fill="none" stroke={S} strokeWidth={1.6} />
        <path d="M106 44 L106 120 L88 134" fill="none" stroke={S} strokeWidth={1.6} />
        <path d="M26 134 L44 120 L106 120" fill="none" stroke={S} strokeWidth={1.2} strokeDasharray="4 3" />
        <line x1={44} y1={44} x2={44} y2={120} stroke={S} strokeWidth={1.2} strokeDasharray="4 3" />
        <path d="M26 134 L88 134 L106 120 L44 120 Z" fill={S} fillOpacity={0.15} />
        <Arrow x1={12} y1={134} x2={12} y2={60} w={1} /><Arrow x1={12} y1={60} x2={12} y2={134} w={1} />
        <text x={-2} y={98} {...lbl}>H</text>
        <text x={52} y={170} {...lblB}>C</text>
      </g>
    </svg>
  )
}

function Ma22Shelves() {
  return (
    <svg viewBox="0 0 420 170" className="w-full" aria-label="Three shelf supports: A a full-span diagonal brace, B a vertical rod from the ceiling to the shelf tip, C a short half-span brace">
      {[0, 145, 290].map((dx, i) => (
        <g key={i} transform={`translate(${dx} 0)`}>
          <Hatch x={14} y={10} w={112} h={12} />
          <Hatch x={14} y={22} w={12} h={118} />
          <Hatch x={26} y={104} w={92} h={10} />
          {i === 0 && <g stroke={S} strokeWidth={1.6}><line x1={26} y1={28} x2={116} y2={104} /><line x1={29} y1={25} x2={119} y2={101} /></g>}
          {i === 1 && <g stroke={S} strokeWidth={1.6}><line x1={114} y1={22} x2={114} y2={104} /><line x1={118} y1={22} x2={118} y2={104} /></g>}
          {i === 2 && <g stroke={S} strokeWidth={1.6}><line x1={26} y1={66} x2={70} y2={104} /><line x1={29} y1={63} x2={73} y2={101} /></g>}
          <text x={64} y={160} {...lblB}>{"ABC"[i]}</text>
        </g>
      ))}
    </svg>
  )
}

function Ma24Glasses() {
  return (
    <svg viewBox="0 0 280 180" className="w-full" aria-label="Two tumbler glasses: A thin-walled, B thick-walled">
      {/* A: thin walls */}
      <g stroke={S} strokeWidth={1.1} fill="none">
        <ellipse cx={80} cy={36} rx={44} ry={11} />
        <path d="M36 36 L52 140 Q54 150 64 150 L96 150 Q106 150 108 140 L124 36" />
        <ellipse cx={80} cy={146} rx={26} ry={6} />
      </g>
      <text x={75} y={172} {...lblB}>A</text>
      {/* B: thick walls */}
      <g stroke={S} strokeWidth={4.5} fill="none">
        <ellipse cx={200} cy={36} rx={44} ry={11} />
        <path d="M156 36 L172 140 Q174 150 184 150 L216 150 Q226 150 228 140 L244 36" />
        <ellipse cx={200} cy={146} rx={26} ry={6} />
      </g>
      <text x={195} y={172} {...lblB}>B</text>
    </svg>
  )
}

function Ma25Pie() {
  // sectors clockwise from top-right: 1, 2, 2, 4, 8(left), ?(top-left)
  const nums: { v: string; a: number }[] = [
    { v: "1", a: -60 }, { v: "2", a: 0 }, { v: "2", a: 60 },
    { v: "4", a: 120 }, { v: "8", a: 180 }, { v: "?", a: 240 },
  ]
  return (
    <svg viewBox="0 0 200 200" className="w-full" aria-label="A circle divided into six sectors containing 1, 2, 2, 4, 8 and a missing number">
      <circle cx={100} cy={100} r={82} fill="none" stroke={S} strokeWidth={2} />
      {[0, 60, 120].map((a) => {
        const r = (a * Math.PI) / 180
        return <line key={a}
          x1={100 - 82 * Math.sin(r)} y1={100 - 82 * Math.cos(r)}
          x2={100 + 82 * Math.sin(r)} y2={100 + 82 * Math.cos(r)}
          stroke={S} strokeWidth={1.6} />
      })}
      {nums.map(({ v, a }, i) => {
        const mid = ((a - 90 + 30) * Math.PI) / 180
        return <text key={i} x={100 + 52 * Math.cos(mid) - 5} y={100 + 52 * Math.sin(mid) + 6}
          style={{ ...lblB, fontSize: 20 }}>{v}</text>
      })}
    </svg>
  )
}

const MA_FIGURES: Record<string, () => ReturnType<typeof Ma1Chisel>> = {
  "ma-1": Ma1Chisel,
  "ma-2": Ma2Bevel,
  "ma-3": Ma3Solder,
  "ma-6": Ma6Highway,
  "ma-7": Ma7Shelves,
  "ma-8": Ma8GearTrain,
  "ma-10": Ma10Pulleys,
  "ma-14": Ma14Drill,
  "ma-15": Ma15Plumb,
  "ma-17": Ma17Worm,
  "ma-18": Ma18Circuits,
  "ma-19": Ma19Carrom,
  "ma-20": Ma20Beakers,
  "ma-21": Ma21Boxes,
  "ma-22": Ma22Shelves,
  "ma-24": Ma24Glasses,
  "ma-25": Ma25Pie,
}

/** The figure panel for an MCQ item: a rebuilt SVG, or the labelled placeholder
 *  when the original booklet art is still awaited. */
export function AbilityFigure({ id, placeholder }: { id: string; placeholder?: boolean }) {
  if (placeholder || !MA_FIGURES[id]) return <AssetPlaceholder id={id} />
  const Fig = MA_FIGURES[id]
  return (
    <div className="flex w-full items-center justify-center rounded-[10px] border p-4"
      style={{ borderColor: "var(--gline)", background: "var(--gcard)" }}>
      <Fig />
    </div>
  )
}

// ── SA figure renderer ───────────────────────────────────────────────────────
function Marker({ mk }: { mk: SpatialMarker }) {
  const sw = 2
  switch (mk.kind) {
    case "dot": return <circle cx={mk.x} cy={mk.y} r={mk.r ?? 3.5} fill={S} />
    case "circle": return <circle cx={mk.x} cy={mk.y} r={mk.r ?? 4} fill="none" stroke={S} strokeWidth={sw} />
    case "plus": {
      const r = mk.r ?? 4.5
      return (
        <g stroke={S} strokeWidth={sw}>
          <line x1={mk.x - r} y1={mk.y} x2={mk.x + r} y2={mk.y} />
          <line x1={mk.x} y1={mk.y - r} x2={mk.x} y2={mk.y + r} />
        </g>
      )
    }
    case "square": {
      const r = mk.r ?? 4
      return <rect x={mk.x - r} y={mk.y - r} width={r * 2} height={r * 2} fill="none" stroke={S} strokeWidth={sw} />
    }
    case "fsquare": {
      const r = mk.r ?? 4
      return <rect x={mk.x - r} y={mk.y - r} width={r * 2} height={r * 2} fill={S} />
    }
    case "line": return <line x1={mk.x} y1={mk.y} x2={mk.x2} y2={mk.y2} stroke={S} strokeWidth={sw} />
  }
}

/** Renders a spatial figure: the sample as-is, or a test figure derived from it
 *  by rotate / mirror+rotate. The transform IS the answer key. */
export function SpatialFigure({ def, rot = 0, mirrored = false, size = 132 }: {
  def: SpatialShapeDef
  rot?: number
  mirrored?: boolean
  size?: number
}) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden className="shrink-0">
      <g transform={`rotate(${rot} 50 50)${mirrored ? " translate(100 0) scale(-1 1)" : ""}`}>
        <path d={def.outline} fill={S} fillOpacity={0.07} stroke={S} strokeWidth={2.5} strokeLinejoin="round" />
        {def.greyFills?.map((d, i) => <path key={i} d={d} fill={S} fillOpacity={0.45} />)}
        {def.markers?.map((mk, i) => <Marker key={i} mk={mk} />)}
      </g>
    </svg>
  )
}
