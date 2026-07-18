import { useSyncExternalStore } from "react"

/* Notification store — bell dropdown overview + left detail panel. A tiny
   external store (like the app's session store) so the bell badge + panels stay
   in sync. Actions are placeholders for now (the panel will grow more). */

export type NotifKind = "review" | "reminder" | "new_client" | "question" | "contradiction" | "report"
export type NotifAction = { id: string; label: string; tone?: "default" | "brand" | "well" | "risk" }

export interface AppNotification {
  id: string
  kind: NotifKind
  title: string
  text: string
  clientName?: string
  clientId?: string
  time: string
  unread: boolean
  actions: NotifAction[]
}

// Notifications start empty — real review/reminder/flag notifications will be
// produced from live activity. No fabricated client notifications.
const SEED: AppNotification[] = []

let items: AppNotification[] = SEED
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function useNotifications(): AppNotification[] {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => items,
    () => items,
  )
}

export function markRead(id: string): void {
  items = items.map((n) => (n.id === id ? { ...n, unread: false } : n))
  emit()
}
export function markAllRead(): void {
  items = items.map((n) => (n.unread ? { ...n, unread: false } : n))
  emit()
}
