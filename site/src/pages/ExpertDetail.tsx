import { useMemo } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, ArrowUpRight, ArrowRight } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { useReveals } from "@/lib/motion"
import { useSeo, SITE_URL } from "@/lib/seo"
import {
  useNavigator, naviImage, naviExpertise, naviYears, naviTags, naviServices,
  naviLanguages, naviMode, cleanField as clean, type Navigator,
} from "@/lib/api"
import { avatar } from "@/lib/images"
import { IA_CONTENT } from "@/content/ia"
import { COPY } from "@/content/site"

// A dedicated, editorial landing page for EVERY counsellor on file (and every
// future onboard) — data-driven from the live roster, so it needs no per-person
// authoring. Structured like a considered product page: a portrait-led hero,
// a spec strip, the record, the ways to work together (the offerings ladder),
// and a cross-sell of other counsellors. E-commerce tactics used honestly:
// clear repeated CTA (Fitts/Von Restorff), specs, credentials as social proof,
// price anchoring (free next to paid), and "you may also consider".
//
// PRIVACY: renders ONLY public-safe fields. Email, phone, meeting links, the
// address and calendar ids are never shown.

const TIERS = IA_CONTENT.pricing.tiers
const tierLink = (name: string) => (name.toLowerCase().includes("clarity") ? "/cri" : name.toLowerCase().includes("full") ? "/book" : "/pricing")
const tierCta = (name: string) => (name.toLowerCase().includes("clarity") ? "Start free" : name.toLowerCase().includes("full") ? "Talk to us" : "See what's included")

// a warm first name for CTAs — skip leading initials ("K.") and honorifics
// ("Dr.", "Prof.") so "K. Shanthi" → "Shanthi", "Dr. N. Rathi" → "Rathi"
const HONORIFICS = new Set(["dr", "mr", "mrs", "ms", "prof", "shri", "smt"])
const firstNameOf = (full: string) => {
  const parts = full.trim().split(/\s+/).filter(Boolean)
  for (const p of parts) {
    const bare = p.replace(/\./g, "").toLowerCase()
    if (bare.length <= 1 || HONORIFICS.has(bare)) continue
    return p.replace(/\.$/, "")
  }
  return parts[0]?.replace(/\.$/, "") ?? full
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div data-reveal className="border-t border-line py-5">
      <span className="kicker text-ink-40">{label}</span>
      <p className="mt-2 max-w-[60ch] text-[14.5px] leading-relaxed text-ink-80">{value}</p>
    </div>
  )
}

function MiniCard({ n }: { n: Navigator }) {
  const img = naviImage(n) ?? avatar(String(n.id))
  return (
    <Link to={`/experts/${n.id}`} className="group block">
      <div className="aspect-[3/4] overflow-hidden bg-ink-20">
        <img src={img} alt={clean(n.name) ?? "Counsellor"} loading="lazy"
          onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (t.dataset.fb) return; t.dataset.fb = "1"; t.src = avatar(String(n.id)) }}
          className="size-full object-cover bw transition-transform duration-700 group-hover:scale-[1.04]" />
      </div>
      <p className="mt-2.5 text-[13px] font-medium tracking-tight">{clean(n.name)}</p>
      <p className="mono mt-0.5 text-[9.5px] uppercase tracking-[0.1em] text-ink-40">{naviExpertise(n) ?? "Career Counsellor"}</p>
    </Link>
  )
}

