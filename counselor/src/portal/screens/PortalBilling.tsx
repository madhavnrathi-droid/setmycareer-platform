// Package & credits. SetMyCareer sells PACKAGES (the 2026 journeys) and
// à-la-carte AI credits — there are no subscription plans. This page shows the
// member's package and balances, sells credit top-ups through real Razorpay
// checkout (server-priced + HMAC-verified), and — the part most pages skip —
// teaches them how to actually SPEND credits well: what to ask Compass, what
// they'll get back, split by who's asking (parents / students / executives).

import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Coins, Zap, Sparkles, Mic, ArrowRight, MessageCircle, ChevronDown } from "lucide-react"
import {
  usePortalAccount,
  buyCredits,
  buyCreditPack,
} from "../portal-store"
import { CREDIT_PACKS_2026, offering2026ById } from "../../server/offerings-2026"
import { payAndUnlock } from "../razorpay-checkout"
import { fmtINR, AI_CREDIT_PACKS, SESSION_PACK } from "../plans"
import { cn } from "@/lib/utils"

/* ── the clarity guide content — what to ask, by who's asking ──────────────── */

type Audience = "students" | "parents" | "executives"

const GUIDE: Record<Audience, { label: string; intro: string; asks: { q: string; a: string }[] }> = {
  students: {
    label: "Students",
    intro: "Use credits to interrogate your own results — the more specific the question, the sharper the answer.",
    asks: [
      { q: "My interest report says Data Science is 'Supported' but Design is what excites me. What am I missing?", a: "Compass reads both scores — attraction versus career-level — and explains the gap: what the day-to-day work of each really involves, and what a hobby-versus-career split looks like for you." },
      { q: "Which stream should I take after Class 10 if my strongest clusters are Law and Public Policy?", a: "A stream-by-stream mapping from your actual clusters — with the subjects that keep those doors open and the ones that quietly close them." },
      { q: "What does my ability grade in Numerical actually mean for engineering?", a: "A plain-language read of the grade against what engineering courses demand — where you'd be comfortable, where you'd have to work harder." },
      { q: "Give me three careers my results point to that I probably haven't considered.", a: "Cross-referenced picks from your interest pattern and the live market board, each with why it fits and what to explore this month." },
    ],
  },
  parents: {
    label: "Parents",
    intro: "Ask on your child's behalf — Compass answers from their real scores, not generalities.",
    asks: [
      { q: "My daughter's report leans creative but we're a family of engineers. How risky is a design path today?", a: "An honest market read — demand, pay bands and growth for design careers in India — set against her actual measured fit, so the conversation at home starts from evidence." },
      { q: "Is my son's low score in System Orientation a problem?", a: "What the factor actually measures, why lower isn't worse, and which environments suit that style — the report's own language, explained simply." },
      { q: "What should we realistically budget for the path the report recommends?", a: "Typical education routes and costs for the recommended clusters, and the cheaper routes that reach the same place." },
      { q: "What questions should we ask in the counselling session?", a: "A prepared list drawn from the report's strongest and most conflicting signals — so the paid hour goes to decisions, not orientation." },
    ],
  },
  executives: {
    label: "Executives",
    intro: "Use credits between sessions to pressure-test moves before you make them.",
    asks: [
      { q: "My CCPA shows high Analytical Reasoning but lower Influence. What roles reward that exact shape?", a: "Role families where deep analysis outweighs stakeholder theatre — plus what a lateral move into them typically looks like at your experience band." },
      { q: "I'm choosing between a people-manager track and a specialist track. What do my results say?", a: "Your competency profile mapped against both tracks, with the trade-offs named — and the two questions to take to your counsellor." },
      { q: "How do I position a pivot from delivery to product in my next appraisal?", a: "A positioning draft grounded in your measured strengths, with the skills gap stated honestly and a 90-day plan to close it." },
      { q: "Which of my competencies should I invest in first for a leadership role?", a: "The one or two growth areas with the highest leverage for your target — not a generic leadership syllabus." },
    ],
  },
}

const FAQS: { q: string; a: string }[] = [
  { q: "What does one Career Credit buy?", a: "One full question to Compass — including follow-ups inside the same thread. A focused conversation of 8–10 exchanges typically uses 3–4 credits." },
  { q: "What are Voice Credits?", a: "Minutes with the live voice counsellor — talk through your report hands-free. One credit is one minute of live voice." },
  { q: "Do credits expire?", a: "No. They stay on your account until you use them, across every device you sign in on." },
  { q: "Is Compass a replacement for my counsellor?", a: "No — it prepares you for your counsellor. Use credits to understand your results and arrive at sessions with sharper questions; the human makes the call with you." },
  { q: "Can Compass see my results?", a: "Yes — it answers from your actual test scores, your profile and the report logic, not from generic advice." },
]

