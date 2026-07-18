import { useEffect, useRef, useState } from "react"
import { DEMOS } from "@/content/demos"
import { LogoMark } from "@/components/Brand"

const C = DEMOS.chat

// A scripted counsellor exchange that plays out turn by turn with a typing beat —
// it auto-starts when scrolled into view, and any prompt chip replays it. Driven by
// timeouts (no rAF) so it runs reliably. Transcript style, no rounded bubbles.
export function AiChat() {
  const ref = useRef<HTMLDivElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const [started, setStarted] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const [typing, setTyping] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { setStarted(true); io.disconnect() } }, { threshold: 0.4 })
    if (ref.current) io.observe(ref.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started || revealed >= C.turns.length) { setTyping(false); return }
    const next = C.turns[revealed]
    const isAi = next.role === "ai"
    setTyping(isAi)
    const t = window.setTimeout(() => { setTyping(false); setRevealed((r) => r + 1) }, isAi ? 1000 : 550)
    return () => window.clearTimeout(t)
  }, [started, revealed])

  // keep the latest turn in view as the transcript grows
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight }, [revealed, typing])

  const replay = () => { setRevealed(0); setStarted(true) }

  return (
    <div ref={ref} className="flex h-[460px] flex-col border border-paper/15 bg-ink">
      <div className="flex items-center gap-2.5 border-b border-paper/15 px-5 py-3.5">
        <LogoMark size={15} className="text-paper" />
        <span className="text-[13px] font-medium text-paper">AI Career Counsellor</span>
        <span className="ml-auto flex items-center gap-1.5 text-[10.5px] text-paper/50"><span className="size-1.5 rounded-full bg-paper/70" /> online</span>
      </div>

      <div ref={scroller} className="no-bar flex-1 space-y-5 overflow-y-auto px-5 py-6">
        {C.turns.slice(0, revealed).map((t, i) => (
          <div key={i} className={t.role === "user" ? "flex justify-end" : "flex gap-3"}>
            {t.role === "ai" && <LogoMark size={18} className="mt-0.5 shrink-0 text-paper/70" />}
            <div className={t.role === "user" ? "max-w-[80%] text-right" : "max-w-[82%]"}>
              <span className="mono mb-1 block text-[9.5px] uppercase tracking-[0.16em] text-paper/35">{t.role === "user" ? "Student" : "Counsellor"}</span>
              <p className={`text-[14px] leading-relaxed ${t.role === "user" ? "text-paper/95" : "text-paper/70"}`}>{t.text}</p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex gap-3">
            <LogoMark size={18} className="mt-0.5 shrink-0 text-paper/70" />
            <div className="dots flex items-center gap-1 py-1.5"><i /><i /><i /></div>
          </div>
        )}
      </div>

      <div className="border-t border-paper/15 px-5 py-4">
        <div className="flex flex-wrap gap-2">
          {C.chips.map((c) => (
            <button key={c} onClick={replay} className="border border-paper/20 px-3 py-1.5 text-[12px] text-paper/70 transition-colors hover:border-paper/60 hover:text-paper">{c}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
