// Sample data — lets you feel the full UI before any real sessions exist.
// Loaded on demand; clearly synthetic; wiped via Profile → delete everything.
import { saveSession, upsertContact, saveJournalEntry, getJournal } from './store'

const DAY = 86400000

const dim = (label, score, st, evidence = [], reasoning = '') => ({
  label, score, state: st, evidence, reasoning, evidence_verified: score != null,
})

const mk = ({ days, dur, peer, wb, emotions, dims, summary, themes, riskLevel = 'none', riskNote = '', transcript }) => ({
  id: 'sample-' + days,
  startedAt: Date.now() - days * DAY,
  duration: dur,
  modality: 'general',
  verified: true,
  peer,
  transcript,
  hasAudio: false,
  status: 'analyzed',
  sample: true,
  analysis: {
    note_markdown:
      `## Progress Note\n### Subjective\n${transcript.slice(0, 140)}…\n### Assessment\n${summary}\n### Plan\nContinue weekly sessions; review coping strategies next visit.`,
    entities: {},
    patterns: { themes },
    risk: {
      overall_level: riskLevel,
      categories: {},
      recommended_actions: riskNote ? [riskNote] : [],
      disclaimer: 'Automated screening for clinician review only.',
    },
    evidence: [],
    metrics: {
      wellbeing_index: wb,
      dominant_emotions: emotions,
      dimensions: dims,
      clinical_summary: summary,
      risk_capped: riskLevel !== 'none',
      disclaimer: 'Wellness-tracking signals, not a diagnosis or validated assessment.',
    },
  },
})

const DR_MAYA = { name: 'Dr. Maya Lin', role: 'clinician' }
const DR_OKAFOR = { name: 'Dr. Sam Okafor', role: 'clinician' }