export function ExpertDetail() {
  const { id } = useParams()
  const { navigator: n, active, loading } = useNavigator(id)
  // re-run the reveal wiring once the fetch resolves — the loading render returns
  // a skeleton <main> without this ref, so without a dep the [data-reveal] content
  // would never get its ScrollTriggers and stay invisible ("empty sections").
  const ref = useReveals([loading, n?.id])

  // derived, all guarded for missing data
  const name = clean(n?.name) ?? "Counsellor"
  const first = firstNameOf(name)
  const img = n ? (naviImage(n) ?? avatar(String(n.id))) : ""
  const expertise = n ? (naviExpertise(n) ?? "Career Counsellor") : "Career Counsellor"
  const yrs = n ? naviYears(n) : undefined
  const loc = clean(n?.location)
  const langs = n ? naviLanguages(n) : undefined
  const mode = n ? naviMode(n) : undefined
  const education = clean(n?.education)
  const certifications = clean(n?.certifications)
  const achievements = clean(n?.achievments)
  const org = clean(n?.organzation_working_for)
  // a real bio only — a short "13 Years of Experience" string is captured in the
  // spec strip, not paraded as a lead paragraph
  const rawBio = clean(n?.about_navigator) ?? clean(n?.work_Experience)
  const bio = rawBio && rawBio.replace(/\s+/g, " ").trim().length > 40 ? rawBio : undefined
  const tags = n ? naviTags(n) : []
  const services = n ? naviServices(n) : []
  const focus = clean(n?.topic_Study)
  const placed = loc && !/^online$/i.test(loc)
  const lead = bio ? bio.split(/(?<=[.!?])\s/)[0] : `A certified career counsellor on the SetMyCareer network${placed ? `, based in ${loc}` : ", available online"}.`

  // the record. When the free-text credential fields are blank (a fifth of the
  // roster), fall back to an honest experience line built from fields that ARE
  // on file (years, services, practice) so the section is never an empty shell.
  const hasCreds = !!(education || certifications || achievements)
  const recordLine = !hasCreds
    ? [
        yrs ? `${yrs}+ years counselling careers` : "Counsels careers",
        services.length ? `across ${services.slice(0, 3).map((s) => s.toLowerCase()).join(", ")}` : "",
        org ? `— most recently with ${org}` : "",
      ].filter(Boolean).join(" ").replace(/\s+—/, " —") + "."
    : undefined
  // an always-present framing line for "what they work on" — derived from the
  // services (100% covered) so the section reads as prose, not a bare chip cloud
  const worksLead = services.length
    ? `${first} works with students and professionals across ${services.slice(0, 3).map((s) => s.toLowerCase()).join(", ")}${services.length > 3 ? ", and more" : ""}.`
    : `${first} works with students and professionals on career direction — and the decisions around it.`

  const recommended = useMemo(() => {
    if (!n) return []
    const mine = new Set(naviServices(n).map((s) => s.toLowerCase()))
    return active
      .filter((x) => String(x.id) !== String(n.id))
      .map((x) => {
        const shared = naviServices(x).filter((s) => mine.has(s.toLowerCase())).length
        const sameCity = loc && clean(x.location) === loc ? 1 : 0
        return { x, score: shared * 2 + sameCity }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => s.x)
  }, [n, active, loc])

  useSeo({
    title: n ? `${name} — Career Counsellor · SetMyCareer` : "Counsellor — SetMyCareer",
    description: n
      ? `${name}${yrs ? `, ${yrs} years' experience` : ""}${loc ? ` in ${loc}` : ""} — ${expertise.toLowerCase()}. Take the free index to get matched, or explore SetMyCareer's network of certified career counsellors.`
      : "A certified career counsellor on the SetMyCareer network.",
    path: `/experts/${id ?? ""}`,
    jsonLd: n
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          name,
          jobTitle: "Career Counsellor",
          image: img,
          description: bio ?? lead,
          worksFor: { "@type": "Organization", name: "SetMyCareer", url: "https://setmycareer.com" },
          ...(loc ? { address: { "@type": "PostalAddress", addressLocality: loc, addressCountry: "IN" } } : {}),
          ...(tags.length ? { knowsAbout: tags } : {}),
          ...(langs ? { knowsLanguage: langs.split(",").map((s) => s.trim()).filter(Boolean) } : {}),
          ...(education ? { alumniOf: education } : {}),
          url: `${SITE_URL}/experts/${id}`,
        }
      : null,
  })

  if (loading) return (
    <main className="wrap pt-28">
      <div className="mt-6 grid animate-pulse gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
        <div className="aspect-[4/5] bg-ink-20" />
        <div className="flex flex-col justify-center gap-4">
          <div className="h-3 w-40 bg-ink-20" />
          <div className="h-12 w-3/4 bg-ink-20" />
          <div className="h-4 w-full max-w-md bg-ink-20" />
          <div className="h-10 w-48 bg-ink-20" />
        </div>
      </div>
    </main>
  )

  if (!n) return (
    <main className="wrap flex min-h-[70vh] flex-col items-center justify-center py-28 text-center">
      <Kicker>Not found</Kicker>
      <h1 className="h-xl mt-4 max-w-[16ch]">That counsellor isn't on the roster.</h1>
      <p className="mt-4 max-w-md text-ink-60">The link may be old, or the profile is no longer live. Meet the counsellors who are.</p>
      <Link to="/experts" className="btn btn--solid mt-8"><span>See the network</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
    </main>
  )

  const facts = [
    yrs && { label: "Experience", value: `${yrs} years` },
    loc && { label: "Location", value: loc },
    langs && { label: "Languages", value: langs },
    mode && { label: "Sessions", value: mode },
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <main ref={ref} className="pt-28">
      {/* hero */}
      <section className="wrap">
        <Link to="/experts" className="inline-flex items-center gap-1.5 text-[12px] text-ink-40 transition-colors hover:text-ink"><ArrowLeft size={14} /> The network</Link>
        <div className="mt-6 grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-14">
          <div className="aspect-[4/5] overflow-hidden bg-ink-20">
            <img src={img} alt={name} onError={(e) => { const t = e.currentTarget as HTMLImageElement; if (t.dataset.fb) return; t.dataset.fb = "1"; t.src = avatar(String(n.id)) }} className="size-full object-cover bw" />
          </div>
          <div className="flex flex-col justify-center">
            <Kicker>Career counsellor{loc ? ` · ${loc}` : ""}</Kicker>
            {/* name sized down from the display face — a person, not a headline */}
            <SplitReveal as="h1" className="mt-4 max-w-[20ch] text-[clamp(1.5rem,2.9vw,2.3rem)] font-light leading-[1.08] tracking-tight">{name}</SplitReveal>
            <p data-reveal className="lead mt-6 max-w-lg text-ink-60">{lead}</p>
            {tags.length > 0 && (
              <div data-reveal className="mt-6 flex flex-wrap gap-2">
                {tags.slice(0, 5).map((t) => <span key={t} className="border border-line px-3 py-1.5 text-[12px] text-ink-80">{t}</span>)}
              </div>
            )}
            <div data-reveal className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link to="/cri" className="btn btn--solid"><span>Start with the free index</span> <ArrowUpRight size={15} className="btn-arrow" /></Link>
              <Link to="/framework" className="ul text-[13px] text-ink-60">How we match you to a counsellor →</Link>
            </div>
            <p data-reveal className="mono mt-6 text-[10.5px] uppercase tracking-[0.12em] text-ink-40">Certified · trained on the SetMyCareer method · your counsellor is matched to your results</p>
          </div>
        </div>
      </section>

      {/* spec strip */}
      {facts.length > 0 && (
        <section className="wrap mt-14 md:mt-20">
          <div className="grid gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label} className="bg-paper p-5">
                <span className="kicker text-ink-40">{f.label}</span>
                <p className="mt-2 text-[15px] font-medium tracking-tight">{f.value}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* about */}
      {bio && (
        <section className="wrap mt-16 grid gap-8 md:mt-24 md:grid-cols-[240px_1fr] md:gap-12">
          <div><Kicker>On {first}</Kicker></div>
          <div className="serif max-w-[60ch] text-[1.05rem] leading-relaxed text-ink-80">
            <p data-reveal>{bio}</p>
            {org && <p data-reveal className="mt-4 text-[14px] leading-relaxed text-ink-60">Has practised with {org}.</p>}
          </div>
        </section>
      )}

      {/* expertise & services */}
      {(tags.length > 0 || services.length > 0 || focus) && (
        <section className="wrap mt-16 grid gap-8 md:grid-cols-[240px_1fr] md:gap-12">
          <div><Kicker>What {first} works on</Kicker></div>
          <div>
            <p data-reveal className="serif mb-6 max-w-xl text-[1.02rem] leading-relaxed text-ink-80">{worksLead}</p>
            {tags.length > 0 && (
              <div data-reveal className="flex flex-wrap gap-2">
                {tags.map((t) => <span key={t} className="border border-line px-3 py-1.5 text-[12.5px] text-ink-80">{t}</span>)}
              </div>
            )}
            {services.length > 0 && (
              <ul className={`grid gap-x-10 sm:grid-cols-2 ${tags.length > 0 ? "mt-6" : ""}`}>
                {services.map((s) => (
                  <li key={s} data-reveal className="flex items-baseline gap-3 border-t border-line py-2.5 text-[14px] text-ink-80">
                    <span className="mono text-[10px] text-ink-40">—</span>{s}
                  </li>
                ))}
              </ul>
            )}
            {focus && (
              <div data-reveal className="mt-6 border-t border-line pt-5">
                <span className="kicker text-ink-40">Focus areas</span>
                <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed text-ink-80">{focus}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* credentials & record — always present: the counsellor's own record when
          it's on file, and the network-level guarantees that hold for everyone on
          the roster, so a sparse profile still stands on real, verifiable ground */}
      <section className="wrap mt-16 grid gap-8 md:grid-cols-[240px_1fr] md:gap-12">
        <div><Kicker>Credentials &amp; record</Kicker></div>
        <div>
          {education && <Field label="Education" value={education} />}
          {certifications && <Field label="Certifications" value={certifications} />}
          {achievements && <Field label="Achievements" value={achievements} />}
          {recordLine && <Field label="Experience" value={recordLine} />}
          <Field
            label="On the network"
            value="A certified counsellor on the SetMyCareer network — trained to read validated aptitude, interest and personality assessments, and held to the platform's confidentiality, non-poaching and evidence-based-practice terms."
          />
        </div>
      </section>

      {/* how a session works — the real method, applied by this counsellor.
          Present on every page, so even a sparse profile still explains + sells. */}
      <section className="wrap mt-16 grid gap-8 md:mt-24 md:grid-cols-[240px_1fr] md:gap-12">
        <div><Kicker>How a session works</Kicker></div>
        <div>
          <p data-reveal className="serif max-w-xl text-[1.02rem] leading-relaxed text-ink-80">{first} works the SetMyCareer method — the same five measured steps behind every recommendation, from the first assessment to the decision and after it.</p>
          <ol className="mt-7 grid gap-px border-t border-line sm:grid-cols-2 lg:grid-cols-5">
            {COPY.method.map((s) => (
              <li key={s.no} data-reveal className="border-b border-line py-5 sm:border-b-0 sm:border-r sm:pr-5 sm:last:border-r-0 lg:border-b-0">
                <span className="mono text-[11px] text-ink-40">{s.no}</span>
                <h3 className="mt-1.5 text-[14.5px] font-medium tracking-tight">{s.title}</h3>
                <p className="mt-1.5 text-[12px] leading-relaxed text-ink-60">{s.body}</p>
              </li>
            ))}
          </ol>
          <Link to="/framework" className="ul mt-6 inline-flex items-center gap-2 text-[13px] text-ink-60">See the full framework <ArrowRight size={13} /></Link>
        </div>
      </section>

      {/* work with — the offerings ladder (free anchors the paid tiers) */}
      <section className="hair-t mt-20 bg-paper-pure">
        <div className="wrap py-16 md:py-20">
          <div className="mb-10 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="h-lg">Work with <span className="b">{first}</span></h2>
            <p className="mono text-[11px] uppercase tracking-[0.13em] text-ink-40">Start free · go deeper when the question turns serious</p>
          </div>
          <div className="grid gap-px border border-line bg-line md:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t) => (
              <div key={t.name} className="flex flex-col bg-paper-pure p-6">
                <span className="kicker text-ink-40">{t.price}</span>
                <h3 className="mt-2 text-[16px] font-medium tracking-tight">{t.name}</h3>
                <p className="mt-2 text-[12.5px] leading-relaxed text-ink-60">{t.who}</p>
                <ul className="mt-4 space-y-1.5">
                  {t.includes.slice(0, 2).map((inc) => (
                    <li key={inc} className="flex items-baseline gap-2 text-[12px] leading-relaxed text-ink-80"><span className="mono text-[9px] text-ink-40">—</span>{inc}</li>
                  ))}
                </ul>
                <Link to={tierLink(t.name)} className="ul mt-5 inline-flex items-center gap-1.5 self-start text-[12.5px] font-medium">{tierCta(t.name)} <ArrowRight size={13} /></Link>
              </div>
            ))}
          </div>
          <p className="mt-6 max-w-[60ch] text-[13px] leading-relaxed text-ink-60">Every path runs through a certified counsellor — {first} or another on the network, matched to your decision. The free index is the honest place to start.</p>
        </div>
      </section>

      {/* recommended — cross-sell */}
      {recommended.length > 0 && (
        <section className="wrap py-16 md:py-20">
          <div className="mb-8 flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="h-lg">Other counsellors to <span className="b">consider</span></h2>
            <Link to="/experts" className="ul text-[13px] text-ink-60">See the full network →</Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-5">
            {recommended.map((r) => <MiniCard key={String(r.id)} n={r} />)}
          </div>
        </section>
      )}

      {/* close */}
      <section className="plate-dark">
        <div className="wrap py-20 text-center md:py-28">
          <SplitReveal className="h-xl mx-auto max-w-[20ch] text-paper">A first session tells you more than <span className="b">any profile</span>.</SplitReveal>
          <div data-reveal className="mt-9 flex flex-wrap items-center justify-center gap-5">
            <Link to="/cri" className="btn btn--dark"><span>Start your assessment</span> <ArrowUpRight size={16} className="btn-arrow" /></Link>
            <Link to="/experts" className="ul text-[13px] text-paper/80">Back to the network</Link>
          </div>
        </div>
      </section>
    </main>
  )
}
