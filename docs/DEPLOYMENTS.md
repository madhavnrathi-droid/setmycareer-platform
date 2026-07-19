# Deployments

Three Vercel projects deploy out of this one repository, plus one backend that lives elsewhere.
None of them deploy on `git push` — **every deploy is a deliberate CLI command.**

---

## The map

| # | What | Source | Vercel project | URL |
|---|---|---|---|---|
| 1 | Product — 3 dashboards + guest tests | `counselor/` | `setmycareer-counselor` | `setmycareer-counselor.vercel.app` |
| 2 | Marketing site | `site/` | `site` | `site-madhavs-projects-56d7586e.vercel.app` |
| 3 | Python API + bloo PWA | `api/` + `app/` + `frontend/` | `setmycareer` | `setmycareer.vercel.app` |
| 4 | Company backend | *not in this repo* | — | `api.setmycareer.com` (.NET) |

---

## Deploying

Always typecheck and build before deploying — a broken build reaches users otherwise.

### 1. The product app

```bash
cd counselor
npx tsc -b --force        # --force matters: incremental mode hides errors
npm run build
npx vercel --prod --yes
```

### 2. The marketing site

```bash
cd site
npx tsc -b --force
npm run build
npx vercel --prod --yes
```

### 3. The Python service + bloo PWA

Deploys from the **repository root** — `vercel.json` builds `frontend/` into `app/static` and
routes `/api/*` to `api/index.py`.

```bash
cd "$(git rev-parse --show-toplevel)"
npx vercel --prod --yes
curl -s https://setmycareer.vercel.app/api/health   # verify it came up
```

---

## After every deploy

Confirm the thing you changed is actually live — a green CLI output only means the upload
succeeded.

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://setmycareer-counselor.vercel.app/portal
curl -s https://setmycareer.vercel.app/api/health
```

Then open the affected screen and exercise the change.

---

## Environment variables

Set in **Vercel → project → Settings → Environment Variables**, never in the repo. Adding a
variable requires a redeploy to take effect. Names are listed in [`SECURITY.md`](SECURITY.md).

Removing one requires a redeploy too — that's how `SUPABASE_URL`/`SUPABASE_KEY` left the
`setmycareer-counselor` project on 2026-07-19.

---

## Runtime gotchas

| Gotcha | Detail |
|---|---|
| **Razorpay must be Node, not Edge** | `counselor/api/razorpay.ts` sets the Node runtime. Razorpay's SDK 406s on Edge. Don't "optimise" it to Edge. |
| **Deployment Protection** | If a fresh deploy URL returns 401, Vercel's Deployment Protection is on. Disable it or the public URL and payment callbacks break. |
| **Cache-busting** | Non-hashed assets need `?v=N` bumped when they change, or browsers serve stale files. |
| **The `site` deploy is manual** | It's not wired to git. If someone edits `site/` and doesn't run the CLI, production stays on the old build. |
| **`/api/cloud` answers 200, not an error** | With no `SUPABASE_URL`/`SUPABASE_KEY` it returns `{"ok":false,"disabled":true}` at HTTP 200. A health check that only reads the status code will call it healthy. See below. |

---

## Railway is superseded

`Procfile`, `railway.json` and `.railwayignore` describe a Railway deploy of
`uvicorn app.main:app`. **That path is no longer live** — the Python API is served by Vercel via
`api/index.py`, verified by probing `/api/health` in production.

The files are kept so older commits and docs still make sense. If you're wiring something new,
target Vercel.

---

## The app cloud store is unconfigured

The Supabase project `setmycareer` (ref `slxazevtdzbfwhegnfhf`) was retired on **2026-07-19**.
`SUPABASE_URL` and `SUPABASE_KEY` were removed from the `setmycareer-counselor` project and it
was redeployed. Deploy 1 now runs with **no server store for app-layer state**.

```bash
curl -s -X POST https://setmycareer-counselor.vercel.app/api/cloud \
  -H 'content-type: application/json' -d '{"kind":"state","op":"getAll","app":"client","userId":"x"}'
# → {"ok":false,"disabled":true,...}   HTTP 200
```

`counselor/src/lib/cloud.ts` reads that flag, sets `serverReachable = false`, and falls back to
`localStorage` namespaced per user. **This is a designed, tested fallback, not a crash** — portal
sign-in, the signed-in dashboard and Reports were all verified live afterwards with no console
errors. Don't "fix" the 200 or treat the flag as an outage.

| Scope | Effect |
|---|---|
| **Unaffected** | Clients, counsellors, sessions and uploaded reports — all served by the .NET backend at `api.setmycareer.com`. Completed test results are still pushed there. |
| **Lost** | Cross-device sync. Durability — clearing browser data wipes app-layer state. Shared admin state — coupons, refunds and client overrides are now per-browser. |

The code was kept on purpose. `counselor/src/server/cloud-core.ts` speaks plain PostgREST
against two tables (`app_chats`, `app_state`), so re-enabling the store is an environment change,
not a code change: point `SUPABASE_URL`/`SUPABASE_KEY` at any Postgres exposing PostgREST, apply
[`../supabase/migrations/`](../supabase/migrations/), and redeploy.

---

## Rolling back

```bash
npx vercel ls                          # list deployments
npx vercel rollback <deployment-url>   # promote a previous one
```

Rollback is instant and is the correct first move during an incident — diagnose after users are
back on a working build, not before.
