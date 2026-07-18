import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Checkmark, Locked } from "@carbon/icons-react"
import { Kicker } from "@/components/bits"
import { useSeo } from "@/lib/seo"
import { PORTAL_URL } from "@/lib/api"
import { useSiteSession, firstName } from "@/lib/site-auth"
import { ProductShot } from "@/components/product/ProductShot"
import { PackageGradient } from "@/components/pricing/PackageGradient"
import { offeringById, buyableById, CREDIT_PACKS, fmtINR, type Offering } from "@/content/offerings"

/* /checkout/:tierId — the final step before someone invests in a career
   decision. Not an e-commerce checkout: the persuasion already happened; this
   page exists to remove every remaining doubt. It answers, in order —
   what am I buying · exactly what's included · what am I paying · is it
   secure · what happens the moment I've paid. Nothing else competes.

   SECURITY (unchanged): amounts are never trusted client-side — the rail
   renders the server's quote, the pay button renders the server's ORDER
   amount, and nothing unlocks without a server-verified {valid:true}. */

// the counselor deployment that owns the payment API (CORS-open for this site)
const RZP_API = "https://setmycareer-counselor.vercel.app/api/razorpay"

// ── Razorpay Checkout (browser popup) ────────────────────────────────────────
interface RzpSuccess { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
interface RzpOptions {
  key: string; amount: number; currency: string; name: string; description?: string
  order_id: string; prefill?: { name?: string; email?: string; contact?: string }
  notes?: Record<string, string>; theme?: { color?: string }
  handler: (r: RzpSuccess) => void; modal?: { ondismiss?: () => void }
}
declare global { interface Window { Razorpay?: new (o: RzpOptions) => { open: () => void } } }

let rzpLoader: Promise<boolean> | null = null
function loadCheckoutJs(): Promise<boolean> {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve(true)
  if (!rzpLoader) {
    rzpLoader = new Promise((resolve) => {
      const s = document.createElement("script")
      s.src = "https://checkout.razorpay.com/v1/checkout.js"
      s.async = true
      s.onload = () => resolve(true)
      s.onerror = () => { rzpLoader = null; resolve(false) }
      document.head.appendChild(s)
    })
  }
  return rzpLoader
}

// ── server contracts (counselor api/razorpay.ts) ─────────────────────────────
interface Quote { label: string; base: number; amount: number; discount: number; coupon: string | null; error?: string }
interface OrderRes { orderId?: string; amount?: number; discount?: number; coupon?: string; keyId?: string; label?: string; error?: string }

async function rzp<T>(body: Record<string, unknown>): Promise<{ ok: boolean; status: number; data: T | null }> {
  try {
    const r = await fetch(RZP_API, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    })
    return { ok: r.ok, status: r.status, data: (await r.json().catch(() => null)) as T | null }
  } catch { return { ok: false, status: 0, data: null } }
}

// ── a normalised summary for everything money can buy here ──────────────────
interface Summary {
  name: string; tagline: string; includes: string[]
  sessions: number; ai?: Offering["ai"]; certificates?: string[]
  inr: number; note?: string
  programme?: boolean
  /** true only when the tier actually bundles the full portal (assessments,
   *  reports, dashboard + AI copilot) — never claimed for a bare
   *  consultation or add-on session */
  fullPortal?: boolean
}
function summarise(tierId?: string): Summary | undefined {
  const buyable = buyableById(tierId)
  if (!buyable) return undefined
  const o = offeringById(tierId)
  if (o) {
    return {
      name: o.name, tagline: o.tagline, includes: o.includes,
      sessions: o.sessions, ai: o.ai, certificates: o.certificates,
      inr: o.price.inr, note: o.priceNote,
      programme: true,
      fullPortal: !!o.ai, // the AI copilot ships only with the full-portal journey tiers
    }
  }
  const p = CREDIT_PACKS.find((c) => c.id === tierId)
  if (p) {
    return {
      name: p.name,
      tagline: `A top-up for Compass — ${p.amount} ${p.unit === "career" ? "Career" : "Voice"} Credits, active as soon as payment clears.`,
      includes: [`${p.amount} ${p.unit === "career" ? "Career" : "Voice"} Credits added to your account`, "No expiry surprises — credits sit with your account", "Works across the portal and Compass"],
      sessions: 0, inr: p.price.inr,
    }
  }
  return { name: buyable.name, tagline: "", includes: [], sessions: 0, inr: buyable.inr, note: buyable.note }
}

