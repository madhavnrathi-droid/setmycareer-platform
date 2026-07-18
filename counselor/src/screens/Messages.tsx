// Counsellor inbox — the other end of the client portal's messaging. Reads the
// SAME shared store the portal writes to, so a member's message lands here live
// (across tabs too). Pick a thread on the left, reply on the right; opening a
// thread clears its unread badge.

import { useEffect, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { MessageCircle } from "lucide-react"
import { getClient } from "@/lib/mock"
import { ChatThread } from "@/components/comms/ChatThread"
import { useAllThreads, markThreadSeen, useCounsellorUnread, hydrateInbox } from "@/portal/portal-store"
import { useSession } from "@/lib/auth-store"
import { useNaviClients } from "@/lib/live-queries"
import { cn } from "@/lib/utils"

const fmtTime = (iso: string) => {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" })
}

export function Messages() {
  const { clientId } = useParams()
  const nav = useNavigate()
  const session = useSession()
  const meId = String(session?.userId ?? "")
  // resolve client names from the counsellor's LIVE caseload (fallback to demo personas)
  const { data: caseload } = useNaviClients(session?.userId ?? null)
  const nameMap = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of (Array.isArray(caseload) ? caseload : []) as Record<string, unknown>[]) {
      const id = String(r.user_id ?? r.id ?? ""); const nm = String(r.name ?? "").trim()
      if (id && nm && !m.has(id)) m.set(id, nm)
    }
    return m
  }, [caseload])
  const nameFor = (cid: string) => nameMap.get(cid) ?? getClient(cid)?.name ?? "Member"
  const initialsFor = (cid: string) => {
    const n = nameFor(cid)
    return getClient(cid)?.initials ?? n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase()
  }
  const threads = useAllThreads().filter((t) => t.counsellorId === meId)
  useCounsellorUnread(meId) // subscribe so badges/preview re-render live

  // pull the server-side threads for the recent caseload so the inbox is populated
  useEffect(() => {
    const ids = [...nameMap.keys()]
    if (ids.length) void hydrateInbox(ids, 30)
  }, [nameMap])

  // default selection → newest thread
  const selectedId = clientId ?? threads[0]?.clientId
  const selected = threads.find((t) => t.clientId === selectedId)

  useEffect(() => {
    if (selected) markThreadSeen(selected.threadId)
  }, [selected?.threadId, selected?.last.ts])

  if (threads.length === 0) {
    return (
      <div>
        <header className="mb-6">
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Client communication</p>
          <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Messages</h1>
        </header>
        <div className="grid min-h-[44vh] place-items-center rounded-2xl border border-dashed border-border bg-card">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <span className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <MessageCircle className="size-6" />
            </span>
            <p className="text-[14px] font-medium text-foreground">No messages yet</p>
            <p className="text-[13px] text-muted-foreground">
              When a client messages you from their portal, the conversation appears here in real time.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <header className="mb-4 shrink-0">
        <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">Client communication</p>
        <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Messages</h1>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 md:grid-cols-[300px_1fr]">
        {/* thread list */}
        <aside className="hidden min-h-0 flex-col overflow-y-auto rounded-2xl border border-border bg-card md:flex">
          {threads.map((t) => {
            const active = t.clientId === selectedId
            const preview = (t.last.from === "client" ? "" : "You: ") + t.last.text
            return (
              <button
                key={t.threadId}
                onClick={() => nav(`/messages/${t.clientId}`)}
                className={cn(
                  "flex items-center gap-3 border-b border-border/60 px-3.5 py-3 text-left transition",
                  active ? "bg-brand-50" : "hover:bg-muted/50",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-600 text-[13px] font-semibold text-white">
                  {initialsFor(t.clientId)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[13.5px] font-semibold text-foreground">{nameFor(t.clientId)}</p>
                    <span className="shrink-0 text-[11px] text-ink-300">{fmtTime(t.last.ts)}</span>
                  </div>
                  <p className="truncate text-[12.5px] text-muted-foreground">{preview}</p>
                </div>
              </button>
            )
          })}
        </aside>

        {/* conversation */}
        <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-4">
          {selected && (
            <>
              <div className="mb-2 flex items-center gap-3 border-b border-border pb-3">
                <span className="grid size-10 place-items-center rounded-full bg-brand-600 text-[13px] font-semibold text-white">
                  {initialsFor(selected.clientId)}
                </span>
                <div>
                  <p className="text-[14.5px] font-semibold text-foreground">{nameFor(selected.clientId)}</p>
                  <p className="text-[12px] text-muted-foreground">Client · via portal</p>
                </div>
              </div>
              <ChatThread
                clientId={selected.clientId}
                counsellorId={meId}
                me="counsellor"
                otherName={nameFor(selected.clientId).split(" ")[0]}
              />
            </>
          )}
        </section>
      </div>
    </div>
  )
}
