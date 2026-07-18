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

export async function fetchReportNarrative(payload: object): Promise<AINarrative | null> {
  try {
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    const data = (await res.json()) as Partial<AINarrative> & { error?: string }
    if (!data || typeof data !== "object" || data.error) return null
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
  } catch {
    return null
  }
}
