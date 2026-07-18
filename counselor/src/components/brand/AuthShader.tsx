// AuthShader — the animated artwork plate behind each sign-in door's brand copy.
// A direct port of the marketing site's PackageGradient engine (the 2026 product-
// card look): domain-warped fbm "liquid colour" pooling over the palette's own
// darkest tone, a whisper of film grain, an optional metallic sheen, and a cursor
// pull — premium, never busy. One instance per page, full-bleed inside a rounded
// plate. Reduced motion → a composed still frame. WebGL dead → a palette-matched
// CSS gradient, never a blank box.

import { useEffect, useRef, useState } from "react"

const FRAG = `
precision mediump float;
uniform float u_t;
uniform vec2 u_r;
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform float u_warp;
uniform vec2 u_ph;
uniform float u_cr;
uniform float u_sr;
uniform vec2 u_m;
uniform float u_ma;
uniform vec3 u_bg;
uniform float u_metal;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x),
             mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * n(p); p = p * 2.03 + 11.17; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_r) / min(u_r.x, u_r.y);
  vec2 p = mat2(u_cr, -u_sr, u_sr, u_cr) * uv * 1.7 + u_ph;
  float t = u_t;
  vec2 q = vec2(fbm(p + vec2(t * 0.055, -t * 0.040)),
                fbm(p + vec2(4.7, 9.2) + vec2(-t * 0.035, t * 0.050)));
  vec2 dm = u_m - uv;
  float pull = u_ma * smoothstep(0.85, 0.0, length(dm));
  float f = fbm(p + u_warp * (q - 0.5) * 2.6 + dm * pull * 0.9 + vec2(t * 0.020, -t * 0.030));
  vec3 col = u_bg;
  col = mix(col, u_c0 * 0.96, smoothstep(0.22, 0.88, f));
  col = mix(col, u_c1 * 1.00, smoothstep(0.34, 0.96, q.x) * 0.85);
  col = mix(col, u_c2 * 1.02, smoothstep(0.50, 1.00, q.y * 0.7 + f * 0.45) * 0.72);
  col += pull * 0.10 * (u_c1 + u_c2) * 0.5;
  float spec = pow(smoothstep(0.55, 1.0, f), 4.0);
  vec3 metal = mix(col, mix(u_c2, vec3(1.0), 0.55), spec * 0.55);
  float sheen = smoothstep(0.30, 0.72, q.x) * (1.0 - smoothstep(0.72, 1.0, q.x));
  metal += sheen * 0.10;
  metal = (metal - 0.5) * 1.12 + 0.52;
  col = mix(col, metal, u_metal);
  col *= 0.98 - 0.14 * dot(uv, uv);
  col += (h(gl_FragCoord.xy + vec2(fract(t * 3.7) * 31.0)) - 0.5) * mix(0.035, 0.06, u_metal);
  gl_FragColor = vec4(col, 1.0);
}`

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

const hexRgb = (c: string): [number, number, number] => {
  const v = parseInt(c.slice(1), 16)
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255]
}
const rgba = (c: string, a: number): string => {
  const [r, g, b] = hexRgb(c)
  return `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, ${a})`
}
// resting depth: the palette's own darkest colour, luminance-capped — coloured
// light instead of a black hole
const baseTone = (p: [string, string, string]): [number, number, number] => {
  const rgbs = p.map(hexRgb)
  const lum = (c: [number, number, number]) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
  const darkest = rgbs.reduce((a, b) => (lum(a) <= lum(b) ? a : b))
  const L = lum(darkest)
  const k = L > 0.2 ? 0.2 / L : 1
  return [darkest[0] * k, darkest[1] * k, darkest[2] * k]
}
const baseHex = (p: [string, string, string]): string => {
  const [r, g, b] = baseTone(p)
  const h = (v: number) => Math.round(v * 255).toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}
const hashId = (s: string): number => {
  let x = 2166136261
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) }
  return x >>> 0
}
const fallbackCss = (p: [string, string, string], seed: number, metal: boolean): string => {
  const x = 12 + (seed % 46)
  const y = 8 + ((seed >>> 6) % 30)
  const base = baseHex(p)
  const layers = [
    `radial-gradient(120% 90% at ${x}% ${y}%, ${rgba(p[0], 0.78)} 0%, rgba(0,0,0,0) 64%)`,
    `radial-gradient(140% 110% at ${96 - x}% ${30 + ((seed >>> 3) % 25)}%, ${rgba(p[1], 0.66)} 0%, rgba(0,0,0,0) 68%)`,
    `radial-gradient(130% 120% at 50% 112%, ${rgba(p[2], 0.55)} 0%, rgba(0,0,0,0) 60%)`,
  ]
  if (metal) layers.push(`linear-gradient(120deg, rgba(255,255,255,0) 38%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0) 62%)`)
  layers.push(`linear-gradient(180deg, ${base} 0%, ${base} 100%)`)
  return layers.join(", ")
}

const SCRIM = "linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.30) 55%, rgba(0,0,0,0.52) 100%)"

