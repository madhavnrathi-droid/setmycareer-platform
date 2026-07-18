// Product page — a scrollable sales story (left) beside a sticky checkout rail
// (right). The story sells the outcome (process map, a live preview of the report
// and test, why it matters, pairings); the rail holds the bill, coupon and the
// secure Razorpay buy button. Paid products go through Razorpay Checkout
// (server-priced + HMAC-verified); free products unlock instantly. On desktop the
// rail stays in view as you scroll; on mobile it follows the story.

import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, ArrowRight, Check, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { getProduct, type Product, type ProductTier } from "../products"
import { storyFor } from "../product-story"
import { usePurchases, buyProduct, usePortalAccount } from "../portal-store"
import { payAndUnlock } from "../razorpay-checkout"
import { offering2026ById } from "@/server/offerings-2026"
import { Offering2026Page } from "./product/Offering2026"
import { StorySections } from "./product/StorySections"
import { CheckoutRail } from "./product/CheckoutRail"

function nextStepFor(p: Product): { to: string; label: string } {
  switch (p.category) {
    case "assessment": return { to: "/portal/assessments", label: "Go to assessments" }
    case "package": return { to: "/portal/journey", label: "View your journey" }
    default: return { to: "/portal/sessions", label: "Book your session" }
  }
}

export function PortalProduct() {
  const { productId } = useParams()
  const nav = useNavigate()
  const purchases = usePurchases()
  const account = usePortalAccount()
  const product = productId ? getProduct(productId) : undefined
  // 2026 offerings get the editorial spread (gradient hero, numbers board,
  // machinery); legacy products keep the story + rail page.
  const o26 = productId ? offering2026ById(productId) : undefined

  const firstTierId = product?.tiers?.find((t) => t.highlight)?.id ?? product?.tiers?.[0]?.id
  const [tierId, setTierId] = useState<string | undefined>(firstTierId)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  if (o26) return <Offering2026Page o={o26} />
  if (!product) {
    return <div className="py-20 text-center text-[14px] text-muted-foreground">That service doesn't exist.</div>
  }

  const story = storyFor(product)
  const tier: ProductTier | undefined = product.tiers?.find((t) => t.id === tierId) ?? product.tiers?.[0]
  const isOwned = tier
    ? purchases.some((x) => x.productId === product.id && x.tierId === tier.id)
    : purchases.some((x) => x.productId === product.id)
  const next = nextStepFor(product)

  const buy = async (coupon?: string) => {
    const price = tier?.price ?? product.priceFrom
    const label = tier ? `${product.name} — ${tier.name}` : product.name
    // free → unlock directly; paid → secure Razorpay checkout (unlock only on verify)
    if (!price || price <= 0) {
      buyProduct(product.id, tier?.id, { label, kind: "product" })
      toast(`${label} added`)
      setDone(true)
      return
    }
    setBusy(true)
    await payAndUnlock({
      tier: tier?.id ?? product.id,
      coupon,
      name: account?.name,
      email: account?.email,
      notes: { product: product.id, ...(tier?.id ? { tier: tier.id } : {}) },
      onPaid: (paymentId) => { buyProduct(product.id, tier?.id, { label, kind: "product", paymentId }); setDone(true) },
    })
    setBusy(false)
  }

  return (
    <div className="mx-auto w-full max-w-[1140px]">
      {/* back — below the topbar title, consistent across detail pages */}
      <Link to="/portal/services" className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-ink-300 hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Back to services
      </Link>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        {/* left — the scrollable sales story */}
        <div className="min-w-0">
          <StorySections product={product} story={story} />

          {/* questions footer */}
          <div className="mt-14 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground">
            <span>Have questions about this?</span>
            <Link to="/portal/therapy" className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline"><Sparkles className="size-3.5" /> Ask your AI guide</Link>
            <span className="text-ink-300">·</span>
            <Link to="/portal/services/consultation" className="font-medium text-brand-600 hover:underline">Book a consultation first</Link>
          </div>
        </div>

        {/* right — sticky checkout */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <CheckoutRail product={product} tier={tier} onSelectTier={setTierId} isOwned={isOwned} busy={busy} onBuy={buy} />

          {(done || isOwned) && (
            <div className="mt-4 rounded-2xl bg-well-50 p-4">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-well-600 text-white"><Check className="size-4" /></span>
                <p className="text-[13.5px] font-medium text-well-800">You're all set — here's your next step.</p>
              </div>
              <button onClick={() => nav(next.to)} className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-foreground px-4 py-2.5 text-[12.5px] font-medium text-background hover:opacity-90">
                {next.label} <ArrowRight className="size-3.5" />
              </button>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
