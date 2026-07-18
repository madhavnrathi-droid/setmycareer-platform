import { useEffect, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { ArrowRight } from "@carbon/icons-react"
import { Kicker } from "@/components/bits"
import { useSeo } from "@/lib/seo"
import { LogoMark } from "@/components/Brand"
import {
  useSiteSession, sendOtp, register, resendOtp, verifyOtp, emailLogin, toChannel,
} from "@/lib/site-auth"

/* /signin — the site's front door to the REAL SetMyCareer account (the same
   account the client portal uses). Split editorial layout: the promise on the
   dark left panel, the form on the right. Sign in ⇄ Create account, phone-OTP
   primary with a password fallback, and ?next= support so checkout can send
   people here and get them straight back. */

type Mode = "signin" | "signup"

// only ever redirect within this site — never to an absolute/protocol URL
const safeNext = (raw: string | null) =>
  raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"

export function SignIn() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const session = useSiteSession()
  const next = safeNext(params.get("next"))

  const [mode, setMode] = useState<Mode>(params.get("mode") === "signup" ? "signup" : "signin")
  const [loginId, setLoginId] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [usePwd, setUsePwd] = useState(false)
  const [password, setPassword] = useState("")
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [note, setNote] = useState("")

  useSeo({
    title: "Sign in — SetMyCareer",
    description: "Sign in or create your SetMyCareer account — the same account that runs your client portal, reports and AI Career Copilot.",
    path: "/signin",
  })

  // already signed in (or just signed in) → onward
  useEffect(() => { if (session) nav(next, { replace: true }) }, [session, next, nav])

  const switchMode = (m: Mode) => { setMode(m); setErr(""); setNote(""); setOtpSent(false); setOtp(""); setUsePwd(false) }

  const requestOtp = async () => {
    setErr(""); setNote(""); setBusy(true)
    try {
      const r = await (mode === "signup" ? register : sendOtp)(toChannel(loginId))
      if (!r.ok) throw new Error(r.message || "We couldn't send the code — check the number or email and try again.")
      setOtpSent(true)
      setNote(`Code sent to ${loginId.trim()}.`)
    } catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const confirmOtp = async () => {
    setErr(""); setBusy(true)
    try { await verifyOtp(otp.trim(), toChannel(loginId)) } // success → session effect navigates
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const signInPwd = async () => {
    setErr(""); setBusy(true)
    try { await emailLogin(loginId.trim(), password) }
    catch (e) { setErr((e as Error).message) } finally { setBusy(false) }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (busy || !loginId.trim()) return
    if (usePwd) void signInPwd()
    else if (otpSent) void confirmOtp()
    else void requestOtp()
  }

  const cta = busy ? "One moment…" : usePwd ? "Sign in" : otpSent ? "Verify & continue" : "Send OTP"

  return (
    <main className="grid min-h-svh lg:grid-cols-2">
      {/* ── the promise — dark editorial panel ── */}
      <aside className="plate-dark relative hidden overflow-hidden lg:block">
        <LogoMark aria-hidden className="pointer-events-none absolute -bottom-24 -right-24 h-auto w-[34rem] select-none text-paper/[0.06]" />
        <div className="relative z-10 flex h-full flex-col justify-between px-12 pb-12 pt-32 xl:px-20">
          <div>
            <Kicker className="text-paper/50">Your SetMyCareer account</Kicker>
            <h1 className="h-lg mt-6 max-w-[14ch] text-paper">One account. <span className="b">Every decision.</span></h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-paper/70">
              The account you create here is the same one that runs your client portal —
              assessments, reports, counselling sessions and the AI Career Copilot all live behind it.
            </p>
          </div>
          <ul className="flex flex-col gap-3 border-t border-paper/15 pt-8 text-[13.5px] text-paper/70">
            <li>Anything you buy on this site unlocks in your portal.</li>
            <li>Sign in with a one-time code — no password required.</li>
            <li>Your data stays yours, per our <Link to="/legal/privacy-policy" className="ul text-paper/85">Privacy Policy</Link>.</li>
          </ul>
        </div>
      </aside>

      {/* ── the form ── */}
      <section className="flex items-center justify-center px-5 pb-16 pt-28 sm:px-10 lg:pt-24">
        <div className="w-full max-w-md">
          <h2 className="ed-title-xl text-[clamp(1.7rem,3vw,2.3rem)]">
            {mode === "signin" ? <>Welcome <span className="b">back</span>.</> : <>Create your <span className="b">account</span>.</>}
          </h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-60">
            {mode === "signin"
              ? "Sign in with your mobile or email — the same account as your client portal."
              : "Free to create — one mobile number or email is all it takes."}
          </p>

          {/* Sign in ⇄ Create account — hairline tabs, editorial not pill */}
          <div className="mt-8 grid grid-cols-2 border-b border-line" role="tablist" aria-label="Sign in or create account">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => switchMode(m)}
                className={`-mb-px border-b-2 py-3 text-[13.5px] tracking-[-0.01em] transition-colors ${
                  mode === m ? "border-ink font-medium text-ink" : "border-transparent text-ink-40 hover:text-ink"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-7 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="kicker">Mobile or email</span>
              <input
                value={loginId}
                onChange={(e) => { setLoginId(e.target.value); setOtpSent(false); setErr(""); setNote("") }}
                placeholder="9876543210 or you@email.com"
                autoComplete="username"
                required
                className="field-box rounded-[9px]"
              />
            </label>

            {usePwd ? (
              <label className="flex flex-col gap-1.5">
                <span className="kicker">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="field-box rounded-[9px]"
                />
              </label>
            ) : otpSent ? (
              <label className="flex flex-col gap-1.5">
                <span className="kicker">Enter the code</span>
                <input
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="6-digit OTP"
                  autoComplete="one-time-code"
                  required
                  className="field-box rounded-[9px]"
                />
                <button
                  type="button"
                  onClick={() => { void resendOtp(toChannel(loginId)); setNote("Code re-sent.") }}
                  className="ul self-start text-[12px] text-ink-60"
                >
                  Resend code
                </button>
              </label>
            ) : null}

            {err && <p role="alert" className="text-[12.5px] leading-relaxed text-red-700">{err}</p>}
            {!err && note && <p className="text-[12.5px] text-ink-60">{note}</p>}

            <button type="submit" disabled={busy || !loginId.trim()} className="btn btn--solid mt-2 w-full justify-center disabled:opacity-60">
              <span>{cta}</span> <ArrowRight size={15} className="btn-arrow" />
            </button>

            {mode === "signin" && (
              <button
                type="button"
                onClick={() => { setUsePwd((v) => !v); setOtpSent(false); setOtp(""); setErr(""); setNote("") }}
                className="self-center text-[12.5px] text-ink-40 transition-colors hover:text-ink"
              >
                {usePwd ? "Use a one-time code instead" : "Use a password instead"}
              </button>
            )}
          </form>

          <p className="mt-8 border-t border-line pt-5 text-[11.5px] leading-relaxed text-ink-40">
            By continuing you agree to our <Link to="/legal/terms-of-service" className="ul">Terms of Service</Link> and{" "}
            <Link to="/legal/privacy-policy" className="ul">Privacy Policy</Link>.
            If you are under 18, a parent or guardian must set up and consent to your account.
          </p>
        </div>
      </section>
    </main>
  )
}
