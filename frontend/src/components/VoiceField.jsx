import { useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { isStatic } from '../lib/motion'

const NAVY = new THREE.Color('#16314a')
const POWDER = new THREE.Color('#A7D4E4')

// organic displacement — layered trig (no deps, no GLSL that could fail silently)
function noise(x, y, z, t) {
  return (
    Math.sin(x * 1.6 + t) * Math.cos(y * 1.5 - t * 0.8) +
    Math.sin(y * 2.1 - t * 0.6) * Math.cos(z * 1.9 + t * 0.7) +
    Math.sin(z * 1.7 + t * 0.9) * Math.cos(x * 2.0 - t)
  ) / 3
}

// The breathing navy core — a low-poly sphere that swells & ripples with voice.
function Core({ levelRef }) {
  const mesh = useRef()
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1, 4), [])
  const base = useMemo(() => geo.attributes.position.array.slice(), [geo])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const lvl = levelRef.current
    const pos = mesh.current.geometry.attributes.position
    const amp = 0.10 + lvl * 0.34
    const v = new THREE.Vector3()
    for (let i = 0; i < pos.count; i++) {
      v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2])
      const n = noise(v.x, v.y, v.z, t * 0.6)
      const s = 1 + n * amp
      pos.setXYZ(i, v.x * s, v.y * s, v.z * s)
    }
    pos.needsUpdate = true
    mesh.current.geometry.computeVertexNormals()
    mesh.current.rotation.y = t * 0.12
    mesh.current.rotation.x = Math.sin(t * 0.18) * 0.18
    const k = 1 + lvl * 0.06
    mesh.current.scale.setScalar(k)
  })

  return (
    <mesh ref={mesh} geometry={geo}>
      <meshStandardMaterial color={NAVY} flatShading roughness={0.55} metalness={0.05} />
    </mesh>
  )
}

// Powder rim — a faceted wireframe just outside the core, counter-rotating.
function Rim({ levelRef }) {
  const mesh = useRef()
  const geo = useMemo(() => new THREE.IcosahedronGeometry(1.32, 1), [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    mesh.current.rotation.y = -t * 0.2
    mesh.current.rotation.z = t * 0.1
    mesh.current.scale.setScalar(1 + levelRef.current * 0.12)
    mesh.current.material.opacity = 0.18 + levelRef.current * 0.22
  })
  return (
    <mesh ref={mesh} geometry={geo}>
      <meshBasicMaterial color={POWDER} wireframe transparent opacity={0.2} />
    </mesh>
  )
}

// Powder particles orbiting — quicken with the voice.
function Motes({ levelRef }) {
  const pts = useRef()
  const { geometry } = useMemo(() => {
    const N = 90
    const arr = new Float32Array(N * 3)
    for (let i = 0; i < N; i++) {
      const r = 1.7 + Math.random() * 0.9
      const a = Math.random() * Math.PI * 2
      const b = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(b) * Math.cos(a)
      arr[i * 3 + 1] = r * Math.cos(b) * 0.7
      arr[i * 3 + 2] = r * Math.sin(b) * Math.sin(a)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return { geometry: g }
  }, [])
  useFrame((state) => {
    const t = state.clock.elapsedTime
    pts.current.rotation.y = t * (0.06 + levelRef.current * 0.4)
    pts.current.material.opacity = 0.35 + levelRef.current * 0.4
  })
  return (
    <points ref={pts} geometry={geometry}>
      <pointsMaterial color={POWDER} size={0.045} transparent opacity={0.4} sizeAttenuation />
    </points>
  )
}

/**
 * Signature WebGL voice field — a navy core that breathes and ripples with the
 * speaker's voice, a powder wireframe rim, and orbiting motes. Stays in the
 * two-blue palette over the white screen. Falls back (in Home) to the canvas
 * VoiceBlob when WebGL is unavailable.
 */
export default function VoiceField({ level = 0, bands = [] }) {
  const levelRef = useRef(0)
  // smooth the incoming mic energy so the mesh glides rather than jitters
  const target = level || (bands.length ? bands.reduce((a, b) => a + b, 0) / bands.length : 0)
  levelRef.current += (target - levelRef.current) * 0.25

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={isStatic() ? 'demand' : 'always'}
      style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <directionalLight position={[-3, -1, 2]} intensity={0.4} color={POWDER} />
      <Core levelRef={levelRef} />
      <Rim levelRef={levelRef} />
      <Motes levelRef={levelRef} />
    </Canvas>
  )
}
