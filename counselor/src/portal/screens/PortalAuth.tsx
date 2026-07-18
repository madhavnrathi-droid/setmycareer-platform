// The client portal's front door — the standard SaaS auth panel: one card with a
// Sign in ⇄ Create account toggle, Continue-with-Google, and a single clean form
// each way (no "New user / Existing user" chooser gate, no counsellor-picking
// marketplace — a counsellor is matched from the client's results).
//
// Sign in is live: phone-OTP (SendOtp → LoginWithOtp) or email + password (the
// unified login). Create account is the quick password-less sign-up. Chrome is
// the premium split-screen AuthLayout — hero copy on the left brand panel, the
// form on the right column.

import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { AuthLayout, AUTH_LABEL } from "@/components/brand/AuthLayout"
import { GoogleSignInButton, OrDivider } from "@/components/brand/GoogleSignInButton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { gsap, prefersReducedMotion, EASE } from "@/lib/gsap"
import { signUp, adoptLiveAccount, lastAccountEmail } from "../portal-store"
import { startOtp, verifyOtp, resendOtp } from "@/lib/auth-store"
import { useUnifiedLogin } from "@/lib/login"
import { cn } from "@/lib/utils"

// Legal documents live on the marketing site. Repoint to setmycareer.com/legal once
// the marketing site moves to the brand domain. [CONFIRM domain before launch]
const LEGAL = "https://site-madhavs-projects-56d7586e.vercel.app/legal"

type Mode = "signin" | "signup"

