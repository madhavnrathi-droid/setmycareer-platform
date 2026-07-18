/* eslint-disable react-refresh/only-export-components -- this module intentionally
   exports the CareerToolCard component alongside its companion helper
   (isCareerToolName) and the CLIENT_UI_TOOL_NAMES constant, by design (one self-
   contained card module the text chat and the voice screen both import). */

// Shared renderer for the client-facing generative-UI cards the AI guide emits.
// The guide (clientSystem persona, src/server/assistant-core.ts) calls four tools
// — careerCard / studyPath / reportInsight / actionStep — and each tool-call
// surfaces here as a calm, on-brand card so the member's screen updates live as
// the conversation moves. Self-contained on purpose: no server imports, only the
// app's design tokens + lucide icons, so both the text chat (MessageParts) and the
// raw-SSE voice screen can render the same cards from a tool name + input.
//
// The card is rendered purely from the tool INPUT (the echo-execute pattern). The
// actionStep card's button calls onAction(action, detail) — the host wires that to
// navigation / addPlanItem (see the action-id table below).

import { Link } from "react-router-dom"
import {
  Compass, GraduationCap, Sparkles, ChevronRight, ArrowRight, Scale, Check,
  CalendarPlus, ClipboardList, BookmarkPlus, FileText, MessageCircle, Wallet,
} from "lucide-react"
import { offering2026ById } from "@/server/offerings-2026"
import { fmtINR } from "../products"
import { PackageGradient } from "../product/PackageGradient"
import { cn } from "@/lib/utils"

/** Every client-facing UI tool the guide can emit, exported so hosts can branch
 *  without magic strings. This is the generative-UI vocabulary (Thesys-style):
 *  the guide answers common questions with these CARDS, not walls of prose. */
export const CLIENT_UI_TOOL_NAMES = [
  "careerCard", "studyPath", "reportInsight", "actionStep", "packageCard", "compareCard", "followUps",
] as const
export type ClientUiToolName = (typeof CLIENT_UI_TOOL_NAMES)[number]

/** True when `name` is one of the client-facing UI tools this module renders.
 *  Accepts both the bare tool name ("careerCard") and the AI SDK message-part
 *  form ("tool-careerCard"), so callers can pass either. */
export function isCareerToolName(name: string): boolean {
  const bare = name.startsWith("tool-") ? name.slice(5) : name
  return (CLIENT_UI_TOOL_NAMES as readonly string[]).includes(bare)
}

/** The action ids the actionStep button can carry (mirrors the tool's enum). */
export type CareerAction =
  | "book_session"
  | "take_assessment"
  | "save_to_plan"
  | "view_report"
  | "talk_to_counsellor"
  | "top_up"

// Loose input shapes — the input comes straight off the model's tool call, so we
// read fields defensively (any may be missing) rather than trusting the type.
type CareerCardInput = { title?: string; whyFit?: string; studyPath?: string; salaryBand?: string; demand?: string }
type StudyPathInput = { goal?: string; degree?: string; entrance?: string; colleges?: string[]; duration?: string }
type ReportInsightInput = { label?: string; value?: string; meaning?: string }
type ActionStepInput = { action?: CareerAction; label?: string; detail?: string }
type PackageCardInput = { offeringId?: string; whyFit?: string }
type CompareCardInput = {
  aName?: string; aPoints?: string[]; bName?: string; bPoints?: string[]; pick?: string; pickWhy?: string
}
type FollowUpsInput = { options?: string[] }

const DEMAND_TONE: Record<string, string> = {
  "Very High": "border-well-500/30 bg-well-50 text-well-700",
  High: "border-brand-500/30 bg-brand-50 text-brand-700",
  Moderate: "border-warn-500/30 bg-warn-50 text-warn-700",
}

const ACTION_META: Record<CareerAction, { icon: typeof CalendarPlus; fallback: string }> = {
  book_session: { icon: CalendarPlus, fallback: "Book a session" },
  take_assessment: { icon: ClipboardList, fallback: "Take the assessment" },
  save_to_plan: { icon: BookmarkPlus, fallback: "Save to my plan" },
  view_report: { icon: FileText, fallback: "View my report" },
  talk_to_counsellor: { icon: MessageCircle, fallback: "Talk to my counsellor" },
  top_up: { icon: Wallet, fallback: "Top up credits" },
}

// ── card shell ───────────────────────────────────────────────────────────────

