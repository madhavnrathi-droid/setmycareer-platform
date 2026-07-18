import { Link } from "react-router-dom"
import { ArrowRight, Phone, Time, Email, Location } from "@carbon/icons-react"
import { Kicker, SplitReveal } from "@/components/bits"
import { LeadForm } from "@/components/LeadForm"
import { useReveals } from "@/lib/motion"
import { useSeo } from "@/lib/seo"

/* Contact — a real, on-site "talk to a career expert" page. Replaces the old
   setmycareer.com/contact-us.php link. The form is the organic-lead capture
   (→ /api/lead → the team's FormTracker); the left rail sets the human tone. */

const NEXT = [
  { no: "01", title: "You leave a note", body: "Name, how to reach you, and roughly where you are. Sixty seconds." },
  { no: "02", title: "A counsellor reads it", body: "A real, certified person — not a queue. Matched to what you're deciding." },
  { no: "03", title: "You have a conversation", body: "A call or a session, at your pace. No pitch, no obligation — just clarity." },
]

export function Contact() {
  const ref = useReveals()
  useSeo({
    title: "Contact — Talk to a Career Expert | SetMyCareer",
    description: "Leave your details and a certified SetMyCareer counsellor reaches out — usually within a working day — for a straight conversation about your next career decision. Mon–Sun, 9am–8pm.",
    path: "/contact",
  })

  return (
    <main ref={ref} className="pt-28">
      <section className="wrap pb-6 pt-12 md:pt-20">
        <Kicker>Contact</Kicker>
        <SplitReveal as="h1" className="display mt-5 max-w-[16ch]">Talk to a real <span className="b">career expert</span>.</SplitReveal>
        <p data-reveal className="lead mt-7 max-w-2xl text-ink-60">No queue, no call-centre script. Leave your details and one of our certified counsellors reaches out — usually within a working day — for a straight conversation about where you are and what comes next.</p>
      </section>

      <section className="wrap grid gap-10 pb-16 pt-8 md:grid-cols-[0.9fr_1.1fr] md:gap-16 md:pb-24">
        {/* left — the human, the promise, the path */}
        <div className="flex flex-col justify-center">
          <div className="flex flex-col gap-4 border-t border-line pt-8 text-[14px]">
            <a href="tel:+919108510058" className="group inline-flex items-center gap-3 text-ink">
              <Phone size={17} className="text-ink-40" />
              <span className="ul text-[16px] font-medium">+91 91085 10058</span>
            </a>
            <p className="inline-flex items-center gap-3 text-ink-60"><Time size={16} className="text-ink-40" /> Mon–Sun, 9am–8pm IST</p>
            <a href="mailto:info@setmycareer.com" className="ul inline-flex items-center gap-3 self-start text-ink-60"><Email size={16} className="text-ink-40" /> info@setmycareer.com</a>
            <p className="inline-flex items-start gap-3 leading-relaxed text-ink-60"><Location size={16} className="mt-0.5 shrink-0 text-ink-40" /> Koramangala 8th Block, Bengaluru 560095, India</p>
          </div>

          <div className="mt-10">
            <p className="kicker mb-5 text-ink-40">What happens next</p>
            <div className="flex flex-col">
              {NEXT.map((s) => (
                <div data-reveal key={s.no} className="grid grid-cols-[auto_1fr] gap-x-4 border-t border-line py-5">
                  <span className="mono text-[11px] text-ink-40">{s.no}</span>
                  <div>
                    <p className="text-[15px] font-medium tracking-tight">{s.title}</p>
                    <p className="mt-1 max-w-sm text-[13.5px] leading-relaxed text-ink-60">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* right — the form */}
        <div className="flex flex-col justify-center">
          <LeadForm source="contact page" />
        </div>
      </section>

      {/* not ready to talk? the quieter doors */}
      <section className="hair-t bg-paper-pure">
        <div className="wrap grid gap-8 py-14 md:grid-cols-3 md:py-16">
          <Link data-reveal to="/cri" className="group border-t border-line py-6">
            <p className="kicker text-ink-40">Rather start alone?</p>
            <h3 className="ul mt-3 inline-block text-[17px] font-medium tracking-tight">The free clarity index</h3>
            <p className="mt-2 text-[13.5px] text-ink-60">Four minutes, no sign-up. A read on where you stand.</p>
          </Link>
          <Link data-reveal to="/book" className="group border-t border-line py-6">
            <p className="kicker text-ink-40">Ready to sit down?</p>
            <h3 className="ul mt-3 inline-block text-[17px] font-medium tracking-tight">Book a session</h3>
            <p className="mt-2 text-[13.5px] text-ink-60">Straight to a video session with a counsellor.</p>
          </Link>
          <Link data-reveal to="/experts" className="group border-t border-line py-6">
            <p className="kicker text-ink-40">Who you'll meet</p>
            <h3 className="ul mt-3 inline-flex items-center gap-1 text-[17px] font-medium tracking-tight">The counsellors <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></h3>
            <p className="mt-2 text-[13.5px] text-ink-60">The live roster — certified, named, real.</p>
          </Link>
        </div>
      </section>
    </main>
  )
}
