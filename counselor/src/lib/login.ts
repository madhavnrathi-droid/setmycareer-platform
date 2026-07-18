// Unified login + role routing. One entry point that authenticates ANY user
// (client / counsellor / admin), bridges the client-portal account for members,
// and sends each person to their own dashboard — so every login "just works"
// from any of the three sign-in screens.

import { useNavigate } from "react-router-dom"
import { authenticate, type AuthSession, type Role } from "./auth-store"
import { adoptLiveAccount } from "@/portal/portal-store"

export function homeForRole(role: Role): string {
  return role === "admin" ? "/admin" : role === "counsellor" ? "/" : "/portal/home"
}

/** Returns a `login(loginId, password)` that authenticates, bridges the portal
 *  account for clients, and routes to the right dashboard. Throws on bad creds. */
export function useUnifiedLogin(): (loginId: string, password: string) => Promise<AuthSession> {
  const nav = useNavigate()
  return async (loginId, password) => {
    const s = await authenticate(loginId, password)
    if (s.role === "client") adoptLiveAccount({ userId: s.userId, name: s.name, email: s.email })
    nav(homeForRole(s.role), { replace: true })
    return s
  }
}
