import { createContext, useCallback, useContext, useEffect, useState } from "react"

/* Appearance — font-pairing presets, applied app-wide at runtime by overriding
   the --font-*-stack CSS vars (which index.css's @theme references). Persisted to
   localStorage; thin/regular weights throughout. */

export type FontPreset = {
  id: string
  name: string
  note: string
  /** sample weights look thin/aesthetic */
  display: string
  sans: string
  mono: string
}

export const FONT_PRESETS: FontPreset[] = [
  {
    id: "setmycareer", name: "Setmycareer", note: "Montserrat · Inter — the default",
    display: '"Montserrat", "Inter", sans-serif',
    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
  {
    id: "lexend-karla", name: "Lexend + Karla", note: "Calm + warm — recommended",
    display: '"Lexend", sans-serif',
    sans: '"Karla", ui-sans-serif, system-ui, sans-serif',
    mono: '"Space Mono", ui-monospace, monospace',
  },
  {
    id: "redhat-inter", name: "Red Hat Display + Inter", note: "Premium, mature",
    display: '"Red Hat Display", sans-serif',
    sans: '"Inter", ui-sans-serif, system-ui, sans-serif',
    mono: '"Space Mono", ui-monospace, monospace',
  },
  {
    id: "nixie-karla", name: "Nixie One + Karla", note: "Architectural accents",
    display: '"Nixie One", "Karla", serif',
    sans: '"Karla", ui-sans-serif, system-ui, sans-serif',
    mono: '"Space Mono", ui-monospace, monospace',
  },
  {
    id: "lexend-mono", name: "Lexend + Space Mono", note: "Intelligence-platform",
    display: '"Lexend", sans-serif',
    sans: '"Lexend", ui-sans-serif, system-ui, sans-serif',
    mono: '"Space Mono", ui-monospace, monospace',
  },
  {
    id: "urbanist-karla", name: "Urbanist + Karla", note: "Modern, approachable",
    display: '"Urbanist", sans-serif',
    sans: '"Karla", ui-sans-serif, system-ui, sans-serif',
    mono: '"IBM Plex Mono", ui-monospace, monospace',
  },
]

const KEY = "smc.appearance.font"
const COMPASS_KEY = "smc.appearance.compass"
// Per-browser today (localStorage). When real auth lands, namespace this key
// by user id (e.g. `smc.appearance.calendarView:${userId}`) so it's per-account.
const CALENDAR_VIEW_KEY = "smc.appearance.calendarView"

function applyPreset(p: FontPreset) {
  if (typeof document === "undefined") return
  const r = document.documentElement.style
  r.setProperty("--font-display-stack", p.display)
  r.setProperty("--font-sans-stack", p.sans)
  r.setProperty("--font-mono-stack", p.mono)
}

type Ctx = {
  presetId: string
  setPreset: (id: string) => void
  presets: FontPreset[]
  compassVisible: boolean
  setCompassVisible: (v: boolean) => void
  calendarView: string
  setCalendarView: (v: string) => void
}
const AppearanceContext = createContext<Ctx | null>(null)

export function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [presetId, setPresetId] = useState<string>(() => {
    try { return localStorage.getItem(KEY) || "setmycareer" } catch { return "setmycareer" }
  })
  const [compassVisible, setCompassVisibleState] = useState<boolean>(() => {
    try { return localStorage.getItem(COMPASS_KEY) !== "0" } catch { return true }
  })
  const [calendarView, setCalendarViewState] = useState<string>(() => {
    try { return localStorage.getItem(CALENDAR_VIEW_KEY) || "month" } catch { return "month" }
  })

  useEffect(() => {
    applyPreset(FONT_PRESETS.find((x) => x.id === presetId) ?? FONT_PRESETS[0])
  }, [presetId])

  const setPreset = useCallback((id: string) => {
    setPresetId(id)
    try { localStorage.setItem(KEY, id) } catch { /* ignore */ }
  }, [])

  const setCompassVisible = useCallback((v: boolean) => {
    setCompassVisibleState(v)
    try { localStorage.setItem(COMPASS_KEY, v ? "1" : "0") } catch { /* ignore */ }
  }, [])

  const setCalendarView = useCallback((v: string) => {
    setCalendarViewState(v)
    try { localStorage.setItem(CALENDAR_VIEW_KEY, v) } catch { /* ignore */ }
  }, [])

  return (
    <AppearanceContext.Provider value={{ presetId, setPreset, presets: FONT_PRESETS, compassVisible, setCompassVisible, calendarView, setCalendarView }}>
      {children}
    </AppearanceContext.Provider>
  )
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error("useAppearance must be used within AppearanceProvider")
  return ctx
}
