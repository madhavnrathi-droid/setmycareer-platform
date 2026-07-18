import { type ReactNode } from "react"

/* A small, dependency-free Markdown renderer scoped to the legal documents.
   Supports: ## / ### / #### headings, paragraphs, - / * / 1. lists, | tables |,
   > blockquotes, --- rules, and inline **bold**, *italic*, `code`, [text](url).
   Legal copy is authored in Markdown (src/content/legal/*.md) and rendered here so
   the same source can also be exported to PDF later. */

function inline(text: string, key: number): ReactNode {
  // tokenise inline markdown into React nodes
  const nodes: ReactNode[] = []
  const re = /(\[CONFIRM[^\]]*\]|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1].startsWith("[CONFIRM")) nodes.push(<mark key={i++} className="lg-confirm" title="Fill this in before publishing to customers">{m[1]}</mark>)
    else if (m[2] !== undefined) nodes.push(<strong key={i++}>{m[2]}</strong>)
    else if (m[3] !== undefined) nodes.push(<em key={i++}>{m[3]}</em>)
    else if (m[4] !== undefined) nodes.push(<code key={i++}>{m[4]}</code>)
    else if (m[5] !== undefined) {
      const href = m[6]
      const ext = /^https?:\/\//.test(href)
      nodes.push(
        <a key={i++} href={href} className="lg-a" {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {m[5]}
        </a>,
      )
    }
    last = re.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return <span key={key}>{nodes}</span>
}

function Table({ rows }: { rows: string[] }) {
  const cells = (line: string) =>
    line.replace(/^\||\|$/g, "").split("|").map((c) => c.trim())
  const header = cells(rows[0])
  const body = rows.slice(2).map(cells) // rows[1] is the |---|---| separator
  return (
    <div className="lg-tablewrap">
      <table className="lg-table">
        <thead>
          <tr>{header.map((h, i) => <th key={i}>{inline(h, i)}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r, ri) => (
            <tr key={ri}>{r.map((c, ci) => <td key={ci}>{inline(c, ci)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Turn a heading string into a stable id for TOC anchors. */
export function slugifyHeading(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60)
}

export function LegalMarkdown({ body }: { body: string }) {
  const blocks = body.trim().split(/\n\n+/)
  return (
    <div className="legal-doc">
      {blocks.map((raw, i) => {
        const b = raw.trim()
        if (!b) return null
        if (b === "---" || /^[-*_]{3,}$/.test(b)) return <hr key={i} />
        if (b.startsWith("#### ")) return <h4 key={i} id={slugifyHeading(b.slice(5))}>{inline(b.slice(5), i)}</h4>
        if (b.startsWith("### ")) return <h3 key={i} id={slugifyHeading(b.slice(4))}>{inline(b.slice(4), i)}</h3>
        if (b.startsWith("## ")) return <h2 key={i} id={slugifyHeading(b.slice(3))}>{inline(b.slice(3), i)}</h2>
        if (b.startsWith("# ")) return <h2 key={i} id={slugifyHeading(b.slice(2))}>{inline(b.slice(2), i)}</h2>
        const lines = b.split("\n")
        // table: a header row + a |---| separator
        if (lines.length >= 2 && lines[0].includes("|") && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(lines[1])) {
          return <Table key={i} rows={lines} />
        }
        // blockquote
        if (lines.every((l) => l.startsWith(">"))) {
          return <blockquote key={i}>{inline(lines.map((l) => l.replace(/^>\s?/, "")).join(" "), i)}</blockquote>
        }
        // ordered list
        if (lines.every((l) => /^\d+\.\s/.test(l))) {
          return <ol key={i}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^\d+\.\s/, ""), li)}</li>)}</ol>
        }
        // unordered list
        if (lines.every((l) => /^[-*]\s/.test(l))) {
          return <ul key={i}>{lines.map((l, li) => <li key={li}>{inline(l.replace(/^[-*]\s/, ""), li)}</li>)}</ul>
        }
        // paragraph (soft-wrap joined)
        return <p key={i}>{inline(lines.join(" "), i)}</p>
      })}
    </div>
  )
}

/** Extract ## / ### headings for an on-page table of contents. */
export function headings(body: string): { level: number; text: string; id: string }[] {
  return body
    .split("\n")
    .filter((l) => /^#{2,3}\s/.test(l))
    .map((l) => {
      const level = l.startsWith("### ") ? 3 : 2
      const text = l.replace(/^#{2,3}\s/, "").trim()
      return { level, text, id: slugifyHeading(text) }
    })
}
