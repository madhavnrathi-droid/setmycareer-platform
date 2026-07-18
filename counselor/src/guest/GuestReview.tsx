// The answer-review stage — shown after the battery (or the single test on a
// scoped testing link), before the report. Lists every chosen answer, grouped
// and formatted per instrument, so the taker can confirm or jump back.

import { useMemo, useState } from "react"
import { ChevronDown, Pencil, ShieldCheck, ArrowRight } from "lucide-react"
import { GlowField, TopBar, TEST_HUE, type OnlyTest } from "./GuestFlow"
import { pfinItems, PFIN_SCALE } from "./personality-final"
import { ifinItems, IFIN_SCALE } from "./interest-final"
import { ABILITY_SECTIONS, SPATIAL_TRIALS, CLERICAL_PAIRS } from "./ability-bank"
import { SJTS, FC_BLOCKS, CCPA_LIK, CCPA_SCALE } from "./ccpa"
import { useGuest, updateGuest } from "./guest-store"

interface Row { q: string; a: string; answered: boolean }
interface Group { title: string; rows: Row[] }
interface Block { key: string; title: string; count: number; total: number; groups: Group[]; editKey: string }

const IFIN_KIND_LABEL: Record<string, string> = {
  attraction: "What attracts you",
  engagement: "What you'd do repeatedly",
  we: "Work environment",
  jc: "Job characteristics",
}

