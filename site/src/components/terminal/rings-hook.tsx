import { useEffect, useRef, useState } from "react"

// Draw-in-on-view for the rings diagram — reduced-motion + already-in-view +
// timeout safety net, so it can never stay invisible if the observer never fires.
export function useDrawnRings() {
  const ref = useRef<SVGSVGElement>(null)
  const [drawn, setDrawn] = useState(false)
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) { setDrawn(true); return }
    const el = ref.current
    if (!el) { setDrawn(true); return }
    const r = el.getBoundingClientRect()
    if (r.top < window.innerHeight && r.bottom > 0) { setDrawn(true); return }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setDrawn(true); io.disconnect() } }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" })
    io.observe(el)
    const t = window.setTimeout(() => setDrawn(true), 2500)
    return () => { io.disconnect(); window.clearTimeout(t) }
  }, [])
  return { ref, drawn }
}