function CardShell({
  icon: Icon, eyebrow, accent, children,
}: {
  icon: typeof Compass
  eyebrow: string
  /** Tailwind text-color class for the icon chip (brand/well/mind accent). */
  accent: string
  children: React.ReactNode
}) {
  return (
    <div className="my-1.5 w-full max-w-[22rem] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e1)]">
      <div className="flex items-center gap-2 border-b border-border/70 px-3.5 py-2">
        <span className={cn("grid size-6 place-items-center rounded-full bg-secondary", accent)}>
          <Icon className="size-3.5 stroke-[1.75]" />
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-400">{eyebrow}</span>
      </div>
      <div className="px-3.5 py-3">{children}</div>
    </div>
  )
}

// ── per-tool cards ───────────────────────────────────────────────────────────

function CareerCard({ input }: { input: CareerCardInput }) {
  const demandTone = input.demand ? DEMAND_TONE[input.demand] ?? DEMAND_TONE.Moderate : null
  return (
    <CardShell icon={Compass} eyebrow="Career option" accent="text-brand-600">
      <p className="text-[14px] font-semibold leading-snug text-foreground">{input.title}</p>
      {input.whyFit && <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{input.whyFit}</p>}
      {(input.studyPath || input.salaryBand || input.demand) && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {input.studyPath && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-ink-600">
              <GraduationCap className="size-3 stroke-[1.75]" /> {input.studyPath}
            </span>
          )}
          {input.salaryBand && (
            <span className="rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-ink-600">
              {input.salaryBand}
            </span>
          )}
          {input.demand && demandTone && (
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-medium", demandTone)}>
              {input.demand} demand
            </span>
          )}
        </div>
      )}
    </CardShell>
  )
}

function StudyPathCard({ input }: { input: StudyPathInput }) {
  const colleges: string[] = Array.isArray(input.colleges) ? input.colleges.slice(0, 4) : []
  return (
    <CardShell icon={GraduationCap} eyebrow="Study path" accent="text-mind-600">
      <p className="text-[14px] font-semibold leading-snug text-foreground">{input.goal}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[12.5px] text-foreground">
        <span className="font-medium">{input.degree}</span>
        {input.entrance && (
          <>
            <ChevronRight className="size-3.5 shrink-0 text-ink-300" />
            <span className="text-muted-foreground">{input.entrance}</span>
          </>
        )}
        {input.duration && (
          <span className="ml-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-[11px] font-medium text-ink-600">
            {input.duration}
          </span>
        )}
      </div>
      {colleges.length > 0 && (
        <div className="mt-2.5">
          <p className="mb-1 text-[10.5px] font-medium uppercase tracking-[0.08em] text-ink-300">Example colleges</p>
          <div className="flex flex-wrap gap-1.5">
            {colleges.map((c) => (
              <span key={c} className="rounded-lg border border-border bg-secondary px-2 py-0.5 text-[11.5px] text-ink-600">{c}</span>
            ))}
          </div>
        </div>
      )}
    </CardShell>
  )
}

function ReportInsightCard({ input }: { input: ReportInsightInput }) {
  return (
    <CardShell icon={Sparkles} eyebrow="From your report" accent="text-well-600">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[12px] font-medium text-muted-foreground">{input.label}</span>
        <span className="text-right text-[13.5px] font-semibold leading-snug text-foreground">{input.value}</span>
      </div>
      {input.meaning && <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{input.meaning}</p>}
    </CardShell>
  )
}

function ActionStepCard({ input, onAction }: { input: ActionStepInput; onAction?: (action: string, detail?: string) => void }) {
  const action = input.action
  const meta = action ? ACTION_META[action] : undefined
  const Icon = meta?.icon ?? ChevronRight
  const label: string = input.label || meta?.fallback || "Continue"
  return (
    <CardShell icon={Icon} eyebrow="Next step" accent="text-well-600">
      {input.detail && <p className="mb-2.5 text-[12.5px] leading-relaxed text-muted-foreground">{input.detail}</p>}
      <button
        type="button"
        onClick={() => action && onAction?.(action, input.detail || label)}
        className={cn(
          "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-[13px] font-semibold text-white",
          "bg-well-600 shadow-[var(--shadow-e1)] transition-[transform,background-color] hover:bg-well-700 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-well-500/50",
        )}
      >
        <Icon className="size-4 stroke-[1.75]" />
        {label}
      </button>
    </CardShell>
  )
}

