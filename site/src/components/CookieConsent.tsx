import { useEffect, useState } from "react"
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

  useEffect(() => {
    // reduced-motion / first-paint safe: only show if no prior choice
    const t = setTimeout(() => { if (!readConsent()) setOpen(true) }, 900)
    return () => clearTimeout(t)
  }, [])

  if (!open) return null
  const decide = (a: boolean, m: boolean) => { save({ necessary: true, analytics: a, marketing: m, ts: Date.now() }); setOpen(false) }

  return (
    <div role="dialog" aria-label="Cookie consent" aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[9998] mx-auto max-w-[440px] rounded-[16px] border border-line bg-paper-pure p-5 shadow-[0_24px_60px_-24px_rgba(11,11,11,0.35)] md:left-5 md:right-auto md:mx-0">
      <p className="text-[13px] font-medium tracking-tight text-ink">We use cookies</p>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-60">
        Strictly-necessary cookies keep you signed in and the site working. With your consent we also use analytics and marketing cookies to improve SetMyCareer. You can change this any time.{" "}
        <Link to="/legal/cookie-policy" className="ul">Cookie Policy</Link> · <Link to="/legal/privacy-policy" className="ul">Privacy</Link>
      </p>

      {manage && (
        <div className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4 text-[12.5px]">
          <label className="flex items-center justify-between gap-3 text-ink-60">
            <span><b className="text-ink">Strictly necessary</b> — always on</span>
            <input type="checkbox" checked disabled className="size-4 accent-ink opacity-60" />
          </label>
          <label className="flex items-center justify-between gap-3 text-ink-80">
            <span><b className="text-ink">Analytics</b> — how the site is used</span>
            <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="size-4 accent-[var(--color-growth)]" />
          </label>
          <label className="flex items-center justify-between gap-3 text-ink-80">
            <span><b className="text-ink">Marketing</b> — relevant ads &amp; campaigns</span>
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="size-4 accent-[var(--color-growth)]" />
          </label>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        {manage ? (
          <button onClick={() => decide(analytics, marketing)} className="btn btn--solid !py-2.5 !text-[12.5px]"><span>Save choices</span></button>
        ) : (
          <button onClick={() => decide(true, true)} className="btn btn--solid !py-2.5 !text-[12.5px]"><span>Accept all</span></button>
        )}
        <button onClick={() => decide(false, false)} className="btn !py-2.5 !text-[12.5px]"><span>Reject non-essential</span></button>
        {!manage && (
          <button onClick={() => setManage(true)} className="ul ml-1 text-[12px] text-ink-50">Manage</button>
        )}
      </div>
    </div>
  )
}
