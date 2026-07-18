// The counsellor roster. Sourced LIVE from the production navigator list
// (getAllNavigator → 81 real counsellors) via useLiveCounsellors(); no fabricated
// counsellors.
//
// Members do NOT pick their counsellor — one is ASSIGNED, matched from their
// results. There is deliberately no browse/choose surface anywhere in the portal.
// What a member sees instead is their assigned counsellor's CREDENTIALS, so the
// trust comes from qualifications rather than from shopping a list.
// getCounsellor() is a sync resolver kept for the assigned-counsellor fallback.

import { useEffect, useMemo } from "react"
import { useNavigators, useUserSessions, useUserPurchases } from "@/lib/live-queries"
import type { FullNavigator, UserSession } from "@/lib/smc-live-api"
import type { SoldServiceData } from "@/lib/smc-api"
import { usePortalAccount, chooseCounsellor } from "./portal-store"

export interface CounsellorListing {
  id: string
  name: string
  title: string
  initials: string
  img?: string
  specialties: string[]
  bio: string
  rating: number
  reviews: number
  years: number
  /** INR per session — 0 when the navigator has no fixed price (pay per plan). */
  sessionPrice: number
  languages: string[]
  /** Short next-availability label for the card (empty when unknown). */
  available: string
  tone: "brand" | "mind" | "well"
  // ── credentials (the five the founder asked for) — all LIVE fields, never
  //    invented. Any of them may be empty when the roster row doesn't carry it,
  //    and the UI simply omits that row rather than guessing.
  /** Highest qualification, verbatim from the roster. */
  education?: string
  /** Named certifications; empty when the navigator lists none. */
  certifications: string[]
  /** True only when the roster actually lists a certification. */
  certified: boolean
  /** What kind of experience — practising expertise / services offered. */
  experienceType: string[]
}

const clean = (v?: unknown) => { const s = v == null ? "" : String(v).trim(); return s && s !== "None" && s !== "null" ? s : undefined }
const initialsOf = (name: string) => { const p = name.trim().split(/\s+/).filter(Boolean); return p.length ? (p[0][0] + (p[1]?.[0] ?? "")).toUpperCase() : "—" }
const splitList = (v?: unknown, max = 3): string[] => {
  const s = clean(v); if (!s) return []
  return s.split(/[,;/|]+/).map((x) => x.trim()).filter(Boolean).slice(0, max)
}
const yearsOf = (v?: unknown): number => { const m = clean(v)?.match(/\d+/); return m ? Number(m[0]) : 0 }
const TONES: CounsellorListing["tone"][] = ["brand", "mind", "well"]

function toListing(n: FullNavigator, i: number): CounsellorListing {
  const name = clean(n.name) ?? `Counsellor ${n.id}`
  const certifications = splitList(n.certifications, 4)
  return {
    id: String(n.id),
    name,
    title: clean(n.short_Description) ?? clean(n.practicing_expertise)?.split(/[,;]/)[0] ?? "Career Counsellor",
    initials: initialsOf(name),
    img: clean(n.displayimg) ?? clean(n.img),
    specialties: splitList(n.practicing_expertise ?? n.topic_Study ?? n.navigator_Services),
    bio: clean(n.about_navigator) ?? clean(n.about_navigator_full_des) ?? clean(n.short_Description) ?? "",
    rating: 0,
    reviews: 0,
    years: yearsOf(n.experiance ?? n.work_Experience),
    sessionPrice: 0,
    languages: splitList(n.language, 4),
    available: "",
    tone: TONES[i % TONES.length],
    education: clean(n.education),
    certifications,
    certified: certifications.length > 0,
    experienceType: splitList(n.practicing_expertise ?? n.navigator_Services, 4),
  }
}

/** The live counsellor marketplace — the production navigator roster (active only). */
export function useLiveCounsellors(): { counsellors: CounsellorListing[]; loading: boolean; error?: string } {
  const { data, loading, error } = useNavigators()
  const counsellors = useMemo(() => {
    const rows = (data ?? []) as FullNavigator[]
    return rows
      .filter((n) => { const a = n.isActive; if (a === undefined || a === null) return true; const s = String(a).toLowerCase(); return s === "true" || s === "1" })
      .filter((n) => clean(n.name))
      .map(toListing)
  }, [data])
  return { counsellors, loading, error }
}

// No fabricated marketplace — the live roster is the source (useLiveCounsellors).
// Kept empty so getCounsellor() below stays a harmless no-op fallback; real clients
// resolve their counsellor from their live sessions.
export const counsellors: CounsellorListing[] = []

export const getCounsellor = (id: string | null | undefined): CounsellorListing | undefined =>
  counsellors.find((c) => c.id === id)

// A minimal listing synthesised from a live session's navigator fields — used when
// the assigned counsellor isn't in the browsable roster yet (or it's still loading).
function minimalListing(id: string, name: string, img?: string): CounsellorListing {
  return {
    id, name, title: "Career Counsellor", initials: initialsOf(name), img,
    specialties: [], bio: "", rating: 0, reviews: 0, years: 0, sessionPrice: 0,
    languages: [], available: "", tone: TONES[(Number(id) || 0) % TONES.length],
    // the session record carries no credentials — leave them empty rather than
    // guessing; the credentials panel simply omits every missing row
    education: undefined, certifications: [], certified: false, experienceType: [],
  }
}

/** Resolve the signed-in member's ASSIGNED counsellor — LIVE. The id comes from the
 *  account (explicit choice) or is recovered from the member's real sessions
 *  (navi_id), then resolved against the live roster; if the navigator isn't in the
 *  browsable roster we synthesise a card from the session's navigator fields so
 *  messaging + booking still work. Also backfills account.counsellorId so threads
 *  (keyed by counsellorId) line up everywhere. */
export function usePortalCounsellor(): { counsellor?: CounsellorListing; loading: boolean } {
  const account = usePortalAccount()
  const { data: sessions, loading: sLoading } = useUserSessions(account?.clientId ?? null)
  const { data: purchases, loading: pLoading } = useUserPurchases(account?.clientId ?? null)
  const { counsellors: roster, loading: cLoading } = useLiveCounsellors()

  const navi = useMemo(() => {
    // 1) A scheduled session carries the counsellor on navi_id (+ name/img).
    const rows = (Array.isArray(sessions) ? sessions : []) as UserSession[]
    for (const s of rows) {
      const id = clean(s.navi_id)
      if (id) return { id: String(id), name: clean(s.navi_name), img: clean(s.navi_img) }
    }
    // 2) Fallback: a client with a purchased service but no session yet still has
    //    a DEDICATED counsellor — the sold service carries navigator_id. The name
    //    isn't on this row, so we resolve it against the live roster below.
    const svc = ((purchases as { data?: SoldServiceData[] } | undefined)?.data ?? []) as SoldServiceData[]
    for (const s of svc) {
      const id = clean(s.navigator_id)
      if (id) return { id: String(id), name: undefined, img: undefined }
    }
    return undefined
  }, [sessions, purchases])

  const wantId = account?.counsellorId ?? navi?.id

  // backfill the account so the counsellor id is stable across the portal
  useEffect(() => {
    if (account && !account.counsellorId && navi?.id) chooseCounsellor(navi.id)
  }, [account, navi?.id])

  const counsellor = useMemo(() => {
    if (!wantId) return undefined
    const fromRoster = roster.find((c) => c.id === wantId)
    if (fromRoster) return fromRoster
    if (navi?.id === wantId && navi.name) return minimalListing(wantId, navi.name, navi.img)
    return undefined
  }, [wantId, roster, navi])

  return { counsellor, loading: sLoading || pLoading || cLoading }
}
