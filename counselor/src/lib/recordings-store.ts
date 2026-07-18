// Local recordings library — audio (session recorder) + video (call room screen
// capture) blobs stored ON THE USER'S DEVICE via IndexedDB (localStorage can't
// hold large media). The Library screen lists/plays/downloads/deletes them.
//
// Everything is best-effort and never throws to the caller: a save failure
// degrades to "not stored" rather than breaking the recording flow.

import { useCallback, useEffect, useState } from "react"

export type RecordingKind = "audio" | "video" | "screen"

export interface RecordingMeta {
  id: string
  kind: RecordingKind
  clientName?: string
  startedAt: string
  durationMs: number
  mime: string
  size: number
  transcript?: { speaker: string; text: string }[]
  createdAt: number
}

export interface StoredRecording extends RecordingMeta {
  blob: Blob
}

const DB_NAME = "smc-recordings"
const STORE = "recordings"
const CHANGE_EVENT = "smc:recordings-changed"

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function emitChange() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

/** Persist a recording. Returns the id (or null on failure — never throws). */
export async function saveRecording(rec: StoredRecording): Promise<string | null> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).put(rec)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    emitChange()
    return rec.id
  } catch {
    return null
  }
}

/** All recordings, newest first (includes blobs — refs are cheap). */
export async function listRecordings(): Promise<StoredRecording[]> {
  try {
    const db = await openDB()
    const all = await new Promise<StoredRecording[]>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly")
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result as StoredRecording[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return all.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export async function deleteRecording(id: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite")
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
    emitChange()
  } catch {
    /* ignore */
  }
}

/** Trigger a browser download of a stored recording's blob. */
export function downloadRecording(rec: StoredRecording): void {
  const url = URL.createObjectURL(rec.blob)
  const a = document.createElement("a")
  const ext = rec.mime.includes("mp4") ? "mp4" : rec.mime.startsWith("video") ? "webm" : rec.mime.includes("mp4") ? "m4a" : "webm"
  const slug = (rec.clientName || "session").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
  const date = new Date(rec.startedAt).toISOString().slice(0, 10)
  a.href = url
  a.download = `${rec.kind}-${slug}-${date}.${ext}`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

/** Reactive list of stored recordings — refetches on any store change. */
export function useRecordings(): { recordings: StoredRecording[]; loading: boolean; refresh: () => void } {
  const [recordings, setRecordings] = useState<StoredRecording[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(() => {
    listRecordings().then((r) => { setRecordings(r); setLoading(false) })
  }, [])

  useEffect(() => {
    refresh()
    const onChange = () => refresh()
    window.addEventListener(CHANGE_EVENT, onChange)
    return () => window.removeEventListener(CHANGE_EVENT, onChange)
  }, [refresh])

  return { recordings, loading, refresh }
}
