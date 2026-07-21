# Ability battery — what the founder must supply / confirm
_Agent A · 2026-07-21 · covers the rebuilt `ability-bank.ts` + `ability-assets.tsx`_

Everything below is precise and numbered. Items are grouped: (a) official answer
keys, (b) figures needing original art or verification, (c) typo fixes we
applied, (d) booklet labelling gaps needing your confirmation.

---

## (a) OFFICIAL ANSWER KEYS needed

The seven test booklets print **no key for any live item**. The Loratis norms
PDF **page 6 is an answer-key page** (headers: VA Part 1, VA Part 2, Numerical,
Closure, Spatial R/S 72, Clerical S/D 72, Mechanical, Reasoning) but its cell
values were not machine-readable. Please transcribe page 6 (or supply the master
key) so the derived keys below can be locked.

1. **MA — all 25 items.** Booklet has no key; we solved each item's physics from
   the figure. Our derived keys (option letter, a–e), with confidence:
   | # | Key | Confidence | Basis |
   |---|-----|------------|-------|
   | 1 | d (Wood) | certain | wooden-handled chisel |
   | 2 | b | **provisional** | bevel/crown train — output arrow senses unresolvable in scan |
   | 3 | d (soldering gun) | certain | |
   | 4 | a (circuit breaker) | certain | |
   | 5 | b | **provisional** | lever fulcrum offsets unreadable; B has the longest effort arm |
   | 6 | d | certain | superelevation raises the OUTER edge of the curve (D) |
   | 7 | c | certain | high anchor + full-span tie |
   | 8 | d (direction B, same speed) | certain | idler between equal gears |
   | 9 | d (lubricant) | certain | |
   | 10 | a | certain | motor drives A; pulleys grow A<B<C |
   | 11 | e (steel, iron, copper, lead) | certain | |
   | 12 | a | **provisional** | X is smaller → faster; crossed belt — but the booklet's 'A' arrow is unresolvable |
   | 13 | b (bimetallic strip) | certain | |
   | 14 | c (chuck) | certain | |
   | 15 | d (straightness of walls) | certain | plumb bob |
   | 16 | e (mixes air and petrol) | certain | |
   | 17 | a | **provisional** | worm-rotation arrow unclear; our rebuilt art is drawn so A is correct |
   | 18 | b (parallel) | certain | physics certain; A/B labels are ours (see d-2) |
   | 19 | b (up-right) | certain | off-centre glance geometry |
   | 20 | b (water) | certain | water far less viscous than oil |
   | 21 | c (cuboid) | **provisional** | most wall+roof+floor material — exact printed dimensions unverifiable |
   | 22 | b (ceiling rod) | **provisional** | vs full-span brace A — booklet intent unverified |
   | 23 | c | **provisional** | true mirror flips arrow left + big dot to centre-right; dot placements fiddly in scan |
   | 24 | b (thick glass) | certain | thermal shock |
   | 25 | d (8) | certain | opposite sectors ×4 |

2. **SA — all 72 items.** The scans' per-item orientation notes were NOT
   chirality-safe, so the digital test *renders* each test figure from its row
   sample by rotate (S) or mirror (R) — the key is true by construction and the
   measurement is valid. But to match the paper form item-for-item, transcribe
   the official 72-item R/S column from norms-PDF page 6 and we will align our
   per-item mirror flags to it (5-minute data edit).

3. **VA — all 24** (solved semantically, high confidence) and **RA — all 12**
   (rules inferred per row, documented in code comments): verify against the
   page-6 key. Note the page-6 header prints "VA Part 1 item 19: No answer" —
   please clarify what that means for scoring.

4. **NA** — 17 items are plain arithmetic (certain). Three had defective print
   and were **reconstructed** — confirm against an intact booklet:
   - NA 8: printed "Divide: 4.8/ 7- 20" (unreadable) → shipped as **4.8 ÷ 4** (= 1.2, option a).
   - NA 18: printed operator "+" fits no option → shipped as **(1/2 − 1/3) ÷ 3/4** (= 2/9, option c).
   - NA 19: printed "{1/2+1/3}" fits no option → shipped as **(1/2 + 1/8)²** (= 25/64, option d).

5. **CA (20)** and **CL (72)** keys are deterministic (unique anagram / string
   equality) — no key needed, but page 6 can double-check them.

## (b) Figures needing original assets or verification

