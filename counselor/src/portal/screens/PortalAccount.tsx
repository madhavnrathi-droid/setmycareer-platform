// Account — the member profile intake + counsellor + plan.
//
// The profile section deliberately borrows the TEST ROOM's language — numbered
// mono eyebrows, question-first rows, hairlines, one calm column — but on the
// portal's WHITE ground with no gradient anywhere. It is the gate for the whole
// programme: tests and session booking stay locked until the required set is
// complete, because the norm tables (age/gender), the counsellor match and the
// report all depend on what's collected here. Subjective answers go to the
// counsellor and the report verbatim — they are context, never scored.

import { useMemo, useState } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { Check, LogOut, ArrowRight } from "lucide-react"
import {
  usePortalAccount, updateProfile, signOut, accountTrack,
  profileRequirements, profileCompleteness, profileComplete,
  PROFILE_STAGES, type PortalTrack, type PortalProfile,
} from "../portal-store"
import { usePortalCounsellor } from "../counsellors"
import { CounsellorCredentials } from "../components/CounsellorCredentials"
import { offering2026ById } from "../../server/offerings-2026"
import { cn } from "@/lib/utils"

/* ── the intake's small kit — hairline fields, mono labels, pill choices ────── */

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <span className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-600">
      {children}{required && <span className="text-brand-600"> *</span>}
    </span>
  )
}

function LineInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        "w-full border-b-2 border-border bg-transparent pb-2.5 pt-1.5 text-[16px] font-light text-foreground",
        "placeholder:text-ink-300 focus:border-foreground focus:outline-none transition-colors",
        props.className,
      )}
    />
  )
}

