// A monochrome 3D gyroscope — three nested ink rings around a fixed centre point,
// slowly precessing: the "find your true north" compass made spatial. Transparent
// WebGL, so it sits on paper; IntersectionObserver pauses the loop off-screen;
// reduced-motion holds a still frame; WebGL failure renders nothing (the section
// reads fine without it). No external asset — three.js (already a dep) only.

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

export function JourneyObject({ className = "" }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" })
    } catch { setFailed(true); return }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    const sizeTo = () => renderer.setSize(mount.clientWidth, mount.clientHeight, false)
    sizeTo()
    renderer.domElement.style.display = "block"
    renderer.domElement.style.width = "100%"
    renderer.domElement.style.height = "100%"
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, mount.clientWidth / Math.max(1, mount.clientHeight), 0.1, 100)
    camera.position.set(0, 0.3, 6.4)
    camera.lookAt(0, 0, 0)

    const ink = new THREE.MeshBasicMaterial({ color: 0x0b0b0b })
    const faint = new THREE.MeshBasicMaterial({ color: 0x0b0b0b, transparent: true, opacity: 0.28 })

    const group = new THREE.Group()
    const mkRing = (r: number, thick: number, rot: [number, number, number], mat: THREE.Material) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, thick, 18, 170), mat)
      m.rotation.set(rot[0], rot[1], rot[2])
      return m
    }
    const r1 = mkRing(1.9, 0.011, [Math.PI / 2, 0, 0], ink)
    const r2 = mkRing(1.55, 0.011, [0, Math.PI / 2, 0], ink)
    const r3 = mkRing(1.2, 0.013, [0, 0, 0], ink)
    const halo = mkRing(2.25, 0.006, [Math.PI / 2.4, 0.2, 0], faint)
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 28, 28), ink)
    // a slim needle through the core — the "true north" axis
    const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 3.1, 12), ink)
    group.add(r1, r2, r3, halo, core, needle)
    scene.add(group)

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const clock = new THREE.Clock()
    let raf = 0
    let running = false

    const frame = () => {
      const t = clock.getElapsedTime()
      group.rotation.y = t * 0.22
      group.rotation.x = Math.sin(t * 0.35) * 0.32
      r1.rotation.z = t * 0.5
      r2.rotation.x = t * -0.4
      r3.rotation.y = t * 0.6
      needle.rotation.z = Math.sin(t * 0.5) * 0.25
      renderer.render(scene, camera)
      raf = requestAnimationFrame(frame)
    }
    const start = () => { if (running) return; running = true; if (reduce) { renderer.render(scene, camera) } else { clock.start(); frame() } }
    const stop = () => { running = false; cancelAnimationFrame(raf) }

    const io = new IntersectionObserver(([e]) => { e.isIntersecting ? start() : stop() }, { threshold: 0.05 })
    io.observe(mount)
    // setSize clears the drawing buffer; on the non-looping (reduced-motion /
    // not-yet-visible) path nothing would repaint it, so re-draw the still frame here.
    const onResize = () => { sizeTo(); camera.aspect = mount.clientWidth / Math.max(1, mount.clientHeight); camera.updateProjectionMatrix(); if (!running || reduce) renderer.render(scene, camera) }
    window.addEventListener("resize", onResize)

    return () => {
      stop(); io.disconnect(); window.removeEventListener("resize", onResize)
      ink.dispose(); faint.dispose()
      ;[r1, r2, r3, halo, core, needle].forEach((m) => m.geometry.dispose())
      renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [])

  if (failed) return null
  return <div ref={mountRef} className={className} aria-hidden />
}
