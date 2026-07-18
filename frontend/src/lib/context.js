// Builds the agent-grounding context from on-device data: intake screeners,
// recent lifestyle check-ins, the user's feedback on past scores, and the
// derived wellness context (tone/pacing). Sent transiently with each
// /api/analyze call — never stored server-side.
import { wellnessContextLine } from './wellness'

export function buildIntakeContext(profile, { lifestyle = [], sessions = [], journal = [] } = {}) {
  if (!profile) return ''
  const parts = []

  // Wellness signal nodes → hidden influence on the agent's tone & pacing.
  if (profile.role === 'client') {
    const wc = wellnessContextLine(lifestyle, sessions)
    if (wc) parts.push(wc)
  }

  if (profile.role === 'client' && profile.intake) {
    const i = profile.intake
    const phq = (i.phq2 || []).reduce((a, b) => a + (b ?? 0), 0)
    const gad = (i.gad2 || []).reduce((a, b) => a + (b ?? 0), 0)
    parts.push('Self-reported intake (ultra-brief screeners, scored 0-6, >=3 is a positive screen):')
    if (i.phq2?.length) parts.push(`- PHQ-2 mood screen: ${phq}/6${phq >= 3 ? ' (positive)' : ''}`)
    if (i.gad2?.length) parts.push(`- GAD-2 anxiety screen: ${gad}/6${gad >= 3 ? ' (positive)' : ''}`)
    if (i.sleep != null) parts.push(`- Self-rated sleep quality: ${i.sleep}`)
    if (i.goals?.length) parts.push(`- Goals for therapy: ${i.goals.join(', ')}`)
    if (i.meds) parts.push(`- Current medications: ${i.meds}`)
  }

  // Last 7 lifestyle check-ins → behavioral context (sleep & exercise are
  // evidence-backed mood levers; framed as proxies, never neurotransmitters).
  const recent = lifestyle.slice(0, 7)
  if (recent.length) {
    const avg = (k) => {
      const v = recent.map((e) => e[k]).filter((x) => x != null)
      return v.length ? (v.reduce((a, b) => a + b, 0) / v.length) : null
    }
    const s = avg('sleepHrs'), a = avg('activeMin'), st = avg('stress')
    const bits = []
    if (s != null) bits.push(`avg sleep ${s.toFixed(1)}h/night`)
    if (a != null) bits.push(`avg movement ${Math.round(a)} min/day`)
    if (st != null) bits.push(`self-rated stress ${st.toFixed(1)}/5`)
    if (bits.length) parts.push(`Recent daily check-ins (last ${recent.length} days): ${bits.join(', ')}.`)
  }

  // Notes → first-person context, counsellor notes, and imported reports. Each
  // source enters with explicit, capped weight so it informs without overriding
  // what's said in session (transcript stays dominant).
  const MOOD_WORDS = { 1: 'rough', 2: 'low', 3: 'okay', 4: 'good', 5: 'great' }
  const mine = journal.filter((e) => (e.kind || 'me') === 'me').slice(0, 3)
  if (mine.length) {
    parts.push('Recent journal entries (self-written between sessions):')
    for (const e of mine) {
      const d = new Date(e.ts).toISOString().slice(0, 10)
      parts.push(`- ${d}${e.mood ? ` (felt ${MOOD_WORDS[e.mood]})` : ''}: "${e.text.slice(0, 200)}"`)
    }
  }
  const counsellor = journal.filter((e) => e.kind === 'counsellor').slice(0, 3)
  if (counsellor.length) {
    parts.push("Counsellor notes (useful corroborating context — weight ~moderate, never override the client's own words):")
    for (const e of counsellor) parts.push(`- "${e.text.slice(0, 260)}"`)
  }
  const reports = journal.filter((e) => e.kind === 'report').slice(0, 3)
  if (reports.length) {
    parts.push('Imported reports/assessments (Setmycareer summary; weight by source quality, treat as prior context only):')
    for (const e of reports) parts.push(`- ${e.summary || e.text.slice(0, 220)}`)
  }

  // Score feedback → calibration signal ("the model learns about them").
  const fb = {}
  for (const s of sessions) {
    for (const [dim, v] of Object.entries(s.feedback || {})) {
      fb[dim] = fb[dim] || { high: 0, low: 0, accurate: 0 }
      fb[dim][v] = (fb[dim][v] || 0) + 1
    }
  }
  const notes = Object.entries(fb)
    .map(([dim, c]) => {
      if (c.high >= 2 && c.high > c.low) return `${dim} scores have felt TOO HIGH to them — lean conservative`
      if (c.low >= 2 && c.low > c.high) return `${dim} scores have felt TOO LOW to them — they may understate difficulty`
      return null
    })
    .filter(Boolean)
  if (notes.length) parts.push(`User calibration feedback on past Blueprints: ${notes.join('; ')}.`)

  // Reflection feedback → how the warm reflection itself should adapt for THIS person.
  const rf = { spot_on: 0, not_quite: 0, too_much_advice: 0, missed: 0 }
  for (const s of sessions) {
    const r = s.reflectionFeedback?.rating
    if (r && r in rf) rf[r]++
  }
  const rNotes = []
  if (rf.too_much_advice >= 1) rNotes.push('past reflections have felt like too much advice — lean toward listening and validation, offer fewer/smaller suggestions')
  if (rf.not_quite + rf.missed >= 2) rNotes.push("reflections haven't quite landed — stay closer to their exact words and be more specific, less general")
  if (rf.spot_on >= 2 && rf.spot_on >= rf.not_quite + rf.missed) rNotes.push('past reflections have resonated — keep this voice and depth')
  if (rNotes.length) parts.push(`How this person has reacted to Setmycareer's reflections: ${rNotes.join('; ')}.`)

  if (profile.role === 'clinician') {
    const c = profile.practice || {}
    const bits = []
    if (c.credentials) bits.push(`credentials: ${c.credentials}`)
    if (c.modality) bits.push(`preferred modality: ${c.modality}`)
    if (c.noteStyle) bits.push(`preferred note style: ${c.noteStyle}`)
    if (bits.length) parts.push(`Clinician preferences — ${bits.join('; ')}.`)
  }

  if (parts.length && profile.role === 'client') {
    parts.push('Use all of the above as prior context only; weight what is said in the session itself far higher.')
  }
  return parts.join('\n')
}
