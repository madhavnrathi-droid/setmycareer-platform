# Setmycareer — Compass Bar, Data-Viz & Apple/Rams Design Spec

The single source of truth for this redesign. Every component must obey it. The
goal: an interface that is **calm, honest, and quietly addictive** — Apple's
restraint and depth, Dieter Rams' discipline, IBM Carbon's data rigor.

---

## 0. Design philosophy → concrete rules

**Dieter Rams (applied):**
- *As little design as possible.* Remove before you add. No decorative borders where contrast or a hairline shadow will do. One accent color (brand blue) for interaction; color elsewhere only carries data meaning.
- *Honest.* Never fake precision or depth. A score's confidence is shown, not hidden (ties to the Methodology page). No fake data, no chartjunk, scales always start at 0.
- *Unobtrusive.* Chrome recedes; content leads. The Compass Bar floats but never blocks.
- *Thorough to the last detail.* Focus rings, hover states, empty states, reduced-motion, keyboard paths, tabular numerals — all present.
- *Long-lasting.* No trend gimmicks. Timeless type, neutral palette.

**Apple (applied):**
- *Depth through softness:* layered, low-opacity shadows + translucency (frosted glass / `backdrop-blur`), never hard drop-shadows.
- *Generous space & alignment:* consistent 4px rhythm; align to a grid; let things breathe.
- *Fluid, spring-like motion:* nothing teleports; nothing bounces garishly. 200–450ms, ease-out / gentle spring. Motion communicates causality.
- *Deference:* the UI is a stage for the user's data. Big, thin numbers; small, quiet labels.
- *Clarity at a glance:* the most important number is the largest thing in any tile.

**Friction laws (reduce complication everywhere):**
- Every primary action reachable in ≤1 click or via the Compass Bar / ⌘K.
- No dead-ends: every list row, card, and stat is tappable to its detail.
- Defaults are smart; confirmations only for irreversible/outward actions.
- Never make the user hunt: the Compass Bar surfaces the right actions for the page they're on.

---

## 1. Token additions (edit `src/index.css`)

Keep all existing tokens. ADD these. Do not remove ink/brand/well/risk/mind/warn.

```css
/* in :root and mirrored in .dark where noted */
--surface-frost: rgba(255,255,255,0.72);     /* light frosted glass */
--surface-frost-strong: rgba(255,255,255,0.86);
--hairline: rgba(35,31,32,0.08);             /* sub-border separators */

/* Apple-style layered shadow scale (soft, multi-stop) */
--shadow-1: 0 1px 2px rgba(35,31,32,0.05);
--shadow-2: 0 2px 8px rgba(35,31,32,0.06), 0 1px 2px rgba(35,31,32,0.05);
--shadow-3: 0 8px 24px rgba(35,31,32,0.08), 0 2px 6px rgba(35,31,32,0.05);
--shadow-float: 0 16px 48px rgba(35,31,32,0.14), 0 4px 12px rgba(35,31,32,0.08);
```
Dark mode `.dark`: `--surface-frost: rgba(29,26,21,0.72)`, `--hairline: rgba(247,246,244,0.10)`, shadows use `rgba(0,0,0,…)` with higher alpha.

Expose via `@theme inline`:
```css
--color-surface-frost: var(--surface-frost);
--color-hairline: var(--hairline);
--shadow-e1: var(--shadow-1); --shadow-e2: var(--shadow-2);
--shadow-e3: var(--shadow-3); --shadow-float: var(--shadow-float);
```
Add a spring-ish motion easing utility and reduced-motion guard already in `gsap.ts`. For CSS transitions use `cubic-bezier(0.32,0.72,0,1)` (Apple-like) — define a `--ease-out-expo` token if useful.

**Usage rule:** prefer `shadow-[var(--shadow-e2)]` + `bg-card` over `border` for elevated cards. Keep ONE hairline (`border-border`) only when separating equal-weight regions. Card radius stays `rounded-2xl`.

