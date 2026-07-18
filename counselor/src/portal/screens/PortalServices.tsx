// The catalogue — ONLY the real 2026 programmes, rendered as the same liquid-
// gradient plates as the marketing site's pricing cards, in an editorial,
// asymmetric (Swiss/avant-garde) layout. Track-aware: a student/parent account
// sees the Student Journey ladder; a working professional sees the Professional
// track — chosen at sign-up, switchable here. The member's ACTIVE programme is
// pinned on top as a full-width plate; everything else sells. Legacy catalogue
// items (DIY, admission, psych add-ons…) are gone from this surface.

import { useMemo } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Check, Sparkles } from "lucide-react"
import { useGsap, revealChildren } from "@/lib/gsap"
import { OFFERINGS_2026, CREDIT_PACKS_2026, type Offering2026 } from "../../server/offerings-2026"
import { fmtINR, getProduct } from "../products"
import { usePurchases, useTrack, setAccountTrack, usePortalAccount, type PortalTrack } from "../portal-store"
import { PackageGradient } from "../product/PackageGradient"
import { cn } from "@/lib/utils"

// ── track voice — the same catalogue, told to two different lives ────────────
const TRACK_COPY: Record<PortalTrack, { eyebrow: string; h1: string; sub: string; ladder: string; ladderSub: string }> = {
  student: {
    eyebrow: "The 2026 catalogue · students & parents",
    h1: "One decision, any depth.",
    sub: "From a first honest read to complete career architecture. Every paid programme seats a parent in the room and ships the AI Career Copilot.",
    ladder: "The Student Journey",
    ladderSub: "Six rungs — start free, go as deep as the decision demands.",
  },
  professional: {
    eyebrow: "The 2026 catalogue · working professionals",
    h1: "Reinvention, by design.",
    sub: "Senior counsellors only. A diagnosis first, then a structured switch — what transfers, what it costs, what it pays on the other side.",
    ladder: "The Professional track",
    ladderSub: "Three engagements — from a working session to leadership-level reinvention.",
  },
}

const FEATURED_BY_TRACK: Record<PortalTrack, string> = { student: "sj_big_picture", professional: "pro_pivot" }

// includes lines for a plate — sessions, copilot, certificates (never minutes)
function plateIncludes(o: Offering2026): string[] {
  const out: string[] = []
  if (o.sessions > 0) out.push(`${o.sessions} counselling session${o.sessions > 1 ? "s" : ""}`)
  if (o.careerCredits > 0) out.push(`AI Copilot — ${o.careerCredits} Career · ${o.voiceCredits} Voice Credits`)
  if (o.certificates?.length) out.push(o.certificates.join(" · "))
  if (o.memory) out.push(o.memory)
  return out.slice(0, 3)
}

// ── the plate — one card grammar for every programme ─────────────────────────
function OfferingPlate({
  o, eyebrow, owned, featured = false, className = "",
}: {
  o: Offering2026
  eyebrow: string
  owned: boolean
  featured?: boolean
  className?: string
}) {
  return (
    <Link
      to={`/portal/services/${o.id}`}
      data-reveal
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-[22px] p-5 text-white sm:p-6",
        featured ? "min-h-[300px] sm:min-h-[340px]" : "min-h-[220px]",
        className,
      )}
    >
      <PackageGradient offeringId={o.id} />
      <div className="relative z-10 flex items-start justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">{eyebrow}</span>
        <span className="text-right">
          <span className={cn("block font-display font-semibold tabular-nums leading-none", featured ? "text-[26px]" : "text-[20px]")}>
            {o.inr === 0 ? "Free" : <><sup className="mr-0.5 text-[0.55em] font-normal align-super">₹</sup>{o.inr.toLocaleString("en-IN")}</>}
          </span>
          {o.usd ? <span className="mt-1 block text-[10px] text-white/50">${o.usd} USD</span> : null}
        </span>
      </div>
      <div className="relative z-10">
        {featured && !owned && (
          <span className="mb-2 inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/90 ring-1 ring-white/25 backdrop-blur-sm">Most chosen</span>
        )}
        {owned && (
          <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-well-500/25 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-white ring-1 ring-well-400/40 backdrop-blur-sm"><Check className="size-3" /> Active</span>
        )}
        <h3 className={cn("font-display font-semibold tracking-tight", featured ? "text-[30px] sm:text-[36px]" : "text-[21px]")}>{o.name}</h3>
        <p className={cn("mt-1 font-light leading-snug text-white/75", featured ? "max-w-[44ch] text-[13.5px]" : "max-w-[38ch] text-[12.5px]")}>{o.oneLine}</p>
        {featured && (
          <ul className="mt-3 space-y-1 border-t border-white/15 pt-3">
            {plateIncludes(o).map((l) => (
              <li key={l} className="text-[12px] font-light text-white/70">{l}</li>
            ))}
          </ul>
        )}
        <span className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/90 underline-offset-4 group-hover:underline">
          {owned ? "Open your journey" : o.inr === 0 ? "Start free" : "See the programme"} <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  )
}

