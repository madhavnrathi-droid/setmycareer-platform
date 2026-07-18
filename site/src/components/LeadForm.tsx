import { useState, type ChangeEvent, type FormEvent, type ReactNode } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, ArrowUpRight, Phone, Time } from "@carbon/icons-react"
import { Kicker } from "@/components/bits"

/* The career-expert enquiry — SetMyCareer's real organic-lead capture, on our own
   site (never the old contact-us.php). One reusable, monochrome-editorial form
   posting to /api/lead (→ the team's FormTracker). Placed at genuine conversion
   moments, never as a random pop-up. Copy is warm and precise, not transactional. */

// The audience taxonomy from the live SetMyCareer form (spelling corrected).
const AUDIENCE = [
  "Student (8–10 Std)", "Student (11–12 Std)", "Student (UG)", "Student (PG)",
  "Parent (8–10 Std)", "Parent (11–12 Std)", "Parent (UG)", "Parent (PG)",
  "Working Professional (1–10 yrs exp)", "Senior Working Professional (10+ yrs exp)",
  "Executive with Career Break", "Principal / Teacher", "Others",
]

type Fields = { name: string; email: string; phone: string; audience: string; city: string; message: string }
const EMPTY: Fields = { name: "", email: "", phone: "", audience: "", city: "", message: "" }

/** The form itself — drops into any container. `source` labels where the lead came
 *  from so the desk knows the context. */
export function LeadForm({ source }: { source: string }) {
  const [f, setF] = useState<Fields>(EMPTY)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState("")
  const set = (k: keyof Fields) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr(""); setBusy(true)
    try {
      const r = await fetch("/api/lead", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, source }) })
      const d = await r.json()
      if (!r.ok || !d.ok) throw new Error(d.error || "That didn't go through — mind trying once more?")
      setDone(true)
    } catch (ex) { setErr(ex instanceof Error ? ex.message : "That didn't go through — mind trying once more?") }
    setBusy(false)
  }

  if (done) {
    const first = f.name.trim().split(/\s+/)[0] || "there"
    return (
      <div data-reveal className="flex h-full flex-col justify-center rounded-[14px] border border-line bg-paper-pure p-8 md:p-10">
        <p className="ed-title-xl text-[clamp(1.5rem,2.4vw,2rem)]">Thanks, {first}.</p>
        <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-60">That's with our desk. A counsellor will reach out within a working day — no pitch, just a straight conversation about what's next.</p>
        <p className="mt-5 text-[13.5px] text-ink-60">While you wait, the free <Link to="/cri" className="ul font-medium text-ink">Career Clarity Index</Link> takes about four minutes and gives them a head start.</p>
      </div>
    )
  }

  const field = "field-box rounded-[9px] text-[14.5px]"
  return (
    <form onSubmit={submit} data-reveal className="rounded-[14px] border border-line bg-paper-pure p-6 md:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <input value={f.name} onChange={set("name")} placeholder="Full name" required aria-label="Full name" autoComplete="name" className={`${field} sm:col-span-2`} />
        <input value={f.email} onChange={set("email")} type="email" placeholder="Email" aria-label="Email" autoComplete="email" className={field} />
        <input value={f.phone} onChange={set("phone")} placeholder="Phone" aria-label="Phone" autoComplete="tel" inputMode="tel" className={field} />
        <select value={f.audience} onChange={set("audience")} required aria-label="Who you are" className={`${field} cursor-pointer ${f.audience ? "" : "text-ink-40"}`}>
          <option value="" disabled>I am a…</option>
          {AUDIENCE.map((a) => <option key={a} value={a} className="text-ink">{a}</option>)}
        </select>
        <input value={f.city} onChange={set("city")} placeholder="City" aria-label="City" autoComplete="address-level2" className={field} />
        <textarea value={f.message} onChange={set("message")} rows={3} placeholder="Anything we should know? (optional)" aria-label="Message" className={`${field} sm:col-span-2 resize-none`} />
      </div>
      {err && <p className="mt-3 text-[12.5px] text-red-600">{err}</p>}
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <button type="submit" disabled={busy} className="btn btn--solid disabled:opacity-60"><span>{busy ? "Sending…" : "Start the conversation"}</span> <ArrowRight size={15} className="btn-arrow" /></button>
        <p className="text-[11.5px] leading-relaxed text-ink-40">A reply within a working day. No spam, ever — per our <Link to="/legal/privacy-policy" className="ul">Privacy Policy</Link>.</p>
      </div>
    </form>
  )
}

/** The full section — witty copy + trust signals on the left, the form on the right.
 *  Reusable at any conversion moment; `source` is passed through to the lead. */
export function TalkToExpert({
  id, ground = "pure", eyebrow = "Talk to an expert",
  heading = <>Bring the questions.<br /><span className="b">We'll bring the map.</span></>,
  blurb = "A career rarely resolves inside a form field. Tell us where you are and one of our counsellors will reach out — no pitch, no obligation, just a clear conversation about what comes next.",
  source,
}: {
  id?: string
  ground?: "paper" | "pure" | "dark"
  eyebrow?: string
  heading?: ReactNode
  blurb?: string
  source: string
}) {
  const bg = ground === "dark" ? "plate-dark" : ground === "pure" ? "bg-paper-pure" : ""
  const dark = ground === "dark"
  return (
    <section id={id} className={`hair-t ${bg}`}>
      <div className="wrap grid gap-10 py-16 md:grid-cols-2 md:gap-16 md:py-24">
        <div className="flex flex-col justify-center">
          <Kicker className={dark ? "text-paper/50" : ""}>{eyebrow}</Kicker>
          <h2 data-reveal className={`h-lg mt-5 max-w-[15ch] ${dark ? "text-paper" : ""}`}>{heading}</h2>
          <p data-reveal className={`mt-6 max-w-md text-[15px] leading-relaxed ${dark ? "text-paper/70" : "text-ink-60"}`}>{blurb}</p>

          {/* trust signals — a real number, real hours, a real promise */}
          <div data-reveal className={`mt-9 flex flex-col gap-3.5 border-t pt-7 text-[13.5px] ${dark ? "border-paper/15" : "border-line"}`}>
            <a href="tel:+919108510058" className={`group inline-flex items-center gap-3 ${dark ? "text-paper/85" : "text-ink"}`}>
              <Phone size={16} className={dark ? "text-paper/50" : "text-ink-40"} />
              <span className="ul font-medium">+91 91085 10058</span>
              <span className={`text-[12px] ${dark ? "text-paper/40" : "text-ink-40"}`}>— call to ask anything</span>
            </a>
            <p className={`inline-flex items-center gap-3 ${dark ? "text-paper/70" : "text-ink-60"}`}>
              <Time size={16} className={dark ? "text-paper/50" : "text-ink-40"} />
              Mon–Sun, 9am–8pm IST
            </p>
            <a href="mailto:info@setmycareer.com" className={`ul inline-flex items-center gap-1.5 self-start text-[13px] ${dark ? "text-paper/70" : "text-ink-60"}`}>
              info@setmycareer.com <ArrowUpRight size={13} />
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <LeadForm source={source} />
        </div>
      </div>
    </section>
  )
}
