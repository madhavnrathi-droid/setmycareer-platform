import { useState } from "react"
import { SendHorizontal, UserPlus, MessageCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { feedItems, type FeedMessage } from "@/lib/dashboard-feed"
import { cn } from "@/lib/utils"

/* Updates & inquiries — a horizontal carousel of new-client updates and
   prospective-client questions (from the public profile), with an inline reply
   chatbox for the selected question. Replies echo for now. */
export function UpdatesCarousel() {
  const [threads, setThreads] = useState<Record<string, FeedMessage[]>>(() =>
    Object.fromEntries(feedItems.filter((f) => f.thread).map((f) => [f.id, f.thread!])),
  )
  const [selected, setSelected] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const sel = feedItems.find((f) => f.id === selected)

  const send = () => {
    if (!draft.trim() || !selected) return
    setThreads((prev) => ({ ...prev, [selected]: [...(prev[selected] ?? []), { from: "me", text: draft.trim() }] }))
    setDraft("")
    toast.success("Reply sent")
  }

  return (
    <section data-reveal className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-medium">Updates &amp; inquiries</h2>
        <span className="text-[12px] tabular-nums text-muted-foreground">{feedItems.length} new</span>
      </div>

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin]">
        {feedItems.map((f) => (
          <div key={f.id} className="flex w-[264px] shrink-0 snap-start flex-col rounded-2xl bg-card p-4 shadow-[var(--shadow-e2)] transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-[var(--shadow-e3)]">
            <div className="flex items-center gap-2">
              <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-[11px] font-medium", f.kind === "new_client" ? "bg-well-100 text-well-600" : "bg-brand-100 text-brand-600")}>
                {f.kind === "new_client" ? <UserPlus className="size-4 stroke-[1.5]" /> : f.initials}
              </span>
              <div className="min-w-0">
                <div className="truncate text-[12.5px] font-medium">{f.who}</div>
                <div className="text-[10.5px] text-ink-300">{f.time}</div>
              </div>
              <span className="ml-auto shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-ink-500">{f.topic}</span>
            </div>
            <p className="mt-2.5 line-clamp-3 flex-1 text-[12.5px] leading-snug text-ink-600">{f.text}</p>
            <div className="mt-3">
              {f.kind === "question" ? (
                <button onClick={() => setSelected(f.id)} className="inline-flex h-7 items-center gap-1 rounded-lg bg-foreground px-2.5 text-[11.5px] font-medium text-background transition-opacity hover:opacity-90">
                  <MessageCircle className="size-3.5 stroke-[1.75]" /> Reply
                </button>
              ) : (
                <button onClick={() => toast("Opening client…")} className="inline-flex h-7 items-center gap-1 rounded-lg border border-border px-2.5 text-[11.5px] font-medium text-ink-600 transition-colors hover:bg-secondary">
                  View <ArrowRight className="size-3.5 stroke-[1.75]" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {sel && (
        <div className="mt-3 rounded-2xl bg-card p-4 shadow-[var(--shadow-e2)]">
          <div className="mb-2.5 flex items-center justify-between">
            <span className="text-[12px] font-medium">Reply · <span className="text-muted-foreground">{sel.topic} · {sel.who}</span></span>
            <button onClick={() => setSelected(null)} className="text-[11px] text-muted-foreground hover:underline">Close</button>
          </div>
          <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
            {(threads[sel.id] ?? []).map((m, i) => (
              <div key={i} className={cn("max-w-[80%] rounded-2xl px-3 py-1.5 text-[12.5px] leading-snug", m.from === "me" ? "ml-auto rounded-br-md bg-foreground text-background" : "rounded-bl-md bg-secondary text-foreground")}>
                {m.text}
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send() } }}
              placeholder="Type a reply…"
              aria-label="Reply"
              className="h-9 flex-1 rounded-xl border border-border bg-background px-3 text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button onClick={send} disabled={!draft.trim()} aria-label="Send reply" className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30">
              <SendHorizontal className="size-4 stroke-[1.75]" />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
