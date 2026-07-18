# site — the SetMyCareer marketing website

The public-facing website: a monochrome-editorial, scroll-interactive React SPA that sells the
product, publishes the blog, and feeds sign-ups into the client portal.

Deployed as its **own Vercel project**, separate from the product app.

```bash
npm install && npm run dev     # → http://localhost:5173
```

---

## What it is

Not a brochure — a full funnel. It has its own sign-in, its own checkout, and two free
assessments, all riding the product app's APIs.

| Area | Routes |
|---|---|
| Story | `/` · `/product` · `/framework` · `/solutions` · `/trust` |
| Commerce | `/pricing` · `/checkout/:tierId` · `/book` |
| Free tests | `/cri` (Career Clarity Index) · `/fit` (package-fit quiz) |
| Content | `/blog` · `/blog/:slug` · `/resources` · `/resources/videos` · `/library` · `/library/:id` |
| Counsellor recruiting | `/counsellors` · `/experts` · `/experts/:id` · `/experts/apply` |
| Programmes | `/programs/:slug` |
| Account | `/signin` |
| Legal | `/legal` · `/legal/:slug` (12 documents) |
| Contact | `/contact` |

---

## Layout

```
src/
├── App.tsx          route table (~25 routes)
├── pages/           one component per route
├── components/      Chrome (nav/footer), Brand, CompassCursor, ShaderFlow, plus feature
│                    folders: compass/ counsellors/ cri/ demos/ fit/ pricing/ product/
│                    terminal/ tour/
├── content/         ALL copy and data as typed TS modules — nav.ts is the single source of
│                    truth for IA, nav and footer; legal/ holds the 12 legal documents
├── lib/             api.ts — live reads from api.setmycareer.com, plus PORTAL_URL and
│                    COUNSELLOR_URL constants that point at the product app
├── three/           three.js scene code
├── journey-art/     generative artwork
└── public/          art/, grads/, logos/, product screenshots, og.svg, robots.txt, sitemap.xml

api/                 Vercel functions
├── blog.ts + post.ts        the on-site blog (reads posts, assigns generative art)
├── news.ts + feed.ts        Career Terminal daily news agent (5 Google News RSS queries,
│                            merged/deduped/categorised) — runs on a Vercel cron
├── lead.ts                  contact-form lead capture → Resend
├── ebook.ts                 CRI e-book delivery → Resend
└── videos.ts + video-library.ts   YouTube library metadata
```

---

## Where it hands off to the product

Every conversion path leads into `counselor/`:

| Site action | Goes to |
|---|---|
| Sign in / Start / "Open the app" | `setmycareer-counselor.vercel.app/portal` |
| Checkout | the product app's `/api/razorpay` (order + HMAC verify) |
| Site chatbot | the product app's `/api/assistant` |
| Fit test report | the product app's `/api/fit-report` |
| Counsellor apply | the console door + the admin approval queue |

Those product-app functions set open CORS specifically so this separately-deployed site can call
them. If you change CORS there, you break the site.

---

## Design rules

`CLAUDE.md` in this folder is the project rulebook and takes precedence. In short:

- **Monochrome.** One rationed accent, one solid CTA per view.
- **Editorial, not templated.** Type carries the brand; whitespace is the material.
- **WCAG AA**, `prefers-reduced-motion` respected, no horizontal scroll 320px→4K.
- **Copy is content, not decoration** — all of it lives in `src/content/`, never inline in JSX.

---

## Commands

```bash
npm run dev                # → :5173
npx tsc -b --force         # typecheck
npm run build              # production build
npx vercel --prod --yes    # deploy — NOT triggered by git push
```

> **This deploy is manual.** Editing `site/` and pushing to git does **not** update production.
> Someone has to run the CLI. Check the live URL after any change you expect to be visible.

Environment: only `RESEND_API_KEY` is needed, and only for the contact form and e-book delivery.
