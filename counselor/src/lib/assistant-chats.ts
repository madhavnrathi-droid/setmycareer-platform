// Saved assistant conversations — now PER-USER and SERVER-BACKED (≤50 each).
//
// Previously this was a single browser-global localStorage list, so every account
// signed into the same browser saw the same chats (the cross-account leak). It now
// namespaces local storage by the signed-in user AND mirrors to the server
// (app_chats via /api/cloud), so each counsellor sees only their own chats and they
// follow them across devices. The external-store API (subscribe/snapshot via
// useSyncExternalStore) is unchanged, so consumers don't change.

import { useSyncExternalStore } from "react"
import type { UIMessage } from "ai"
import {
  identityScope, onIdentityChange,
  cloudChatsList, cloudChatUpsert, cloudChatRemove, cloudChatsClear,
} from "./cloud"

export interface StoredChat {
  id: string
  title: string
  messages: UIMessage[]
  createdAt: number
  updatedAt: number
}

export const MAX_CHATS = 50
const BASE = "smc.assistant.chats"

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

function persistLocal() {
  try { localStorage.setItem(lsKey(), JSON.stringify(chats)) } catch { /* quota — keep in-memory */ }
}
function emit() { persistLocal(); for (const l of listeners) l() }

// Pull this user's chats from the server (source of truth across devices).
async function hydrate() {
  if (!scope) return
  const rows = await cloudChatsList()
  if (!rows) return // offline / not configured → keep local
  chats = rows
    .map((r) => ({
      id: r.id,
      title: r.title || "New chat",
      messages: (Array.isArray(r.messages) ? r.messages : []) as UIMessage[],
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

/** Newest-first. */
export function listChats(): StoredChat[] {
  return [...chats].sort((a, b) => b.updatedAt - a.updatedAt)
}
export function getChat(id: string): StoredChat | undefined {
  return chats.find((c) => c.id === id)
}
export function canCreate(): boolean {
  return chats.length < MAX_CHATS
}
export function saveChat(c: StoredChat): void {
  chats = chats.some((x) => x.id === c.id) ? chats.map((x) => (x.id === c.id ? c : x)) : [c, ...chats]
  emit()
  void cloudChatUpsert({
    id: c.id, title: c.title, messages: c.messages,
    created_at: new Date(c.createdAt).toISOString(),
    updated_at: new Date(c.updatedAt).toISOString(),
  })
}
export function deleteChat(id: string): void {
  const before = chats.length
  chats = chats.filter((c) => c.id !== id)
  if (chats.length !== before) { emit(); void cloudChatRemove(id) }
}
/** Bulk delete — clears every saved chat for this user (local + server). */
export function clearAllChats(): void {
  if (chats.length === 0) return
  chats = []
  emit()
  void cloudChatsClear()
}

/** A short, human title from the first user message. */
export function titleFrom(messages: UIMessage[]): string {
  const first = messages.find((m) => m.role === "user")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const text = first ? (first.parts as any[]).filter((p) => p.type === "text").map((p) => p.text).join(" ") : ""
  const clean = text.trim().replace(/\s+/g, " ")
  return clean ? (clean.length > 48 ? clean.slice(0, 48) + "…" : clean) : "New chat"
}

/** Reactive, newest-first list. */
export function useChats(): StoredChat[] {
  useSyncExternalStore(subscribe, snapshot, snapshot)
  return listChats()
}
