// Live pricing — pulls the REAL SetMyCareer package catalogue (read-only) and
// maps it onto the portal's product cards so members see production prices, not
// hardcoded demo figures. Display-level only: the amount actually charged still
// comes from the server-side price catalog (razorpay-core), which is the single
// source of truth for money. Cached once per session.

import { useEffect, useState } from "react"
import { getAllPackages, type PackagesData } from "@/lib/smc-api"

let catalogue: Promise<PackagesData[]> | null = null
const norm = (s?: string | null) => (s ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_")

// portal product id → real catalogue package_name (normalised)
const NAME_MAP: Record<string, string> = {
  consultation: "consultation",
  success_package: "accelerator", // "from" = cheapest tier
  accelerator: "accelerator",
  big_picture: "big_picture",
  true_north: "true_north",
  admission: "basic_admission",
  admission_basic: "basic_admission",
  admission_advance: "advance_admission",
  admission_premium: "premium_admission",
  psych_consult: "psychological_counselling",
  personality_dev: "personality_development",
  additional_session: "additional_session",
  coaching_mentoring: "coaching_mentoring",
}

export interface LivePricing {
  ready: boolean
  /** Lowest real online price (INR) for a portal product, or undefined if unmapped/unloaded. */
  priceFrom: (productId: string) => number | undefined
}

export function useLivePricing(): LivePricing {
  const [pkgs, setPkgs] = useState<PackagesData[] | null>(null)
  useEffect(() => {
    let alive = true
    if (!catalogue) catalogue = getAllPackages().catch(() => [] as PackagesData[])
    catalogue.then((p) => alive && setPkgs(p))
    return () => { alive = false }
  }, [])

  const priceFrom = (productId: string): number | undefined => {
    if (!pkgs) return undefined
    const target = NAME_MAP[productId]
    if (!target) return undefined
    const prices = pkgs
      .filter((p) => norm(p.package_name) === target)
      .map((p) => Number(p.price_online))
      .filter((n) => Number.isFinite(n) && n > 0)
    return prices.length ? Math.min(...prices) : undefined
  }

  return { ready: !!pkgs, priceFrom }
}