function Pills<T extends string>({ options, value, onChange }: {
  options: { v: T; label: string }[]
  value: T | undefined
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o.v
        return (
          <button
            key={o.v} type="button" onClick={() => onChange(o.v)} aria-pressed={on}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-light transition-colors",
              on ? "border-foreground bg-foreground text-background" : "border-border text-ink-600 hover:border-ink-300",
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function AskRow({ n, q, note, children }: { n: string; q: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-t border-border py-7 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-10">
      <div className="flex gap-4">
        <span className="font-mono text-[11px] tabular-nums leading-[1.7] text-ink-300">{n}</span>
        <div>
          <p className="text-[15.5px] font-medium leading-snug tracking-[-0.01em] text-foreground">{q}</p>
          {note && <p className="mt-1.5 max-w-[44ch] text-[12.5px] font-light leading-relaxed text-ink-400">{note}</p>}
        </div>
      </div>
      <div className="self-end sm:pl-0">{children}</div>
    </div>
  )
}

/* ── the profile intake ─────────────────────────────────────────────────────── */

function ProfileIntake() {
  const account = usePortalAccount()
  const { hash } = useLocation()
  const [saved, setSaved] = useState(false)

  const p = account?.profile ?? {}
  const [form, setForm] = useState<PortalProfile>({
    fullName: p.fullName ?? account?.name ?? "",
    age: p.age,
    gender: p.gender,
    location: p.location ?? "",
    email: p.email ?? account?.email ?? "",
    phone: p.phone ?? account?.phone ?? "",
    linkedin: p.linkedin ?? "",
    stage: p.stage ?? "",
    qDecision: p.qDecision ?? "",
    qContext: p.qContext ?? "",
    qStrengths: p.qStrengths ?? "",
    qConstraints: p.qConstraints ?? "",
    qSuccess: p.qSuccess ?? "",
  })
  const [track, setTrack] = useState<PortalTrack | undefined>(account?.track)

  const set = <K extends keyof PortalProfile>(k: K, v: PortalProfile[K]) => setForm((f) => ({ ...f, [k]: v }))

  // live completeness against WHAT'S TYPED (not just what's saved) would lie —
  // the gate reads the store. So the bar reflects the SAVED account; the Save
  // button is the moment it moves.
  const pct = account ? profileCompleteness(account) : 0
  const missing = account ? profileRequirements(account).filter((r) => !r.done) : []
  const complete = profileComplete(account)

  const pkg = useMemo(() => {
    const buys = account?.purchases ?? []
    const named = [...buys].reverse().find((b) => b.label || b.productId)
    if (named) return named.label ?? offering2026ById(named.productId)?.name ?? named.productId
    return null
  }, [account])

  if (!account) return null

  const save = () => {
    updateProfile(
      {
        ...form,
        fullName: form.fullName?.trim(),
        age: form.age ? Number(form.age) : undefined,
        location: form.location?.trim(),
        email: form.email?.trim(),
        phone: form.phone?.trim(),
        linkedin: form.linkedin?.trim(),
      },
      track,
    )
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2400)
  }

  const stageOptions = PROFILE_STAGES[track ?? "student"]
  const signedUpWithEmail = !!(account.email && !account.phone)

  return (
    <section id="profile" className={cn(hash === "#profile" && "scroll-mt-6")}>
      {/* header — progress is the headline until it's done */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-ink-300">Your profile</p>
          <h1 className="mt-2 font-editorial text-[30px] font-light leading-[1.05] tracking-tight sm:text-[38px]">
            {complete ? "Profile complete." : "First, the person."}
          </h1>
          <p className="mt-2 max-w-[52ch] text-[13.5px] font-light leading-relaxed text-ink-600">
            {complete
              ? "Everything your counsellor and your report need. Edit any answer — it stays yours."
              : "Your tests, your counsellor match and your report are built on this page. It takes about four minutes, and tests unlock the moment it's done."}
          </p>
        </div>
        <div className="min-w-[180px]">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">Complete</span>
            <span className="font-mono text-[13px] tabular-nums text-foreground">{pct}%</span>
          </div>
          <div className="mt-1.5 h-[3px] overflow-hidden rounded-full bg-border">
            <div className="h-full rounded-full bg-foreground transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
          {!complete && missing.length > 0 && (
            <p className="mt-1.5 text-[11px] font-light text-ink-300">
              {missing.length} item{missing.length === 1 ? "" : "s"} left
            </p>
          )}
        </div>
      </div>

      {/* legend */}
      <p className="mt-8 text-[11.5px] font-light text-ink-400">
        Fields marked <span className="font-medium text-brand-600">*</span> are required — they unlock your tests and sessions.
      </p>

      {/* 01 — about you */}
      <div className="mt-10">
        <div className="flex items-baseline gap-4 border-b-2 border-foreground pb-3">
          <span className="font-editorial text-[26px] font-light leading-none text-ink-300">01</span>
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">About you</h2>
            <p className="text-[12px] font-light text-ink-400">Who the report is for — and which score tables it uses.</p>
          </div>
        </div>
        <div className="mt-1">
          <AskRow n="01" q="Your full name" note="Exactly as it should appear on your report.">
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>Full name</FieldLabel>
              <LineInput value={form.fullName ?? ""} onChange={(e) => set("fullName", e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
          </AskRow>
          <AskRow n="02" q="Age and gender" note="These pick the score tables your ability results are compared against — they change your numbers.">
            <div className="grid grid-cols-[96px_1fr] items-end gap-6">
              <div className="flex flex-col gap-1.5">
                <FieldLabel required>Age</FieldLabel>
                <LineInput
                  inputMode="numeric" value={form.age ?? ""} placeholder="16"
                  onChange={(e) => { const d = e.target.value.replace(/\D/g, "").slice(0, 2); set("age", d ? Number(d) : undefined) }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel required>Gender</FieldLabel>
                <Pills
                  options={[{ v: "female" as const, label: "Female" }, { v: "male" as const, label: "Male" }, { v: "other" as const, label: "Other" }]}
                  value={form.gender} onChange={(v) => set("gender", v)}
                />
              </div>
            </div>
          </AskRow>
          <AskRow n="03" q="Where are you based?" note="City is enough — it frames the market your options are read against.">
            <div className="flex flex-col gap-1.5">
              <FieldLabel required>City</FieldLabel>
              <LineInput value={form.location ?? ""} onChange={(e) => set("location", e.target.value)} placeholder="Bengaluru" autoComplete="address-level2" />
            </div>
          </AskRow>
          <AskRow
            n="04" q="Where are you on your path?"
            note="This decides your third assessment automatically — students take the timed ability battery, professionals take Competency & Potential."
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <FieldLabel required>I am a</FieldLabel>
                <Pills
                  options={[{ v: "student" as const, label: "Student" }, { v: "professional" as const, label: "Working professional" }]}
                  value={track}
                  onChange={(v) => { setTrack(v); set("stage", "") }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <FieldLabel required>{track === "professional" ? "Experience" : "Stage"}</FieldLabel>
                <Pills options={stageOptions} value={form.stage || undefined} onChange={(v) => set("stage", v)} />
              </div>
            </div>
          </AskRow>
        </div>
      </div>

      {/* 02 — reaching you */}
      <div className="mt-12">
        <div className="flex items-baseline gap-4 border-b-2 border-foreground pb-3">
          <span className="font-editorial text-[26px] font-light leading-none text-ink-300">02</span>
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">Reaching you</h2>
            <p className="text-[12px] font-light text-ink-400">How your counsellor and your report find you.</p>
          </div>
        </div>
        <div className="mt-1">
          <AskRow
            n="05" q="Email and phone"
            note={signedUpWithEmail
              ? "You signed up with your email — add a phone number so your counsellor can reach you before sessions."
              : "You signed in with your phone — add an email so your report and session notes have somewhere to land."}
          >
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <FieldLabel required>Email</FieldLabel>
                <LineInput type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" autoComplete="email" />
              </div>
              <div className="flex flex-col gap-1.5">
                <FieldLabel required>Phone</FieldLabel>
                <LineInput
                  inputMode="tel" value={form.phone ?? ""} placeholder="98xxxxxxxx" autoComplete="tel"
                  onChange={(e) => set("phone", e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 16))}
                />
              </div>
            </div>
          </AskRow>
          <AskRow n="06" q="LinkedIn" note="Optional — useful context for professionals; skip it freely.">
            <div className="flex flex-col gap-1.5">
              <FieldLabel>Profile URL</FieldLabel>
              <LineInput value={form.linkedin ?? ""} onChange={(e) => set("linkedin", e.target.value)} placeholder="linkedin.com/in/…" />
            </div>
          </AskRow>
        </div>
      </div>

      {/* 03 — in your own words */}
      <div className="mt-12">
        <div className="flex items-baseline gap-4 border-b-2 border-foreground pb-3">
          <span className="font-editorial text-[26px] font-light leading-none text-ink-300">03</span>
          <div>
            <h2 className="text-[16px] font-medium tracking-[-0.01em] text-foreground">In your own words</h2>
            <p className="text-[12px] font-light text-ink-400">
              Goes to your counsellor and your report exactly as written. A sentence or two is plenty — never scored.
            </p>
          </div>
        </div>
        <div className="mt-1">
          {([
            { k: "qDecision" as const, n: "07", req: true, q: "What's the decision you're trying to make?", ph: "e.g. Which stream after Class 10 · whether to leave consulting for product" },
            { k: "qContext" as const, n: "08", req: false, q: "What prompted this now — where do you feel stuck?", ph: "What happened, or keeps happening…" },
            { k: "qStrengths" as const, n: "09", req: false, q: "What do people around you consistently say you're good at?", ph: "Teachers, colleagues, family — their words" },
            { k: "qConstraints" as const, n: "10", req: false, q: "Any constraints that matter?", ph: "City, family, finances, timelines — anything real" },
            { k: "qSuccess" as const, n: "11", req: true, q: "Three years from now, what does a great outcome look like?", ph: "Describe the day-to-day, not just the title" },
          ]).map((row) => (
            <AskRow key={row.k} n={row.n} q={row.q}>
              <div className="flex flex-col gap-1.5">
                <FieldLabel required={row.req}>{row.req ? "Required" : "Optional"}</FieldLabel>
                <textarea
                  value={String(form[row.k] ?? "")}
                  onChange={(e) => set(row.k, e.target.value)}
                  rows={2} placeholder={row.ph}
                  className="w-full resize-none border-b-2 border-border bg-transparent pb-2.5 pt-1.5 text-[15px] font-light leading-relaxed text-foreground placeholder:text-ink-300 focus:border-foreground focus:outline-none transition-colors"
                />
              </div>
            </AskRow>
          ))}
        </div>
      </div>

      {/* save rail */}
      <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <button
          onClick={save}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-[13.5px] font-medium text-background transition hover:opacity-90"
        >
          {saved ? <><Check className="size-4" /> Saved</> : complete ? "Save changes" : "Save profile"}
        </button>
        {complete ? (
          <Link to="/portal/assessments" className="inline-flex items-center gap-1.5 text-[13px] font-light text-ink-600 transition-colors hover:text-foreground">
            Your assessments are unlocked <ArrowRight className="size-3.5" />
          </Link>
        ) : (
          <p className="text-[12px] font-light text-ink-300">
            Tests and session booking unlock when every required field is saved.
          </p>
        )}
        {pkg && (
          <p className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.16em] text-ink-300">
            Package · <span className="text-ink-600">{pkg}</span>
          </p>
        )}
      </div>
    </section>
  )
}

/* ── the page ───────────────────────────────────────────────────────────────── */

export function PortalAccount() {
  const nav = useNavigate()
  const account = usePortalAccount()
  const { counsellor, loading: cLoading } = usePortalCounsellor()
  if (!account) return null
  const track = accountTrack(account)

  return (
    <div className="mx-auto max-w-3xl">
      <ProfileIntake />

      {/* counsellor — assigned, not chosen */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-ink-600">Your counsellor</h2>
        {counsellor ? (
          <>
            <div className="mt-4 flex items-center gap-3">
              {counsellor.img ? (
                <img
                  src={counsellor.img} alt="" className="size-11 shrink-0 rounded-full object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none" }}
                />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-foreground text-[14px] font-medium text-background">
                  {counsellor.initials}
                </span>
              )}
              <div className="min-w-0">
                <p className="truncate text-[14.5px] font-normal text-foreground">{counsellor.name}</p>
                <p className="truncate text-[12.5px] font-light text-muted-foreground">{counsellor.title}</p>
              </div>
            </div>
            <p className="mt-3 text-[12.5px] font-light text-muted-foreground">
              Matched to you from your results — not picked from a list. Your profile answers above go with the match.
            </p>
            <CounsellorCredentials counsellor={counsellor} className="mt-4" />
          </>
        ) : cLoading ? (
          <p className="mt-3 text-[13px] font-light text-muted-foreground">Loading your counsellor…</p>
        ) : (
          <p className="mt-3 text-[13px] font-light text-muted-foreground">
            Your counsellor is assigned once your profile is complete and your first session is booked —
            the {track === "professional" ? "executive" : "student"} answers above shape the match.
          </p>
        )}
      </section>

      {/* plan */}
      <Link
        to="/portal/billing"
        className="mt-10 flex items-center gap-4 border-t border-border pt-8 transition-colors hover:text-foreground"
      >
        <div className="flex-1">
          <h2 className="text-[14px] font-normal text-foreground">Package &amp; credits</h2>
          <p className="text-[12.5px] font-light text-muted-foreground">
            {account.credits.sessions} sessions · {account.credits.careerCredits ?? 0} career credits · {account.credits.voiceCredits ?? 0} voice credits
          </p>
        </div>
        <span className="rounded-full border border-border px-3.5 py-1.5 text-[12px] font-medium text-foreground">Manage</span>
      </Link>

      <button
        onClick={() => { signOut(); nav("/portal") }}
        className="mt-10 inline-flex items-center gap-1.5 text-[13px] font-light text-risk-600 transition hover:underline"
      >
        <LogOut className="size-4" /> Sign out
      </button>
    </div>
  )
}
