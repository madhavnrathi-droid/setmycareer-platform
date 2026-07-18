// Generative-UI cards for the marketing Compass (CareerBar). The visitor chatbot
// posts in `plain` mode and reads back { text, cards }; each `card` is a tool the
// counsellor-side model emitted (jobGroupCard, resourceCard, pageLink, ctaRow,
// criCard, leadForm). We render them as branded, monochrome-editorial cards so the
// public bot answers with UI — a job-group snapshot, a cited resource, a page
// link, action buttons, the free-test card, or an in-chat lead form — instead of a
// wall of prose. Internal links use react-router <Link> so a click redirects to the
// exact page (and the panel closes on route change); the sample report downloads;
// sign-in links open the product app.

import { useState, type ComponentType, type ReactNode, type ChangeEvent, type FormEvent } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight, ArrowUpRight, Download, Document, DocumentPdf, VideoPlayer, Book,
  Growth, Meter, Send, CheckmarkFilled,
} from "@carbon/icons-react"
import { PORTAL_URL, COUNSELLOR_URL } from "@/lib/api"
import { rowById } from "@/content/careers-all"
import { offeringById, fmtINR } from "@/content/offerings"

// ── the card contract (mirrors the server tool inputs in assistant-core.ts) ──
export type CompassCardData =
  | { type: "packageCard"; offeringId: string; whyFit?: string }
  | { type: "jobGroupCard"; title: string; overview?: string; outlook?: "Expanding" | "Stable" | "Cooling"; salaryBand?: string; demand?: string; skills?: string[]; assessments?: string[]; careerId?: string }
  | { type: "resourceCard"; kind?: "article" | "video" | "fieldnote" | "report" | "guide"; title: string; description?: string; to: string; cta?: string }
  | { type: "pageLink"; title: string; to: string; why?: string }
  | { type: "ctaRow"; actions: { action: string; label?: string }[] }
  | { type: "criCard"; headline?: string; note?: string }
  | { type: "leadForm"; headline?: string; note?: string; reason?: string }
  | { type: string; [k: string]: unknown }

// The model controls some link targets, so never trust a raw `to`: allow only an
// internal path ("/…", incl. #hash) or an https absolute URL. Anything else
// (javascript:, data:, http:, protocol-relative) collapses to the safe home path.
const safeTo = (to: unknown): string => {
  const t = typeof to === "string" ? to.trim() : ""
  if (t.startsWith("/") && !t.startsWith("//")) return t // internal path, not protocol-relative
  if (/^https:\/\//i.test(t)) return t
  return "/"
}
const isExternal = (to: string) => /^https:\/\//i.test(to)

// a link that redirects in-app for site paths, opens a new tab for the product app,
// and downloads for the sample PDF. Label text is wrapped (the .btn ::before trap).
function CardLink({
  to, children, solid = false, dark = false, download = false, className = "",
}: { to: string; children: ReactNode; solid?: boolean; dark?: boolean; download?: boolean; className?: string }) {
  const href = safeTo(to)
  const cls = `${dark ? "btn btn--dark" : solid ? "btn btn--solid" : "btn"} !py-2 !px-3.5 !text-[12.5px] ${className}`
  const inner = <><span>{children}</span>{download ? <Download size={14} className="btn-arrow" /> : <ArrowRight size={14} className="btn-arrow" />}</>
  if (download || isExternal(href)) {
    return <a href={href} {...(download ? { download: "" } : { target: "_blank", rel: "noreferrer" })} className={cls}>{inner}</a>
  }
  return <Link to={href} className={cls}>{inner}</Link>
}

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[11px] border border-line bg-paper-pure p-3.5">{children}</div>
)
const Kick = ({ Icon, children }: { Icon: ComponentType<{ size?: number; className?: string }>; children: ReactNode }) => (
  <div className="mb-2 flex items-center gap-1.5 text-ink-40"><Icon size={13} /><span className="kicker">{children}</span></div>
)

