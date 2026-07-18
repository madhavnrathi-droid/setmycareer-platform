# Product page — the two-story design (2026-07-11)

## Problem
The programme interludes gave the page selling moments, but neither audience got a
*complete* arc: a professional scrolled a student-centric narrative until near the end,
and the long-term programmes (Blueprint / Autobiography) were absent from the page.

## Approaches considered
- **A — Two doors at the top** (fork/tab the whole page by audience): clean tracks, but
  hides half the content and duplicates the shared product chapters. Rejected.
- **B — One journey, two named personas** threaded through every section: literary, but
  invented personas rub against the honesty doctrine and double the copy. Rejected.
- **C — Shared machine, then two complete stories** *(chosen)*: product chapters stay
  shared and lean; a fork band pivots the page; each audience then gets a full arc.

## The structure (as shipped)
01 overview → showcase → 02 demo → 03 tour → 04 assessments → 05 coach →
**"The first programme · self-serve"** (Navigator + free CRI, audience-neutral, `#packages`) →
06 dashboard/sessions →
**Fork** (`#programmes`): *"The same instruments. Two very different decisions."* + two door rows →
**Story one · Students & parents** (`#students`): situation (₹10–40L degree, 1:3,000 counsellor
ratio — both approved claims) → numbered chapter rows 00 CRI / 01 Navigator / 02 Accelerator /
04 True North with **chapter 03 = the Big Picture feature card** → epilogue band
*"The long game — Blueprint"* (application only, lt_blueprint gradient, → /programs/blueprint) →
**Story two · Working professionals** (`#professionals`, mirrored layout): situation
(*"The switch has a payroll."*; 86% disengaged / 14% thrive — approved catalog claims) →
rows 01 Consultation / 03 Director's Cut with **chapter 02 = the Pivot feature card** →
epilogue *"The long game — Autobiography"* →
how → 07 reports → intelligence (proof/objection-handling) → **Smaller moves** add-on strip → close.

## Rules encoded
- All programme data resolves via `offeringById` / `longTermBySlug` — copy cannot drift from the catalog.
- No prices on the page; no `.btn` CTAs inside stories (whole-card + row links only).
- Every numeric claim traces to approved copy (pricing FAQ / LONGTERM problems data).
- Chapter numbering nests the ladder into one column; the anchor programme is the only card per story.
