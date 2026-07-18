// Wellness signal nodes — Setmycareer's multimodal context layer.
//
// These are lightweight, deterministic, EXPLAINABLE signal extractors that run
// on the user's OWN on-device data (daily check-ins, journal moods, Blueprint
// dimensions over time). No model, no network, no GBs of research data — the
// research sensor datasets (WESAD/StudentLife/…) are future TRAINING fuel; the
// live product reads the signals the user actually has.
//
// They produce CONTEXT, never diagnosis — used to tune therapy pacing, empathy
// level, and conversational tone, and to surface gentle longitudinal patterns.

const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
const clamp01 = (x) => Math.max(0, Math.min(1, x))
const band = (v, lo, hi) => (v == null ? 'unknown' : v < lo ? 'low' : v > hi ? 'high' : 'moderate')

// pull the last N daily check-ins (already newest-first in store)
function recentCheckins(lifestyle, days = 7) {
  return (lifestyle || []).slice(0, days)
}

function dimSeries(sessions, key) {
  return [...(sessions || [])]
    .filter((s) => s.analysis?.metrics?.dimensions?.[key]?.score != null)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => s.analysis.metrics.dimensions[key].score)
}

// ---- individual signal nodes ----------------------------------------------

export function sleepNode(lifestyle, sessions) {
  const sleeps = recentCheckins(lifestyle).map((e) => e.sleepHrs).filter((x) => x != null)
  const fromCheckins = avg(sleeps)
  const fromSessions = avg(dimSeries(sessions, 'sleep_quality').slice(-3))
  let quality = 'unknown', score = null
  if (fromCheckins != null) {
    score = clamp01((fromCheckins - 4) / 4)            // 4h→0, 8h→1
    quality = fromCheckins < 5.5 ? 'poor' : fromCheckins < 7 ? 'fair' : 'good'
  } else if (fromSessions != null) {
    score = fromSessions / 100
    quality = fromSessions < 40 ? 'poor' : fromSessions < 65 ? 'fair' : 'good'
  }
  return { quality, score, avg_hours: fromCheckins != null ? Math.round(fromCheckins * 10) / 10 : null }
}

export function stressNode(lifestyle, sessions) {
  const stresses = recentCheckins(lifestyle).map((e) => e.stress).filter((x) => x != null)
  const fromCheckins = avg(stresses)                   // 1-5
  const anx = avg(dimSeries(sessions, 'anxiety_regulation').slice(-3))
  let load = null
  if (fromCheckins != null && anx != null) load = clamp01(((fromCheckins - 1) / 4 + (1 - anx / 100)) / 2)
  else if (fromCheckins != null) load = clamp01((fromCheckins - 1) / 4)
  else if (anx != null) load = clamp01(1 - anx / 100)
  return { load, label: band(load, 0.4, 0.66) }
}

export function socialNode(sessions) {
  const s = avg(dimSeries(sessions, 'social_connectedness').slice(-3))
  return { energy: s == null ? null : clamp01(s / 100), label: band(s == null ? null : s / 100, 0.4, 0.66) }
}

// Burnout = sustained high stress + low sleep + low energy + low recovery.
// Composite of available signals, renormalized over what's present.
export function burnoutNode(lifestyle, sessions) {
  const sleep = sleepNode(lifestyle, sessions)
  const stress = stressNode(lifestyle, sessions)
  const energy = avg(dimSeries(sessions, 'energy_activation').slice(-3))
  const parts = []
  if (sleep.score != null) parts.push([1 - sleep.score, 0.3])
  if (stress.load != null) parts.push([stress.load, 0.4])
  if (energy != null) parts.push([1 - energy / 100, 0.3])
  if (!parts.length) return { risk: null, label: 'unknown' }
  const w = parts.reduce((a, [, wt]) => a + wt, 0)
  const risk = clamp01(parts.reduce((a, [v, wt]) => a + v * wt, 0) / w)
  return { risk: Math.round(risk * 100) / 100, label: band(risk, 0.4, 0.66) }
}

export function recoveryNode(sessions) {
  const wb = [...(sessions || [])]
    .filter((s) => s.analysis?.metrics?.wellbeing_index != null)
    .sort((a, b) => a.startedAt - b.startedAt)
    .map((s) => s.analysis.metrics.wellbeing_index)
  if (wb.length < 2) return { trend: 'steady', delta: null }
  const delta = wb.at(-1) - wb.at(-2)
  return { trend: delta >= 4 ? 'improving' : delta <= -4 ? 'declining' : 'steady', delta }
}

