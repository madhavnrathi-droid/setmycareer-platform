import { useEffect, useMemo, useState } from "react"
import { Mic, Video as VideoIcon, MonitorUp, Download, Trash2, FileAudio, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import {
  useRecordings, deleteRecording, downloadRecording,
  type StoredRecording, type RecordingKind,
} from "@/lib/recordings-store"
import { useGsap, revealChildren } from "@/lib/gsap"
import { cn } from "@/lib/utils"

const KIND_ICON: Record<RecordingKind, typeof Mic> = { audio: Mic, video: VideoIcon, screen: MonitorUp }
const KIND_LABEL: Record<RecordingKind, string> = { audio: "Audio", video: "Video", screen: "Screen recording" }

const fmtDur = (ms: number) => {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  return `${m}:${String(s % 60).padStart(2, "0")}`
}
const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`)
const fmtDate = (iso: string) => new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function Library() {
  const { recordings, loading } = useRecordings()
  const ref = useGsap((s) => revealChildren(s), [recordings.length])

  return (
    <div ref={ref}>
      <header data-reveal className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-ink-300">On this device</p>
          <h1 className="mt-1 font-display text-[32px] font-extralight tracking-tight">Library</h1>
        </div>
        <span className="text-[12px] tabular-nums text-muted-foreground">{recordings.length} recording{recordings.length === 1 ? "" : "s"}</span>
      </header>

      {loading ? (
        <div data-reveal className="grid min-h-[30vh] place-items-center text-[13px] text-muted-foreground">Loading…</div>
      ) : recordings.length === 0 ? (
        <div data-reveal className="grid min-h-[40vh] place-items-center rounded-2xl border border-dashed border-border bg-card">
          <div className="flex max-w-sm flex-col items-center gap-3 text-center">
            <div className="grid size-12 place-items-center rounded-2xl border border-border bg-background">
              <FileAudio className="size-5 stroke-[1.25] text-ink-300" />
            </div>
            <h2 className="font-display text-[20px] font-light tracking-tight">Nothing recorded yet</h2>
            <p className="text-[13px] text-muted-foreground">
              Session audio (from the recorder) and call video (from screen recording) are saved here, on this device. Start a recording or a call to populate it.
            </p>
          </div>
        </div>
      ) : (
        <div data-reveal className="flex flex-col gap-3">
          {recordings.map((r) => <RecordingCard key={r.id} rec={r} />)}
        </div>
      )}
    </div>
  )
}

function RecordingCard({ rec }: { rec: StoredRecording }) {
  const url = useMemo(() => URL.createObjectURL(rec.blob), [rec.blob])
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  const [showTx, setShowTx] = useState(false)
  const Icon = KIND_ICON[rec.kind]
  const isVideo = rec.kind !== "audio" && rec.mime.startsWith("video")
  const tx = rec.transcript ?? []

  const remove = () => { void deleteRecording(rec.id); toast("Recording deleted") }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-e1)]">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-ink-600">
          <Icon className="size-[18px] stroke-[1.5]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[14px] font-medium text-foreground">{rec.clientName || "Ad-hoc session"}</span>
            <span className="rounded-full bg-ink-050 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-500">{KIND_LABEL[rec.kind]}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[11.5px] text-muted-foreground">
            <span>{fmtDate(rec.startedAt)}</span>
            <span className="tabular-nums">{fmtDur(rec.durationMs)}</span>
            <span className="tabular-nums">{fmtSize(rec.size)}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={() => downloadRecording(rec)} aria-label="Download" title="Download" className="grid size-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-secondary hover:text-foreground">
            <Download className="size-4 stroke-[1.5]" />
          </button>
          <button onClick={remove} aria-label="Delete" title="Delete" className="grid size-8 place-items-center rounded-lg text-ink-500 transition-colors hover:bg-risk-100 hover:text-risk-600">
            <Trash2 className="size-4 stroke-[1.5]" />
          </button>
        </div>
      </div>

      <div className="mt-3">
        {isVideo ? (
          <video src={url} controls className="max-h-[360px] w-full rounded-xl bg-black" />
        ) : (
          <audio src={url} controls className="w-full" />
        )}
      </div>

      {tx.length > 0 && (
        <div className="mt-3 border-t border-hairline pt-3">
          <button onClick={() => setShowTx((v) => !v)} className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-ink-600 hover:text-foreground">
            <ChevronDown className={cn("size-3.5 stroke-[1.75] transition-transform", showTx && "rotate-180")} />
            Transcript · {tx.length} line{tx.length === 1 ? "" : "s"}
          </button>
          {showTx && (
            <div className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-xl bg-ink-050 p-3 text-[12.5px] leading-relaxed text-ink-700">
              {tx.map((l, i) => <p key={i}>{l.speaker ? <b className="font-medium text-ink-500">{l.speaker}: </b> : null}{l.text}</p>)}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
