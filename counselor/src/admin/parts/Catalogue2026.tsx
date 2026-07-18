// The 2026 catalog panel — the NEW product line (src/server/offerings-2026.ts)
// rendered for the admin's packages screen, grouped by track, with the credit
// packs beneath. Sits behind the "2026 catalog | Legacy" toggle on Revenue &
// subscriptions; the legacy live catalogue (LivePanels) is untouched next to it.
// Also exports Badge2026 — the small mono marker used wherever a purchase /
// revenue row carries a NEW-catalog tier id.

import { Sparkles, Coins } from "lucide-react"
import { OFFERINGS_2026, CREDIT_PACKS_2026, NEW_TIER_IDS, type Track2026 } from "../../server/offerings-2026"
import { GRADIENT_PALETTES } from "../../portal/product/PackageGradient"
import { cn } from "@/lib/utils"

// Static CSS chip from the product's real palette — 14 rows of 44×32px thumbs
// don't justify 14 live WebGL contexts; the identity reads fine as a gradient.
function GradientChip({ offeringId }: { offeringId: string }) {
  const p = GRADIENT_PALETTES[offeringId]
  const bg = p ? `linear-gradient(135deg, ${p[0]}, ${p[1]} 55%, ${p[2]})` : "linear-gradient(135deg, #d6d3d1, #a8a29e)"
  return <span aria-hidden className="h-8 w-11 shrink-0 rounded-md" style={{ background: bg }} />
}

const TRACKS: { track: Track2026; label: string }[] = [
  { track: "student", label: "Student journey" },
  { track: "professional", label: "Professional" },
  { track: "marketplace", label: "Marketplace" },
  { track: "custom", label: "VCLP" },
]

const price = (inr: number) => (inr > 0 ? `₹${inr.toLocaleString("en-IN")}` : "Free")

/** True when a razorpay tier id belongs to the 2026 catalog. */
export const is2026Tier = (id?: string | null): boolean => !!id && NEW_TIER_IDS.has(id)

/** Small mono "2026" marker for purchase / revenue rows on new-catalog tier ids. */
export function Badge2026({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex shrink-0 items-center rounded border border-brand-200 bg-brand-50 px-1 py-px font-mono text-[9.5px] font-semibold leading-4 tracking-wide text-brand-700", className)}>
      2026
    </span>
  )
}

export function Catalogue2026Panel() {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-e2)]">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <h2 className="flex items-center gap-1.5 text-[12px] font-medium uppercase tracking-[0.14em] text-ink-300"><Sparkles className="size-3.5" /> 2026 catalog</h2>
        <span className="ml-auto text-[12px] text-muted-foreground">{OFFERINGS_2026.length} programmes · {CREDIT_PACKS_2026.length} credit packs</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border">
        {TRACKS.map(({ track, label }, ti) => {
          const items = OFFERINGS_2026.filter((o) => o.track === track)
          if (items.length === 0) return null
          return (
            <div key={track} className={cn(ti > 0 && "border-t border-border")}>
              <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-secondary/40 px-3 py-1.5 sm:grid-cols-[1fr_auto_auto_auto]">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400">{label}</span>
                <span className="hidden w-16 text-right text-[10px] font-medium uppercase tracking-wide text-ink-300 sm:block">Sessions</span>
                <span className="hidden w-28 text-right text-[10px] font-medium uppercase tracking-wide text-ink-300 sm:block">AI credits</span>
                <span className="w-20 text-right text-[10px] font-medium uppercase tracking-wide text-ink-300">Price</span>
              </div>
              {items.map((o) => (
                <div key={o.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-border/50 px-3 py-2 sm:grid-cols-[1fr_auto_auto_auto]">
                  <span className="flex min-w-0 items-center gap-2.5">
                    {/* the product's actual gradient identity — same palette the client sees */}
                    <GradientChip offeringId={o.id} />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-[12.5px] font-medium text-foreground">{o.name}</span>
                        {o.featured && <span className="shrink-0 rounded-full bg-brand-50 px-1.5 py-px text-[10px] font-semibold text-brand-700">Most popular</span>}
                      </span>
                      <span className="block truncate text-[10.5px] text-ink-400">{o.oneLine}</span>
                    </span>
                  </span>
                  <span className="hidden w-16 text-right text-[12px] tabular-nums text-muted-foreground sm:block">{o.sessions > 0 ? o.sessions : "—"}</span>
                  <span className="hidden w-28 text-right text-[11.5px] tabular-nums text-muted-foreground sm:block">
                    {o.careerCredits > 0 || o.voiceCredits > 0 ? `${o.careerCredits} career · ${o.voiceCredits} voice` : "—"}
                  </span>
                  <span className="w-20 text-right text-[12.5px] font-medium tabular-nums text-foreground">{price(o.inr)}</span>
                </div>
              ))}
            </div>
          )
        })}

        {/* credit packs (AI top-up store) */}
        <div className="border-t border-border">
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 bg-secondary/40 px-3 py-1.5 sm:grid-cols-[1fr_auto_auto_auto]">
            <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-400"><Coins className="size-3" /> Credit packs</span>
            <span className="hidden w-16 sm:block" />
            <span className="hidden w-28 text-right text-[10px] font-medium uppercase tracking-wide text-ink-300 sm:block">Grants</span>
            <span className="w-20 text-right text-[10px] font-medium uppercase tracking-wide text-ink-300">Price</span>
          </div>
          {CREDIT_PACKS_2026.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-t border-border/50 px-3 py-2 sm:grid-cols-[1fr_auto_auto_auto]">
              <span className="min-w-0">
                <span className="block truncate text-[12.5px] font-medium text-foreground">{p.name}</span>
                <span className="block truncate text-[10.5px] text-ink-400">AI Career Copilot top-up · {p.unit === "career" ? "chat" : "voice"}</span>
              </span>
              <span className="hidden w-16 sm:block" />
              <span className="hidden w-28 text-right text-[11.5px] tabular-nums text-muted-foreground sm:block">{p.amount} {p.unit}</span>
              <span className="w-20 text-right text-[12.5px] font-medium tabular-nums text-foreground">{price(p.inr)}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-2.5 text-[11px] text-ink-300">New tier ids are namespaced (sj_ / pro_ / mk_ / lt_ / cc_ / vc_) and never collide with legacy checkout ids. VCLP itself is application-only, priced by custom proposal — only its discovery conversation is listed.</p>
    </section>
  )
}
