// The session, recreated. A counsellor-led video call on the left (two real
// camera tiles, a running timer, a live waveform); on the right, everything a
// session produces, switchable:
//   • Transcript — speaker-labelled, timestamped, streaming a live line.
//   • Ask AI (live) — the CLIENT's in-call coach: they ask a question mid-session,
//     grounded in the same data as the report, tied to what's in the transcript.
//   • Notes — the AI-drafted MEETING NOTES the COUNSELLOR approves (their view).
// Monochrome; one purple accent on the live/record state. Reduced-motion = at rest.
import { useEffect, useRef, useState } from "react"
import { Microphone, Video, Pause, Time, CheckmarkFilled, SendAlt } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"

type Line = { who: "Counsellor" | "Arjun"; t: string; text: string; mark?: boolean }

const TRANSCRIPT: Line[] = [
  { who: "Counsellor", t: "02:14", text: "Your aptitude is strong on spatial and logical reasoning — but your interests keep pulling toward design, not core engineering. Let's sit with that." },
  { who: "Arjun", t: "02:33", text: "Everyone at school is doing JEE for CS. I don't know if design is a 'safe' choice." },
  { who: "Counsellor", t: "02:59", text: "Safe is the wrong lens. IIT-Delhi and IISc both run design programmes with strong placements — and your scores clear them.", mark: true },
  { who: "Arjun", t: "03:21", text: "What about the money side, compared to core CS?" },
  { who: "Counsellor", t: "03:44", text: "Fair question — let's pull the real numbers. Product design at a top institute isn't far off core CS today." },
  { who: "Arjun", t: "04:08", text: "Okay. So I keep JEE as a base, but aim for design too." },
]

const NOTES = {
  summary: "Arjun has the aptitude for core engineering but a clear, consistent pull toward design. We reframed “safe vs risky” into “which path fits the profile and still has strong outcomes.”",
  decisions: [
    "Keep JEE as a base; target design programmes at IIT-Delhi / IISc.",
    "Pull institute-wise placement + fee data before the next session.",
    "Revisit the shortlist once the design portfolio is started.",
  ],
  actions: [
    { who: "Arjun", task: "Shortlist 3 design programmes" },
    { who: "Counsellor", task: "Share placement + fee comparison" },
  ],
}

const TILES = [
  { name: "Meera Nair", role: "Counsellor", img: "/product/people/counsellor.jpg" },
  { name: "Arjun Menon", role: "Client", img: "/product/people/client.jpg" },
]

type Tab = "transcript" | "ai" | "notes"