---

## 2. The Compass Bar (universal floating command bar)

Replaces the current free-floating draggable `Assistant` panel **and** the topbar
gradient launcher. The bar is the single home for (a) asking the AI and (b) the
most necessary contextual actions for the current page. It will be reused later in
the client app with a different registry — so build it **data-driven**.

### 2.1 Anatomy (matches the user's reference)
A horizontally-centered, **bottom-docked, floating pill** (`fixed bottom-5 left-1/2 -translate-x-1/2`, `z-50`):
- **Frosted glass surface:** `bg-[var(--surface-frost-strong)] backdrop-blur-xl`, `rounded-full`, `shadow-[var(--shadow-float)]`, 1px `border-hairline`. Theme-aware (works on light today; dark-ready).
- **Left — the Ask pill:** a rounded-full sub-pill with a **gradient sparkle** glyph (the yellow→orange→red gradient mark, `Sparkles`/logomark) + placeholder "Ask a question…". This is the AI entry. Hover lifts subtly.
- **Divider:** a short vertical `bg-hairline` 1px, `h-5`.
- **Right — contextual action buttons:** 2–5 icon buttons (size-9, rounded-full, ghost, monoline 1.5-stroke lucide icons), each with a **tooltip** (label + optional ⌘ shortcut). Count and identity change per route (see registry).

### 2.2 States & interaction
1. **Idle (default):** pill bar, Ask + contextual buttons. Always visible across routes.
2. **Asking:** click the Ask pill → it **expands in place** to a single-line input (the contextual buttons gracefully collapse/fade out to give room), with a circular **send** (paper-plane) button + an **X** to collapse back. Enter submits.
3. **Answering — opens UPWARD:** the answer appears as a **frosted card anchored ABOVE the bar** (`bottom: 100%`, `mb-3`), growing from the bar with a spring (translateY + scale + fade). It contains the streamed answer and any **generative-UI cards** (navigate / client / schedule / explain — reuse existing `components/assistant/cards.tsx`). The bar stays docked; the answer floats above it. Multi-turn appends above.
4. **Expand (optional):** a small expand icon in the answer card promotes it to a larger centered reading panel (full conversation) — Apple "detail" affordance. Not draggable (removed for simplicity/Rams).
5. **Close:** X collapses the input and dismisses the answer; bar returns to idle.

Keep the existing AI engine: `useChat` (`@ai-sdk/react`) + `DefaultChatTransport('/api/assistant')`, pass `{context}` (route + clientName) on send, render `message.parts` → text + tool cards. Screen-awareness stays.

### 2.3 Motion
- Bar mount: rise + fade (`y:16→0`, 400ms ease-out) once on first render.
- Ask expand/collapse: width spring + cross-fade of contents (250ms).
- Answer card: `y:8→0, scale:0.98→1, opacity:0→1`, 280ms `--ease-out-expo`; reverse on close.
- Buttons: hover `bg-secondary`, active scale 0.96; respect reduced-motion.

### 2.4 Accessibility
- Bar is a `role="toolbar"` with `aria-label="Compass"`. Ask input has a label. Answer region `role="log" aria-live="polite"`. All icon buttons have `aria-label` + tooltip. Full keyboard: `/` or `⌘K` focuses Ask; `Esc` closes; Tab cycles buttons. 44px min touch targets on mobile.

### 2.5 Per-route button registry (the core UX logic — implement as data)

Define `commandRegistry: Record<RouteMatcher, Action[]>` where each `Action = { id, icon (lucide), label, shortcut?, run(nav, ctx) | popover }`. Only include actions that are **genuinely the most useful on that page**. Count varies by page (Rams: as few as needed).