// ── a programme/package from the 2026 catalog ───────────────────────────────
// The model only sends the offeringId (+ one personal line); everything else —
// price, inclusions, credits, the buy link — renders from the site's own catalog,
// so the card can never misquote a price and costs almost no output tokens.
function PackageCard(c: Extract<CompassCardData, { type: "packageCard" }>) {
  const o = offeringById(c.offeringId)
  if (!o) return null
  const free = o.price.inr === 0
  const featured = !!o.featured
  return (
    <div className={`rounded-[11px] border p-4 ${featured ? "border-ink bg-ink text-paper" : "border-line bg-paper-pure"}`}>
      <div className={`mb-2 flex items-center justify-between gap-2 ${featured ? "text-paper/50" : "text-ink-40"}`}>
        <span className="kicker">{featured ? "Programme · Most popular" : "Programme"}</span>
        {o.priceNote && <span className="mono text-[10px] uppercase tracking-[0.12em]">{o.priceNote}</span>}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h4 className={`ed-title text-[16.5px] ${featured ? "text-paper" : "text-ink"}`}>{o.name}</h4>
        <p className={`shrink-0 text-[15px] font-medium tabular-nums ${featured ? "text-paper" : "text-ink"}`}>{free ? "Free" : fmtINR(o.price.inr)}</p>
      </div>
      <p className={`mt-1.5 text-[13px] leading-relaxed ${featured ? "text-paper/70" : "text-ink-60"}`}>{c.whyFit ?? o.tagline}</p>
      <ul className={`mt-3 space-y-1 text-[12.5px] leading-relaxed ${featured ? "text-paper/80" : "text-ink-80"}`}>
        {o.includes.slice(0, 3).map((inc) => (
          <li key={inc} className="flex items-baseline gap-2"><span className={`mono text-[10px] ${featured ? "text-paper/40" : "text-ink-40"}`}>—</span>{inc}</li>
        ))}
        {o.sessions > 0 && <li className="flex items-baseline gap-2"><span className={`mono text-[10px] ${featured ? "text-paper/40" : "text-ink-40"}`}>—</span>{o.sessions} counselling session{o.sessions > 1 ? "s" : ""}</li>}
      </ul>
      {o.ai && o.ai.careerCredits > 0 && (
        <p className={`mt-2.5 text-[12px] ${featured ? "text-paper/60" : "text-ink-40"}`}>
          <span className={featured ? "text-paper/80" : "text-ink-60"}>{o.ai.headline}</span> · {o.ai.careerCredits} Career Credits · {o.ai.voiceCredits} Voice Credits
        </p>
      )}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        {free
          ? <CardLink to="/cri" solid>Take the free test</CardLink>
          : <CardLink to={`/checkout/${o.id}`} solid={!featured} dark={featured}>{o.cta}</CardLink>}
        <Link to="/pricing" className={`ul text-[12px] ${featured ? "text-paper/60" : "text-ink-60"}`}>Full pricing</Link>
      </div>
    </div>
  )
}

// ── job group / career at a glance ──────────────────────────────────────────
const OUTLOOK: Record<string, { c: string; label: string }> = {
  Expanding: { c: "text-growth", label: "Expanding" },
  Stable: { c: "text-flat", label: "Stable" },
  Cooling: { c: "text-decline", label: "Cooling" },
}
function JobGroupCard(c: Extract<CompassCardData, { type: "jobGroupCard" }>) {
  const known = c.careerId ? rowById(c.careerId) : undefined
  const to = known ? `/library/${known.id}` : "/library"
  const ol = c.outlook ? OUTLOOK[c.outlook] : undefined
  return (
    <Shell>
      <Kick Icon={Growth}>Career · at a glance</Kick>
      <div className="flex items-start justify-between gap-3">
        <h4 className="ed-title text-[16.5px] text-ink">{c.title}</h4>
        {ol && <span className={`mono shrink-0 text-[10px] uppercase tracking-[0.12em] ${ol.c}`}>{ol.label}</span>}
      </div>
      {c.overview && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{c.overview}</p>}
      {(c.salaryBand || c.demand) && (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5">
          {c.salaryBand && <Stat label="Pay band">{c.salaryBand}</Stat>}
          {c.demand && <Stat label="Demand">{c.demand}</Stat>}
        </div>
      )}
      {c.skills && c.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.skills.slice(0, 6).map((s) => (
            <span key={s} className="rounded-full border border-line px-2.5 py-1 text-[11.5px] text-ink-80">{s}</span>
          ))}
        </div>
      )}
      {c.assessments && c.assessments.length > 0 && (
        <p className="mt-3 text-[12px] leading-relaxed text-ink-40">
          <span className="text-ink-60">Maps to your fit via</span> {c.assessments.slice(0, 3).join(" · ")}
        </p>
      )}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <CardLink to={to}>{known ? "Open in the Career Terminal" : "Explore careers"}</CardLink>
        <Link to="/cri" className="ul text-[12px] text-ink-60">Find your fit — free test</Link>
      </div>
    </Shell>
  )
}
const Stat = ({ label, children }: { label: string; children: ReactNode }) => (
  <div><p className="mono text-[9.5px] uppercase tracking-[0.13em] text-ink-40">{label}</p><p className="mt-0.5 text-[13px] font-medium text-ink">{children}</p></div>
)

