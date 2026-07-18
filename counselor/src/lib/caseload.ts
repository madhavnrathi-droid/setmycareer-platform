// One row per client, derived live from the signed-in counsellor's caseload
// (getClientsByNavi). The backend returns many sold-service rows per client; we
// fold them into a clean {id, name, initials} list for pickers, search and name
// resolution — so every counsellor surface offers their REAL clients, never demo
// personas.
import { useMemo } from "react"
import { useNaviClients } from "@/lib/live-queries"
import { useSession } from "@/lib/auth-store"

export interface CaseloadClient {
  id: string
  name: string
  initials: string
  packages: string[]
}

const clean = (v?: unknown) => {
  const s = v == null ? "" : String(v).trim()
  return s && s !== "None" && s !== "null" ? s : undefined
}
const initialsOf = (name: string) => {
  const p = name.trim().split(/\s+/).filter(Boolean)
  return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—"
}

/** Deduped client list for a given navigator id. */
export function useCaseloadClientsFor(naviId?: number | string | null): { clients: CaseloadClient[]; loading: boolean; error?: string } {
  const { data, loading, error } = useNaviClients(naviId ?? null)
  const clients = useMemo(() => {
    const rows = (data ?? []) as Record<string, unknown>[]
    const byId = new Map<string, CaseloadClient>()
    for (const r of rows) {
      const id = clean(r.user_id ?? r.id)
      if (!id || id === "undefined") continue
      const name = clean(r.name) ?? `Client ${id}`
      const c = byId.get(id) ?? { id, name, initials: initialsOf(name), packages: [] }
      const pkg = clean(r.package_name)
      if (pkg && !c.packages.includes(pkg)) c.packages.push(pkg)
      byId.set(id, c)
    }
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [data])
  return { clients, loading, error }
}

/** Deduped client list for the CURRENTLY signed-in counsellor. */
export function useCaseloadClients(): { clients: CaseloadClient[]; loading: boolean; error?: string } {
  const session = useSession()
  return useCaseloadClientsFor(session?.role === "counsellor" ? session.userId : null)
}

/** Resolve one client's display name from the signed-in counsellor's caseload. */
export function useClientName(clientId?: string | number | null): string | undefined {
  const { clients } = useCaseloadClients()
  const id = clientId == null ? "" : String(clientId)
  return useMemo(() => clients.find((c) => c.id === id)?.name, [clients, id])
}
