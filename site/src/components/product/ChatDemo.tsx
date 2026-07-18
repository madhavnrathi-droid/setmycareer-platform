// The AI coach, demonstrated. A scripted conversation auto-plays: a question
// rises in, the assistant "thinks" (typing dots), then answers — sometimes with a
// rich card that proves it's grounded in the client's own report / sessions /
// dashboard, not a generic bot. Loops; pauses on hover. Reduced-motion shows the
// whole thread at rest. Monochrome chat, one purple accent on the assistant mark.
import { useEffect, useRef, useState } from "react"
import { SendAlt, ChartRadar, Calendar, DocumentBlank } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"

type Card =
  | { kind: "report"; title: string; rows: [string, string][] }
  | { kind: "session"; date: string; quote: string }
  | { kind: "stat"; label: string; value: string; sub: string }

type Turn = { role: "user" | "ai"; text: string; card?: Card; think?: number }

// A tour of what the coach can actually do — colleges, the report, past sessions,
// the plan — each answer short and grounded, the way the real one is tuned to be.
const SCRIPT: Turn[] = [
  { role: "user", text: "Is NID or an MDes at IIT better for product design?" },
  {
    role: "ai", think: 1100,
    text: "Both are strong — NID leans craft and studio, IIT-IDC leans systems and research. Given your Investigative + Artistic profile, IDC's research bent fits you slightly better. Want the eligibility and fee reality for each?",
  },
  { role: "user", text: "What does my report say I'm strongest at?" },
  {
    role: "ai", think: 1200,
    text: "Your Learning Orientation (95th) and Achievement Drive (93rd) lead — you go deep and finish. That's what makes research-heavy design a fit.",
    card: { kind: "report", title: "From your Sigma profile", rows: [["Learning orientation", "95th"], ["Achievement drive", "93rd"], ["Artistic interest", "High"]] },
  },
  { role: "user", text: "What did my counsellor and I decide last session?" },
  {
    role: "ai", think: 1000,
    text: "On June 27 you agreed to shortlist three MDes programmes and build one research case study before applications.",
    card: { kind: "session", date: "Session · 27 Jun 2026", quote: "\"Let's pick programmes by fit, not brand — and show your process in a case study.\"" },
  },
  { role: "user", text: "How many counsellor sessions do I have left?" },
  {
    role: "ai", think: 900,
    text: "Three, on your Growth plan — plus 180 AI-guide minutes. Shall I hold a slot before your applications open?",
    card: { kind: "stat", label: "Sessions remaining", value: "3", sub: "Growth plan · 180 AI minutes" },
  },
]

function CardView({ card }: { card: Card }) {
  if (card.kind === "report")
    return (
      <div className="mt-2.5 border border-line bg-paper-pure p-3">
        <div className="mb-2 flex items-center gap-1.5 text-ink-40"><ChartRadar size={13} /><span className="mono text-[9.5px] uppercase tracking-[0.12em]">{card.title}</span></div>
        <ul className="space-y-1.5">
          {card.rows.map(([k, v]) => (
            <li key={k} className="flex items-baseline justify-between gap-4 text-[12.5px]"><span className="text-ink-70">{k}</span><span className="mono tabular-nums text-ink">{v}</span></li>
          ))}
        </ul>
      </div>
    )
  if (card.kind === "session")
    return (
      <div className="mt-2.5 border border-line bg-paper-pure p-3">
        <div className="mb-1.5 flex items-center gap-1.5 text-ink-40"><Calendar size={13} /><span className="mono text-[9.5px] uppercase tracking-[0.12em]">{card.date}</span></div>
        <p className="text-[12.5px] italic leading-relaxed text-ink-70">{card.quote}</p>
      </div>
    )
  return (
    <div className="mt-2.5 flex items-center gap-3 border border-line bg-paper-pure p-3">
      <DocumentBlank size={16} className="text-ink-40" />
      <div><div className="flex items-baseline gap-2"><span className="text-[20px] font-medium leading-none tracking-tight">{card.value}</span><span className="text-[11px] text-ink-50">{card.label}</span></div><div className="mono mt-1 text-[9.5px] uppercase tracking-[0.1em] text-ink-40">{card.sub}</div></div>
    </div>
  )
}

export function ChatDemo() {
  const [shown, setShown] = useState(0) // number of turns revealed
  const [typing, setTyping] = useState(false)
  const paused = useRef(false)
  const scroller = useRef<HTMLDivElement>(null)
  const reduce = useRef(false)

  useEffect(() => {
    reduce.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce.current) { setShown(SCRIPT.length); return }
    let alive = true
    const timers: number[] = []
    const wait = (ms: number) => new Promise<void>((res) => { const id = window.setTimeout(res, ms); timers.push(id) })
    ;(async () => {
      while (alive) {
        setShown(0); setTyping(false)
        await wait(700)
        for (let i = 0; i < SCRIPT.length && alive; i++) {
          while (paused.current && alive) await wait(200)
          const t = SCRIPT[i]
          if (t.role === "ai") { setTyping(true); await wait(t.think ?? 1000); setTyping(false) }
          setShown(i + 1)
          await wait(t.role === "user" ? 650 : 2100)
        }
        await wait(2600)
      }
    })()
    return () => { alive = false; timers.forEach(clearTimeout) }
  }, [])

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: reduce.current ? "auto" : "smooth" })
  }, [shown, typing])

  return (
    <div
      className="flex h-[460px] flex-col overflow-hidden rounded-[16px] border border-line bg-white elev"
      onMouseEnter={() => (paused.current = true)}
      onMouseLeave={() => (paused.current = false)}
    >
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid size-6 place-items-center rounded-full bg-ink text-paper"><LogoMark size={13} /></span>
        <span className="text-[13px] font-medium tracking-tight">AI career coach</span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-ink-40"><span className="size-1.5 rounded-full bg-growth" />Grounded in your results</span>
      </div>

      {/* thread */}
      <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
        {SCRIPT.slice(0, shown).map((t, i) => (
          <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"} motion-safe:animate-[chatrise_.4s_ease-out]`}>
            <div className={`max-w-[82%] ${t.role === "user" ? "" : "flex gap-2.5"}`}>
              {t.role === "ai" && <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink"><LogoMark size={12} /></span>}
              <div>
                <div className={`px-3.5 py-2.5 text-[13.5px] leading-relaxed ${t.role === "user" ? "rounded-2xl rounded-br-sm bg-ink text-paper" : "rounded-2xl rounded-tl-sm bg-paper text-ink"}`}>{t.text}</div>
                {t.card && <CardView card={t.card} />}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start motion-safe:animate-[chatrise_.3s_ease-out]">
            <div className="flex items-center gap-2.5">
              <span className="grid size-6 place-items-center rounded-full border border-line text-ink"><LogoMark size={12} /></span>
              <span className="dots-ink flex gap-1 rounded-2xl rounded-tl-sm bg-paper px-3.5 py-3"><i /><i /><i /></span>
            </div>
          </div>
        )}
      </div>

      {/* input (decorative) */}
      <div className="border-t border-line px-4 py-3">
        <div className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5">
          <span className="flex-1 truncate text-[13px] text-ink-40">Ask about colleges, your report, a past session…</span>
          <span className="grid size-7 place-items-center rounded-full bg-growth text-paper"><SendAlt size={14} /></span>
        </div>
      </div>
    </div>
  )
}
