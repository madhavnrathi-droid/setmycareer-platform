// Artwork 06 — "A direction, not a default"
// A heavy, engraved ink compass. The dial — bezel rings, 2° ticks, degree
// numerals, serif cardinals, a faint rosette — is engraved ONCE onto an
// offscreen canvas. The needle is a real rigid body: an angular spring pulls
// it toward the cursor's bearing while the cursor is inside ~1.35× the dial
// radius (low stiffness, moderate damping — it overshoots once and settles);
// when the hand withdraws it swings slowly home to true north. A glass-cover
// highlight drifts opposite the cursor. The centre jewel is the single purple
// accent. Idle: the needle breathes ±1.5° around north on slow layered sines.
// Canvas2D, transparent over paper #faf9f6. Zero allocations in the loop.

import { useEffect, useRef } from "react"

const TAU = Math.PI * 2
const DEG = Math.PI / 180
const INK = "#0b0b0b"
const ACCENT = "#5b28b8"
const MONO = '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace'
const SERIF = '"IBM Plex Serif", Georgia, "Times New Roman", serif'

/** Wrap an angle to (-π, π] so the spring always takes the short way round. */
function wrapPi(a: number): number {
  while (a > Math.PI) a -= TAU
  while (a < -Math.PI) a += TAU
  return a
}

