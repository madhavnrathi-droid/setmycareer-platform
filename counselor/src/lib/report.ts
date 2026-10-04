// Client helper: POST a caller-built scaffold payload to /api/report and get back
// the AI-generated AINarrative prose for the report. Returns null on ANY failure
// (network, non-200, malformed body) so the report can fall back cleanly to its
// deterministic prose without the caller having to special-case errors.

export type AINarrative = {
  framingThesis: string
  executiveSummary: string[]
  journey: { key: string; narrative: string }[]
  sectionNarratives: {
    personality: string
    interests: string
    abilities: string
    clusters: string
    jobGroups: string
    workRoles: string
    wellbeing: string
  }
  jobMarket: string[]
  routeNarratives: { id: string; rationale: string }[]
  counsellorSynthesis: string
  recommendations: string[]
  pullQuotes: string[]
}

// ── cache ─────────────────────────────────────────────────────────────────────
// Every open of a report used to regenerate it: three large model calls (~18k tokens)
// per view. That alone saturated the free per-minute budgets that Compass and session
// notes share. A finished narrative is now kept per client, keyed by a hash of the exact
// data it was written from, so it is regenerated only when that data changes (a new
// session, note or result) or when someone presses regenerate.
const CACHE_PREFIX = "smc.report.narrative.v1:"

/** FNV-1a over the payload — a change detector, not a security boundary. */
function hashOf(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return (h >>> 0).toString(36) + ":" + s.length.toString(36)
}

/** Worth keeping only if every one of the three parts came back. */
function isComplete(n: AINarrative): boolean {
  return !!n.framingThesis && !!n.sectionNarratives.personality && n.recommendations.length > 0
}

function readCache(key: string, hash: string): AINarrative | null {
  try {
    const hit = JSON.parse(localStorage.getItem(CACHE_PREFIX + key) ?? "null") as { hash: string; ai: AINarrative } | null
    return hit && hit.hash === hash ? hit.ai : null
  } catch { return null }
}

function writeCache(key: string, hash: string, ai: AINarrative): void {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ hash, ai, at: new Date().toISOString() })) } catch { /* full or private mode */ }
}

/** The endpoint streams for as long as generation takes; past this, show the scaffold. */
const WAIT_MS = 120_000

export async function fetchReportNarrative(
  payload: object,
  opts: { cacheKey?: string; fresh?: boolean } = {},
): Promise<AINarrative | null> {
  const body = JSON.stringify(payload)
  const hash = hashOf(body)
  if (opts.cacheKey && !opts.fresh) {
    const hit = readCache(opts.cacheKey, hash)
    if (hit) return hit
  }
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), WAIT_MS)
  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      signal: ctrl.signal,
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<AINarrative> & { error?: string }
    if (!data || typeof data !== "object" || data.error) return null
    const out = normalise(data)
    if (opts.cacheKey && isComplete(out)) writeCache(opts.cacheKey, hash, out)
    return out
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function normalise(data: Partial<AINarrative>): AINarrative {
    return {
      framingThesis: typeof data.framingThesis === "string" ? data.framingThesis : "",
      executiveSummary: Array.isArray(data.executiveSummary) ? data.executiveSummary : [],
      journey: Array.isArray(data.journey) ? data.journey : [],
      sectionNarratives: {
        personality: data.sectionNarratives?.personality ?? "",
        interests: data.sectionNarratives?.interests ?? "",
        abilities: data.sectionNarratives?.abilities ?? "",
        clusters: data.sectionNarratives?.clusters ?? "",
        jobGroups: data.sectionNarratives?.jobGroups ?? "",
        workRoles: data.sectionNarratives?.workRoles ?? "",
        wellbeing: data.sectionNarratives?.wellbeing ?? "",
      },
      jobMarket: Array.isArray(data.jobMarket) ? data.jobMarket : [],
      routeNarratives: Array.isArray(data.routeNarratives) ? data.routeNarratives : [],
      counsellorSynthesis: typeof data.counsellorSynthesis === "string" ? data.counsellorSynthesis : "",
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      pullQuotes: Array.isArray(data.pullQuotes) ? data.pullQuotes : [],
    }
}
