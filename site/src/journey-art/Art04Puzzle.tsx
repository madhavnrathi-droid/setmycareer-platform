// ARTWORK 04 — "Fit first, brand second."
// Four classic jigsaw pieces lie scattered. Drag each one; near its own place it
// pulls in and snaps with a soft settle. When the four seat, a purple compass
// needle fades in at the centre — the fit, found. Cursor is a force: grab, carry,
// release. Monochrome ink on paper, one purple accent; hairline joins.
//
// Canvas2D. Lifecycle mirrors JourneyObject: IO-gated loop, reduced-motion still
// (assembled, one piece ajar), resize rebuild + repaint, full teardown. Zero
// per-frame allocation; DPR capped at 2.

import { useEffect, useRef } from "react"


type Piece = {
  path: Path2D
  hx: number; hy: number      // home (slot) centre
  x: number; y: number; vx: number; vy: number
  sx: number; sy: number      // scatter rest
  ph: number
  snapped: boolean
}

export function Art04Puzzle({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    canvas.style.display = "block"
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    mount.style.touchAction = "none"
    mount.style.cursor = "grab"
    mount.appendChild(canvas)

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let W = 1, H = 1, CX = 0, CY = 0, cs = 100
    const pieces: Piece[] = []
    let z: number[] = []
    let snappedSet = new Set<number>()
    let simT = 0

    // a classic jigsaw edge from (ax,ay)→(bx,by); outward normal (nx,ny); tab: +1 knob out, -1 notch in, 0 flat
    const edge = (p: Path2D, ax: number, ay: number, bx: number, by: number, nx: number, ny: number, tab: number, knob: number) => {
      if (!tab) { p.lineTo(bx, by); return }
      const ux = bx - ax, uy = by - ay
      const A = (t: number, s: number): [number, number] => [ax + ux * t + nx * knob * s, ay + uy * t + ny * knob * s]
      p.lineTo(...A(0.36, 0))
      const [x1, y1] = A(0.30, 1.05 * tab), [x2, y2] = A(0.30, 1.75 * tab), [x3, y3] = A(0.50, 1.75 * tab)
      p.bezierCurveTo(x1, y1, x2, y2, x3, y3)
      const [x4, y4] = A(0.70, 1.75 * tab), [x5, y5] = A(0.70, 1.05 * tab), [x6, y6] = A(0.64, 0)
      p.bezierCurveTo(x4, y4, x5, y5, x6, y6)
      p.lineTo(...A(1, 0))
    }
    // build a piece (centred at 0,0) with edge tabs [T,R,B,L]
    const buildPiece = (T: number, R: number, B: number, L: number): Path2D => {
      const h = cs / 2, k = cs * 0.15
      const p = new Path2D()
      p.moveTo(-h, -h)
      edge(p, -h, -h, h, -h, 0, -1, T, k)   // top,   outward up
      edge(p, h, -h, h, h, 1, 0, R, k)       // right, outward right
      edge(p, h, h, -h, h, 0, 1, B, k)       // bottom,outward down
      edge(p, -h, h, -h, -h, -1, 0, L, k)    // left,  outward left
      p.closePath()
      return p
    }

    const build = () => {
      W = Math.max(1, mount.clientWidth); H = Math.max(1, mount.clientHeight)
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      CX = W / 2; CY = H / 2
      cs = Math.min(W, H) * 0.27
      // complementary 2×2 tabs (seams: col0.R↔col1.L, row0.B↔row1.T)
      const specs = [
        { r: 0, c: 0, T: 0, R: 1, B: 1, L: 0 },
        { r: 0, c: 1, T: 0, R: 0, B: 1, L: -1 },
        { r: 1, c: 0, T: -1, R: 1, B: 0, L: 0 },
        { r: 1, c: 1, T: -1, R: 0, B: 0, L: -1 },
      ]
      const prev = snappedSet
      pieces.length = 0
      specs.forEach((s, i) => {
        const hx = CX + (s.c - 0.5) * cs, hy = CY + (s.r - 0.5) * cs
        // scatter to four corners, seeded by index
        const ang = Math.PI / 4 + (i * Math.PI) / 2
        const rad = cs * 1.35
        const sx = Math.max(-CX + cs * 0.62, Math.min(CX - cs * 0.62, Math.cos(ang) * rad))
        const sy = Math.max(-CY + cs * 0.62, Math.min(CY - cs * 0.62, Math.sin(ang) * rad))
        const snapped = prev.has(i)
        pieces.push({
          path: buildPiece(s.T, s.R, s.B, s.L),
          hx, hy,
          x: snapped ? hx : CX + sx, y: snapped ? hy : CY + sy,
          vx: 0, vy: 0, sx: CX + sx, sy: CY + sy, ph: i * 1.7, snapped,
        })
      })
      z = pieces.map((_, i) => i)
    }
    build()

    // ---- physics -------------------------------------------------------------
    let grabbed = -1, gdx = 0, gdy = 0, px = 0, py = 0

    const step = (dt: number) => {
      simT += dt
      const snapR = cs * 0.45
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i]
        if (p.snapped) continue
        let tx: number, ty: number, k: number, c: number
        if (i === grabbed) { tx = px - gdx; ty = py - gdy; k = 170; c = 24 }
        else {
          const near = Math.hypot(p.x - p.hx, p.y - p.hy) < snapR
          if (near) { tx = p.hx; ty = p.hy; k = 70; c = 13 }                       // its slot pulls it home
          else { tx = p.sx + Math.sin(simT * 0.55 + p.ph) * 5; ty = p.sy + Math.cos(simT * 0.48 + p.ph) * 4; k = 6; c = 3.6 } // idle bob
        }
        p.vx += (k * (tx - p.x) - c * p.vx) * dt
        p.vy += (k * (ty - p.y) - c * p.vy) * dt
        p.x += p.vx * dt; p.y += p.vy * dt
        if (i !== grabbed && Math.hypot(p.x - p.hx, p.y - p.hy) < cs * 0.07 && Math.hypot(p.vx, p.vy) < 40) {
          p.snapped = true; p.x = p.hx; p.y = p.hy; p.vx = p.vy = 0; snappedSet.add(i)
        }
      }
    }

    // ---- draw ------------------------------------------------------------------
    const drawPiece = (p: Piece, seated: boolean) => {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.fillStyle = seated ? "rgba(11,11,11,0.05)" : "rgba(11,11,11,0.03)"
      ctx.fill(p.path)
      ctx.strokeStyle = seated ? "rgba(11,11,11,0.85)" : "rgba(11,11,11,0.6)"
      ctx.lineWidth = seated ? 1.4 : 1.1
      ctx.lineJoin = "round"
      ctx.stroke(p.path)
      ctx.restore()
    }

    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      for (const i of z) if (pieces[i].snapped) drawPiece(pieces[i], true)
      for (const i of z) if (!pieces[i].snapped && i !== grabbed) drawPiece(pieces[i], false)
      if (grabbed >= 0 && !pieces[grabbed].snapped) drawPiece(pieces[grabbed], false)
    }

    // ---- loop / lifecycle ------------------------------------------------------
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0, running = false, last = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((t - last) / 1000 || 0.016, 0.033); last = t
      step(dt); draw()
    }
    const still = () => {
      snappedSet = new Set([0, 2, 3]); pieces.forEach((p) => { p.snapped = true; p.x = p.hx; p.y = p.hy })
      pieces[1].snapped = false; pieces[1].x += cs * 0.5; pieces[1].y -= cs * 0.35; draw()
    }
    const start = () => { if (running) return; running = true; if (reduce) still(); else { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const stop = () => { running = false; cancelAnimationFrame(raf) }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.05 })
    io.observe(mount)

    // ---- pointer ---------------------------------------------------------------
    const toLocal = (e: PointerEvent) => { const r = mount.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top }
    const hit = (): number => {
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      for (let k = z.length - 1; k >= 0; k--) {
        const i = z[k]; const p = pieces[i]
        if (p.snapped) continue
        if (ctx.isPointInPath(p.path, px - p.x, py - p.y)) return i
      }
      return -1
    }
    const onDown = (e: PointerEvent) => {
      toLocal(e)
      const i = hit(); if (i < 0) return
      grabbed = i; gdx = px - pieces[i].x; gdy = py - pieces[i].y
      z.splice(z.indexOf(i), 1); z.push(i)
      mount.style.cursor = "grabbing"
      try { mount.setPointerCapture(e.pointerId) } catch { /* synthetic */ }
    }
    const onMove = (e: PointerEvent) => { if (grabbed >= 0) toLocal(e) }
    const onUp = (e: PointerEvent) => { grabbed = -1; mount.style.cursor = "grab"; try { mount.releasePointerCapture(e.pointerId) } catch { /* not captured */ } }
    mount.addEventListener("pointerdown", onDown)
    mount.addEventListener("pointermove", onMove)
    mount.addEventListener("pointerup", onUp)
    mount.addEventListener("pointercancel", onUp)

    const onResize = () => { build(); if (!running || reduce) { reduce ? still() : draw() } }
    window.addEventListener("resize", onResize)

    return () => {
      stop(); io.disconnect(); window.removeEventListener("resize", onResize)
      mount.removeEventListener("pointerdown", onDown)
      mount.removeEventListener("pointermove", onMove)
      mount.removeEventListener("pointerup", onUp)
      mount.removeEventListener("pointercancel", onUp)
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas)
    }
  }, [])

  return <div ref={mountRef} className={className} aria-hidden />
}
