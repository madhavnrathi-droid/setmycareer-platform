import { useEffect, useMemo, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowRight, Close, Search, Chat, Calendar, ChevronUp } from "@carbon/icons-react"
import { LogoMark } from "@/components/Brand"
import { rolodexFor } from "@/content/rolodex"
import { searchKb, type KbEntry } from "@/content/kb"
import { FAQ, type Qa } from "@/content/faq"
import { CompassCards, type CompassCardData } from "@/components/compass/CompassCards"

// While the answer is in flight, the status word cycles — a small, non-cringe
// blend of nautical / survey / clinical working verbs, so the wait reads as the
// compass doing something deliberate rather than a spinner stalling.
const LOADING_WORDS = ["Reading", "Sounding", "Charting", "Triangulating", "Taking bearings", "Cross-referencing", "Plotting a course"]

// FAQ typeahead — map what the visitor is typing to the questions the site already
// answers (keyword overlap over question + answer); an empty box shows the most
// asked. Replaces the old fixed chip row with a live dropdown of real questions.
function suggestFaq(query: string): Qa[] {
  const words = query.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
  if (!words.length) return FAQ.slice(0, 4)
  const scored = FAQ
    .map((f) => {
      const hay = `${f.q} ${f.a}`.toLowerCase()
      let score = 0
      for (const w of words) if (hay.includes(w)) score += w.length >= 5 ? 2 : 1
      return { f, score }
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
  return (scored.length ? scored.map((s) => s.f) : FAQ).slice(0, 4)
}

// placeholder quick actions — mirrors the client-dashboard bar's icon row.
// Trimmed to three so the rotating question has room to breathe; the chevron
// is the fourth control. Wiring comes later, so for now each opens the panel.
const QUICK_ICONS = [
  { Icon: Search, label: "Search careers (coming soon)" },
  { Icon: Chat, label: "Ask the compass (coming soon)" },
  { Icon: Calendar, label: "Book a session (coming soon)" },
]

// The floating Compass bar — the marketing site's sibling of the portal's
// co-pilot pill: a small, milky liquid-glass PILL that sits idle and EXPANDS
// when you click into it (same rounded-full pill + width-stretch the client
// dashboard uses). Answers come only from content the site already stands
// behind (Doherty: instant, no network). Grab the logomark to move it anywhere
// (position persists; double-click sends it home). The panel flips above/below
// depending on where the pill lives.
//
// NB the pill is intentionally rounded-full — an explicit, user-directed
// exception to the site's otherwise sharp-cornered chrome, to match the
// client-dashboard bar the user pointed to.

const POS_KEY = "smc-bar-pos-v2" // v2: cleared stale positions so the hero-reveal shows
const MARGIN = 8

type Pos = { x: number; y: number }

const loadPos = (): Pos | null => {
  try {
    const raw = localStorage.getItem(POS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Pos
    if (typeof p?.x !== "number" || typeof p?.y !== "number") return null
    // a position saved on another screen size may be off-screen — clamp home
    if (p.x < 0 || p.y < 0 || p.x > innerWidth - 80 || p.y > innerHeight - 40) return null
    return p
  } catch { return null }
}

export function CareerBar() {
  const [asking, setAsking] = useState(false) // pill expanded (input revealed)
  const [q, setQ] = useState("")
  const [results, setResults] = useState<KbEntry[]>([])
  const [asked, setAsked] = useState(false)
  const [pos, setPos] = useState<Pos | null>(loadPos)
  const [dropUp, setDropUp] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const posRef = useRef(pos)
  posRef.current = pos
  const drag = useRef<{ dx: number; dy: number; sx: number; sy: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  const dragClear = useRef<number | undefined>(undefined)
  const { pathname } = useLocation()

  // Home hero: the bar is docked BELOW the screen and floats up as you scroll
  // into the next section, then rests in place; scroll back toward the hero and
  // it slides back down. A scroll-linked, springy reveal (rAF-throttled so the
  // transform stays buttery). Every other route just rests it in place.
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    let raf = 0
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { setScrollY(window.scrollY); raf = 0 }) }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf) }
  }, [])
  // 0 = docked below the hero · 1 = fully risen & resting. Stays hidden through
  // the first half of the hero, then floats up as the next section arrives (the
  // bar must NOT sit on the landing hero — it reveals on the way down).
  const onHome = pathname === "/"
  const heroProgress = useMemo(() => {
    if (!onHome) return 1
    const vh = typeof window !== "undefined" ? window.innerHeight : 800
    return Math.max(0, Math.min(1, (scrollY - vh * 0.45) / (vh * 0.4)))
  }, [onHome, scrollY])

  // Footer reveal (the mirror of the hero one, at the other end): as the footer
  // rises into the viewport the bar shrinks, tucks down and fades — hiding behind
  // it. 0 = footer below the fold (bar resting) · 1 = footer up, bar gone.
  const footerProgress = useMemo(() => {
    if (typeof window === "undefined") return 0
    const f = document.querySelector("footer")
    if (!f) return 0
    const vh = window.innerHeight
    const top = f.getBoundingClientRect().top
    return Math.max(0, Math.min(1, (vh - top) / (vh * 0.2)))
  }, [scrollY])

  // rolodex — questions the current visitor is likely to ask, cycled subtly in
  // the placeholder every 2s. Frozen while asking/typing; reduced-motion holds.
  const questions = useMemo(() => rolodexFor(pathname), [pathname])
  const [roloI, setRoloI] = useState(0)
  useEffect(() => { setRoloI(0) }, [pathname])
  const roloPaused = asking || q.length > 0
  useEffect(() => {
    if (roloPaused || questions.length < 2) return
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setInterval(() => setRoloI((n) => (n + 1) % questions.length), 3000)
    return () => window.clearInterval(t)
  }, [questions, roloPaused])
  const rolo = questions[roloI] ?? "Ask about careers…"

  const collapse = () => { setAsking(false); setAsked(false); setResults([]); askAbort.current?.abort(); setAi({ status: "idle", text: "" }); inputRef.current?.blur() }
  useEffect(() => { collapse() }, [pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") collapse() }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  useEffect(() => { if (asking) inputRef.current?.focus() }, [asking])

  // click outside collapses the pill
  useEffect(() => {
    if (!asking) return
    const onDown = (e: PointerEvent) => { const el = wrapRef.current; if (el && !el.contains(e.target as Node)) collapse() }
    document.addEventListener("pointerdown", onDown)
    return () => document.removeEventListener("pointerdown", onDown)
  }, [asking])

  // if the pill has been dragged into the top half, the panel opens downward
  useEffect(() => {
    if (!asking) return
    const r = wrapRef.current?.getBoundingClientRect()
    if (r) setDropUp(r.top > innerHeight * 0.5)
  }, [asking, pos])

  // ── the AI answer: grounded in whatever is on the visitor's screen ──────────
  // A snapshot of the CURRENT PAGE rides along with every question, so "what
  // does this mean?" on a blog post answers about THAT post with zero context
  // from the visitor. The counselor deployment hosts the model + persona.
  // [CONFIRM: repoint to the brand domain when the apps move off vercel.app]
  const ASSISTANT_URL = "https://setmycareer-counselor.vercel.app/api/assistant"
  const [ai, setAi] = useState<{ status: "idle" | "thinking" | "done" | "error"; text: string; cards?: CompassCardData[] }>({ status: "idle", text: "" })
  const askAbort = useRef<AbortController | null>(null)

  // Warm the serverless assistant the moment the panel opens, so the first real
  // question isn't paying the cold-start tax — fire-and-forget, once per load;
  // any invocation wakes the container while the visitor reads / types.
  const warmedRef = useRef(false)
  const warm = () => {
    if (warmedRef.current) return
    warmedRef.current = true
    fetch(ASSISTANT_URL, { method: "GET", cache: "no-store", keepalive: true }).catch(() => { /* wake-up only */ })
  }

  // cycle the status word while an answer is in flight (reduced-motion holds it)
  const [loadI, setLoadI] = useState(0)
  useEffect(() => {
    if (ai.status !== "thinking") return
    setLoadI(0)
    if (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const t = window.setInterval(() => setLoadI((n) => (n + 1) % LOADING_WORDS.length), 1100)
    return () => window.clearInterval(t)
  }, [ai.status])

  // A one-line page descriptor (URL · title · heading) — always cheap to send so
  // the bot knows where the visitor is (for the right CTA), without shipping the
  // whole page. Used unless the question is actually about THIS page.
  const cheapPage = () => {
    const main = document.querySelector("main")
    const h1 = main?.querySelector("h1")?.textContent?.trim() ?? ""
    return `URL path: ${location.pathname}\nPage title: ${document.title}${h1 ? `\nMain heading: ${h1}` : ""}`
  }
  // The full visible-text snapshot — only sent when the question is page-relative,
  // so most queries don't burn tokens reading a page the bot doesn't need.
  const snapshotPage = () => {
    const text = (document.querySelector("main")?.innerText || document.body.innerText || "").replace(/\s+/g, " ").trim().slice(0, 2400)
    return `${cheapPage()}\nVisible page text (truncated):\n${text}`
  }
  // Deictic / "about this page" questions need the page; everything else doesn't.
  const PAGE_RE = /\b(this|these|that|here|above|below|the page|this page|this article|this post|this video|this section|on (this|the) (page|site)|what does this|explain this|what('?s| is) this|read (this|it)|the (chart|table|graph|diagram|number|figure)s?)\b/i
  const needsPage = (query: string) => PAGE_RE.test(query) || query.trim().length < 12

  const ask = (query: string) => {
    setQ(query)
    setResults(searchKb(query))
    setAsked(true)
    askAbort.current?.abort()
    const ac = new AbortController()
    askAbort.current = ac
    setAi({ status: "thinking", text: "" })
    fetch(ASSISTANT_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: ac.signal,
      body: JSON.stringify({
        plain: true,
        context: { audience: "visitor", route: pathname, pageContext: needsPage(query) ? snapshotPage() : cheapPage() },
        messages: [{ id: `m-${Date.now()}`, role: "user", parts: [{ type: "text", text: query }] }],
      }),
    })
      .then((r) => r.json())
      .then((d: { text?: string; cards?: CompassCardData[] }) => {
        if (ac.signal.aborted) return
        const hasContent = !!(d?.text?.trim() || d?.cards?.length)
        setAi(hasContent ? { status: "done", text: d.text ?? "", cards: d.cards } : { status: "error", text: "" })
      })
      .catch(() => { if (!ac.signal.aborted) setAi({ status: "error", text: "" }) })
  }
  const expand = () => {
    if (justDragged.current) { justDragged.current = false; return } // a drag-release isn't a click
    warm() // spin up the assistant now, before they've even typed
    setAsking(true)
  }

  /* ── drag (logomark = handle; pointer capture keeps events on it) ── */
  const startDrag = (e: React.PointerEvent) => {
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) return
    drag.current = { dx: e.clientX - box.left, dy: e.clientY - box.top, sx: e.clientX, sy: e.clientY, moved: false }
    try { (e.currentTarget as Element).setPointerCapture(e.pointerId) } catch { /* no live pointer (synthetic event) — drag still tracks via the handle */ }
    e.preventDefault()
  }
  const moveDrag = (e: React.PointerEvent) => {
    if (!drag.current) return
    const box = wrapRef.current?.getBoundingClientRect()
    if (!box) return
    // only count it as a DRAG past a small threshold — a tap/jitter on the
    // handle must not arm the click guard (that swallowed the next real click)
    if (!drag.current.moved && Math.hypot(e.clientX - drag.current.sx, e.clientY - drag.current.sy) < 4) return
    drag.current.moved = true
    const next = {
      x: Math.min(Math.max(e.clientX - drag.current.dx, MARGIN), innerWidth - box.width - MARGIN),
      y: Math.min(Math.max(e.clientY - drag.current.dy, MARGIN), innerHeight - box.height - MARGIN),
    }
    posRef.current = next // keep the ref ahead of the render so endDrag always persists the latest spot
    setPos(next)
  }
  const endDrag = () => {
    if (drag.current?.moved) {
      justDragged.current = true
      // the drag's own retargeted click lands on the HANDLE, not on expand()'s
      // buttons — so self-clear the guard shortly after, and let the handle's
      // onClick consume it too, so the next real click always registers
      window.clearTimeout(dragClear.current)
      dragClear.current = window.setTimeout(() => { justDragged.current = false }, 320)
      try { if (posRef.current) localStorage.setItem(POS_KEY, JSON.stringify(posRef.current)) } catch { /* private mode */ }
    }
    drag.current = null
  }
  const resetPos = () => {
    setPos(null)
    try { localStorage.removeItem(POS_KEY) } catch { /* noop */ }
  }

  return (
    <div data-careerbar className="pointer-events-none fixed inset-0 z-[8500] block print:hidden" aria-live="polite">
      <div
        ref={wrapRef}
        className="pointer-events-auto absolute w-max"
        style={(() => {
          // the hero float-up reveal applies on home REGARDLESS of a saved drag
          // position — so a parked bar still hides on the hero and slides into
          // place on scroll (t = vh to push it down/off-screen while docked).
          const t = onHome ? (1 - heroProgress) * 22 : 0
          const down = (t + footerProgress * 7).toFixed(2)      // tuck down toward the footer
          const sc = (1 - footerProgress * 0.42).toFixed(3)     // shrink as it hides
          const op = (onHome && heroProgress < 0.03 ? 0 : 1) * (1 - footerProgress)
          const reveal = {
            transition: "transform 0.34s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.24s ease",
            opacity: op,
            transformOrigin: "bottom center",
            pointerEvents: ((onHome && heroProgress < 0.12) || footerProgress > 0.5 ? "none" : undefined) as "none" | undefined,
          }
          return pos
            ? { left: pos.x, top: pos.y, transform: `translateY(${down}vh) scale(${sc})`, ...reveal }
            : { left: "50%", bottom: "5vh", transform: `translateX(-50%) translateY(${down}vh) scale(${sc})`, ...reveal }
        })()}
      >
        <div className="relative">
          {/* answer panel — only while expanded; flips below the pill when it
              lives in the top half of the screen */}
          {asking && (
            <div data-lenis-prevent style={{ overscrollBehavior: "contain" }} className={`absolute w-[min(88vw,560px)] max-h-[55vh] overflow-y-auto overscroll-contain rounded-2xl border border-line bg-white shadow-[0_10px_28px_-10px_rgba(11,11,11,0.16),0_36px_80px_-24px_rgba(11,11,11,0.3)] ${dropUp ? "bottom-full mb-2.5" : "top-full mt-2.5"} ${pos ? "left-0" : "left-1/2 -translate-x-1/2"}`}>
              <div className="flex items-center justify-between border-b border-line/70 px-5 py-3">
                <span className="kicker text-ink-40">Compass — careers, answered</span>
                <button onClick={collapse} aria-label="Close" className="p-1 text-ink-40 hover:text-ink"><Close size={18} /></button>
              </div>
              <div className="px-5 py-4">
                {!asked && (
                  <>
                    <p className="text-[13.5px] leading-relaxed text-ink-60">Ask anything — including about the page you're reading right now. Compass sees what's on your screen and answers directly.</p>
                    {/* FAQ typeahead — a live dropdown of the questions the site already
                        answers, keyword-mapped to whatever's in the box (popular ones when empty) */}
                    <div className="mt-4">
                      <p className="kicker text-ink-40">{q.trim() ? "Related questions" : "Popular questions"}</p>
                      <div className="mt-1.5">
                        {suggestFaq(q).map((f) => (
                          <button
                            key={f.q}
                            onClick={() => ask(f.q)}
                            className="group flex w-full items-center justify-between gap-4 border-t border-line/70 py-2.5 text-left text-[13.5px] leading-snug text-ink-80 transition-colors first:border-t-0 hover:text-ink"
                          >
                            <span>{f.q}</span>
                            <ArrowRight size={14} className="shrink-0 text-ink-40 transition-transform group-hover:translate-x-0.5 group-hover:text-ink" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {asked && ai.status === "thinking" && (
                  <div className="flex items-center gap-2.5 text-[13px] text-ink-40">
                    <span aria-hidden className="dots flex gap-1"><i className="size-1.5 rounded-full bg-ink-40" /><i className="size-1.5 rounded-full bg-ink-40" /><i className="size-1.5 rounded-full bg-ink-40" /></span>
                    {/* the rotating verb is decoration — hidden from AT so the polite
                        region announces one stable status, not a word every second */}
                    <span aria-hidden className="tabular-nums">{LOADING_WORDS[loadI]}…</span>
                    <span className="sr-only">Working on your answer…</span>
                  </div>
                )}
                {asked && ai.status === "done" && (
                  <>
                    {ai.text.trim() && (
                      <div className="text-[13.5px] leading-relaxed text-ink-80 [&_b]:font-semibold">
                        {ai.text.split(/\*\*([^*]+)\*\*/g).map((part, i) => (i % 2 ? <b key={i}>{part}</b> : <span key={i} className="whitespace-pre-wrap">{part}</span>))}
                      </div>
                    )}
                    <CompassCards cards={ai.cards} />
                  </>
                )}
                {asked && ai.status === "error" && results.length === 0 && (
                  <div>
                    <p className="text-[14px] leading-relaxed text-ink-80">That one deserves a person, not a search box. Two good moves:</p>
                    <div className="mt-3 flex flex-wrap gap-4">
                      <Link to="/book" className="ul text-[13px] font-medium">Book a session</Link>
                      <Link to="/pricing" className="ul text-[13px] text-ink-60">See all services</Link>
                    </div>
                  </div>
                )}
                {/* Local KB "From the site" — a grounded supplement, shown only when
                    the AI returned no cards (cards are richer; avoid double-up). */}
                {asked && results.length > 0 && !(ai.status === "done" && ai.cards && ai.cards.length > 0) && (
                  <>
                    <p className="kicker mt-6 border-t border-line/70 pt-4 text-ink-40">From the site</p>
                    {results.map((r, i) => (
                      <div key={r.title} className={i > 0 ? "mt-5 border-t border-line/70 pt-5" : "mt-3"}>
                        <h4 className="text-[14.5px] font-medium tracking-tight">{r.title}</h4>
                        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-60">{r.answer}</p>
                        <div className="mt-2.5 flex flex-wrap gap-4">
                          {r.links.map((l) => (
                            <Link key={l.label} to={l.to} className="ul inline-flex items-center gap-1.5 text-[12.5px] font-medium">{l.label} <ArrowRight size={13} /></Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {asked && (
                  <button onClick={() => { setAsked(false); setQ(""); setResults([]) }} className="ul mt-5 text-[12px] text-ink-40">Ask something else</button>
                )}
              </div>
            </div>
          )}

          {/* the pill — the client-dashboard bar's sibling: clean full-white,
              rounded, logomark + ask + icon row (the drifting shader was reading
              as a faint moving box behind the logomark, so it's gone) */}
          <form
            onSubmit={(e) => { e.preventDefault(); if (q.trim()) ask(q) }}
            className={`compass-bar bar-solid group/bar flex items-center rounded-full py-1.5 pl-1.5 ${asking ? "w-[min(88vw,560px)] pr-2" : "w-auto pr-2"}`}
          >
            <div className="relative z-[1] flex w-full items-center gap-1.5">
              <button
                type="button"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
                onClick={() => { justDragged.current = false }}
                onDoubleClick={resetPos}
                className="grid size-9 shrink-0 cursor-grab touch-none place-items-center rounded-full outline-none focus-visible:outline-none active:cursor-grabbing"
                aria-label="Drag to move the Compass bar; double-click to reset its position"
                title="Drag to move · double-click to reset"
              >
                <LogoMark size={19} className="text-ink transition-transform duration-500 ease-out motion-safe:group-hover/bar:rotate-[18deg]" />
              </button>

              {asking ? (
                <>
                  <input
                    ref={inputRef}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder={rolo}
                    className="bar-input w-full bg-transparent py-1 text-[14px] outline-none placeholder:text-ink-40"
                    aria-label="Ask about careers"
                  />
                  <div className="hidden shrink-0 items-center gap-3.5 sm:flex">
                    <Link to="/pricing" className="ul whitespace-nowrap text-[12.5px] font-medium text-ink-80">Services</Link>
                  </div>
                  <button type="submit" aria-label="Ask" className="grid size-8 shrink-0 place-items-center rounded-full text-ink-40 transition-colors hover:bg-ink/[0.06] hover:text-ink"><ArrowRight size={17} /></button>
                </>
              ) : (
                <>
                  {/* idle prompt — a rolodex of real questions, fixed width so
                      the pill never reflows as each question cycles in */}
                  <button
                    type="button"
                    onClick={expand}
                    aria-label="Ask about careers"
                    className="relative w-[clamp(130px,42vw,320px)] overflow-hidden py-1 pr-2 text-left"
                  >
                    <span key={roloI} className="rolo-in block truncate text-[14px] tracking-tight text-ink-60 transition-colors group-hover/bar:text-ink">{rolo}</span>
                  </button>
                  {/* quick-action row — placeholder icons; collapses on phones to
                      keep the pill compact (just logomark · question · chevron) */}
                  <span aria-hidden className="hidden items-center gap-1.5 sm:flex">
                    <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-line" />
                    {QUICK_ICONS.map(({ Icon, label }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={expand}
                        aria-label={label}
                        title={label}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-ink-60 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                      >
                        <Icon size={16} />
                      </button>
                    ))}
                  </span>
                  <button
                    type="button"
                    onClick={expand}
                    aria-label="Open the compass"
                    className="grid size-8 shrink-0 place-items-center rounded-full text-ink-40 transition-colors hover:bg-ink/[0.05] hover:text-ink"
                  >
                    <ChevronUp size={16} />
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
