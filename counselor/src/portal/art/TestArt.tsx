// TestArt — "Measured Fields", the assessment art system.
//
// An algorithmic philosophy in three movements, one per instrument. Each is a
// living, seeded system — not a texture. The concept is woven into the maths:
//
//   PERSONALITY · "Facet Bloom"    Six arms, each braided from three fibres —
//   the 6 × 3 structure of the Sigma profile's eighteen facets. Harmonic ink
//   lines accumulate into an engraved bloom; the whole figure leans gently
//   toward the cursor, the way an instrument leans in to read you.
//
//   INTERESTS · "Holland Orbits"   Six poles on a hexagon — R I A S E C. In
//   the psychometric model, adjacent interests correlate; here, particles are
//   pulled by two NEIGHBOURING poles at once, so the orbital ribbons trace the
//   hexagon's real correlation structure. The cursor becomes a seventh,
//   temporary pole.
//
//   APTITUDE · "Logic Lattice"     A strict isometric lattice. One bright
//   path threads it — the correct answer — while candidate branches glow and
//   decay. The cursor is a lens that locally warps the grid: reasoning under
//   distortion.
//
// Everything is deterministic per seed (mulberry32 PRNG), 2D canvas only,
// DPR-capped, paused offscreen, and reduced-motion renders a rich still frame.

import { useEffect, useRef } from "react"
import { cn } from "@/lib/utils"

export type ArtSystem = "personality" | "interests" | "aptitude"

export const ART_META: Record<ArtSystem, { name: string; ground: string; ink: string }> = {
  personality: { name: "Facet Bloom", ground: "#140b1e", ink: "#a855f7" },
  interests: { name: "Holland Orbits", ground: "#06131c", ink: "#22d3ee" },
  aptitude: { name: "Logic Lattice", ground: "#17130a", ink: "#f59e0b" },
}

function mulberry32(a: number) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hashSeed = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// cheap organic drift — sum of incommensurate sines (no allocation)
const drift = (x: number, y: number, t: number) =>
  Math.sin(x * 1.7 + t) * 0.5 + Math.sin(y * 2.3 - t * 0.7) * 0.35 + Math.sin((x + y) * 1.1 + t * 0.4) * 0.15