/* the checkout speaks differently to each kind of purchase — one design
   system, different copy (full programme / consultation / credits) */
type Variant = "programme" | "consultation" | "credits"
const variantOf = (s: Summary): Variant =>
  s.fullPortal ? "programme" : s.sessions > 0 ? "consultation" : "credits"

/* what happens the moment payment clears — the last doubt this page removes.
   Every step is real: verify() grants the tier server-side before "success". */
const AFTER: Record<Variant, { step: string; detail: string }[]> = {
  programme: [
    { step: "Your portal unlocks instantly", detail: "The programme lands on your account the moment payment is verified." },
    { step: "Begin your first assessment", detail: "All three instruments are open — about 30–35 minutes each, taken whenever suits you." },
    { step: "Book your sessions", detail: "Pick counselling times that suit you, from inside the portal." },
  ],
  consultation: [
    { step: "Your portal unlocks instantly", detail: "The session lands on your account the moment payment is verified." },
    { step: "Book your time", detail: "Choose a slot that suits you, from inside the portal." },
    { step: "Meet in the browser", detail: "Video, live transcript and notes — everything saves to your account." },
  ],
  credits: [
    { step: "Credits activate instantly", detail: "They're on your account the moment payment is verified." },
    { step: "Carry on where you left off", detail: "Compass picks up with your results and history intact." },
  ],
}

type Phase = "idle" | "paying" | "verifying" | "success" | "failed"

/* exit behaviour: leaving checkout never loses your state — coupon and consent
   are kept per-tier for the session */
const draftKey = (tier: string) => `smc-checkout-${tier}`
function loadDraft(tier: string): { couponInput?: string; terms?: boolean } {
  try { return JSON.parse(sessionStorage.getItem(draftKey(tier)) ?? "{}") } catch { return {} }
}