export function PortalAuth() {
  const nav = useNavigate()
  const login = useUnifiedLogin()
  const root = useRef<HTMLDivElement>(null)
  const [mode, setMode] = useState<Mode>("signin")
  // ── sign-up fields ───────────────────────────────────────────────────────────
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [goal, setGoal] = useState("")
  const [track, setTrack] = useState<"student" | "professional">("student")
  // ── sign-in state (phone-OTP or email/password against the live API) ──────────
  const [loginId, setLoginId] = useState(lastAccountEmail() ?? "")
  const [usePwd, setUsePwd] = useState(false)
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")

  const channel = () => (/@/.test(loginId) ? { email: loginId.trim() } : { mobile: loginId.replace(/\D/g, "") })
  const land = (s: { userId: number; name?: string; email?: string }) => {
    const ch = channel()
    adoptLiveAccount({ userId: s.userId, name: s.name, email: s.email, mobile: "mobile" in ch ? ch.mobile : undefined })
    nav("/portal/home")
  }
  const requestOtp = async () => {
    setErr(""); setBusy(true)
    try { const r = await startOtp(channel()); if (!r.ok) throw new Error(r.message || "Couldn't send the code."); setOtpSent(true) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const confirmOtp = async () => {
    setErr(""); setBusy(true)
    try { land(await verifyOtp(otp.trim(), channel())) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  const signInPwd = async () => {
    setErr(""); setBusy(true)
    // universal: a client lands in the portal; a counsellor/admin who uses email +
    // password here is routed to their own app instead.
    try { await login(loginId.trim(), password) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }
  // Password-less quick sign-up — a counsellor is matched from the client's
  // results, so there's no counsellor to pick here.
  const finish = () => {
    if (!name.trim() || !/\S+@\S+\.\S+/.test(email)) return
    signUp({ name: name.trim(), email: email.trim(), goal: goal.trim() || undefined, counsellorId: null, track })
    nav("/portal/home")
  }

  useEffect(() => {
    if (!root.current || prefersReducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.from("[data-rise]", { y: 14, opacity: 0, duration: 0.45, ease: EASE.soft, stagger: 0.05 })
    }, root)
    return () => ctx.revert()
  }, [mode])

  const switchMode = (m: Mode) => { setMode(m); setErr(""); setOtpSent(false) }

  return (
    <AuthLayout role="client">
      <div ref={root} className="w-full">
        <div data-rise className="rounded-2xl border border-border bg-card p-6 shadow-e2 sm:p-7">
          <h1 className="font-display text-[21px] font-semibold tracking-tight text-foreground">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {mode === "signin"
              ? "Your client portal — for students, professionals and parents."
              : "Free to start, no card. We'll match you with a counsellor from your results."}
          </p>

          {/* Sign in ⇄ Create account — a segmented control */}
          <div className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-secondary p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                aria-pressed={mode === m}
                className={cn(
                  "rounded-full py-2 text-[13px] font-medium transition",
                  mode === m ? "bg-card text-foreground shadow-[0_1px_2px_rgba(35,31,32,0.08)]" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "signin" ? (
            // ── existing-user sign in (live: phone-OTP or email/password) ────────
            <form
              className="mt-5 flex flex-col gap-4"
              onSubmit={(e) => { e.preventDefault(); usePwd ? signInPwd() : (otpSent ? confirmOtp() : requestOtp()) }}
            >
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="login-id" className={AUTH_LABEL}>Mobile or email</Label>
                <Input id="login-id" value={loginId} onChange={(e) => { setLoginId(e.target.value); setOtpSent(false); setErr("") }} placeholder="9876543210 or you@email.com" autoComplete="username" required disabled={otpSent && !usePwd} />
              </div>

              {usePwd ? (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-pwd" className={AUTH_LABEL}>Password</Label>
                    <button type="button" onClick={() => toast("Password reset is coming soon — we'll email you a reset link.")} className="text-[11.5px] font-medium text-brand-600 hover:underline">Forgot password?</button>
                  </div>
                  <PasswordInput id="login-pwd" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
                </div>
              ) : otpSent ? (
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="login-otp" className={AUTH_LABEL}>Enter the code</Label>
                  {/* The backend sends 4 digits by email and may send more by SMS.
                      Never assert a length in the UI — the old "6-digit OTP"
                      placeholder contradicted the 4-digit code people actually
                      received. Accept 4–6 digits, strip anything else. */}
                  <Input
                    id="login-otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="Enter the code"
                    required
                  />
                  <p className="text-[11.5px] text-muted-foreground">Sent to {loginId.trim()}.</p>
                  <button
                    type="button"
                    onClick={async () => {
                      try { await resendOtp(channel()); toast.success(`Code sent again to ${loginId.trim()}.`) }
                      catch { toast.error("Couldn't resend the code — try again in a moment.") }
                    }}
                    className="self-start text-[11.5px] text-brand-600 hover:underline"
                  >Resend code</button>
                </div>
              ) : null}

              {err && <p className="rounded-lg bg-risk-50 px-3 py-2 text-[12px] text-risk-600">{err}</p>}

              <Button type="submit" disabled={busy || !loginId.trim() || (otpSent && !usePwd && otp.length < 4)} className="mt-1 h-10 gap-1.5">
                {busy ? "Please wait…" : usePwd ? "Sign in" : otpSent ? "Verify & continue" : "Send OTP"} {!busy && <ArrowRight className="size-4" />}
              </Button>

              <button type="button" onClick={() => { setUsePwd((v) => !v); setOtpSent(false); setErr("") }} className="self-center text-[12px] text-muted-foreground hover:text-foreground">
                {usePwd ? "Use a one-time code instead" : "Use a password instead"}
              </button>

              <OrDivider />
              <GoogleSignInButton />
            </form>
          ) : (
            // ── quick, password-less sign-up ─────────────────────────────────────
            <form className="mt-5 flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); finish() }}>
              {/* who is this account for? — drives the catalogue, terminal and copy */}
              <div className="flex flex-col gap-1.5">
                <Label className={AUTH_LABEL}>This account is for</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: "student" as const, t: "Student / parent", d: "school, college, first job" },
                    { v: "professional" as const, t: "Working professional", d: "pivot, growth, leadership" },
                  ]).map((o) => (
                    <button
                      key={o.v}
                      type="button"
                      onClick={() => setTrack(o.v)}
                      aria-pressed={track === o.v}
                      className={cn(
                        "rounded-xl border px-3 py-2.5 text-left transition",
                        track === o.v ? "border-ink-600 bg-paper shadow-[0_1px_2px_rgba(35,31,32,0.08)]" : "border-border bg-card hover:border-ink-300",
                      )}
                    >
                      <span className="block text-[13px] font-medium text-foreground">{o.t}</span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">{o.d}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="su-name" className={AUTH_LABEL}>Full name</Label>
                <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex Morgan" autoComplete="name" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="su-email" className={AUTH_LABEL}>Email</Label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" required />
                <p className="text-[11px] text-ink-300">One-click start — no password to remember.</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="su-goal" className={AUTH_LABEL}>What brings you here? <span className="text-ink-300">(optional)</span></Label>
                <Input id="su-goal" value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="e.g. unsure what to do after my degree" />
              </div>

              <Button type="submit" disabled={!name.trim() || !/\S+@\S+\.\S+/.test(email)} className="mt-1 h-10 gap-1.5">
                Create account <ArrowRight className="size-4" />
              </Button>

              <OrDivider />
              <GoogleSignInButton />

              <p className="text-center text-[11px] leading-relaxed text-ink-300">
                By continuing you agree to our{" "}
                <a href={`${LEGAL}/terms-of-service`} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-600">Terms</a> and{" "}
                <a href={`${LEGAL}/privacy-policy`} target="_blank" rel="noopener noreferrer" className="underline hover:text-ink-600">Privacy Policy</a>.
                <br />Under 18? A parent or guardian must set up and consent to your account.
              </p>
            </form>
          )}
        </div>
      </div>
    </AuthLayout>
  )
}
