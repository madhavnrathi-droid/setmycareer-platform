# Hosting the marketing site on IIS (test.setmycareer.com)

**Why only the homepage works today:** Cloudflare proxies `test.setmycareer.com` to an IIS server
(`x-powered-by: ASP.NET`). Only one `index.html`, from a 26 July build, was uploaded there. Every
other path (`/pricing`, `/career-counselling`, `/blog/...`) returns IIS's
"404 - File or directory not found". Every page's canonical tag and the sitemap point at this host,
so search engines are being sent to 404s.

There are two fixes. Pick one.

## Option A: point the subdomain at Vercel (no server work)

The domain is already attached to the Vercel `site` project. In Cloudflare DNS for setmycareer.com:

| Type | Name | Content | Proxy |
|---|---|---|---|
| A | `test` | `76.76.21.21` | **DNS only** (grey cloud) |

Replace the existing `test` record. Vercel issues the certificate within minutes, and every push to
`main` deploys there. This also retires the IIS copy.

## Option B: keep IIS, upload the whole build

1. Make sure the **URL Rewrite** module is installed on the server
   (IIS Manager → the site → "URL Rewrite" icon present). If it isn't, install it first.
   Without it, `web.config` makes IIS return 500.19 on every URL.
2. Build: `cd site && npm run build`. `VITE_SITE_URL` already defaults to
   `https://test.setmycareer.com`, so canonicals and the sitemap match this host.
3. Upload the **contents** of `site/dist/` to the site root. That is every route folder, `assets/`,
   `product/`, `fonts/`, `art/`, `logos/`, `robots.txt`, `sitemap.xml`, `llms.txt` and `app.html`,
   not just `index.html`.
4. Copy `deploy/iis/web.config` into the same root.
5. Check: `curl -sI https://test.setmycareer.com/pricing` should be `200`, with no redirect to `/pricing/`.

Option B has to be repeated on every release. Option A doesn't.