// ── cited resource (guide / video / field note / article / report) ──────────
const KIND: Record<string, { Icon: ComponentType<{ size?: number; className?: string }>; label: string; cta: string }> = {
  article: { Icon: Document, label: "Article", cta: "Read" },
  video: { Icon: VideoPlayer, label: "Video", cta: "Watch" },
  fieldnote: { Icon: Book, label: "Field note", cta: "Read" },
  report: { Icon: DocumentPdf, label: "Report", cta: "Open" },
  guide: { Icon: Book, label: "Guide", cta: "Read" },
}
function ResourceCard(c: Extract<CompassCardData, { type: "resourceCard" }>) {
  const k = KIND[c.kind ?? "guide"] ?? KIND.guide
  const isPdf = /\.pdf($|\?)/.test(c.to)
  return (
    <Shell>
      <Kick Icon={k.Icon}>{k.label}</Kick>
      <h4 className="text-[14.5px] font-medium leading-snug tracking-tight text-ink">{c.title}</h4>
      {c.description && <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{c.description}</p>}
      <div className="mt-3">
        <CardLink to={c.to} download={isPdf}>{c.cta ?? k.cta}</CardLink>
      </div>
    </Shell>
  )
}

// ── a single page citation with a redirect button ───────────────────────────
function PageLink(c: Extract<CompassCardData, { type: "pageLink" }>) {
  const href = safeTo(c.to) // never trust a model-controlled target (http://, //host, undefined → "/")
  const external = isExternal(href)
  const cls = "group flex items-center justify-between gap-3"
  const inner = (
    <>
      <span>
        <span className="text-[14px] font-medium tracking-tight text-ink group-hover:underline">{c.title}</span>
        {c.why && <span className="mt-0.5 block text-[12.5px] leading-relaxed text-ink-60">{c.why}</span>}
      </span>
      <ArrowUpRight size={16} className="shrink-0 text-ink-40 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </>
  )
  return (
    <Shell>
      {external
        ? <a href={c.to} target="_blank" rel="noreferrer" className={cls}>{inner}</a>
        : <Link to={c.to} className={cls}>{inner}</Link>}
    </Shell>
  )
}

// ── a row of action buttons ─────────────────────────────────────────────────
type ActionDef = { to: string; label: string; download?: boolean }
const ACTIONS: Record<string, ActionDef> = {
  take_cri: { to: "/cri", label: "Take the free test" },
  book_session: { to: "/book", label: "Book a session" },
  download_sample_report: { to: "/product/sample-career-report.pdf", label: "Download sample report", download: true },
  see_pricing: { to: "/pricing", label: "See pricing" },
  explore_careers: { to: "/library", label: "Explore careers" },
  sign_in_client: { to: PORTAL_URL, label: "Sign in" },
  sign_in_counsellor: { to: COUNSELLOR_URL, label: "Counsellor sign-in" },
  talk_to_expert: { to: "/contact", label: "Talk to an expert" },
  contact: { to: "/contact", label: "Contact us" },
}
function CtaRow(c: Extract<CompassCardData, { type: "ctaRow" }>) {
  const acts = (c.actions ?? []).map((a) => ({ def: ACTIONS[a.action], label: a.label })).filter((a) => a.def)
  if (!acts.length) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      {acts.map((a, i) => (
        <CardLink key={a.def!.to + i} to={a.def!.to} download={a.def!.download} solid={i === 0}>
          {a.label ?? a.def!.label}
        </CardLink>
      ))}
    </div>
  )
}

// ── the free Career Readiness Index test ────────────────────────────────────
function CriCard(c: Extract<CompassCardData, { type: "criCard" }>) {
  return (
    <div className="rounded-[11px] border border-ink/15 bg-ink/[0.03] p-4">
      <Kick Icon={Meter}>Free · ~4 minutes</Kick>
      <h4 className="ed-title text-[16px] text-ink">{c.headline ?? "Start with the Career Readiness Index"}</h4>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">
        {c.note ?? "A short, validated readiness check — see where you stand and what to work on, no sign-up needed."}
      </p>
      <div className="mt-3.5">
        <CardLink to="/cri" solid>Take the free test</CardLink>
      </div>
    </div>
  )
}

