// ─────────────────────────────────────────────────────────────────────────────
// makeCloudPersisted — a drop-in upgrade for the old per-file `makePersisted`.
//
// Same surface (get / set / subscribe), but:
//   • localStorage is NAMESPACED by the signed-in user (key::app:userId), so two
//     accounts in the same browser never read each other's data — this is the fix
//     for the cross-account leak.
//   • the value WRITES THROUGH to the server (app_state) and HYDRATES from it, so
//     a user's data follows them across devices. The server is the source of truth.
//   • on login / logout / account switch it re-scopes and re-hydrates instantly.
//
// When signed out, or when the cloud store isn't reachable, it degrades to a plain
// local store under the base key — the app keeps working offline.
// ─────────────────────────────────────────────────────────────────────────────

import { identityScope, onIdentityChange, cloudStateGetAll, cloudStateSet } from "./cloud"

export interface CloudPersisted<T> {
  get: () => T
  set: (next: T) => void
  subscribe: (l: () => void) => () => void
}

export function makeCloudPersisted<T>(key: string, initial: T): CloudPersisted<T> {
  let scope = identityScope()
  const lsKey = (s: string | null) => (s ? `${key}::${s}` : key)
  const readLS = (s: string | null): T => {
    try {
      const raw = localStorage.getItem(lsKey(s))
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  }

  let value: T = readLS(scope)
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  const persistLocal = () => {
    try { localStorage.setItem(lsKey(scope), JSON.stringify(value)) } catch { /* quota / private mode */ }
  }

  let pushTimer: ReturnType<typeof setTimeout> | null = null
  const pushCloud = () => {
    if (!scope) return
    if (pushTimer) clearTimeout(pushTimer)
    // debounce so rapid sets coalesce into one write
    pushTimer = setTimeout(() => { void cloudStateSet(key, value) }, 400)
  }

  // Pull the server copy (source of truth across devices). On first sight the
  // server may not have this key yet → seed it with whatever the user has locally.
  const hydrate = async () => {
    if (!scope) return
    const all = await cloudStateGetAll()
    if (!all) return
    if (key in all && all[key] != null) {
      value = all[key] as T
      persistLocal()
      emit()
    } else if (JSON.stringify(value) !== JSON.stringify(initial)) {
      pushCloud()
    }
  }

  const rebind = () => {
    scope = identityScope()
    value = readLS(scope)
    emit()
    void hydrate()
  }

  if (typeof window !== "undefined") {
    window.addEventListener("storage", (e) => {
      if (e.key === lsKey(scope)) { value = readLS(scope); emit() }
    })
    onIdentityChange(rebind)
    void hydrate()
  }

  return {
    get: () => value,
    set: (next: T) => { value = next; persistLocal(); emit(); pushCloud() },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l) } },
  }
}
