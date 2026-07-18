// Counsellor console sign-in gate. The console (the app at "/") historically ran
// with a hardcoded mock counsellor and no auth. This adds a minimal live sign-in
// in front of it: navigators are created on the SetMyCareer backend with an email
// + password (AddNavigator), and the unified `login` authenticates them through
// the dedicated Login/NavigatorLogin endpoint, keying the session on their
// navigator id — which the dashboard then uses to pull their real caseload. Any
// non-counsellor who signs in here (a client or admin) is routed to their own app.
//
// It gates ONLY the counsellor app: AppShell exclusively wraps "/" console routes
// (the client portal uses PortalAppShell, admin uses AdminShell), so mounting the
// gate here cannot affect /portal/* or /admin/*.
//
// Chrome: the premium split-screen AuthLayout — the True North brand panel sits on
// the LEFT, and the live navigator sign-in form renders in the RIGHT column.

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout, AUTH_CARD, AUTH_TITLE, AUTH_SUB, AUTH_LABEL } from "@/components/brand/AuthLayout"
import { GoogleSignInButton, OrDivider } from "@/components/brand/GoogleSignInButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { useUnifiedLogin } from "@/lib/login"

export function CounsellorGate() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const login = useUnifiedLogin()
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(""); setBusy(true)
    // universal sign-in: counsellors land here, anyone else is routed to their app.
    try { await login(username.trim(), password) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  return (
    <AuthLayout role="counsellor">
      <form onSubmit={submit} className={AUTH_CARD}>
        <div>
          <h2 className={AUTH_TITLE}>Sign in</h2>
          <p className={AUTH_SUB}>Your SetMyCareer navigator account.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="counsellor-id" className={AUTH_LABEL}>Email or username</Label>
          <Input id="counsellor-id" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="you@setmycareer.com" autoComplete="username" required />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="counsellor-pwd" className={AUTH_LABEL}>Password</Label>
            <button type="button" onClick={() => toast("Password reset is coming soon — contact your SetMyCareer admin to reset it.")} className="text-[11.5px] font-medium text-brand-600 hover:underline">Forgot password?</button>
          </div>
          <PasswordInput id="counsellor-pwd" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
        </div>

        {err && <p className="rounded-lg bg-risk-50 px-3 py-2 text-[12px] text-risk-600">{err}</p>}

        <Button type="submit" disabled={busy || !username.trim()} className="mt-1 h-10 w-full gap-1.5">
          {busy ? "Signing in…" : "Sign in"} {!busy && <ArrowRight className="size-4" />}
        </Button>

        <OrDivider />
        <GoogleSignInButton />
      </form>
    </AuthLayout>
  )
}
