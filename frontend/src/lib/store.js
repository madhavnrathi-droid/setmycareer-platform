// All app data lives here — on-device IndexedDB. Nothing syncs anywhere.
import { get, set, del } from 'idb-keyval'

export const uid = () => crypto.randomUUID()

// ---- profile: { id, name, role: 'client'|'clinician', createdAt } ----
export const getProfile = () => get('profile').then((p) => p ?? null)
export const saveProfile = (p) => set('profile', p)

// ---- settings: { layer: 'both' | 'personal' | 'professional', ... } ----
// `layer` chooses which intelligence the app surfaces; each layer uses its own
// algorithm downstream so personal & professional signals never cross-contaminate.
const SETTINGS_DEFAULT = { layer: 'both' }
export const getSettings = () => get('settings').then((s) => ({ ...SETTINGS_DEFAULT, ...(s || {}) }))
export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch }
  await set('settings', next)
  return next
}

// ---- contacts: people you've paired with [{ id, name, role, lastSeen }] ----
export const getContacts = () => get('contacts').then((c) => c ?? [])
export async function upsertContact({ name, role }) {
  const contacts = await getContacts()
  let c = contacts.find((x) => x.name === name && x.role === role)
  if (c) c.lastSeen = Date.now()
  else { c = { id: uid(), name, role, lastSeen: Date.now() }; contacts.push(c) }
  await set('contacts', contacts)
  return c
}

// ---- sessions ----
// { id, startedAt, duration, modality, verified, peer:{name,role}|null,
//   transcript, hasAudio, analysis|null, status:'recorded'|'transcribed'|'analyzed' }
export const getSessions = () => get('sessions').then((s) => s ?? [])
export async function saveSession(session) {
  const sessions = await getSessions()
  const i = sessions.findIndex((s) => s.id === session.id)
  if (i >= 0) sessions[i] = session
  else sessions.unshift(session)
  await set('sessions', sessions)
  return session
}
export async function deleteSession(id) {
  const sessions = await getSessions()
  await set('sessions', sessions.filter((s) => s.id !== id))
  await del('audio:' + id)
}

// ---- roster: the people your sessions are organized under ----
// Scoped per role so the two views never bleed: a PATIENT keeps PROVIDERS ("My
// therapist", a psychiatrist, a coach — they name the title and role) stored under
// `providers`, filing sessions via `session.providerId`. A COUNSELLOR keeps CLIENTS
// under `clients`, filing via `session.clientId`. Same entry shape either way:
// { id, name, role, note, createdAt }. Filing is purely organizational — the
// Blueprint still aggregates every session the same way.
const ROSTER_KEY = { client: 'providers', clinician: 'clients' }
const CIRCLE_FIELD = { client: 'providerId', clinician: 'clientId' }
export const rosterKeyFor = (role) => ROSTER_KEY[role] || 'providers'
export const circleFieldFor = (role) => CIRCLE_FIELD[role] || 'providerId'

export const getRoster = (role) => get(rosterKeyFor(role)).then((r) => r ?? [])
export async function saveRosterEntry(role, entry) {
  const key = rosterKeyFor(role)
  const list = (await get(key)) ?? []
  const i = list.findIndex((x) => x.id === entry.id)
  if (i >= 0) list[i] = { ...list[i], ...entry }
  else list.push({ id: entry.id || uid(), name: (entry.name || '').trim(), role: entry.role || '', note: entry.note || '', createdAt: Date.now() })
  await set(key, list)
  return list
}
export async function deleteRosterEntry(role, id) {
  const key = rosterKeyFor(role), field = circleFieldFor(role)
  await set(key, ((await get(key)) ?? []).filter((x) => x.id !== id))
  // orphaned sessions fall back to "unfiled" — never deleted
  const sessions = await getSessions()
  let changed = false
  for (const s of sessions) if (s[field] === id) { delete s[field]; changed = true }
  if (changed) await set('sessions', sessions)
}
export async function assignSessionCircle(role, sessionId, circleId) {
  const field = circleFieldFor(role)
  const sessions = await getSessions()
  const s = sessions.find((x) => x.id === sessionId)
  if (!s) return
  if (circleId) s[field] = circleId
  else delete s[field]
  await set('sessions', sessions)
}

// ---- career profile: the professional layer's grounding (on-device) ----
// { current, target, skills:[name], riasec:[letter], goal, momentum, updatedAt }
export const getCareerProfile = () => get('careerProfile').then((c) => c ?? null)
export async function saveCareerProfile(patch) {
  const next = { ...(await getCareerProfile()), ...patch, updatedAt: Date.now() }
  await set('careerProfile', next)
  return next
}

// ---- audio blobs, keyed per session ----
export const saveAudio = (id, blob) => set('audio:' + id, blob)
export const getAudio = (id) => get('audio:' + id)

