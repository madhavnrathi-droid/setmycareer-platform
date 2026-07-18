// Thin client for the stateless backend. The server stores nothing.

async function json(path, opts = {}) {
  const res = await fetch('/api' + path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) {
    let msg = res.statusText
    try { msg = (await res.json()).detail || msg } catch { /* ignore */ }
    throw new Error(msg)
  }
  return res.json()
}

export const health = () => json('/health')

export const analyze = (transcript, modality, personLabel, context = '') =>
  json('/analyze', {
    method: 'POST',
    body: JSON.stringify({ transcript, modality, person_label: personLabel, context }),
  })

export async function transcribe(blob, roles = []) {
  const fd = new FormData()
  fd.append('file', blob, 'session.webm')
  const q = roles.filter(Boolean).length >= 2 ? '?roles=' + encodeURIComponent(roles.join(',')) : ''
  const res = await fetch('/api/transcribe' + q, { method: 'POST', body: fd })
  const data = await res.json()
  if (!res.ok) throw new Error(data.detail || 'transcription failed')
  return data.text
}

// Streaming analyze — emits real per-node progress via SSE; onStage({label,done,total})
// is called as each pipeline node finishes. Falls back to the plain endpoint if
// streaming isn't available. Resolves with the same result object as analyze().
export async function analyzeStream(transcript, modality, personLabel, context = '', onStage) {
  let res
  try {
    res = await fetch('/api/analyze/stream', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript, modality, person_label: personLabel, context }),
    })
  } catch { return analyze(transcript, modality, personLabel, context) }
  if (!res.ok || !res.body) return analyze(transcript, modality, personLabel, context)

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', result = null, err = null
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const line = buf.slice(0, i).split('\n').find((l) => l.startsWith('data:'))
      buf = buf.slice(i + 2)
      if (!line) continue
      let evt
      try { evt = JSON.parse(line.slice(5).trim()) } catch { continue }
      if (evt.type === 'stage') onStage?.(evt)
      else if (evt.type === 'result') result = evt.result
      else if (evt.type === 'error') err = evt.message
    }
  }
  if (result) return result
  // stream gave no result → fall back so the user still gets their analysis
  if (err) { try { return await analyze(transcript, modality, personLabel, context) } catch { throw new Error(err) } }
  return analyze(transcript, modality, personLabel, context)
}

export const diarize = (text, roles = ['Therapist', 'Client']) =>
  json('/diarize', { method: 'POST', body: JSON.stringify({ text, roles }) })

export const summarizeReport = (text) =>
  json('/summarize', { method: 'POST', body: JSON.stringify({ text }) })

export const getInsights = (history) =>
  json('/insights', { method: 'POST', body: JSON.stringify({ history }) })

// Deeper career read — labor-data-grounded next moves with citations (Claude).
export const careerRead = (profile) =>
  json('/career', { method: 'POST', body: JSON.stringify(profile) })

// Current BLS OEWS median wage for an SOC ({ live:false } when unavailable).
export const laborOutlook = (soc) =>
  json('/labor/outlook?soc=' + encodeURIComponent(soc || ''))

// Grounded AI-counsellor chat — answers from the user's own account + labor data.
export const chatReply = (body) =>
  json('/chat', { method: 'POST', body: JSON.stringify(body) })

export const pairCreate = (name, role) =>
  json('/pair/create', { method: 'POST', body: JSON.stringify({ name, role }) })

export const pairJoin = (code, name, role) =>
  json('/pair/join', { method: 'POST', body: JSON.stringify({ code, name, role }) })

export const pairStatus = (code) => json('/pair/status/' + encodeURIComponent(code))

// --- Meeting integrations (Google Meet / Zoho) -----------------------------
export const integrationsStatus = () => json('/integrations/status')
export const integrationConnectUrl = (provider) => json('/integrations/' + provider + '/connect')
export const importMeeting = (provider, meetingUrl) =>
  json('/integrations/import', { method: 'POST', body: JSON.stringify({ provider, meeting_url: meetingUrl }) })
