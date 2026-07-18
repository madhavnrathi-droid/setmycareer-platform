// Universal search — one box in the topbar to jump to any client or counsellor.
// Live against the company store, so hand-added clients are findable instantly.

import { useMemo, useRef, useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, CornerDownLeft } from "lucide-react"
import { useClientDirectory } from "../client-directory"
import { useAdminCounsellors } from "../counsellor-roster"
import { cn } from "@/lib/utils"

const initialsOf = (name: string) => { const p = name.trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—" }

type Hit = { id: string; label: string; sub: string; initials: string; to: string; kind: "Client" | "Counsellor" }

export function AdminSearch() {
  const nav = useNavigate()
  const dir = useClientDirectory()
  const { counsellors: roster } = useAdminCounsellors()
  const [q, setQ] = useState("")
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // "/" focuses search (unless typing in a field already)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && !/input|textarea|select/i.test((e.target as HTMLElement)?.tagName)) {
        e.preventDefault(); inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const hits: Hit[] = useMemo(() => {
    const term = q.toLowerCase().trim()
    if (!term) return []
    const cl: Hit[] = dir.clients
      .filter((c) => c.name.toLowerCase().includes(term) || (c.email ?? "").toLowerCase().includes(term) || (c.mobile ?? "").includes(term))
      .slice(0, 6)
      .map((c) => ({ id: c.id, label: c.name, sub: c.navigator ?? c.category ?? "Client", initials: initialsOf(c.name), to: `/admin/clients/${c.id}`, kind: "Client" }))
    const cn2: Hit[] = roster
      .filter((c) => c.name.toLowerCase().includes(term) || c.title.toLowerCase().includes(term))
      .slice(0, 4)
      .map((c) => ({ id: c.id, label: c.name, sub: c.title, initials: c.initials, to: `/admin/counsellors`, kind: "Counsellor" }))
    return [...cl, ...cn2]
  }, [q, dir.clients, roster])

  useEffect(() => { setActive(0) }, [q])

  const go = (h: Hit) => { nav(h.to); setQ(""); setOpen(false); inputRef.current?.blur() }

  return (
    <div ref={boxRef} className="relative w-full max-w-[360px]"
      onBlur={(e) => { if (!boxRef.current?.contains(e.relatedTarget as Node)) setOpen(false) }}>
      <div className={cn("flex h-9 items-center gap-2 rounded-full border bg-card px-3 transition-colors", open ? "border-brand-400" : "border-border")}>
        <Search className="size-4 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, hits.length - 1)) }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
            else if (e.key === "Enter" && hits[active]) go(hits[active])
            else if (e.key === "Escape") { setOpen(false); inputRef.current?.blur() }
          }}
          placeholder="Search clients, counsellors…"
          className="w-full bg-transparent text-[13px] outline-none placeholder:text-ink-300"
        />
        {!q && <kbd className="hidden rounded border border-border px-1.5 text-[10.5px] font-medium text-ink-300 sm:inline">/</kbd>}
      </div>

      {open && q && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-border bg-background py-1.5 shadow-[var(--shadow-e4)]">
          {hits.length === 0 ? (
            <p className="px-3 py-3 text-[12.5px] text-muted-foreground">No matches for "{q}".</p>
          ) : (
            <>
              {hits.map((h, i) => {
                const firstOfKind = i === 0 || hits[i - 1].kind !== h.kind
                return (
                  <div key={h.kind + h.id}>
                    {firstOfKind && <p className="px-3 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-300">{h.kind === "Client" ? "Clients" : "Counsellors"}</p>}
                    <button
                      tabIndex={-1}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(h)}
                      className={cn("flex w-full items-center gap-2.5 px-3 py-2 text-left", active === i ? "bg-secondary" : "")}
                    >
                      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold", h.kind === "Client" ? "bg-foreground text-background" : "bg-brand-600 text-white")}>{h.initials}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-foreground">{h.label}</p>
                        <p className="truncate text-[11.5px] text-muted-foreground">{h.sub}</p>
                      </div>
                      {active === i && <CornerDownLeft className="size-3.5 text-ink-300" />}
                    </button>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
