// "Continue with Google" button — the official 4-colour G mark + a labelled outline
// button. Not wired to OAuth yet (per the founder: "we'll wire it later"); clicking
// explains it's coming so it never looks broken. Used on the client + counsellor sign-ins.

import { toast } from "sonner"

function GoogleG() {
  return (
    <svg viewBox="0 0 18 18" width="17" height="17" aria-hidden="true" className="shrink-0">
      <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.346l2.582-2.581C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
    </svg>
  )
}

export function GoogleSignInButton({ label = "Continue with Google", dark = false }: { label?: string; dark?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => toast("Google sign-in is coming soon — use your email & password for now.")}
      className={
        dark
          ? "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-[4px] border border-white/15 bg-white/[0.04] text-[13px] font-medium text-white/90 transition hover:bg-white/[0.08]"
          : "inline-flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-card text-[13px] font-medium text-foreground transition hover:bg-secondary"
      }
    >
      <GoogleG /> {label}
    </button>
  )
}

/** A subtle "or" divider for separating the form from the Google button. */
export function OrDivider({ dark = false }: { dark?: boolean }) {
  return (
    <div className={`flex items-center gap-3 text-[11px] uppercase tracking-wide ${dark ? "text-white/35" : "text-ink-300"}`}>
      <span className={`h-px flex-1 ${dark ? "bg-white/12" : "bg-border"}`} /> or <span className={`h-px flex-1 ${dark ? "bg-white/12" : "bg-border"}`} />
    </div>
  )
}
