// Offering2026 — the editorial product page for the 2026 catalogue. A magazine
// spread, not a brochure: the liquid-gradient plate carries the name and price;
// everything below is graphic-first — a numbers board of what's inside, the
// actual scientific machinery behind the work, the arc of how it runs, and who
// it is for. Minimal words, zero ambiguity.
//
// Checkout is ONE click from here (the catalogue click was the other): the hero
// CTA opens Razorpay directly (server-priced, HMAC-verified); on success the
// account is granted sessions/credits and the purchase lands in the journey.

import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Check, Lock, ShieldCheck, Sparkles, Ticket } from "lucide-react"
import { toast } from "sonner"
import type { Offering2026 } from "@/server/offerings-2026"
import { getProduct, fmtINR } from "../../products"
import { usePurchases, buyProduct, usePortalAccount } from "../../portal-store"
import { purchaseTest } from "../../tests/results-store"
import { payAndUnlock } from "../../razorpay-checkout"
import { PackageGradient } from "../../product/PackageGradient"
import { PipelineDiagram, MethodRail, InstrumentList } from "./ProductDiagrams"

const TRACK_LABEL: Record<Offering2026["track"], string> = {
  student: "Student journey",
  professional: "Professional",
  marketplace: "Marketplace",
  custom: "Long-term programme",
}

/* the machinery — the real instruments and engines doing the work. Only the
   rows that apply to this offering are shown. */
function machinery(o: Offering2026): { n: string; t: string; d: string }[] {
  const rows: { n: string; t: string; d: string; when: boolean }[] = [
    { n: "01", t: "Personality Test", d: "72 items · 6 factors · 18 facets, norm-referenced against real respondents", when: o.track !== "marketplace" },
    { n: "02", t: "Interest Pattern Test", d: "96 items · 32 interest clusters, matched by the JCE profile-similarity engine", when: o.track !== "marketplace" },
    { n: "03", t: "Ability Test", d: "Verbal · numerical · logical · spatial — objectively scored", when: o.track === "student" },
    { n: "04", t: "Career ontology", d: "31 career dimensions + 9 context dimensions grounding every recommendation", when: o.track !== "marketplace" },
    { n: "05", t: "A human counsellor", d: "Reads the results with you — the judgement stays human", when: o.sessions > 0 || o.track === "custom" },
    { n: "06", t: "AI Career Copilot", d: "Chat + voice guidance between sessions, grounded in your own results", when: o.careerCredits > 0 || o.voiceCredits > 0 },
    { n: "07", t: "A practitioner, not a counsellor", d: "Someone who has actually done the career answers what it's really like", when: o.id === "mk_meet_expert" },
  ]
  return rows.filter((r) => r.when).map(({ n, t, d }) => ({ n, t, d }))
}

/* the arc — how it runs, per track */
function arc(o: Offering2026): { t: string; d: string }[] {
  if (o.track === "custom")
    return [
      { t: "Apply", d: "A conversation first — the programme is designed around you" },
      { t: "Design", d: "A multi-year plan with your dedicated counsellor" },
      { t: "Walk it", d: "Up to ~100 sessions across 3–5 years, reviewed each term" },
    ]
  if (o.track === "marketplace")
    return [
      { t: "Book", d: "Pick a time that fits — confirmation is instant" },
      { t: "Meet", d: "60 focused minutes, cameras on, no script" },
      { t: "Keep it", d: "Notes and next steps land in your journey" },
    ]
  return [
    { t: "Assess", d: "Validated instruments, scored live — about 30 minutes total" },
    { t: "Understand", d: o.sessions > 0 ? `${o.sessions} counselling session${o.sessions === 1 ? "" : "s"} to read the results with you` : "Your copilot walks the results with you" },
    { t: "Decide", d: "A report and a plan you can defend at home" },
    { t: "Act", d: "Credits keep the copilot with you between decisions" },
  ]
}

