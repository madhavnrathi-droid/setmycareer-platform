# Security

This product handles psychometric results and personal data for minors and adults. Treat both
the credentials and the data as sensitive.

---

## The one rule

**Never commit a secret.**

A secret committed once lives in git history **forever** — on every clone, on every
collaborator's laptop, in every fork — even after a later commit removes it. Deleting the line
does not delete the secret.

If you believe a secret has been committed:

1. **Rotate the key first.** Assume it is compromised. Rotation is the fix; history rewriting
   is cleanup.
2. Then clean history (`git filter-repo`) and force-push.
3. Tell the team so nobody re-pushes an old clone that still contains it.

---

## Where secrets actually live

| Where | What |
|---|---|
| **Vercel project → Settings → Environment Variables** | Every production key for all three deploys |
| **Team password manager** (1Password → "SMC E2E test logins") | Test-account passwords, staff logins |
| **Your machine**, gitignored | `.env`, `counselor/.env.local` — never committed |

Committed instead: **`.env.example`** — the same variable names with empty values, so anyone
can see what's needed without learning anything secret.

---

## Key inventory (names only)

| Location | Keys |
|---|---|
| **counselor** (Vercel) | `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`, `GOOGLE_ADS_*` |
| **site** (Vercel) | `RESEND_API_KEY` |
| **Python service** (Vercel) | `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `LLM_MODEL`, `STT_MODEL`, `DATABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `APPWRITE_*`, `RECALL_API_KEY`, `GOOGLE_CLIENT_*`, `ZOHO_CLIENT_*` |
| **Frontend, public by design** | `VITE_SMC_WRITES_ENABLED`, the Razorpay **publishable** key id |

Anything prefixed `VITE_` is compiled into the browser bundle and is **public**. Never put a
secret behind a `VITE_` name.

---

## What is gitignored, and why

| Pattern | Reason |
|---|---|
| `.env`, `.env.*`, `*.env`, `*.local` | Real provider keys |
| `!.env.example` | The template — deliberately kept |
| `.claude/settings.local.json` | Machine-local paths and tool ids |
| `*.pem`, `*.key`, `*credentials*.json` | Key material of any shape |
| `counselor/docs/test-links-batch*.csv/.xlsx` | Generated sheets containing **live** guest-test tokens — anyone with a token can take a test |
| `data/raw/`, `data/processed/`, `data/embeddings/` | Heavy generated artefacts; regenerate via `scripts/` |

---

## Payments

- **Test keys only** in development. Live Razorpay keys move real money.
- The **key secret never reaches the browser** — order creation and HMAC signature verification
  happen server-side in `counselor/api/razorpay.ts`.
- **Prices come from the server catalogue, never the client.** A client that can send a price
  can send `₹1`.
- A payment is only honoured after the **HMAC signature verifies**. The Razorpay success
  callback alone is not proof of payment.

---

## Client data

- **Never hard-delete a client.** The product is built around append-only results and
  soft-archive; see the non-destructive doctrine in `SMC_SYSTEM_ARCHITECTURE.md` §2.0.
- **Don't commit real client data.** No exports, no screenshots with real names, no CSVs of
  users. If you need a fixture, invent one.
- Under-18 clients require parent/guardian consent — that flow exists in the product; don't
  route around it.

---

## The psychometric instruments

`counselor/src/guest/` holds the actual item banks for the four instruments.

- **This repository must stay private.** Published questions let future test-takers prepare,
  which invalidates the results for everyone after them.
- **DBDA and CCPA are published instruments** under licence. Redistribution outside this
  organisation needs the publisher's permission.

---

## Before you push

```bash
# does this commit contain anything that looks like a key?
git diff --cached | grep -nEi 'sk-|rzp_|AIza|eyJ|gsk_|BEGIN [A-Z ]*PRIVATE KEY|password\s*[:=]'

# what files am I actually about to commit?
git status --short
```

If either surprises you, stop and check before pushing.