// ── in-chat lead capture → same-origin /api/lead ────────────────────────────
function LeadFormCard(c: Extract<CompassCardData, { type: "leadForm" }>) {
  const [f, setF] = useState({ name: "", email: "", phone: "", city: "", message: "" })
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle")
  const [err, setErr] = useState("")
  const set = (k: keyof typeof f) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  const emailOk = /^\S+@\S+\.\S+$/.test(f.email)
  const phoneOk = f.phone.replace(/\D/g, "").length >= 7
  const valid = f.name.trim().length > 1 && (emailOk || phoneOk)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!valid || state === "sending") return
    setState("sending"); setErr("")
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...f, source: c.reason ? `compass chatbot — ${c.reason}` : "compass chatbot" }),
      })
      const d = (await r.json()) as { ok?: boolean; error?: string }
      if (r.ok && d.ok) setState("done")
      else { setState("error"); setErr(d.error || "Something went wrong — please try again.") }
    } catch { setState("error"); setErr("Couldn't reach us just now — please try again.") }
  }

  if (state === "done") {
    return (
      <div className="rounded-[11px] border border-line bg-paper-pure p-4">
        <div className="flex items-center gap-2 text-ink"><CheckmarkFilled size={16} /><span className="text-[14px] font-medium">Thank you — we'll be in touch.</span></div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">A career expert will reach out shortly. If it's urgent, you can also <Link to="/book" className="ul font-medium">book a session</Link>.</p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="rounded-[11px] border border-line bg-paper-pure p-4">
      <Kick Icon={Send}>{c.reason ? `Enquiry · ${c.reason}` : "Talk to a career expert"}</Kick>
      <h4 className="text-[14.5px] font-medium tracking-tight text-ink">{c.headline ?? "Leave your details — we'll reach out"}</h4>
      {c.note && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-60">{c.note}</p>}
      <div className="mt-3 grid gap-2">
        <input className="field-box !py-2 !text-[13px]" placeholder="Your name" value={f.name} onChange={set("name")} autoComplete="name" />
        <div className="grid grid-cols-2 gap-2">
          <input className="field-box !py-2 !text-[13px]" placeholder="Email" value={f.email} onChange={set("email")} inputMode="email" autoComplete="email" />
          <input className="field-box !py-2 !text-[13px]" placeholder="Phone" value={f.phone} onChange={set("phone")} inputMode="tel" autoComplete="tel" />
        </div>
        <input className="field-box !py-2 !text-[13px]" placeholder="City (optional)" value={f.city} onChange={set("city")} autoComplete="address-level2" />
        <textarea className="field-box !py-2 !text-[13px]" rows={2} placeholder="Anything we should know? (optional)" value={f.message} onChange={set("message")} />
      </div>
      {state === "error" && <p className="mt-2 text-[12px] text-decline">{err}</p>}
      <button type="submit" disabled={!valid || state === "sending"} className="btn btn--solid mt-3 !py-2 !px-3.5 !text-[12.5px] disabled:opacity-40">
        <span>{state === "sending" ? "Sending…" : "Send"}</span><Send size={14} className="btn-arrow" />
      </button>
      <p className="mt-2 text-[10.5px] leading-relaxed text-ink-40">We'll only use this to reach you about your enquiry.</p>
    </form>
  )
}

// ── dispatcher ──────────────────────────────────────────────────────────────
function One({ card }: { card: CompassCardData }) {
  switch (card.type) {
    case "packageCard": return <PackageCard {...(card as Extract<CompassCardData, { type: "packageCard" }>)} />
    case "jobGroupCard": return <JobGroupCard {...(card as Extract<CompassCardData, { type: "jobGroupCard" }>)} />
    case "resourceCard": return <ResourceCard {...(card as Extract<CompassCardData, { type: "resourceCard" }>)} />
    case "pageLink": return <PageLink {...(card as Extract<CompassCardData, { type: "pageLink" }>)} />
    case "ctaRow": return <CtaRow {...(card as Extract<CompassCardData, { type: "ctaRow" }>)} />
    case "criCard": return <CriCard {...(card as Extract<CompassCardData, { type: "criCard" }>)} />
    case "leadForm": return <LeadFormCard {...(card as Extract<CompassCardData, { type: "leadForm" }>)} />
    default: return null // unknown tool → render nothing (forward-compatible)
  }
}

export function CompassCards({ cards }: { cards?: CompassCardData[] }) {
  if (!cards || cards.length === 0) return null
  return (
    <div className="mt-4 space-y-2.5">
      {cards.map((card, i) => <One key={i} card={card} />)}
    </div>
  )
}
