import { useEffect, useRef, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowUpRight, Menu, Close, ArrowRight, ChevronDown } from "@carbon/icons-react"
import { PORTAL_URL, COUNSELLOR_URL } from "@/lib/api"
import { scrollToTop, scrollToSelector } from "@/lib/motion"
import { COPY } from "@/content/site"
import { Lockup, LogoMark, TAGLINE } from "@/components/Brand"
import { IA_NAV, PRICING_LINK, BOOK_LINK, type NavGroup } from "@/content/nav"
import { FOOTER_LEGAL, legalLabel } from "@/lib/legal"
import { useSiteSession, signOutSite, firstName } from "@/lib/site-auth"

/* ── grain overlay (fixed, multiply) ── */
export function Grain() { return <div className="grain" aria-hidden /> }

/* ── scroll progress (thin top rule that fills with read-depth) ── */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, h.scrollTop / max) : 0})`
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll) }
  }, [])
  return <div ref={ref} className="scroll-progress" aria-hidden />
}

/* ── smart leaf link: internal routes via <Link>, hashes + external via <a> ── */
function LeafLink({ to, className, children, onClick }: { to: string; className?: string; children: React.ReactNode; onClick?: () => void }) {
  if (to.startsWith("http")) return <a href={to} className={className} onClick={onClick}>{children}</a>
  return <Link to={to} className={className} onClick={onClick}>{children}</Link>
}

/* ── nav — a Stripe-style mega-menu over the full IA.
   ONE shared full-white rounded panel (no glass) of UNIFORM size for every
   group: while it is open, moving between top items slides the content
   horizontally inside the same panel (direction falls out of the travel), the
   panel itself nudges toward the hovered item, and a caret tracks the active
   label. Hover opens with intent; Escape and route-change close; reduced
   motion drops the slide. Laws: Hick/Miller (6 chunked groups), Jakob (the
   Stripe pattern), Fitts (full-row targets), Von Restorff (one solid CTA).
   On the home hero the bar starts as ONLY the centered tagline, which flies
   to its slot beside the logo as the rest of the bar fades in on scroll. ── */
const PANEL_W = 720
const PANEL_H = 408

export function Nav() {
  const [solid, setSolid] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [drawer, setDrawer] = useState(false)
  const session = useSiteSession()
  const { pathname, hash } = useLocation()
  const closeTimer = useRef<number | undefined>(undefined)

  // shared-panel geometry: caret centers under the active item; the panel
  // nudges toward it (clamped inside the nav cluster / viewport)
  const navRef = useRef<HTMLElement>(null)
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([])
  const [panelX, setPanelX] = useState(0)
  const [panelW, setPanelW] = useState(PANEL_W)
  const [dir, setDir] = useState(1) // travel direction (+1 right, -1 left) for the content slide

  // hero-merge: measure the tagline's resting slot beside the logo so the
  // floating tagline can fly between "centered on the hero" and "in the bar"
  const headerRow = useRef<HTMLDivElement>(null)
  const tagSlot = useRef<HTMLSpanElement>(null)
  const [tagDx, setTagDx] = useState<number | null>(null)

  useEffect(() => {
    const onScroll = () => setSolid(window.scrollY > 24)
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])
  useEffect(() => { setOpen(null); setDrawer(false) }, [pathname, hash])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(null); setDrawer(false) } }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])
  useEffect(() => { document.documentElement.style.overflow = drawer ? "hidden" : "" ; return () => { document.documentElement.style.overflow = "" } }, [drawer])
  useEffect(() => {
    const measure = () => {
      const row = headerRow.current, slot = tagSlot.current
      if (!row || !slot || !slot.offsetParent) { setTagDx(null); return }
      const rc = row.getBoundingClientRect(), sc = slot.getBoundingClientRect()
      setTagDx(sc.left + sc.width / 2 - (rc.left + rc.width / 2))
    }
    measure()
    // re-measure once webfonts swap in — the Cambo wordmark's width (and thus
    // the tagline slot's centre) shifts after a cold-cache font load, and the
    // flyer's transform is computed off that centre
    document.fonts?.ready.then(() => requestAnimationFrame(measure)).catch(() => {})
    window.addEventListener("resize", measure)
    return () => window.removeEventListener("resize", measure)
  }, [])

  const enter = (i: number) => {
    window.clearTimeout(closeTimer.current)
    const nav = navRef.current
    const first = itemRefs.current[0], last = itemRefs.current[IA_NAV.length - 1]
    if (nav && first && last) {
      const nr = nav.getBoundingClientRect()
      // FIXED anchor — the box is centred under the whole nav cluster and does NOT
      // follow the hovered item (Stripe: the box stays put, only the content
      // crossfades). Clamp against the VIEWPORT so it never runs off-screen.
      const clusterCentre = (first.getBoundingClientRect().left + last.getBoundingClientRect().right) / 2 - nr.left
      const w = Math.min(PANEL_W, window.innerWidth - 32)
      const minX = 16 - nr.left
      const maxX = Math.max(minX, window.innerWidth - 16 - nr.left - w)
      setPanelX(Math.min(Math.max(clusterCentre - w / 2, minX), maxX))
      setPanelW(w)
    }
    setDir(open === null || i >= open ? 1 : -1)
    setOpen(i)
  }
  const scheduleClose = () => { window.clearTimeout(closeTimer.current); closeTimer.current = window.setTimeout(() => setOpen(null), 160) }
  // a leaf click always closes the panel; when it points at the page you're
  // already on (same pathname), React Router won't re-fire the hash-scroll
  // effect (deps are the pathname/hash strings), so scroll here explicitly
  const onLeafClick = (to: string) => {
    window.clearTimeout(closeTimer.current); setOpen(null)
    const [p, h] = to.split("#")
    if (p === pathname) window.setTimeout(() => (h ? scrollToSelector("#" + h) : scrollToTop()), 60)
  }

  // the home hero begins as tagline-only chrome; everything else fades in on scroll
  const heroTop = pathname === "/" && !solid && !drawer
  const fade = `transition-opacity duration-500 ${heroTop ? "pointer-events-none opacity-0" : "opacity-100"}`

  return (
    <header
      data-nav
      className={`fixed inset-x-0 top-0 z-[8000] transition-colors duration-300 ${solid || open !== null || drawer ? "bg-paper/92 backdrop-blur-md hair-b" : ""}`}
      onMouseLeave={scheduleClose}
    >
      <div ref={headerRow} className="wrap relative flex h-16 items-center justify-between gap-6">
        <Link to="/" className={`flex shrink-0 items-center gap-3 ${fade}`} onMouseEnter={scheduleClose} tabIndex={heroTop ? -1 : 0}>
          <Lockup size={17} />
          {/* invisible slot — reserves the tagline's resting place for the flyer */}
          <span ref={tagSlot} aria-hidden className="kicker hidden opacity-0 xl:inline">{TAGLINE}</span>
        </Link>

        {/* the floating tagline — centered alone over the hero, then flies to its
            slot beside the logo as the bar assembles (transform-only, 60fps) */}
        <span
          aria-hidden={!heroTop}
          className={`kicker pointer-events-none absolute left-1/2 top-1/2 z-10 whitespace-nowrap transition-[transform,color,opacity] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            heroTop ? "!text-paper/90" : tagDx != null ? "text-ink-40" : "opacity-0"}`}
          style={{ transform: heroTop || tagDx == null ? "translate(-50%,-50%) scale(1.3)" : `translate(calc(-50% + ${tagDx}px),-50%) scale(1)` }}
        >
          {TAGLINE}
        </span>

        {/* desktop — ONE shared white panel under the cluster; content slides
            between groups Stripe-style instead of re-opening per item */}
        <nav ref={navRef} className={`relative hidden items-center lg:flex ${fade}`} aria-label="Primary">
          <div className="flex items-center">
            {IA_NAV.map((g, i) => (
              <Link
                key={g.label}
                ref={(el) => { itemRefs.current[i] = el }}
                to={g.to}
                aria-haspopup="true" aria-expanded={open === i} aria-controls="meganav-panel"
                onClick={() => { setOpen(null); scrollToTop() }}
                onMouseEnter={() => enter(i)}
                onFocus={() => enter(i)}
                tabIndex={heroTop ? -1 : 0}
                className={`flex items-center gap-1 whitespace-nowrap px-2.5 py-2.5 text-[13px] tracking-[-0.01em] transition-[color,transform] duration-150 active:scale-90 ${open === i ? "text-ink" : "text-ink-80 hover:text-ink"}`}
              >
                {g.label}
                <ChevronDown size={14} className="text-ink-40 transition-transform duration-200" style={{ transform: open === i ? "rotate(180deg)" : "none" }} />
              </Link>
            ))}
          </div>
          {/* CTA cluster — its own zone; hovering it lets the panel close */}
          <span aria-hidden className="mx-3 h-4 w-px bg-line" />
          <div className="flex items-center gap-1" onMouseEnter={scheduleClose}>
            <Link to={PRICING_LINK.to} tabIndex={heroTop ? -1 : 0} className="whitespace-nowrap px-2.5 py-2.5 text-[13px] tracking-[-0.01em] text-ink-80 transition-colors hover:text-ink">{PRICING_LINK.label}</Link>
            {/* client sign-in — reachable but quiet; counsellors sign in from the footer.
                Signed in → a quiet account chip with portal + sign-out. */}
            {session ? (
              <AccountChip name={firstName(session)} heroTop={heroTop} />
            ) : (
              <Link to="/signin" tabIndex={heroTop ? -1 : 0} className="whitespace-nowrap px-2.5 py-2.5 text-[13px] tracking-[-0.01em] text-ink-60 transition-colors hover:text-ink">Sign in</Link>
            )}
            <Link to={BOOK_LINK.to} tabIndex={heroTop ? -1 : 0} className="btn btn--solid ml-2 !min-h-0 whitespace-nowrap !px-4 !py-2 text-[12.5px]"><span>{BOOK_LINK.label}</span></Link>
          </div>

          {/* the shared panel — a fixed-size white box that GLIDES under the active
              label (Stripe). The box position animates; the CONTENT crossfades in
              from the direction of travel, so it's the content that moves, not a
              filmstrip flying across a sliding box. */}
          {open !== null && (() => {
            const g = IA_NAV[open]
            return (
              <div className="nav-pop absolute left-0 top-full z-50 pt-2.5" onMouseEnter={() => { window.clearTimeout(closeTimer.current) }}>
                <div
                  id="meganav-panel"
                  className="relative overflow-hidden rounded-2xl border border-line bg-white shadow-[0_10px_28px_-10px_rgba(11,11,11,0.16),0_36px_80px_-24px_rgba(11,11,11,0.3)]"
                  style={{ width: panelW, height: PANEL_H, transform: `translateX(${panelX}px)` }}
                >
                  {/* only the active group renders; keyed on `open` so it remounts
                      and re-plays the directional crossfade each hover */}
                  <section key={open} className={`h-full overflow-y-auto px-7 py-6 ${dir >= 0 ? "nav-content-r" : "nav-content-l"}`}>
                    <LeafLink to={g.to} onClick={() => onLeafClick(g.to)} className="group flex items-center justify-between gap-6 pb-4">
                      <span>
                        <span className="block text-[14px] font-semibold tracking-tight text-ink">Open {g.label.toLowerCase()}</span>
                        <span className="mt-0.5 block text-[12.5px] text-ink-40">{g.blurb}</span>
                      </span>
                      <ArrowRight size={15} className="shrink-0 text-ink-40 transition-transform group-hover:translate-x-0.5" />
                    </LeafLink>
                    <div className="border-t border-line" />
                    <ul className="grid grid-cols-2 gap-x-6 pt-2.5">
                      {g.children.map((leaf) => (
                        <li key={leaf.label}>
                          <LeafLink to={leaf.to} onClick={() => onLeafClick(leaf.to)} className="group -mx-2.5 block rounded-lg px-2.5 py-2 transition-colors hover:bg-ink/[0.04]">
                            <span className="block text-[13.5px] font-medium text-ink-80 transition-colors group-hover:text-ink">{leaf.label}</span>
                            <span className="mt-0.5 block text-[12px] text-ink-40">{leaf.hint}</span>
                          </LeafLink>
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>
              </div>
            )
          })()}
        </nav>

        <button onClick={() => setDrawer((v) => !v)} className={`p-2 lg:hidden ${heroTop ? "text-paper" : ""}`} aria-label="Menu" aria-expanded={drawer}>
          {drawer ? <Close size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* mobile drawer — accordion per group (chunking), CTA always visible */}
      {drawer && (
        <div className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto border-t border-line bg-paper lg:hidden">
          <div className="wrap flex min-h-full flex-col py-4">
            {IA_NAV.map((g) => <DrawerGroup key={g.label} group={g} onNavigate={() => setDrawer(false)} />)}
            <Link to={PRICING_LINK.to} onClick={() => setDrawer(false)} className="border-t border-line py-4 text-[16px] font-medium">Pricing</Link>
            <div className="mt-auto border-t border-line py-5">
              <Link to={BOOK_LINK.to} onClick={() => setDrawer(false)} className="btn btn--solid w-full justify-center"><span>Book Session</span></Link>
              <div className="mt-4 flex items-center justify-center gap-5 text-[13px]">
                {session ? (
                  <>
                    <a href={PORTAL_URL} target="_blank" rel="noopener noreferrer" className="ul text-ink-60">Open my portal</a>
                    <span className="text-ink-40">·</span>
                    <button onClick={() => { signOutSite(); setDrawer(false) }} className="ul text-ink-60">Sign out</button>
                  </>
                ) : (
                  <>
                    <Link to="/signin" onClick={() => setDrawer(false)} className="ul text-ink-60">Client sign in</Link>
                    <span className="text-ink-40">·</span>
                    <a href={COUNSELLOR_URL} className="ul text-ink-60">Counsellor sign in</a>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

/* ── the signed-in account chip — quiet, first-name only, with a small white
   panel: portal (new tab) + sign out. Closes on outside click, Escape and
   route change (the route effect lives in Nav; this one handles the rest). ── */
function AccountChip({ name, heroTop }: { name: string; heroTop: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false) }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        tabIndex={heroTop ? -1 : 0}
        className="flex items-center gap-1 whitespace-nowrap px-2.5 py-2.5 text-[13px] tracking-[-0.01em] text-ink-80 transition-colors hover:text-ink"
      >
        {name}
        <ChevronDown size={14} className="text-ink-40 transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-48 rounded-xl border border-line bg-white py-1.5 shadow-[0_10px_28px_-10px_rgba(11,11,11,0.16),0_36px_80px_-24px_rgba(11,11,11,0.3)]">
          <a
            role="menuitem"
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 px-4 py-2 text-[13px] text-ink-80 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            Open my portal <ArrowUpRight size={13} className="text-ink-40" />
          </a>
          <button
            role="menuitem"
            type="button"
            onClick={() => { signOutSite(); setOpen(false) }}
            className="block w-full px-4 py-2 text-left text-[13px] text-ink-60 transition-colors hover:bg-ink/[0.04] hover:text-ink"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}

function DrawerGroup({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-t border-line first:border-t-0">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between py-4 text-left text-[16px] font-medium">
        {group.label}
        <ChevronDown size={18} className="text-ink-40 transition-transform duration-300" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      <div className="grid transition-[grid-template-rows] duration-300" style={{ gridTemplateRows: open ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <ul className="pb-4">
            {group.children.map((leaf) => (
              <li key={leaf.label}>
                <LeafLink to={leaf.to} onClick={onNavigate} className="block py-2.5 pl-4 text-[14.5px] text-ink-60">{leaf.label}</LeafLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

/* ── footer — the full sitemap (closure + orientation), grouped like the nav ── */
// real social channels (sourced from setmycareer.com)
const SOCIALS: { name: string; href: string; src: string }[] = [
  { name: "Instagram", href: "https://www.instagram.com/set_my_career/", src: "/logos/social/instagram.svg" },
  { name: "X", href: "https://x.com/setmycareer", src: "/logos/social/x.svg" },
  { name: "LinkedIn", href: "https://www.linkedin.com/company/loratis/", src: "/logos/social/linkedin.svg" },
  { name: "YouTube", href: "https://www.youtube.com/channel/UCrPxXwRZDEDrBT4TFPnSvqQ/videos", src: "/logos/social/youtube.svg" },
  { name: "Facebook", href: "https://www.facebook.com/setmycareerofficial", src: "/logos/social/facebook.svg" },
]

function SocialRow() {
  return (
    <div className="flex items-center gap-5">
      {SOCIALS.map((s) => (
        <a key={s.name} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.name} title={s.name}
          className="grid size-8 place-items-center opacity-85 transition-all duration-200 hover:-translate-y-0.5 hover:opacity-100">
          <img src={s.src} alt={s.name} loading="lazy" className="size-7 object-contain" />
        </a>
      ))}
    </div>
  )
}

export function Footer() {
  return (
    <footer className="plate-dark relative overflow-hidden">
      {/* the mark, oversized and cropped — a faint compass ghost bleeding off the right edge */}
      <LogoMark
        aria-hidden
        className="pointer-events-none absolute right-0 top-1/2 hidden h-auto w-[54vw] max-w-[900px] -translate-y-[46%] translate-x-[26%] select-none text-paper/[0.06] lg:block"
      />

      <div className="wrap relative z-10 py-16 md:py-24">
        {/* on top — the brand, socials and the field-notes signup */}
        <div className="flex flex-wrap items-end justify-between gap-8 border-b border-paper/15 pb-14">
          <div>
            <Lockup size={30} tagline className="text-paper" />
            <div className="mt-6"><SocialRow /></div>
          </div>
          <NewsletterForm />
        </div>

        {/* the statement, the act, and how to reach us */}
        <div className="mt-14 grid gap-12 border-b border-paper/15 pb-14 md:grid-cols-2 lg:grid-cols-[1.3fr_0.9fr_0.9fr_1.1fr]">
          <div>
            <div className="h-xl max-w-[13ch] leading-[0.92]">Careers, decided with <span className="b">evidence</span>.</div>
            <div className="mt-8 flex flex-wrap items-center gap-5">
              <Link to="/book" className="btn btn--dark"><span>Book Session</span> <ArrowUpRight size={16} className="btn-arrow" /></Link>
              <Link to="/pricing" className="ul text-[13.5px] text-paper/80">See pricing</Link>
            </div>
          </div>
          <FooterCol title="Get started" links={[["Pricing", "/pricing"], ["Book Session", "/book"], ["Talk to an expert", "/contact"], ["Free clarity index", "/cri"]]} />
          <FooterCol title="Counsellors" links={[["The platform", "/counsellors"], ["The network", "/experts"], ["Become an expert", "/experts/apply"], ["Counsellor sign in", COUNSELLOR_URL]]} />
          <div>
            <p className="kicker mb-5 text-paper/40">Reach us</p>
            <ul className="flex flex-col gap-3.5 text-[13.5px]">
              <li>
                <a href="tel:+919108510058" className="ul text-paper/85">+91 91085 10058</a>
                <span className="mt-0.5 block text-[11px] text-paper/40">Any question · Mon–Sun, 9am–8pm</span>
              </li>
              <li><a href="mailto:info@setmycareer.com" className="ul text-paper/85">info@setmycareer.com</a></li>
              <li className="leading-relaxed text-paper/55">Koramangala 8th Block,<br />Bengaluru 560095, India</li>
            </ul>
          </div>
        </div>

        {/* sitemap */}
        <div className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 md:grid-cols-3 xl:grid-cols-6">
          {IA_NAV.map((g) => (
            <div key={g.label}>
              <LeafLink to={g.to} className="kicker mb-5 block text-paper/40 transition-colors hover:text-paper/70">{g.label}</LeafLink>
              <ul className="flex flex-col gap-2.5">
                {g.children.map(({ label, to }) => (
                  <li key={label}><LeafLink to={to} className="ul text-[13px] text-paper/75">{label}</LeafLink></li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* legal — every policy, one row */}
        <div className="mt-16 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-paper/15 pt-7 text-[12px]">
          {FOOTER_LEGAL.map((slug) => (
            <Link key={slug} to={`/legal/${slug}`} className="ul text-paper/70 hover:text-paper">{legalLabel(slug)}</Link>
          ))}
          <Link to="/legal" className="ul text-paper/70 hover:text-paper">All policies →</Link>
        </div>

        <div className="mt-7 flex flex-col justify-between gap-3 text-[11.5px] text-paper/50 md:flex-row md:items-center">
          <span className="kicker">Loratis SetMyCareer.Net India Pvt Ltd · {COPY.footerLine}</span>
          <span className="kicker">© {new Date().getFullYear()} · BENGALURU</span>
        </div>
      </div>
    </footer>
  )
}

function NewsletterForm() {
  const [v, setV] = useState("")
  const [done, setDone] = useState(false)
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (v.includes("@")) setDone(true) }} className="w-full max-w-sm">
      <p className="kicker mb-3 text-paper/40">Field notes to your inbox</p>
      {done ? (
        <p className="text-[14px] text-paper/70">Noted — we’ll write only when there’s something worth your time.</p>
      ) : (
        <>
          <div className="flex items-center gap-0 border-b border-paper/30">
            <input value={v} onChange={(e) => setV(e.target.value)} type="email" placeholder="you@email.com" className="w-full bg-transparent py-2 text-[14px] text-paper placeholder:text-paper/35" />
            <button type="submit" aria-label="Subscribe" className="shrink-0 p-2 text-paper/70 transition-colors hover:text-paper"><ArrowRight size={18} /></button>
          </div>
          <p className="mt-2.5 text-[11px] leading-relaxed text-paper/40">By subscribing you agree to our <Link to="/legal/privacy-policy" className="ul">Privacy Policy</Link>. Unsubscribe any time.</p>
        </>
      )}
    </form>
  )
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="kicker mb-5 text-paper/40">{title}</p>
      <ul className="flex flex-col gap-2.5">
        {links.map(([label, href]) => (
          <li key={label}><LeafLink to={href} className="ul text-[13.5px] text-paper/80">{label}</LeafLink></li>
        ))}
      </ul>
    </div>
  )
}
