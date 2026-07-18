// AuthLayout — the sign-in shell for all three SetMyCareer doors (client portal ·
// counsellor console · admin command deck). A clean split down the middle:
//
//   LEFT   an inset, rounded ARTWORK PLATE — the same liquid-gradient engine as
//          the 2026 product cards (AuthShader), one premium palette per door —
//          carrying the brand story: who this door is for, the promise, and the
//          three-beat journey behind it.
//   RIGHT  the form, quiet and monochrome on the warm white canvas. All colour
//          lives in the artwork; the form never competes with it.
//
// Mobile stacks: plate on top, form below. Each gate passes its form as
// {children} and styles it with the exported AUTH_* tokens.

import type { ReactNode } from "react"
import { ArrowRight } from "lucide-react"
import { LogoLockup } from "./Logo"
import { AuthShader } from "./AuthShader"

export type AuthRole = "client" | "counsellor" | "admin"

// Shared light-form tokens — the three gates use these so the forms read as one
// quiet system on the white side.
export const AUTH_CARD = "flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-e2 sm:p-7"
export const AUTH_TITLE = "font-display text-[20px] font-semibold tracking-tight text-foreground"
export const AUTH_SUB = "mt-1 text-[12.5px] leading-relaxed text-muted-foreground"
export const AUTH_LABEL = "text-[12px] font-medium text-ink-600"
export const AUTH_INPUT = ""
export const AUTH_MUTED = "text-muted-foreground"
export const AUTH_LINK = "font-medium text-foreground underline-offset-4 hover:underline"

interface RoleConfig {
  /** palettes lifted from the 2026 product-card gradients (site GRADIENT_PALETTES) */
  palette: [string, string, string]
  metallic: boolean
  accent: string
  who: string
  headline: string
  subline: string
  steps: { t: string; d: string }[]
  links: { label: string; href: string }[]
}

const ROLE: Record<AuthRole, RoleConfig> = {
  client: {
    // Big Picture — the flagship card's electric violet ↔ magenta
    palette: ["#a855f7", "#ec4899", "#6d28d9"],
    metallic: false,
    accent: "#c084fc",
    who: "For students, professionals & parents",
    headline: "Measured,\nthen yours.",
    subline: "Ranks sort you; they never read you. Inside — the instruments that measure what fits, and a counsellor who reads them with you.",
    steps: [
      { t: "Assess", d: "validated instruments, scored live" },
      { t: "Understand", d: "a counsellor reads the results with you" },
      { t: "Decide", d: "a plan you can defend at home" },
    ],
    links: [
      { label: "I'm a counsellor", href: "/" },
      { label: "Admin", href: "/admin" },
    ],
  },
  counsellor: {
    // Blueprint — indigo ↔ cyan over deep navy: calm, professional
    palette: ["#6366f1", "#22d3ee", "#1a1c4a"],
    metallic: false,
    accent: "#818cf8",
    who: "For SetMyCareer counsellors only",
    headline: "Run the practice.\nWe carry the rest.",
    subline: "Clients arrive booked, transcripts write themselves, reports draft overnight. The judgement — and the credit — stays yours.",
    steps: [
      { t: "Caseload", d: "every client, current at a glance" },
      { t: "Sessions", d: "video, live notes, transcripts" },
      { t: "Reports", d: "AI drafts; you own the word" },
    ],
    links: [
      { label: "I'm a client", href: "/portal" },
      { label: "Admin", href: "/admin" },
    ],
  },
  admin: {
    // Director's Cut — amber ↔ violet over aubergine, metallic sheen
    palette: ["#f59e0b", "#7c3aed", "#251440"],
    metallic: true,
    accent: "#fbbf24",
    who: "SetMyCareer staff only",
    headline: "Mission\nControl.",
    subline: "Every client, counsellor and rupee on one deck — measured live, from first lead to final report.",
    steps: [
      { t: "Watch", d: "revenue, funnels and pacing, live" },
      { t: "Run", d: "clients, counsellors, journeys" },
      { t: "Act", d: "coupons, refunds, access" },
    ],
    links: [
      { label: "I'm a client", href: "/portal" },
      { label: "Counsellor", href: "/" },
    ],
  },
}

export const authAccent = (role: AuthRole) => ROLE[role].accent

export function AuthLayout({ role = "client", children }: { role?: AuthRole; children: ReactNode }) {
  const r = ROLE[role]
  return (
    <div className="min-h-svh w-full bg-canvas text-foreground">
      <div className="grid min-h-svh lg:grid-cols-2">
        {/* ── the artwork plate — full-bleed liquid gradient, edge to edge, top to bottom (no frame) ── */}
        <div className="flex">
          <div className="relative flex h-full min-h-[52svh] w-full flex-col justify-between overflow-hidden p-6 text-white sm:p-9 lg:min-h-svh lg:p-12 xl:p-16">
            <AuthShader palette={r.palette} metallic={r.metallic} seedKey={`door-${role}`} />

            <div className="relative z-10 flex items-center justify-between gap-3">
              <LogoLockup size={22} tone="light" />
            </div>

            <div className="relative z-10 max-w-[30rem]">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-white/60">{r.who}</p>
              <h1 className="mt-3 whitespace-pre-line font-wordmark text-[clamp(2.2rem,4.6vw,3.4rem)] font-normal leading-[1.02] tracking-[-0.015em] drop-shadow-[0_1px_24px_rgba(0,0,0,0.35)]">
                {r.headline}
              </h1>
              <p className="mt-4 max-w-[36ch] text-[13.5px] font-light leading-relaxed text-white/75">{r.subline}</p>

              {/* the three-beat journey — the story, told in the fewest words */}
              <ol className="mt-7 hidden max-w-[24rem] flex-col gap-2.5 border-t border-white/15 pt-5 sm:flex">
                {r.steps.map((s, i) => (
                  <li key={s.t} className="flex items-baseline gap-3">
                    <span className="font-mono text-[10px] tabular-nums text-white/40">{String(i + 1).padStart(2, "0")}</span>
                    <span className="text-[12.5px] font-medium text-white/90">{s.t}</span>
                    <span className="text-[12px] font-light text-white/50">— {s.d}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px]">
                <span className="font-medium uppercase tracking-[0.12em] text-white/40">Wrong door?</span>
                {r.links.map((l) => (
                  <a key={l.href} href={l.href} className="group inline-flex items-center gap-1 font-medium text-white/80 underline-offset-4 transition hover:text-white hover:underline">
                    {l.label} <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── the form — quiet, monochrome, on the warm white canvas ── */}
        <div className="flex items-start justify-center px-5 pb-14 pt-4 sm:items-center sm:px-8 sm:py-12">
          <div className="w-full max-w-[420px]">{children}</div>
        </div>
      </div>
    </div>
  )
}
