// ARTWORK 05 — "Close the skills gap."
// A level Newton's cradle: five equal pendulums, thin black cables, black-STROKE
// weights (no fill), resting still and touching. Pull an end weight and let go —
// it swings down and the momentum passes through the line so the far end lifts.
// Nothing moves until a hand disturbs it. Pure black on paper; real elastic
// collisions, damping, momentum — a museum installation, not a toy.
//
// Stability is engineered, not hoped for: angular speed and angle are hard-clamped
// (CAP_W / CLAMP_T) so nothing can loop or spin; the grabbed weight is kinematic with
// a low-passed, capped hand velocity; contacts resolve in horizontal-velocity space
// with restitution < 1 and bounded positional correction, so energy only ever leaves.
//
// Canvas2D. Lifecycle mirrors JourneyObject: IO-gated loop, reduced-motion still
// (one end weight held mid-arc), resize rebuild + repaint, full teardown. Zero
// per-frame allocation; DPR capped at 2.

import { useEffect, useRef } from "react"

const INK = "#0b0b0b"
const N = 5
const G_OVER_L = 15 // sets the swing period — lower = slower, heavier ball
const DAMP = 0.32 // gentle air resistance so a disturbance settles, never runs away
const REST = 0.985 // restitution — near-elastic clicks, a hair of energy lost each contact
const CAP_W = 6.5 // hard cap on angular speed (rad/s) — the governor that kills spinning
const CLAMP_T = 1.3 // max angle from vertical (~75°) — a weight can never loop over the top

type Bob = { theta: number; omega: number; px: number } // angle from vertical, ang. vel, pivot x

