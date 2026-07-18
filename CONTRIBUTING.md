# Contributing

House rules for working in this repository. They exist because each one has cost us something.

---

## Before you start

1. Read [`docs/SECURITY.md`](docs/SECURITY.md). The one rule: never commit a secret.
2. Read [`docs/LOCAL_SETUP.md`](docs/LOCAL_SETUP.md) and get the app running.
3. Skim [`counselor/docs/SMC_SYSTEM_ARCHITECTURE.md`](counselor/docs/SMC_SYSTEM_ARCHITECTURE.md)
   so you know which of the four surfaces you're touching.

---

## The loop

```bash
# 1. branch
git checkout -b your-change

# 2. work, then typecheck — --force is not optional
cd counselor && npx tsc -b --force

# 3. build (catches things tsc doesn't)
npm run build

# 4. verify in the browser — actually drive the flow you changed
npm run dev

# 5. commit
git add -A && git commit -m "portal: clear description of the change"
```

**Never mark work done without running it.** A typecheck passing is not evidence the feature
works; open the screen and use it.

---

## Code conventions

**Match the surrounding code.** Comment density, naming and idiom vary by area — follow the
file you're in rather than importing a different house style.

- **British spelling** in user-facing copy: *counsellor*, *personalise*, *behaviour*.
- **Comments explain *why*,** not what. The code says what.
- **No dead UI.** Every button does something visible: navigate, change state, or show a toast
  that tells the truth. A toast claiming success for something that didn't happen is worse than
  no button — we audited 27 of these out of the product; don't add more.
- **Honest empty states.** If there's no data, say so plainly and offer the action that creates
  some. Never fake content to fill space.
- **Derive, don't duplicate.** Scores, totals and statuses come from one source. If you're
  computing the same number two ways, one of them will drift.

### TypeScript

- `tsc -b --force` before every commit. Incremental mode silently skips files and hides
  unused-variable errors.
- Watch for **module-eval TDZ**: a top-level statement calling a `const` arrow function declared
  further down the file throws at import and blanks the whole app. `tsc` and the build both miss
  it. Use a hoisted `function` for anything called at module top level.

### React

- Hooks before any conditional return — hook order must be stable across renders.
- Grid children that can overflow need `min-w-0`, or the grid refuses to shrink.
- In browser automation, re-query DOM nodes between clicks; React re-renders detach old refs and
  clicks silently no-op.

---

## Data & money rules

These are product invariants, not preferences:

- **Never hard-delete a client.** Soft-archive only, audited and reversible.
- **Test results are append-only.** A retake is a new row; history is the product.
- **Prices come from the server**, never the client.
- **A payment counts only after HMAC verification.** The success callback is not proof.
- **Writes to the live backend are gated** by `VITE_SMC_WRITES_ENABLED`. Keep it `false` locally
  unless you're deliberately testing a write.

---

## Working on the psychometrics

The instruments in `counselor/src/guest/` are live assessment materials.

- **Don't change item wording or scoring** without the validated source. These are normed
  instruments; an edit invalidates comparability with everyone who has already tested.
- Ability keys are **uppercase** (`VA`, `SA`, `RA`, `NA`, `MA`, `CL`, `CA`). Lowercase won't
  resolve to labels and users will see raw codes.
- Interpretation text must **describe, never prescribe** — say what the pattern is and what it
  tends to suit; never name a career. That's the counsellor's job, with the client present.

---

## Commit messages

```
area: what changed and why it matters

portal: fix session transcript hand-off to Compass
site: cut hero copy to one claim
python: add confidence propagation to career graph
```

Prefix with the area (`portal`, `admin`, `console`, `site`, `python`, `docs`, `guest`). Present
tense. Say the effect, not the mechanics.

---

## What not to commit

- Secrets, keys, `.env*` files (see [`docs/SECURITY.md`](docs/SECURITY.md))
- Real client data — no exports, no screenshots with real names
- `node_modules/`, `dist/`, build output
- Large binaries; put assets in the relevant app's `public/`
- Commented-out code — git remembers it for you
