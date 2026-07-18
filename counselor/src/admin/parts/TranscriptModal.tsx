// Transcript viewer — the admin can open any session's transcript in place.
// Reads the same fixture the counsellor console uses (clientTranscript), so it's
// the real conversation, dividers and metric-gating included.

import { clientTranscript } from "@/lib/mock"
import { Modal } from "../ui"
import { cn } from "@/lib/utils"

export function TranscriptModal({ clientId, clientName, title, onClose }: {
  clientId: string; clientName: string; title?: string; onClose: () => void
}) {
  const turns = clientTranscript(clientId)
  return (
    <Modal title={title || "Session transcript"} subtitle={clientName} onClose={onClose} wide>
      {turns.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-muted-foreground">No transcript on file for this session.</p>
      ) : (
        <div className="space-y-3">
          {turns.map((t, i) => (
            t.speaker === "—" ? (
              <div key={i} className="flex items-center gap-3 py-1"><div className="h-px flex-1 bg-border" /><span className="text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-300">{t.text}</span><div className="h-px flex-1 bg-border" /></div>
            ) : (
              <div key={i} className="flex gap-3">
                <span className="w-12 shrink-0 pt-0.5 text-right font-mono text-[10.5px] text-ink-300">{t.ts}</span>
                <div className="min-w-0">
                  <p className={cn("text-[11.5px] font-semibold", /counsel|coach|dr\.|maya/i.test(t.speaker) ? "text-brand-600" : "text-foreground")}>{t.speaker}</p>
                  <p className="text-[13px] leading-relaxed text-foreground/90">{t.text}</p>
                  {t.gatesMetric && <span className="mt-0.5 inline-block rounded bg-mind-50 px-1.5 py-px text-[10px] font-medium text-mind-700">gates {t.gatesMetric}</span>}
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </Modal>
  )
}
