// The journey tracker — a HORIZONTAL timeline (the cardiology-style spine): the
// nine steps run left→right through three phase segments (Discover / Decide /
// Deliver), each a node on a connected rail whose fill tracks real progress.
// Beneath the rail, the moves you can actually make now branch out as detail
// cards. Steps come from the SHARED usePortalJourney model, so this page and the
// dashboard spine never disagree. Everything bought lands below, newest first.

import { Link } from "react-router-dom"
import {
  Check, Lock, Sparkles, CalendarPlus, Bot, ClipboardList, Package, Zap, ArrowRight,
} from "lucide-react"
import { LogoMark } from "@/components/brand/Logo"
import { useGsap, revealChildren } from "@/lib/gsap"
import { Pane, Eyebrow, Chip, AvatarStack } from "@/components/custom/ui-kit"
import { ScoreRing } from "@/components/custom/ScoreRing"
import { usePortalAccount, usePurchases, usePlanItems, removePlanItem, type Purchase, type PortalCredits } from "../portal-store"
import { usePortalCounsellor } from "../counsellors"
import { usePortalJourney, type JourneyStep } from "../journey-model"
import { cn } from "@/lib/utils"
import { JourneyStream } from "../components/JourneyStream"

const ADDON_ICON: Record<NonNullable<Purchase["kind"]>, typeof Sparkles> = {
  plan: Sparkles, sessions: CalendarPlus, aiMinutes: Bot, credits: Zap, test: ClipboardList, product: Package,
}
const fmtWhen = (iso: string) => new Date(iso).toLocaleDateString([], { day: "numeric", month: "short" })
function grantSummary(g?: Partial<PortalCredits>): string {
  if (!g) return ""
  const parts: string[] = []
  if (g.sessions) parts.push(`+${g.sessions} session${g.sessions === 1 ? "" : "s"}`)
  if (g.careerCredits) parts.push(`+${g.careerCredits} Career Credits`)
  if (g.voiceCredits) parts.push(`+${g.voiceCredits} Voice Credits`)
  if (g.aiMinutes) parts.push(`+${g.aiMinutes} AI min`)
  return parts.join(" · ")
}

// three acts, each with its own vivid accent so a member always knows the room
const PHASES = [
  { key: "discover", name: "Discover", sub: "Map who you are", ns: [1, 2, 3], accent: "var(--color-brand-600)" },
  { key: "decide", name: "Decide", sub: "Talk it through", ns: [4, 5, 6], accent: "var(--color-mind-600)" },
  { key: "deliver", name: "Deliver", sub: "Lock the plan", ns: [7, 8, 9], accent: "var(--color-well-600)" },
] as const

const COUNSELLOR_STEPS = new Set([4, 5, 7])

/* one node on the horizontal rail */
function RailNode({ s, accent, isCurrent }: { s: JourneyStep; accent: string; isCurrent: boolean }) {
  const Icon = s.icon
  const done = s.status === "done"
  const now = s.status === "now"
  const locked = s.status === "locked"

  const node = (
    <div className="flex flex-col items-center gap-2.5 px-1 text-center">
      <span
        className={cn(
          "relative z-10 grid size-11 shrink-0 place-items-center rounded-full transition",
          isCurrent && "ring-4 ring-brand-100",
        )}
        style={
          done ? { background: "var(--color-well-600)", color: "#fff" }
          : now ? { background: accent, color: "#fff" }
          : locked ? { border: "1.5px dashed var(--color-ink-200)", color: "var(--color-ink-300)" }
          : { background: "var(--color-secondary)", color: "var(--color-ink-600)" }
        }
      >
        {done ? <Check className="size-[18px] stroke-[2.5]" /> : locked ? <Lock className="size-4" /> : <Icon className="size-[18px] stroke-[1.75]" />}
      </span>
      <span className="min-w-0" title={s.label}>
        <span className={cn("block text-[12.5px] font-medium leading-tight", locked ? "text-ink-400" : "text-foreground")}>{s.short}</span>
        <span className="mt-0.5 block font-mono text-[9.5px] uppercase tracking-[0.12em] text-ink-500">Step {String(s.n).padStart(2, "0")}</span>
      </span>
    </div>
  )
  return locked ? <div className="w-full">{node}</div> : <Link to={s.to} className="w-full transition hover:-translate-y-0.5">{node}</Link>
}

