// Fire-and-forget persistence of recorded sessions + notes to the Setmycareer
// backend (FastAPI + Appwrite). EVERY call is try/catch-silent and never throws:
// the console always keeps its local store working — this just makes logged
// sessions + approved notes survive a reload by mirroring them to the cloud.
//
// Standalone on purpose: imports ONLY from ./types (never ./mock) so there's no
// circular import. Dev proxies /api → the deployed backend (see vite.config.ts);
// in prod we hit the backend origin directly (CORS is enabled there).
import type { RecordingLine, Session, SessionNotes } from "./types"

const API_BASE = import.meta.env.DEV ? "" : "https://setmycareer.vercel.app"

// The plain-dict shape the backend stores (snake_case; transcript stringified).
export interface PersistedSessionDoc {
  session_id: string
  client_id: string
  title?: string
  date?: string
  duration_min?: number
  platform?: string
  status?: string
  source?: string
  transcript?: string // JSON.stringify(RecordingLine[])
  counselor_notes?: string
  client_notes?: string
  notes_status?: string
  shared_at?: string
  created_at?: string
}

// Map a console Session (+ optional raw transcript lines) → the backend doc.
function toDoc(session: Session, transcript?: RecordingLine[]): PersistedSessionDoc {
  return {
    session_id: session.id,
    client_id: session.clientId,
    title: session.summary,
    date: session.date,
    duration_min: session.durationMin,
    platform: session.platform,
    status: session.status,
    source: session.platform === "in_person" ? "mic" : "meeting",
    transcript: transcript ? JSON.stringify(transcript) : undefined,
    counselor_notes: session.notes?.counselor,
    client_notes: session.notes?.client,
    notes_status: session.notes?.status,
    shared_at: session.notes?.sharedAt,
    created_at: new Date().toISOString(),
  }
}

/** Persist a freshly-logged session (POST). Fire-and-forget; swallows all errors. */
export async function persistSession(session: Session, transcript?: RecordingLine[]): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/counselor/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(toDoc(session, transcript)),
      keepalive: true,
    })
  } catch {
    /* offline / backend down — local store already has it; ignore */
  }
}

/** Persist a notes update (PATCH). Fire-and-forget; swallows all errors. */
export async function persistSessionNotes(sessionId: string, notes: SessionNotes): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/counselor/sessions/${encodeURIComponent(sessionId)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        counselor: notes.counselor,
        client: notes.client,
        status: notes.status,
        sharedAt: notes.sharedAt,
      }),
      keepalive: true,
    })
  } catch {
    /* ignore — local store is the source of truth on the client */
  }
}

// Parse one backend doc → a console Session. Tolerant of missing/odd fields.
function fromDoc(d: PersistedSessionDoc & Record<string, unknown>): Session | null {
  const id = (d.session_id || (d as { id?: string }).id) as string | undefined
  const clientId = d.client_id as string | undefined
  if (!id || !clientId) return null

  let transcriptLines: RecordingLine[] = []
  if (typeof d.transcript === "string" && d.transcript) {
    try {
      const parsed = JSON.parse(d.transcript)
      if (Array.isArray(parsed)) transcriptLines = parsed as RecordingLine[]
    } catch {
      /* malformed transcript — leave empty */
    }
  }

  const notes: SessionNotes | undefined =
    d.counselor_notes != null || d.client_notes != null || d.notes_status != null
      ? {
          counselor: (d.counselor_notes as string) ?? "",
          client: (d.client_notes as string) ?? "",
          status: (d.notes_status as SessionNotes["status"]) ?? "draft",
          ...(d.shared_at ? { sharedAt: d.shared_at as string } : {}),
        }
      : undefined

  return {
    id,
    clientId,
    date: (d.date as string) ?? "",
    durationMin: typeof d.duration_min === "number" ? d.duration_min : Number(d.duration_min ?? 0) || 0,
    platform: (d.platform as Session["platform"]) ?? "in_person",
    status: (d.status as Session["status"]) ?? "completed",
    attended: true,
    hasTranscript: transcriptLines.length > 0,
    hasReport: false,
    summary: d.title as string | undefined,
    indexDelta: null,
    notes,
  }
}

/** Fetch a client's persisted sessions (GET → parsed Session[]). Never throws; [] on failure. */
export async function fetchClientSessions(clientId: string): Promise<Session[]> {
  try {
    const r = await fetch(`${API_BASE}/api/counselor/sessions/${encodeURIComponent(clientId)}`)
    if (!r.ok) return []
    const data = (await r.json()) as { sessions?: unknown }
    const rows = Array.isArray(data?.sessions) ? data.sessions : []
    return rows
      .map((row) => fromDoc(row as PersistedSessionDoc & Record<string, unknown>))
      .filter((s): s is Session => s != null)
  } catch {
    return []
  }
}