export function PortalServices() {
  const purchases = usePurchases()
  const account = usePortalAccount()
  const track = useTrack()
  const root = useGsap((s) => revealChildren(s), [track])
  const copy = TRACK_COPY[track]

  // 2026 ownership — marketing-site purchases carry productId === tierId, in-portal
  // ones may carry the id in either slot, so test both.
  const ownedIds = useMemo(() => {
    const s = new Set<string>()
    for (const p of purchases) { s.add(p.productId); if (p.tierId) s.add(p.tierId) }
    return s
  }, [purchases])

  const activeProgramme = useMemo(() => {
    const paid = OFFERINGS_2026.filter((o) => ownedIds.has(o.id) && o.inr > 0 && (o.track === "student" || o.track === "professional"))
    return paid.sort((a, b) => b.inr - a.inr)[0]
  }, [ownedIds])

  const trackKey = track === "student" ? "student" : "professional"
  const ladder = OFFERINGS_2026.filter((o) => o.track === trackKey)
  const featuredId = FEATURED_BY_TRACK[track]
  const marketplace = OFFERINGS_2026.filter(
    (o) => o.track === "marketplace" && o.id !== (track === "student" ? "pro_extra_session" : "sj_extra_session"),
  )
  const longterm = OFFERINGS_2026.find((o) => o.id === (track === "student" ? "lt_blueprint" : "lt_autobiography"))
  const longtermHref = longterm ? getProduct(longterm.id)?.applyHref : undefined
  const trackLabel = track === "student" ? "Student journey" : "Professional"

  return (
    <div ref={root} className="max-w-5xl">
      {/* ── editorial masthead + the track switch ── */}
      <div data-reveal className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-ink-300">{copy.eyebrow}</p>
          <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.02] tracking-tight sm:text-[38px]">{copy.h1}</h1>
          <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-muted-foreground">{copy.sub}</p>
        </div>
        {account && (
          <div className="flex items-center gap-1 rounded-full bg-secondary p-1" role="tablist" aria-label="Catalogue track">
            {(["student", "professional"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                aria-selected={track === t}
                onClick={() => setAccountTrack(t)}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition",
                  track === t ? "bg-card text-foreground shadow-[0_1px_2px_rgba(35,31,32,0.08)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t === "student" ? "Student / parent" : "Professional"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── the ACTIVE programme — pinned, full width ── */}
      {activeProgramme && (
        <section className="mt-8" aria-label="Your active programme">
          <Link
            to="/portal/journey"
            data-reveal
            className="group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-[22px] p-6 text-white sm:p-8"
          >
            <PackageGradient offeringId={activeProgramme.id} />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-well-500/25 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white ring-1 ring-well-400/40 backdrop-blur-sm">
                <span className="size-1.5 animate-pulse rounded-full bg-well-400" /> Active programme
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/55">{trackLabel}</span>
            </div>
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="font-display text-[30px] font-semibold tracking-tight sm:text-[38px]">{activeProgramme.name}</h2>
                <p className="mt-1 max-w-[52ch] text-[13.5px] font-light text-white/75">{activeProgramme.oneLine}</p>
                {account && (
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.12em] text-white/60">
                    {account.credits.sessions} session{account.credits.sessions === 1 ? "" : "s"} left · {account.credits.careerCredits} Career · {account.credits.voiceCredits} Voice Credits
                  </p>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-foreground transition group-hover:gap-2.5">
                Open your journey <ArrowRight className="size-3.5" />
              </span>
            </div>
          </Link>
        </section>
      )}

      {/* ── the ladder — asymmetric editorial grid, featured plate leads ── */}
      <section className="mt-10" aria-label={copy.ladder}>
        <div data-reveal className="flex items-baseline justify-between border-t border-border pt-5">
          <h2 className="font-display text-[18px] font-semibold tracking-tight">{copy.ladder}</h2>
          <span className="text-[12px] text-muted-foreground">{copy.ladderSub}</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {ladder.map((o, i) => (
            <OfferingPlate
              key={o.id}
              o={o}
              eyebrow={`${String(i + 1).padStart(2, "0")} · ${trackLabel}`}
              owned={ownedIds.has(o.id) && o.inr > 0}
              featured={o.id === featuredId}
              className={o.id === featuredId ? "sm:col-span-2" : ""}
            />
          ))}
        </div>
      </section>

      {/* ── marketplace — add to any programme ── */}
      <section className="mt-10" aria-label="Marketplace">
        <div data-reveal className="flex items-baseline justify-between border-t border-border pt-5">
          <h2 className="font-display text-[18px] font-semibold tracking-tight">Add to any programme</h2>
          <span className="text-[12px] text-muted-foreground">Experts and extra sessions, à la carte.</span>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {marketplace.map((o, i) => (
            <OfferingPlate key={o.id} o={o} eyebrow={`${String(i + 1).padStart(2, "0")} · Marketplace`} owned={false} />
          ))}
        </div>
      </section>

      {/* ── long-term — application only, priced by conversation ── */}
      {longterm && (
        <section className="mt-10" aria-label="Long-term programme">
          <div data-reveal className="flex items-baseline justify-between border-t border-border pt-5">
            <h2 className="font-display text-[18px] font-semibold tracking-tight">When it needs years, not a session</h2>
            <span className="text-[12px] text-muted-foreground">Application only — a conversation first, never a checkout.</span>
          </div>
          <a
            href={longtermHref ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            data-reveal
            className="group relative mt-4 flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[22px] p-6 text-white sm:p-8"
          >
            <PackageGradient offeringId={longterm.id} />
            <div className="relative z-10 flex items-center justify-between gap-3">
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-white/60">Long-term · {trackLabel}</span>
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-white/70">Application only · from {fmtINR(longterm.inr)}</span>
            </div>
            <div className="relative z-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-[28px] font-semibold tracking-tight sm:text-[32px]">{longterm.name}</h3>
                <p className="mt-1 max-w-[52ch] text-[13px] font-light text-white/75">{longterm.oneLine}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-white/90 underline-offset-4 group-hover:underline">
                Apply — start a conversation <ArrowUpRight className="size-3.5" />
              </span>
            </div>
          </a>
        </section>
      )}

      {/* ── copilot credits — quiet, one line ── */}
      <div data-reveal className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <p className="text-[13px] text-muted-foreground">
          <span className="font-medium text-foreground">AI Copilot credits</span> — top up anytime:{" "}
          {CREDIT_PACKS_2026.map((p) => `${p.name} ${fmtINR(p.inr)}`).join(" · ")}
        </p>
        <Link to="/portal/billing" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-brand-600 hover:underline">
          Top up in Plan &amp; credits <ArrowRight className="size-3.5" />
        </Link>
      </div>

      {/* ── the guide — for the undecided ── */}
      <div data-reveal className="mt-8 flex items-center gap-3 rounded-2xl bg-secondary/50 p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-card text-mind-600 shadow-[var(--shadow-e1)]">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-foreground">Not sure which depth?</p>
          <p className="text-[12.5px] text-muted-foreground">Ask your AI guide — it knows every programme and recommends by your situation, not by price.</p>
        </div>
        <Link to="/portal/therapy" className="shrink-0 rounded-full bg-foreground px-4 py-2 text-[12.5px] font-medium text-background hover:opacity-90">Ask the guide</Link>
      </div>
    </div>
  )
}
