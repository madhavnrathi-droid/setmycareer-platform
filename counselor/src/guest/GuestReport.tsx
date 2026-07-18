// The guest results report — every number comes from the testing logic alone
// (the FINAL instruments: Personality Assessment workbook, Career Interest
// Assessment manual, Loratis DBDA norms, and the CCPA competency manual). The
// optional AI consolidation interprets the pattern but can never add scores.
// Print-first: "Download PDF" is window.print() with a dedicated print
// stylesheet, because nothing is stored on any server.

import { useMemo, useState } from "react"
import { Download, Sparkles, ShieldCheck, Loader2 } from "lucide-react"
import { GlowField, TopBar, TEST_HUE, type OnlyTest } from "./GuestFlow"
import { ABILITY_SECTIONS, rawScore } from "./ability-bank"
import { scoreAbilitySection, normBandFor, ABILITY_MEANING, type AbilityScore } from "./ability-norms"
import { scorePfin, type PfinResult } from "./personality-final"
import { scoreIfin, type IfinResult, type IfinClusterScore } from "./interest-final"
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

/* a compact 0–100 bar row used across sections */
function BarRow({ i, label, value, right, mutStyle }: { i?: number; label: string; value: number; right?: string; mutStyle: React.CSSProperties }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2" style={{ borderTop: i ? `1px solid var(--gline)` : undefined }}>
      {i != null && <span className="w-5 shrink-0 text-[11px] tabular-nums" style={mutStyle}>{i}</span>}
      <p className="w-[42%] min-w-0 truncate text-[12.5px]">{label}</p>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: "var(--gfg)" }} />
      </div>
      <span className="w-9 shrink-0 text-right text-[12.5px] tabular-nums">{Math.round(value)}</span>
      {right && <span className="w-[86px] shrink-0 text-right text-[11px]" style={mutStyle}>{right}</span>}
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
        @media print {
          .gt-noprint { display: none !important; }
          .gt-report-root { background: #fff !important; color: #111 !important; }
          .gt-report-root * { --gbg: #fff; --gfg: #111; --gmut: #555; --gline: #ddd; --gcard: #fff; }
          .gt-section { break-inside: avoid; }
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

          {/* ── interests: the manual's two graphs ── */}
          {show("interest") && (
          <section className="gt-section mt-10">
            <h2 className="font-display text-[20px] font-light tracking-tight">Interest landscape</h2>
            <p className="mt-1 text-[12.5px]" style={mut}>
              Two reads per the SMC Career Interest model. Confidence: {interest.flags.confidence}.
            </p>

            {/* Graph 1 — Activity-Level Interest (attraction only) */}
            <p className="mt-4 text-[13px] font-semibold">What naturally attracts me?</p>
            <p className="text-[11.5px]" style={mut}>Attraction only — this graph shows what pulls you, not career suitability.</p>
            <div className="mt-2 overflow-hidden rounded-2xl border" style={line}>
              {interest.byAttraction.map((c, i) => (
                <BarRow key={c.label} i={i + 1} label={c.label} value={c.attraction ?? 0} right={c.attractionBand ?? ""} mutStyle={mut} />
              ))}
            </div>

            {/* Graph 2 — Career-Level Interest (50% engagement + 25% WE + 25% JC) */}
            <p className="mt-6 text-[13px] font-semibold">What could sustain me as a career?</p>
            <p className="text-[11.5px]" style={mut}>
              Willingness to do the real work repeatedly (50%) + your preferred working conditions (25%) + preferred
              ways of working (25%). Sustained preference, not ability or guaranteed success.
            </p>
            <div className="mt-2 overflow-hidden rounded-2xl border" style={line}>
              {interest.byCareer.map((c, i) => (
                <BarRow key={c.label} i={i + 1} label={c.label} value={c.career ?? 0} right={c.category ?? ""} mutStyle={mut} />
              ))}
            </div>

            {/* hobby ↔ career gaps */}
            {hobbyGaps.length > 0 && (
              <div className="mt-4 rounded-2xl border p-4" style={card}>
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

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border p-4" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Work environment — top 5</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {[...interest.we].filter((f) => f.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5).map((f) => (
                    <div key={f.key} className="flex items-center gap-2.5">
                      <p className="w-[46%] min-w-0 truncate text-[12.5px]">{f.label}</p>
                      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
                        <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: "var(--gfg)" }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[12px] tabular-nums">{f.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em]" style={mut}>Job characteristics — top 5</p>
                <div className="mt-2.5 flex flex-col gap-2">
                  {[...interest.jc].filter((f) => f.score != null).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)).slice(0, 5).map((f) => (
                    <div key={f.key} className="flex items-center gap-2.5">
                      <p className="w-[46%] min-w-0 truncate text-[12.5px]">{f.label}</p>
                      <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full" style={{ background: "var(--gline)" }}>
                        <div className="h-full rounded-full" style={{ width: `${f.score}%`, background: "var(--gfg)" }} />
                      </div>
                      <span className="w-8 shrink-0 text-right text-[12px] tabular-nums">{f.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {interest.flags.notes.length > 0 && (
              <div className="mt-3 rounded-xl border p-3.5" style={card}>
                <p className="text-[11px] font-medium uppercase tracking-[0.12em]" style={mut}>Response-quality notes</p>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {interest.flags.notes.map((n, i) => <li key={i} className="text-[12px] leading-relaxed" style={mut}>• {n}</li>)}
                </ul>
              </div>
            )}
          </section>
          )}

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
