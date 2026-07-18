// The signed-in person's display identity, derived from the live auth session —
// so the shell (topbar, sidebar, settings, report authorship) shows the REAL
// logged-in counsellor/admin, never a mock persona.

import { useSession, signOut } from "./auth-store"

export interface Me {
  id: number
  name: string
  initials: string
  subtitle: string
  email?: string
  role: "counsellor" | "admin" | "client"
}

const stripHonorific = (n: string) => n.replace(/^(dr|mr|mrs|ms|prof|miss)\.?\s+/i, "").trim()

export function initialsOf(name: string): string {
  const p = stripHonorific(name).split(/\s+/).filter(Boolean)
  return (p.length ? p[0][0] + (p[1]?.[0] ?? "") : "—").toUpperCase()
}

export function useMe(): Me {
  const s = useSession()
  const name = s?.name?.trim() || "Counsellor"
  const role = (s?.role ?? "counsellor") as Me["role"]
  return {
    id: Number(s?.userId ?? 0),
    name,
    initials: initialsOf(name),
    subtitle: s?.email || (role === "admin" ? "Administrator" : "SetMyCareer navigator"),
    email: s?.email,
    role,
  }
}

export { signOut }