| Route | Contextual actions (besides Ask) | Rationale |
|---|---|---|
| `/` Dashboard | **New session** (＋), **Find client** (⌘K search), **Review queue** (badge w/ count) | start work, jump to anyone, clear the to-review pile |
| `/clients` list | **New client**, **Filter**, **Sort** | manage the roster |
| `/clients/:id` Hub | **Schedule**, **Add note**, **Export report**, **Join meeting**, **View as client** | the 5 things a counselor does on a client — consolidates the ContextHeader actions into the bar |
| `/calendar` | **New event**, **Today** (jump), **Connect meeting** (Zoom/Meet) | calendar essentials |
| `/transcripts` | **Import transcript**, **Needs-review filter** | get audio in, triage |
| `/reports` | **New report**, **Templates** | reporting essentials |
| `/methodology` | **Print / share** only (fewer buttons — read-mostly page) | demonstrates count decreasing |
| `/settings` | *(none — Ask only)* | nothing necessary |
| session detail / transcript review | **Approve deltas**, **Add note**, **Export** | review actions |

Actions can `run` directly (navigate, open a sheet, fire a toast) or open a small **popover** (e.g. Filter/Sort). Where an action mirrors something already on the page (Schedule/Export on the Hub), wire to the same handler. Buttons fade/swap with a 150ms cross-fade on route change.

### 2.6 Files
- New: `src/components/compass/CompassBar.tsx` (shell + states), `src/components/compass/registry.tsx` (route→actions data + icons), `src/components/compass/AnswerPanel.tsx` (upward answer + chat), `src/components/compass/AskInput.tsx`.
- Reuse: `components/assistant/cards.tsx`, `assistant-core.ts`, `api/assistant.ts`.
- Remove: the old `components/assistant/Assistant.tsx` floating panel + the `AssistantLauncher` in `Topbar.tsx` + its mount in `AppShell.tsx`. Mount `<CompassBar/>` once in `AppShell`. Keep `main` bottom padding (`pb-28`) so content never hides behind the bar.

---

## 3. Data-viz system (do this immediately, make it addictive)

References: IBM Carbon rigor + the chat reference images (big-thin-number stat cards "$128k ↑36.8%", slim mono line/bar charts, gauge dials "90 · Grade A", team-performance bars, calendar density). B&W first, brand-blue for the single focus series, semantic colors only for meaning. **Accuracy > prettiness, but both.**

### 3.1 Make existing primitives addictive (upgrade, don't replace)
- **Charts (`MiniChart`, `Bars`):** turn on tasteful entrance animation — either recharts `isAnimationActive` with `animationDuration={700} animationEasing="ease-out"`, or a GSAP draw on reveal. Add **frosted tooltips** (`bg-[var(--surface-frost-strong)] backdrop-blur shadow-[var(--shadow-e3)] rounded-xl`), hover crosshair on line charts, rounded line caps, subtle area gradient (already present — soften). Numbers in tooltips tabular.
- **ScoreRing / Gauge:** already GSAP-animated — keep. Add a faint inner glow/elevation on the active arc; ensure the threshold tones (≥70 brand, ≥45 warn, else risk) stay but render calm, not alarming.
- **StatCard:** big Montserrat-extralight value (count-up) + tiny eyebrow + semantic `Delta` (↑/↓). Add an optional inline **sparkline** (new) to the right showing the trend behind the number — this is the "addictive" glanceable detail.

### 3.2 New primitives to add (`src/components/custom/`)
- **`Sparkline.tsx`** — tiny inline area/line (no axes), ~64×24, mono ink stroke + soft fill, last-point dot. For StatCards and list rows.
- **`Radar.tsx`** — radar/spider chart (recharts `RadarChart`) for multi-axis profiles (RIASEC, Big Five, the 5 career clusters). Thin grid, single brand-blue polygon w/ low-opacity fill, animated draw. This is the centerpiece of the Tests + Client overview.
- **`TrendArea.tsx`** — a larger area trend with gradient + crosshair tooltip + optional comparison band (e.g. career index across sessions, vs cohort). 
- **`Donut.tsx`** — thin donut for composition (e.g. caseload by status / risk mix) with center total.
- **`DeltaPill.tsx`** — `↑ 3` / `↓ 2` semantic chip used inline next to scores (well/risk tones), tabular.

