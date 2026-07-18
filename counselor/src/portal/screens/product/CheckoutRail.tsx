// The sticky checkout rail — the always-visible "bill ready to go" beside the
// scrollable sales story. Tier picker (for multi-tier products), a live coupon
// quote (server-validated, no order created), the itemised bill with the final
// total, terms, and the secure Razorpay buy button. The server is the source of
// truth for price + discount; this only previews and relays.

import { useEffect, useMemo, useState } from "react"
import { Tag, ShieldCheck, Check, X, Loader2, ChevronDown, Lock, ArrowUpRight } from "lucide-react"
import { fmtINR, type Product, type ProductTier } from "../../products"
import { paymentsReady } from "../../razorpay-checkout"
import { cn } from "@/lib/utils"

interface Quote { label: string; base: number; amount: number; discount: number; coupon: string | null }

/** paise → "₹1,990" */
const rupees = (paise: number) => fmtINR(Math.round(paise / 100))

async function fetchQuote(tier: string, coupon?: string): Promise<Quote | { error: string }> {
  try {
    const r = await fetch("/api/razorpay", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "quote", tier, coupon }),
    })
    return await r.json()
  } catch { return { error: "Couldn't reach the pricing server." } }
}

export function CheckoutRail({ product, tier, onSelectTier, isOwned, busy, onBuy }: {
  product: Product
  tier?: ProductTier
  onSelectTier?: (id: string) => void
  isOwned: boolean
  busy?: boolean
  onBuy: (coupon?: string) => void
}) {
  const tierKey = tier?.id ?? product.id
  const basePrice = tier?.price ?? product.priceFrom
  const isFree = basePrice <= 0
  const applyOnly = !!product.applyOnly

  const [coupon, setCoupon] = useState("")
  const [applied, setApplied] = useState<string | undefined>(undefined)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [quoting, setQuoting] = useState(false)
  const [couponErr, setCouponErr] = useState("")
  const [couponOpen, setCouponOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [payReady, setPayReady] = useState<boolean | null>(null)

  useEffect(() => { void paymentsReady().then(setPayReady) }, [])

  // (re)price whenever the tier or the applied coupon changes
  useEffect(() => {
    if (isFree || applyOnly) { setQuote(null); return }
    let live = true
    setQuoting(true)
    void fetchQuote(tierKey, applied).then((res) => {
      if (!live) return
      setQuoting(false)
      if ("error" in res) {
        setCouponErr(res.error); setApplied(undefined)
      } else {
        setQuote(res); setCouponErr("")
      }
    })
    return () => { live = false }
  }, [tierKey, applied, isFree])

  const base = quote?.base ?? basePrice * 100
  const discount = quote?.discount ?? 0
  const total = quote?.amount ?? base

  const included = useMemo(() => (tier?.features?.slice(0, 4).map((f) => `${f.label}: ${f.value}`)) ?? product.features?.slice(0, 4) ?? [], [tier, product])

  const applyCoupon = () => {
    const code = coupon.trim().toUpperCase()
    if (!code) return
    setCouponErr("")
    setApplied(code) // triggers the re-quote effect
  }
  const clearCoupon = () => { setApplied(undefined); setCoupon(""); setCouponErr("") }

  // ── application-only programmes (Blueprint / Autobiography): no online
  //    checkout — a discovery conversation and a custom proposal, applied for on
  //    the marketing programme page. ──
  if (applyOnly) {
    return (
      <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-[var(--shadow-e1)] backdrop-blur sm:p-6">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate text-[13px] font-medium text-foreground">{product.name}</p>
          <p className="font-display text-[22px] font-semibold leading-none tracking-tight text-foreground">Custom quote</p>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {product.priceLabel ?? (product.priceFrom > 0 ? `From ${fmtINR(product.priceFrom)}` : "By proposal")} · application only
        </p>
        <p className="mt-4 text-[12.5px] leading-relaxed text-ink-600">
          A multi-year engagement is priced and shaped after a conversation. Apply and a senior counsellor will reach out to talk it through — no obligation.
        </p>
        <a
          href={product.applyHref}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-brand-700"
        >
          {product.cta} <ArrowUpRight className="size-4" />
        </a>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
          <ShieldCheck className="size-3.5 text-well-600" /> No payment today — a discovery conversation first.
        </p>
        {(product.features?.length ?? 0) > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
            {product.features!.slice(0, 4).map((line) => (
              <li key={line} className="flex items-start gap-2 text-[12px] text-ink-600">
                <Check className="mt-0.5 size-3.5 shrink-0 text-well-600" /> {line}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-3xl border border-border bg-card/80 p-5 shadow-[var(--shadow-e1)] backdrop-blur sm:p-6">
      {/* tier picker — only for multi-tier products */}
      {product.tiers && product.tiers.length > 1 && (
        <div className="mb-5">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-ink-300">Choose your option</p>
          <div className="space-y-2">
            {product.tiers.map((t) => {
              const active = t.id === tierKey
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectTier?.(t.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition",
                    active ? "border-brand-500 bg-brand-50/60 ring-1 ring-brand-200" : "border-border hover:border-ink-300",
                  )}
                >
                  <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border-2", active ? "border-brand-600" : "border-ink-300")}>
                    {active && <span className="size-2 rounded-full bg-brand-600" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-foreground">{t.name}</span>
                      <span className="shrink-0 text-[13.5px] font-semibold tabular-nums text-foreground">{fmtINR(t.price)}</span>
                    </span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-muted-foreground">{t.summary}</span>
                  </span>
                  {t.highlight && <span className="shrink-0 rounded-full bg-brand-600 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">Popular</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* headline price */}
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-foreground">{tier?.name ?? product.name}</p>
          {product.duration && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{product.duration}{product.mode ? ` · ${product.mode}` : ""}</p>}
        </div>
        <p className="font-display text-[30px] font-semibold leading-none tracking-tight text-foreground">{isFree ? "Free" : rupees(total)}</p>
      </div>

      {/* coupon */}
      {!isFree && (
        <div className="mt-4">
          {applied && discount > 0 ? (
            <div className="flex items-center justify-between gap-2 rounded-xl bg-well-50 px-3 py-2">
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-well-700"><Check className="size-3.5" /> {quote?.coupon ?? applied} applied · −{rupees(discount)}</span>
              <button onClick={clearCoupon} className="text-well-700/70 transition hover:text-well-700" aria-label="Remove coupon"><X className="size-3.5" /></button>
            </div>
          ) : couponOpen ? (
            <div>
              <div className="flex items-center gap-2">
                <input
                  value={coupon}
                  onChange={(e) => { setCoupon(e.target.value); setCouponErr("") }}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  placeholder="Coupon code"
                  className="h-9 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-[13px] uppercase tracking-wide outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                />
                <button onClick={applyCoupon} disabled={quoting || !coupon.trim()} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-foreground px-3.5 text-[12.5px] font-medium text-background transition hover:opacity-90 disabled:opacity-50">
                  {quoting ? <Loader2 className="size-3.5 animate-spin" /> : "Apply"}
                </button>
              </div>
              {couponErr && <p className="mt-1.5 text-[11.5px] text-risk-600">{couponErr}</p>}
              <p className="mt-1.5 text-[11px] text-ink-300">Try <button onClick={() => setCoupon("WELCOME10")} className="font-medium text-brand-600 hover:underline">WELCOME10</button> for 10% off.</p>
            </div>
          ) : (
            <button onClick={() => setCouponOpen(true)} className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-600 transition hover:underline">
              <Tag className="size-3.5" /> Have a coupon code?
            </button>
          )}
        </div>
      )}

      {/* itemised bill */}
      {!isFree && (
        <dl className="mt-4 space-y-2 border-t border-border pt-4 text-[13px]">
          <div className="flex items-center justify-between">
            <dt className="text-muted-foreground">{tier?.name ?? product.name}</dt>
            <dd className="tabular-nums text-foreground">{rupees(base)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex items-center justify-between text-well-700">
              <dt>Coupon {quote?.coupon}</dt>
              <dd className="tabular-nums">−{rupees(discount)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2 text-[14px] font-semibold">
            <dt className="text-foreground">Total payable</dt>
            <dd className="tabular-nums text-foreground">{rupees(total)}</dd>
          </div>
          <p className="text-[10.5px] text-ink-300">Inclusive of all taxes.</p>
        </dl>
      )}

      {/* buy / unlock */}
      <button
        disabled={isOwned || busy}
        onClick={() => onBuy(applied)}
        className={cn(
          "mt-5 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-[14px] font-semibold transition",
          isOwned ? "cursor-default bg-muted text-muted-foreground"
            : "bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-60",
        )}
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : !isOwned && !isFree && <Lock className="size-4" />}
        {isOwned ? "Purchased" : isFree ? product.cta : busy ? "Opening secure checkout…" : `Pay ${rupees(total)} securely`}
      </button>

      {/* trust + included */}
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
        <ShieldCheck className="size-3.5 text-well-600" />
        {payReady === false ? "Demo checkout — no real charge yet." : "Secure payment via Razorpay · UPI, cards, netbanking."}
      </p>

      {included.length > 0 && (
        <ul className="mt-4 space-y-1.5 border-t border-border pt-4">
          {included.map((line) => (
            <li key={line} className="flex items-start gap-2 text-[12px] text-ink-600">
              <Check className="mt-0.5 size-3.5 shrink-0 text-well-600" /> {line}
            </li>
          ))}
        </ul>
      )}

      {/* notes & terms */}
      <div className="mt-4 border-t border-border pt-3">
        <button onClick={() => setTermsOpen((v) => !v)} className="flex w-full items-center justify-between text-[12px] font-medium text-muted-foreground transition hover:text-foreground">
          Notes & terms <ChevronDown className={cn("size-4 transition-transform", termsOpen && "rotate-180")} />
        </button>
        {termsOpen && (
          <div className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-ink-400">
            <p>Sessions are scheduled within the package validity once payment is confirmed.</p>
            <p>Reports are delivered to your account; assessment fees are non-refundable once a report is generated.</p>
            <p>Pricing is inclusive of applicable taxes. By continuing you agree to SetMyCareer's terms of service.</p>
          </div>
        )}
      </div>
    </div>
  )
}
