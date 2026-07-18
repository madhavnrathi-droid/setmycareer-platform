// The What Next gap model.
//
// GROUNDING (from the O*NET Content Model and the ESCO skills pillar): an
// occupation's requirements decompose into Worker CHARACTERISTICS (abilities,
// occupational interests, work styles) and Worker REQUIREMENTS (basic and
// cross-functional skills, knowledge, education). ESCO's skills pillar likewise
// spans knowledge, skills and attitudes.
//
// We hold NONE of those per-career requirement vectors. Our career dataset carries
// demand, pay and AI-exposure — not "what a Product Manager must know". So the
// honest split is by SOURCE OF TRUTH, and each dimension declares its own:
//
//   • measured   — computed from the member's own Career Tests. Reported as
//                  EVIDENCE, never as a deficit. Scoring a personality profile as
//                  a shortfall against an occupation is exactly the line between a
//                  defensible gap and pseudo-science: personality predicts job
//                  performance only weakly, and an interest profile describes pull,
//                  not competence. So these two dimensions are never marked
//                  "missing" — they are described.
//   • self       — the member tells us where they stand. We cannot know their
//                  degree, portfolio or network, and guessing would be fabrication.
//   • counsellor — confirmed with a human in session.
//
// The UI vocabulary is have / partly / to build (no percentages on the deficit
// side), and every shortfall is phrased as a next step rather than a lack.

import type { ComponentType } from "react"
import {
  Compass, Brain, GraduationCap, BriefcaseBusiness, BookOpen,
  Users, FolderOpen, Sparkles,
} from "lucide-react"
import type { Row } from "../terminal/careers-all"
import { careersForMember } from "./market-match"
import { realPersonalityFor, realAbilitiesFor } from "./report-bridge"
import { FACTOR_READS, readFor } from "@/lib/sigma/descriptions"

export type GapSource = "measured" | "self" | "counsellor"

export interface GapDimension {
  key: string
  label: string
  icon: ComponentType<{ className?: string }>
  source: GapSource
  /** what this dimension means, in the member's language */
  blurb: string
  /** shown under a self-assessed dimension to prompt an honest answer */
  prompt?: string
}

/** The founder's eight dimensions, each tagged with where its truth comes from. */
export const GAP_DIMENSIONS: GapDimension[] = [
  {
    key: "motivation", label: "Motivation", icon: Compass, source: "measured",
    blurb: "How strongly your measured interests pull toward this work.",
  },
  {
    key: "personality", label: "Personality", icon: Brain, source: "measured",
    blurb: "How you're wired — a description of your working style, not a score against the job.",
  },
  {
    key: "education", label: "Education", icon: GraduationCap, source: "self",
    blurb: "The qualifications this path usually expects.",
    prompt: "Do you already hold the qualification this path expects?",
  },
  {
    key: "experience", label: "Experience", icon: BriefcaseBusiness, source: "self",
    blurb: "Time spent doing work of this kind.",
    prompt: "Have you worked in or adjacent to this field?",
  },
  {
    key: "knowledge", label: "Knowledge", icon: BookOpen, source: "self",
    blurb: "The domain knowledge the work rests on.",
    prompt: "Do you know the subject matter this role runs on?",
  },
  {
    key: "softSkills", label: "Soft skills", icon: Sparkles, source: "self",
    blurb: "Communication, judgement, working with others.",
    prompt: "Are the day-to-day people skills already there?",
  },
  {
    key: "networking", label: "Networking", icon: Users, source: "self",
    blurb: "People in the field who know your name.",
    prompt: "Do you know people already doing this work?",
  },
  {
    key: "portfolio", label: "Portfolio", icon: FolderOpen, source: "self",
    blurb: "Evidence of the work, not just claims about it.",
    prompt: "Can you show work that proves you can do this?",
  },
]

export const SELF_DIMENSIONS = GAP_DIMENSIONS.filter((d) => d.source === "self")

/** A measured reading — evidence about the member, tied to the target career. */
export interface MeasuredReading {
  key: string
  /** the short verdict shown as the reading's headline */
  headline: string
  /** an honest sentence; may include a caveat */
  detail: string
  /** true when the reading supports this target, false when it points elsewhere */
  supportive: boolean
}

/** Motivation: does the member's own interest signal actually point at THIS row?
 *  Reuses the same keyword bridge the dashboard uses, so the two never disagree. */
export function motivationReading(clientId: string, target: Row): MeasuredReading | null {
  const market = careersForMember(clientId, 40)
  if (!market.hasSignal) return null
  // `matched:false` means the bridge found nothing for this member at all — we
  // must not then claim the target does or doesn't align.
  if (!market.matched) {
    return {
      key: "motivation",
      headline: "Not established",
      detail: "We couldn't match the market to your interest profile, so we can't say whether this path pulls at you. Worth raising with your counsellor.",
      supportive: false,
    }
  }
  const aligned = market.careers.some((c) => c.id === target.id)
  const top = market.clusters[0]?.label
  return aligned
    ? {
        key: "motivation",
        headline: "Points here",
        detail: `Your measured interests${top ? ` — strongest in ${top} — ` : " "}line up with this path.`,
        supportive: true,
      }
    : {
        key: "motivation",
        headline: "Points elsewhere",
        detail: `Your strongest measured interest is ${top ?? "elsewhere"}, not this path. That doesn't rule it out — people do work they weren't first drawn to — but it's the honest reading.`,
        supportive: false,
      }
}

/** Personality: described, never scored against the occupation. */
export function personalityReading(clientId: string): MeasuredReading | null {
  const pers = realPersonalityFor(clientId)
  if (!pers) return null
  const lead = [...pers.factors].sort(
    (a, b) => Math.abs(b.percentile - 50) - Math.abs(a.percentile - 50),
  )[0]
  if (!lead) return null
  return {
    key: "personality",
    headline: `${lead.label} · ${lead.percentile}`,
    detail: `${readFor(FACTOR_READS[lead.key], lead.percentile >= 65 ? "High" : lead.percentile <= 35 ? "Low" : "Average") || lead.band} This describes how you'd work, not whether you can do the job.`,
    supportive: true,
  }
}

/** Ability: the faculty the member leans on. Reported, not turned into a deficit. */
export function abilityReading(clientId: string): MeasuredReading | null {
  const abilities = realAbilitiesFor(clientId)
  if (!abilities?.length) return null
  const top = [...abilities].sort((a, b) => b.value - a.value)[0]
  return {
    key: "ability",
    headline: top.label,
    detail: `Your strongest measured area, at ${top.value}/100 — the one this path can lean on.`,
    supportive: true,
  }
}