All: respect reduced-motion, carry `aria-label`, use ink + the chart tokens, animate-in on reveal, frosted tooltips, never start bars above 0.

### 3.3 Where to apply (per screen)
- **Dashboard (`Overview`):** a hero **TrendArea** of caseload career-index over the last N weeks; StatCards each with a **Sparkline**; a **Donut** of caseload by risk/status; keep the bento.
- **Client Hub overview (`ClientOverview`):** replace the flat cluster bars with a **Radar** of the 5 clusters (career fingerprint) PLUS a **TrendArea** of career index across this client's sessions (with a wellbeing line overlaid, semantic mind tone) — the "are they climbing, and at what cost" view. Keep the clinical layer. Add **info superscripts** (`MetricInfo`) on every headline number.
- **Tests (`ClientTests`):** RIASEC + Big Five as **Radar**s; score history as small multiples.
- **Sessions / SessionDetail:** per-session **signal delta** bars (`DeltaPill`s) + a sparkline of momentum across sessions.
- **Reports:** mini previews use Sparklines/rings.

### 3.4 Aesthetic rules
- One focus series in brand-blue; everything else ink. Wellbeing overlays in `mind`. Positive/negative deltas in `well`/`risk` only.
- Gridlines `ink-100`, ticks `ink-300` size 10, tabular. Axis labels minimal; prefer direct labeling.
- Smooth, single, ease-out entrance — no looping/idle animation (Rams: unobtrusive). Hover reveals exact values.
- Every chart sits in a `rounded-2xl` card with `shadow-[var(--shadow-e2)]`, generous padding, an eyebrow label + the headline number above the chart.

---

## 4. Apple/Rams polish pass (whole UI)
- Swap heavy `border border-border` cards → `shadow-[var(--shadow-e2)]` + subtle bg; keep hairlines only as separators. Sidebar, Topbar, ContextHeader become frosted (`backdrop-blur` + `--surface-frost`) and lose hard borders in favor of a single hairline.
- Unify radii (cards `rounded-2xl`, controls `rounded-xl`/`rounded-full`). Unify spacing to 4px rhythm (p-4/p-5/gap-4/gap-6).
- Motion: route transitions get the `revealChildren` stagger (already present) — ensure every screen root uses `useGsap(revealChildren)`. Add gentle hover lifts (`hover:-translate-y-0.5 transition`) on tappable cards.
- Focus-visible rings everywhere (`ring-2 ring-ring`). Ensure WCAG-AA contrast (the very-light extralight headings on canvas must stay ≥ AA — darken to `text-ink-700` if needed).
- Reduce chrome: collapse duplicate actions (ContextHeader vs Compass Bar) — prefer the bar; keep ContextHeader identity + key stats only.

---

## 5. Conventions (match existing code exactly)
- Tailwind v4 `@theme` tokens only (no arbitrary hex). `cn()` from `@/lib/utils`. Icons: `lucide-react`, 1.5 stroke. Fonts: `font-display` (Montserrat) for big numbers/headings, `font-sans` (Inter) for UI. Animations via `@/lib/gsap` (`useGsap`, `revealChildren`, `countUp`, `EASE`, `DUR`, `prefersReducedMotion`). Charts via `recharts` + existing `@/components/ui/chart` wrappers. shadcn/ui (New York). React 19 + TS strict; everything must pass `tsc -b`.
- Mock data: `@/lib/mock`; types: `@/lib/types`. Don't fabricate new client fields without adding to types + mock.
- Keep it tight + curved (rounded-2xl, p-4/p-5). Tabular numerals on all numbers.

## 6. Definition of done
`npm run build` green; no console errors; Compass Bar works (ask → answer-on-top, contextual buttons swap per route); data-viz upgraded on Dashboard + Client Hub + Tests; Apple/Rams polish visible; reduced-motion + keyboard + AA respected.
