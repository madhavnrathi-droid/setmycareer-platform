// The assigned counsellor's credentials. Members don't choose their counsellor —
// one is matched from their results — so trust has to come from qualifications
// rather than from browsing a list.
//
// Every row is a LIVE roster field. A missing field is omitted, never filled with
// a plausible-looking default: a fabricated qualification is the single worst
// thing this panel could contain.

import { GraduationCap, BriefcaseBusiness, Languages, BadgeCheck, Layers } from "lucide-react"
import type { CounsellorListing } from "../counsellors"
import { cn } from "@/lib/utils"

interface Row { icon: typeof GraduationCap; label: string; value: string }

/** Build only the rows we genuinely have data for. */
export function credentialRows(c: CounsellorListing): Row[] {
  const rows: Row[] = []
  if (c.education) rows.push({ icon: GraduationCap, label: "Education", value: c.education })
  if (c.years > 0) rows.push({ icon: BriefcaseBusiness, label: "Experience", value: `${c.years} year${c.years === 1 ? "" : "s"}` })
  if (c.experienceType.length) rows.push({ icon: Layers, label: "Type of experience", value: c.experienceType.join(" · ") })
  if (c.languages.length) rows.push({ icon: Languages, label: "Languages", value: c.languages.join(" · ") })
  // Only claim "Certified" when the roster actually lists a certification.
  rows.push({
    icon: BadgeCheck,
    label: "Certification",
    value: c.certified ? c.certifications.join(" · ") : "Not certified",
  })
  return rows
}

export function CounsellorCredentials({ counsellor, className }: { counsellor: CounsellorListing; className?: string }) {
  const rows = credentialRows(counsellor)
  if (!rows.length) return null
  return (
    <dl className={cn("divide-y divide-border border-y border-border", className)}>
      {rows.map((r) => {
        const Icon = r.icon
        const isUncertified = r.label === "Certification" && !counsellor.certified
        return (
          <div key={r.label} className="flex items-start gap-3 py-3">
            <Icon className={cn("mt-0.5 size-4 shrink-0", isUncertified ? "text-ink-300" : "text-brand-600")} />
            <dt className="w-[132px] shrink-0 text-[12.5px] text-muted-foreground">{r.label}</dt>
            <dd className={cn("min-w-0 flex-1 text-[13px]", isUncertified ? "text-ink-400" : "font-medium text-foreground")}>
              {r.value}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}

/** One-line summary for tight surfaces (the dashboard's counsellor pane). */
export function credentialSummary(c: CounsellorListing): string {
  const bits: string[] = []
  if (c.years > 0) bits.push(`${c.years} yrs`)
  if (c.education) bits.push(c.education)
  if (c.certified) bits.push("Certified")
  if (c.languages.length) bits.push(c.languages.slice(0, 2).join(", "))
  return bits.join(" · ")
}
