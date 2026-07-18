import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import {
  Plus, Paperclip, ArrowUp, Trash2, X, Sparkles, AudioLines, FileText, CalendarDays, Mic, AtSign,
  PanelLeft, PanelLeftClose, Download,
} from "lucide-react"
import { toast } from "sonner"
import { LogoMark } from "@/components/brand/Logo"
import { MessageParts } from "@/components/assistant/MessageParts"
import { buildKnowledge, type MentionClient } from "@/lib/assistant-knowledge"
import { useCounsellorBrief } from "@/lib/counsellor-brief"
import {
  useChats, getChat, saveChat, deleteChat, canCreate, titleFrom, MAX_CHATS, type StoredChat,
} from "@/lib/assistant-chats"
import { exportChatPdf, exportAllChatsPdf } from "@/lib/chat-pdf"
import { counselor } from "@/lib/mock"
import { useSession } from "@/lib/auth-store"
import { cn } from "@/lib/utils"

const fmtRel = (ts: number) => {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return "now"
  const m = Math.floor(s / 60); if (m < 60) return `${m}m`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h`
  const d = Math.floor(h / 24); if (d < 7) return `${d}d`
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" })
}

/* ── full-screen Compass assistant ──────────────────────────────────────── */

export function Assistant() {
  const nav = useNavigate()
  const session = useSession()
  const firstName = (session?.name ?? counselor.name).replace(/^(dr|mr|mrs|ms|prof|miss)\.?\s+/i, "").trim().split(/\s+/)[0] || "there"
  // the counsellor's LIVE account — real caseload, mention list, and today's real
  // sessions — sourced from the same live-queries cache the Clients page uses.
  const { caseload, mentionClients, counselorName, today } = useCounsellorBrief()
  const chats = useChats()
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/assistant" }), [])
  const { messages, sendMessage, status, error, setMessages, regenerate } = useChat({ transport })
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [railOpen, setRailOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)
  const autoRetryRef = useRef<number>(-1)

  const busy = status === "submitted" || status === "streaming"

  // Resilience: a transient model error (usually a momentary rate-limit) should
  // recover on its own. On error, auto-retry ONCE after a short backoff before
  // the counsellor ever sees a failure — keyed to the turn so it can't loop.
  useEffect(() => {
    if (status !== "error") return
    const turn = messages.length
    if (autoRetryRef.current === turn) return
    autoRetryRef.current = turn
    const t = setTimeout(() => { void regenerate() }, 2500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, messages.length])

  // persist the conversation when a turn settles (incl. a failed turn, so the
  // user's question survives an error and isn't lost on navigate/new-chat)
  useEffect(() => {
    if ((status !== "ready" && status !== "error") || messages.length === 0) return
    const id = currentId ?? crypto.randomUUID()
    if (!currentId) setCurrentId(id)
    const existing = getChat(id)
    saveChat({
      id,
      title: existing?.title ?? titleFrom(messages),
      messages,
      createdAt: existing?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  // pin to newest as it streams
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, status])

  const send = useCallback(async (text: string, files: { name: string; text: string }[] = []) => {
    const t = text.trim()
    if (!t || busy) return
    if (!currentId && !canCreate()) {
      toast("You've reached 50 saved chats — delete one to start a new conversation.")
      return
    }
    // build the LIVE brief: caseload roster + a deep dossier for any @mentioned client
    const { knowledge, primaryClient } = await buildKnowledge(t, { caseload, counselorName })
    const fileBrief = files.length
      ? `\n\nATTACHED FILES (read these as context):\n${files.map((f) => `--- ${f.name} ---\n${f.text}`).join("\n\n")}`
      : ""
    const display = files.length ? `${files.map((f) => `📎 ${f.name}`).join("  ")}\n${t}` : t
    sendMessage(
      { text: display },
      { body: { context: { route: "/assistant", screen: "assistant", knowledge: knowledge + fileBrief, clientName: primaryClient, today } } },
    )
  }, [busy, currentId, sendMessage, caseload, counselorName, today])

  // Handoff from other screens (the Career Terminal's "Ask" chips): a prompt
  // left in sessionStorage is sent once on arrival, then cleared.
  const handedOff = useRef(false)
  useEffect(() => {
    if (handedOff.current) return
    let prompt: string | null = null
    try { prompt = sessionStorage.getItem("smc.assistant.prompt"); sessionStorage.removeItem("smc.assistant.prompt") } catch { /* private mode */ }
    if (prompt?.trim()) { handedOff.current = true; void send(prompt) }
  }, [send])

  const newChat = () => {
    if (!canCreate()) { toast(`You've reached ${MAX_CHATS} saved chats — delete one to start a new conversation.`); return }
    setMessages([]); setCurrentId(null)
  }
  const openChat = (c: StoredChat) => { setMessages(c.messages); setCurrentId(c.id) }
  const removeChat = (id: string) => {
    deleteChat(id)
    if (id === currentId) { setMessages([]); setCurrentId(null) }
  }

  return (
    <div className="flex h-full min-h-[560px]">
      {railOpen && (
        <HistoryRail
          chats={chats} currentId={currentId} onNew={newChat} onOpen={openChat} onDelete={removeChat}
          onClose={() => setRailOpen(false)}
        />
      )}

      <main className="flex min-w-0 flex-1 flex-col bg-canvas">
        {/* header */}
        <div className="flex shrink-0 items-center gap-2.5 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
          {!railOpen && (
            <button
              onClick={() => setRailOpen(true)}
              aria-label="Show chats"
              className="hidden size-8 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground md:grid"
            >
              <PanelLeft className="size-[18px] stroke-[1.5]" />
            </button>
          )}
          <div className="min-w-0">
            <div className="text-[13px] font-medium leading-tight">Compass</div>
            <div className="text-[11px] leading-tight text-muted-foreground">Knows your caseload, methodology &amp; account</div>
          </div>
          <span className="ml-auto hidden items-center gap-1 rounded-full bg-secondary px-2 py-1 text-[10.5px] text-ink-500 sm:inline-flex">
            <AtSign className="size-3 stroke-[1.75]" /> type @ to ask about a client
          </span>
        </div>

        {/* transcript */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-6 py-6">
            {messages.length === 0 ? (
              <EmptyState firstName={firstName} onPrompt={(p) => send(p)} onNav={nav} />
            ) : (
              <div className="flex flex-col gap-5">
                {messages.map((m) => <Turn key={m.id} m={m} />)}
                {status === "submitted" && (
                  <div className="flex items-center gap-1.5 text-muted-foreground" aria-label="Thinking">
                    <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.2s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-ink-300 [animation-delay:-0.1s]" />
                    <span className="size-1.5 animate-bounce rounded-full bg-ink-300" />
                  </div>
                )}
                {status === "error" && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-warn-100 px-3 py-2 text-[12.5px] text-warn-600">
                    <span>{error?.message || "That didn't go through — retrying automatically…"}</span>
                    <button onClick={() => regenerate()} className="font-medium underline">Retry now</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* composer */}
        <div className="shrink-0 border-t border-border bg-background/80 px-6 py-3 backdrop-blur">
          <div className="mx-auto w-full max-w-3xl">
            <Composer onSubmit={send} busy={busy} clients={mentionClients} />
            <p className="mt-1.5 px-1 text-center text-[10.5px] text-ink-300">
              Compass can see your caseload and how each score is built. It defers clinical &amp; financial calls to you.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ── history rail ───────────────────────────────────────────────────────── */

function HistoryRail({
  chats, currentId, onNew, onOpen, onDelete, onClose,
}: {
  chats: StoredChat[]; currentId: string | null
  onNew: () => void; onOpen: (c: StoredChat) => void; onDelete: (id: string) => void; onClose: () => void
}) {
  const full = chats.length >= MAX_CHATS
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar md:flex">
      <div className="flex items-center justify-between px-3 py-3">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            aria-label="Hide chats"
            className="grid size-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-secondary hover:text-foreground"
          >
            <PanelLeftClose className="size-[16px] stroke-[1.5]" />
          </button>
          <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-ink-300">Chats</span>
        </div>
        <div className="flex items-center gap-1.5">
          {chats.length > 0 && (
            <button
              onClick={() => exportAllChatsPdf(chats)}
              aria-label="Export all chats to PDF"
              title="Export all chats to PDF"
              className="grid size-7 place-items-center rounded-md text-ink-400 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Download className="size-[15px] stroke-[1.5]" />
            </button>
          )}
          <span className={cn("text-[10.5px] tabular-nums", full ? "text-warn-600" : "text-ink-300")}>{chats.length}/{MAX_CHATS}</span>
        </div>
      </div>
      <div className="px-3">
        <button
          onClick={onNew}
          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-foreground text-[12.5px] font-medium text-background transition-opacity hover:opacity-90"
        >
          <Plus className="size-4 stroke-[2]" /> New chat
        </button>
        {full && <p className="mt-1.5 text-[10.5px] leading-snug text-warn-600">Limit reached — delete a chat to start a new one.</p>}
      </div>
      <div className="mt-2 flex-1 overflow-y-auto px-2 pb-3">
        {chats.length === 0 ? (
          <p className="px-2 pt-3 text-[12px] leading-relaxed text-muted-foreground">Your saved conversations appear here.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {chats.map((c) => (
              <li key={c.id}>
                <div
                  className={cn(
                    "group flex items-center gap-2 rounded-lg px-2.5 py-2 transition-colors",
                    c.id === currentId ? "bg-card" : "hover:bg-secondary",
                  )}
                >
                  <button onClick={() => onOpen(c)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[12.5px] font-medium text-foreground">{c.title}</div>
                    <div className="text-[10.5px] text-ink-300">{fmtRel(c.updatedAt)}</div>
                  </button>
                  <button
                    onClick={() => exportChatPdf(c)}
                    aria-label="Export chat to PDF"
                    title="Export to PDF"
                    className="grid size-6 shrink-0 place-items-center rounded-md text-ink-300 opacity-0 transition-all hover:bg-secondary hover:text-foreground group-hover:opacity-100"
                  >
                    <Download className="size-3.5 stroke-[1.5]" />
                  </button>
                  <button
                    onClick={() => onDelete(c.id)}
                    aria-label="Delete chat"
                    className="grid size-6 shrink-0 place-items-center rounded-md text-ink-300 opacity-0 transition-all hover:bg-risk-100 hover:text-risk-600 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5 stroke-[1.5]" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  )
}

/* ── one turn ───────────────────────────────────────────────────────────── */

function Turn({ m }: { m: UIMessage }) {
  const isUser = m.role === "user"
  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      {!isUser && (
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-ink-400">
          <span className="grid size-4 place-items-center text-foreground">
            <LogoMark size={14} className="text-foreground" />
          </span>
          Compass
        </div>
      )}
      <div
        className={cn(
          "text-[13.5px] leading-relaxed",
          isUser
            ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-foreground px-3.5 py-2 text-background"
            : "w-full max-w-none text-foreground [&_p]:mb-2 last:[&_p]:mb-0",
        )}
      >
        <MessageParts m={m} />
      </div>
    </div>
  )
}

/* ── empty state ────────────────────────────────────────────────────────── */

const PROMPTS = [
  "Summarise my day",
  "Who needs my attention right now?",
  "Explain how the career index is built",
  "@ — ask about a specific client",
]
const TOOLS: { label: string; icon: React.ElementType; to?: string; prompt?: string }[] = [
  { label: "Record a session", icon: Mic, prompt: "Start a recording" },
  { label: "Look up transcripts", icon: AudioLines, to: "/transcripts" },
  { label: "New report", icon: FileText, to: "/reports/new" },
  { label: "Open calendar", icon: CalendarDays, to: "/calendar" },
]

function EmptyState({ firstName, onPrompt, onNav }: { firstName: string; onPrompt: (p: string) => void; onNav: (to: string) => void }) {
  const first = firstName
  return (
    <div className="flex flex-col items-center gap-6 pt-[8vh] text-center">
      <span className="grid size-14 place-items-center text-foreground">
        <LogoMark size={46} className="text-foreground" />
      </span>
      <div>
        <h1 className="font-display text-[26px] font-extralight tracking-tight">Hello, {first}. How can I help?</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Ask anything about your caseload, a client, or how the numbers are built. Type <span className="font-medium text-foreground">@</span> to pull up a client.
        </p>
      </div>

      <div className="flex w-full max-w-xl flex-col gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => p.startsWith("@") ? undefined : onPrompt(p)}
            className={cn(
              "rounded-xl border border-hairline bg-card px-4 py-2.5 text-left text-[13px] text-ink-600 transition-colors",
              p.startsWith("@") ? "cursor-default text-ink-400" : "hover:border-ink-200 hover:bg-secondary hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {TOOLS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.label}
              onClick={() => (t.to ? onNav(t.to) : t.prompt ? onPrompt(t.prompt) : undefined)}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-ink-600 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <Icon className="size-3.5 stroke-[1.5]" /> {t.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ── composer (textarea + @mention + file upload) ───────────────────────── */

function Composer({ onSubmit, busy, clients }: { onSubmit: (text: string, files: { name: string; text: string }[]) => void; busy: boolean; clients: MentionClient[] }) {
  const [text, setText] = useState("")
  const [files, setFiles] = useState<{ name: string; text: string }[]>([])
  const [mention, setMention] = useState<{ query: string; start: number; index: number } | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const matches = useMemo(() => {
    if (!mention) return []
    const q = mention.query.toLowerCase()
    return clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6)
  }, [mention, clients])

  const grow = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = Math.min(el.scrollHeight, 160) + "px" }

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value
    setText(v)
    grow(e.target)
    const caret = e.target.selectionStart ?? v.length
    const m = v.slice(0, caret).match(/@(\w*)$/)
    setMention(m ? { query: m[1], start: caret - m[0].length, index: 0 } : null)
  }

  const pick = (name: string) => {
    if (!mention) return
    const el = taRef.current
    // splice over the matched "@query" token (independent of where the caret
    // currently sits — a click/arrow move doesn't fire onChange, so the live
    // caret can diverge from mention.start and corrupt the text)
    const tokenEnd = mention.start + 1 + mention.query.length
    const next = text.slice(0, mention.start) + "@" + name + " " + text.slice(tokenEnd)
    setText(next)
    setMention(null)
    requestAnimationFrame(() => {
      if (el) {
        const pos = mention.start + name.length + 2
        el.focus(); el.setSelectionRange(pos, pos); grow(el)
      }
    })
  }

  const submit = () => {
    if (!text.trim() || busy) return
    onSubmit(text, files)
    setText(""); setFiles([]); setMention(null)
    if (taRef.current) taRef.current.style.height = "auto"
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mention && matches.length) {
      if (e.key === "ArrowDown") { e.preventDefault(); setMention({ ...mention, index: (mention.index + 1) % matches.length }); return }
      if (e.key === "ArrowUp") { e.preventDefault(); setMention({ ...mention, index: (mention.index - 1 + matches.length) % matches.length }); return }
      if (e.key === "Enter" || e.key === "Tab") { e.preventDefault(); pick(matches[mention.index].name); return }
      if (e.key === "Escape") { e.preventDefault(); setMention(null); return }
    }
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return
    const out: { name: string; text: string }[] = []
    for (const f of Array.from(list)) {
      try { out.push({ name: f.name, text: (await f.text()).slice(0, 6000) }) } catch { /* skip unreadable */ }
    }
    setFiles((prev) => [...prev, ...out])
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div className="relative">
      {/* @mention menu */}
      {mention && matches.length > 0 && (
        <div className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-xl border border-hairline bg-[var(--surface-frost-strong)] p-1 shadow-[var(--shadow-float)] backdrop-blur-xl">
          <div className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-ink-300">Clients</div>
          {matches.map((c, i) => (
            <button
              key={c.id}
              onMouseEnter={() => setMention((mn) => (mn ? { ...mn, index: i } : mn))}
              onClick={() => pick(c.name)}
              className={cn("flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left", i === mention.index ? "bg-secondary" : "hover:bg-secondary/60")}
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-ink-100 text-[9px] font-medium text-ink-700">{c.initials}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[12.5px] font-medium text-foreground">{c.name}</span>
                <span className="block truncate text-[10.5px] text-muted-foreground">{c.headline}</span>
              </span>
              {(c.riskFlag === "moderate" || c.riskFlag === "high") && <span className="size-1.5 shrink-0 rounded-full bg-risk-500" />}
            </button>
          ))}
        </div>
      )}

      {/* attachment chips */}
      {files.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {files.map((f, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-ink-600">
              <Paperclip className="size-3 stroke-[1.5]" /> {f.name}
              <button onClick={() => setFiles((p) => p.filter((_, j) => j !== i))} aria-label="Remove file" className="text-ink-300 hover:text-foreground">
                <X className="size-3 stroke-[2]" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-e1)] focus-within:ring-2 focus-within:ring-ring">
        <input
          ref={fileRef} type="file" multiple hidden
          accept=".txt,.md,.markdown,.csv,.json,.vtt,.srt,.log,.rtf,text/*"
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          aria-label="Attach files"
          title="Attach a document or transcript"
          className="grid size-9 shrink-0 place-items-center rounded-xl text-ink-400 transition-colors hover:bg-secondary hover:text-foreground"
        >
          <Paperclip className="size-[18px] stroke-[1.5]" />
        </button>
        <textarea
          ref={taRef}
          value={text}
          onChange={onChange}
          onKeyDown={onKeyDown}
          rows={1}
          placeholder="Ask Compass anything…  (@ for a client)"
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-[13.5px] outline-none placeholder:text-ink-300"
        />
        <button
          onClick={submit}
          disabled={!text.trim() || busy}
          aria-label="Send"
          className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background transition-opacity hover:opacity-90 disabled:opacity-30"
        >
          {busy ? <Sparkles className="size-4 animate-pulse stroke-[1.75]" /> : <ArrowUp className="size-4 stroke-[2]" />}
        </button>
      </div>
    </div>
  )
}
