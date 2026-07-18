import { useState, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowUpRight, ArrowLeft, CheckmarkFilled, Checkmark, Add, Close, DocumentAdd, DocumentPdf, Image } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"
import { submitExpertApplication, COUNSELLOR_URL, PORTAL_URL, type ExpertApplication } from "@/lib/api"
import {
  EMPLOYMENT_TYPES, QUALIFICATIONS, FUNCTIONAL_EXPERTISE, INDUSTRY_EXPOSURE,
  TARGET_AUDIENCE, SERVICES_OFFERED, SESSION_FORMATS, DAY_BANDS, TIME_SLOTS,
  DOCUMENTS_REQUIRED, ONBOARDING_STEPS, KEY_TERMS, CONSENT_ITEMS, WHY_JOIN,
} from "@/content/expert-onboarding"

const inputCls = "field-box"

// The dedicated domain-expert onboarding page. It implements the Master Expert
// Onboarding Agreement (sections A–I + consent) as one editorial application.
// On submit only the account (name/email/password) is written to the live
// server; the rest is captured and carried into the counsellor workspace, where
// documents and the signature complete. One solid CTA, monochrome, no boxes but
// where a form needs them — hairlines and type carry the structure.
export function ExpertApply() {
  const ref = useReveals()
  useSeo({
    title: "Become a domain expert — SetMyCareer",
    description: "Apply to offer paid 45-minute expert sessions on the SetMyCareer network. Senior practitioners share their functional expertise — clients are matched to you by field. Reviewed by our team before you go live.",
    path: "/experts/apply",
  })

  const [f, setF] = useState<ExpertApplication>({
    name: "", email: "", password: "", mobile: "", whatsapp: "", city: "", state: "", country: "India", linkedin: "",
    designation: "", organization: "", employmentType: "", totalExperience: "", coachingExperience: "",
    qualification: "", certifications: "", languages: "",
    expertise: [], industries: [], audience: [], services: [], formats: [], days: [], slots: [],
    bio: "", consent: [false, false, false, false],
  })
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle")
  const [tried, setTried] = useState(false)
  // supporting documents & links — held here, merged into the application on submit
  const [links, setLinks] = useState<{ url: string; note: string }[]>([])
  const [files, setFiles] = useState<{ file: File; note: string }[]>([])
  const set = <K extends keyof ExpertApplication>(k: K, v: ExpertApplication[K]) => setF((p) => ({ ...p, [k]: v }))

  const words = (f.bio ?? "").trim().split(/\s+/).filter(Boolean).length
  const allConsent = f.consent.every(Boolean)
  const missing: string[] = []
  if (f.name.trim().length < 3) missing.push("Full name")
  if (!/.+@.+\..+/.test(f.email)) missing.push("A valid email")
  if (f.password.length < 6) missing.push("A password (min 6 characters)")
  if (f.expertise.length < 1) missing.push("At least one area of expertise")
  if (!allConsent) missing.push("All four agreements below")
  const ok = missing.length === 0

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (!ok || state === "busy") return
    setState("busy")
    try {
      await submitExpertApplication({
        ...f,
        docLinks: links.filter((l) => l.url.trim()).map((l) => ({ url: l.url.trim(), note: l.note.trim() })),
        docFiles: files.map((x) => ({ name: x.file.name, size: x.file.size, note: x.note.trim() })),
      })
      setState("done")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch {
      setState("error")
    }
  }

  return (
    <main ref={ref} className="pt-28">
      {/* breadcrumb */}
      <div className="wrap pt-6">
        <Link to="/experts" className="ul inline-flex items-center gap-1.5 text-[12.5px] text-ink-60"><ArrowLeft size={14} /> The network</Link>
      </div>

      {state === "done" ? (
        <DoneState name={f.name} email={f.email} expertise={f.expertise} />
      ) : (
        <>
          {/* hero */}
          <section className="wrap pb-10 pt-6 md:pt-10">
            <Kicker>Join as a domain expert</Kicker>
            <SplitReveal as="h1" className="display mt-5 max-w-[15ch]">Bring your <span className="b">judgement</span>. We bring the reach.</SplitReveal>
            <p data-reveal className="lead mt-7 max-w-xl text-ink-60">Apply to offer 45-minute expert sessions to students and professionals in your field. One application — we create your account and put it in front of our team; once approved, clients are matched to you by expertise.</p>
            <div data-reveal className="mt-8 flex flex-wrap items-center gap-5">
              <a href="#apply-form" className="btn btn--solid"><span>Start the application</span> <ArrowUpRight size={15} className="btn-arrow" /></a>
              <a href={COUNSELLOR_URL} className="ul text-[13px] text-ink-60">Already a counsellor? Sign in →</a>
            </div>
            <div className="mt-14 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {WHY_JOIN.map((w, i) => (
                <div key={w.title} data-reveal className="grid grid-cols-[auto_1fr] gap-4 border-t border-line pt-5">
                  <span className="mono text-[11px] tabular-nums text-ink-40">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="text-[15.5px] font-medium tracking-tight">{w.title}</h3>
                    <p className="mt-1.5 max-w-md text-[13.5px] leading-relaxed text-ink-60">{w.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* the four steps */}
          <section className="hair-t bg-paper-pure">
            <div className="wrap py-12 md:py-14">
              <p className="kicker text-ink-40">How it goes</p>
              <ol className="mt-6 grid gap-px border border-line bg-line md:grid-cols-4">
                {ONBOARDING_STEPS.map((s, i) => (
                  <li key={s.t} className="bg-paper-pure p-5">
                    <span className="mono text-[11px] tabular-nums text-ink-40">{String(i + 1).padStart(2, "0")}</span>
                    <h3 className="mt-2 text-[14px] font-medium tracking-tight">{s.t}</h3>
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-60">{s.d}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          {/* the application */}
          <form id="apply-form" onSubmit={submit} className="wrap scroll-mt-24 pb-8">
            <Section n="01" title="Your account" hint="This creates your expert account the moment you submit. You'll sign in to the workspace with it while our team reviews your application.">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Full name" wide>
                  <input value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="As it should appear on the roster" className={inputCls} autoComplete="name" />
                </Field>
                <Field label="Professional email">
                  <input value={f.email} onChange={(e) => set("email", e.target.value)} type="email" placeholder="you@work.com" className={inputCls} autoComplete="email" />
                </Field>
                <Field label="Create a password (min 6)">
                  <input value={f.password} onChange={(e) => set("password", e.target.value)} type="password" placeholder="You'll sign in with this" className={inputCls} autoComplete="new-password" />
                </Field>
              </div>
            </Section>

            <Section n="02" title="Personal details" optional hint="Where you're based and how the team reaches you. Not shown publicly.">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Mobile number"><input value={f.mobile} onChange={(e) => set("mobile", e.target.value)} type="tel" placeholder="+91…" className={inputCls} autoComplete="tel" /></Field>
                <Field label="WhatsApp number"><input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} type="tel" placeholder="If different" className={inputCls} /></Field>
                <Field label="City"><input value={f.city} onChange={(e) => set("city", e.target.value)} className={inputCls} autoComplete="address-level2" /></Field>
                <Field label="State"><input value={f.state} onChange={(e) => set("state", e.target.value)} className={inputCls} autoComplete="address-level1" /></Field>
                <Field label="Country"><input value={f.country} onChange={(e) => set("country", e.target.value)} className={inputCls} autoComplete="country-name" /></Field>
                <Field label="LinkedIn profile"><input value={f.linkedin} onChange={(e) => set("linkedin", e.target.value)} type="url" placeholder="linkedin.com/in/…" className={inputCls} /></Field>
              </div>
            </Section>

            <Section n="03" title="Professional profile" optional hint="Your standing today. You can refine any of this later in the workspace.">
              <div className="grid gap-x-6 gap-y-5 sm:grid-cols-2">
                <Field label="Current designation"><input value={f.designation} onChange={(e) => set("designation", e.target.value)} placeholder="e.g. VP, Product" className={inputCls} /></Field>
                <Field label="Organization / business"><input value={f.organization} onChange={(e) => set("organization", e.target.value)} className={inputCls} /></Field>
                <Field label="Employment type">
                  <select value={f.employmentType} onChange={(e) => set("employmentType", e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Highest qualification">
                  <select value={f.qualification} onChange={(e) => set("qualification", e.target.value)} className={inputCls}>
                    <option value="">Select…</option>
                    {QUALIFICATIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Total work experience"><input value={f.totalExperience} onChange={(e) => set("totalExperience", e.target.value)} placeholder="e.g. 14 years" className={inputCls} /></Field>
                <Field label="Coaching / mentoring experience"><input value={f.coachingExperience} onChange={(e) => set("coachingExperience", e.target.value)} placeholder="e.g. 5 years" className={inputCls} /></Field>
                <Field label="Certifications & memberships" wide><input value={f.certifications} onChange={(e) => set("certifications", e.target.value)} placeholder="ICF PCC, NCDA, professional bodies…" className={inputCls} /></Field>
                <Field label="Languages known" wide><input value={f.languages} onChange={(e) => set("languages", e.target.value)} placeholder="English, Hindi, Kannada…" className={inputCls} /></Field>
              </div>
            </Section>

            <Section n="04" title="Functional expertise" hint="Where you can genuinely guide someone. Choose up to five." count={`${f.expertise.length} / 5`}>
              <Chips options={FUNCTIONAL_EXPERTISE} value={f.expertise} onChange={(v) => set("expertise", v)} max={5} />
              {tried && f.expertise.length < 1 && <p className="mt-3 text-[12.5px] text-ink-80">Pick at least one — it's how students are matched to you.</p>}
            </Section>

            <Section n="05" title="Industry exposure" optional hint="The sectors you know from the inside. Up to five." count={`${f.industries.length} / 5`}>
              <Chips options={INDUSTRY_EXPOSURE} value={f.industries} onChange={(v) => set("industries", v)} max={5} />
            </Section>

            <Section n="06" title="Who you help" optional hint="The people you're best placed to guide.">
              <Chips options={TARGET_AUDIENCE} value={f.audience} onChange={(v) => set("audience", v)} />
            </Section>

            <Section n="07" title="Services you offer" optional hint="What a session or engagement with you looks like.">
              <Chips options={SERVICES_OFFERED} value={f.services} onChange={(v) => set("services", v)} />
            </Section>

            <Section n="08" title="Availability" optional hint="How you like to work, and roughly when. You'll set exact slots on your calendar in the workspace.">
              <div className="space-y-6">
                <div><p className="field-label">Formats</p><Chips options={SESSION_FORMATS} value={f.formats} onChange={(v) => set("formats", v)} /></div>
                <div><p className="field-label">Preferred days</p><Chips options={DAY_BANDS} value={f.days} onChange={(v) => set("days", v)} /></div>
                <div><p className="field-label">Preferred time</p><Chips options={TIME_SLOTS} value={f.slots} onChange={(v) => set("slots", v)} /></div>
              </div>
            </Section>

            <Section n="09" title="Professional bio" optional hint="Up to 250 words, in your own voice — the students reading your profile want the person, not the résumé." count={`${words} / 250 words`}>
              <textarea
                value={f.bio}
                onChange={(e) => { const t = e.target.value; if (t.trim().split(/\s+/).filter(Boolean).length <= 250 || t.length < (f.bio ?? "").length) set("bio", t) }}
                rows={6} placeholder="What you do, who you've helped, and why careers are worth doing well…"
                className="field-box resize-y leading-relaxed"
              />
            </Section>

            <Section n="10" title="Supporting documents & links" optional count={`${files.length + links.filter((l) => l.url.trim()).length} added`} hint="Attach your CV, portfolio, certificates or references, or paste links — with a note on each, so the reviewer knows what they're looking at. Keep sensitive KYC (PAN, Aadhaar, bank details) for the secure workspace after approval.">
              <DocsField links={links} setLinks={setLinks} files={files} setFiles={setFiles} />
              <p className="mt-6 border-t border-line-faint pt-4 text-[12px] leading-relaxed text-ink-40">
                Completed securely in your workspace after approval: {DOCUMENTS_REQUIRED.map((d) => d.label).join(" · ")}.
              </p>
            </Section>

            {/* agreement + consent */}
            <Section n="11" title="Agreement & consent" hint="The material terms of the Expert, Mentor & Coach Onboarding Agreement. The full agreement is signed in the workspace; these four confirmations are required to apply.">
              <ul className="mb-8 space-y-2">
                {KEY_TERMS.map((t) => (
                  <li key={t} className="flex items-baseline gap-3 text-[13px] leading-relaxed text-ink-80"><span className="mono text-[10px] text-ink-40">—</span>{t}</li>
                ))}
              </ul>
              <div className="space-y-3 border-t border-line pt-6">
                {CONSENT_ITEMS.map((c, i) => (
                  <label key={i} className="flex cursor-pointer items-start gap-3 text-[13.5px] leading-relaxed text-ink-80">
                    <input type="checkbox" checked={f.consent[i]} onChange={(e) => set("consent", f.consent.map((v, j) => (j === i ? e.target.checked : v)))} className="mt-1 size-4 shrink-0 accent-ink" />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            </Section>

            {/* submit */}
            <div className="grid gap-6 border-t border-ink py-10 md:grid-cols-[3rem_1fr] md:gap-8">
              <span className="mono text-[11px] tabular-nums text-ink-40 md:pt-2" aria-hidden>→</span>
              <div>
                {tried && !ok && (
                  <div className="mb-5 border border-line bg-paper-pure p-4">
                    <p className="kicker text-ink-40">Before you submit</p>
                    <ul className="mt-2 space-y-1">
                      {missing.map((m) => <li key={m} className="text-[13px] text-ink-80">— {m}</li>)}
                    </ul>
                  </div>
                )}
                {state === "error" && (
                  <p className="mb-5 text-[13px] leading-relaxed text-ink-80">The server didn't accept that just now — an account with this email may already exist. Try a different email, or <a href={COUNSELLOR_URL} className="ul font-medium">sign in</a> if you've applied before.</p>
                )}
                {/* set expectation: this is an application, gated by admin review */}
                <div className="mb-6 border border-line bg-paper-pure p-4">
                  <p className="text-[13px] font-medium text-ink-80">Reviewed before you go live</p>
                  <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-ink-60">Every application is reviewed and approved by our team — usually within a couple of working days. You can sign in to the workspace to prepare your profile in the meantime; it joins the public network once approved.</p>
                </div>
                <button type="submit" disabled={state === "busy" || (tried && !ok)} className="btn btn--solid disabled:opacity-40">
                  <span>{state === "busy" ? "Submitting your application…" : "Submit application for review"}</span>
                  <ArrowUpRight size={15} className="btn-arrow" />
                </button>
                <p className="mono mt-4 text-[10px] uppercase tracking-[0.12em] text-ink-40">Reviewed by our team · no fee to apply · your details are private</p>
              </div>
            </div>
          </form>
        </>
      )}
    </main>
  )
}

/* ── a numbered application section: number rail + header + fields ── */
function Section({ n, title, hint, optional, count, children }: {
  n: string; title: string; hint?: string; optional?: boolean; count?: string; children: ReactNode
}) {
  return (
    <section className="grid gap-3 border-t border-line py-9 md:grid-cols-[2.5rem_1fr] md:gap-8 md:py-11">
      <span className="mono text-[12px] font-medium tabular-nums text-ink-60 md:pt-1">{n}</span>
      <div>
        <div data-reveal className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h2 className="text-[19px] font-semibold tracking-tight text-ink md:text-[21px]">
            {title}
            {optional && <span className="ml-2 align-middle text-[11px] font-medium text-ink-40">Optional</span>}
          </h2>
          {count && <span className="mono text-[11.5px] font-medium tabular-nums text-ink-60">{count}</span>}
        </div>
        {hint && <p data-reveal className="mt-2 max-w-[58ch] text-[13.5px] leading-relaxed text-ink-60">{hint}</p>}
        <div className="mt-6">{children}</div>
      </div>
    </section>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return (
    <label className={`block ${wide ? "sm:col-span-2" : ""}`}>
      <span className="field-label">{label}</span>
      {children}
    </label>
  )
}

/* ── supporting documents & links ── */
const DOC_MAX = 5, DOC_MB = 10
const DOC_OK_TYPES = ["application/pdf", "image/jpeg"]
const DOC_OK_EXT = /\.(pdf|jpe?g)$/i
const humanSize = (b: number) => (b < 1048576 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1048576).toFixed(1)} MB`)
const fieldLine = "w-full border-b border-line bg-transparent py-1.5 text-[13.5px] text-ink outline-none placeholder:text-ink-40 focus:border-ink"

function DocsField({ links, setLinks, files, setFiles }: {
  links: { url: string; note: string }[]; setLinks: (v: { url: string; note: string }[]) => void
  files: { file: File; note: string }[]; setFiles: (v: { file: File; note: string }[]) => void
}) {
  const [err, setErr] = useState("")
  const [drag, setDrag] = useState(false)

  const addFiles = (list: FileList | null) => {
    if (!list) return
    const errs: string[] = []
    const next = [...files]
    for (const file of Array.from(list)) {
      if (next.length >= DOC_MAX) { errs.push(`Up to ${DOC_MAX} files.`); break }
      if (!(DOC_OK_TYPES.includes(file.type) || DOC_OK_EXT.test(file.name))) { errs.push(`“${file.name}” — PDF or JPEG only.`); continue }
      if (file.size > DOC_MB * 1048576) { errs.push(`“${file.name}” — over ${DOC_MB} MB.`); continue }
      if (next.some((x) => x.file.name === file.name && x.file.size === file.size)) continue
      next.push({ file, note: "" })
    }
    setFiles(next); setErr(errs.join(" "))
  }

  const validLinks = links.filter((l) => l.url.trim()).length

  return (
    <div className="space-y-8">
      {/* files */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="field-label !mb-0">Files</p>
          <span className="mono text-[11px] tabular-nums text-ink-40">{files.length} / {DOC_MAX} · PDF or JPEG · ≤{DOC_MB} MB each</span>
        </div>
        <label
          onDragOver={(e) => { e.preventDefault(); if (files.length < DOC_MAX) setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files) }}
          className={`mt-3 flex flex-col items-center justify-center gap-1.5 border border-dashed px-6 py-8 text-center transition-colors ${files.length >= DOC_MAX ? "pointer-events-none opacity-40" : "cursor-pointer"} ${drag ? "border-ink bg-paper-pure" : "border-ink-20 hover:border-ink-40"}`}
        >
          <DocumentAdd size={22} className="text-ink-40" />
          <span className="text-[13.5px] font-medium text-ink-80">Drop files here, or <span className="ul">browse</span></span>
          <span className="text-[12px] text-ink-40">PDF or JPEG · up to {DOC_MB} MB each · {DOC_MAX} max</span>
          <input type="file" accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = "" }} />
        </label>
        {err && <p className="mt-2 text-[12.5px] text-ink-80">{err}</p>}
        {files.length > 0 && (
          <ul className="mt-3 space-y-2">
            {files.map((x, i) => (
              <li key={`${x.file.name}-${i}`} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border border-line bg-paper-pure p-3">
                <span className="grid size-9 shrink-0 place-items-center bg-ink/[0.04] text-ink-60">{/\.pdf$/i.test(x.file.name) ? <DocumentPdf size={18} /> : <Image size={18} />}</span>
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[13.5px] font-medium text-ink-80">{x.file.name}</span>
                    <span className="mono shrink-0 text-[11px] text-ink-40">{humanSize(x.file.size)}</span>
                  </div>
                  <input value={x.note} onChange={(e) => setFiles(files.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)))} placeholder="Add a note — e.g. “Latest CV”" className="mt-1 text-[13px] leading-none border-b border-line bg-transparent py-1 outline-none placeholder:text-ink-40 focus:border-ink w-full" />
                </div>
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} aria-label={`Remove ${x.file.name}`} className="grid size-7 shrink-0 place-items-center text-ink-40 transition-colors hover:text-ink"><Close size={16} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* links */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="field-label !mb-0">Links</p>
          <span className="mono text-[11px] tabular-nums text-ink-40">{validLinks} / {DOC_MAX}</span>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-ink-60">CV, portfolio, LinkedIn or certificate links — the reviewer can open these right away.</p>
        {links.length > 0 && (
          <ul className="mt-3 space-y-2">
            {links.map((l, i) => (
              <li key={i} className="grid grid-cols-[1fr_auto] items-center gap-3 border border-line bg-paper-pure p-3 sm:grid-cols-[1.3fr_1fr_auto]">
                <input value={l.url} onChange={(e) => setLinks(links.map((y, j) => (j === i ? { ...y, url: e.target.value } : y)))} type="url" placeholder="https://…" className={fieldLine} />
                <input value={l.note} onChange={(e) => setLinks(links.map((y, j) => (j === i ? { ...y, note: e.target.value } : y)))} placeholder="Add a note" className={`${fieldLine} !text-[13px]`} />
                <button type="button" onClick={() => setLinks(links.filter((_, j) => j !== i))} aria-label="Remove link" className="col-start-2 row-start-1 grid size-7 shrink-0 place-items-center justify-self-end text-ink-40 transition-colors hover:text-ink sm:col-start-3"><Close size={16} /></button>
              </li>
            ))}
          </ul>
        )}
        {links.length < DOC_MAX && (
          <button type="button" onClick={() => setLinks([...links, { url: "", note: "" }])} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-80 transition-colors hover:text-ink"><Add size={16} /> Add a link</button>
        )}
      </div>

      <p className="text-[12px] leading-relaxed text-ink-40">Links are submitted with your application. Files are attached to your application and uploaded securely once you complete your profile in the workspace.</p>
    </div>
  )
}

/* multi-select chips, uniform B/W, with an optional cap (Fitts: 32px+ targets) */
function Chips({ options, value, onChange, max }: {
  options: readonly string[]; value: string[]; onChange: (v: string[]) => void; max?: number
}) {
  const full = max ? value.length >= max : false
  const toggle = (o: string) => {
    if (value.includes(o)) onChange(value.filter((x) => x !== o))
    else if (!full) onChange([...value, o])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value.includes(o)
        return (
          <button
            type="button" key={o} onClick={() => toggle(o)} aria-pressed={on} disabled={!on && full}
            className={`inline-flex items-center gap-1.5 border px-3 py-1.5 text-[12.5px] transition-colors ${
              on ? "border-ink bg-ink text-paper"
                 : full ? "cursor-not-allowed border-line text-ink-40"
                 : "border-line text-ink-80 hover:border-ink"}`}
          >
            {on && <Checkmark size={12} />}{o}
          </button>
        )
      })}
    </div>
  )
}

/* ── the confirmation: account is live, hand off to the workspace ── */
function DoneState({ name, email, expertise }: { name: string; email: string; expertise: string[] }) {
  const first = name.trim().split(" ")[0] || "there"
  return (
    <section className="wrap py-14 md:py-20">
      <div className="max-w-2xl">
        <span className="inline-flex items-center gap-2 text-ink"><CheckmarkFilled size={20} /> <span className="kicker text-ink-40">Application received — pending review</span></span>
        <SplitReveal as="h1" className="display mt-5 max-w-[16ch]">Thank you, <span className="b">{first}</span>.</SplitReveal>
        <p className="lead mt-6 max-w-xl text-ink-60">Your application is in, under <span className="text-ink-80">{email}</span>. Our team reviews every application and approves your profile before it goes live on the network — we'll be in touch by email. In the meantime you can sign in to the workspace to complete your profile.</p>

        <div className="mt-10 border-t border-line pt-8">
          <p className="kicker text-ink-40">What happens next</p>
          <ol className="mt-5 space-y-4">
            {[
              ["We review your application", "Usually within a couple of working days. We'll email you at the address above."],
              ["Complete your profile", "Sign in to the workspace with the email and password you just set — add anything you skipped and upload your documents (resume, photo, qualification proof, PAN, Aadhaar, bank details, GST if applicable)."],
              ["Approved & live", "Once our team approves you, your profile joins the roster here and in the client portal."],
            ].map(([t, d], i) => (
              <li key={t} className="grid grid-cols-[auto_1fr] gap-4">
                <span className="mono text-[11px] tabular-nums text-ink-40">{String(i + 1).padStart(2, "0")}</span>
                <div><h3 className="text-[15px] font-medium tracking-tight">{t}</h3><p className="mt-1 text-[13.5px] leading-relaxed text-ink-60">{d}</p></div>
              </li>
            ))}
          </ol>
        </div>

        {expertise.length > 0 && (
          <div className="mt-8">
            <p className="kicker text-ink-40">You'll guide on</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {expertise.map((x) => <span key={x} className="border border-line px-3 py-1.5 text-[12.5px] text-ink-80">{x}</span>)}
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center gap-5">
          <a href={COUNSELLOR_URL} className="btn btn--solid"><span>Open the counsellor workspace</span> <ArrowUpRight size={15} className="btn-arrow" /></a>
          <Link to="/experts" className="ul text-[13px] text-ink-60">Back to the network</Link>
        </div>
        <p className="mono mt-8 text-[10px] uppercase tracking-[0.12em] text-ink-40">Not a counsellor? The student portal is <a href={PORTAL_URL} className="ul">over here</a>.</p>
      </div>
    </section>
  )
}