export function PortalBilling() {
  const account = usePortalAccount()
  const [audience, setAudience] = useState<Audience>("students")
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const prefill = { name: account?.name, email: account?.email }
  const payAiMinutes = (minutes: number) =>
    void payAndUnlock({ tier: `ai_${minutes}`, ...prefill, notes: { kind: "ai_minutes" }, onPaid: () => buyCredits("aiMinutes", minutes) })
  const paySession = () =>
    void payAndUnlock({ tier: "session_pack", ...prefill, notes: { kind: "session" }, onPaid: () => buyCredits("sessions", SESSION_PACK.sessions) })
  const payCreditPack = (packId: string) =>
    void payAndUnlock({ tier: packId, ...prefill, notes: { kind: "credit_pack", pack: packId }, onPaid: () => buyCreditPack(packId) })

  const pkg = useMemo(() => {
    const buys = account?.purchases ?? []
    const named = [...buys].reverse().find((b) => b.label || b.productId)
    if (!named) return null
    return named.label ?? offering2026ById(named.productId)?.name ?? named.productId
  }, [account])

  if (!account) return null
  const legacyMinutes = account.credits.aiMinutes ?? 0
  const careerPacks = CREDIT_PACKS_2026.filter((p) => p.unit === "career")
  const voicePacks = CREDIT_PACKS_2026.filter((p) => p.unit === "voice")
  const g = GUIDE[audience]

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      {/* masthead */}
      <div className="border-b border-border pb-8">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-300">Package &amp; credits</p>
        <h1 className="mt-3 font-editorial text-[32px] font-light leading-[1.05] tracking-tight sm:text-[40px]">
          One package.
          <br />
          Credits when you want more.
        </h1>
        <p className="mt-3 max-w-[56ch] text-[14px] font-light leading-relaxed text-muted-foreground">
          Everything essential ships with your package — the assessments, your report, your counsellor.
          Credits are the à-la-carte layer on top: more questions to Compass, more voice time, more sessions.
        </p>
      </div>

      {/* the package + balances — one stat strip */}
      <section>
        <div className={cn(
          "grid grid-cols-2 divide-x divide-border border-y border-border",
          legacyMinutes > 0 ? "sm:grid-cols-5" : "sm:grid-cols-4",
        )}>
          <div className="px-5 py-5 first:pl-0">
            <p className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Your package</p>
            {pkg ? (
              <p className="mt-1.5 font-display text-[17px] font-semibold leading-snug tracking-tight text-foreground">{pkg}</p>
            ) : (
              <Link to="/portal/services" className="mt-1.5 inline-flex items-center gap-1 text-[14px] font-medium text-brand-600 hover:underline">
                Choose one <ArrowRight className="size-3.5" />
              </Link>
            )}
          </div>
          <div className="px-5 py-5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><Coins className="size-3.5 text-warn-500" /> Sessions</p>
            <p className="mt-1.5 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{account.credits.sessions}</p>
          </div>
          <div className="px-5 py-5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><Sparkles className="size-3.5 text-brand-600" /> Career Credits</p>
            <p className="mt-1.5 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{account.credits.careerCredits ?? 0}</p>
          </div>
          <div className="px-5 py-5">
            <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><Mic className="size-3.5 text-mind-500" /> Voice Credits</p>
            <p className="mt-1.5 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{account.credits.voiceCredits ?? 0}</p>
          </div>
          {legacyMinutes > 0 && (
            <div className="px-5 py-5">
              <p className="flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-foreground"><Zap className="size-3.5 text-warn-500" /> AI minutes</p>
              <p className="mt-1.5 font-display text-[22px] font-semibold tabular-nums tracking-tight text-foreground">{legacyMinutes}m</p>
            </div>
          )}
        </div>
        {!pkg && (
          <p className="mt-3 text-[12.5px] font-light text-muted-foreground">
            No package yet — the <Link to="/portal/services" className="font-medium text-brand-600 hover:underline">2026 journeys</Link> include
            every assessment, your report and counselling hours. Credits below work with or without one.
          </p>
        )}
      </section>

      {/* buy credits — two calm columns, price is the button */}
      <section>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-600">01 — Top up credits</p>
        <div className="mt-5 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex items-center gap-2 text-[15px] font-normal text-foreground"><Sparkles className="size-4 text-brand-600" /> Career Credits</p>
              <p className="text-[11.5px] font-light text-muted-foreground">1 credit ≈ 1 question</p>
            </div>
            <p className="mt-1 text-[12.5px] font-light leading-relaxed text-muted-foreground">
              Power Compass — every question answered from your own results.
            </p>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {careerPacks.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3.5">
                  <span className="text-[13.5px] font-light text-foreground">{p.name}</span>
                  <button
                    onClick={() => payCreditPack(p.id)}
                    className="rounded-full bg-foreground px-4 py-1.5 text-[12.5px] font-medium tabular-nums text-background transition hover:opacity-90"
                  >
                    {fmtINR(p.inr)}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p className="flex items-center gap-2 text-[15px] font-normal text-foreground"><Mic className="size-4 text-mind-500" /> Voice Credits</p>
              <p className="text-[11.5px] font-light text-muted-foreground">1 credit = 1 minute live</p>
            </div>
            <p className="mt-1 text-[12.5px] font-light leading-relaxed text-muted-foreground">
              Talk your report through with the live voice counsellor.
            </p>
            <div className="mt-4 divide-y divide-border border-y border-border">
              {voicePacks.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3.5">
                  <span className="text-[13.5px] font-light text-foreground">{p.name}</span>
                  <button
                    onClick={() => payCreditPack(p.id)}
                    className="rounded-full bg-foreground px-4 py-1.5 text-[12.5px] font-medium tabular-nums text-background transition hover:opacity-90"
                  >
                    {fmtINR(p.inr)}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* sessions + legacy minutes — quiet secondary row */}
        <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5 text-[13px]">
          <button onClick={paySession} className="inline-flex items-center gap-2 font-light text-foreground underline-offset-4 hover:underline">
            <Coins className="size-3.5 text-warn-500" /> Add a counselling session · {fmtINR(SESSION_PACK.price)}
          </button>
          {AI_CREDIT_PACKS.map((p) => (
            <button key={p.minutes} onClick={() => payAiMinutes(p.minutes)} className="inline-flex items-center gap-2 font-light text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
              <Zap className="size-3.5" /> {p.minutes} AI minutes · {fmtINR(p.price)}
            </button>
          ))}
        </div>
      </section>

      {/* the clarity guide — how to actually spend credits well */}
      <section className="border-t border-border pt-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-600">02 — Getting clarity from your credits</p>
        <h2 className="mt-3 max-w-[26ch] font-editorial text-[26px] font-light leading-[1.1] tracking-tight sm:text-[32px]">
          A credit is a question. Here's how to ask good ones.
        </h2>
        <p className="mt-3 max-w-[58ch] text-[13.5px] font-light leading-relaxed text-muted-foreground">
          Compass answers from your own scores, your profile and the report's logic — so specific beats general
          every time. The best questions name a score, a doubt, or a decision. Pick who's asking:
        </p>

        {/* audience switch */}
        <div className="mt-6 flex flex-wrap gap-2">
          {(Object.keys(GUIDE) as Audience[]).map((k) => (
            <button
              key={k} onClick={() => setAudience(k)} aria-pressed={audience === k}
              className={cn(
                "rounded-full border px-4 py-2 text-[13px] font-light transition-colors",
                audience === k ? "border-foreground bg-foreground text-background" : "border-border text-ink-600 hover:border-ink-300",
              )}
            >
              {GUIDE[k].label}
            </button>
          ))}
        </div>

        <p className="mt-5 text-[13px] font-light italic leading-relaxed text-ink-600">{g.intro}</p>

        {/* ask → answer pairs */}
        <div className="mt-5 divide-y divide-border border-y border-border">
          {g.asks.map((item, i) => (
            <div key={i} className="grid gap-2 py-5 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] sm:gap-10">
              <div className="flex gap-3">
                <MessageCircle className="mt-0.5 size-4 shrink-0 text-brand-600" strokeWidth={1.5} />
                <p className="text-[14px] font-normal leading-relaxed text-foreground">“{item.q}”</p>
              </div>
              <div>
                <p className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-ink-300">What you get back</p>
                <p className="mt-1 text-[13px] font-light leading-relaxed text-ink-600">{item.a}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/portal/therapy"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-[13px] font-medium text-background transition hover:opacity-90"
        >
          Ask Compass now <ArrowRight className="size-3.5" />
        </Link>
      </section>

      {/* FAQs */}
      <section className="border-t border-border pt-10">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-600">03 — Questions about credits</p>
        <div className="mt-5 divide-y divide-border border-y border-border">
          {FAQS.map((f, i) => {
            const open = openFaq === i
            return (
              <div key={i}>
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 py-4 text-left"
                >
                  <span className="text-[14px] font-normal text-foreground">{f.q}</span>
                  <ChevronDown className={cn("size-4 shrink-0 text-ink-300 transition-transform", open && "rotate-180")} />
                </button>
                {open && <p className="max-w-[64ch] pb-5 text-[13px] font-light leading-relaxed text-ink-600">{f.a}</p>}
              </div>
            )
          })}
        </div>
        <p className="mt-5 text-[12px] font-light text-muted-foreground">
          Payments run through Razorpay and credits land on your account the moment the payment verifies.
        </p>
      </section>
    </div>
  )
}
