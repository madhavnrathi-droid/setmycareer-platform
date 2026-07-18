import { useEffect, useRef } from "react"

// A quiet, always-moving fluid gradient — the live surface under the compass
// bar. Raw WebGL (same lineage as the halftone hero shader, minus three.js):
// domain-warped fbm noise drifting through paper/pearl tones with a whisper of
// warm and cool iridescence. Deliberately low-contrast so the bar reads
// premium, never busy. Pauses on a hidden tab; reduced motion gets one still
// frame; if WebGL is unavailable the pill's white background simply shows.

const FRAG = `
precision mediump float;
uniform float u_t;
uniform vec2 u_r;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x),
             mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * n(p); p *= 2.03; a *= 0.5; }
  return v;
}
void main(){
  vec2 uv = gl_FragCoord.xy / u_r;
  vec2 p = uv * vec2(3.0, 1.2);
  float f = fbm(p + vec2(u_t * 0.05, -u_t * 0.03) + 1.5 * fbm(p * 1.6 + u_t * 0.04));
  vec3 base = mix(vec3(0.995, 0.993, 0.988), vec3(0.952, 0.948, 0.938), f);
  base = mix(base, vec3(0.975, 0.955, 0.922), smoothstep(0.55, 0.9, fbm(p * 1.3 - u_t * 0.06)) * 0.32);
  base = mix(base, vec3(0.930, 0.942, 0.958), smoothstep(0.60, 0.95, fbm(p * 1.7 + u_t * 0.05)) * 0.28);
  gl_FragColor = vec4(base, 1.0);
}`

const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`

export function ShaderFlow({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false })
    if (!gl) return // graceful: the solid-white pill shows on its own

    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src); gl.compileShader(s)
      return s
    }
    const prog = gl.createProgram()!
    gl.attachShader(prog, mk(gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, "a")
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
    const uT = gl.getUniformLocation(prog, "u_t")
    const uR = gl.getUniformLocation(prog, "u_r")

    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches
    let raf = 0
    const t0 = performance.now()
    const dpr = Math.min(devicePixelRatio || 1, 2)
    // returns true when the backing store was reallocated (WebGL clears it, so
    // the caller must repaint)
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
    const draw = (now: number) => {
      resize()
      gl.uniform1f(uT, (now - t0) / 1000 + 3.7)
      gl.uniform2f(uR, canvas.width, canvas.height)
      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduce) raf = requestAnimationFrame(draw)
    }
    // when reduced-motion is on there's no rAF loop, so a resize that clears the
    // buffer would leave the pill blank — repaint the one still frame here
    const ro = new ResizeObserver(() => { if (resize() && reduce) draw(performance.now()) })
    ro.observe(canvas)
    resize()

    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw) }
    const onVis = () => { document.hidden ? cancelAnimationFrame(raf) : start() }
    document.addEventListener("visibilitychange", onVis)
    start()

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener("visibilitychange", onVis)
      ro.disconnect()
      gl.getExtension("WEBGL_lose_context")?.loseContext()
    }
  }, [])

  return <canvas ref={ref} aria-hidden className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} />
}
