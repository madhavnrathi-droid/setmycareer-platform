// The admin's live counsellor roster — the real navigator list (getAllNavigator,
// 81 active) mapped to a light {id, name, title, initials} shape for assignment
// pickers and search. Replaces the old demo COUNSELLORS array so every admin
// action assigns to a REAL navigator id (which the write endpoints require).
import { useMemo } from "react"
import { useNavigators } from "@/lib/live-queries"
import type { FullNavigator } from "@/lib/smc-live-api"

export interface RosterCounsellor { id: string; name: string; title: string; initials: string }

const clean = (v?: unknown) => { const s = v == null ? "" : String(v).trim(); return s && s !== "None" && s !== "null" ? s : undefined }
const initialsOf = (name: string) => { const p = name.trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—" }

export function useAdminCounsellors(): { counsellors: RosterCounsellor[]; loading: boolean } {
  const { data, loading } = useNavigators()
  const counsellors = useMemo(() => {
    return ((data ?? []) as FullNavigator[])
      .filter((n) => { const a = n.isActive; if (a === undefined || a === null) return true; const s = String(a).toLowerCase(); return s === "true" || s === "1" })
      .filter((n) => clean(n.name))
      .map((n) => { const name = clean(n.name)!; return { id: String(n.id), name, title: clean(n.short_Description) ?? "Counsellor", initials: initialsOf(name) } })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [data])
  return { counsellors, loading }
}
