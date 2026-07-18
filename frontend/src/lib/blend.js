// BOTH layer — fuse the personal wellbeing index and the professional career
// index into one "life performance" read, plus a deterministic contradiction
// band that names cross-layer tension ("career climbing while energy dips").
// Per the foundation: algorithms stay separate; a combined statement carries the
// LOWER of the two layers' confidences.
import { computeCareer } from './career'
import { bandFor } from './science'

export function lifeBlend({ personalIdx, personalDelta, personalEmotion, career }) {
  const c = career ? computeCareer(career) : null
  const careerIdx = c?.index ?? null
  const careerMomentum = c?.dims?.execution_momentum?.score ?? null

  const have = [personalIdx, careerIdx].filter((v) => v != null)
  const life = have.length ? Math.round(have.reduce((a, b) => a + b, 0) / have.length) : null

  // contradiction band — only when BOTH layers have a signal to compare
  let tension = null
  if (personalIdx != null && careerIdx != null) {
    const pLow = personalIdx < 50 || (personalDelta != null && personalDelta <= -3)
    const pHigh = personalIdx >= 60 && (personalDelta == null || personalDelta >= 0)
    const cHigh = careerIdx >= 60 || (careerMomentum != null && careerMomentum >= 60)
    const cLow = careerIdx < 45
    if (cHigh && pLow)
      tension = { kind: 'burnout', text: 'Your career signal is climbing while your wellbeing dips — a classic burnout setup. Protect your energy as you push.' }
    else if (pHigh && cLow)
      tension = { kind: 'underbuilt', text: "You're steady in yourself, but professional momentum is quiet — there may be room to channel some of that into a career move." }
    else if (pLow && cLow)
      tension = { kind: 'both-low', text: 'Both sides are running low right now — be gentle, and pick one small move in just one area.' }
    else if (pHigh && careerIdx >= 60)
      tension = { kind: 'aligned', text: 'Personal and professional are moving together — a strong window to take a bigger step.' }
  }

  return { life, lifeBand: life != null ? bandFor(life) : null, personalIdx, careerIdx, career: c, tension }
}
