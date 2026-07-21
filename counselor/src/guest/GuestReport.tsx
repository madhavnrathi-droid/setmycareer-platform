// The guest results report — every number comes from the testing logic alone
// (the FINAL instruments: Personality Assessment workbook, Career Interest
// Assessment manual, Loratis DBDA norms, and the CCPA competency manual). The
// optional AI consolidation interprets the pattern but can never add scores.
// Print-first: "Download PDF" is window.print() with a dedicated print
// stylesheet, because nothing is stored on any server.

import { useMemo, useState } from "react"
import { Download, Sparkles, ShieldCheck, Loader2, ChevronDown } from "lucide-react"
import { GlowField, TopBar, TEST_HUE, type OnlyTest } from "./GuestFlow"
import { ABILITY_SECTIONS, rawScore } from "./ability-bank"
import { scoreAbilitySection, normBandFor, ABILITY_MEANING, type AbilityScore } from "./ability-norms"
import { scorePfin, type PfinResult } from "./personality-final"
import { scoreIfin, ifinBand, ifinPairConsistency, ifinTiming, type IfinResult, type IfinClusterScore } from "./interest-final"
import { IREPORT, clusterDef, weDef, jcDef } from "./interest-defs"
import { scoreCcpa, type CcpaResult, type MostLeast } from "./ccpa"
import { useGuest, updateGuest, resetGuest } from "./guest-store"

interface AiSummary {
  overview?: string
  strengths?: string[]
  watchouts?: string[]
  jobGroups?: { name: string; why: string; roles?: string[] }[]
  paths?: { horizon: string; focus: string }[]
  subjects?: string[]
}

/* a small labelled chip used in the executive summary */
function SumChip({ label, value, mutStyle }: { label: string; value: string; mutStyle: React.CSSProperties }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 rounded-full border px-3 py-1 text-[11.5px]" style={{ borderColor: "var(--gline)" }}>
      <span style={mutStyle}>{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  )
}

/* an interest bar row that toggles its definition inline (screen only — print
   uses the per-section glossaries instead) */
function DefBarRow({ i, label, value, right, def, mutStyle }: {
  i: number; label: string; value: number; right?: React.ReactNode; def: string; mutStyle: React.CSSProperties
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="gt-row" style={{ borderTop: i ? "1px solid var(--gline)" : undefined }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-2 text-left">
        <span className="w-5 shrink-0 text-[11px] tabular-nums" style={mutStyle}>{i + 1}</span>
        <p className="w-[40%] min-w-0 truncate text-[12.5px]">{label}</p>
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: "var(--gfg)" }} />
        </div>
        <span className="w-8 shrink-0 text-right text-[12.5px] tabular-nums">{Math.round(value)}</span>
        <span className="flex w-[112px] shrink-0 items-center justify-end text-right text-[10.5px]" style={mutStyle}>{right}</span>
        <ChevronDown className="gt-noprint size-3.5 shrink-0 transition-transform" style={{ ...mutStyle, transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && (
        <p className="gt-noprint px-4 pb-3 pl-12 pr-10 text-[12px] leading-relaxed" style={mutStyle}>{def}</p>
      )}
    </div>
  )
}

/* section-level "How to read this" disclosure — screen only */
function HowToRead({ children, mutStyle }: { children: React.ReactNode; mutStyle: React.CSSProperties }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="gt-noprint mt-2">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-[11.5px] font-medium underline-offset-4 hover:underline" style={mutStyle}>
        How to read this
        <ChevronDown className="size-3" style={{ transform: open ? "rotate(180deg)" : undefined }} />
      </button>
      {open && <div className="mt-2 rounded-xl border p-3.5 text-[12px] leading-relaxed" style={{ borderColor: "var(--gline)", background: "var(--gcard)", ...mutStyle }}>{children}</div>}
    </div>
  )
}

interface GlossEntry { name: string; chip: string; band: string; def: string }

/* print-only personalized glossary: two columns, each entry = name + the
   taker's score + band + the verbatim definition */
