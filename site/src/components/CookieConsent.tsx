import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"

/* Cookie / tracking consent — DPDP-style opt-IN for non-essential categories
   (nothing non-essential runs until the user actively accepts) and a CCPA-style
   opt-OUT path (Reject = do not sell/share). The choice is stored locally and a
   `smc-consent` event is dispatched so analytics/marketing scripts can gate on it.
   Strictly-necessary cookies always run and are not toggleable. */

export type ConsentState = { necessary: true; analytics: boolean; marketing: boolean; ts: number }
const KEY = "smc.consent.v1"

export function readConsent(): ConsentState | null {
  try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null } catch { return null }
}
function save(c: ConsentState) {
  try { localStorage.setItem(KEY, JSON.stringify(c)) } catch { /* private mode */ }
  window.dispatchEvent(new CustomEvent("smc-consent", { detail: c }))
}

export function CookieConsent() {
  const [open, setOpen] = useState(false)
  const [manage, setManage] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const bar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // reduced-motion / first-paint safe: only show if no prior choice
    const t = setTimeout(() => { if (!readConsent()) setOpen(true) }, 900)
    return () => clearTimeout(t)
  }, [])

  // Reserve the space the bar occupies instead of floating over content. The bar
  // publishes its live height as --consent-h on <html>; the hero and the Compass pill
  // add it to their bottom offsets. Previously a 440x190 card sat on top of the hero
  // subhead on desktop and covered 28% of a phone screen — directly over the primary
  // CTA — so a first-time visitor could not see the page's main action at all.
  useLayoutEffect(() => {
    const root = document.documentElement
    if (!open || !bar.current) { root.style.setProperty("--consent-h", "0px"); return }
    const el = bar.current
    const sync = () => root.style.setProperty("--consent-h", `${Math.ceil(el.getBoundingClientRect().height)}px`)
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => { ro.disconnect(); root.style.setProperty("--consent-h", "0px") }
  }, [open, manage])

  if (!open) return null
  const decide = (a: boolean, m: boolean) => { save({ necessary: true, analytics: a, marketing: m, ts: Date.now() }); setOpen(false) }

  // Accept and Reject carry EQUAL visual weight, deliberately. The old banner made
  // "Accept all" the solid button and "Reject" an outline — steering by prominence,
  // which the DPDP Act's freely-given standard and EDPB dark-pattern guidance both
  // count against valid consent. It also put a second solid CTA on every first view,
  // competing with the page's real primary action.
  const choice = "btn !min-h-[44px] !px-4 !py-2 !text-[12.5px]"
  return (
    <div ref={bar} role="region" aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[9998] border-t border-line bg-paper-pure">
      <div className="wrap flex flex-col gap-3 py-3 md:flex-row md:items-center md:justify-between md:gap-8">
        <p className="text-[12.5px] leading-snug text-ink-60 md:max-w-[62ch]">
          <span className="font-medium text-ink">Cookies.</span>{" "}
          Necessary ones run the site. Analytics and marketing run only if you allow them.{" "}
          <Link to="/legal/cookie-policy" className="ul whitespace-nowrap">Cookie Policy</Link>
        </p>

        {manage && (
          <fieldset className="flex flex-wrap gap-x-6 gap-y-2 text-[12.5px] text-ink-80 md:order-none">
            <legend className="sr-only">Cookie categories</legend>
            <label className="flex min-h-[44px] items-center gap-2 text-ink-60">
              <input type="checkbox" checked disabled className="size-4 accent-ink" /> Necessary (always on)
            </label>
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="size-4 accent-ink" /> Analytics
            </label>
            <label className="flex min-h-[44px] items-center gap-2">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="size-4 accent-ink" /> Marketing
            </label>
          </fieldset>
        )}

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {manage ? (
            <button onClick={() => decide(analytics, marketing)} className={choice}><span>Save choices</span></button>
          ) : (
            <>
              <button onClick={() => decide(false, false)} className={choice}><span>Reject non-essential</span></button>
              <button onClick={() => decide(true, true)} className={choice}><span>Accept all</span></button>
              <button onClick={() => setManage(true)} className="ul min-h-[44px] px-2 text-[12.5px] text-ink-60">Choose</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
