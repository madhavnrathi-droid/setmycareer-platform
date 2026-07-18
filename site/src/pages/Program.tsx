import { useState, type ChangeEvent, type FormEvent } from "react"
import { Link, Navigate, useParams } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Phone, Time } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { LONGTERM, longTermBySlug, fmtINR, type LongTermProgram } from "@/content/offerings"
import { PackageGradient } from "@/components/pricing/PackageGradient"

/* /programs/:slug — the two long-term engagements (Blueprint for students,
   Autobiography for executives) that grew out of SetMyCareer's VCLP. No price
   table, no online checkout: an aspirational, problem-first case, then a CUSTOM
   application form (the situation + what they want + timeline, beyond the usual
   contact fields) that posts to /api/lead so the desk can build a bespoke
   proposal. The offerings that fit are surfaced by the problems they solve. */

// The stage options shown in the application, per audience.
const STAGE_OPTIONS: Record<LongTermProgram["audience"], string[]> = {
  student: ["School student (8–10)", "School student (11–12)", "Undergraduate", "Postgraduate", "Parent applying for a child", "Other"],
  executive: ["Working professional (1–10 yrs)", "Senior professional (10+ yrs)", "Executive / CXO", "Founder / entrepreneur", "Career break / relocation", "Other"],
}

const EMAIL_RE = /^\S+@\S+\.\S+$/

