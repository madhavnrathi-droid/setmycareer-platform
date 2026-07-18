import { useEffect, useRef } from 'react'

/**
 * Watercolor voice blob — an organic, layered form that swells and shimmers
 * with the speaker's voice. Three translucent Monet-blue layers drift out of
 * phase; two koi dots orbit faster when energy rises. Painterly, not rigid.
 */
export default function VoiceBlob({ bands = [0, 0, 0, 0, 0], level = 0 }) {
  const ref = useRef(null)
  const stateRef = useRef({ bands, level })
  stateRef.current = { bands, level }

  useEffect(() => {
    const cv = ref.current
    const ctx = cv.getContext('2d')
    let raf
    const PTS = 10
    // per-point smoothed energy
    const smooth = new Array(PTS).fill(0)

    const layer = (t, R, pts, color, phase, wobble) => {
      ctx.beginPath()
      const xy = []
      for (let i = 0; i < PTS; i++) {
        const a = (i / PTS) * Math.PI * 2 + phase
        const r = R * (1 + pts[i] * 0.30 + Math.sin(t * 0.0011 + i * 1.7 + phase * 3) * wobble)
        xy.push([Math.cos(a) * r, Math.sin(a) * r])
      }
      // smooth closed curve through midpoints
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
      let m = mid(xy[PTS - 1], xy[0])
      ctx.moveTo(m[0], m[1])
      for (let i = 0; i < PTS; i++) {
        const next = xy[(i + 1) % PTS]
        const m2 = mid(xy[i], next)
        ctx.quadraticCurveTo(xy[i][0], xy[i][1], m2[0], m2[1])
      }
      ctx.closePath()
      ctx.fillStyle = color
      ctx.fill()
    }

    const draw = (t) => {
      raf = requestAnimationFrame(draw)
      const { bands: b, level: lv } = stateRef.current
      const W = (cv.width = cv.clientWidth * 2)
      const H = (cv.height = cv.clientHeight * 2)
      ctx.clearRect(0, 0, W, H)
      ctx.save()
      ctx.translate(W / 2, H / 2)

      // map 5 bands onto 10 points (mirrored, so the form stays balanced)
      for (let i = 0; i < PTS; i++) {
        const target = b[i < 5 ? i : 9 - i] || 0
        smooth[i] += (target - smooth[i]) * 0.18
      }
      const R = Math.min(W, H) * 0.27 * (1 + lv * 0.06)

      layer(t, R * 1.22, smooth, 'rgba(167, 212, 228, 0.45)', 0.9, 0.05)
      layer(t, R * 1.10, smooth, 'rgba(167, 212, 228, 0.7)', 2.1, 0.04)
      layer(t, R, smooth, 'rgba(18, 53, 78, 0.96)', 0, 0.025)

      // koi companions — orbit quickens with the voice
      const orbit = R * 1.34
      for (const [seed, sz] of [[0, 5.5], [Math.PI * 0.9, 3.5]]) {
        const sp = t * (0.00045 + lv * 0.0011) + seed
        ctx.beginPath()
        ctx.arc(Math.cos(sp) * orbit, Math.sin(sp) * orbit * 0.92, sz * 2, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(167, 212, 228, 1)'
        ctx.fill()
      }
      ctx.restore()
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas ref={ref} className="blob-canvas" aria-hidden="true" />
}