// ---- composite context node -----------------------------------------------

export function wellnessContext(lifestyle, sessions) {
  const sleep = sleepNode(lifestyle, sessions)
  const stress = stressNode(lifestyle, sessions)
  const social = socialNode(sessions)
  const burnout = burnoutNode(lifestyle, sessions)
  const recovery = recoveryNode(sessions)

  // response style drives empathy level / pacing of the agent + UI tone
  let response_style = 'steady_reflective'
  if (burnout.risk != null && burnout.risk >= 0.66) response_style = 'gentle_support'
  else if (stress.label === 'high' || sleep.quality === 'poor') response_style = 'soft_check_in'
  else if (recovery.trend === 'improving') response_style = 'warm_encouraging'

  return {
    sleep_quality: sleep.quality,
    stress_load: stress.label,
    social_energy: social.label,
    burnout_risk: burnout.risk,
    recovery_trend: recovery.trend,
    response_style,
    _detail: { sleep, stress, social, burnout, recovery },
    disclaimer: 'Contextual wellness signals from your own check-ins — not a diagnosis.',
  }
}

// ---- longitudinal patterning (safe, non-creepy) ---------------------------
//
// Compares a recent window to the one before it. Only speaks when there are
// ENOUGH data points and the shift is MEANINGFUL — and always hedged + framed
// as an invitation, never an alarm or a claim of certainty.

function windowAvg(entries, key, start, end) {
  const vals = entries.slice(start, end).map((e) => e[key]).filter((x) => x != null)
  return vals.length >= 2 ? avg(vals) : null
}

export function longitudinalPatterns(lifestyle, sessions) {
  const out = []
  const L = lifestyle || []

  // sleep: last 3-4 days vs the 3-4 before
  const recentSleep = windowAvg(L, 'sleepHrs', 0, 4)
  const priorSleep = windowAvg(L, 'sleepHrs', 4, 8)
  if (recentSleep != null && priorSleep != null && recentSleep <= priorSleep - 1) {
    out.push({
      signal: 'sleep', severity: 'gentle',
      text: `Your sleep's been a bit shorter the last few days than it was before. Does today feel heavier than usual?`,
    })
  }

  // activity withdrawal
  const recentAct = windowAvg(L, 'activeMin', 0, 4)
  const priorAct = windowAvg(L, 'activeMin', 4, 8)
  if (recentAct != null && priorAct != null && recentAct <= priorAct - 20) {
    out.push({
      signal: 'activity', severity: 'gentle',
      text: `You've been moving a little less lately. No pressure — sometimes a short walk is enough to shift the day.`,
    })
  }

  // rising stress
  const recentStress = windowAvg(L, 'stress', 0, 4)
  const priorStress = windowAvg(L, 'stress', 4, 8)
  if (recentStress != null && priorStress != null && recentStress >= priorStress + 1) {
    out.push({
      signal: 'stress', severity: 'gentle',
      text: `Stress has felt a touch higher this week than last. Want to talk through what's been loudest?`,
    })
  }

  // social withdrawal from session dimension
  const soc = dimSeries(sessions, 'social_connectedness')
  if (soc.length >= 3 && avg(soc.slice(-2)) <= avg(soc.slice(0, -2)) - 12) {
    out.push({
      signal: 'social', severity: 'gentle',
      text: `It sounds like connecting with people has taken more effort recently. That's worth being kind to yourself about.`,
    })
  }

  // never pile on — surface at most the two most relevant
  return out.slice(0, 2)
}

// Compact line for the agent context (hidden influence on tone/pacing).
export function wellnessContextLine(lifestyle, sessions) {
  const c = wellnessContext(lifestyle, sessions)
  const bits = []
  if (c.sleep_quality !== 'unknown') bits.push(`sleep ${c.sleep_quality}`)
  if (c.stress_load !== 'unknown') bits.push(`stress ${c.stress_load}`)
  if (c.burnout_risk != null) bits.push(`burnout risk ${c.burnout_risk}`)
  if (!bits.length) return ''
  return `Behavioral context (from the user's own check-ins; tune tone/pacing accordingly, ` +
    `recommended style: ${c.response_style}): ${bits.join(', ')}.`
}