// A SetMyCareer programme, as a card the member can tap through to buy. The
// gradient plate carries the product's identity; the redirect link is set in the
// Compass SIGNATURE GRADIENT so a package pitch always reads as "the AI is
// pointing you somewhere", consistently. Renders from just the offering id.
function PackageCard({ input }: { input: PackageCardInput }) {
  const o = input.offeringId ? offering2026ById(input.offeringId) : undefined
  if (!o) return null
  const to = `/portal/services/${o.id}`
  return (
    <div className="my-1.5 w-full max-w-[22rem] overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-e1)]">
      <Link to={to} className="group block">
        <div className="relative h-24 w-full overflow-hidden">
          <PackageGradient offeringId={o.id} className="absolute inset-0" interactive={false} />
          <div className="absolute inset-0 flex items-end justify-between p-3">
            <span className="font-editorial text-[19px] font-light leading-none text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.4)]">{o.name}</span>
            <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium tabular-nums text-white backdrop-blur-sm">
              {o.inr > 0 ? fmtINR(o.inr) : "Free"}
            </span>
          </div>
        </div>
        <div className="px-3.5 py-3">
          {input.whyFit && <p className="text-[12.5px] leading-relaxed text-muted-foreground">{input.whyFit}</p>}
          <span className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold compass-gradient-text">
            See the programme
            <ArrowRight className="size-3.5 text-mind-500 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </div>
  )
}

// A two-option decision, side by side — the answer to "compare X and Y for me"
// that the model used to dump as a wall of prose. Ends with a grounded pick.
function CompareCard({ input }: { input: CompareCardInput }) {
  const a = { name: input.aName, points: (input.aPoints ?? []).slice(0, 4) }
  const b = { name: input.bName, points: (input.bPoints ?? []).slice(0, 4) }
  return (
    <CardShell icon={Scale} eyebrow="Compared for you" accent="text-brand-600">
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((c, i) => (
          <div key={i} className={cn("rounded-xl border border-border bg-secondary/40 p-2.5", i === 0 && "border-r-0")}>
            <p className="text-[12.5px] font-semibold leading-snug text-foreground">{c.name}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {c.points.map((p, j) => (
                <li key={j} className="flex gap-1 text-[11.5px] leading-snug text-muted-foreground">
                  <span className="mt-1 size-1 shrink-0 rounded-full bg-ink-300" /> {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {input.pick && (
        <div className="mt-2.5 flex items-start gap-1.5 rounded-xl bg-well-50 px-2.5 py-2">
          <Check className="mt-0.5 size-3.5 shrink-0 text-well-600" />
          <p className="text-[12px] leading-relaxed text-well-800">
            <span className="font-semibold">{input.pick}</span>
            {input.pickWhy ? ` — ${input.pickWhy}` : ""}
          </p>
        </div>
      )}
    </CardShell>
  )
}

// Tappable follow-up suggestions — keeps the conversation moving without the
// member having to think of the next question (ai-wayfinders: Follow-ups).
function FollowUps({ input, onReply }: { input: FollowUpsInput; onReply?: (text: string) => void }) {
  const options = (input.options ?? []).slice(0, 4).filter(Boolean)
  if (options.length === 0 || !onReply) return null
  return (
    <div className="my-1 flex max-w-[22rem] flex-wrap gap-1.5">
      {options.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onReply(q)}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-[12px] text-ink-600 transition-colors hover:border-ink-300 hover:text-foreground"
        >
          {q}
        </button>
      ))}
    </div>
  )
}

// ── public renderer ──────────────────────────────────────────────────────────

/** Render the on-brand card for one client UI tool call. `name` accepts either
 *  the bare tool name ("careerCard") or the message-part form ("tool-careerCard").
 *  Returns null for any unknown tool so callers can render it unconditionally.
 *  `input` is `any` because it arrives straight from the model's tool call; each
 *  card reads its fields defensively. */
export function CareerToolCard({
  name, input, onAction, onReply,
}: {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any
  onAction?: (action: string, detail?: string) => void
  /** send a follow-up chip back to the guide (wired only where a composer exists) */
  onReply?: (text: string) => void
}) {
  const bare = name.startsWith("tool-") ? name.slice(5) : name
  if (!input) return null
  switch (bare) {
    case "careerCard":
      return input.title ? <CareerCard input={input} /> : null
    case "studyPath":
      return input.goal && input.degree ? <StudyPathCard input={input} /> : null
    case "reportInsight":
      return input.label && input.value ? <ReportInsightCard input={input} /> : null
    case "actionStep":
      return input.action ? <ActionStepCard input={input} onAction={onAction} /> : null
    case "packageCard":
      return input.offeringId ? <PackageCard input={input} /> : null
    case "compareCard":
      return input.aName && input.bName ? <CompareCard input={input} /> : null
    case "followUps":
      return <FollowUps input={input} onReply={onReply} />
    default:
      return null
  }
}
