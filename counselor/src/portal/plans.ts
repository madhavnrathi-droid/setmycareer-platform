// The client-side commercial model. Deliberately DATA-ONLY so pricing can move
// without touching a single screen (the founder flagged that pricing "keeps
// changing"). The shape encodes the agreed model: a small FREE tier to get
// started, upfront PACKAGES (credits bought once), recurring SUBSCRIPTIONS, and
// à-la-carte AI credits. Credits are the unit the product meters — human
// SESSIONS and AI-therapy MINUTES — so a screen never hard-codes an entitlement.

export type PortalPlanId = "free" | "starter" | "growth" | "premium"

/** The metered balance on an account. Sessions = human counsellor sessions left;
 *  aiMinutes = the LEGACY AI-therapy / voice-agent minutes balance (pre-2026
 *  accounts; still spendable as a fallback). The 2026 "AI Career Copilot"
 *  allowance is metered as careerCredits (chat) + voiceCredits (voice) — never
 *  surfaced as message counts or minutes. */
export interface PortalCredits {
  sessions: number
  aiMinutes: number
  careerCredits: number
  voiceCredits: number
}

export type PlanKind = "free" | "package" | "subscription"

export interface PortalPlan {
  id: PortalPlanId
  name: string
  tagline: string
  /** INR. 0 ⇒ free. */
  price: number
  /** Billing cadence — once for packages, month for subscriptions, null for free. */
  cadence: "once" | "month" | null
  kind: PlanKind
  /** What purchasing this plan grants: packages TOP-UP the balance, subscriptions
   *  refresh the monthly grant, free seeds the starting balance. */
  grants: PortalCredits
  features: string[]
  highlight?: boolean
}

export const PLANS: Record<PortalPlanId, PortalPlan> = {
  free: {
    id: "free",
    name: "Explore",
    tagline: "Start free — no card needed",
    price: 0,
    cadence: null,
    kind: "free",
    grants: { sessions: 0, aiMinutes: 15, careerCredits: 0, voiceCredits: 0 },
    features: [
      "Your living career profile",
      "15 minutes of AI guidance",
      "Message your counsellor",
      "Take the full assessment suite",
    ],
  },
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "A first block of real sessions",
    price: 4999,
    cadence: "once",
    kind: "package",
    grants: { sessions: 3, aiMinutes: 60, careerCredits: 0, voiceCredits: 0 },
    features: [
      "3 counsellor sessions",
      "60 min AI therapy",
      "Full Career Intelligence Report",
      "Priority replies",
    ],
  },
  growth: {
    id: "growth",
    name: "Growth",
    tagline: "Momentum, every month",
    price: 8999,
    cadence: "month",
    kind: "subscription",
    grants: { sessions: 4, aiMinutes: 150, careerCredits: 0, voiceCredits: 0 },
    features: [
      "4 sessions every month",
      "150 min AI therapy / month",
      "Report refreshed monthly",
      "Unlimited messaging",
    ],
    highlight: true,
  },
  premium: {
    id: "premium",
    name: "Premium",
    tagline: "Always-on, dedicated support",
    price: 15999,
    cadence: "month",
    kind: "subscription",
    grants: { sessions: 8, aiMinutes: 400, careerCredits: 0, voiceCredits: 0 },
    features: [
      "8 sessions every month",
      "400 min AI therapy / month",
      "Same-day scheduling",
      "A dedicated counsellor",
    ],
  },
}

export const PLAN_ORDER: PortalPlanId[] = ["free", "starter", "growth", "premium"]

/** À-la-carte AI-minute top-ups (the "extra credits for AI usage" path). */
export const AI_CREDIT_PACKS: { minutes: number; price: number }[] = [
  { minutes: 30, price: 499 },
  { minutes: 90, price: 1199 },
  { minutes: 200, price: 2299 },
]

/** Single human-session top-up for pay-as-you-go on top of any plan. */
export const SESSION_PACK = { sessions: 1, price: 1999 }

export const fmtINR = (n: number): string =>
  n === 0 ? "Free" : `₹${n.toLocaleString("en-IN")}`

export const cadenceLabel = (c: PortalPlan["cadence"]): string =>
  c === "month" ? "/mo" : c === "once" ? " once" : ""
