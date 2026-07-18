// Career-expert enquiry (the "Talk to our career experts" lead form). Forwards
// the lead into SetMyCareer's existing Zoho/mxradon FormTracker pipeline (org
// 46388 — the same pipe the live setmycareer.com contact form and our e-book use)
// so it lands where the team already works leads. When a mailer is configured it
// also emails the desk directly, so a lead is never lost if the tracker drops a
// captcha-less server post. Nothing routes to the old website.
//
// Env (Vercel project `site`) — all optional; the tracker forward needs none:
//   RESEND_API_KEY  — enables the direct email fallback [CONFIRM: create at resend.com]
//   LEAD_FROM       — verified sender, e.g. "SetMyCareer <desk@setmycareer.com>"
//   LEAD_TO         — where the desk wants leads (defaults to info@setmycareer.com)

const TRACKER = "https://web-in21.mxradon.com/t/FormTracker.aspx"

type Body = { name?: string; email?: string; phone?: string; audience?: string; city?: string; message?: string; source?: string }

export default async function handler(
  req: { method?: string; body?: Body | string },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } },
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/json")
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return }
  const b: Body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {})
  const name = (b.name || "").trim().slice(0, 100)
  const email = (b.email || "").trim().slice(0, 120)
  const phone = (b.phone || "").trim().slice(0, 24)
  const audience = (b.audience || "").trim().slice(0, 60)
  const city = (b.city || "").trim().slice(0, 80)
  const message = (b.message || "").trim().slice(0, 1200)
  const source = (b.source || "marketing site").trim().slice(0, 80)

  // a lead needs a name and at least one way to reach back
  const emailOk = /^\S+@\S+\.\S+$/.test(email)
  const phoneOk = phone.replace(/\D/g, "").length >= 7
  if (!name || (!emailOk && !phoneOk)) {
    res.status(400).json({ ok: false, error: "Please add your name and an email or phone so we can reach you." })
    return
  }

  // 1) forward into the team's tracker (best-effort — the live form carries a
  // reCAPTCHA that may drop captcha-less server posts [CONFIRM with the team])
  let forwarded = false
  try {
    const form = new URLSearchParams({
      MXHOrgCode: "46388",
      Name_Last: name,
      Email: email,
      PhoneNumber_countrycode: phone,
      SingleLine: city,
      Dropdown: audience,
      MultiLine: message,
      zf_referrer_name: `setmycareer marketing site — ${source}`,
      zf_redirect_url: "",
      zc_gad: "",
      "g-recaptcha-response": "",
    })
    const r = await fetch(TRACKER, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "Mozilla/5.0 (compatible; SetMyCareer/1.0)" },
      body: form.toString(),
      redirect: "manual",
    })
    forwarded = r.status < 400
  } catch { forwarded = false }

  // 2) email the desk directly (the reliable channel) when the mailer is set up
  let emailed = false
  const key = process.env.RESEND_API_KEY
  if (key) {
    try {
      const from = process.env.LEAD_FROM || "SetMyCareer <onboarding@resend.dev>"
      const to = process.env.LEAD_TO || "info@setmycareer.com"
      const row = (k: string, v: string) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><b>${v.replace(/</g, "&lt;")}</b></td></tr>` : "")
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to: [to],
          reply_to: emailOk ? email : undefined,
          subject: `New enquiry — ${name}${audience ? ` (${audience})` : ""}`,
          html: [
            `<p>A new career-expert enquiry came in from the site (${source}):</p>`,
            `<table style="border-collapse:collapse;font-size:14px">`,
            row("Name", name), row("Email", email), row("Phone", phone),
            row("I am a", audience), row("City", city), row("Note", message),
            `</table>`,
          ].join(""),
        }),
      })
      emailed = r.ok
    } catch { emailed = false }
  }

  // We accepted the enquiry; the UI can thank the visitor honestly either way.
  res.status(200).json({ ok: true, forwarded, emailed })
}
