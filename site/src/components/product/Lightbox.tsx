// A fullscreen zoom for a product shot or clip — click the frame, see it large.
// Esc / click-scrim / the close control dismiss it. Body scroll locks while open.
// Reduced-motion: no scale-in. One shared component; callers own the open state.
import { useEffect } from "react"
import { Close } from "@carbon/icons-react"

export function Lightbox({
  src,
  type = "image",
  alt = "",
  onClose,
}: {
  src: string
  type?: "image" | "video"
  alt?: string
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    // hide the app chrome (top nav + floating chat bar) while zoomed
    document.documentElement.classList.add("lightbox-open")
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
      document.documentElement.classList.remove("lightbox-open")
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Enlarged view"}
      onClick={onClose}
      className="fixed inset-0 z-[9999] grid place-items-center bg-ink/85 p-4 backdrop-blur-sm motion-safe:animate-[lbfade_.22s_ease-out] md:p-10"
    >
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-11 place-items-center rounded-full border border-paper/25 text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper md:right-8 md:top-8"
      >
        <Close size={22} />
      </button>
      <figure
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-auto max-w-[94vw] overflow-hidden border border-paper/15 bg-paper-pure motion-safe:animate-[lbzoom_.28s_cubic-bezier(0.16,1,0.3,1)]"
      >
        {type === "video" ? (
          <video src={src} autoPlay muted loop playsInline controls className="block max-h-[90vh] w-auto" />
        ) : (
          <img src={src} alt={alt} className="block max-h-[90vh] w-auto object-contain" />
        )}
      </figure>
    </div>
  )
}
