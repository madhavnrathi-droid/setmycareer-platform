// First-run guided tour — a spotlight "clickmap" that highlights each area of the
// portal as the member arrives. Pure (no deps): a single dimmed overlay with a
// transparent cut-out box around the target (box-shadow trick) plus a tooltip
// card. Targets resolve by selector; missing targets fall back to a centred step.
// Shows once (account.onboarded), and can be replayed from Account.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { usePortalAccount, setOnboarded } from "../portal-store"
import { cn } from "@/lib/utils"

interface Step {
  /** CSS selector for the element to spotlight; omit for a centred step. */
  target?: string
  title: string
  body: string
}

const STEPS: Step[] = [
  { title: "Welcome to your career space", body: "A quick 30-second tour of where everything lives. You can skip any time." },
  { target: 'a[href="/portal/home"]', title: "Home", body: "Your dashboard — progress, next session, and quick actions, all in one place." },
  { target: 'a[href="/portal/assessments"]', title: "Assessments", body: "Take the Career Tests — personality, interests and aptitude. They power your report." },
  { target: 'a[href="/portal/reports"]', title: "Reports", body: "Your Career Intelligence Report plus a report for every test you take." },
  { target: 'a[href="/portal/services"]', title: "Services", body: "Browse and buy everything SetMyCareer offers — consultations, packages and admission help." },
  { target: 'a[href="/portal/journey"]', title: "My journey", body: "Track your guided path from tests through to your strategy session and certificate." },
  { target: "[data-tour='guide']", title: "Your AI guide", body: "Ask anything, any time — it knows your report, the science behind it, and every product." },
  { title: "You're all set", body: "That's the lay of the land. Dive in whenever you're ready — your guide is one tap away." },
]

const CARD_W = 320

export function PortalTour() {
  const account = usePortalAccount()
  const [active, setActive] = useState(false)
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const rafRef = useRef<number | null>(null)

  // start the tour ONCE shortly after first login (a started-ref + active guard
  // stops account mutations / cross-tab syncs from re-triggering it mid-tour)
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current || active) return
    if (account && !account.onboarded) {
      startedRef.current = true
      const t = setTimeout(() => { setI(0); setActive(true) }, 600)
      return () => clearTimeout(t)
    }
  }, [account?.onboarded, active])

  const step = STEPS[i]

  const measure = useCallback(() => {
    if (!step?.target) { setRect(null); return }
    const el = document.querySelector(step.target) as HTMLElement | null
    setRect(el ? el.getBoundingClientRect() : null)
  }, [step])

  useLayoutEffect(() => {
    if (!active) return
    measure()
    const onMove = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(measure)
    }
    window.addEventListener("resize", onMove)
    window.addEventListener("scroll", onMove, true)
    return () => {
      window.removeEventListener("resize", onMove)
      window.removeEventListener("scroll", onMove, true)
    }
  }, [active, measure])

  const finish = useCallback(() => { setActive(false); setOnboarded(true) }, [])
  const next = () => (i < STEPS.length - 1 ? setI(i + 1) : finish())
  const back = () => setI(Math.max(0, i - 1))

  if (!active || !account) return null

  // spotlight geometry
  const pad = 8
  const box = rect
    ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null

  // tooltip placement: right of a left-rail target, above a bottom target, else centred
  const vw = window.innerWidth
  const vh = window.innerHeight
  let cardStyle: CSSProperties
  if (!box) {
    cardStyle = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" }
  } else if (box.top > vh - 220) {
    // bottom element (the guide bar) → place above, centred to it
    cardStyle = { left: Math.min(Math.max(box.left + box.width / 2 - CARD_W / 2, 16), vw - CARD_W - 16), top: box.top - 180 }
  } else if (box.left < 320) {
    // left rail → place to the right
    cardStyle = { left: Math.min(box.left + box.width + 16, vw - CARD_W - 16), top: Math.min(box.top, vh - 200) }
  } else {
    cardStyle = { left: Math.min(box.left, vw - CARD_W - 16), top: box.top + box.height + 14 }
  }

  return createPortal(
    <div className="fixed inset-0 z-[200]" aria-modal role="dialog">
      {/* dim + spotlight (or a plain dim for centred steps) */}
      {box ? (
        <div
          className="pointer-events-none fixed rounded-xl ring-2 ring-white/80 transition-all duration-300"
          style={{ ...box, boxShadow: "0 0 0 9999px rgba(15,18,20,0.62)" }}
        />
      ) : (
        <div className="fixed inset-0" style={{ background: "rgba(15,18,20,0.62)" }} />
      )}

      {/* clickable scrim to advance / catch clicks */}
      <button className="fixed inset-0 cursor-default" aria-label="Next" onClick={next} />

      {/* tooltip card */}
      <div
        className="fixed w-[320px] rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-float)]"
        style={cardStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoMark size={16} className="text-brand-600" />
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">{i + 1} / {STEPS.length}</span>
          </div>
          <button onClick={finish} aria-label="Skip tour" className="grid size-6 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="size-3.5" />
          </button>
        </div>
        <h3 className="mt-3 font-display text-[17px] font-semibold tracking-tight text-foreground">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{step.body}</p>

        {/* progress dots */}
        <div className="mt-4 flex items-center gap-1.5">
          {STEPS.map((_, k) => (
            <span key={k} className={cn("h-1.5 rounded-full transition-all", k === i ? "w-4 bg-brand-600" : "w-1.5 bg-border")} />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <button onClick={finish} className="text-[12.5px] font-medium text-muted-foreground hover:text-foreground">Skip</button>
          <div className="flex items-center gap-2">
            {i > 0 && <button onClick={back} className="rounded-full px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary">Back</button>}
            <button onClick={next} className="rounded-full bg-brand-600 px-4 py-1.5 text-[12.5px] font-medium text-white hover:bg-brand-700">
              {i === STEPS.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
