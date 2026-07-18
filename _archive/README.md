# _archive — superseded code, kept for reference

Nothing in this folder is built, imported, or deployed. It's here so history makes sense and so
nothing is silently lost — not because it still runs.

Each entry was verified dead before being moved: every candidate was checked for importers
across `counselor/`, `site/` and `app/` first.

| Folder | What it was | Why it's here | What replaced it |
|---|---|---|---|
| `client-side/` | An early standalone client app — one 356-line `main.jsx` plus a stylesheet | **Zero importers repo-wide.** No `node_modules`, no build output, and its pinned dependency versions no longer exist | `counselor/src/portal/` — the current client portal |
| `voice-agent/` | Prompt + spec package for the voice counsellor: `prompts/system.md`, dialogue exemplars, tool contracts | Never imported as code; its own README declares it separate. **Kept as reference** — the prompt design is still the basis for the live voice persona | `counselor/src/server/assistant-core.ts` + `counselor/api/livekit-token.ts` |
| `Product Cards - AI/` | A single 2.6 MB PNG (`Big Picture -desktop.png`) | Unreferenced anywhere | Product art now lives in each app's `public/` |
| `SVG Logo Assets/` | Three unnamed Illustrator exports (`Asset 1/2/3.svg`) | Unreferenced as build inputs | The shipped logomark lives in each app's `public/` |

---

## If you need something from here

Take the idea, not the file. These were written against older versions of the data contracts and
component APIs; dropping one back into the live tree will not compile.

The one genuinely useful artefact is **`voice-agent/prompts/system.md`** — read it before
changing the voice counsellor's persona, since the current behaviour descends from it.

---

## What is *not* archived, despite looking dead

`Procfile`, `railway.json` and `.railwayignore` remain at the repository root. They describe a
Railway deploy that is **superseded** by Vercel, but they're left in place because removing
deploy configuration is the kind of change that quietly breaks something months later. They are
documented as legacy in [`../docs/DEPLOYMENTS.md`](../docs/DEPLOYMENTS.md) instead.
