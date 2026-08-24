// Shape for the twelve keyword-mapped pages. Copy lives in copy.ts; the keyword
// targets, titles and meta descriptions live in ../kw-map.ts, so a page's search
// target and its prose can never drift into two different files saying two things.

export interface KwSection {
  /** question-formatted — the shape featured snippets and answer engines quote */
  h2: string
  /** 40-60 words, answers the question directly and immediately */
  answer: string
  body?: string[]
}

export interface KwList { title: string; items: string[] }

export interface KwCopy {
  route: string
  /** contains the page's primary keyword, and still reads like a sentence */
  h1: string
  dek: string
  /** primary keyword lands inside the first 60 words */
  intro: string
  sections: KwSection[]
  measures?: KwList
  /** what this stage genuinely cannot settle. The honest half, and the reason
   *  these pages are worth citing rather than just ranking. */
  limits?: KwList
  faq: { q: string; a: string }[]
  cta: { label: string; to: string; note: string }
}
