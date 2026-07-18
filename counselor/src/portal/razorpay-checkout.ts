// ─────────────────────────────────────────────────────────────────────────────
// Client-side Razorpay checkout for the portal. The SECURE flow (per the Razorpay
// rules): the SERVER prices the order and HMAC-verifies the payment — the browser
// only opens Checkout and relays ids. Nothing unlocks unless the server returns
// { valid:true }. The publishable Key ID comes from /api/razorpay (config); the
// secret never reaches here.
//
//   buy click → POST {action:"order", tier}  → server creates a real order
//             → Razorpay Checkout (the popup)  → user pays
//             → POST {action:"verify", ...}     → server checks HMAC(order|payment)
//             → onPaid()  (ONLY when valid)     → grant the product/credits
// ─────────────────────────────────────────────────────────────────────────────

import { toast } from "sonner"

interface RzpConfig { keyId: string | null; mode: string; configured: boolean }
interface OrderResp { orderId?: string; amount?: number; discount?: number; coupon?: string; keyId?: string; label?: string; error?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RazorpayCtor = new (opts: any) => { open: () => void; on: (e: string, cb: (r: any) => void) => void }
const rzpGlobal = (): RazorpayCtor | undefined => (window as unknown as { Razorpay?: RazorpayCtor }).Razorpay

let configCache: Promise<RzpConfig> | null = null
/** Publishable key id + mode (cached per session). */
export function razorpayConfig(): Promise<RzpConfig> {
  if (!configCache) {
    configCache = fetch("/api/razorpay", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "config" }) })
      .then((r) => r.json())
      .catch(() => ({ keyId: null, mode: "unconfigured", configured: false }))
  }
  return configCache
}
/** Whether checkout can run (keys present on the server). */
export async function paymentsReady(): Promise<boolean> {
  return (await razorpayConfig()).configured
}

let scriptPromise: Promise<boolean> | null = null
function loadCheckoutScript(): Promise<boolean> {
  if (rzpGlobal()) return Promise.resolve(true)
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<boolean>((resolve) => {
    const s = document.createElement("script")
    s.src = "https://checkout.razorpay.com/v1/checkout.js"
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
  return scriptPromise
}

export interface PayOpts {
  /** A tier id present in the SERVER price catalog (razorpay-core PRICES). */
  tier: string
  coupon?: string
  name?: string
  email?: string
  notes?: Record<string, string>
  /** Called only after the server verifies the payment. Grant access HERE. */
  onPaid: (paymentId: string) => void
}

/** Run the full secure checkout. Resolves true only when paid AND server-verified. */
export async function payAndUnlock(opts: PayOpts): Promise<boolean> {
  const cfg = await razorpayConfig()
  if (!cfg.configured || !cfg.keyId) {
    toast.error("Payments aren't switched on yet — please try again shortly.")
    return false
  }
  if (!(await loadCheckoutScript()) || !rzpGlobal()) {
    toast.error("Couldn't load the secure payment window. Check your connection and retry.")
    return false
  }

  // 1) the server prices it and creates a real order
  const order: OrderResp = await fetch("/api/razorpay", {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ action: "order", tier: opts.tier, coupon: opts.coupon, notes: opts.notes }),
  }).then((r) => r.json()).catch(() => ({ error: "Couldn't reach the payment server." }))
  if (!order.orderId || order.error) {
    toast.error(order.error || "Couldn't start the payment.")
    return false
  }

  // 2) Checkout → 3) verify → 4) unlock
  return new Promise<boolean>((resolve) => {
    const Rzp = rzpGlobal()!
    const rzp = new Rzp({
      key: order.keyId ?? cfg.keyId,
      amount: order.amount,
      currency: "INR",
      name: "SetMyCareer",
      description: order.label,
      order_id: order.orderId,
      prefill: { name: opts.name, email: opts.email },
      theme: { color: "#089040" },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const v = await fetch("/api/razorpay", {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "verify", order_id: resp.razorpay_order_id, payment_id: resp.razorpay_payment_id, signature: resp.razorpay_signature }),
        }).then((r) => r.json()).catch(() => ({ valid: false }))
        if (v?.valid) {
          opts.onPaid(resp.razorpay_payment_id)
          toast.success("Payment successful — your purchase is unlocked.")
          resolve(true)
        } else {
          toast.error("Payment couldn't be verified, so nothing was unlocked. If you were charged it'll auto-refund.")
          resolve(false)
        }
      },
      modal: { ondismiss: () => resolve(false) },
    })
    rzp.on("payment.failed", (r: { error?: { description?: string } }) => {
      toast.error(r?.error?.description || "Payment failed. Please try again.")
      resolve(false)
    })
    rzp.open()
  })
}