export const SAMPLE_SESSIONS = [
  mk({
    days: 42, dur: 2900, peer: DR_MAYA, wb: 38,
    emotions: [
      { emotion: 'overwhelmed', intensity: 'high', quote: '' },
      { emotion: 'ashamed', intensity: 'moderate', quote: '' },
    ],
    dims: {
      mood: dim('Mood', 34, 'heavy'),
      anxiety_regulation: dim('Anxiety regulation', 30, 'flooded'),
      energy_activation: dim('Energy & activation', 40, 'drained'),
      sleep_quality: dim('Sleep quality', 22, 'restless'),
      social_connectedness: dim('Social connectedness', 31, 'withdrawn'),
      cognitive_flexibility: dim('Cognitive flexibility', 28, 'looping'),
      affect_balance: dim('Affect balance', 35, 'clouded'),
    },
    summary: 'A hard stretch — work pressure and broken sleep are feeding each other, and isolation is making the load heavier. Naming it out loud was a strong first step.',
    themes: ['burnout', 'isolation', 'self-criticism'],
    riskLevel: 'moderate', riskNote: 'Monitor mood and sleep; schedule mid-week check-in.',
    transcript: 'I have not been sleeping. Work is endless and I keep thinking I am failing at all of it. I cancelled on my sister again. Some nights I just lie there replaying everything I said wrong.',
  }),
  mk({
    days: 35, dur: 3100, peer: DR_MAYA, wb: 44,
    emotions: [
      { emotion: 'anxious', intensity: 'high', quote: '' },
      { emotion: 'relieved', intensity: 'low', quote: '' },
    ],
    dims: {
      mood: dim('Mood', 42, 'flat'),
      anxiety_regulation: dim('Anxiety regulation', 38, 'wired'),
      energy_activation: dim('Energy & activation', 45, 'low'),
      sleep_quality: dim('Sleep quality', 34, 'shallow'),
      social_connectedness: dim('Social connectedness', 40, 'distant'),
      cognitive_flexibility: dim('Cognitive flexibility', 41, 'rigid'),
      affect_balance: dim('Affect balance', 44, 'mixed'),
    },
    summary: 'Anxiety is still loud, but you used the grounding exercise twice this week and it helped. Sleep is inching up. Small, real movement.',
    themes: ['grounding skills', 'work stress'],
    transcript: 'The breathing thing actually worked before the board meeting. I still wake up at 4am most days but I got back to sleep twice this week, which is new.',
  }),
  mk({
    days: 27, dur: 2750, peer: DR_MAYA, wb: 52,
    emotions: [
      { emotion: 'hopeful', intensity: 'moderate', quote: '' },
      { emotion: 'anxious', intensity: 'moderate', quote: '' },
    ],
    dims: {
      mood: dim('Mood', 50, 'lighter'),
      anxiety_regulation: dim('Anxiety regulation', 48, 'steadier'),
      energy_activation: dim('Energy & activation', 52, 'waking'),
      sleep_quality: dim('Sleep quality', 47, 'improving'),
      social_connectedness: dim('Social connectedness', 49, 'reaching out'),
      cognitive_flexibility: dim('Cognitive flexibility', 55, 'loosening'),
      affect_balance: dim('Affect balance', 53, 'balancing'),
    },
    summary: 'The week had real bright spots — dinner with your sister, two full nights of sleep. The inner critic is quieter when you are rested.',
    themes: ['reconnection', 'sleep hygiene'],
    transcript: 'I saw my sister. It was easier than I thought. I told her a little about what has been going on and she did not make it weird. We are doing it again next week.',
  }),
  mk({
    days: 16, dur: 3000, peer: DR_OKAFOR, wb: 49,
    emotions: [
      { emotion: 'frustrated', intensity: 'moderate', quote: '' },
      { emotion: 'determined', intensity: 'moderate', quote: '' },
    ],
    dims: {
      mood: dim('Mood', 47, 'tested'),
      anxiety_regulation: dim('Anxiety regulation', 44, 'spiking'),
      energy_activation: dim('Energy & activation', 50, 'pushing'),
      sleep_quality: dim('Sleep quality', 45, 'uneven'),
      social_connectedness: dim('Social connectedness', 52, 'supported'),
      cognitive_flexibility: dim('Cognitive flexibility', 50, 'flexing'),
      affect_balance: dim('Affect balance', 49, 'mixed'),
    },
    summary: 'A setback week at work shook things, but the difference is you reached for tools instead of spiraling — and asked for help early.',
    themes: ['setback recovery', 'asking for help'],
    transcript: 'The project got pulled and I felt that old panic come up. But I called my sister instead of going quiet, and I used the five senses thing in the bathroom at work. It passed faster this time.',
  }),
  mk({
    days: 7, dur: 3200, peer: DR_MAYA, wb: 61,
    emotions: [
      { emotion: 'calm', intensity: 'moderate', quote: '' },
      { emotion: 'proud', intensity: 'moderate', quote: '' },
      { emotion: 'hopeful', intensity: 'moderate', quote: '' },
    ],
    dims: {
      mood: dim('Mood', 62, 'brighter', ['Honestly this week was okay. Like actually okay'], 'Spontaneous positive self-assessment without prompting — steady band.'),
      anxiety_regulation: dim('Anxiety regulation', 58, 'settled', ['did not follow it'], 'Caught an anxious spiral early and disengaged — regulation working.'),
      energy_activation: dim('Energy & activation', 60, 'steady', ['I slept, I worked, I saw people'], 'Full engagement across work and life this week.'),
      sleep_quality: dim('Sleep quality', 64, 'restful', ['I slept'], 'Sleep reported as unremarkable — a marked shift from earlier weeks.'),
      social_connectedness: dim('Social connectedness', 63, 'connected', ['I saw people'], 'Social contact resumed without avoidance language.'),
      cognitive_flexibility: dim('Cognitive flexibility', 59, 'open', ['I caught myself starting the doom spiral on Tuesday and just... did not follow it'], 'Meta-awareness of rumination plus successful disengagement.'),
      affect_balance: dim('Affect balance', 61, 'warming', ['actually okay'], 'Positive affect present and credible; negative affect mild.'),
    },
    summary: 'Six weeks in, the trend is real: sleep is holding, the critic is quieter, and you described this week as "actually okay" — your words, and they matter.',
    themes: ['consolidation', 'self-compassion'],
    transcript: 'Honestly this week was okay. Like actually okay. I slept, I worked, I saw people. I caught myself starting the doom spiral on Tuesday and just... did not follow it.',
  }),
]

export async function loadSampleData() {
  await upsertContact(DR_MAYA)
  await upsertContact(DR_OKAFOR)
  const journal = await getJournal()
  if (journal.length === 0) {
    await saveJournalEntry({ text: 'Slept through the night for once. Walked to work the long way and it actually helped my head.', mood: 4 })
    await saveJournalEntry({ text: 'Caught myself spiraling about the review meeting. Did the breathing thing — passed in a few minutes.', mood: 3 })
  }
  // saveSession unshifts; insert oldest-first so newest ends up on top
  for (const s of [...SAMPLE_SESSIONS].sort((a, b) => a.startedAt - b.startedAt)) {
    await saveSession(s)
  }
}
