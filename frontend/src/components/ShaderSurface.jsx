import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { isStatic } from '../lib/motion'

// Bespoke flowing-gradient shader: domain-warped fractal noise mixes three
// palette colors into a living, watery surface, with film grain baked into the
// shader. Replaces the shadergradient lib (which renders an empty wrapper in
// this stack) — same idea, fully under our control and verifiable.

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uA, uB, uC;
  uniform float uGrain;
  uniform float uAspect;

  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    float a = hash(i), b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
  float fbm(vec2 p){
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }
  void main(){
    vec2 uv = vUv;
    uv.x *= uAspect;
    float t = uTime * 0.06;
    vec2 q = vec2(fbm(uv * 2.0 + t), fbm(uv * 2.0 + vec2(5.2, 1.3) - t));
    float n = fbm(uv * 3.0 + q * 1.9 + t);
    vec3 col = mix(uA, uB, smoothstep(0.15, 0.75, n));
    col = mix(col, uC, smoothstep(0.55, 0.98, fbm(uv * 2.2 + q * 1.2)));
    // soft diagonal sheen
    col += 0.05 * smoothstep(0.0, 1.0, vUv.x + vUv.y - 0.6);
    // film grain
    float g = hash(vUv * 1500.0 + fract(uTime)) - 0.5;
    col += g * uGrain;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }
`

function Plane({ colors, speed, grain }) {
  const mat = useRef()
  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uA: { value: new THREE.Color(colors[0]) },
    uB: { value: new THREE.Color(colors[1]) },
    uC: { value: new THREE.Color(colors[2]) },
    uGrain: { value: grain ? 0.12 : 0.0 },
    uAspect: { value: 1 },
  }), [])
  useFrame((state) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = state.clock.elapsedTime * speed * 6
    const s = state.size
    mat.current.uniforms.uAspect.value = s.width / Math.max(1, s.height)
  })
  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial ref={mat} vertexShader={VERT} fragmentShader={FRAG} uniforms={uniforms} />
    </mesh>
  )
}

export default function ShaderSurface({ colors, speed = 0.16, grain = true }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false }}
      frameloop={isStatic() ? 'demand' : 'always'}
      style={{ position: 'absolute', inset: 0 }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color(colors[0]))}
    >
      <Plane colors={colors} speed={speed} grain={grain} />
    </Canvas>
  )
}