/* a branched detail card for a move you can make now */
function MoveCard({ s, accent, counsellor }: {
  s: JourneyStep; accent: string; counsellor?: { initials: string; img?: string }
}) {
  const Icon = s.icon
  return (
    <Link to={s.to} className="group flex items-center gap-3.5 rounded-2xl bg-card p-4 ring-1 ring-border transition hover:ring-ink-200">
      <span className="grid size-11 shrink-0 place-items-center rounded-full text-white" style={{ background: accent }}>
        <Icon className="size-5 stroke-[1.75]" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14.5px] font-semibold text-foreground">{s.label}</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">Step {String(s.n).padStart(2, "0")} · your move now</p>
      </div>
      {COUNSELLOR_STEPS.has(s.n) && counsellor && (
        <AvatarStack size={7} people={[{ initials: counsellor.initials, img: counsellor.img }]} className="shrink-0" />
      )}
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-foreground px-3.5 py-1.5 text-[12px] font-semibold text-background transition group-hover:gap-2">
        {s.cta} <ArrowRight className="size-3" />
      </span>
    </Link>
  )
}

// Ideas the member saved from Compass ("Save to my plan") — rendered here so
// every save has a visible home. Hidden until the first item exists.
function SavedPlan() {
  const items = usePlanItems()
  if (items.length === 0) return null
  return (
    <Pane className="p-4">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Eyebrow>Saved from Compass</Eyebrow>
        <p className="text-[11.5px] font-light text-ink-400">{items.length} idea{items.length === 1 ? "" : "s"}</p>
      </div>
      <ul className="divide-y divide-border">
        {items.map((p) => (
          <li key={p.id} className="flex items-start justify-between gap-3 py-2 first:pt-0 last:pb-0">
            <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-foreground">{p.text}</p>
            <button
              type="button"
              onClick={() => removePlanItem(p.id)}
              className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium text-ink-400 transition hover:bg-secondary hover:text-foreground"
            >
              Done
            </button>
          </li>
        ))}
      </ul>
    </Pane>
  )
}