function PrintGlossary({ title, entries, mutStyle }: { title: string; entries: GlossEntry[]; mutStyle: React.CSSProperties }) {
  return (
    <div className="gt-printonly mt-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mutStyle}>{title}</p>
      <div className="gt-glossary mt-2">
        {entries.map((e) => (
          <div key={e.name} className="gt-glossentry">
            <p className="text-[11px]">
              <span className="font-semibold">{e.name}</span>{" "}
              <span className="rounded-full border px-1.5 text-[10px] tabular-nums" style={{ borderColor: "var(--gline)" }}>{e.chip}</span>{" "}
              <span style={mutStyle}>{e.band}</span>
            </p>
            <p className="mt-0.5 text-[10px] leading-snug" style={{ ...mutStyle, whiteSpace: "normal", wordBreak: "normal", overflowWrap: "anywhere" }}>{e.def}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GuestReport({ token, dark, onToggle, only }: { token: string; dark: boolean; onToggle: () => void; only: OnlyTest | null }) {
  const state = useGuest(token)
  const d = state.details!
  const isExec = d.track === "executive"
  const [aiBusy, setAiBusy] = useState(false)
  const [aiErr, setAiErr] = useState<string | null>(null)
  const ai = (state.aiSummary as AiSummary | undefined) ?? undefined

  const show = (t: OnlyTest) => (only == null ? (t === "ability" ? !isExec : t === "competency" ? isExec : true) : only === t)

  // ── deterministic scoring ──
  const ability = useMemo(() => {
    const scores: (AbilityScore & { label: string })[] = []
    for (const s of ABILITY_SECTIONS) {
      const answers = state.ability?.answers[s.key] ?? []
      const { raw, attempted } = rawScore(s, answers)
      scores.push({ ...scoreAbilitySection(s.key as AbilityScore["key"], raw, attempted, d.age, d.gender), label: s.label })
    }
    return { scores }
  }, [state.ability, d.age, d.gender])

  const interest: IfinResult = useMemo(() => scoreIfin(state.interest ?? []), [state.interest])
  const personality: PfinResult = useMemo(() => scorePfin(state.personality ?? []), [state.personality])
  const competency: CcpaResult = useMemo(
    () => scoreCcpa(
      (state.competency?.sjt ?? []) as (MostLeast | null)[],
      (state.competency?.fc ?? []) as (MostLeast | null)[],
      state.competency?.lik ?? [],
    ),
    [state.competency],
  )

  const normBand = normBandFor(d.age)
  // hobby-gap callouts (|HCG| > 20 per the manual's interpretation table)
  const hobbyGaps = interest.clusters.filter((c): c is IfinClusterScore & { hcg: number } => c.hcg != null && Math.abs(c.hcg) > 20)

  // interest reliability inputs — pair agreement across the 88 construct pairs
  // and per-item response times (recorded only for newer attempts)
  const pairCheck = useMemo(() => ifinPairConsistency(state.interest ?? []), [state.interest])
  // Displayed confidence folds pair consistency into the flag-based level: a
  // taker whose paired statements disagree should never read "High" beside an
  // 8% consistency figure. Capped, never raised.
  const effectiveConfidence = useMemo(() => {
    const order = ["Low", "Moderate", "High"] as const
    const base = interest.flags.confidence
    const cap = pairCheck.consistency == null ? "High" : pairCheck.consistency < 50 ? "Low" : pairCheck.consistency < 75 ? "Moderate" : "High"
    return order[Math.min(order.indexOf(base), order.indexOf(cap))]
  }, [interest.flags.confidence, pairCheck.consistency])
  const timing = useMemo(() => ifinTiming(state.interestTimes), [state.interestTimes])

  const runAi = async () => {
    setAiBusy(true); setAiErr(null)
    try {
      const res = await fetch("/api/consolidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          details: d,
          track: d.track,
          ability: isExec ? [] : ability.scores.map((s) => ({ key: s.key, label: s.label, raw: s.raw, max: s.max, grade: s.grade, band: s.band, percentile: s.percentile })),
          competency: isExec ? competency.comps.map((c) => ({ code: c.code, label: c.label, composite: c.composite, band: c.band })) : undefined,
          interest: interest.byCareer.slice(0, 12).map((c) => ({ factor: c.label, attraction: c.attraction, career: c.career, hcg: c.hcg, category: c.category })),
          personality: personality.factors.map((f) => ({ label: f.label, score: f.score, band: f.band })),
        }),
      })
      const data = (await res.json()) as { ok?: boolean; summary?: AiSummary; error?: string }
      if (!res.ok || !data.ok || !data.summary) throw new Error(data.error || "The AI consolidation didn't come back — try again.")
      updateGuest(token, { aiSummary: data.summary })
    } catch (e) {
      setAiErr(e instanceof Error ? e.message : "Consolidation failed — try again.")
    } finally {
      setAiBusy(false)
    }
  }

  const line = { borderColor: "var(--gline)" }
  const card = { borderColor: "var(--gline)", background: "var(--gcard)" }
  const mut = { color: "var(--gmut)" }

  return (
    <>
      <style>{`
        .gt-printonly { display: none; }
        @media print {
          .gt-noprint { display: none !important; }
          .gt-printonly { display: block !important; }
          .gt-report-root { background: #fff !important; color: #111 !important; }
          .gt-report-root * { --gbg: #fff; --gfg: #111; --gmut: #555; --gline: #ddd; --gcard: #fff; }
          .gt-section { break-inside: avoid; }
          .gt-break { break-after: page; }
          .gt-row, .gt-glossentry, .gt-block { break-inside: avoid; }
          .gt-glossary { column-count: 2; column-gap: 8mm; }
          /* overflow clips in print — let labels wrap instead of truncating */
          .gt-report-root .truncate { overflow: visible; white-space: normal; text-overflow: clip; }
          @page { margin: 14mm; }
        }
      `}</style>
      <div className="gt-report-root relative flex min-h-svh flex-col" style={{ background: "var(--gbg)", color: "var(--gfg)" }}>
        <div className="gt-noprint"><TopBar dark={dark} onToggle={onToggle} /></div>
        <div className="gt-noprint"><GlowField hues={TEST_HUE.ability} /></div>

        {/* download reminder — the one thing the taker must not skip */}
        <div className="gt-noprint relative z-10 mx-auto w-full max-w-[760px] px-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={card}>
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" style={mut} />
              <p className="max-w-[46ch] text-[13px] leading-relaxed" style={mut}>
                Your results exist only on this device — nothing is stored on our servers.
                <span style={{ color: "var(--gfg)" }}> Download the PDF before you close this page</span> and send it back to the SetMyCareer team.
              </p>
            </div>
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[13.5px] font-medium"
              style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
              <Download className="size-4" /> Download PDF
            </button>
          </div>
        </div>

        <main className="relative z-10 mx-auto w-full max-w-[760px] flex-1 px-6 pb-24 pt-8">
          {/* header */}
          <header className="gt-section">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={mut}>
              SetMyCareer · {only ? "Single-test report" : "Assessment report"}
            </p>
            <h1 className="mt-2 font-display text-[clamp(28px,4.6vw,40px)] font-light tracking-tight">{d.name}</h1>
            <p className="mt-1.5 text-[13px]" style={mut}>
              Age {d.age} · {d.gender === "male" ? "Male" : "Female"} · {d.grade}{d.city ? ` · ${d.city}` : ""} ·{" "}
              {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} · Ref {token}
            </p>
          </header>

          {/* ── ability (student track / only=ability) ── */}
          {show("ability") && (
          <section className="gt-section mt-10">
            <h2 className="font-display text-[20px] font-light tracking-tight">Ability profile</h2>
            <p className="mt-1 text-[12.5px]" style={mut}>
              DBDA standard scores A (highest) to J against the {normBand.label} {d.gender} norm group. Spatial and Clerical
              are speed tests — most people do not finish them, and the norms account for that.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border" style={line}>
              {ability.scores.map((s, i) => (
                <div key={s.key} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? `1px solid var(--gline)` : undefined }}>
                  <div className="w-[38%] min-w-0">
                    <p className="truncate text-[13.5px] font-medium">{s.label}</p>
                    <p className="text-[11px] tabular-nums" style={mut}>{s.raw} / {s.max} correct · {s.attempted} attempted</p>
                  </div>
                  <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
                    <div className="h-full rounded-full" style={{ width: `${s.percentile}%`, background: "var(--gfg)" }} />
                  </div>
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg border text-[13px] font-semibold" style={line}>{s.grade}</span>
                  <span className="w-[92px] shrink-0 text-right text-[12px]" style={mut}>{s.band}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {ability.scores.filter((s) => s.rank >= 4).slice(0, 4).map((s) => (
                <div key={s.key} className="rounded-xl border p-3.5" style={card}>
                  <p className="text-[12.5px] font-medium">{s.label} — {s.band}</p>
                  <p className="mt-1 text-[12px] leading-relaxed" style={mut}>{ABILITY_MEANING[s.key]}</p>
                </div>
              ))}
            </div>
          </section>
          )}

          {/* ── competency (executive track / only=competency) ── */}
          {show("competency") && (
          <section className="gt-section mt-10">
            <h2 className="font-display text-[20px] font-light tracking-tight">Competency &amp; potential profile</h2>
            <p className="mt-1 text-[12.5px]" style={mut}>
              Twelve competencies on a 0–100 developmental scale, each measured three ways — situational judgement (40%),
              most/least choices (30%) and self-ratings (30%). These describe behavioural tendencies, not technical skill;
              a lower score is not automatically a weakness.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border" style={line}>
              {[...competency.comps].sort((a, b) => (b.composite ?? 0) - (a.composite ?? 0)).map((c, i) => (
                <div key={c.code} className="px-4 py-2.5" style={{ borderTop: i ? `1px solid var(--gline)` : undefined }}>
                  <div className="flex items-center gap-3">
                    <p className="w-[38%] min-w-0 truncate text-[13px] font-medium">{c.label}</p>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
                      <div className="h-full rounded-full" style={{ width: `${c.composite ?? 0}%`, background: "var(--gfg)" }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[13px] font-medium tabular-nums">{c.composite ?? "—"}</span>
                    <span className="w-[120px] shrink-0 text-right text-[11px]" style={mut}>{c.band ?? ""}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] tabular-nums" style={mut}>
                    Scenarios {c.sjt ?? "—"} · Choices {c.fc ?? "—"} · Self-ratings {c.lik ?? "—"}
                  </p>
                </div>
              ))}
            </div>
            {competency.top.length > 0 && (
              <div className="mt-3 rounded-2xl border p-4" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Standout competencies</p>
                <div className="mt-2 flex flex-col gap-2">
                  {competency.top.map((c) => (
                    <p key={c.code} className="text-[12.5px] leading-relaxed">
                      <span className="font-semibold">{c.label} ({c.composite})</span>{" "}
                      <span style={mut}>— {c.blurb}</span>
                    </p>
                  ))}
                </div>
              </div>
            )}
            {competency.flags.notes.length > 0 && (
              <div className="mt-3 rounded-xl border p-3.5" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={mut}>Response-quality notes</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {competency.flags.notes.map((n, i) => <li key={i} className="text-[12px] leading-relaxed" style={mut}>• {n}</li>)}
                </ul>
              </div>
            )}
          </section>
          )}

          {/* ── interests: the full Career Interest Assessment Report ── */}
          {show("interest") && (() => {
            const firstName = d.name.split(" ")[0]
            const topA = interest.byAttraction.slice(0, 3)
            const topC = interest.byCareer.slice(0, 3)
            const weSorted = [...interest.we].filter((f) => f.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            const jcSorted = [...interest.jc].filter((f) => f.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
            const interestDate = new Date(state.interestDoneAt ?? Date.now())
              .toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
            const styleLine = interest.flags.highEndorsement
              ? "High agreement across most items — elevated scores may partly reflect response style rather than interest."
              : interest.flags.lowEndorsement
                ? "Low agreement across most items — depressed scores may partly reflect response style rather than interest."
                : "Balanced use of the rating scale — no strong response-style pattern."
            const glossClusters = interest.clusters
              .filter((c) => c.attraction != null || c.career != null)
              .sort((a, b) => (b.career ?? -1) - (a.career ?? -1))
            return (
          <section className="mt-10">
            {/* report cover */}
            <div className="gt-break gt-block rounded-2xl border p-6 sm:p-8" style={card}>
              <p className="text-[11px] font-medium uppercase tracking-[0.18em]" style={mut}>SetMyCareer</p>
              <h2 className="mt-2 font-display text-[clamp(22px,3.6vw,30px)] font-light tracking-tight">{IREPORT.title}</h2>
              <p className="mt-1 text-[13px]" style={mut}>{IREPORT.coverSubtitle}</p>
              <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {[
                  ["Candidate", d.name],
                  ["Client ID", token],
                  [isExec ? "Profession" : "Class", d.grade],
                  ["Assessment date", interestDate],
                ].map(([k, v]) => (
                  <div key={k}>
                    <p className="text-[10.5px] font-medium uppercase tracking-[0.12em]" style={mut}>{k}</p>
                    <p className="mt-0.5 text-[13px] font-medium" style={{ overflowWrap: "anywhere" }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* executive summary */}
            <div className="gt-break gt-block mt-6">
              <h3 className="font-display text-[18px] font-light tracking-tight">Executive summary</h3>
              <p className="mt-2 max-w-[68ch] text-[13px] leading-relaxed">
                This report compares two reads of the same 34 interest areas. The first asks what naturally
                attracts {firstName} — enjoyment alone. The second asks what could sustain a career: willingness
                to do the real work repeatedly, weighed with preferred working conditions and preferred ways of
                working.{" "}
                {topC.length > 0
                  ? `${topC.map((c) => c.label).join(", ")} lead the career-level read`
                  : "Too few items were answered to rank the career-level read"}
                {topA.length > 0 ? `, and ${topA[0].label} sits highest on pure attraction.` : "."}{" "}
                {weSorted.length > 0 && jcSorted.length > 0 &&
                  `Among the preference factors, a ${weSorted[0].label.toLowerCase()} environment and ${jcSorted[0].label.toLowerCase()} work rank first.`}{" "}
                Response quality for this attempt is rated {interest.flags.confidence.toLowerCase()} — the
                reliability section at the end shows how that was checked.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {topA.map((c, i) => <SumChip key={c.label} label={`Attraction ${i + 1}`} value={c.label} mutStyle={mut} />)}
                {topC.map((c, i) => <SumChip key={c.label} label={`Career ${i + 1}`} value={c.label} mutStyle={mut} />)}
                {weSorted[0] && <SumChip label="Environment" value={weSorted[0].label} mutStyle={mut} />}
                {jcSorted[0] && <SumChip label="Way of working" value={jcSorted[0].label} mutStyle={mut} />}
                <SumChip label="Confidence" value={effectiveConfidence} mutStyle={mut} />
              </div>
            </div>

            {/* graph 1 — activity-level */}
            <div className="gt-break mt-8">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em]" style={mut}>Graph 1 · {IREPORT.graph1Title}</p>
              <h3 className="mt-1 font-display text-[18px] font-light tracking-tight">{IREPORT.graph1Question}</h3>
              <p className="mt-1 max-w-[64ch] text-[12px]" style={mut}>
                Attraction alone — what pulls {firstName}, before the day-to-day work behind it is weighed.
                All 34 areas, highest first. <span className="gt-noprint">Select any row to read what it measures.</span>
              </p>
              <HowToRead mutStyle={mut}>
                Each area gets a 0 to 100 attraction score from ratings of statements about enjoying and being
                curious about it. Bands: 80 and above very strong · 65 to 79 strong · 50 to 64 moderate · 35 to 49
                low · below 35 very low. A high attraction score does not by itself mean the day-to-day work would
                suit you — compare it with Graph 2.
              </HowToRead>
              <div className="mt-3 overflow-hidden rounded-2xl border" style={line}>
                {interest.byAttraction.map((c, i) => (
                  <DefBarRow key={c.label} i={i} label={c.label} value={c.attraction ?? 0}
                    right={c.attractionBand ?? ""} def={clusterDef(c.label)} mutStyle={mut} />
                ))}
              </div>
            </div>

            {/* graph 2 — career-level */}
            <div className="gt-break mt-8">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.16em]" style={mut}>Graph 2 · {IREPORT.graph2Title}</p>
              <h3 className="mt-1 font-display text-[18px] font-light tracking-tight">{IREPORT.graph2Question}</h3>
              <p className="mt-1 max-w-[64ch] text-[12px]" style={mut}>
                Willingness to do the real work repeatedly (50%), plus fit with preferred working conditions (25%)
                and preferred ways of working (25%). This read compares preferences only — it does not measure
                ability or guarantee success. <span className="gt-noprint">Select any row to read what it measures.</span>
              </p>
              <HowToRead mutStyle={mut}>
                The career-level score asks whether an interest could survive real working life, not just whether
                it is enjoyable to think about. The label on each row is the recommendation category from the
                scoring model — from Strongly Supported down to Not Currently Supported, with Hobby / Side Pursuit
                marking areas whose attraction runs well ahead of the appetite for their actual work.
              </HowToRead>
              <div className="mt-3 overflow-hidden rounded-2xl border" style={line}>
                {interest.byCareer.map((c, i) => (
                  <DefBarRow key={c.label} i={i} label={c.label} value={c.career ?? 0}
                    right={c.category
                      ? <span className="min-w-0 max-w-full truncate rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: "var(--gline)" }}>{c.category}</span>
                      : null}
                    def={clusterDef(c.label)} mutStyle={mut} />
                ))}
              </div>

              {/* where the two reads differ */}
              {hobbyGaps.length > 0 && (
                <div className="gt-block mt-4 rounded-2xl border p-4" style={card}>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Where the two reads differ</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {hobbyGaps.slice(0, 5).map((c) => (
                      <p key={c.label} className="text-[12.5px] leading-relaxed">
                        <span className="font-medium">{c.label}</span>{" "}
                        <span style={mut}>
                          {c.hcg > 0
                            ? `— attracts you (${c.attraction}) more than its day-to-day work suits you (${c.career}). May fit better as a hobby or side pursuit.`
                            : `— its real work conditions suit you (${c.career}) more than your current attraction (${c.attraction}). Real-world exposure may reveal hidden potential.`}
                        </span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <PrintGlossary title="Interest areas — your scores, explained" mutStyle={mut}
                entries={glossClusters.map((c) => ({
                  name: c.label,
                  chip: `Attraction ${c.attraction ?? "—"} · Career ${c.career ?? "—"}`,
                  band: c.careerBand ?? c.attractionBand ?? "",
                  def: clusterDef(c.label),
                }))} />
            </div>

            {/* preferred work environment + job characteristics */}
            <div className="gt-break mt-8">
              <h3 className="font-display text-[18px] font-light tracking-tight">{IREPORT.weTitle}</h3>
              <p className="mt-1 max-w-[64ch] text-[12px]" style={mut}>
                Ten factors describing the settings {firstName} would prefer to work in, 0 to 100, highest
                first. <span className="gt-noprint">Select any row for its definition.</span>
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border" style={line}>
                {weSorted.map((f, i) => (
                  <DefBarRow key={f.key} i={i} label={f.label} value={f.score ?? 0}
                    right={f.score != null ? ifinBand(f.score) : ""} def={weDef(f.key)} mutStyle={mut} />
                ))}
              </div>
              <PrintGlossary title="Work environment factors — your scores, explained" mutStyle={mut}
                entries={weSorted.map((f) => ({
                  name: f.label, chip: String(f.score), band: f.score != null ? ifinBand(f.score) : "", def: weDef(f.key),
                }))} />

              <h3 className="mt-8 font-display text-[18px] font-light tracking-tight">{IREPORT.jcTitle}</h3>
              <p className="mt-1 max-w-[64ch] text-[12px]" style={mut}>
                Ten factors describing the kind of work {firstName} would prefer to do, 0 to 100, highest
                first. <span className="gt-noprint">Select any row for its definition.</span>
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border" style={line}>
                {jcSorted.map((f, i) => (
                  <DefBarRow key={f.key} i={i} label={f.label} value={f.score ?? 0}
                    right={f.score != null ? ifinBand(f.score) : ""} def={jcDef(f.key)} mutStyle={mut} />
                ))}
              </div>
              <PrintGlossary title="Job characteristic factors — your scores, explained" mutStyle={mut}
                entries={jcSorted.map((f) => ({
                  name: f.label, chip: String(f.score), band: f.score != null ? ifinBand(f.score) : "", def: jcDef(f.key),
                }))} />
            </div>

            {/* reliability + confidence */}
            <div className="gt-block mt-8">
              <h3 className="font-display text-[18px] font-light tracking-tight">Reliability index</h3>
              <p className="mt-1 max-w-[64ch] text-[12px]" style={mut}>
                Five checks on how this attempt was answered — they describe response quality, not the person.
              </p>
              <div className="mt-3 overflow-hidden rounded-2xl border" style={line}>
                {[
                  ["Response consistency", pairCheck.consistency != null
                    ? `${pairCheck.consistency}% — each construct is asked through paired statements; ${pairCheck.divergentPairs} of ${pairCheck.totalPairs} pairs were answered two or more scale points apart.`
                    : "Not enough fully answered pairs to compute."],
                  ["Straight-lining", interest.flags.straightLining
                    ? "Flagged — most items received the same rating, so differences between areas may be understated."
                    : "Not detected."],
                  ["Missing responses", `${interest.flags.missingPct}% of the 176 items were left unanswered.`],
                  ["Response style", styleLine],
                  ["Item response time", timing.recorded
                    ? `Median ${timing.medianSec} seconds per item${timing.fastPct != null ? ` · ${timing.fastPct}% of items answered in under 1.2 seconds` : ""}.`
                    : "Not recorded for this attempt."],
                ].map(([name, value], i) => (
                  <div key={name as string} className="gt-row flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:items-baseline sm:gap-3"
                    style={{ borderTop: i ? "1px solid var(--gline)" : undefined }}>
                    <p className="w-[170px] shrink-0 text-[12.5px] font-medium">{name}</p>
                    <p className="min-w-0 flex-1 text-[12px] leading-relaxed" style={mut}>{value}</p>
                  </div>
                ))}
              </div>
              <div className="gt-block mt-3 rounded-2xl border p-4" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Confidence index</p>
                <p className="mt-1.5 text-[13px]">
                  <span className="font-semibold">{effectiveConfidence}</span>{" "}
                  <span style={mut}>
                    — combines the quality checks above with pair consistency: it is capped at
                    moderate when fewer than three in four paired statements agree, and at low
                    when fewer than half do. Hidden inconsistencies: {pairCheck.divergentPairs} of{" "}
                    {pairCheck.totalPairs} paired statements diverged by two or more scale points.
                  </span>
                </p>
                {interest.flags.notes.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {interest.flags.notes.map((n, i) => <li key={i} className="text-[12px] leading-relaxed" style={mut}>• {n}</li>)}
                  </ul>
                )}
              </div>
            </div>
          </section>
            )
          })()}

          {/* ── personality ── */}
          {show("personality") && (
          <section className="gt-section mt-10">
            <h2 className="font-display text-[20px] font-light tracking-tight">Personality profile</h2>
            <p className="mt-1 text-[12.5px]" style={mut}>
              Six factors on a 0–100 developmental scale — how characteristic each tendency is of you. Higher is not
              better; each pole suits different work and study settings.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border" style={line}>
              {personality.factors.map((f, i) => (
                <div key={f.label} className="px-4 py-3" style={{ borderTop: i ? `1px solid var(--gline)` : undefined }}>
                  <div className="flex items-center gap-3">
                    <p className="w-[38%] min-w-0 truncate text-[13.5px] font-medium">{f.label}</p>
                    <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
                      <div className="h-full rounded-full" style={{ width: `${f.score ?? 0}%`, background: "var(--gfg)" }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-[12.5px] tabular-nums">{f.score ?? "—"}</span>
                    <span className="w-[120px] shrink-0 text-right text-[11px]" style={mut}>{f.band ?? "incomplete"}</span>
                  </div>
                  <p className="mt-1 text-[11.5px]" style={mut}>
                    {f.subs.map((s) => `${s.label} ${s.score ?? "—"}`).join(" · ")}
                  </p>
                </div>
              ))}
            </div>
            {personality.flags.notes.length > 0 && (
              <div className="mt-3 rounded-xl border p-3.5" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={mut}>Response-quality notes</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {personality.flags.notes.map((n, i) => <li key={i} className="text-[12px] leading-relaxed" style={mut}>• {n}</li>)}
                </ul>
              </div>
            )}
          </section>
          )}

          {/* ── AI consolidation — full battery only ── */}
          {only == null && (
          <section className="gt-section mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[20px] font-light tracking-tight">Consolidated read</h2>
                <p className="mt-1 max-w-[52ch] text-[12.5px]" style={mut}>
                  An AI interpretation of the pattern across all three instruments — job groups, subjects and next steps.
                  It reads your scores; it never changes them.
                </p>
              </div>
              {!ai && (
                <button onClick={runAi} disabled={aiBusy}
                  className="gt-noprint inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[13.5px] font-medium disabled:opacity-50"
                  style={card}>
                  {aiBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {aiBusy ? "Consolidating…" : "Generate consolidated read"}
                </button>
              )}
            </div>
            {aiErr && <p className="gt-noprint mt-3 text-[12.5px] text-red-400">{aiErr}</p>}
            {ai && (
              <div className="mt-4 flex flex-col gap-3">
                {ai.overview && <p className="rounded-2xl border p-4 text-[13.5px] leading-relaxed" style={card}>{ai.overview}</p>}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ai.strengths && ai.strengths.length > 0 && (
                    <div className="rounded-2xl border p-4" style={card}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Strengths in the pattern</p>
                      <ul className="mt-2 flex flex-col gap-1.5">{ai.strengths.map((s, i) => <li key={i} className="text-[12.5px] leading-relaxed">• {s}</li>)}</ul>
                    </div>
                  )}
                  {ai.watchouts && ai.watchouts.length > 0 && (
                    <div className="rounded-2xl border p-4" style={card}>
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Worth developing</p>
                      <ul className="mt-2 flex flex-col gap-1.5">{ai.watchouts.map((s, i) => <li key={i} className="text-[12.5px] leading-relaxed">• {s}</li>)}</ul>
                    </div>
                  )}
                </div>
                {ai.jobGroups && ai.jobGroups.length > 0 && (
                  <div className="rounded-2xl border p-4" style={card}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Job groups that fit the pattern</p>
                    <div className="mt-2.5 flex flex-col gap-3">
                      {ai.jobGroups.map((g, i) => (
                        <div key={i}>
                          <p className="text-[13px] font-semibold">{g.name}</p>
                          <p className="mt-0.5 text-[12.5px] leading-relaxed" style={mut}>{g.why}</p>
                          {g.roles && <p className="mt-0.5 text-[12px]" style={mut}>Roles: {g.roles.join(" · ")}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ai.paths && ai.paths.length > 0 && (
                  <div className="rounded-2xl border p-4" style={card}>
                    <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Suggested path</p>
                    <div className="mt-2.5 flex flex-col gap-2.5">
                      {ai.paths.map((p, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="w-[110px] shrink-0 text-[12px] font-medium">{p.horizon}</span>
                          <p className="text-[12.5px] leading-relaxed" style={mut}>{p.focus}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {ai.subjects && ai.subjects.length > 0 && (
                  <p className="text-[12.5px]" style={mut}>Subjects that fit: {ai.subjects.join(" · ")}</p>
                )}
              </div>
            )}
          </section>
          )}

          <footer className="gt-section mt-12 border-t pt-4 text-[11px] leading-relaxed" style={{ ...line, color: "var(--gmut)" }}>
            SetMyCareer final battery · Personality per the SMC Personality Assessment workbook (72 items, 0–100
            developmental bands); interests per the SMC Career Interest manual (Attraction + Career-Level = 50%
            engagement + 25% work-environment + 25% job-characteristic fit); {isExec
              ? "competency per the CCPA manual (situational judgement 40% + most/least choices 30% + self-ratings 30%)"
              : `ability per the Loratis DBDA norm tables (${normBand.label}, ${d.gender})`}.
            All scores are developmental pending norm validation. This report was produced by the scoring logic alone
            {ai ? ", plus a clearly-marked AI consolidation of the same numbers" : ""}. Ref {token}.
          </footer>

          {/* bottom download reminder + shared-device handoff */}
          <div className="gt-noprint mt-8 flex flex-col items-center gap-4">
            <button onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium"
              style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
              <Download className="size-4" /> Download the PDF — it isn't saved anywhere else
            </button>
            <button
              onClick={() => {
                const ok = window.confirm(
                  `Start a fresh test for a new person on this device? ${d.name}'s results exist only here — make sure the PDF was downloaded first.`,
                )
                if (ok) resetGuest(token)
              }}
              className="text-[12.5px] underline-offset-4 hover:underline"
              style={mut}
            >
              Handing this device to someone else? Start a fresh test
            </button>
          </div>
        </main>
      </div>
    </>
  )
}
