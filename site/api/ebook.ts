// E-book request: (1) EMAILS the visitor their copy via Resend, (2) forwards the
// lead into SetMyCareer's existing mxradon/Zoho FormTracker pipeline (org 46388,
// field names lifted from the live form) so it lands where the team already
// processes leads. Nothing routes to the old website.
//
// Env (Vercel project `site`):
//   RESEND_API_KEY  — required for delivery [CONFIRM: create at resend.com, free tier]
//   EBOOK_FROM      — verified sender, e.g. "SetMyCareer <notes@setmycareer.com>"
//   EBOOK_PDF_URL   — where the PDF is hosted (upload to site/public and use
//                     /downloads/13-career-success-strategies.pdf) [CONFIRM: need the file]
// Until those are set, the API still records the lead and tells the client
// delivery is pending — the UI copy stays honest either way.

const TRACKER = "https://web-in21.mxradon.com/t/FormTracker.aspx"

type Body = { name?: string; email?: string; phone?: string; city?: string; age?: string }

export default async function handler(
  req: { method?: string; body?: Body | string },
  res: { setHeader: (k: string, v: string) => void; status: (n: number) => { json: (b: unknown) => void } },
) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Content-Type", "application/json")
  if (req.method !== "POST") { res.status(405).json({ ok: false, error: "POST only" }); return }
  const b: Body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body ?? {})
  const name = (b.name || "").trim().slice(0, 80)
  const email = (b.email || "").trim().slice(0, 120)
  const city = (b.city || "").trim().slice(0, 80)
  const age = (b.age || "").trim().slice(0, 24)
  const phone = (b.phone || "").trim().slice(0, 20)
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) { res.status(400).json({ ok: false, error: "Name and a valid email are required." }); return }

  // 1) send the e-book (when the mailer is configured)
  let emailed = false
  const key = process.env.RESEND_API_KEY
  if (key) {
    try {
      const pdf = process.env.EBOOK_PDF_URL || ""
      const from = process.env.EBOOK_FROM || "SetMyCareer <onboarding@resend.dev>"
      const first = name.split(/\s+/)[0]
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "Your copy of 13 Career-Success Strategies",
          html: [
            `<p>Hi ${first},</p>`,
            `<p>Thank you for requesting <b>13 Career-Success Strategies</b> by Dr. Nandkishore Rathi — forty years of career counselling, distilled into the habits and decisions behind 970+ successful placements.</p>`,
            pdf ? `<p><a href="${pdf}" style="display:inline-block;padding:10px 18px;background:#0b0b0b;color:#faf9f6;text-decoration:none;border-radius:6px">Download your copy</a></p>` : `<p>Your copy is attached to a follow-up from our team, arriving shortly.</p>`,
            `<p>When you're ready to go further, the free <a href="https://site-madhavs-projects-56d7586e.vercel.app/cri">Career Clarity Index</a> takes about four minutes.</p>`,
            `<p>— The SetMyCareer team</p>`,
          ].join(""),
        }),
      })
      emailed = r.ok
    } catch { emailed = false }
  }

  // 2) forward the lead into the team's tracker (best-effort; reCAPTCHA on the
  // live form may drop captcha-less posts server-side [CONFIRM with the team])
  let forwarded = false
  try {
    const form = new URLSearchParams({
      MXHOrgCode: "46388",
      Name_Last: name,
      Email: email,
      PhoneNumber_countrycode: phone,
      SingleLine: city,
      Dropdown: age,
      zf_referrer_name: "setmycareer marketing site — /resources e-book",
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

  res.status(200).json({ ok: true, emailed, forwarded })
}