/** Tiny seeded PRNG — the grain is chance you can notice, but deterministic. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let z = Math.imul(s ^ (s >>> 15), 1 | s)
    z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296
  }
}

export function Art06Compass({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const canvas = document.createElement("canvas")
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    mount.appendChild(canvas)

    const dial = document.createElement("canvas")
    const dctx = dial.getContext("2d")
    if (!dctx) {
      mount.removeChild(canvas)
      return
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // ---- geometry (recomputed on resize) --------------------------------
    let dpr = Math.min(window.devicePixelRatio || 1, 2)
    let w = 1
    let h = 1
    let cx = 0
    let cy = 0
    let R = 1
    let hair = 1 // one device pixel expressed in CSS units

    // ---- simulation state (all scalars — nothing allocates per frame) ---
    let theta = 0 // needle bearing, rad; 0 = true north (up)
    let omega = 0 // angular velocity, rad/s
    let engage = 0 // 0 = free / homing, 1 = held by the cursor
    let hOff = 0 // glass-highlight angular offset, rad
    let t = 0 // simulation clock, s
    let px = 0 // pointer, CSS px relative to dial centre
    let py = 0
    let pIn = false

    // ---- the engraving pass (runs once per size, never in the loop) -----
    const buildDial = () => {
      const g = dctx
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.clearRect(0, 0, w, h)
      g.lineCap = "butt"
      g.textAlign = "center"
      g.textBaseline = "middle"

      const ring = (r: number, style: string, lw: number) => {
        g.strokeStyle = style
        g.lineWidth = lw
        g.beginPath()
        g.arc(cx, cy, r, 0, TAU)
        g.stroke()
      }

      // bezel — concentric hairlines, the instrument's rim
      ring(R, "rgba(11,11,11,0.78)", 1.4 * hair)
      ring(R * 0.982, "rgba(11,11,11,0.28)", hair)
      ring(R * 0.952, "rgba(11,11,11,0.34)", hair)
      ring(R * 0.845, "rgba(11,11,11,0.22)", hair)
      ring(R * 0.585, "rgba(11,11,11,0.20)", hair)
      ring(R * 0.30, "rgba(11,11,11,0.14)", hair)
      ring(R * 0.12, "rgba(11,11,11,0.45)", hair)

      // tick ring — every 2°, majors every 10°, longest every 30°
      const tickPass = (mod: number, skip: number, len: number, alpha: number, lw: number) => {
        g.strokeStyle = `rgba(11,11,11,${alpha})`
        g.lineWidth = lw
        g.beginPath()
        for (let d = 0; d < 360; d += 2) {
          if (d % mod !== 0) continue
          if (skip > 0 && d % skip === 0) continue
          const sa = Math.sin(d * DEG)
          const ca = Math.cos(d * DEG)
          const r1 = R * 0.948
          const r0 = r1 - len
          g.moveTo(cx + sa * r1, cy - ca * r1)
          g.lineTo(cx + sa * r0, cy - ca * r0)
        }
        g.stroke()
      }
      tickPass(2, 10, R * 0.038, 0.3, hair) // minors
      tickPass(10, 30, R * 0.068, 0.7, hair) // majors
      tickPass(30, 0, R * 0.098, 0.85, 1.4 * hair) // 30° marks

      // degree numerals every 30°, rotated to face outward — faint mono
      g.font = `400 ${Math.max(6, R * 0.052)}px ${MONO}`
      g.fillStyle = "rgba(11,11,11,0.42)"
      for (let d = 0; d < 360; d += 30) {
        g.save()
        g.translate(cx, cy)
        g.rotate(d * DEG)
        g.fillText(String(d), 0, -R * 0.792)
        g.restore()
      }

      // cardinals — small engraved serif letters
      g.font = `500 ${Math.max(8, R * 0.088)}px ${SERIF}`
      const cards = ["N", "E", "S", "W"]
      for (let i = 0; i < 4; i++) {
        g.save()
        g.translate(cx, cy)
        g.rotate(i * 90 * DEG)
        g.fillStyle = i === 0 ? "rgba(11,11,11,0.95)" : "rgba(11,11,11,0.72)"
        g.fillText(cards[i] as string, 0, -R * 0.66)
        g.restore()
      }
      // intercardinals — smaller, fainter
      g.font = `400 ${Math.max(5, R * 0.042)}px ${SERIF}`
      g.fillStyle = "rgba(11,11,11,0.34)"
      const inters = ["NE", "SE", "SW", "NW"]
      for (let i = 0; i < 4; i++) {
        g.save()
        g.translate(cx, cy)
        g.rotate((45 + i * 90) * DEG)
        g.fillText(inters[i] as string, 0, -R * 0.66)
        g.restore()
      }

      // rosette — eight engraved points beneath the needle, alternating length
      for (let i = 0; i < 8; i++) {
        const long = i % 2 === 0
        const L = long ? R * 0.545 : R * 0.355
        const hw = long ? R * 0.040 : R * 0.028
        g.save()
        g.translate(cx, cy)
        g.rotate(i * 45 * DEG)
        // shaded half (engraved fill)
        g.beginPath()
        g.moveTo(0, -L)
        g.lineTo(-hw, 0)
        g.lineTo(0, 0)
        g.closePath()
        g.fillStyle = "rgba(11,11,11,0.07)"
        g.fill()
        // outline of the full point
        g.beginPath()
        g.moveTo(-hw, 0)
        g.lineTo(0, -L)
        g.lineTo(hw, 0)
        g.strokeStyle = "rgba(11,11,11,0.26)"
        g.lineWidth = hair
        g.stroke()
        g.restore()
      }

      // grain — near-subliminal, seeded, static
      const rng = mulberry32(0x5e7c)
      g.fillStyle = "rgba(11,11,11,0.05)"
      for (let i = 0; i < 640; i++) {
        const rr = Math.sqrt(rng()) * R * 0.94
        const aa = rng() * TAU
        g.fillRect(cx + Math.cos(aa) * rr, cy + Math.sin(aa) * rr, hair, hair)
      }
    }

    const sizeTo = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = Math.max(1, mount.clientWidth)
      h = Math.max(1, mount.clientHeight)
      canvas.width = Math.max(1, Math.round(w * dpr))
      canvas.height = Math.max(1, Math.round(h * dpr))
      dial.width = canvas.width
      dial.height = canvas.height
      cx = w / 2
      cy = h / 2
      R = Math.min(w, h) * 0.46
      hair = 1 / dpr
      buildDial()
    }
    sizeTo()

    // ---- per-frame draw (dial blit + needle + jewel + glass) ------------
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(dial, 0, 0, w, h)

      // needle — classic two-tone kite with counterweight
      const Ln = R * 0.68
      const Ls = R * 0.50
      const wN = R * 0.045
      const wS = R * 0.036
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(theta)
      // north, shadow facet (right half) — faint fill, hairline edge
      ctx.beginPath()
      ctx.moveTo(0, -Ln)
      ctx.lineTo(wN, -R * 0.02)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fillStyle = "rgba(11,11,11,0.18)"
      ctx.fill()
      ctx.strokeStyle = "rgba(11,11,11,0.55)"
      ctx.lineWidth = hair
      ctx.stroke()
      // north, lit facet (left half) — solid ink
      ctx.beginPath()
      ctx.moveTo(0, -Ln)
      ctx.lineTo(-wN, -R * 0.02)
      ctx.lineTo(0, 0)
      ctx.closePath()
      ctx.fillStyle = INK
      ctx.fill()
      // south half — outline only, the tail
      ctx.beginPath()
      ctx.moveTo(0, Ls)
      ctx.lineTo(-wS, R * 0.02)
      ctx.lineTo(0, 0)
      ctx.lineTo(wS, R * 0.02)
      ctx.closePath()
      ctx.fillStyle = "rgba(11,11,11,0.06)"
      ctx.fill()
      ctx.strokeStyle = "rgba(11,11,11,0.5)"
      ctx.lineWidth = hair
      ctx.stroke()
      // tail spine + counterweight
      ctx.beginPath()
      ctx.moveTo(0, R * 0.02)
      ctx.lineTo(0, Ls)
      ctx.strokeStyle = "rgba(11,11,11,0.35)"
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, Ls * 0.62, R * 0.032, 0, TAU)
      ctx.fillStyle = "rgba(11,11,11,0.10)"
      ctx.fill()
      ctx.strokeStyle = "rgba(11,11,11,0.65)"
      ctx.lineWidth = 1.2 * hair
      ctx.stroke()
      ctx.restore()

      // hub + centre jewel — the one purple in the system
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.075, 0, TAU)
      ctx.fillStyle = "rgba(11,11,11,0.06)"
      ctx.fill()
      ctx.strokeStyle = "rgba(11,11,11,0.5)"
      ctx.lineWidth = hair
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.042, 0, TAU)
      ctx.fillStyle = ACCENT
      ctx.fill()
      ctx.strokeStyle = "rgba(11,11,11,0.85)"
      ctx.lineWidth = 1.2 * hair
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(cx - R * 0.013, cy - R * 0.015, R * 0.010, 0, TAU)
      ctx.fillStyle = "rgba(255,255,255,0.75)"
      ctx.fill()

      // glass cover — one soft arc highlight + a faint sweep, both neutral
      const hA = -2.35 + hOff
      ctx.lineCap = "round"
      ctx.strokeStyle = "rgba(255,255,255,0.45)"
      ctx.lineWidth = R * 0.045
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.885, hA - 0.26, hA + 0.26)
      ctx.stroke()
      ctx.strokeStyle = "rgba(255,255,255,0.10)"
      ctx.lineWidth = R * 0.16
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.47, hA + 2.5, hA + 3.45)
      ctx.stroke()
      ctx.strokeStyle = "rgba(255,255,255,0.20)"
      ctx.lineWidth = R * 0.03
      ctx.beginPath()
      ctx.arc(cx, cy, R * 0.885, hA + Math.PI - 0.14, hA + Math.PI + 0.14)
      ctx.stroke()
      ctx.lineCap = "butt"
    }

    // ---- physics — semi-implicit Euler on an angular spring --------------
    const step = (dt: number) => {
      t += dt
      const dist = Math.hypot(px, py)
      const inR = pIn && dist <= R * 1.35
      // engagement eases the constants between "held" and "homing" so the
      // release is graceful, never a snap
      engage += ((inR ? 1 : 0) - engage) * Math.min(1, dt * 3.5)
      // idle breath: ±1.5° of layered slow sines around true north
      const idle =
        (Math.sin(t * 0.31) * 0.6 + Math.sin(t * 0.73 + 1.7) * 0.3 + Math.sin(t * 1.21 + 4.0) * 0.1) * 0.0262
      const target = inR ? Math.atan2(px, -py) : idle
      const k = 3.1 + (16.5 - 3.1) * engage // spring, s^-2 — low: heavy
      const c = 3.0 + (4.7 - 3.0) * engage // damping, s^-1 — one overshoot
      omega += (k * wrapPi(target - theta) - c * omega) * dt
      theta += omega * dt
      // glass highlight drifts opposite the hand; breathes alone otherwise
      const lim = R * 1.35
      const pxN = inR ? Math.max(-1, Math.min(1, px / lim)) : 0
      const pyN = inR ? Math.max(-1, Math.min(1, py / lim)) : 0
      const hT = inR ? -pxN * 0.42 - pyN * 0.2 : Math.sin(t * 0.13) * 0.07
      hOff += (hT - hOff) * Math.min(1, dt * 3.0)
    }

    // ---- lifecycle (mirrors JourneyObject) -------------------------------
    let raf = 0
    let running = false
    let last = 0
    let disposed = false

    const frame = (now: number) => {
      const dt = Math.min(0.033, Math.max(0.001, (now - last) / 1000))
      last = now
      step(dt)
      draw()
      raf = requestAnimationFrame(frame)
    }
    const still = () => {
      theta = 0
      omega = 0
      hOff = 0
      draw()
    }
    const start = () => {
      if (running) return
      running = true
      if (reduce) {
        still()
        return
      }
      last = performance.now()
      raf = requestAnimationFrame(frame)
    }
    const stop = () => {
      running = false
      cancelAnimationFrame(raf)
    }

    // first paint so the instrument is present before IO fires
    still()

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0]
        if (!e) return
        if (e.isIntersecting) start()
        else stop()
      },
      { threshold: 0.05 },
    )
    io.observe(mount)

    // resizing clears the buffer; repaint the still frame on non-looping paths
    const onResize = () => {
      sizeTo()
      if (!running || reduce) still()
    }
    window.addEventListener("resize", onResize)

    // the cursor is a force — hover only, so touch scrolling stays free
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect()
      px = e.clientX - r.left - cx
      py = e.clientY - r.top - cy
      pIn = true
    }
    const onLeave = () => {
      pIn = false
    }
    mount.addEventListener("pointermove", onMove)
    mount.addEventListener("pointerleave", onLeave)
    mount.addEventListener("pointercancel", onLeave)

    // re-engrave once webfonts arrive (serif cardinals, mono numerals)
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          if (disposed) return
          buildDial()
          if (!running || reduce) still()
        })
        .catch(() => {})
    }

    return () => {
      disposed = true
      stop()
      io.disconnect()
      window.removeEventListener("resize", onResize)
      mount.removeEventListener("pointermove", onMove)
      mount.removeEventListener("pointerleave", onLeave)
      mount.removeEventListener("pointercancel", onLeave)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
      canvas.width = 0
      canvas.height = 0
      dial.width = 0
      dial.height = 0
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden />
}
