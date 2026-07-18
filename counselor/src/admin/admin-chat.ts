// One shared Mission Control conversation across BOTH admin AI surfaces — the
// floating bar and the full-screen copilot. localStorage-backed + reactive, so a
// thread you start in the bar continues on the full page and vice-versa (and
// survives a reload / syncs across tabs). Both surfaces load it on mount, persist
// when a turn settles, and live-sync from each other while idle.

import { useEffect, useRef } from "react"
import type { UIMessage } from "ai"
import { makeCloudPersisted } from "@/lib/cloud-store"

// Per-admin + server-backed: namespaced by the signed-in admin and mirrored to
// app_state, so two admins in the same browser never share a thread and it
// follows an admin across devices (same fix as the counsellor/client chats).
const store = makeCloudPersisted<UIMessage[]>("smc.admin.chat", [])

export function getAdminChat(): UIMessage[] { return store.get() }
export function setAdminChat(msgs: UIMessage[]): void { store.set(msgs) }
function subscribe(l: () => void): () => void { return store.subscribe(l) }

// cheap signature so we only re-sync on a real change (and don't fight streaming)
function sig(m: UIMessage[]): string {
  const last = m[m.length - 1]
  const lastLen = last ? last.parts.reduce((s, p) => s + (p.type === "text" ? p.text.length : 0), 0) : 0
  return `${m.length}:${last?.id ?? ""}:${lastLen}`
}

/** Wire a useChat instance to the shared store. `onExternal` lets a surface react
 *  to a cross-surface update (e.g. the bar suppressing an auto-pop). */
export function useSharedAdminChat(opts: {
  messages: UIMessage[]
  status: string
  setMessages: (m: UIMessage[]) => void
  onExternal?: () => void
}) {
  const { messages, status, setMessages, onExternal } = opts
  const msgRef = useRef(messages); msgRef.current = messages
  const statusRef = useRef(status); statusRef.current = status
  const setRef = useRef(setMessages); setRef.current = setMessages
  const extRef = useRef(onExternal); extRef.current = onExternal

  // load once + subscribe for live cross-surface sync while idle
  useEffect(() => {
    const stored = getAdminChat()
    if (stored.length && sig(stored) !== sig(msgRef.current)) setRef.current(stored)
    return subscribe(() => {
      if (statusRef.current !== "ready") return // never interrupt a stream
      const s = getAdminChat()
      if (sig(s) !== sig(msgRef.current)) { setRef.current(s); extRef.current?.() }
    })
  }, [])

  // persist when a turn settles (not on every streamed token)
  useEffect(() => {
    if (status === "ready" && messages.length && sig(messages) !== sig(getAdminChat())) setAdminChat(messages)
  }, [status, messages])
}

export function resetAdminChat(): void { setAdminChat([]) }