**Placeholder shown in the app today** (item still presented, taker answers from
stem + options; dashed panel reads "Diagram to come — item MA-n"):

1. **MA 5** — three levers: the answer depends entirely on the exact fulcrum
   offsets, which the scan cannot resolve. Need the original drawing (or the
   three fulcrum positions + both weights).
2. **MA 12** — treadle/wheel mechanism: the 'A' direction arrow at wheel X is
   not visible in the scan. Need the original drawing or a statement of which
   arrow is A and which is B.
3. **MA 23** — mirror-image figure X with options A–E: the small dot placements
   inside the six figures are the whole item and are too fiddly at scan
   resolution. Need the original art.

**Rebuilt as line art — please eyeball-verify against the booklet** (the key
does not depend on style, but on these details):

4. **MA 2** — bevel/crown gear: confirm which of B/C is the intended rotation
   sense at the right shaft (our drawing + key currently say B).
5. **MA 17** — worm gear: confirm the worm's rotation arrow; our drawing is
   self-consistent with key A but may mirror the booklet.
6. **MA 1 (chisel)** and the pliers in Example Y are colour **photographs** in
   the booklet; we shipped clean line art. If the photo is considered part of
   the item (e.g. recognising a real wooden handle), supply the photos.
7. **MA 21 / MA 22** — proportions (equal heights, footprints, brace spans)
   redrawn from description; a glance against the booklet is enough.
8. **SA rows 1–12** — the twelve sample shapes are booklet-approximate
   reconstructions (flag, notched disc, banner, chevron, funnel, curvy L,
   hourglass-with-symbols, step polygon, skewed quad, partitioned diamond,
   pinwheel, rabbit-head blob). Chirality-true by construction; supply the
   original art (or hi-res crops, saved under `scratchpad/crops/`) if
   booklet-exact rendering is wanted.

## (c) Typo fixes applied (booklet → shipped)

1. VA 10 stem "APETHETIC" → "APATHETIC".
2. VA 20 option d "He who groups in the dark…" → "…gropes…".
3. VA 22 option d "Action speak louder than words" → "Actions speak…".
4. VA 22 option e "When needs is highest…" → "When need is highest…".
5. MA 2 stem: duplicated clause removed ("…which way does the gear of the
   arrow, which way does the gear o the right turn?" → "…which way does the
   gear on the right turn?").
6. MA 4 stem "A device that the same thing as a fuse does" → "A device that
   does the same thing as a fuse".
7. MA 9 stem "Powered graphite's" → "Powdered graphite".
8. MA 12 option d truncated "slower than wheel" → "slower than wheel Y".
9. MA 15 stem "This tool s used" → "This tool is used".
10. MA 17 option d "first A, then B," → "first A, then B".
11. MA 24 option a printed lowercase "a" → "A".
12. NA 8 / 18 / 19 — reconstructions listed in (a)-4 above.
13. CA — the OLD digital code had wrong stems for items 5 and 15
    ("organizer" → **organize**, "pleasant" → **peasant**); now booklet-correct.
14. Grammar-only smoothings in MA option text (16a "Provides", 16e "Allows",
    21d "All are equal", 22 unchanged meanings) — meaning untouched.

## (d) Booklet labelling gaps needing confirmation

1. **MA 10** — options list a shaft **D**, but the drawing labels only A, B, C.
   Confirm D is a pure distractor (that is how we shipped it).
2. **MA 18** — the two circuits carry **no printed A/B labels**. We labelled
   left (series) = A, right (parallel) = B by reading order, and printed the
   labels in our art. Confirm.
3. **MA 21 / MA 22** — figures are **unlettered** in the booklet; identity is
   left-to-right order. Our art labels them A/B/C explicitly. Confirm order.
4. **SA misprints** (item identity taken from sequence, please confirm):
   row 1 margin-labelled "7-12" (should be 1-6); item 20 printed as "10";
   row 61-66 has no margin label; item 37's answer boxes carry no number.
5. **CL booklet cover is titled "CA"** — body text, 72 pairs and the timing
   table identify it as CL; we shipped it as CL. Confirm the cover is a misprint.
6. **Example Y (MA)** has only four printed options (a, b, d, e — no c).
   Examples are not shown in the digital flow, noted for the record.
7. **NA norms note** — none; norms tables verified cell-for-cell previously
   (three inline misprint corrections already documented in `ability-norms.ts`).
