// AUTO-GENERATED from Refined_Personality_Scale_with_Scoring.xlsx — the real
// Sigma personality scale: 6 factors x 3 subfactors x 4 items (72), 5-pt Likert,
// D/R keying. norms (mean/sd) computed from the 244-respondent calibration sample.

export interface PItem { text: string; reverse: boolean }
export interface PSubfactor { key: string; label: string; normMean: number; normSd: number; items: PItem[] }
export interface PFactor { key: string; label: string; normMean: number; normSd: number; subfactors: PSubfactor[] }

export const PERSONALITY_FACTORS: PFactor[] = [
  { key: 'PE', label: 'People Energy', normMean: 3.0412, normSd: 0.5603, subfactors: [
    { key: 'sociability', label: 'Sociability', normMean: 3.001, normSd: 1.0496, items: [
      { text: 'I enjoy meeting new people and starting conversations.', reverse: false },
      { text: 'I actively look for chances to connect with others at events.', reverse: false },
      { text: 'I keep to myself unless someone approaches me first.', reverse: true },
      { text: 'I feel energized after spending time with groups.', reverse: false },
    ] },
    { key: 'assertive_leadership', label: 'Assertive Leadership', normMean: 2.963, normSd: 1.0034, items: [
      { text: 'I am comfortable taking the lead when a group needs direction.', reverse: false },
      { text: 'I speak up to influence decisions that affect the team.', reverse: false },
      { text: 'I avoid positions where I have to direct others.', reverse: true },
      { text: 'I can persuade people to get behind a plan.', reverse: false },
    ] },
    { key: 'expressiveness', label: 'Expressiveness', normMean: 3.1595, normSd: 0.9967, items: [
      { text: 'I enjoy presenting or performing in front of others.', reverse: false },
      { text: 'I am fine being the center of attention when needed.', reverse: false },
      { text: 'I feel uneasy if people notice me too much.', reverse: true },
      { text: 'I like to entertain or engage an audience.', reverse: false },
    ] },
  ] },
  { key: 'TE', label: 'Team & Composure', normMean: 3.0977, normSd: 0.5975, subfactors: [
    { key: 'cooperation', label: 'Cooperation', normMean: 3.0936, normSd: 1.0574, items: [
      { text: 'I prefer sharing credit rather than competing for it.', reverse: false },
      { text: 'I step in to support teammates when work gets tough.', reverse: false },
      { text: 'I would rather work alone even when team help is available.', reverse: true },
      { text: 'I prevent others from taking unfair credit for my work.', reverse: false },
    ] },
    { key: 'tolerance_to_criticism', label: 'Tolerance to Criticism', normMean: 3.215, normSd: 1.0442, items: [
      { text: 'I listen calmly when I receive tough feedback.', reverse: false },
      { text: 'I can separate feedback about my work from my self-worth.', reverse: false },
      { text: 'I react strongly when someone points out my mistakes.', reverse: true },
      { text: 'I ask clarifying questions to understand criticism.', reverse: false },
    ] },
    { key: 'emotional_composure', label: 'Emotional Composure', normMean: 2.9846, normSd: 1.066, items: [
      { text: 'I stay calm and polite under pressure.', reverse: false },
      { text: 'I am slow to anger, even when things go wrong.', reverse: false },
      { text: 'I often lose my temper when plans change suddenly.', reverse: true },
      { text: 'I handle disagreements without raising my voice.', reverse: false },
    ] },
  ] },
  { key: 'IN', label: 'Independence & Self-Image', normMean: 3.0106, normSd: 0.5898, subfactors: [
    { key: 'autonomy', label: 'Autonomy', normMean: 2.9681, normSd: 0.96, items: [
      { text: 'I make important decisions without needing approval from others.', reverse: false },
      { text: 'I trust my judgment when the situation is uncertain.', reverse: false },
      { text: 'I hesitate to act until someone else confirms my choice.', reverse: true },
      { text: 'I take ownership for results, whether good or bad.', reverse: false },
    ] },
    { key: 'image_concern', label: 'Image Concern', normMean: 3.0226, normSd: 1.0249, items: [
      { text: 'I worry about how others perceive my actions.', reverse: false },
      { text: 'Public image matters more to me than my own standards.', reverse: false },
      { text: 'I share my ideas even if they are unpopular.', reverse: true },
      { text: 'I value authenticity over social approval.', reverse: true },
    ] },
    { key: 'support_seeking', label: 'Support-Seeking', normMean: 3.0412, normSd: 1.0722, items: [
      { text: 'I prefer having someone to rely on during difficult times.', reverse: false },
      { text: 'I look for protective people who can take care of me.', reverse: false },
      { text: 'I try to solve problems on my own before seeking help.', reverse: true },
      { text: 'I can cope with challenges without much external support.', reverse: true },
    ] },
  ] },
  { key: 'LE', label: 'Learning Orientation', normMean: 3.0027, normSd: 0.5717, subfactors: [
    { key: 'openness_to_change', label: 'Openness to Change', normMean: 3.0833, normSd: 1.0694, items: [
      { text: 'I like trying activities I have never done before.', reverse: false },
      { text: 'I adapt quickly when routines or environments change.', reverse: false },
      { text: 'I prefer to stick to familiar habits.', reverse: true },
      { text: 'I enjoy exploring new foods, places, or cultures.', reverse: false },
    ] },
    { key: 'intellectual_curiosity', label: 'Intellectual Curiosity', normMean: 2.9887, normSd: 1.0602, items: [
      { text: 'I use careful reasoning to form opinions.', reverse: false },
      { text: 'I enjoy reading deeply on topics that interest me.', reverse: false },
      { text: 'I avoid discussions that require careful thinking.', reverse: true },
      { text: 'I connect ideas across different subjects.', reverse: false },
    ] },
    { key: 'breadth_of_interests', label: 'Breadth of Interests', normMean: 2.9362, normSd: 0.9995, items: [
      { text: 'I actively pursue hobbies across diverse areas.', reverse: false },
      { text: 'I keep myself updated on developments in many fields.', reverse: false },
      { text: 'I rarely attend cultural or social events.', reverse: true },
      { text: 'I like learning outside my main area of study.', reverse: false },
    ] },
  ] },
  { key: 'SY', label: 'System & Discipline', normMean: 3.0456, normSd: 0.5979, subfactors: [
    { key: 'planning_clarity', label: 'Planning & Clarity', normMean: 3.1255, normSd: 1.0152, items: [
      { text: 'I outline tasks and timelines before I start work.', reverse: false },
      { text: 'I ask questions until the goal is fully clear.', reverse: false },
      { text: 'I jump in without a plan and figure it out later.', reverse: true },
      { text: 'I create checklists for most projects.', reverse: false },
    ] },
    { key: 'methodical_decisions', label: 'Methodical Decisions', normMean: 3.0309, normSd: 1.0847, items: [
      { text: 'I think through important choices before acting.', reverse: false },
      { text: 'I approach problems in a systematic way.', reverse: false },
      { text: 'I respond impulsively rather than pausing to reflect.', reverse: true },
      { text: 'I review options and consequences before deciding.', reverse: false },
    ] },
    { key: 'orderliness', label: 'Orderliness', normMean: 2.9805, normSd: 0.9487, items: [
      { text: 'I prefer my study or workspace to be neat and organized.', reverse: false },
      { text: 'I return things to their place when I’m done with them.', reverse: false },
      { text: 'I can work fine in messy or cluttered spaces.', reverse: true },
      { text: 'I function best when routines and systems are in place.', reverse: false },
    ] },
  ] },
  { key: 'AC', label: 'Achievement Drive', normMean: 2.9691, normSd: 0.5924, subfactors: [
    { key: 'goal_orientation', label: 'Goal Orientation', normMean: 3.0072, normSd: 1.0382, items: [
      { text: 'I set ambitious goals and track my progress.', reverse: false },
      { text: 'I feel motivated by meaningful results.', reverse: false },
      { text: 'I rarely challenge myself beyond minimum requirements.', reverse: true },
      { text: 'I like knowing the expected outcomes before I begin.', reverse: false },
    ] },
    { key: 'persistence_grit', label: 'Persistence (Grit)', normMean: 3.0597, normSd: 1.0211, items: [
      { text: 'I keep working steadily until tasks are completed.', reverse: false },
      { text: 'I can maintain focus for long stretches if a task matters.', reverse: false },
      { text: 'I tend to quit when a task becomes difficult.', reverse: true },
      { text: 'People rely on me for jobs that require patience.', reverse: false },
    ] },
    { key: 'seriousness_work_ethic', label: 'Seriousness / Work Ethic', normMean: 2.8405, normSd: 1.0901, items: [
      { text: 'I am willing to work while others are relaxing.', reverse: false },
      { text: 'I prioritize long-term gains over short-term fun.', reverse: false },
      { text: 'I only do the bare minimum that is necessary.', reverse: true },
      { text: 'I push myself to exceed expectations.', reverse: false },
    ] },
  ] },
]
