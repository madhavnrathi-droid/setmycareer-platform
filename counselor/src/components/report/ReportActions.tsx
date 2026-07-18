import { Pencil, Check, Share2, Printer, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * ReportActions — the report document's action bar (purely presentational).
 *
 * The big report doc owns all state and passes it down: an Edit / Done toggle,
 * a Share-to-client toggle, a Print/PDF button (caller wires onPrint to
 * window.print), and an optional Download. Tokens-styled, compact, and
 * sticky-friendly — drop it inside a `sticky top-0` wrapper in the doc.
 */
export function ReportActions({
  editing,
  onToggleEdit,
  shared,
  onToggleShare,
  onPrint,
  onDownload,
  onRegenerate,
  regenerating,
  className,
}: {
  editing: boolean
  onToggleEdit: () => void
  shared: boolean
  onToggleShare: () => void
  onPrint: () => void
  onDownload?: () => void
  /** Re-run the AI synthesis over the client's latest transcripts & sessions. */
  onRegenerate?: () => void
  regenerating?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-frost px-2 py-1.5 shadow-e1 backdrop-blur-md print:hidden",
        className,
      )}
    >
      {/* Edit / Done editing */}
      <Button
        type="button"
        size="sm"
        variant={editing ? "default" : "ghost"}
        onClick={onToggleEdit}
        aria-pressed={editing}
        className="h-8"
      >
        {editing ? (
          <>
            <Check className="size-4 stroke-[1.75]" /> Done editing
          </>
        ) : (
          <>
            <Pencil className="size-4 stroke-[1.75]" /> Edit
          </>
        )}
      </Button>

      {/* Share to client */}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onToggleShare}
        aria-pressed={shared}
        className={cn(
          "h-8",
          shared && "bg-well-100 text-well-600 hover:bg-well-100/80 hover:text-well-600",
        )}
      >
        {shared ? (
          <>
            <Check className="size-4 stroke-[1.75]" /> Shared
          </>
        ) : (
          <>
            <Share2 className="size-4 stroke-[1.75]" /> Share to client
          </>
        )}
      </Button>

      {/* Regenerate from latest transcripts/sessions */}
      {onRegenerate && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onRegenerate}
          disabled={regenerating}
          title="Re-run the AI synthesis using the client's latest sessions & transcripts"
          className="h-8"
        >
          <RefreshCw className={cn("size-4 stroke-[1.75]", regenerating && "animate-spin")} />
          {regenerating ? "Regenerating…" : "Regenerate"}
        </Button>
      )}

      <span className="mx-0.5 h-5 w-px bg-hairline" aria-hidden="true" />

      {/* Print / PDF */}
      <Button type="button" size="sm" variant="ghost" onClick={onPrint} className="h-8">
        <Printer className="size-4 stroke-[1.75]" /> Print / PDF
      </Button>

      {/* Optional Download */}
      {onDownload && (
        <Button type="button" size="sm" variant="ghost" onClick={onDownload} className="h-8">
          <Download className="size-4 stroke-[1.75]" /> Download
        </Button>
      )}
    </div>
  )
}
