// The clinical reasoning behind every dashboard metric.
// Each dimension is anchored to a validated instrument; the citations are the
// primary validation papers (shown to users on the metric detail screen).
// Ordering = clinical priority for outpatient mood/anxiety care.

// Score bands shared by the agent rubric and the UI explanations.
export const BANDS = [
  { min: 85, name: 'thriving', desc: 'explicit positive statements, no difficulty expressed' },
  { min: 60, name: 'steady', desc: 'mild or passing difficulty, functioning intact' },
  { min: 40, name: 'strained', desc: 'recurring distress with some functional impact' },
  { min: 20, name: 'struggling', desc: 'pervasive distress, clear functional impairment' },
  { min: 0, name: 'severe', desc: 'constant distress, major impairment, or safety concern' },
]
export const bandFor = (score) =>
  score == null ? null : BANDS.find((b) => score >= b.min)

// Composite wellbeing state ramp — AQI-style (red → orange → amber → green →
// emerald), so the headline ring reads its level at a glance like an air-quality
// index. Per-signal hues live on each METRIC below.
export const BAND_COLOR = {
  severe: '#EF4444',
  struggling: '#F97316',
  strained: '#F59E0B',
  steady: '#22C55E',
  thriving: '#10B981',
}
export const stateColor = (score) => {
  const b = bandFor(score)
  return b ? BAND_COLOR[b.name] : '#C9CDD6'
}
// First hue stop = the signal's solid accent.
export const hueOf = (m) => m?.hue?.[0] || '#12354E'

