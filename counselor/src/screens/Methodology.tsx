import { useState } from "react"
import {
  ShieldCheck, Eye, Scale, GitBranch, ChevronDown, Sparkles,
} from "lucide-react"
import { EXPLAINERS } from "@/components/custom/MetricInfo"
import { CLUSTER_LABELS } from "@/lib/mock"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

/* Methodology & transparency — the "no secret algorithms" page.
   Shows the pipeline as a funnel, the confidence ladder, the career×wellbeing
   bridge logic, a metric glossary, and an FAQ. Logic diagrams only: shape of how
   signals flow into a number, never the exact weights. */

const PIPELINE = [
  { k: "Listen", t: "Conversation & assessments", d: "Session transcripts, voice check-ins and inventories (RIASEC, Big Five)." },
  { k: "Signal", t: "Career signals", d: "Each remark is mapped to a career signal — only when the transcript actually supports it." },
  { k: "Cluster", t: "Signal clusters", d: "Signals group into the five clusters below, smoothed across sessions." },
  { k: "Index", t: "Indices", d: "Clusters combine — by confidence, not opinion — into the career, wellbeing and life-performance reads." },
  { k: "Blueprint", t: "Career blueprint", d: "A plain-language read with next steps the counselor can edit before it's shared." },
]

const LADDER = [
  { k: "none", label: "None", w: "8%", note: "Nothing said yet" },
  { k: "low", label: "Low", w: "28%", note: "A single mention" },
  { k: "tentative", label: "Tentative", w: "50%", note: "Early, one-sided" },
  { k: "moderate", label: "Moderate", w: "74%", note: "Repeated, consistent" },
  { k: "high", label: "High", w: "96%", note: "Strong, corroborated" },
]

const BRIDGE = [
  { career: "Rising", well: "Rising", out: "Healthy climb", tone: "well" },
  { career: "Rising", well: "Falling", out: "Strained climb — watch burnout", tone: "warn" },
  { career: "Falling", well: "Rising", out: "Recovering / re-centering", tone: "mind" },
  { career: "Falling", well: "Falling", out: "Compounding strain — check in", tone: "risk" },
]

const PRINCIPLES = [
  { icon: Eye, t: "Nothing is hidden", d: "Every score traces back to something the client actually said. You can open any signal and see the quote behind it." },
  { icon: Scale, t: "Weighted by confidence, not opinion", d: "The model proposes; deterministic rules decide. A claim heard once never outweighs a pattern seen across sessions." },
  { icon: ShieldCheck, t: "A guide, never a verdict", d: "Indices frame the conversation. The counselor always reviews and can edit a read before anything is shared with a client." },
]

const FAQ = [
  {
    q: "Where do the numbers come from?",
    a: "From what the client says in sessions and from the assessments they complete. Language cues are mapped to career signals, those signals are grouped and smoothed across sessions, and the groups combine into the indices you see. No external scraping, no hidden inputs.",
  },
  {
    q: "Why don't you show the exact weights?",
    a: "Publishing precise coefficients invites gaming and implies a false precision. We show the full shape of the pipeline — inputs, stages and direction — so you can explain any read to a client honestly, without over-claiming accuracy down to a decimal.",
  },
  {
    q: "How does wellbeing relate to the career read?",
    a: "Wellbeing is a supporting signal, not a sub-score of the career index. The two are tracked separately and compared. When they diverge — strong momentum while wellbeing drops — a contradiction flag is raised as a prompt to look closer.",
  },
  {
    q: "What happens with low-confidence signals?",
    a: "They are shown but clearly marked, and they carry little weight until corroborated. A single offhand comment will not move an index on its own; the confidence ladder governs how much any signal counts.",
  },
  {
    q: "Can a counselor change a score?",
    a: "Counselors don't hand-edit raw scores, but they review every read, can flag a signal as misread, and always edit the written blueprint before it reaches a client. The human stays in the loop on anything shared.",
  },
  {
    q: "Is client data used to train models?",
    a: "Identified session content is used to improve a client's own reads over time. Aggregate, de-identified patterns improve the shared model. Clients control their data and can request export or deletion at any time.",
  },
]

const TONE: Record<string, string> = {
  well: "border-well-500/40 bg-well-100 text-well-600",
  warn: "border-warn-600/40 bg-warn-100 text-warn-600",
  mind: "border-mind-500/40 bg-mind-100 text-mind-600",
  risk: "border-risk-500/40 bg-risk-100 text-risk-600",
}

