// The portal home — a state-aware "career command" dashboard. It reads the
// member's OWN signal (real Career Tests via report-bridge), measures it against
// the live world (the Career Terminal market via market-match), lays their whole
// journey (current + future) on one spine, and opens onto everything we offer.
//
// Three states drive the copy and which sections invite vs. inform:
//   • new       — nothing measured yet → invite to assess
//   • assessing — some tests / sessions, no report yet → continue the journey
//   • active    — report ready → stand-here-now + where the market's moving
//
// Structure follows the evidence, not the instinct:
//   · ONE primary action above the fold. Carbon's empty-state rule ("pick the
//     most important and keep the focus on that action") applies to the whole
//     surface: a product that cures decision paralysis must not cause it.
//   · NO completion percentage. Steps 7–9 are a paid strategy session, a
//     certificate and a review request — a bar that only fills when the member
//     buys more and writes a testimonial is reward misalignment, not progress.
//   · The counsellor and the booked session sit in the PRIMARY column. Users
//     have learned to skip right rails (NN/g); the human is the most trusted
//     thing here and must not live in the dead zone.
//   · The paid catalogue is a quiet DIRECTORY at the very bottom — never a row
//     of priced gradient plates beside the member's results. Ad-shaped blocks
//     are ignored, and worse, they poison the legitimate content next to them.
//
// Craft: one big colour moment (the track-coloured gradient hero); everything
// else is soft panes, hairlines and type. Jewel accents are rationed — brand-blue
// for the member's fit, well-green for rising demand, gold for the market's size.

import { Fragment } from "react"
import { Link } from "react-router-dom"
import { Pane, Eyebrow, Chip, AvatarStack, MarketRow, FitGauge, type CareerViz } from "@/components/custom/ui-kit"
import {
  ArrowRight, Clock, CalendarPlus,
  MessageCircle, Plus, Lock, Check, ChevronRight,
} from "lucide-react"
import { getClient } from "@/lib/mock"
import { useIsShared } from "@/lib/report-share"
import { useGsap, revealChildren } from "@/lib/gsap"
import {
  usePortalAccount, useBookings, useThread, accountTrack, aiBalance,
  portalCallHref, type PortalAccount,
} from "../portal-store"
import { usePortalCounsellor } from "../counsellors"
import { ProfileNudge } from "../components/ProfileGate"
import { credentialSummary } from "../components/CounsellorCredentials"
import { useUserSessions } from "@/lib/live-queries"
import { usePortalJourney, type JourneyStep } from "../journey-model"
import {
  hasRealAssessments, realPersonalityFor, realAbilitiesFor,
} from "../tests/report-bridge"
import { careersForMember, topRisingCareers, trendPctOf } from "../tests/market-match"
import { OUTLOOK, type Row } from "../terminal/insights"
import { offering2026ById } from "../../server/offerings-2026"
import { PackageGradient } from "../product/PackageGradient"
import { fmtINR } from "../products"
import { cn } from "@/lib/utils"

const fmtWhen = (iso: string) => new Date(iso).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
const trackAnchorId = (track: string) => (track === "professional" ? "pro_pivot" : "sj_big_picture")

type DashState = "new" | "assessing" | "active"

/* ── the journey spine ON GLASS — lives inside the hero card as its bottom
      strip, so the path and the greeting are one object, not two boxes. ── */
