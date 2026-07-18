// A single 1:1 message thread, rendered from the SHARED portal store so the exact
// same component drives both ends (client portal + counsellor inbox), syncing live.
//
// Beyond text it supports: inline image/file attachments (data-URL, ≤1.5MB), and
// "@" or "/" to tag an account resource — a booked session, a completed test, or a
// shared report — rendered as a rich card both sides can open.

import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { Send, Paperclip, X, CalendarClock, ClipboardCheck, FileText, AtSign, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import {
  useThread, sendMessage, type PortalMessage, type ChatAttachment, type ChatRef,
} from "@/portal/portal-store"
import { useAccountResources } from "@/portal/chat-resources"
import { cn } from "@/lib/utils"

const MAX_FILE = 1.5 * 1024 * 1024 // 1.5MB inline cap
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
const fmtSize = (n: number) => (n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`)

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return "Today"
  if (new Date(today.getTime() - 86400000).toDateString() === d.toDateString()) return "Yesterday"
  return d.toLocaleDateString([], { day: "numeric", month: "long" })
}

const REF_ICON = { session: CalendarClock, test: ClipboardCheck, report: FileText } as const
const REF_LABEL = { session: "Session", test: "Assessment", report: "Report" } as const

/** A tagged-resource card inside a message. */
function RefCard({ r, mine }: { r: ChatRef; mine: boolean }) {
  const Icon = REF_ICON[r.kind]
  const body = (
    <div className={cn(
      "flex items-center gap-2.5 rounded-xl border px-3 py-2",
      mine ? "border-white/25 bg-white/10" : "border-border bg-background",
    )}>
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", mine ? "bg-white/15" : "bg-secondary")}>
        <Icon className={cn("size-4", mine ? "text-white" : "text-ink-500")} />
      </span>
      <div className="min-w-0">
        <div className={cn("truncate text-[12.5px] font-medium", mine ? "text-white" : "text-foreground")}>{r.title}</div>
        <div className={cn("text-[10.5px]", mine ? "text-white/70" : "text-muted-foreground")}>{REF_LABEL[r.kind]}{r.meta ? ` · ${r.meta}` : ""}</div>
      </div>
      {r.href && <ExternalLink className={cn("ml-auto size-3.5 shrink-0", mine ? "text-white/70" : "text-ink-300")} />}
    </div>
  )
  return r.href && r.href.startsWith("/") ? <Link to={r.href} className="block">{body}</Link>
    : r.href ? <a href={r.href} target="_blank" rel="noreferrer" className="block">{body}</a> : body
}

function AttachmentView({ a, mine }: { a: ChatAttachment; mine: boolean }) {
  if (a.kind === "image") {
    return <a href={a.dataUrl} target="_blank" rel="noreferrer" className="block"><img src={a.dataUrl} alt={a.name} className="max-h-56 max-w-full rounded-xl object-cover" /></a>
  }
  return (
    <a href={a.dataUrl} download={a.name} className={cn("flex items-center gap-2.5 rounded-xl border px-3 py-2", mine ? "border-white/25 bg-white/10" : "border-border bg-background")}>
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-lg", mine ? "bg-white/15" : "bg-secondary")}><FileText className={cn("size-4", mine ? "text-white" : "text-ink-500")} /></span>
      <div className="min-w-0">
        <div className={cn("truncate text-[12.5px] font-medium", mine ? "text-white" : "text-foreground")}>{a.name}</div>
        <div className={cn("text-[10.5px]", mine ? "text-white/70" : "text-muted-foreground")}>{fmtSize(a.size)}</div>
      </div>
    </a>
  )
}

// detect an active @ or / mention being typed at the end of the draft
function activeTrigger(text: string): { query: string; start: number } | null {
  const m = text.match(/(^|\s)([@/])([^\s@/]*)$/)
  if (!m || m.index == null) return null
  return { query: m[3].toLowerCase(), start: m.index + m[1].length }
}

export function ChatThread({
  clientId, counsellorId, me, otherName, className, placeholder,
}: {
  clientId: string
  counsellorId: string
  me: "client" | "counsellor"
  otherName: string
  className?: string
  placeholder?: string
}) {
  const messages = useThread(clientId, counsellorId)
  const resources = useAccountResources(clientId)
  const [draft, setDraft] = useState("")
  const [pendingAtt, setPendingAtt] = useState<ChatAttachment[]>([])
  const [pendingRefs, setPendingRefs] = useState<ChatRef[]>([])
  const [picker, setPicker] = useState<{ query: string; start: number } | null>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }) }, [messages.length])

  const filtered = useMemo(() => {
    if (!picker) return []
    const q = picker.query
    return resources.filter((r) => !q || r.title.toLowerCase().includes(q) || r.kind.includes(q)).slice(0, 6)
  }, [picker, resources])

  const onDraft = (v: string) => { setDraft(v); setPicker(activeTrigger(v)) }

  const pickResource = (r: ChatRef) => {
    if (picker) setDraft((d) => d.slice(0, picker.start).replace(/\s+$/, ""))
    setPendingRefs((p) => (p.some((x) => x.kind === r.kind && x.refId === r.refId) ? p : [...p, r]))
    setPicker(null)
  }

  const onFiles = (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE) { toast.error(`${f.name} is too large — max 1.5 MB inline.`); continue }
      const reader = new FileReader()
      reader.onload = () => setPendingAtt((p) => [...p, { kind: f.type.startsWith("image/") ? "image" : "file", name: f.name, mime: f.type, size: f.size, dataUrl: String(reader.result) }])
      reader.readAsDataURL(f)
    }
    if (fileRef.current) fileRef.current.value = ""
  }

  const send = () => {
    const t = draft.trim()
    if (!t && pendingAtt.length === 0 && pendingRefs.length === 0) return
    sendMessage(clientId, counsellorId, me, t, { attachments: pendingAtt, refs: pendingRefs })
    setDraft(""); setPendingAtt([]); setPendingRefs([]); setPicker(null)
  }

  let lastDay = ""

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      <div className="flex-1 space-y-1 overflow-y-auto px-1 py-2">
        {messages.length === 0 && (
          <div className="grid h-full place-items-center px-6 text-center">
            <p className="max-w-[40ch] text-[13px] text-muted-foreground">No messages yet. Say hello, share a file, or tag a session, test or report with <kbd className="rounded bg-muted px-1">@</kbd> — {otherName} usually replies within a day.</p>
          </div>
        )}
        {messages.map((m: PortalMessage) => {
          const mine = m.from === me
          const day = dayLabel(m.ts)
          const showDay = day !== lastDay
          lastDay = day
          const onlyMedia = !m.text && ((m.attachments?.length ?? 0) > 0 || (m.refs?.length ?? 0) > 0)
          return (
            <div key={m.id}>
              {showDay && <div className="my-3 flex justify-center"><span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">{day}</span></div>}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn(
                  "max-w-[80%] space-y-2 rounded-2xl px-3 py-2 text-[13.5px] leading-relaxed sm:max-w-[68%]",
                  mine ? "rounded-br-md bg-brand-600 text-white" : "rounded-bl-md border border-border bg-card text-foreground",
                  onlyMedia && "bg-transparent p-0 sm:max-w-[68%]",
                )}>
                  {m.refs?.map((r, i) => <RefCard key={`r${i}`} r={r} mine={mine && !onlyMedia} />)}
                  {m.attachments?.map((a, i) => <AttachmentView key={`a${i}`} a={a} mine={mine && !onlyMedia} />)}
                  {m.text && <p className="whitespace-pre-wrap">{m.text}</p>}
                  {!onlyMedia && <span className={cn("block text-right text-[10.5px]", mine ? "text-white/70" : "text-ink-300")}>{fmtTime(m.ts)}</span>}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>

      {/* composer */}
      <div className="relative border-t border-border px-1 pt-3">
        {/* @ / picker */}
        {picker && filtered.length > 0 && (
          <div className="absolute bottom-full left-1 z-20 mb-2 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-e3)]">
            <div className="border-b border-border px-3 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.1em] text-ink-300">Tag a resource</div>
            {filtered.map((r) => {
              const Icon = REF_ICON[r.kind]
              return (
                <button key={`${r.kind}-${r.refId}`} onClick={() => pickResource(r)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-secondary">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-secondary"><Icon className="size-4 text-ink-500" /></span>
                  <div className="min-w-0">
                    <div className="truncate text-[12.5px] font-medium text-foreground">{r.title}</div>
                    <div className="text-[10.5px] text-muted-foreground">{REF_LABEL[r.kind]}{r.meta ? ` · ${r.meta}` : ""}</div>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* pending attachments + refs */}
        {(pendingAtt.length > 0 || pendingRefs.length > 0) && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingRefs.map((r, i) => {
              const Icon = REF_ICON[r.kind]
              return (
                <span key={`pr${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11.5px]">
                  <Icon className="size-3.5 text-ink-500" /> {r.title}
                  <button onClick={() => setPendingRefs((p) => p.filter((_, j) => j !== i))} className="text-ink-300 hover:text-foreground"><X className="size-3" /></button>
                </span>
              )
            })}
            {pendingAtt.map((a, i) => (
              <span key={`pa${i}`} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11.5px]">
                {a.kind === "image" ? <img src={a.dataUrl} alt="" className="size-4 rounded object-cover" /> : <FileText className="size-3.5 text-ink-500" />}
                <span className="max-w-[140px] truncate">{a.name}</span>
                <button onClick={() => setPendingAtt((p) => p.filter((_, j) => j !== i))} className="text-ink-300 hover:text-foreground"><X className="size-3" /></button>
              </span>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(e) => onFiles(e.target.files)} />
          <button onClick={() => fileRef.current?.click()} title="Attach a file" aria-label="Attach a file" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-400 transition hover:bg-secondary hover:text-foreground">
            <Paperclip className="size-4.5 stroke-[1.75]" />
          </button>
          <button onClick={() => onDraft((draft.endsWith(" ") || !draft ? draft : draft + " ") + "@")} title="Tag a resource" aria-label="Tag a resource" className="grid size-10 shrink-0 place-items-center rounded-xl text-ink-400 transition hover:bg-secondary hover:text-foreground">
            <AtSign className="size-4.5 stroke-[1.75]" />
          </button>
          <textarea
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !picker) { e.preventDefault(); send() } if (e.key === "Escape") setPicker(null) }}
            rows={1}
            placeholder={placeholder ?? `Message ${otherName}…  (@ to tag a session, test or report)`}
            className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-card px-3.5 py-2.5 text-[13.5px] outline-none placeholder:text-ink-300 focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button onClick={send} disabled={!draft.trim() && pendingAtt.length === 0 && pendingRefs.length === 0} className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40" aria-label="Send message">
            <Send className="size-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