const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const mix = (a: [number, number, number], b: [number, number, number], k: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * k)},${Math.round(a[1] + (b[1] - a[1]) * k)},${Math.round(a[2] + (b[2] - a[2]) * k)})`

/** Fade a colour to alpha 0 without travelling through transparent-BLACK.
 *  `addColorStop(1, "transparent")` interpolates in premultiplied-ish space and
 *  leaves a dirty dark halo; holding the SAME rgb and only moving alpha is clean. */
const fadeOut = (hex: string, a = 0) => {
  const [r, g, b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/** Paint the plate's border back to the ground colour so the figure never runs
 *  off the card's rectangle. ONLY safe on systems that fully repaint each frame
 *  (the lattice) — on trail-accumulating systems it would compound and eat the
 *  drawing, so those are kept inside the frame by geometry instead.
 *
 *  The falloff is an ELLIPSE inscribed in the plate, not a circle: a circle of
 *  radius max(w,h)*k reaches full ground far outside a wide card, leaving the
 *  mesh visibly sliced at the top and bottom edges. Scaling the space by
 *  (w/m, h/m) maps the gradient's outer radius m*0.5 onto exactly (w/2, h/2) —
 *  so every edge midpoint lands at alpha 1, and the corners beyond it. */
function vignette(ctx: CanvasRenderingContext2D, w: number, h: number, ground: string) {
  const m = Math.min(w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.scale(w / m, h / m)
  const g = ctx.createRadialGradient(0, 0, m * 0.30, 0, 0, m * 0.5)
  g.addColorStop(0, fadeOut(ground, 0))
  g.addColorStop(1, fadeOut(ground, 1))
  ctx.fillStyle = g
  ctx.fillRect(-w, -h, w * 2, h * 2)
  ctx.restore()
}

interface Ptr {
  x: number
  y: number
  active: number // 0..1 eased presence
}

/* ── movement I · Facet Bloom ─────────────────────────────────────────────── */
function makeBloom(w: number, h: number, rng: () => number) {
  const cx = w / 2
  const cy = h / 2
  // 0.34 (not 0.44) of the short side: the bloom sits centred with a real
  // margin on every edge, so the card crops nothing.
  const R = Math.min(w, h) * 0.34
  const r0 = R * 0.2 // the open iris the fibres spring from (see the loop below)
  const arms = Array.from({ length: 6 }, (_, k) => ({
    base: (k / 6) * Math.PI * 2 + rng() * 0.2,
    fibres: Array.from({ length: 3 }, () => ({
      phase: rng() * Math.PI * 2,
      freq: 2.2 + rng() * 2.4,
      // a tight bend keeps the six arms legible as arms; the old wide bend
      // let the 18 fibres overlap into an undifferentiated scribble ball
      bend: 0.10 + rng() * 0.14,
      hue: rng(), // 0 violet → 1 magenta
    })),
  }))
  const violet = hexToRgb("#a855f7")
  const magenta = hexToRgb("#ec4899")
  const glow = hexToRgb("#f5d0fe")

  return (ctx: CanvasRenderingContext2D, t: number, ptr: Ptr) => {
    // a faster decay than before (0.12 vs 0.085) — the trail is a memory, not a
    // build-up; at the old rate the plate saturated into a solid disc
    ctx.fillStyle = "rgba(20,11,30,0.12)"
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = "lighter"
    const spin = t * 0.05
    const pa = Math.atan2(ptr.y - cy, ptr.x - cx)
    for (const arm of arms) {
      for (const f of arm.fibres) {
        // lean the arm toward the pointer, more at the tips
        let dAng = pa - (arm.base + spin)
        dAng = Math.atan2(Math.sin(dAng), Math.cos(dAng))
        ctx.beginPath()
        const steps = 34
        for (let i = 0; i <= steps; i++) {
          // start at an inner radius, never at r=0: under `lighter`, 18 fibres
          // all originating from the same centre pixel accumulated to pure
          // white and burned a hard core into the middle of the plate. An open
          // iris also reads far more like a bloom.
          const k = i / steps
          const r = r0 + k * (R - r0)
          const wob = Math.sin(r * 0.045 * f.freq + f.phase + t * 0.9) * f.bend * k
          const lean = dAng * 0.22 * k * k * ptr.active
          const ang = arm.base + spin + wob + lean + drift(k * 3, f.phase, t * 0.5) * 0.05
          const x = cx + Math.cos(ang) * r
          const y = cy + Math.sin(ang) * r
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = mix(violet, magenta, f.hue)
        ctx.globalAlpha = 0.11
        ctx.lineWidth = 1
        ctx.stroke()
        // tip spark
        const tipAng = arm.base + spin + Math.sin(R * 0.045 * f.freq + f.phase + t * 0.9) * f.bend
        ctx.globalAlpha = 0.42
        ctx.fillStyle = mix(glow, magenta, f.hue * 0.5)
        ctx.beginPath()
        ctx.arc(cx + Math.cos(tipAng) * R, cy + Math.sin(tipAng) * R, 1, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = "source-over"
  }
}

/* ── movement II · Holland Orbits ─────────────────────────────────────────── */
function makeOrbits(w: number, h: number, rng: () => number) {
  const cx = w / 2
  const cy = h / 2
  const m = Math.min(w, h)
  const R = m * 0.30          // the hexagon of poles, comfortably inset
  const RMAX = m * 0.43       // the containment horizon — nothing may orbit past it
  const GLOW = m * 0.10       // pole halo, scaled so small cards don't blow out
  const POLES = Array.from({ length: 6 }, (_, k) => ({
    x: cx + Math.cos((k / 6) * Math.PI * 2 - Math.PI / 2) * R,
    y: cy + Math.sin((k / 6) * Math.PI * 2 - Math.PI / 2) * R,
  }))
  const LETTERS = ["R", "I", "A", "S", "E", "C"]
  const cyan = hexToRgb("#22d3ee")
  const indigo = hexToRgb("#6366f1")
  const N = 90
  const parts = Array.from({ length: N }, () => {
    const a = Math.floor(rng() * 6)
    const ang = rng() * Math.PI * 2
    const rad = rng() * RMAX * 0.8
    return {
      x: cx + Math.cos(ang) * rad,
      y: cy + Math.sin(ang) * rad,
      vx: (rng() - 0.5) * 0.6,
      vy: (rng() - 0.5) * 0.6,
      a, // primary pole
      blend: rng(), // pull mix between pole a and its hexagon-adjacent neighbour
    }
  })

  return (ctx: CanvasRenderingContext2D, t: number, ptr: Ptr) => {
    ctx.fillStyle = "rgba(6,19,28,0.11)"
    ctx.fillRect(0, 0, w, h)

    // the Holland hexagon itself — faint structure, so the ribbons read as
    // orbiting a real model rather than as noise
    ctx.beginPath()
    POLES.forEach((p, k) => (k === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.closePath()
    ctx.strokeStyle = "#a5f3fc"
    ctx.globalAlpha = 0.07
    ctx.lineWidth = 1
    ctx.stroke()

    // poles + letters
    for (let k = 0; k < 6; k++) {
      const p = POLES[k]
      const pulse = 0.5 + 0.5 * Math.sin(t * 0.8 + k)
      ctx.globalAlpha = 0.10 + pulse * 0.08
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, GLOW)
      g.addColorStop(0, "#a5f3fc")
      g.addColorStop(1, fadeOut("#a5f3fc", 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(p.x, p.y, GLOW, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.45
      ctx.fillStyle = "#a5f3fc"
      ctx.font = `${Math.max(8, Math.round(m * 0.036))}px 'Space Mono', monospace`
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      ctx.fillText(LETTERS[k], p.x, p.y)
    }
    ctx.globalAlpha = 1

    // particles: pulled by pole a and its neighbour (adjacent interests correlate)
    for (const p of parts) {
      const A = POLES[p.a]
      const B = POLES[(p.a + 1) % 6]
      const tx = A.x + (B.x - A.x) * p.blend
      const ty = A.y + (B.y - A.y) * p.blend
      let ax = (tx - p.x) * 0.0016
      let ay = (ty - p.y) * 0.0016
      // tangential swirl around the centre keeps orbits, not collapses
      const dx = p.x - cx
      const dy = p.y - cy
      ax += -dy * 0.0011 + drift(p.x * 0.01, p.y * 0.01, t) * 0.012
      ay += dx * 0.0011 + drift(p.y * 0.01, p.x * 0.01, t + 9) * 0.012
      // cursor: a temporary seventh pole
      if (ptr.active > 0.01) {
        const px = ptr.x - p.x
        const py = ptr.y - p.y
        const d2 = px * px + py * py + 600
        ax += (px / d2) * 26 * ptr.active
        ay += (py / d2) * 26 * ptr.active
      }
      // containment: a spring that switches on only past the horizon, so the
      // ribbons can never be drawn to (and clipped by) the card's edge
      const dist = Math.hypot(dx, dy)
      if (dist > RMAX) {
        const over = (dist - RMAX) / RMAX
        ax -= (dx / dist) * over * 0.55
        ay -= (dy / dist) * over * 0.55
      }
      const ox = p.x
      const oy = p.y
      p.vx = (p.vx + ax) * 0.985
      p.vy = (p.vy + ay) * 0.985
      const sp = Math.hypot(p.vx, p.vy)
      if (sp > 1.7) {
        p.vx *= 1.7 / sp
        p.vy *= 1.7 / sp
      }
      p.x += p.vx
      p.y += p.vy
      ctx.strokeStyle = mix(cyan, indigo, p.blend)
      ctx.globalAlpha = 0.45
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(ox, oy)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
}

/* ── movement III · Logic Lattice ─────────────────────────────────────────── */
function makeLattice(w: number, h: number, rng: () => number) {
  const step = Math.max(22, Math.min(w, h) / 12)
  const cols = Math.ceil(w / step) + 2
  const rows = Math.ceil(h / (step * 0.58)) + 2
  // node grid (isometric diamond offsets)
  const nodes: { x: number; y: number }[][] = []
  for (let r = 0; r < rows; r++) {
    nodes[r] = []
    for (let c = 0; c < cols; c++) {
      nodes[r][c] = { x: c * step + (r % 2 ? step / 2 : 0) - step / 2, y: r * step * 0.58 - step / 2 }
    }
  }
  // the solver path: a seeded march left → right, wandering rows. It is held in
  // the middle band of the plate so the bright thread never rides the top or
  // bottom edge (where the card would slice it in half).
  const loBand = Math.max(1, Math.floor(rows * 0.3))
  const hiBand = Math.min(rows - 2, Math.ceil(rows * 0.7))
  const path: [number, number][] = []
  let pr = Math.floor((loBand + hiBand) / 2 + (rng() - 0.5) * (hiBand - loBand) * 0.5)
  for (let c = 0; c < cols; c++) {
    path.push([pr, c])
    pr = Math.max(loBand, Math.min(hiBand, pr + (rng() < 0.5 ? -1 : 1) * (rng() < 0.6 ? 1 : 0)))
  }
  // decoy branches off the path
  const decoys = path
    .filter(() => rng() < 0.3)
    .map(([r, c]) => ({ r, c, dr: rng() < 0.5 ? -1 : 1, len: 1 + Math.floor(rng() * 3), phase: rng() * 10 }))
  const amber = "#f59e0b"
  const bright = "#fbbf24"

  const warped = (r: number, c: number, ptr: Ptr, t: number) => {
    const n = nodes[r]?.[c]
    if (!n) return { x: 0, y: 0 }
    let { x, y } = n
    x += drift(c * 0.7, r * 0.7, t * 0.3) * 1.6
    y += drift(r * 0.7, c * 0.7, t * 0.3 + 4) * 1.6
    if (ptr.active > 0.01) {
      const dx = x - ptr.x
      const dy = y - ptr.y
      const d = Math.hypot(dx, dy)
      const lens = Math.max(0, 1 - d / (step * 3.4))
      const k = lens * lens * step * 0.55 * ptr.active
      if (d > 0.01) {
        x += (dx / d) * k
        y += (dy / d) * k
      }
    }
    return { x, y }
  }

  return (ctx: CanvasRenderingContext2D, t: number, ptr: Ptr) => {
    ctx.fillStyle = "#17130a"
    ctx.fillRect(0, 0, w, h)
    // lattice lines (two neighbour directions → diamond mesh)
    ctx.lineWidth = 1
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols - 1; c++) {
        const a = warped(r, c, ptr, t)
        // a quieter mesh: at the old alpha the dense lattice averaged out to a
        // pale grey plate that broke the tonal run of the three cards
        const shimmer = 0.030 + 0.024 * (0.5 + 0.5 * Math.sin(r * 0.9 + c * 1.3 + t * 0.6))
        ctx.strokeStyle = "#e7e5e4"
        ctx.globalAlpha = shimmer
        const b = warped(r, c + 1, ptr, t)
        const d = warped(r + 1, c, ptr, t)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(d.x, d.y)
        ctx.stroke()
        // node
        ctx.globalAlpha = shimmer * 2.0
        ctx.fillStyle = "#e7e5e4"
        ctx.fillRect(a.x - 0.7, a.y - 0.7, 1.4, 1.4)
      }
    }
    // decoy branches — glow then decay
    for (const dcy of decoys) {
      const life = 0.5 + 0.5 * Math.sin(t * 0.7 + dcy.phase)
      ctx.strokeStyle = amber
      ctx.globalAlpha = 0.10 * life
      ctx.beginPath()
      for (let i = 0; i <= dcy.len; i++) {
        const p = warped(Math.max(0, Math.min(rows - 1, dcy.r + dcy.dr * i)), dcy.c, ptr, t)
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
      }
      ctx.stroke()
    }
    // the solved path, drawn progressively and forever re-tracing
    const progress = (t * 0.14) % 1.3
    const upto = Math.min(path.length - 1, Math.floor(progress * path.length))
    ctx.strokeStyle = bright
    ctx.lineWidth = 1.4
    ctx.globalAlpha = 0.75
    ctx.beginPath()
    for (let i = 0; i <= upto; i++) {
      const p = warped(path[i][0], path[i][1], ptr, t)
      i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
    }
    ctx.stroke()
    // head spark
    if (upto > 0 && upto < path.length) {
      const hp = warped(path[upto][0], path[upto][1], ptr, t)
      const g = ctx.createRadialGradient(hp.x, hp.y, 0, hp.x, hp.y, 14)
      g.addColorStop(0, "rgba(251,191,36,0.9)")
      g.addColorStop(1, "transparent")
      ctx.fillStyle = g
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(hp.x, hp.y, 14, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    // the lattice is meant to fill the plate, so instead of insetting it we
    // feather its border back to the ground — no hard cropped mesh at the edge
    vignette(ctx, w, h, "#17130a")
  }
}

/* ── the component ────────────────────────────────────────────────────────── */
export function TestArt({
  system,
  seedKey = "smc",
  interactive = true,
  className,
}: {
  system: ArtSystem
  seedKey?: string
  interactive?: boolean
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    let live = true
    let visible = true
    const ptr: Ptr = { x: -9999, y: -9999, active: 0 }
    let targetActive = 0
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let step: ((c: CanvasRenderingContext2D, t: number, p: Ptr) => void) | null = null
    let w = 0
    let h = 0

    const build = () => {
      const rect = canvas.getBoundingClientRect()
      if (rect.width < 4 || rect.height < 4) return
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      // skip no-op rebuilds — ResizeObserver fires an initial notification and
      // storms during window resize; the 60-frame priming loop must only run
      // when the size genuinely changed
      if (Math.round(rect.width) === w && Math.round(rect.height) === h && step) return
      w = Math.round(rect.width)
      h = Math.round(rect.height)
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const rng = mulberry32(hashSeed(`${system}:${seedKey}`))
      step =
        system === "personality" ? makeBloom(w, h, rng) : system === "interests" ? makeOrbits(w, h, rng) : makeLattice(w, h, rng)
      // prime the ground + accumulate so the first visible frame is already rich
      ctx.fillStyle = ART_META[system].ground
      ctx.fillRect(0, 0, w, h)
      for (let i = 0; i < (reduced ? 260 : 60); i++) step(ctx, i * 0.032, ptr)
    }

    const loop = (ms: number) => {
      if (!live) return
      if (visible && step) {
        ptr.active += (targetActive - ptr.active) * 0.06
        step(ctx, ms * 0.001, ptr)
      }
      raf = requestAnimationFrame(loop)
    }

    build()
    if (!reduced) raf = requestAnimationFrame(loop)

    const ro = new ResizeObserver(() => {
      build()
    })
    ro.observe(canvas)
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
    })
    io.observe(canvas)

    const onMove = (e: PointerEvent) => {
      if (!visible) return // offscreen plates don't chase the cursor
      const r = canvas.getBoundingClientRect()
      ptr.x = e.clientX - r.left
      ptr.y = e.clientY - r.top
      targetActive = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom ? 1 : 0
    }
    if (interactive && !reduced) window.addEventListener("pointermove", onMove, { passive: true })

    return () => {
      live = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener("pointermove", onMove)
    }
  }, [system, seedKey, interactive])

  return (
    <canvas
      ref={ref}
      aria-hidden
      className={cn("block h-full w-full", className)}
      style={{ background: ART_META[system].ground }}
    />
  )
}