export function Offering2026Page({ o }: { o: Offering2026 }) {
  const nav = useNavigate()
  const account = usePortalAccount()
  const purchases = usePurchases()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [showCoupon, setShowCoupon] = useState(false)
  const [coupon, setCoupon] = useState("")

  const applyHref = getProduct(o.id)?.applyHref
  const applyOnly = o.track === "custom"
  const free = o.inr === 0
  // marketplace offerings (expert meetings, extra sessions) are CONSUMABLE —
  // buying one must never block buying another
  const consumable = o.track === "marketplace"
  const purchased = purchases.some((p) => p.productId === o.id || p.tierId === o.id)
  const owned = purchased && !consumable

  // a paid programme includes the full Sigma battery — unlock the premium
  // aptitude test alongside the credit/session grants
  const grantExtras = () => {
    if (account && o.inr > 0 && (o.track === "student" || o.track === "professional")) {
      purchaseTest(account.clientId, "aptitude")
    }
  }

  const buy = async () => {
    if (owned || busy) return
    if (free) {
      buyProduct(o.id, undefined, { label: o.name, kind: "product" })
      toast(`${o.name} added`)
      setDone(true)
      return
    }
    setBusy(true)
    await payAndUnlock({
      tier: o.id,
      coupon: coupon.trim() || undefined,
      name: account?.name,
      email: account?.email,
      notes: { product: o.id },
      onPaid: (paymentId) => {
        buyProduct(o.id, undefined, { label: o.name, kind: "product", paymentId })
        grantExtras()
        setDone(true)
      },
    })
    setBusy(false)
  }

  const inside: { v: string; l: string }[] = [
    ...(o.sessions > 0 ? [{ v: String(o.sessions), l: `counselling session${o.sessions === 1 ? "" : "s"} · 60 min` }] : []),
    ...(o.careerCredits > 0 ? [{ v: String(o.careerCredits), l: "Career Credits (AI copilot)" }] : []),
    ...(o.voiceCredits > 0 ? [{ v: String(o.voiceCredits), l: "Voice Credits (live voice)" }] : []),
    ...(o.sessions > 0 && o.track !== "marketplace" ? [{ v: "1", l: "Career Intelligence Report" }] : []),
    ...(o.memory ? [{ v: "◦", l: o.memory }] : []),
    ...(o.certificates?.length ? [{ v: String(o.certificates.length), l: o.certificates.join(" · ") }] : []),
  ]

  const cta = applyOnly ? (
    <a
      href={applyHref ?? "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-ink-900 transition hover:bg-white/90"
    >
      Apply — start a conversation <ArrowUpRight className="size-4" />
    </a>
  ) : owned || (done && !consumable) ? (
    <button
      onClick={() => nav("/portal/journey")}
      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-ink-900 transition hover:bg-white/90"
    >
      <Check className="size-4" /> Yours — open your journey
    </button>
  ) : (
    <button
      onClick={buy}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-[13.5px] font-medium text-ink-900 transition hover:bg-white/90 disabled:opacity-60"
    >
      {busy
        ? "Opening secure checkout…"
        : free
          ? "Start free"
          : consumable && (purchased || done)
            ? <>Book another · {fmtINR(o.inr)} <ArrowRight className="size-4" /></>
            : <>Pay {fmtINR(o.inr)} · unlock now <ArrowRight className="size-4" /></>}
    </button>
  )

  return (
    <div className="mx-auto w-full max-w-[1040px]">
      <Link
        to="/portal/services"
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:border-ink-300 hover:text-foreground"
      >
        ← All programmes
      </Link>

      {/* ── the plate: name + price live ON the artwork ── */}
      <div className="relative mt-5 overflow-hidden rounded-3xl">
        <div className="relative min-h-[420px] sm:min-h-[460px]">
          <PackageGradient offeringId={o.id} className="absolute inset-0" />
          {/* extra scrim so white copy holds WCAG contrast over the BRIGHT
              palettes (mint/sky/amber) — the engine's own scrim is too light */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/5 to-black/45" />
          <div className="relative z-10 flex min-h-[420px] flex-col justify-between p-6 sm:min-h-[460px] sm:p-10">
            <div className="flex items-start justify-between gap-4">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-white/80">{TRACK_LABEL[o.track]}</p>
              {o.featured && (
                <span className="rounded-full bg-white/15 px-3 py-1 text-[10.5px] font-medium uppercase tracking-[0.1em] text-white backdrop-blur-sm">
                  Most chosen
                </span>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
                <h1 className="max-w-[14ch] font-editorial text-[clamp(2.4rem,6vw,4.4rem)] font-light leading-[0.98] tracking-[-0.015em] text-white">
                  {o.name}
                </h1>
                <p className="pb-1 text-white">
                  {applyOnly ? (
                    <span className="text-[15px] font-medium text-white/85">Application only · from {fmtINR(o.inr)}</span>
                  ) : free ? (
                    <span className="font-editorial text-[40px] font-light">Free</span>
                  ) : (
                    <span className="font-editorial text-[40px] font-light">
                      <sup className="mr-0.5 text-[18px]">₹</sup>
                      {o.inr.toLocaleString("en-IN")}
                    </span>
                  )}
                </p>
              </div>
              <p className="mt-3 max-w-[58ch] text-[14px] font-light leading-relaxed text-white/80">{o.oneLine}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {o.solves.map((s) => (
                  <span key={s} className="rounded-full bg-white/12 px-3 py-1 text-[11.5px] text-white/85 backdrop-blur-sm">{s}</span>
                ))}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {cta}
                {!applyOnly && !free && !owned && !done && (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-white/65">
                    <ShieldCheck className="size-3.5" /> Razorpay · UPI, cards, netbanking · unlocks instantly
                  </span>
                )}
              </div>
              {!applyOnly && !free && !owned && !done && (
                <div className="mt-3">
                  {showCoupon ? (
                    <div className="flex max-w-[300px] items-center gap-2">
                      <input
                        value={coupon}
                        onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                        placeholder="COUPON CODE"
                        className="h-9 flex-1 rounded-full bg-white/15 px-4 font-mono text-[11.5px] uppercase tracking-wide text-white outline-none backdrop-blur-sm placeholder:text-white/40"
                      />
                      <span className="text-[11px] text-white/55">applies at checkout</span>
                    </div>
                  ) : (
                    <button onClick={() => setShowCoupon(true)} className="inline-flex items-center gap-1.5 text-[11.5px] text-white/60 hover:text-white/90">
                      <Ticket className="size-3.5" /> Have a coupon?
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── the numbers board — what's inside, at a glance ── */}
      {inside.length > 0 && (
        <section className="mt-12">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-300">What's inside</p>
          {/* per-tile borders (not the gap-as-line trick) so an odd item count
              never leaves a solid grey filler cell in the trailing track */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {inside.map((x) => (
              <div key={x.l} className="rounded-2xl border border-border bg-card px-5 py-6">
                <p className="font-editorial text-[34px] font-light leading-none tracking-tight tabular-nums">{x.v}</p>
                <p className="mt-2 text-[12px] leading-snug text-muted-foreground">{x.l}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── the machinery — a PIPELINE diagram of how it works, then the exact
          instruments beneath it (framework first, evidence second) ── */}
      <section className="mt-14">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-300">How the work happens</p>
        <h2 className="mt-3 max-w-[20ch] font-editorial text-[27px] font-light leading-[1.08] tracking-tight sm:text-[32px]">
          Instruments in, a decision out.
        </h2>
        <div className="mt-6"><PipelineDiagram o={o} /></div>
        {machinery(o).length > 0 && (
          <div className="mt-8">
            <p className="mb-3 font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-300">What's under the hood</p>
            <InstrumentList rows={machinery(o)} />
          </div>
        )}
      </section>

      {/* ── the arc — how it runs over time, as a connected rail ── */}
      <section className="mt-14">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-300">How it runs</p>
        <h2 className="mt-3 font-editorial text-[27px] font-light leading-[1.08] tracking-tight sm:text-[32px]">
          {o.track === "custom" ? "A multi-year partnership." : o.track === "marketplace" ? "One focused hour." : "Four moves, at your pace."}
        </h2>
        <div className="mt-7"><MethodRail steps={arc(o)} /></div>
      </section>

      {/* ── after you pay — no surprises ── */}
      {!applyOnly && (
        <section className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-[54ch]">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-300">After you {free ? "start" : "pay"}</p>
              <ul className="mt-3 flex flex-col gap-1.5 text-[13px] leading-relaxed text-ink-600">
                <li className="flex items-center gap-2"><Check className="size-3.5 shrink-0 text-well-600" /> Everything unlocks instantly — credits land in your wallet</li>
                <li className="flex items-center gap-2"><Check className="size-3.5 shrink-0 text-well-600" /> The programme appears in your journey, step by step</li>
                {o.sessions > 0 && (
                  <li className="flex items-center gap-2"><Check className="size-3.5 shrink-0 text-well-600" /> Sessions are bookable right away, times that suit you</li>
                )}
              </ul>
            </div>
            <div className="flex flex-col items-start gap-2">
              {applyOnly ? null : owned || (done && !consumable) ? (
                <button onClick={() => nav("/portal/journey")} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[13.5px] font-medium text-background transition hover:opacity-90">
                  Open your journey <ArrowRight className="size-4" />
                </button>
              ) : (
                <button onClick={buy} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[13.5px] font-medium text-background transition hover:opacity-90 disabled:opacity-60">
                  {busy ? "Opening secure checkout…" : free ? "Start free" : consumable && (purchased || done) ? <>Book another · {fmtINR(o.inr)}</> : <>Pay {fmtINR(o.inr)} <Lock className="size-3.5" /></>}
                </button>
              )}
              <span className="text-[11px] text-ink-300">{free ? "No card needed." : "Secure Razorpay checkout · verified before unlock."}</span>
            </div>
          </div>
        </section>
      )}

      {/* questions footer */}
      <div className="mt-10 flex flex-wrap items-center gap-3 border-t border-border pt-6 text-[13px] text-muted-foreground">
        <span>Not sure it's the right fit?</span>
        <Link to="/portal/therapy" className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:underline">
          <Sparkles className="size-3.5" /> Ask your AI guide
        </Link>
        <span className="text-ink-300">·</span>
        <Link to="/portal/services" className="font-medium text-brand-600 hover:underline">Compare programmes</Link>
      </div>
    </div>
  )
}