export function TranscriptDemo() {
  const [tab, setTab] = useState<Tab>("transcript")
  const [n, setN] = useState(TRANSCRIPT.length)
  const [aiStep, setAiStep] = useState(3) // 0 none, 1 question, 2 typing, 3 answered
  const [sec, setSec] = useState(1518)
  const scroller = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const clock = window.setInterval(() => setSec((s) => s + 1), 1000)
    if (reduce) return () => clearInterval(clock)
    let i = 4; setN(4)
    const stream = window.setInterval(() => { i = i >= TRANSCRIPT.length ? 4 : i + 1; setN(i) }, 2600)
    return () => { clearInterval(clock); clearInterval(stream) }
  }, [])

  // when the Ask-AI tab opens, play the question → typing → answer beat
  useEffect(() => {
    if (tab !== "ai") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setAiStep(3); return }
    setAiStep(1)
    const a = window.setTimeout(() => setAiStep(2), 900)
    const b = window.setTimeout(() => setAiStep(3), 2100)
    return () => { clearTimeout(a); clearTimeout(b) }
  }, [tab])

  useEffect(() => {
    if (tab === "transcript" && scroller.current) scroller.current.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" })
  }, [n, tab])

  const mmss = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`

  return (
    <div className="grid gap-5 lg:grid-cols-[1.05fr_1fr] lg:items-stretch">
      {/* ── the call ── */}
      <div className="flex flex-col overflow-hidden rounded-[16px] border border-line bg-ink elev">
        <div className="grid min-h-[300px] flex-1 grid-cols-2 gap-px bg-line">
          {TILES.map((p) => (
            <div key={p.name} className="relative overflow-hidden bg-ink">
              <img src={p.img} alt={`${p.name} on the call`} loading="lazy" className="h-full w-full object-cover" />
              <div className="absolute bottom-2 left-2 flex items-center gap-1.5 rounded-full bg-ink/55 px-2.5 py-1 backdrop-blur-sm">
                <Microphone size={11} className="text-paper/85" />
                <span className="text-[11px] font-medium text-paper/95">{p.name.split(" ")[0]}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="flex items-center gap-2 rounded-full bg-growth/15 px-2.5 py-1 text-[11px] font-medium text-[color:var(--color-growth)]">
            <span className="size-1.5 animate-[live-pulse_1.6s_infinite] rounded-full bg-growth" /> REC
          </span>
          <span className="flex items-center gap-1.5 text-[12px] tabular-nums text-paper/70"><Time size={13} /> {mmss}</span>
          <span className="flex h-4 items-end gap-0.5" aria-hidden>
            {[6, 11, 7, 14, 9, 16, 8, 12, 6, 13, 9, 15, 7].map((h, i) => (
              <span key={i} className="w-0.5 rounded-full bg-paper/35" style={{ height: h, animation: `dotpulse 1.1s ${i * 0.08}s infinite ease-in-out` }} />
            ))}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-full bg-paper/10 text-paper/80"><Microphone size={15} /></span>
            <span className="grid size-8 place-items-center rounded-full bg-paper/10 text-paper/80"><Video size={15} /></span>
            <span className="grid size-8 place-items-center rounded-full bg-paper/10 text-paper/80"><Pause size={15} /></span>
          </span>
        </div>
      </div>

      {/* ── transcript / ask-ai / notes ── */}
      <div className="flex h-full min-h-[380px] flex-col overflow-hidden rounded-[16px] border border-line bg-white elev">
        <div className="flex shrink-0 items-center gap-0.5 border-b border-line px-2">
          {([["transcript", "Transcript"], ["ai", "Ask AI · live"], ["notes", "Notes"]] as [Tab, string][]).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`relative px-3 py-3 text-[12.5px] font-medium transition-colors ${tab === k ? "text-ink" : "text-ink-40 hover:text-ink-70"}`}>
              {label}
              {tab === k && <span className="absolute inset-x-2 bottom-0 h-[2px] bg-growth" />}
            </button>
          ))}
          <span className="ml-auto flex items-center gap-1.5 pr-3 text-[10.5px] text-ink-40">
            {tab === "notes" ? "Counsellor view" : <><span className="size-1.5 rounded-full bg-growth" />Live</>}
          </span>
        </div>

        {tab === "transcript" && (
          <div ref={scroller} className="flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
            {TRANSCRIPT.slice(0, n).map((l, i) => (
              <div key={i} className="motion-safe:animate-[chatrise_.4s_ease-out]">
                <div className="mb-0.5 flex items-baseline gap-2">
                  <span className={`text-[12px] font-semibold tracking-tight ${l.who === "Counsellor" ? "text-ink" : "text-[color:var(--color-growth)]"}`}>{l.who}</span>
                  <span className="mono text-[10px] tabular-nums text-ink-40">{l.t}</span>
                </div>
                <p className={`text-[13px] leading-relaxed ${l.mark ? "border-l-2 border-growth pl-3 text-ink" : "text-ink-70"}`}>{l.text}</p>
              </div>
            ))}
          </div>
        )}

        {tab === "ai" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <p className="border-b border-line-faint px-4 py-2 text-[11px] leading-snug text-ink-50">Arjun asked the AI coach <span className="text-ink-70">during the session</span> — grounded in the same data as his report.</p>
            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {aiStep >= 1 && (
                <div className="flex justify-end motion-safe:animate-[chatrise_.4s_ease-out]">
                  <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-ink px-3.5 py-2.5 text-[13px] leading-relaxed text-paper">What's the average package for product design vs core CS at the IITs?</div>
                </div>
              )}
              {aiStep === 2 && (
                <div className="flex items-center gap-2.5">
                  <span className="grid size-6 place-items-center rounded-full border border-line text-ink"><LogoMark size={12} /></span>
                  <span className="dots-ink flex gap-1 rounded-2xl rounded-tl-sm bg-paper px-3.5 py-3"><i /><i /><i /></span>
                </div>
              )}
              {aiStep >= 3 && (
                <div className="flex gap-2.5 motion-safe:animate-[chatrise_.4s_ease-out]">
                  <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border border-line text-ink"><LogoMark size={12} /></span>
                  <div>
                    <div className="rounded-2xl rounded-tl-sm bg-paper px-3.5 py-2.5 text-[13px] leading-relaxed text-ink">At the top IITs, core-CS medians run ₹18–25 LPA and design/HCI roles ₹14–20 LPA — closer than most families expect, and design demand is climbing faster. Want the institute-wise breakdown?</div>
                    <div className="mt-2 inline-flex items-center gap-1.5 border border-line bg-paper-pure px-2.5 py-1 text-[11px] text-ink-60"><span className="size-1.5 rounded-full bg-growth" />Ties to 03:21 in the transcript</div>
                  </div>
                </div>
              )}
            </div>
            <div className="border-t border-line px-4 py-3">
              <div className="flex items-center gap-2 rounded-full border border-line px-4 py-2.5">
                <span className="flex-1 truncate text-[12.5px] text-ink-40">Ask the coach, without interrupting…</span>
                <span className="grid size-7 place-items-center rounded-full bg-growth text-paper"><SendAlt size={13} /></span>
              </div>
            </div>
          </div>
        )}

        {tab === "notes" && (
          <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
            <div>
              <p className="mono mb-1.5 text-[9.5px] uppercase tracking-[0.14em] text-ink-40">Summary</p>
              <p className="text-[13px] leading-relaxed text-ink-70">{NOTES.summary}</p>
            </div>
            <div>
              <p className="mono mb-2 text-[9.5px] uppercase tracking-[0.14em] text-ink-40">Decisions</p>
              <ul className="space-y-1.5">
                {NOTES.decisions.map((d) => (
                  <li key={d} className="flex gap-2.5 text-[13px] leading-relaxed text-ink-80"><CheckmarkFilled size={15} className="mt-0.5 shrink-0 text-growth" />{d}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mono mb-2 text-[9.5px] uppercase tracking-[0.14em] text-ink-40">Action items</p>
              <ul className="space-y-1.5">
                {NOTES.actions.map((a) => (
                  <li key={a.task} className="flex items-baseline justify-between gap-3 border-t border-line-faint py-1.5 text-[12.5px]"><span className="text-ink-80">{a.task}</span><span className="mono shrink-0 text-[10px] uppercase tracking-[0.1em] text-ink-40">{a.who}</span></li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