export const METRICS = [
  {
    key: 'mood',
    name: 'Mood',
    instrument: 'PHQ-9',
    hue: ['#FF5C7A', '#FF93A8'],
    gauge: 'dial',
    baseline: 'phq2',
    listensFor:
      'Expressions of low mood, loss of interest or pleasure (anhedonia), worthlessness, and hopelessness — the core constructs the PHQ-9 measures.',
    whyItMatters:
      'Depressed mood and anhedonia are the two cardinal symptoms of depression and the strongest single predictors of overall severity. Tracking them across sessions shows whether treatment is moving the needle.',
    citations: [
      'Kroenke K, Spitzer RL, Williams JB (2001). The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med, 16(9), 606-613.',
      'Cuijpers P, et al. (2007). Behavioral activation treatments of depression: a meta-analysis. Clin Psychol Rev, 27(3), 318-326.',
    ],
    tryThis:
      'Behavioral activation — scheduling one small, values-aligned activity per day — has effect sizes comparable to full CBT for low mood.',
  },
  {
    key: 'anxiety_regulation',
    name: 'Anxiety regulation',
    instrument: 'GAD-7',
    hue: ['#8B5CF6', '#A78BFA'],
    gauge: 'capsule',
    baseline: 'gad2',
    listensFor:
      'Worry that is hard to control, restlessness, dread, physical tension, and how well coping skills settle the nervous system — the GAD-7 constructs.',
    whyItMatters:
      'Uncontrollable worry is the defining feature of generalized anxiety, and regulation capacity (not just anxiety level) predicts functioning. Sessions where skills work are as informative as sessions where anxiety spikes.',
    citations: [
      'Spitzer RL, Kroenke K, Williams JB, Löwe B (2006). A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med, 166(10), 1092-1097.',
      'Hofmann SG, Smits JA (2008). Cognitive-behavioral therapy for adult anxiety disorders: a meta-analysis. J Clin Psychiatry, 69(4), 621-632.',
    ],
    tryThis:
      'Slow exhale-weighted breathing (4s in, 6-8s out) reliably downshifts sympathetic arousal within ~90 seconds.',
  },
  {
    key: 'sleep_quality',
    name: 'Sleep quality',
    instrument: 'ISI',
    hue: ['#6366F1', '#8B93F8'],
    gauge: 'ring',
    baseline: 'sleep',
    listensFor:
      'Trouble falling or staying asleep, early waking, and daytime impact — the Insomnia Severity Index constructs.',
    whyItMatters:
      'Sleep and mental health are bidirectional: the OASIS randomized trial showed that treating insomnia directly reduces depression, anxiety, and paranoia. Sleep is often the fastest lever in the whole system.',
    citations: [
      'Bastien CH, Vallières A, Morin CM (2001). Validation of the Insomnia Severity Index as an outcome measure for insomnia research. Sleep Med, 2(4), 297-307.',
      'Freeman D, et al. (2017). The effects of improving sleep on mental health (OASIS): a randomised controlled trial. Lancet Psychiatry, 4(10), 749-758.',
    ],
    tryThis:
      'A fixed wake time (even after a bad night) is the single highest-leverage insomnia intervention from CBT-I.',
  },
  {
    key: 'social_connectedness',
    name: 'Social connectedness',
    instrument: 'UCLA Loneliness Scale',
    hue: ['#10B981', '#34D399'],
    gauge: 'blob',
    listensFor:
      'Isolation versus felt support: cancelled plans, withdrawal, reaching out, and the felt quality of relationships.',
    whyItMatters:
      'Loneliness is a mortality-level risk factor — comparable to smoking in meta-analytic data — and social withdrawal is both a symptom and a driver of depression. Reconnection is treatment, not just a nice-to-have.',
    citations: [
      'Russell DW (1996). UCLA Loneliness Scale (Version 3): reliability, validity, and factor structure. J Pers Assess, 66(1), 20-40.',
      'Holt-Lunstad J, Smith TB, Layton JB (2010). Social relationships and mortality risk: a meta-analytic review. PLoS Med, 7(7), e1000316.',
    ],
    tryThis:
      'One low-stakes social touch per week (a text, a walk) measurably shifts loneliness scores within a month.',
  },
  {
    key: 'cognitive_flexibility',
    name: 'Cognitive flexibility',
    instrument: 'RRS (inverse)',
    hue: ['#06B6D4', '#22D3EE'],
    gauge: 'dial',
    listensFor:
      'Rumination loops, replaying mistakes, all-or-nothing thinking — and moments of stepping back or reframing. Scored as the inverse of rumination load.',
    whyItMatters:
      'Rumination prospectively predicts the onset and duration of depressive episodes and amplifies anxiety. Catching a spiral early — which patients describe as "not following the thought" — is a leading indicator of recovery.',
    citations: [
      'Nolen-Hoeksema S (2000). The role of rumination in depressive disorders and mixed anxiety/depressive symptoms. J Abnorm Psychol, 109(3), 504-511.',
      'Watkins ER (2008). Constructive and unconstructive repetitive thought. Psychol Bull, 134(2), 163-206.',
    ],
    tryThis:
      'Rumination responds to concreteness: asking "what exactly happened, what next?" interrupts abstract why-loops.',
  },
  {
    key: 'energy_activation',
    name: 'Energy & activation',
    instrument: 'PHQ-9 items 4/8',
    hue: ['#F59E0B', '#FBBF24'],
    gauge: 'capsule',
    listensFor:
      'Fatigue, psychomotor slowing, and engagement with life — getting out, starting things, following through.',
    whyItMatters:
      'Activation is the engine of behavioral treatments: energy returning typically precedes mood lifting, which makes it an early signal of improvement that pure mood tracking misses.',
    citations: [
      'Jacobson NS, et al. (1996). A component analysis of cognitive-behavioral treatment for depression. J Consult Clin Psychol, 64(2), 295-304.',
    ],
    tryThis:
      'Action precedes motivation in depression — the 5-minute rule (start for five minutes, permission to stop) exploits this.',
  },
  {
    key: 'affect_balance',
    name: 'Affect balance',
    instrument: 'PANAS',
    hue: ['#3B82F6', '#60A5FA'],
    gauge: 'blob',
    listensFor:
      'The ratio of positive to negative emotion expressed across the session — pride, relief, warmth versus dread, shame, anger.',
    whyItMatters:
      'Positive and negative affect are partly independent systems (PANAS); recovery often shows up first as positive affect returning, not negative affect disappearing. Both halves matter.',
    citations: [
      'Watson D, Clark LA, Tellegen A (1988). Development and validation of brief measures of positive and negative affect: the PANAS scales. J Pers Soc Psychol, 54(6), 1063-1070.',
    ],
    tryThis:
      'Savoring — deliberately holding attention on a good moment for 20-30 seconds — reliably increases positive affect.',
  },
]

export const METRIC_BY_KEY = Object.fromEntries(METRICS.map((m) => [m.key, m]))

export const WHY_THESE =
  'Each signal is anchored to a validated clinical instrument (PHQ-9, GAD-7, ISI, UCLA, RRS, PANAS) rather than invented categories, ordered by clinical priority in outpatient mood and anxiety care. Scores come from what was actually said in session — never guessed — and dimensions without evidence stay blank.'

// Screener metadata for onboarding (validated ultra-brief forms).
export const PHQ2 = {
  id: 'phq2',
  title: 'Over the last 2 weeks, how often have you been bothered by…',
  cite: 'PHQ-2 (Kroenke et al., 2003)',
  items: [
    'Little interest or pleasure in doing things',
    'Feeling down, depressed, or hopeless',
  ],
}
export const GAD2 = {
  id: 'gad2',
  title: 'And how often have you been bothered by…',
  cite: 'GAD-2 (Kroenke et al., 2007)',
  items: [
    'Feeling nervous, anxious, or on edge',
    'Not being able to stop or control worrying',
  ],
}
export const FREQ_OPTS = ['Not at all', 'Several days', 'More than half the days', 'Nearly every day']
export const SLEEP_OPTS = ['Very poor', 'Poor', 'Fair', 'Good', 'Very good']
export const GOAL_OPTS = ['Anxiety', 'Low mood', 'Sleep', 'Relationships', 'Stress & burnout', 'Trauma', 'Self-esteem', 'Habits']