function HeroSpine({ steps, current }: { steps: JourneyStep[]; current?: JourneyStep }) {
  return (
    <div className="relative -mx-6 -mb-7 mt-7 border-t border-white/15 bg-white/[0.08] px-6 py-4 backdrop-blur-md sm:-mx-9 sm:-mb-9 sm:px-9">
      <div className="-mx-1 flex items-start overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {steps.map((s, i) => {
          const Icon = s.icon
          const isCurrent = current?.n === s.n
          const node = (
            <span className={cn(
              "grid size-8 shrink-0 place-items-center rounded-full border transition",
              s.status === "done" ? "border-transparent bg-white text-foreground"
                : s.status === "now" ? "border-transparent bg-white text-foreground"
                : s.status === "locked" ? "border-dashed border-white/30 text-white/45"
                : "border-white/35 text-white/75",
              isCurrent && "ring-2 ring-white/40 ring-offset-2 ring-offset-transparent",
            )}>
              {s.status === "done" ? <Check className="size-3.5 stroke-[2.5]" /> : s.status === "locked" ? <Lock className="size-3" /> : <Icon className="size-[15px] stroke-[1.75]" />}
            </span>
          )
          const col = (
            <div className="flex min-w-[70px] flex-col items-center gap-1.5 px-1 text-center">
              {node}
              <span className={cn("text-[10.5px] leading-tight", s.status === "locked" ? "text-white/40" : isCurrent ? "font-semibold text-white" : "text-white/70")}>{s.short}</span>
            </div>
          )
          return (
            <Fragment key={s.n}>
              {s.status === "locked" ? <div>{col}</div> : <Link to={s.to} className="group">{col}</Link>}
              {i < steps.length - 1 && (
                <span aria-hidden className={cn("mt-[15px] h-px min-w-4 flex-1", s.status === "done" ? "bg-white/50" : "bg-white/20")} />
              )}
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}

/* ── the hero — the one colour moment. Greeting + a live state read + the state's
      SINGLE primary action, over the member's track-coloured liquid gradient,
      with the whole journey as the card's bottom strip. ── */
function StateHero({
  account, state, current, steps,
}: { account: PortalAccount; state: DashState; current?: JourneyStep; steps: JourneyStep[] }) {
  const firstName = account.name.split(" ")[0]
  const track = accountTrack(account)
  const anchorId = trackAnchorId(track)

  // No "N of 9 steps" here. A member who has their report — the whole point of
  // the product — would read "6 of 9" as a third of a failure.
  const eyebrow =
    state === "new" ? `${track === "professional" ? "Professional" : "Student"} journey · Let's begin`
    : state === "assessing" ? (current ? `Next up · ${current.short}` : "In progress")
    : "Your report is ready"
  const title =
    state === "new" ? `Welcome, ${firstName}.`
    : state === "assessing" ? `You're on your way, ${firstName}.`
    : `Here's where you stand, ${firstName}.`
  const read =
    state === "new"
      ? "Your career map is blank — that's the exciting part. Two assessments, about twenty minutes, and we turn how you think into where you could go."
      : state === "assessing"
      ? current ? `Next: ${current.label}. Each step sharpens the recommendation.` : "You're close. Finish the last steps to unlock your report."
      : "Below: your strongest career fit, how the market's moving for it, and your next move — all drawn from your own results."
  const primary =
    state === "new" ? { to: "/portal/assessments", label: "Start your assessment" }
    : state === "assessing" ? { to: current?.to ?? "/portal/journey", label: current ? `${current.cta} · ${current.short}` : "Continue your journey" }
    : { to: "/portal/reports", label: "Open your report" }

  return (
    <div data-reveal className="relative isolate overflow-hidden rounded-[24px] px-6 py-7 text-white sm:px-9 sm:py-9">
      <PackageGradient offeringId={anchorId} />
      <div aria-hidden className="absolute inset-0 -z-[1] bg-gradient-to-t from-black/35 via-black/10 to-black/15" />
      <div className="relative max-w-[62ch]">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/70">{eyebrow}</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold leading-[1.08] tracking-tight sm:text-[38px]">
          {state === "new" ? <>Welcome, <span className="font-wordmark text-[1.05em] font-normal tracking-normal">{firstName}</span>.</> : title}
        </h1>
        <p className="mt-3 text-[14.5px] font-light leading-relaxed text-white/85 sm:text-[15.5px]">{read}</p>
        {/* EXACTLY one action. Compass already has a sidebar entry, its own pane
            and the floating bar — a fourth entry point here only competed with
            the step that actually moves the member forward. */}
        <div className="mt-6">
          <Link to={primary.to} className="group inline-flex items-center gap-1.5 rounded-full bg-white px-5 py-2.5 text-[13.5px] font-semibold text-foreground shadow-sm transition hover:shadow">
            {primary.label} <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
      <HeroSpine steps={steps} current={current} />
    </div>
  )
}

/* ── YOUR PEOPLE — the counsellor and the next booked hour, together, in the
      PRIMARY column. The human is the most trusted asset on this screen. ── */
function YourPeople({ account }: { account: PortalAccount }) {
  const bookings = useBookings(account.clientId)
  // usePortalCounsellor resolves the ASSIGNED counsellor from the live roster
  // (getCounsellor's backing array is empty, so it never resolved anyone).
  const { counsellor } = usePortalCounsellor()
  const thread = useThread(account.clientId, counsellor?.id ?? "")
  const liveSessions = useUserSessions(account.clientId)

  const liveNavi = liveSessions.data?.find((s) => s.navi_name)
  const lastMsg = thread[thread.length - 1]
  const upcoming = bookings.find((b) => b.status !== "canceled" && b.status !== "completed")
  const client = getClient(account.clientId)
  const whenISO = upcoming?.at ?? client?.nextSessionAt ?? null
  const status = upcoming?.status ?? "confirmed"

  const name = counsellor?.name ?? liveNavi?.navi_name ?? null
  const role = counsellor?.title ?? (liveNavi ? "Your SetMyCareer counsellor" : null)
  const initials = counsellor?.initials ?? (liveNavi?.navi_name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2)

  return (
    <Pane>
      <Eyebrow>Your counsellor</Eyebrow>
      {name ? (
        <div className="flex items-center gap-3">
          <AvatarStack size={11} people={[{ initials, img: counsellor?.img ?? liveNavi?.navi_img }]} className="shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-[14.5px] font-semibold text-foreground">{name}</p>
            {role && <p className="truncate text-[12px] text-muted-foreground">{role}</p>}
            {/* credentials, not a rating — members don't shop for a counsellor,
                so what earns trust here is qualification */}
            {counsellor && credentialSummary(counsellor) && (
              <p className="mt-0.5 truncate text-[11.5px] text-ink-400">{credentialSummary(counsellor)}</p>
            )}
          </div>
          {counsellor && (
            <Link to="/portal/messages" className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary">
              <MessageCircle className="size-3.5" /> Message
            </Link>
          )}
        </div>
      ) : (
        <p className="text-[13.5px] text-muted-foreground">Your counsellor will be assigned with your first session.</p>
      )}

      {lastMsg && (
        <p className="mt-3 line-clamp-2 border-l-2 border-border pl-3 text-[12.5px] text-ink-600">
          <span className="font-medium text-foreground">{lastMsg.from === "client" ? "You: " : ""}</span>{lastMsg.text}
        </p>
      )}

      {/* the booked hour — the member's real commitment, not a metric */}
      <div className="mt-5 border-t border-border pt-4">
        {whenISO ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[14px] font-semibold text-foreground">{upcoming?.topic ?? "Counselling session"}</p>
              <Chip tone={status === "requested" ? "warn" : "well"}>{status === "requested" ? "Pending" : "Confirmed"}</Chip>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Chip tone="neutral" icon={Clock} className="tabular-nums">{fmtWhen(whenISO)}</Chip>
              <Chip tone="neutral" className="tabular-nums">{fmtTime(whenISO)}</Chip>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={portalCallHref(account.clientId)} className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-brand-700">Join when live</Link>
              <Link to="/portal/sessions" className="inline-flex items-center rounded-full px-3 py-1.5 text-[12.5px] font-medium text-foreground hover:bg-secondary">Manage</Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-[14px] font-medium text-foreground">No session booked</p>
            <p className="mt-0.5 text-[12.5px] text-muted-foreground">Find a time that suits you.</p>
            <Link to="/portal/sessions" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[12.5px] font-medium text-background hover:opacity-90">
              <CalendarPlus className="size-3.5" /> Book a session
            </Link>
          </>
        )}
      </div>
    </Pane>
  )
}

/* ── YOUR SIGNAL — the member's real test results, big-type and hairline-split.
      Adapts to whatever they've completed; invites when nothing's measured. ── */
interface Read { big: string; label: string; sub: string; accent: string }

function YourSignal({ clientId }: { clientId: string }) {
  const has = hasRealAssessments(clientId)
  if (!has) {
    return (
      <Pane>
        <Eyebrow>Your signal</Eyebrow>
        <p className="font-editorial text-[22px] font-light leading-snug tracking-tight text-foreground sm:text-[25px]">
          Nothing measured yet. Your personality, interests and aptitude become a career map the moment you take them.
        </p>
        <p className="mt-2.5 max-w-[54ch] text-[13.5px] text-muted-foreground">Roughly twenty focused minutes. No AI, no distractions — just you, answered honestly, scored on the same engine our counsellors read.</p>
        <Link to="/portal/assessments" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background transition hover:opacity-90">
          Take the assessments <ArrowRight className="size-3.5" />
        </Link>
      </Pane>
    )
  }

  const market = careersForMember(clientId)
  const pers = realPersonalityFor(clientId)
  const abilities = realAbilitiesFor(clientId)

  const reads: Read[] = []
  if (market.topGroup) reads.push({ big: `${market.topGroup.fitPct}%`, label: "Career fit", sub: market.topGroup.group, accent: "text-brand-600" })
  if (market.clusters.length) reads.push({ big: `${Math.round(market.clusters[0].score)}`, label: "Top interest", sub: market.clusters[0].label, accent: "text-mind-600" })
  if (pers) {
    const facets = pers.factors.flatMap((f) => f.subfactors)
    const top = [...facets].sort((a, b) => b.percentile - a.percentile)[0]
    if (top) reads.push({ big: `${top.percentile}th`, label: "Personality standout", sub: top.label, accent: "text-foreground" })
  }
  if (abilities) {
    const top = [...abilities].sort((a, b) => b.value - a.value)[0]
    if (top) reads.push({ big: `${top.value}`, label: "Strongest measure", sub: top.label, accent: "text-well-600" })
  }
  const lead = reads[0]
  const rest = reads.slice(1)

  return (
    <Pane>
      <Eyebrow right={<Link to="/portal/reports" className="shrink-0 text-[12.5px] font-medium text-brand-600 hover:underline">Full report →</Link>}>Your signal</Eyebrow>
      {/* the lead read — when it's the career-fit %, show it as the match gauge */}
      {market.topGroup ? (
        <div className="flex items-center gap-4">
          <FitGauge value={market.topGroup.fitPct} size={92} stroke={8} label="Best fit" />
          <div className="min-w-0">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-300">Best-fit job family</p>
            <p className="mt-0.5 font-editorial text-[20px] font-light leading-tight tracking-tight text-foreground">{market.topGroup.group}</p>
            <p className="mt-0.5"><Chip tone="brand">{market.topGroup.band} fit</Chip></p>
          </div>
        </div>
      ) : lead && (
        <div className="flex items-end gap-4">
          <p className={cn("font-display text-[54px] font-semibold leading-[0.9] tracking-tight tabular-nums sm:text-[64px]", lead.accent)}>{lead.big}</p>
          <div className="pb-1.5">
            <p className="text-[12px] font-medium uppercase tracking-wide text-ink-300">{lead.label}</p>
            <p className="mt-0.5 font-editorial text-[19px] font-light leading-tight tracking-tight text-foreground">{lead.sub}</p>
          </div>
        </div>
      )}
      {rest.length > 0 && (
        <div className="mt-5 grid grid-cols-2 gap-x-6 border-t border-border sm:grid-cols-3 sm:gap-x-0 sm:divide-x sm:divide-border">
          {rest.map((r) => (
            <div key={r.label} className="py-3 sm:px-4 sm:first:pl-0">
              <p className={cn("font-display text-[24px] font-semibold leading-none tabular-nums", r.accent)}>{r.big}</p>
              <p className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-300">{r.label}</p>
              <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{r.sub}</p>
            </div>
          ))}
        </div>
      )}
    </Pane>
  )
}

/* ── THE WORLD FOR YOU — the live market, matched to the member's signal when we
      genuinely matched it, and honestly labelled when we didn't. ── */
// a market Row → the kit's MarketRow (mini demand spark + pay), ranked
function careerRow(r: Row, rank: number) {
  const c: CareerViz = {
    name: r.name, cluster: r.cluster, payLo: r.payLo, payHi: r.payHi,
    demand: r.demandTrend, demandPct: trendPctOf(r), aiLevel: r.aiLevel, to: "/portal/terminal", oneLine: r.oneLine,
  }
  return <MarketRow key={r.id} c={c} rank={rank} />
}

function OutlookLine() {
  return (
    <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-border pt-4">
      <span className="font-display text-[22px] font-semibold tracking-tight text-warn-600">{OUTLOOK.headline}</span>
      <span className="text-[13px] text-foreground">{OUTLOOK.headlineLabel}.</span>
      <span className="text-[12px] text-muted-foreground">{OUTLOOK.note}.</span>
    </div>
  )
}

function WorldForYou({ clientId }: { clientId: string }) {
  const market = careersForMember(clientId)
  const terminalLink = <Link to="/portal/terminal" className="shrink-0 text-[12.5px] font-medium text-brand-600 hover:underline">Terminal →</Link>

  if (market.hasSignal) {
    return (
      <Pane>
        {/* `matched` is the honesty gate: when the keyword bridge finds nothing we
            still show rows, but they are the market's generic risers — the same
            for every member — so we must not call them a personal match. */}
        <Eyebrow right={terminalLink}>{market.matched ? "The world for you" : "The market at large"}</Eyebrow>
        <p className="max-w-[58ch] font-editorial text-[19px] font-light leading-snug tracking-tight text-foreground sm:text-[21px]">
          {market.matched && market.topGroup
            ? <>Your strongest fit is <span className="text-brand-700">{market.topGroup.group}</span>. These rising paths match your signal — ranked by ten-year demand.</>
            : market.matched
            ? <>Matched to your interests — rising paths ranked by ten-year demand.</>
            : <>We haven't matched the market to your signal yet. Here's what's rising fastest overall — your counsellor will narrow it with you.</>}
        </p>
        <div className="mt-4 divide-y divide-border border-y border-border">
          {market.careers.map((r, i) => careerRow(r, i + 1))}
        </div>
        <OutlookLine />
      </Pane>
    )
  }

  const rising = topRisingCareers(4)
  return (
    <Pane>
      <Eyebrow right={terminalLink}>The market you're deciding in</Eyebrow>
      <p className="font-display text-[30px] font-semibold leading-none tracking-tight text-warn-600">{OUTLOOK.headline}</p>
      <p className="mt-1.5 max-w-[54ch] text-[14px] text-foreground">{OUTLOOK.headlineLabel} — {OUTLOOK.note}.</p>
      <p className="mb-1 mt-5 text-[12px] font-medium uppercase tracking-wide text-ink-300">Fastest-rising careers</p>
      <div className="divide-y divide-border border-y border-border">
        {rising.map((r, i) => careerRow(r, i + 1))}
      </div>
      <p className="mt-3 text-[12.5px] text-muted-foreground">Take your assessment and this becomes a shortlist matched to you.</p>
    </Pane>
  )
}

/* ── PROGRAMMES — full access to everything we sell, as a restrained DIRECTORY at
      the foot of the page. Not a carousel of priced gradient plates beside the
      member's results: ad-shaped blocks get skipped, and they drag the real
      content next to them into the same blind spot. A list, priced honestly,
      below the work — one click from the full catalogue. ── */
const STUDENT_RAIL = ["sj_navigator", "sj_accelerator", "sj_big_picture", "sj_true_north"]
const PRO_RAIL = ["pro_consult", "pro_pivot", "pro_directors_cut", "mk_meet_expert"]

function ProgrammeRow({ id, owned }: { id: string; owned: boolean }) {
  const o = offering2026ById(id)
  if (!o) return null
  return (
    <Link to={owned ? "/portal/journey" : `/portal/services/${o.id}`} className="group flex items-center gap-4 py-3.5">
      {/* the programme's own liquid field, as a swatch — same colour it wears
          on the catalogue and checkout, so the object is recognisable anywhere */}
      <span className="relative isolate size-11 shrink-0 overflow-hidden rounded-xl">
        <PackageGradient offeringId={o.id} interactive={false} scrim={false} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[14px] font-medium text-foreground">
          {o.name}
          {owned && <Chip tone="well" className="shrink-0 uppercase tracking-wide">Active</Chip>}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{o.oneLine}</p>
      </div>
      <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{o.inr > 0 ? fmtINR(o.inr) : "Free"}</span>
      <ChevronRight className="size-4 shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
    </Link>
  )
}

function ProgrammeDirectory({ account }: { account: PortalAccount }) {
  const track = accountTrack(account)
  const ids = track === "professional" ? PRO_RAIL : STUDENT_RAIL
  const ownedIds = new Set<string>()
  for (const p of account.purchases ?? []) { ownedIds.add(p.productId); if (p.tierId) ownedIds.add(p.tierId) }
  const career = aiBalance(account.credits, "chat")
  const voice = account.credits.voiceCredits ?? 0
  const sessions = account.credits.sessions ?? 0

  return (
    <Pane>
      <Eyebrow right={<Link to="/portal/services" className="shrink-0 text-[12.5px] font-medium text-brand-600 hover:underline">All programmes →</Link>}>
        Programmes &amp; credits
      </Eyebrow>
      <div className="divide-y divide-border border-y border-border">
        {ids.map((id) => <ProgrammeRow key={id} id={id} owned={ownedIds.has(id)} />)}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-muted-foreground">
          <span><span className="font-semibold tabular-nums text-foreground">{career}</span> Career Credits</span>
          <span><span className="font-semibold tabular-nums text-foreground">{voice}</span> Voice Credits</span>
          <span><span className="font-semibold tabular-nums text-foreground">{sessions}</span> session{sessions === 1 ? "" : "s"} left</span>
        </div>
        <Link to="/portal/billing" className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-[12.5px] font-medium text-foreground transition hover:bg-secondary">
          <Plus className="size-3.5" /> Top up
        </Link>
      </div>
    </Pane>
  )
}

export function PortalHome() {
  const account = usePortalAccount()
  const clientId = account?.clientId ?? ""
  const shared = useIsShared(clientId)
  const journey = usePortalJourney()
  const bookings = useBookings(clientId)
  const root = useGsap((s) => revealChildren(s), [clientId, journey.doneCount])
  if (!account) return null

  const isDemo = Boolean(getClient(clientId))
  const hasSession = bookings.some((b) => b.status !== "canceled") || journey.steps[3].status === "done"
  const reportReady = shared || isDemo
  const state: DashState = reportReady ? "active" : (hasRealAssessments(clientId) || hasSession) ? "assessing" : "new"

  return (
    <div ref={root} className="space-y-6">
      {/* the profile gate's dashboard face — a slim dropdown w/ progress bar,
          shown until the intake that unlocks tests + sessions is complete */}
      <ProfileNudge />

      {/* four surfaces, edge to edge — no right rail, no dead zone. The hero
          carries the journey as its own bottom strip; everything else is a
          full-width or half-width pane in one flow. */}
      <StateHero account={account} state={state} current={journey.current} steps={journey.steps} />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <YourSignal clientId={clientId} />
        <YourPeople account={account} />
      </div>

      <WorldForYou clientId={clientId} />

      <ProgrammeDirectory account={account} />
    </div>
  )
}