export function Program() {
  const ref = useReveals()
  const { slug } = useParams<{ slug: string }>()
  const p = longTermBySlug(slug)

  useSeo({
    title: p ? `${p.name} — the long-term programme | SetMyCareer` : "Long-term programmes — SetMyCareer",
    description: p
      ? `${p.tagline} ${p.positioning} Application only — a discovery conversation, then a bespoke ${p.horizon} roadmap and a custom proposal from ${fmtINR(p.priceFrom)}.`
      : "SetMyCareer's long-term career programmes — multi-year mentorship for students (Blueprint) and executives (Autobiography).",
    path: `/programs/${slug ?? ""}`,
  })

  if (!p) return <Navigate to="/pricing" replace />

  const other = LONGTERM.find((x) => x.slug !== p.slug)

  return (
    <main ref={ref} className="pt-28">
      {/* ── hero — the programme on its own living gradient ── */}
      <section className="wrap pt-6 md:pt-10">
        <div className="relative overflow-hidden rounded-[28px] bg-ink text-paper">
          <PackageGradient offeringId={p.offeringId} interactive scrim />
          <div className="relative z-[1] px-6 py-16 sm:px-10 md:px-14 md:py-24">
            <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
              <p data-reveal className="mono text-[10.5px] uppercase tracking-[0.18em] text-paper/65">{p.eyebrow}</p>
              <p data-reveal className="mono text-[10.5px] uppercase tracking-[0.18em] text-paper/65">Application only · from {fmtINR(p.priceFrom)}</p>
            </div>
            <h1 data-reveal className="mt-8 max-w-[16ch] text-[clamp(2.4rem,6vw,4.6rem)] font-extralight leading-[1.02] tracking-[-0.03em] text-paper">
              {p.name}.
            </h1>
            <p data-reveal className="mt-6 max-w-2xl text-[clamp(1.05rem,1.6vw,1.4rem)] font-light leading-relaxed text-paper/85">
              {p.tagline}
            </p>
            <p data-reveal className="mt-4 max-w-2xl text-[15px] font-light leading-relaxed text-paper/70">{p.positioning}</p>
            <div data-reveal className="mt-9 flex flex-wrap items-center gap-5">
              <a href="#apply" className="btn btn--solid-dark">
                <span>Apply — start a conversation</span> <ArrowUpRight size={15} className="btn-arrow" />
              </a>
              <span className="mono text-[11px] uppercase tracking-[0.14em] text-paper/60">{p.horizon}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── the problem it answers — stat-anchored ── */}
      <section className="wrap pb-4 pt-16 md:pt-24">
        <Kicker>Why a long-term programme</Kicker>
        <SplitReveal className="h-lg mt-5 max-w-[20ch]">
          Some things aren't <span className="b">one decision</span>.
        </SplitReveal>
        <div className="mt-12 grid gap-px border-t border-line sm:grid-cols-3">
          {p.problems.map((pr) => (
            <div key={pr.label} data-reveal className="border-b border-line py-8 sm:pr-8">
              <p className="text-[clamp(2.2rem,4vw,3.2rem)] font-extralight tabular-nums tracking-tight">{pr.stat}</p>
              <p className="mt-3 max-w-[26ch] text-[14px] leading-relaxed text-ink-60">{pr.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 max-w-2xl space-y-4">
          {p.body.map((para) => (
            <p key={para} data-reveal className="text-[15.5px] font-light leading-relaxed text-ink-80">{para}</p>
          ))}
        </div>
      </section>

      {/* ── who it's for ── */}
      <section className="wrap py-16 md:py-20">
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">Who it's for</p>
            <h2 data-reveal className="mt-4 max-w-[14ch] text-[clamp(1.6rem,2.8vw,2.2rem)] font-extralight leading-[1.08] tracking-[-0.02em]">
              Built for a longer arc.
            </h2>
          </div>
          <ul data-reveal className="sm:columns-2 sm:gap-12">
            {p.forWhom.map((w) => (
              <li key={w} className="break-inside-avoid border-t border-line py-3.5 text-[14.5px] leading-relaxed text-ink-80 first:border-t-0">{w}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── the six pillars ── */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap py-16 md:py-24">
          <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">What we do together</p>
          <SplitReveal className="mt-4 max-w-[20ch] text-[clamp(1.9rem,3.6vw,2.8rem)] font-extralight leading-[1.05] tracking-[-0.02em]">
            Six areas, <span className="b">for years</span>.
          </SplitReveal>
          <div className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {p.pillars.map((pl, i) => (
              <div key={pl.title} data-reveal className="border-t border-line pt-5">
                <p className="mono text-[11px] tabular-nums text-ink-40">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-3 text-[16.5px] font-semibold tracking-tight">{pl.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-ink-60">{pl.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── what a bespoke roadmap can include ── */}
      <section className="wrap py-16 md:py-24">
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p data-reveal className="mono text-[11.5px] uppercase tracking-[0.18em] text-ink-40">A bespoke roadmap</p>
            <h2 data-reveal className="mt-4 max-w-[16ch] text-[clamp(1.6rem,2.8vw,2.2rem)] font-extralight leading-[1.08] tracking-[-0.02em]">
              Yours can include…
            </h2>
            <p data-reveal className="mt-5 max-w-sm text-[14px] font-light leading-relaxed text-ink-60">
              Every engagement is priced and shaped after we talk — {p.priceNote.toLowerCase()}.
            </p>
          </div>
          <ul data-reveal className="sm:columns-2 sm:gap-12">
            {p.canInclude.map((c) => (
              <li key={c} className="break-inside-avoid border-t border-line py-3 text-[14px] leading-relaxed text-ink-80 first:border-t-0">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── the application ── */}
      <ApplySection p={p} />

      {/* ── the other long-term programme ── */}
      {other && (
        <section className="hair-t">
          <div className="wrap flex flex-col items-start gap-5 py-14 md:flex-row md:items-center md:justify-between md:py-16">
            <div>
              <p className="mono text-[10.5px] uppercase tracking-[0.16em] text-ink-40">The other long-term programme</p>
              <p className="mt-3 text-[clamp(1.4rem,2.4vw,1.9rem)] font-extralight tracking-tight">
                <span className="b font-semibold">{other.name}</span> — {other.tagline.toLowerCase()}
              </p>
            </div>
            <Link to={`/programs/${other.slug}`} className="btn shrink-0"><span>See {other.name}</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
          </div>
        </section>
      )}
    </main>
  )
}

/* ── the custom application form — beyond name/email/phone: the situation, what
      they want from a long-term programme, and their timeline. Posts to
      /api/lead with everything composed into the message. ── */
type AppFields = { name: string; email: string; phone: string; stage: string; situation: string; wants: string; timeline: string; city: string }
const EMPTY: AppFields = { name: "", email: "", phone: "", stage: "", situation: "", wants: "", timeline: "", city: "" }

function ApplySection({ p }: { p: LongTermProgram }) {
  const [f, setF] = useState<AppFields>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (k: keyof AppFields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (f.name.trim().length < 2) { setErr("Please add your name."); return }
    if (!EMAIL_RE.test(f.email.trim())) { setErr("That email doesn't look complete."); return }
    if (f.phone.trim().length < 6) { setErr("Please add a phone number so we can reach you."); return }
    if (f.situation.trim().length < 10) { setErr("Tell us a little about the situation — a sentence or two is enough."); return }
    setErr(""); setBusy(true)
    const message = [
      `Long-term programme application: ${p.name} (${p.audience})`,
      `Stage: ${f.stage || "—"}`,
      `Timeline / when to start: ${f.timeline.trim() || "—"}`,
      "",
      `THE SITUATION:\n${f.situation.trim()}`,
      "",
      `WHAT THEY WANT FROM A LONG-TERM PROGRAMME:\n${f.wants.trim() || "—"}`,
    ].join("\n")
    try {
      const r = await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim(),
          audience: `${p.name} applicant · ${f.stage || p.audience}`,
          city: f.city.trim(), message, source: `${p.name} application`,
        }),
      })
      const d = await r.json().catch(() => ({}))
      if (!r.ok || d.ok === false) throw new Error(d.error || "That didn't go through — mind trying once more?")
      setDone(true)
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : "That didn't go through — mind trying once more?")
    }
    setBusy(false)
  }

  const field = "field-box rounded-[9px] text-[14.5px]"

  return (
    <section id="apply" className="hair-t bg-paper-pure scroll-mt-28">
      <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        {/* left — the pitch + trust signals */}
        <div className="flex flex-col justify-center">
          <Kicker>Apply for {p.name}</Kicker>
          <h2 data-reveal className="h-lg mt-5 max-w-[15ch]">
            It begins with a <span className="b">conversation</span>.
          </h2>
          <p data-reveal className="mt-6 max-w-md text-[15px] leading-relaxed text-ink-60">
            No checkout, no obligation. Tell us where you are and what you're hoping a long-term programme
            gives you; a senior counsellor reads it, then reaches out to talk it through and — if it's a fit —
            build a bespoke {p.horizon} roadmap and a custom proposal.
          </p>
          <div data-reveal className="mt-9 flex flex-col gap-3.5 border-t border-line pt-7 text-[13.5px]">
            <a href="tel:+919108510058" className="group inline-flex items-center gap-3 text-ink">
              <Phone size={16} className="text-ink-40" />
              <span className="ul font-medium">+91 91085 10058</span>
              <span className="text-[12px] text-ink-40">— call to ask anything</span>
            </a>
            <p className="inline-flex items-center gap-3 text-ink-60"><Time size={16} className="text-ink-40" />Mon–Sun, 9am–8pm IST</p>
            <a href="mailto:info@setmycareer.com" className="ul inline-flex items-center gap-1.5 self-start text-[13px] text-ink-60">
              info@setmycareer.com <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        {/* right — the custom form */}
        <div className="flex flex-col justify-center">
          {done ? (
            <div data-reveal className="flex h-full flex-col justify-center rounded-[14px] border border-line bg-paper p-8 md:p-10">
              <p className="ed-title-xl text-[clamp(1.5rem,2.4vw,2rem)]">Thank you, {f.name.trim().split(/\s+/)[0] || "there"}.</p>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-60">
                Your application for {p.name} is with our senior desk. A counsellor will reach out within a working
                day to set up your discovery conversation — no pitch, just a real discussion about the years ahead.
              </p>
              <p className="mt-5 text-[13.5px] text-ink-60">
                While you wait, the free <Link to="/cri" className="ul font-medium text-ink">Career Clarity Index</Link> gives them a head start.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} data-reveal className="rounded-[14px] border border-line bg-paper p-6 md:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <input value={f.name} onChange={set("name")} placeholder="Full name" required aria-label="Full name" autoComplete="name" className={`${field} sm:col-span-2`} />
                <input value={f.email} onChange={set("email")} type="email" placeholder="Email" required aria-label="Email" autoComplete="email" className={field} />
                <input value={f.phone} onChange={set("phone")} placeholder="Phone" required aria-label="Phone" autoComplete="tel" inputMode="tel" className={field} />
                <select value={f.stage} onChange={set("stage")} aria-label="Where you are" className={`${field} cursor-pointer sm:col-span-2 ${f.stage ? "" : "text-ink-40"}`}>
                  <option value="" disabled>Where you are right now…</option>
                  {STAGE_OPTIONS[p.audience].map((s) => <option key={s} value={s} className="text-ink">{s}</option>)}
                </select>
                <label className="sm:col-span-2 block">
                  <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-ink-40">The situation</span>
                  <textarea value={f.situation} onChange={set("situation")} rows={4} required aria-label="The situation"
                    placeholder="What you're navigating, and why a single session won't settle it. A few honest sentences."
                    className={`${field} mt-2 w-full resize-none`} />
                </label>
                <label className="sm:col-span-2 block">
                  <span className="mono text-[10.5px] uppercase tracking-[0.14em] text-ink-40">What you want from a long-term programme</span>
                  <textarea value={f.wants} onChange={set("wants")} rows={3} aria-label="What you want"
                    placeholder="The outcome you're really after over the next few years — where you'd love to be."
                    className={`${field} mt-2 w-full resize-none`} />
                </label>
                <input value={f.timeline} onChange={set("timeline")} placeholder="Timeline — when would you like to begin?" aria-label="Timeline" className={field} />
                <input value={f.city} onChange={set("city")} placeholder="City (optional)" aria-label="City" autoComplete="address-level2" className={field} />
              </div>
              {err && <p className="mt-3 text-[12.5px] text-red-600">{err}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="submit" disabled={busy} className="btn btn--solid disabled:opacity-60">
                  <span>{busy ? "Sending…" : `Apply for ${p.name}`}</span> <ArrowRight size={15} className="btn-arrow" />
                </button>
                <p className="text-[11.5px] leading-relaxed text-ink-40">A reply within a working day. Per our <Link to="/legal/privacy-policy" className="ul">Privacy Policy</Link>.</p>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