export function Art05Pendulum({ className = "" }: { className?: string }) {
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
    let W = 1, H = 1, topY = 0, L = 1, bobR = 1
    const bobs: Bob[] = Array.from({ length: N }, () => ({ theta: 0, omega: 0, px: 0 }))

    const layout = () => {
      W = Math.max(1, mount.clientWidth); H = Math.max(1, mount.clientHeight)
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr)
      bobR = Math.min(W, H) * 0.07
      L = H * 0.56
      topY = H * 0.15
      const span = (N - 1) * 2 * bobR
      const x0 = W / 2 - span / 2
      for (let i = 0; i < N; i++) bobs[i].px = x0 + i * 2 * bobR
    }
    layout()

    // ---- physics -------------------------------------------------------------
    let grabbed = -1
    let px = 0, py = 0 // pointer
    const clampT = (t: number) => (t > CLAMP_T ? CLAMP_T : t < -CLAMP_T ? -CLAMP_T : t)
    const clampW = (w: number) => (w > CAP_W ? CAP_W : w < -CAP_W ? -CAP_W : w)
    const cosV = (t: number) => Math.max(0.08, Math.cos(t)) // near-true cos for the vx↔ω map — keeps collisions energy-conserving
    const cosC = (t: number) => Math.max(0.4, Math.cos(t))  // firmer floor for positional separation — bounds the angle nudge
    const bobX = (b: Bob) => b.px + L * Math.sin(b.theta)
    const bobY = (b: Bob) => topY + L * Math.cos(b.theta)

    const step = (dt: number) => {
      // 1) the grabbed weight tracks the cursor, but GLIDES toward it (no teleport on an
      //    off-centre grab); its velocity is read from the ball's own motion, low-passed
      //    and capped — an unclamped delta/dt is what made it spin on release.
      if (grabbed >= 0) {
        const b = bobs[grabbed]
        const target = clampT(Math.atan2(px - b.px, Math.max(1, py - topY)))
        const prev = b.theta
        b.theta = prev + (target - prev) * Math.min(1, 16 * dt)
        b.omega = clampW(0.5 * b.omega + 0.5 * (b.theta - prev) / Math.max(dt, 1e-3))
      }
      // 2) integrate every free weight (semi-implicit Euler), then hard-clamp speed and angle.
      for (let i = 0; i < N; i++) {
        if (i === grabbed) continue
        const b = bobs[i]
        b.omega = clampW(b.omega + (-G_OVER_L * Math.sin(b.theta) - DAMP * b.omega) * dt)
        let th = b.theta + b.omega * dt
        if (th > CLAMP_T) { th = CLAMP_T; if (b.omega > 0) b.omega = 0 }
        else if (th < -CLAMP_T) { th = -CLAMP_T; if (b.omega < 0) b.omega = 0 }
        b.theta = th
      }
      // 3) resolve contacts. Iterate a few times so a whole chain transfers in one substep,
      //    but each pass only acts on a genuinely-overlapping, genuinely-closing pair — so it
      //    converges instead of pumping energy in. Collisions are resolved in horizontal
      //    velocity space (vx = L·cosθ·ω), the physically correct axis for equal-mass balls.
      for (let it = 0; it < 6; it++) {
        let touched = false
        for (let i = 0; i < N - 1; i++) {
          const a = bobs[i], c = bobs[i + 1]
          const overlap = 2 * bobR - (bobX(c) - bobX(a))
          if (overlap <= 0.2) continue
          const aG = i === grabbed, cG = i + 1 === grabbed
          const va = L * cosV(a.theta) * a.omega
          const vc = L * cosV(c.theta) * c.omega
          if (va > vc) { // approaching — a is catching up to c
            if (!aG && !cG) { // equal-mass 1-D collision with restitution, then map vx→ω
              const va2 = ((1 - REST) * va + (1 + REST) * vc) / 2
              const vc2 = ((1 + REST) * va + (1 - REST) * vc) / 2
              a.omega = clampW(va2 / (L * cosV(a.theta)))
              c.omega = clampW(vc2 / (L * cosV(c.theta)))
            } else if (aG) c.omega = clampW(va / (L * cosV(c.theta))) // driven end shoves its neighbour
            else a.omega = clampW(vc / (L * cosV(a.theta)))
          }
          // positional separation so they only ever touch — split between the free weights,
          // never applied to a grabbed (kinematic) one. Tiny per pass, so it can't blow up.
          const half = overlap / (2 * L)
          if (!aG) a.theta = clampT(a.theta - (cG ? overlap / L : half) / cosC(a.theta))
          if (!cG) c.theta = clampT(c.theta + (aG ? overlap / L : half) / cosC(c.theta))
          touched = true
        }
        if (!touched) break
      }
    }

    // ---- draw ------------------------------------------------------------------
    const draw = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, W, H)
      ctx.lineCap = "round"; ctx.lineJoin = "round"
      const bx0 = bobs[0].px, bx1 = bobs[N - 1].px
      // level beam
      ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1.4, bobR * 0.06)
      ctx.beginPath(); ctx.moveTo(bx0 - bobR * 1.4, topY); ctx.lineTo(bx1 + bobR * 1.4, topY); ctx.stroke()
      for (let i = 0; i < N; i++) {
        const b = bobs[i]
        const x = bobX(b), y = bobY(b)
        // cable — stop at the top edge of the weight, not its centre
        const ex = x - Math.sin(b.theta) * bobR, ey = y - Math.cos(b.theta) * bobR
        ctx.strokeStyle = INK; ctx.lineWidth = Math.max(1, 1.1)
        ctx.beginPath(); ctx.moveTo(b.px, topY); ctx.lineTo(ex, ey); ctx.stroke()
        // pivot pin
        ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(b.px, topY, Math.max(1.4, bobR * 0.07), 0, Math.PI * 2); ctx.fill()
        // weight — black stroke, no fill
        ctx.lineWidth = Math.max(1.5, bobR * 0.11)
        ctx.beginPath(); ctx.arc(x, y, bobR - ctx.lineWidth / 2, 0, Math.PI * 2); ctx.stroke()
      }
    }

    // ---- loop / lifecycle ------------------------------------------------------
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0, running = false, last = 0
    const frame = (t: number) => {
      raf = requestAnimationFrame(frame)
      const dt = Math.min((t - last) / 1000 || 0.016, 0.024)
      last = t
      step(dt * 0.5); step(dt * 0.5) // sub-step for stable collisions
      draw()
    }
    const still = () => { bobs.forEach((b) => { b.theta = 0; b.omega = 0 }); bobs[0].theta = -0.55; draw() }
    const start = () => { if (running) return; running = true; if (reduce) still(); else { last = performance.now(); raf = requestAnimationFrame(frame) } }
    const stop = () => { running = false; cancelAnimationFrame(raf) }
    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { threshold: 0.05 })
    io.observe(mount)

    // ---- pointer ---------------------------------------------------------------
    const toLocal = (e: PointerEvent) => { const r = mount.getBoundingClientRect(); px = e.clientX - r.left; py = e.clientY - r.top }
    const onDown = (e: PointerEvent) => {
      toLocal(e)
      let best = -1, bd = bobR * 1.7
      for (let i = 0; i < N; i++) { const d = Math.hypot(px - bobX(bobs[i]), py - bobY(bobs[i])); if (d < bd) { bd = d; best = i } }
      if (best < 0) return
      grabbed = best
      bobs[best].omega = 0 // reset velocity so the glide toward the cursor starts clean
      mount.style.cursor = "grabbing"
      try { mount.setPointerCapture(e.pointerId) } catch { /* synthetic */ }
    }
    const onMove = (e: PointerEvent) => { if (grabbed >= 0) toLocal(e) }
    const onUp = (e: PointerEvent) => { grabbed = -1; mount.style.cursor = "grab"; try { mount.releasePointerCapture(e.pointerId) } catch { /* not captured */ } }
    mount.addEventListener("pointerdown", onDown)
    mount.addEventListener("pointermove", onMove)
    mount.addEventListener("pointerup", onUp)
    mount.addEventListener("pointercancel", onUp)

    const onResize = () => { layout(); if (!running || reduce) { reduce ? still() : draw() } }
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