function Stage({ index, k, t, d, last }: { index: number; k: string; t: string; d: string; last: boolean }) {
  return (
    <div className="flex flex-1 items-start gap-3 md:gap-1">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-foreground text-[11px] font-medium text-background tabular-nums">{index + 1}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">{k}</span>
        </div>
        <div className="mt-2.5 rounded-2xl border border-border bg-card p-4">
          <div className="text-[13px] font-medium text-foreground">{t}</div>
          <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{d}</p>
        </div>
      </div>
      {!last && (
        <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden className="mt-8 hidden shrink-0 text-ink-300 md:block">
          <path d="M1 1l6 5-6 5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-border last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[14px] font-medium text-foreground">{q}</span>
        <ChevronDown className={cn("size-4 shrink-0 stroke-[1.5] text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      <div className={cn("grid transition-all duration-200", open ? "grid-rows-[1fr] pb-4" : "grid-rows-[0fr]")}>
        <p className="overflow-hidden text-[13px] leading-relaxed text-ink-600">{a}</p>
      </div>
    </div>
  )
}

export function Methodology() {
  const ref = useGsap((s) => revealChildren(s), [])
  const clusters = Object.entries(CLUSTER_LABELS) as [string, string][]

  return (
    <div ref={ref} className="flex flex-col gap-10">
      {/* hero */}
      <section data-reveal className="max-w-2xl">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
          <Sparkles className="size-3 stroke-[1.5] text-brand-500" /> Transparency
        </div>
        <h1 className="mt-4 font-display text-[clamp(26px,4vw,38px)] font-extralight leading-[1.08] tracking-tight">
          How Setmycareer reads a career
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
          Every score on this console is traceable. This page lays out the whole pipeline — from the first conversation to the final blueprint — the confidence rules behind it, and exactly what we will and won't claim. No black boxes.
        </p>
      </section>

      {/* principles */}
      <section data-reveal className="grid gap-4 md:grid-cols-3">
        {PRINCIPLES.map((p) => (
          <div key={p.t} className="rounded-2xl border border-border bg-card p-5">
            <p.icon className="size-5 stroke-[1.5] text-foreground" />
            <div className="mt-3 text-[13.5px] font-medium">{p.t}</div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{p.d}</p>
          </div>
        ))}
      </section>

      {/* pipeline funnel */}
      <section data-reveal>
        <h2 className="font-display text-[20px] font-light tracking-tight">The pipeline</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Five stages, left to right. Each stage only ever uses evidence the previous one passed forward.</p>
        <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-start">
          {PIPELINE.map((s, i) => (
            <Stage key={s.k} index={i} k={s.k} t={s.t} d={s.d} last={i === PIPELINE.length - 1} />
          ))}
        </div>
      </section>

      {/* confidence ladder */}
      <section data-reveal className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2">
          <GitBranch className="size-4 stroke-[1.5] text-foreground" />
          <h2 className="font-display text-[20px] font-light tracking-tight">The confidence ladder</h2>
        </div>
        <p className="mt-1 text-[13px] text-muted-foreground">
          How much a signal counts depends on how well it's evidenced. A score only firms up as the evidence does.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          {LADDER.map((l) => (
            <div key={l.k} className="flex items-center gap-4">
              <div className="w-20 shrink-0 text-[12px] font-medium text-foreground">{l.label}</div>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-brand-500/80" style={{ width: l.w }} />
              </div>
              <div className="hidden w-40 shrink-0 text-[12px] text-muted-foreground sm:block">{l.note}</div>
            </div>
          ))}
        </div>
      </section>

      {/* clusters */}
      <section data-reveal>
        <h2 className="font-display text-[20px] font-light tracking-tight">The five career clusters</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">Individual signals roll up into these. The career index is a confidence-weighted blend across all five.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {clusters.map(([k, label], i) => (
            <div key={k} className="rounded-2xl border border-border bg-card p-4">
              <div className="font-display text-[22px] font-extralight tabular-nums text-ink-300">{String(i + 1).padStart(2, "0")}</div>
              <div className="mt-1 text-[13px] font-medium leading-snug text-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* career × wellbeing bridge */}
      <section data-reveal>
        <h2 className="font-display text-[20px] font-light tracking-tight">Career × wellbeing</h2>
        <p className="mt-1 text-[13px] text-muted-foreground">
          The two reads are compared, never merged. When they point in opposite directions, the console raises a flag — a prompt to look closer, not a conclusion.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {BRIDGE.map((b) => (
            <div key={b.out} className={cn("rounded-2xl border p-4", TONE[b.tone])}>
              <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.1em] opacity-80">
                <span>Career {b.career}</span><span aria-hidden>·</span><span>Wellbeing {b.well}</span>
              </div>
              <div className="mt-1.5 text-[14px] font-medium">{b.out}</div>
            </div>
          ))}
        </div>
      </section>

      {/* metric glossary */}
      <section data-reveal>
        <h2 className="font-display text-[20px] font-light tracking-tight">What each headline number means</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Object.values(EXPLAINERS).map((e) => (
            <div key={e.title} className="rounded-2xl border border-border bg-card p-5">
              <div className="text-[13.5px] font-medium text-foreground">{e.title}</div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted-foreground">{e.blurb}</p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {e.steps.map((s, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <span className={cn("rounded-md border px-2 py-1 text-[10.5px]", i === e.steps.length - 1 ? "border-brand-500/40 bg-brand-100 text-brand-600" : "border-border bg-secondary text-ink-600")}>{s}</span>
                    {i < e.steps.length - 1 && <span className="text-ink-300" aria-hidden>→</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section data-reveal className="max-w-3xl">
        <h2 className="font-display text-[20px] font-light tracking-tight">Frequently asked</h2>
        <div className="mt-3 rounded-2xl border border-border bg-card px-6">
          {FAQ.map((f) => <FaqItem key={f.q} q={f.q} a={f.a} />)}
        </div>
        <p className="mt-4 text-[12px] text-muted-foreground">
          Have a question that isn't here? Ask the Compass assistant — bottom-right — or your Setmycareer contact.
        </p>
      </section>
    </div>
  )
}
