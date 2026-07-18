// Saved AI-guide conversations for the client portal — now PER-USER and
// SERVER-BACKED (≤50 each), so each client sees only their own chats and they
// follow them across devices (fixes the same cross-account leak as the counsellor
// side). The bottom-bar guide and the full AI-guide page share this store, so a
// chat started in the bar shows up in the main guide. External-store API unchanged.

import { useSyncExternalStore } from "react"
import type { UIMessage } from "ai"
import {
  identityScope, onIdentityChange,
  cloudChatsList, cloudChatUpsert, cloudChatRemove, cloudChatsClear,
} from "@/lib/cloud"

export interface StoredChat {
  id: string
  title: string
  messages: UIMessage[]
  /** "bar" = started in the hovering bar, "guide" = the full page. */
  origin: "bar" | "guide"
  createdAt: number
  updatedAt: number
}

export const MAX_CHATS = 50
const BASE = "smc.portal.chats"

let scope = identityScope()
const lsKey = () => (scope ? `${BASE}::${scope}` : BASE)

function load(): StoredChat[] {
  try {
    const raw = localStorage.getItem(lsKey())
    if (!raw) return []
    const v: unknown = JSON.parse(raw)
    if (!Array.isArray(v)) return []
    return v.filter(
      (c): c is StoredChat =>
        !!c && typeof c.id === "string" && Array.isArray(c.messages) && typeof c.updatedAt === "number",
    )
  } catch {
    return []
  }
}

let chats: StoredChat[] = load()
const listeners = new Set<() => void>()

function emit() {
  try { localStorage.setItem(lsKey(), JSON.stringify(chats)) } catch { /* quota — keep in-memory */ }
  for (const l of listeners) l()
}

async function hydrate() {
  if (!scope) return
  const rows = await cloudChatsList()
  if (!rows) return
  chats = rows
    .map((r) => ({
      id: r.id,
      title: r.title || "New chat",
      messages: (Array.isArray(r.messages) ? r.messages : []) as UIMessage[],
      origin: "guide" as const,
      createdAt: Date.parse(r.created_at) || Date.now(),
      updatedAt: Date.parse(r.updated_at) || Date.now(),
    }))
    .slice(0, MAX_CHATS)
  emit()
}

function rebind() {
  scope = identityScope()
  chats = load()
  for (const l of listeners) l()
  void hydrate()
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === lsKey()) { chats = load(); for (const l of listeners) l() } })
  onIdentityChange(rebind)
  void hydrate()
}

function subscribe(cb: () => void) { listeners.add(cb); return () => { listeners.delete(cb) } }
function snapshot(): StoredChat[] { return chats }

export function listChats(): StoredChat[] {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt)
}
export function getChat(id: string): StoredChat | undefined {
  return chats.find((c) => c.id === id)
}
export function canCreate(): boolean {
  return chats.length < MAX_CHATS
}

/** Upsert a conversation. No-op for an empty message list. */
export function saveChat(id: string, messages: UIMessage[], origin: "bar" | "guide"): void {
  if (!messages.length) return
  const now = Date.now()
  const existing = chats.find((c) => c.id === id)
  const chat: StoredChat = {
    id,
    title: titleFrom(messages),
    messages,
    origin: existing?.origin ?? origin,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  chats = existing ? chats.map((c) => (c.id === id ? chat : c)) : [chat, ...chats].slice(0, MAX_CHATS)
  emit()
  void cloudChatUpsert({
    id: chat.id, title: chat.title, messages: chat.messages,
    created_at: new Date(chat.createdAt).toISOString(),
    updated_at: new Date(chat.updatedAt).toISOString(),
  })
}
export function deleteChat(id: string): void {
  const before = chats.length
  chats = chats.filter((c) => c.id !== id)
  if (chats.length !== before) { emit(); void cloudChatRemove(id) }
}
/** Bulk delete — clears every saved chat for this client (local + server). */
export function clearAllChats(): void {
  if (chats.length === 0) return
  chats = []
  emit()
  void cloudChatsClear()
}

export function titleFrom(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = first ? (first.parts as any[]).filter((p) => p.type === "text").map((p) => p.text).join(" ") : ""
  const clean = text.trim().replace(/\s+/g, " ")
  return clean ? (clean.length > 44 ? clean.slice(0, 44) + "…" : clean) : "New chat"
}

export function useChats(): StoredChat[] {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return listChats()
}
