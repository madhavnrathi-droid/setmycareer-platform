import { useEffect, useState, type RefObject } from "react"

/** True once the element comes within `margin` of the viewport, and stays true.
 *
 *  For media that should not compete with the page's own startup. An autoplay <video>
 *  fetches its poster and starts buffering the moment it is parsed — wherever it sits
 *  on the page. On /product that was ~790KB of screenshots and recordings downloading
 *  at 300ms, alongside the JavaScript that makes the page respond to taps. */
export function useNearViewport(ref: RefObject<Element | null>, margin = "600px"): boolean {
  const [near, setNear] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || near) return
    if (typeof IntersectionObserver === "undefined") { setNear(true); return }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setNear(true); io.disconnect() }
    }, { rootMargin: margin })
    io.observe(el)
    return () => io.disconnect()
  }, [ref, margin, near])
  return near
}
