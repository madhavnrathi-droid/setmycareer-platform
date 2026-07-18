import { useEffect, useMemo, useRef } from "react"
import { useEditor, EditorContent } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import { cn } from "@/lib/utils"

/**
 * EditableProse — an inline-editable prose block for the report document.
 *
 * Approach: there is NO heavy editor in read mode. When `editable` is false we
 * render the text as clean reading paragraphs (splitting on blank lines), so the
 * report stays light and print-friendly. Only when `editable` flips to true do
 * we mount a minimal Tiptap editor (StarterKit), seeded with `value` converted
 * from plain text to simple paragraph HTML, styled to match the report body.
 * Edits are surfaced through `onChange` as PLAIN TEXT (blank-line-separated
 * paragraphs) on a short debounce, so the same string round-trips back as the
 * next `value`. SSR-safe via `immediatelyRender: false`.
 */
export function EditableProse({
  value,
  editable,
  onChange,
  className,
}: {
  value: string
  editable: boolean
  onChange?: (text: string) => void
  className?: string
}) {
  if (!editable) return <ReadingProse value={value} className={className} />
  return <ProseEditor value={value} onChange={onChange} className={className} />
}

/* ── read mode: plain, print-friendly paragraphs (no editor) ─────────────── */

function splitParagraphs(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/) // blank line ⇒ new paragraph
    .map((p) => p.trim())
    .filter(Boolean)
}

function ReadingProse({ value, className }: { value: string; className?: string }) {
  const paragraphs = useMemo(() => splitParagraphs(value), [value])
  return (
    <div className={cn(PROSE_CLASS, className)}>
      {paragraphs.length > 0 ? (
        paragraphs.map((p, i) => (
          // Render single newlines inside a paragraph as soft breaks.
          <p key={i}>
            {p.split("\n").map((line, j, arr) => (
              <span key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </span>
            ))}
          </p>
        ))
      ) : (
        <p className="text-muted-foreground italic">Nothing here yet.</p>
      )}
    </div>
  )
}

/* ── edit mode: minimal Tiptap editor ────────────────────────────────────── */

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

/** Plain text → simple paragraph HTML (blank lines split, single newlines → <br>). */
function textToHtml(text: string): string {
  const paras = splitParagraphs(text)
  if (paras.length === 0) return "<p></p>"
  return paras.map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("")
}

/** Editor doc → plain text (paragraphs separated by a blank line). */
function htmlToText(getText: (sep: string) => string): string {
  // Tiptap's getText with a block separator gives us paragraph breaks directly.
  return getText("\n\n").replace(/\n{3,}/g, "\n\n").trim()
}

function ProseEditor({
  value,
  onChange,
  className,
}: {
  value: string
  onChange?: (text: string) => void
  className?: string
}) {
  // Keep the latest onChange without re-creating the editor on every render.
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  // Remember what we last emitted so an external `value` sync doesn't clobber
  // in-flight typing (and so we can avoid redundant setContent calls).
  const lastEmitted = useRef<string>(value)

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe — never render synchronously on the server
    extensions: [
      StarterKit.configure({
        // Keep it lightweight: drop block furniture the report body doesn't use.
        heading: false,
        codeBlock: false,
        horizontalRule: false,
        blockquote: false,
      }),
    ],
    content: textToHtml(value),
    editorProps: {
      attributes: {
        class: cn(PROSE_CLASS, "min-h-[1.5em] outline-none", className),
      },
    },
    onUpdate: ({ editor }) => {
      const text = htmlToText((sep) => editor.getText({ blockSeparator: sep }))
      lastEmitted.current = text
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onChangeRef.current?.(text), 250)
    },
  })

  // If the seed `value` changes externally (e.g. a reset/revert) and differs
  // from what we last produced, re-seed the editor without losing the cursor
  // on ordinary keystrokes.
  useEffect(() => {
    if (!editor) return
    if (value !== lastEmitted.current) {
      lastEmitted.current = value
      editor.commands.setContent(textToHtml(value), { emitUpdate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor])

  // Flush any pending debounced change on unmount so edits aren't dropped.
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
        if (editor) {
          const text = htmlToText((sep) => editor.getText({ blockSeparator: sep }))
          onChangeRef.current?.(text)
        }
      }
    }
  }, [editor])

  return (
    <div
      className={cn(
        "-mx-2 rounded-lg px-2 py-1 ring-1 ring-transparent transition-shadow",
        "focus-within:bg-accent/30 focus-within:ring-ring/40 hover:bg-secondary/40",
      )}
    >
      <EditorContent editor={editor} />
    </div>
  )
}

/* Shared body type — matches the report's reading prose (serif-free, airy). */
const PROSE_CLASS =
  "max-w-none space-y-3 text-[14px] leading-relaxed text-foreground/90 [&_p]:m-0 [&_strong]:font-semibold [&_em]:italic [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5"