export function PortalJourney() {
  const account = usePortalAccount()
  const { counsellor } = usePortalCounsellor()
  const journey = usePortalJourney()
  const purchases = usePurchases()
  const root = useGsap((s) => revealChildren(s), [account?.clientId, journey.doneCount, purchases.length])
  if (!account) return null

  const addOns = [...purchases].sort((a, b) => b.at.localeCompare(a.at))
  const { steps, current, doneCount, pct } = journey

  const phases = PHASES.map((ph) => {
    const phSteps = steps.filter((s) => (ph.ns as readonly number[]).includes(s.n))
    return { ...ph, steps: phSteps, done: phSteps.filter((s) => s.status === "done").length, total: phSteps.length }
  })
  const accentOf = (n: number) => phases.find((p) => (p.ns as readonly number[]).includes(n))?.accent ?? "var(--color-brand-600)"
  // the moves available now — the branched cards under the rail
  const moves = steps.filter((s) => s.status === "now" || (s.status === "todo" && s.n === current?.n))

  return (
    // `isolate` gives this page its own stacking context so the `-z-10` wash below
    // paints ABOVE the shell's opaque bg-canvas (without it the negative-z layer
    // escapes to the root context and is painted behind the canvas — invisible).
    <div ref={root} className="relative isolate space-y-6">
      <JourneyStream />
      <SavedPlan />
      {/* a soft, desaturated wash — character on the white page. Two pools
          (slate-violet top-right, cool teal mid-left) that stay low-alpha so
          cards and text keep their crisp white ground. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-6 -z-10 h-[540px]"
        style={{
          background:
            "radial-gradient(58% 70% at 88% -8%, rgba(101,102,148,0.20), rgba(101,102,148,0.06) 46%, transparent 70%)," +
            "radial-gradient(52% 60% at 4% 40%, rgba(48,122,140,0.13), transparent 62%)",
        }}
      />

      {/* masthead — with a compact progress read on the right */}
      <header data-reveal className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50"><LogoMark size={22} className="text-brand-600" /></span>
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-ink-500">Your guided path</p>
            <h1 className="mt-1 font-editorial text-[30px] font-light leading-none tracking-tight sm:text-[34px]">True North</h1>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden flex-wrap items-center gap-2 sm:flex">
            <Chip tone="well" icon={Check}>{doneCount} done</Chip>
            {current && <Chip tone="brand">Next · {current.short}</Chip>}
            <Chip tone="outline">{steps.length - doneCount} to go</Chip>
          </div>
          <ScoreRing value={pct} size={56} stroke={5} tone="progress" sublabel={`${doneCount}/${steps.length}`} />
        </div>
      </header>

      {/* the horizontal timeline — the spine, scrolls on narrow screens */}
      <Pane className="overflow-hidden">
        <Eyebrow>Your path, end to end</Eyebrow>
        <div className="-mx-1 overflow-x-auto pb-2">
          <div className="min-w-[880px] px-1">
            {/* phase headers, each spanning its three steps */}
            <div className="grid grid-cols-9 gap-2">
              {phases.map((ph) => (
                <div key={ph.key} className="col-span-3 rounded-xl px-3 py-2.5" style={{ background: `color-mix(in srgb, ${ph.accent} 7%, transparent)` }}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: ph.accent }}>{ph.name}</p>
                    <span className="font-mono text-[10.5px] tabular-nums text-ink-500">{ph.done}/{ph.total}</span>
                  </div>
                  <p className="mt-0.5 text-[11.5px] text-muted-foreground">{ph.sub}</p>
                </div>
              ))}
            </div>

            {/* the rail — a connected line with the nine nodes */}
            <div className="relative mt-6 grid grid-cols-9">
              <span aria-hidden className="absolute left-[5.5%] right-[5.5%] top-[22px] h-[3px] -translate-y-1/2 rounded-full bg-border" />
              <span aria-hidden className="absolute left-[5.5%] top-[22px] h-[3px] -translate-y-1/2 rounded-full bg-well-500 transition-[width] duration-700"
                style={{ width: `${Math.max(0, pct - 11)}%` }} />
              {steps.map((s) => (
                <RailNode key={s.n} s={s} accent={accentOf(s.n)} isCurrent={current?.n === s.n} />
              ))}
            </div>
          </div>
        </div>
      </Pane>

      {/* the branched cards — what you can do now */}
      {moves.length > 0 && (
        <section data-reveal>
          <Eyebrow>Your moves now</Eyebrow>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {moves.map((s) => <MoveCard key={s.n} s={s} accent={accentOf(s.n)} counsellor={counsellor ?? undefined} />)}
          </div>
        </section>
      )}

      {/* counsellor + everything bought — side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {counsellor && (
          <Pane>
            <Eyebrow>Your counsellor</Eyebrow>
            <div className="flex items-center gap-3">
              <AvatarStack size={11} people={[{ initials: counsellor.initials, img: counsellor.img }]} />
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-semibold text-foreground">{counsellor.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{counsellor.title}</p>
              </div>
            </div>
            <p className="mt-3 border-t border-border pt-3 text-[12.5px] leading-relaxed text-muted-foreground">
              They're with you from your first discussion session through your strategy plan.
            </p>
          </Pane>
        )}

        {addOns.length > 0 && (
          <Pane className={counsellor ? "" : "lg:col-span-2"}>
            <Eyebrow right={<Link to="/portal/billing" className="text-[12.5px] font-medium text-brand-600 hover:underline">Add more</Link>}>
              Added to your plan
            </Eyebrow>
            <div className="divide-y divide-border">
              {addOns.map((p, i) => {
                const Icon = ADDON_ICON[p.kind ?? "product"] ?? Package
                const summary = grantSummary(p.grants)
                return (
                  <div key={`${p.productId}-${p.at}-${i}`} className="flex items-center gap-3 py-2.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-700"><Icon className="size-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-foreground">{p.label ?? p.productId}</p>
                      {summary && <p className="truncate text-[12px] text-muted-foreground">{summary}</p>}
                    </div>
                    <Chip tone="neutral" className="shrink-0 tabular-nums">{fmtWhen(p.at)}</Chip>
                  </div>
                )
              })}
            </div>
          </Pane>
        )}
      </div>
    </div>
  )
}