export function GuestReview({ token, dark, onToggle, only }: { token: string; dark: boolean; onToggle: () => void; only: OnlyTest | null }) {
  const state = useGuest(token)
  const d = state.details!
  const isExec = d.track === "executive"
  const [open, setOpen] = useState<string | null>(null)

  const blocks: Block[] = useMemo(() => {
    const out: Block[] = []
    const want = (t: OnlyTest) => (only == null ? (t === "ability" ? !isExec : t === "competency" ? isExec : true) : only === t)

    // 1) Personality — grouped by factor
    if (want("personality")) {
      const items = pfinItems()
      const ans = state.personality ?? []
      const groups = new Map<string, Row[]>()
      items.forEach((it, i) => {
        const v = ans[i]
        const row: Row = { q: it.text, a: v != null ? PFIN_SCALE[v - 1] : "— not answered", answered: v != null }
        ;(groups.get(it.factor) ?? groups.set(it.factor, []).get(it.factor)!).push(row)
      })
      out.push({
        key: "personality", title: "Personality Assessment", editKey: "personalityDoneAt",
        count: ans.filter((a) => a != null).length, total: items.length,
        groups: [...groups].map(([title, rows]) => ({ title, rows })),
      })
    }

    // 2) Interest — grouped by layer (attraction / engagement / WE / JC)
    if (want("interest")) {
      const items = ifinItems()
      const ans = state.interest ?? []
      const groups = new Map<string, Row[]>()
      items.forEach((it, i) => {
        const v = ans[i]
        const row: Row = { q: it.text, a: v != null ? IFIN_SCALE[v - 1].split(" / ")[0] : "— not answered", answered: v != null }
        const key = IFIN_KIND_LABEL[it.kind]
        ;(groups.get(key) ?? groups.set(key, []).get(key)!).push(row)
      })
      out.push({
        key: "interest", title: "Career Interest Assessment", editKey: "interestDoneAt",
        count: ans.filter((a) => a != null).length, total: items.length,
        groups: [...groups].map(([title, rows]) => ({ title, rows })),
      })
    }

    // 3) Ability (student third test)
    if (want("ability")) {
      const groups: Group[] = []
      let total = 0, answered = 0
      for (const s of ABILITY_SECTIONS) {
        const ans = state.ability?.answers[s.key] ?? []
        const rows: Row[] = []
        if (s.kind === "mcq" || s.kind === "closure") {
          s.items!.forEach((it, i) => {
            const v = ans[i] as number | null | undefined
            rows.push({ q: it.word ? `Complete the degraded word “${it.word}”` : it.text, a: v != null ? it.options[v] : "— not answered", answered: v != null })
          })
        } else if (s.kind === "spatial") {
          SPATIAL_TRIALS.forEach((_, i) => {
            const v = ans[i] as string | null | undefined
            rows.push({ q: `Figure pair ${i + 1}`, a: v === "R" ? "Rotated (same)" : v === "S" ? "Mirrored" : "— not answered", answered: v != null })
          })
        } else {
          CLERICAL_PAIRS.forEach((p, i) => {
            const v = ans[i] as string | null | undefined
            rows.push({ q: `${p.left}  vs  ${p.right}`, a: v === "S" ? "Same" : v === "D" ? "Different" : "— not answered", answered: v != null })
          })
        }
        total += rows.length; answered += rows.filter((r) => r.answered).length
        groups.push({ title: s.label, rows })
      }
      out.push({ key: "ability", title: "Ability Test", editKey: "abilityDoneAt", count: answered, total, groups })
    }

    // 4) Competency (executive third test) — three parts
    if (want("competency")) {
      const c = state.competency
      const sjtRows: Row[] = SJTS.map((s, i) => {
        const a = c?.sjt[i]
        return { q: `${s.n}. ${s.title}`, a: a ? `Most ${a.m} · Least ${a.l}` : "— not answered", answered: !!a }
      })
      const fcRows: Row[] = FC_BLOCKS.map((b, i) => {
        const a = c?.fc[i]
        return {
          q: `${b.n}. ${Object.values(b.statements).map((s) => s.split(" ").slice(0, 4).join(" ")).join(" / ")}…`,
          a: a ? `Most ${a.m} · Least ${a.l}` : "— not answered", answered: !!a,
        }
      })
      const likRows: Row[] = CCPA_LIK.map((it, i) => {
        const v = c?.lik[i]
        return { q: it.text, a: v != null ? CCPA_SCALE[v - 1] : "— not answered", answered: v != null }
      })
      const count = sjtRows.concat(fcRows, likRows).filter((r) => r.answered).length
      out.push({
        key: "competency", title: "Competency & Potential (CCPA)", editKey: "competencyDoneAt",
        count, total: sjtRows.length + fcRows.length + likRows.length,
        groups: [
          { title: "Part A — Scenarios (most / least likely)", rows: sjtRows },
          { title: "Part B — Forced choice (most / least like you)", rows: fcRows },
          { title: "Part C — Statements", rows: likRows },
        ],
      })
    }
    return out
  }, [state, isExec, only])

  const edit = (editKey: string) => {
    // send them back into that test (answers preserved); they return here on finish
    updateGuest(token, { [editKey]: undefined, reviewedAt: undefined } as Partial<import("./guest-store").GuestState>)
  }
  const confirm = () => updateGuest(token, { reviewedAt: new Date().toISOString() })

  const mut = { color: "var(--gmut)" }
  const card = { borderColor: "var(--gline)", background: "var(--gcard)" }

  return (
    <>
      <TopBar dark={dark} onToggle={onToggle} right={<span className="text-[12px]" style={mut}>Review</span>} />
      <GlowField hues={TEST_HUE.interest} />
      <main className="relative z-10 mx-auto w-full max-w-[760px] flex-1 px-6 pb-28 pt-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em]" style={mut}>Before your report</p>
        <h1 className="mt-3 font-display text-[clamp(26px,4.2vw,38px)] font-semibold leading-[1.12] tracking-tight">Review your answers, {d.name.split(" ")[0]}.</h1>
        <p className="mt-3 max-w-[58ch] text-[14.5px] leading-relaxed" style={mut}>
          Here's everything you chose{only ? "" : " across the tests"}. Expand any block to read the full list,
          or jump back to change an answer. When it looks right, generate your report.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          {blocks.map((b) => {
            const isOpen = open === b.key
            return (
              <div key={b.key} className="overflow-hidden rounded-2xl border" style={card}>
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <button onClick={() => setOpen(isOpen ? null : b.key)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                    <ChevronDown className={`size-4 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} style={mut} />
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium">{b.title}</span>
                      <span className="block text-[11.5px] tabular-nums" style={mut}>
                        {b.count} of {b.total} answered{b.count < b.total ? " · some left blank" : ""}
                      </span>
                    </span>
                  </button>
                  <button onClick={() => edit(b.editKey)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] font-medium" style={{ borderColor: "var(--gline)" }}>
                    <Pencil className="size-3" /> Edit
                  </button>
                </div>
                {isOpen && (
                  <div className="border-t px-4 py-3" style={{ borderColor: "var(--gline)" }}>
                    {b.groups.map((g, gi) => (
                      <div key={gi} className={gi ? "mt-4" : ""}>
                        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em]" style={mut}>{g.title}</p>
                        <ul className="mt-2 flex flex-col divide-y" style={{ borderColor: "var(--gline)" }}>
                          {g.rows.map((r, ri) => (
                            <li key={ri} className="flex items-start justify-between gap-4 py-2">
                              <span className="min-w-0 flex-1 text-[12.5px] leading-snug">{r.q}</span>
                              <span className="shrink-0 text-right text-[12.5px] font-medium" style={r.answered ? undefined : { color: "var(--gmut)" }}>{r.a}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-3 rounded-2xl border p-4" style={card}>
          <ShieldCheck className="size-4 shrink-0" style={mut} />
          <p className="min-w-0 flex-1 text-[12.5px] leading-relaxed" style={mut}>
            Generating the report scores your answers{only ? "" : " (and can add an AI read)"}. You can still download it as a PDF afterwards.
          </p>
          <button onClick={confirm}
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gfg)", color: "var(--gbg)" }}>
            Generate my report <ArrowRight className="size-4" />
          </button>
        </div>
      </main>
    </>
  )
}
