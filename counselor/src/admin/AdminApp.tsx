// The admin dashboard as a self-contained app at /admin/* — a separate link for a
// different audience (owner / ops / finance), gated behind an admin session.
// Same project, shared design system; data comes from the admin-data layer.

import { useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { AuthLayout, AUTH_CARD, AUTH_TITLE, AUTH_SUB, AUTH_LABEL } from "@/components/brand/AuthLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { useSession, signOut as authSignOut, signInAdmin } from "@/lib/auth-store"
import { AdminShell } from "./AdminShell"
import { AdminOverview } from "./screens/AdminOverview"
import { AdminClients } from "./screens/AdminClients"
import { AdminClientDetail } from "./screens/AdminClientDetail"
import { AdminCounsellors } from "./screens/AdminCounsellors"
import { AdminCounsellorDetail } from "./screens/AdminCounsellorDetail"
import { AdminExpertApplications } from "./screens/AdminExpertApplications"
import { AdminApi } from "./screens/AdminApi"
import { AdminRevenue } from "./screens/AdminRevenue"
import { AdminEconomics } from "./screens/AdminEconomics"
import { AdminMarketing } from "./screens/AdminMarketing"
import { AdminCommerce } from "./screens/AdminCommerce"
import { AdminGrowth } from "./screens/AdminGrowth"
import { AdminCopilot } from "./screens/AdminCopilot"
import { AdminJourneys, AdminReports, AdminSessions, AdminAccess, AdminSettings } from "./screens/AdminMisc"
import { AdminTestLinks } from "./screens/AdminTestLinks"

function AdminGate() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true)
    // Authenticate against the admin STAFF table and grant the admin role directly —
    // the universal login would downgrade a staff account that's also a navigator to
    // "counsellor" and bounce them to the console. The /admin door must mean admin.
    try { await signInAdmin(username.trim(), password) }
    catch { setErr("Those admin credentials weren't recognised. Check them, or use the counsellor console if you're a navigator.") } finally { setBusy(false) }
  }
  return (
    <AuthLayout role="admin">
      <form onSubmit={submit} className={AUTH_CARD}>
        <div>
          <h2 className={AUTH_TITLE}>Sign in</h2>
          <p className={AUTH_SUB}>Staff access — separate from the client and counsellor apps.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-id" className={AUTH_LABEL}>Admin username or email</Label>
          <Input id="admin-id" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="you@setmycareer.com" autoComplete="username" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="admin-pwd" className={AUTH_LABEL}>Password</Label>
          <PasswordInput id="admin-pwd" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        </div>

        {err && <p className="rounded-lg bg-risk-50 px-3 py-2 text-[12px] text-risk-600">{err}</p>}

        <Button type="submit" disabled={busy || !username.trim()} className="mt-1 h-10 w-full gap-1.5">
          {busy ? "Signing in…" : "Sign in"} {!busy && <ArrowRight className="size-4" />}
        </Button>
      </form>
    </AuthLayout>
  )
}

export function AdminApp() {
  const session = useSession()
  // Only an ADMIN session sees the dashboard. Anyone else — logged out OR holding a
  // counsellor/client session — gets the admin sign-in (not a redirect), so a real
  // admin can always sign in here even if they're also a navigator elsewhere.
  if (!session || session.role !== "admin") return <AdminGate />
  const signOut = () => authSignOut()

  return (
    <Routes>
      <Route element={<AdminShell onSignOut={signOut} />}>
        <Route index element={<AdminOverview />} />
        <Route path="assistant" element={<AdminCopilot />} />
        <Route path="clients" element={<AdminClients />} />
        <Route path="clients/:id" element={<AdminClientDetail />} />
        <Route path="counsellors" element={<AdminCounsellors />} />
        <Route path="counsellors/:id" element={<AdminCounsellorDetail />} />
        <Route path="applications" element={<AdminExpertApplications />} />
        <Route path="journeys" element={<AdminJourneys />} />
        <Route path="growth" element={<AdminGrowth />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="test-links" element={<AdminTestLinks />} />
        <Route path="revenue" element={<AdminRevenue />} />
        <Route path="economics" element={<AdminEconomics />} />
        <Route path="marketing" element={<AdminMarketing />} />
        <Route path="commerce" element={<AdminCommerce />} />
        <Route path="api" element={<AdminApi />} />
        {/* Live data folded into each client's profile — redirect any old deep links */}
        <Route path="live" element={<Navigate to="/admin/clients" replace />} />
        <Route path="access" element={<AdminAccess />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  )
}