export function Checkout() {
  const { tierId } = useParams<{ tierId: string }>()
  const navigate = useNavigate()
  const session = useSiteSession()
  const summary = useMemo(() => summarise(tierId), [tierId])
  const signinHref = `/signin?next=${encodeURIComponent(`/checkout/${tierId ?? ""}`)}`

  // server pricing (the rail renders THIS, not the catalog, once it loads)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [notSellable, setNotSellable] = useState(false) // API says "Unknown tier"
  const draft = useMemo(() => (tierId ? loadDraft(tierId) : {}), [tierId])
  const [couponOpen, setCouponOpen] = useState(!!draft.couponInput)
  const [couponInput, setCouponInput] = useState(draft.couponInput ?? "")
  const [coupon, setCoupon] = useState<string | undefined>(undefined)
  const [couponErr, setCouponErr] = useState("")

  const [terms, setTerms] = useState(!!draft.terms)
  const [phase, setPhase] = useState<Phase>("idle")
  const [payErr, setPayErr] = useState("")
  const [paidAmount, setPaidAmount] = useState<number | null>(null) // paise, from the server ORDER

  useSeo({
    title: summary ? `Checkout · ${summary.name} — SetMyCareer` : "Checkout — SetMyCareer",
    description: "Secure checkout for SetMyCareer programmes — payments by Razorpay, unlocked in your client portal.",
    path: `/checkout/${tierId ?? ""}`,
  })

  // retain state across accidental exits (never a form reset)
  useEffect(() => {
    if (!tierId) return
    try { sessionStorage.setItem(draftKey(tierId), JSON.stringify({ couponInput, terms })) } catch { /* private mode */ }
  }, [tierId, couponInput, terms])

  // price preview — keyless {action:"quote"}; also how coupons validate
  const fetchQuote = useCallback(async (code?: string) => {
    if (!tierId) return
    setCouponErr("")
    const r = await rzp<Quote>({ action: "quote", tier: tierId, coupon: code })
    if (r.ok && r.data && !r.data.error) {
      setQuote(r.data)
      setCoupon(r.data.coupon ?? undefined)
      return
    }
    if (r.status === 400 && r.data?.error === "Unknown tier") { setNotSellable(true); return }
    if (r.status === 400 && r.data?.error) {
      // a coupon problem — keep the last good quote, surface the message
      setCouponErr(r.data.error)
      return
    }
    // network / CORS / API not deployed yet — the catalog price stands in;
    // the ORDER (and Razorpay itself) still decides the real amount.
    setQuote(null)
  }, [tierId])

  useEffect(() => { void fetchQuote() }, [fetchQuote])

  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase()
    if (!code) { setCoupon(undefined); setCouponErr(""); void fetchQuote(); return }
    await fetchQuote(code)
  }

  const pay = async () => {
    if (!tierId || !summary || phase === "paying" || phase === "verifying") return
    // buying requires an account (the purchase must land on a real clientId) —
    // send them to sign in and back; the product story itself stays public.
    if (!session) { navigate(signinHref); return }
    setPayErr(""); setPhase("paying")

    const jsOk = await loadCheckoutJs()
    if (!jsOk || !window.Razorpay) {
      setPhase("failed"); setPayErr("The payment window couldn't load — an ad-blocker may be in the way. Nothing was charged."); return
    }

    const order = await rzp<OrderRes>({ action: "order", tier: tierId, coupon })
    if (!order.ok || !order.data?.orderId || !order.data.keyId || !order.data.amount) {
      setPhase("failed")
      setPayErr(
        order.status === 400 && order.data?.error === "Unknown tier"
          ? "This programme isn't available for online purchase yet — talk to us and we'll set it up for you."
          : order.data?.error || "We couldn't start the payment — nothing was charged. Please try again in a moment.",
      )
      if (order.status === 400 && order.data?.error === "Unknown tier") setNotSellable(true)
      return
    }

    const { orderId, keyId, amount, label } = order.data
    setPaidAmount(amount) // the ONLY amount we ever show as "paying"

    const verify = async (r: RzpSuccess) => {
      setPhase("verifying")
      // send both spellings — the deployed handler reads snake_case; the 2026
      // verify extension names them orderId/paymentId + clientId/tierId
      const v = await rzp<{ valid?: boolean; error?: string }>({
        action: "verify",
        order_id: r.razorpay_order_id, payment_id: r.razorpay_payment_id, signature: r.razorpay_signature,
        orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id,
        clientId: String(session.clientId), tierId,
      })
      if (v.ok && v.data?.valid === true) { setPhase("success"); return }
      setPhase("failed")
      setPayErr("We couldn't verify this payment yet. If money left your account it is safe — write to info@setmycareer.com with your payment id and we'll reconcile it within a working day.")
    }

    try {
      new window.Razorpay({
        key: keyId,
        amount,
        currency: "INR",
        name: "SetMyCareer",
        description: label ?? summary.name,
        order_id: orderId,
        prefill: { name: session.name, email: session.email, contact: session.mobile },
        notes: { tier: tierId, clientId: String(session.clientId) },
        theme: { color: "#0b0b0b" },
        handler: (r) => { void verify(r) },
        modal: { ondismiss: () => { setPhase((p) => (p === "paying" ? "idle" : p)); setPayErr("") } },
      }).open()
    } catch {
      setPhase("failed"); setPayErr("The payment window couldn't open — nothing was charged. Please try again.")
    }
  }

  // ── guards ──────────────────────────────────────────────────────────────────
  if (!summary || notSellable) {
    return (
      <main className="pt-28">
        <section className="wrap flex min-h-[50vh] flex-col items-start justify-center pb-24">
          <Kicker>Checkout</Kicker>
          <h1 className="h-lg mt-5 max-w-[18ch]">This programme isn't available for <span className="b">online purchase</span> yet.</h1>
          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-60">
            Talk to us and we'll set it up for you — a counsellor answers within a working day.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-5">
            <Link to="/contact" className="btn btn--solid"><span>Talk to us</span> <ArrowRight size={15} className="btn-arrow" /></Link>
            <Link to="/pricing" className="ul text-[13.5px] text-ink-60">Back to pricing</Link>
          </div>
        </section>
      </main>
    )
  }

  const variant = variantOf(summary)

  // ── success — "you're in", and the next action by name ─────────────────────
  if (phase === "success") {
    const nextCta =
      variant === "programme" ? { href: `${PORTAL_URL}/assessments`, label: "Begin your first assessment" }
      : variant === "consultation" ? { href: PORTAL_URL, label: "Book your session" }
      : { href: PORTAL_URL, label: "Open your portal" }
    return (
      <main className="pt-28">
        <section className="wrap grid min-h-[60vh] content-center pb-24">
          <div className="max-w-xl">
            <Kicker>Payment confirmed</Kicker>
            <h1 className="ed-title-xl mt-5 text-[clamp(2.2rem,5vw,3.6rem)]">You're <span className="b">in</span>, {firstName(session)}.</h1>
            <p className="mt-6 text-[15px] leading-relaxed text-ink-60">
              {variant === "credits" ? "Your credits are active" : "Your career workspace is ready"} —{" "}
              <strong className="font-medium text-ink">{summary.name}</strong> is on your account
              {paidAmount != null ? <> ({fmtINR(Math.round(paidAmount / 100))}, receipt on its way)</> : null}.
            </p>
            <ul className="mt-8 flex flex-col gap-3 border-t border-line pt-7 text-[14px] leading-relaxed text-ink-80">
              {summary.sessions > 0 && (
                <li className="flex gap-3"><Checkmark size={16} className="mt-0.5 shrink-0 text-ink-40" />Your {summary.sessions === 1 ? "session is" : `${summary.sessions} sessions are`} booked from the portal — pick times that suit you.</li>
              )}
              {summary.ai && <li className="flex gap-3"><Checkmark size={16} className="mt-0.5 shrink-0 text-ink-40" />Your Compass credits are active.</li>}
              <li className="flex gap-3"><Checkmark size={16} className="mt-0.5 shrink-0 text-ink-40" />Everything you bought lives in your client portal, under this account.</li>
            </ul>
            <div className="mt-10 flex flex-wrap items-center gap-5">
              <a href={nextCta.href} target="_blank" rel="noopener noreferrer" className="btn btn--solid"><span>{nextCta.label}</span> <ArrowUpRight size={15} className="btn-arrow" /></a>
              <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="ul text-[13.5px] text-ink-60">Open the portal</a>
            </div>
          </div>
        </section>
      </main>
    )
  }

  // rail numbers — server quote in paise when we have it, catalog rupees otherwise
  const base = quote ? quote.base / 100 : summary.inr
  const discount = quote ? quote.discount / 100 : 0
  const total = quote ? quote.amount / 100 : summary.inr
  const paying = phase === "paying" || phase === "verifying"
  const ctaLabel = !session ? "Sign in to continue"
    : phase === "failed" ? `Try again · ${fmtINR(total)}`
    : `Complete purchase · ${fmtINR(paidAmount != null && paying ? Math.round(paidAmount / 100) : total)}`

  return (
    <main className="pt-28">
      <section className="wrap grid gap-12 pb-32 pt-6 md:pt-10 lg:grid-cols-[1fr_400px] lg:gap-16 lg:pb-24">
        {/* ── left: what you're buying, exactly ── */}
        <div>
          {/* the product's own light — the same gradient plate they chose it by,
              so the checkout reads as the next screen of the product */}
          <div className="relative overflow-hidden rounded-[24px] bg-ink text-paper">
            <PackageGradient offeringId={tierId ?? ""} interactive={false} scrim />
            <div className="relative z-[1] px-7 py-9 sm:px-9">
              <p className="mono text-[10px] uppercase tracking-[0.18em] text-paper/70">
                {variant === "programme" ? "Programme" : variant === "consultation" ? "Counselling" : "Compass credits"}
              </p>
              <h1 className="mt-3 text-[clamp(1.7rem,3.6vw,2.6rem)] font-extralight leading-[1.05] tracking-[-0.02em]">{summary.name}</h1>
              {summary.tagline && <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-paper/75">{summary.tagline}</p>}
            </div>
          </div>

          {/* exactly what's included — the mental verification list */}
          {summary.includes.length > 0 && (
            <div className="mt-10">
              <p className="kicker">Exactly what's included</p>
              <ul className="mt-5 flex flex-col gap-3.5">
                {summary.includes.map((line) => (
                  <li key={line} className="flex gap-3 text-[14.5px] leading-relaxed text-ink-80">
                    <Checkmark size={16} className="mt-0.5 shrink-0 text-ink-40" />{line}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* the facts, at a glance */}
          <div className="mt-8 grid gap-px border-t border-line sm:grid-cols-2">
            {summary.sessions > 0 && (
              <div className="border-b border-line py-5 sm:pr-8">
                <p className="kicker">Counselling</p>
                <p className="mt-2 text-[14px] text-ink-80">{summary.sessions} human {summary.sessions === 1 ? "session" : "sessions"}, booked from your portal at times that suit you.</p>
              </div>
            )}
            {summary.ai && (
              <div className="border-b border-line py-5 sm:pr-8">
                <p className="kicker">Compass included</p>
                <p className="mt-2 text-[14px] text-ink-80">
                  {[
                    summary.ai.careerCredits > 0 ? `${summary.ai.careerCredits} Career Credits` : null,
                    summary.ai.voiceCredits > 0 ? `${summary.ai.voiceCredits} Voice Credits` : null,
                  ].filter(Boolean).join(" · ") || "Included"}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-40">Remembers: {summary.ai.memory.toLowerCase()}</p>
              </div>
            )}
            {summary.certificates && summary.certificates.length > 0 && (
              <div className="border-b border-line py-5 sm:pr-8">
                <p className="kicker">Certificates</p>
                <p className="mt-2 text-[14px] text-ink-80">{summary.certificates.join(" · ")}</p>
              </div>
            )}
            <div className="border-b border-line py-5 sm:pr-8">
              <p className="kicker">{session ? "Buying as" : "Your account"}</p>
              {session ? (
                <>
                  <p className="mt-2 text-[14px] text-ink-80">{session.name || session.email || session.mobile}</p>
                  <p className="mt-1 text-[12.5px] text-ink-40">Unlocks in this account's portal — nothing else to fill in.</p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-[14px] text-ink-80">Sign in when you're ready — it takes a minute.</p>
                  <p className="mt-1 text-[12.5px] text-ink-40">The purchase lands in your client portal, so it needs an account.</p>
                </>
              )}
            </div>
          </div>

          {/* what happens the moment you've paid — the last doubt, answered */}
          <div className="mt-10 border-t border-line pt-8">
            <p className="kicker">After payment</p>
            <ol className="mt-5 flex flex-col gap-4">
              {AFTER[variant].map((s, i) => (
                <li key={s.step} className="flex gap-4">
                  <span className="mono mt-0.5 text-[10.5px] tabular-nums text-ink-30">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <p className="text-[14.5px] font-medium tracking-tight">{s.step}</p>
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-55">{s.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* the workspace it opens — only for tiers that truly bundle it */}
          {summary.fullPortal && (
            <div className="mt-10 border-t border-line pt-8">
              <p className="kicker">The workspace this opens</p>
              <ProductShot
                src="/product/portal-dashboard.png"
                alt={`The SetMyCareer client portal — the dashboard included with ${summary.name}`}
                chrome="app.setmycareer.com/portal"
                label="Your dashboard"
                className="mt-6"
              />
            </div>
          )}

          {/* help — one quiet line, never a redirect away from the decision */}
          <p className="mt-10 text-[13.5px] leading-relaxed text-ink-60">
            Not sure this is the right one? <Link to="/contact" className="ul font-medium text-ink-80">Talk to a counsellor first</Link> — or{" "}
            <Link to="/pricing" className="ul">compare every tier</Link>.
          </p>
        </div>

        {/* ── right: the sticky order rail ── */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="border border-line bg-paper-pure p-7 md:p-8">
            <p className="kicker">Order summary</p>

            <dl className="mt-6 flex flex-col gap-3 text-[14px]">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-ink-60">{quote?.label ?? summary.name}{summary.note ? <span className="text-ink-40"> · {summary.note}</span> : null}</dt>
                <dd className="whitespace-nowrap">{fmtINR(base)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-ink-60">Coupon {quote?.coupon}</dt>
                  <dd className="whitespace-nowrap">− {fmtINR(discount)}</dd>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-4 border-t border-line pt-3 text-[16px] font-medium">
                <dt>Total</dt>
                <dd className="whitespace-nowrap">{fmtINR(total)}</dd>
              </div>
            </dl>
            {!quote && <p className="mt-2 text-[11.5px] leading-relaxed text-ink-40">Final amount is confirmed by the payment server before you pay.</p>}

            {/* coupon — collapsed until asked for; validated server-side */}
            {!couponOpen && !coupon ? (
              <button
                type="button"
                onClick={() => {
                  setCouponOpen(true)
                  // focus only on the user's own click — never steal it on load
                  requestAnimationFrame(() => document.getElementById("coupon-code")?.focus())
                }}
                className="ul mt-5 text-[12.5px] text-ink-60"
              >
                Have a coupon?
              </button>
            ) : (
              <div className="mt-5">
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); void applyCoupon() }}>
                  <input
                    id="coupon-code"
                    value={couponInput}
                    onChange={(e) => { setCouponInput(e.target.value); setCouponErr("") }}
                    placeholder="Coupon code"
                    aria-label="Coupon code"
                    className="field-box rounded-[9px] !py-2 text-[13.5px] uppercase placeholder:normal-case"
                  />
                  <button type="submit" className="btn !min-h-0 shrink-0 !px-4 !py-2 text-[12.5px]"><span>Apply</span></button>
                </form>
                <p role="status" className="mt-2 min-h-[1em] text-[12px]">
                  {couponErr ? <span className="text-red-700">{couponErr}</span>
                    : coupon ? <span className="text-ink-60">Coupon {coupon} applied.</span> : null}
                </p>
              </div>
            )}

            {session && (
              <label className="mt-5 flex cursor-pointer items-start gap-3 text-[12.5px] leading-relaxed text-ink-60">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 size-4 shrink-0 accent-ink" />
                <span>
                  I agree to the <Link to="/legal/terms-of-service" className="ul text-ink-80">Terms of Service</Link> and the{" "}
                  <Link to="/legal/refund-cancellation-policy" className="ul text-ink-80">Refund & Cancellation Policy</Link>.
                </span>
              </label>
            )}

            {phase === "failed" && (
              <div role="alert" className="mt-4 border-t border-line pt-4">
                <p className="text-[12.5px] leading-relaxed text-red-700">{payErr}</p>
                <Link to="/contact" className="ul mt-2 inline-block text-[12.5px] text-ink-60">Talk to us instead</Link>
              </div>
            )}

            <button
              type="button"
              onClick={() => void pay()}
              disabled={paying || (!!session && !terms)}
              className="btn btn--solid mt-6 w-full justify-center disabled:opacity-50"
            >
              <span>{paying ? (phase === "verifying" ? "Verifying payment…" : "Opening secure payment…") : ctaLabel}</span>
              {!paying && <ArrowRight size={15} className="btn-arrow" />}
            </button>
            {!!session && !terms && phase === "idle" && (
              <p className="mt-2 text-[11.5px] text-ink-40">Tick the agreement above to continue.</p>
            )}

            {/* security — one clean section, no badges */}
            <ul className="mt-6 flex flex-col gap-2 border-t border-line pt-5 text-[12px] leading-relaxed text-ink-60">
              <li className="flex gap-2.5"><Locked size={14} className="mt-0.5 shrink-0 text-ink-40" />Payment by Razorpay — UPI, cards, netbanking. We never see or store your payment details.</li>
              <li className="flex gap-2.5"><Checkmark size={14} className="mt-0.5 shrink-0 text-ink-40" />Unlocks in your portal the moment payment is verified.</li>
              <li className="flex gap-2.5"><Checkmark size={14} className="mt-0.5 shrink-0 text-ink-40" />Support at info@setmycareer.com — a person answers within a working day.</li>
            </ul>
          </div>
        </aside>
      </section>

      {/* mobile — the decision stays one thumb away */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-5 pb-[max(env(safe-area-inset-bottom),12px)] pt-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-4">
          <div>
            <p className="mono text-[9.5px] uppercase tracking-[0.14em] text-ink-40">Total</p>
            <p className="text-[17px] font-medium tabular-nums">{fmtINR(total)}</p>
          </div>
          <button
            type="button"
            onClick={() => void pay()}
            disabled={paying || (!!session && !terms)}
            className="btn btn--solid !px-6 disabled:opacity-50"
          >
            <span>{paying ? "Processing…" : !session ? "Sign in to continue" : "Complete purchase"}</span>
          </button>
        </div>
      </div>

      {/* verification overlay — the real stages, staged honestly:
          the handler fired (payment received) → server verifies the signature →
          the tier is granted in the same call → success screen */}
      {phase === "verifying" && (
        <div role="status" aria-live="polite" className="fixed inset-0 z-[80] grid place-items-center bg-paper/95 backdrop-blur-sm">
          <div className="w-full max-w-sm px-8">
            <p className="kicker">Almost there</p>
            <ol className="mt-6 flex flex-col gap-4">
              {[
                { label: "Payment received", done: true },
                { label: "Verifying with the payment server", done: false },
                { label: "Unlocking your portal", done: false },
              ].map((s) => (
                <li key={s.label} className="flex items-center gap-3 text-[15px]">
                  <span className={`grid size-5 place-items-center rounded-full border ${s.done ? "border-ink text-ink" : "border-ink-20 text-ink-40"}`}>
                    {s.done ? <Checkmark size={12} /> : <span className="size-1.5 animate-pulse rounded-full bg-current motion-reduce:animate-none" />}
                  </span>
                  <span className={s.done ? "text-ink" : "text-ink-60"}>{s.label}</span>
                </li>
              ))}
            </ol>
            <p className="mt-6 text-[12.5px] leading-relaxed text-ink-40">Don't close this tab — this takes a few seconds.</p>
          </div>
        </div>
      )}
    </main>
  )
}