// ---- lifestyle check-ins: { date: 'YYYY-MM-DD', sleepHrs, activeMin, stress(1-5) } ----
export const getLifestyle = () => get('lifestyle').then((l) => l ?? [])
export async function saveCheckin(entry) {
  const list = await getLifestyle()
  const i = list.findIndex((e) => e.date === entry.date)
  if (i >= 0) list[i] = { ...list[i], ...entry }
  else list.unshift(entry)
  await set('lifestyle', list.slice(0, 60))
  return entry
}
export const today = () => new Date().toISOString().slice(0, 10)

// ---- notes: [{ id, ts, text, mood(1-5)|null, kind, summary }] newest first ----
// kind: 'me' (your reflection) | 'counsellor' (a note from your counsellor) |
// 'report' (an uploaded test/career report; `summary` holds Setmycareer's read of it).
export const getJournal = () => get('journal').then((j) => j ?? [])
export async function saveJournalEntry({ text, mood = null, kind = 'me', summary = null }) {
  const list = await getJournal()
  const entry = { id: uid(), ts: Date.now(), text: text.trim(), mood, kind, summary }
  list.unshift(entry)
  await set('journal', list.slice(0, 500))
  return entry
}
export async function updateJournalEntry(id, { text, mood, kind, summary }) {
  const list = await getJournal()
  const next = list.map((e) => e.id === id
    ? { ...e, text: text.trim(), mood: mood ?? e.mood, kind: kind ?? e.kind, summary: summary ?? e.summary, editedAt: Date.now() } : e)
  await set('journal', next)
}
export async function deleteJournalEntry(id) {
  const list = await getJournal()
  await set('journal', list.filter((e) => e.id !== id))
}

// ---- export rated sessions as eval/tuning data (user-initiated, on-device) ----
// Produces a JSONL the user can hand to the eval harness (scripts/eval_agent.py)
// to improve the agent. Nothing is uploaded — this just downloads a local file.
export async function exportTuningData() {
  const sessions = await getSessions()
  const rows = sessions
    .filter((s) => s.analysis?.metrics && s.transcript)
    .map((s) => ({
      transcript: s.transcript,
      reflection: s.analysis.reflection || null,
      reflection_rating: s.reflectionFeedback?.rating || null,
      dimension_feedback: s.feedback || null,
      wellbeing_index: s.analysis.metrics.wellbeing_index ?? null,
      ts: s.startedAt,
    }))
  const blob = new Blob([rows.map((r) => JSON.stringify(r)).join('\n')], { type: 'application/jsonl' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'Setmycareer-tuning-data.jsonl'
  a.click()
  URL.revokeObjectURL(url)
  return rows.length
}

// ---- index history: the append-only timeline behind the Blueprint terminal ----
// One point per analyzed session (upserted by id), sorted by time. Powers the
// scrubbable all-time graph, the longitudinal trend weight, and pattern detection.
export const getIndexHistory = () => get('indexHistory').then((h) => h ?? [])
export async function recordIndexPoint(session) {
  const m = session?.analysis?.metrics
  if (!m || m.wellbeing_index == null) return null
  const dims = {}
  for (const [k, v] of Object.entries(m.dimensions || {})) if (v?.score != null) dims[k] = v.score
  const confs = Object.values(m.dimensions || {}).map((d) => d?.confidence).filter(Boolean)
  const point = {
    sessionId: session.id,
    ts: session.startedAt,
    wellbeing: m.wellbeing_index,
    dims,
    emotion: m.dominant_emotions?.[0]?.emotion || null,
    riskCapped: !!m.risk_capped,
    nModerate: confs.filter((c) => c === 'moderate').length,
    layer: session.layer || 'personal',
  }
  const hist = await getIndexHistory()
  const i = hist.findIndex((p) => p.sessionId === session.id)
  if (i >= 0) hist[i] = point
  else hist.push(point)
  hist.sort((a, b) => a.ts - b.ts)
  await set('indexHistory', hist.slice(-500))
  return point
}

// Seed the timeline from already-analyzed sessions (one-time, idempotent).
export async function backfillIndexHistory(sessions) {
  const have = new Set((await getIndexHistory()).map((p) => p.sessionId))
  for (const s of sessions || []) {
    if (s?.analysis?.metrics?.wellbeing_index != null && !have.has(s.id)) await recordIndexPoint(s)
  }
}

// ---- wipe everything (Profile > delete my data) ----
export async function wipeAll() {
  const sessions = await getSessions()
  await Promise.all(sessions.map((s) => del('audio:' + s.id)))
  await del('sessions'); await del('contacts'); await del('profile'); await del('lifestyle'); await del('journal')
  await del('indexHistory'); await del('settings'); await del('roster'); await del('providers'); await del('clients'); await del('careerProfile')
}
