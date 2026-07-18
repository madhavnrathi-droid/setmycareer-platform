import { useEffect, useMemo, useRef, useState } from "react"
import { PlayFilledAlt } from "@carbon/icons-react"

/* A dynamic BENTO grid for 16:9 video tiles — the antidote to the boring rail.
   Tiles fill fixed grid cells (object-cover), so a repeating pattern of varied
   spans tiles densely across multiple rows. Titles overlay each tile on a
   bottom scrim. Optionally the bento "rotates": every few seconds one tile
   cross-fades to a video not currently on screen — off under reduced-motion,
   when the tab is hidden, and while the pointer is inside the grid. Transforms/
   opacity only. Layout is static (safe in the preview harness); only the fade +
   hover-scale are motion. */

export type BentoVid = { id: string; title: string; thumb: string; thumbHi: string; url: string }

const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches

// span pattern by slot — fixed so the mosaic holds still while content rotates.
// Mobile: a 2-col bento. sm: 4-col. lg: 6-col. grid-auto-flow:dense packs holes.
const SIZES = [
  "col-span-2 row-span-4 sm:col-span-2 sm:row-span-3 lg:col-span-3 lg:row-span-4", // feature
  "col-span-1 row-span-4 sm:col-span-2 sm:row-span-3 lg:col-span-3 lg:row-span-4", // tall/half
  "col-span-1 row-span-3 sm:col-span-1 sm:row-span-2 lg:col-span-2 lg:row-span-3",
  "col-span-2 row-span-3 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-3",
  "col-span-1 row-span-3 sm:col-span-1 sm:row-span-2 lg:col-span-2 lg:row-span-3",
  "col-span-1 row-span-3 sm:col-span-2 sm:row-span-2 lg:col-span-3 lg:row-span-3", // wide
  "col-span-1 row-span-3 sm:col-span-1 sm:row-span-2 lg:col-span-3 lg:row-span-3",
  "col-span-2 row-span-3 sm:col-span-1 sm:row-span-2 lg:col-span-2 lg:row-span-3",
  "col-span-1 row-span-3 sm:col-span-2 sm:row-span-2 lg:col-span-2 lg:row-span-3",
  "col-span-1 row-span-3 sm:col-span-1 sm:row-span-2 lg:col-span-2 lg:row-span-3",
  "col-span-2 row-span-3 sm:col-span-2 sm:row-span-2 lg:col-span-4 lg:row-span-3", // wide
]

/** Keep `count` slots filled from `all`; periodically swap one slot to an
 *  off-screen video (returns the ordered indices to render). The incoming
 *  thumbnail is PRELOADED before the swap commits, so the remounted <img>
 *  paints from cache — no black-tile flash mid-rotation. */
function useRotation(all: BentoVid[], count: number, enabled: boolean): number[] {
  const [order, setOrder] = useState<number[]>([])
  const orderRef = useRef<number[]>([])
  useEffect(() => { orderRef.current = order }, [order])
  useEffect(() => {
    setOrder(Array.from({ length: Math.min(count, all.length) }, (_, i) => i))
  }, [all.length, count])
  useEffect(() => {
    if (!enabled || all.length <= count) return
    let hidden = typeof document !== "undefined" && document.visibilityState === "hidden"
    const onVis = () => { hidden = document.visibilityState === "hidden" }
    document.addEventListener("visibilitychange", onVis)
    let cancelled = false
    const id = window.setInterval(() => {
      if (hidden || cancelled) return
      const prev = orderRef.current
      if (!prev.length) return
      const shown = new Set(prev)
      const pool = all.map((_, i) => i).filter((i) => !shown.has(i))
      if (!pool.length) return
      const slot = Math.floor(Math.random() * prev.length)
      const pick = pool[Math.floor(Math.random() * pool.length)]
      // warm the cache first; commit on load (or after a short safety window)
      let done = false
      const commit = () => {
        if (done || cancelled) return
        done = true
        setOrder((cur) => {
          if (cur.includes(pick) || slot >= cur.length) return cur
          const next = cur.slice(); next[slot] = pick; return next
        })
      }
      const img = new Image()
      img.onload = commit
      img.onerror = commit
      img.src = all[pick].thumbHi
      window.setTimeout(commit, 2500)
    }, 4600)
    return () => { cancelled = true; window.clearInterval(id); document.removeEventListener("visibilitychange", onVis) }
  }, [all, count, enabled])
  return order
}

function Tile({ v, size, meta }: { v: BentoVid; size: string; meta?: string }) {
  // loaded-state lives in React (not classList — React re-renders reset the
  // managed className and would wipe a hand-added class). Keyed to the video id
  // so a rotation swap resets to opacity-0 and fades in when the new image lands.
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const loaded = loadedId === v.id
  return (
    <a href={v.url} target="_blank" rel="noopener noreferrer" data-vid className={`group relative overflow-hidden rounded-[10px] bg-ink ${size}`}>
      <img
        key={v.id}
        ref={(el) => { if (el && el.complete && el.naturalWidth > 0) setLoadedId(v.id) }}
        onLoad={() => setLoadedId(v.id)}
        src={v.thumbHi} onError={(e) => { const t = e.currentTarget; if (t.src !== v.thumb) t.src = v.thumb }}
        alt={v.title} loading="lazy"
        className={`bento-img absolute inset-0 size-full object-cover group-hover:scale-[1.04] ${loaded ? "is-loaded" : ""}`}
      />
      <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/15 to-ink/0" />
      <span aria-hidden className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-ink/55 text-paper opacity-0 backdrop-blur-sm transition-opacity duration-300 group-hover:opacity-100"><PlayFilledAlt size={12} /></span>
      <span className="absolute inset-x-0 bottom-0 p-3 md:p-3.5">
        {meta && <span className="mono block text-[9.5px] uppercase tracking-[0.1em] text-paper/60">{meta}</span>}
        <span className="ed-title mt-1 line-clamp-2 text-[13.5px] leading-snug text-paper">{v.title}</span>
      </span>
    </a>
  )
}

export function VideoBento({ videos, max = 11, meta }: { videos: BentoVid[]; max?: number; meta?: (v: BentoVid) => string | undefined }) {
  const [reduce] = useState(reduced)
  const [hover, setHover] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const count = Math.min(videos.length, max)
  const order = useRotation(videos, count, !reduce && !hover)
  const render = order.length ? order : Array.from({ length: count }, (_, i) => i)
  const rows = useMemo(() => render, [render])

  if (!videos.length) return null
  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6 [grid-auto-flow:dense] auto-rows-[58px] sm:auto-rows-[70px] md:auto-rows-[78px]"
    >
      {rows.map((vi, slot) => {
        const v = videos[vi]
        if (!v) return null
        return <Tile key={slot} v={v} size={SIZES[slot % SIZES.length]} meta={meta?.(v)} />
      })}
    </div>
  )
}