export function AuthShader({
  palette, metallic = false, seedKey = "auth", scrim = true, className = "",
}: {
  palette: [string, string, string]
  metallic?: boolean
  /** hashed into phase + rotation so each door's field is its own */
  seedKey?: string
  scrim?: boolean
  className?: string
}) {
  const ref = useRef<HTMLCanvasElement>(null)
  const [fallback, setFallback] = useState(false)
  const seed = hashId(seedKey)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false, alpha: false, powerPreference: "low-power" })
    if (!gl) { setFallback(true); return }

    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.getExtension("WEBGL_lose_context")?.loseContext()
      setFallback(true)
      return
    }
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "a")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uT = gl.getUniformLocation(prog, "u_t")
    const uR = gl.getUniformLocation(prog, "u_r")
    const uWarp = gl.getUniformLocation(prog, "u_warp")
    const uM = gl.getUniformLocation(prog, "u_m")
    const uMa = gl.getUniformLocation(prog, "u_ma")
    const [c0, c1, c2] = [palette[0], palette[1], palette[2]].map(hexRgb)
    gl.uniform3f(gl.getUniformLocation(prog, "u_c0"), c0[0], c0[1], c0[2])
    gl.uniform3f(gl.getUniformLocation(prog, "u_c1"), c1[0], c1[1], c1[2])
    gl.uniform3f(gl.getUniformLocation(prog, "u_c2"), c2[0], c2[1], c2[2])
    const bg = baseTone(palette)
    gl.uniform3f(gl.getUniformLocation(prog, "u_bg"), bg[0], bg[1], bg[2])
    gl.uniform1f(gl.getUniformLocation(prog, "u_metal"), metallic ? 1 : 0)
    const rot = ((seed % 360) / 360) * Math.PI * 2
    gl.uniform1f(gl.getUniformLocation(prog, "u_cr"), Math.cos(rot))
    gl.uniform1f(gl.getUniformLocation(prog, "u_sr"), Math.sin(rot))
    gl.uniform2f(gl.getUniformLocation(prog, "u_ph"), (((seed >>> 8) % 1000) / 1000) * 19, (((seed >>> 16) % 1000) / 1000) * 19)

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    const dpr = Math.min(devicePixelRatio || 1, 1.5)

    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const hgt = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== hgt) {
        canvas.width = w; canvas.height = hgt
        gl.viewport(0, 0, w, hgt)
        return true
      }
      return false
    }

    // the pointer bends the field wherever it is over the page — the door is a
    // single hero, so the whole window drives it (gentle: influence eases in/out)
    let mx = 0, my = 0, mtx = 0, mty = 0
    let ma = 0, maTarget = 0
    let flowT = 8 + ((seed >>> 4) % 60) * 0.35
    let raf = 0
    let last = 0

    const paint = () => {
      resize()
      gl.uniform1f(uT, flowT)
      gl.uniform1f(uWarp, 1.15)
      gl.uniform2f(uR, canvas.width, canvas.height)
      gl.uniform2f(uM, mx, my)
      gl.uniform1f(uMa, ma)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
    }
    const draw = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now
      const k = 1 - Math.exp(-dt * 3.5)
      const km = 1 - Math.exp(-dt * 6)
      mx += (mtx - mx) * km
      my += (mty - my) * km
      ma += (maTarget - ma) * k
      flowT += dt
      paint()
      raf = requestAnimationFrame(draw)
    }
    const sync = () => {
      const should = !document.hidden && !reduce
      if (should && !raf) { last = performance.now(); raf = requestAnimationFrame(draw) }
      else if (!should && raf) { cancelAnimationFrame(raf); raf = 0 }
    }
    const onVis = () => sync()
    document.addEventListener("visibilitychange", onVis)

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      if (!r.width || !r.height) return
      const m = Math.min(r.width, r.height)
      mtx = (e.clientX - r.left - r.width / 2) / m
      mty = (r.height / 2 - (e.clientY - r.top)) / m
      maTarget = 1
    }
    if (!reduce) window.addEventListener("pointermove", onMove, { passive: true })

    const ro = new ResizeObserver(() => { if (resize() && reduce) paint() })
    ro.observe(canvas)

    const onLost = (e: Event) => { e.preventDefault(); setFallback(true) }
    canvas.addEventListener("webglcontextlost", onLost)

    resize()
    paint()
    sync()

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVis)
      window.removeEventListener("pointermove", onMove)
      canvas.removeEventListener("webglcontextlost", onLost)
      ro.disconnect()
      // NO loseContext() here: React StrictMode double-mounts effects in dev, and a
      // canvas keeps ONE context forever — losing it on the first cleanup leaves the
      // remount with a dead context (blank shader). One persistent canvas per door;
      // the browser reclaims the context when the canvas unmounts for real.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- palette/seed derive from props
  }, [seedKey, metallic, fallback])

  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0" style={{ background: fallbackCss(palette, seed, metallic) }} />
      {!fallback && <canvas ref={ref} className="absolute inset-0 h-full w-full" />}
      {scrim && <div className="absolute inset-0" style={{ background: SCRIM }} />}
    </div>
  )
}
