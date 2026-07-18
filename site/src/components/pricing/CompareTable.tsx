import { Link } from "react-router-dom"
import { STUDENT_JOURNEY, fmtINR } from "@/content/offerings"
import { checkoutHref } from "./GradientCard"

/* The student journey, compared — Navigator → True North. Monochrome ✓/—,
   hairline rows, Big Picture column quietly emphasized. Numbers (sessions,
   credits, certificates, memory) are derived from the catalog, not retyped;
   only the inclusion booleans are stated here. Scrolls horizontally on mobile.
   v2: the whole table runs one type size larger — clarity over density. */

const TIERS = STUDENT_JOURNEY.filter((o) => o.order >= 1)

type Cell = boolean | string
interface Row { label: string; cells: Cell[] }

/** true for the tiers whose id is listed (in TIERS order) */
const has = (...ids: string[]): Cell[] => TIERS.map((t) => ids.includes(t.id))

const ROWS: Row[] = [
  { label: "Interest · Personality · Aptitude assessments", cells: has("sj_navigator", "sj_accelerator", "sj_big_picture", "sj_true_north") },
  { label: "Career Snapshot + Top Career Matches reports", cells: has("sj_navigator", "sj_accelerator", "sj_big_picture", "sj_true_north") },
  { label: "Career dashboard — careers, colleges, degrees", cells: has("sj_navigator", "sj_accelerator", "sj_big_picture", "sj_true_north") },
  { label: "Counselling sessions", cells: TIERS.map((t) => (t.sessions > 0 ? String(t.sessions) : false)) },
  { label: "Written action plan", cells: has("sj_accelerator", "sj_big_picture", "sj_true_north") },
  { label: "Advanced career report + admission strategy", cells: has("sj_big_picture", "sj_true_north") },
  { label: "Dedicated parent session", cells: has("sj_big_picture", "sj_true_north") },
  { label: "Senior counsellor", cells: has("sj_true_north") },
  { label: "Certificates", cells: TIERS.map((t) => (t.certificates?.length ? String(t.certificates.length) : false)) },
  { label: "AI Career Copilot", cells: TIERS.map((t) => !!t.ai) },
  { label: "Career Credits · Voice Credits", cells: TIERS.map((t) => (t.ai ? `${t.ai.careerCredits} · ${t.ai.voiceCredits}` : false)) },
  { label: "Copilot memory", cells: TIERS.map((t) => t.ai?.memory ?? false) },
  { label: "Six-month review + priority booking", cells: has("sj_true_north") },
  { label: "Priority support", cells: has("sj_big_picture", "sj_true_north") },
]

const emphasis = (i: number) => (TIERS[i]?.featured ? "bg-ink/[0.03]" : "")

export function CompareTable() {
  return (
    <div data-reveal className="no-bar overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left">
        <thead>
          <tr className="border-b border-line align-bottom">
            <th scope="col" className="w-[250px] pb-4 pr-4 align-bottom">
              <span className="kicker">Included</span>
            </th>
            {TIERS.map((t, i) => (
              <th key={t.id} scope="col" className={`px-4 pb-4 align-bottom ${emphasis(i)}`}>
                {t.featured && (
                  <span className="mono mb-2 inline-block border border-ink/30 px-2 py-0.5 text-[9.5px] uppercase tracking-[0.14em] text-ink-60">Most popular</span>
                )}
                <p className="text-[16px] font-semibold tracking-tight">{t.name}</p>
                <p className="mono mt-1 text-[12.5px] font-normal tabular-nums text-ink-60">
                  {fmtINR(t.price.inr)}{t.priceNote ? ` · ${t.priceNote}` : ""}
                </p>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label} className="border-b border-line-faint">
              <th scope="row" className="py-3.5 pr-4 text-[13px] font-normal leading-snug text-ink-60">{r.label}</th>
              {r.cells.map((c, i) => (
                <td key={TIERS[i]?.id ?? i} className={`px-4 py-3.5 ${emphasis(i)}`}>
                  {c === true ? (
                    <><span aria-hidden="true" className="text-[14px] text-ink">✓</span><span className="sr-only">Included</span></>
                  ) : c === false ? (
                    <><span aria-hidden="true" className="text-[14px] text-ink-20">—</span><span className="sr-only">Not included</span></>
                  ) : (
                    <span className="mono text-[12px] tabular-nums text-ink-80">{c}</span>
                  )}
                </td>
              ))}
            </tr>
          ))}
          {/* quiet per-column doors — no button wall */}
          <tr>
            <td className="py-4 pr-4" />
            {TIERS.map((t, i) => (
              <td key={t.id} className={`px-4 py-4 ${emphasis(i)}`}>
                <Link to={checkoutHref(t)} className="ul mono text-[11.5px] uppercase tracking-[0.1em] text-ink-80">
                  Choose<span className="sr-only"> {t.name}</span> →
                </Link>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
