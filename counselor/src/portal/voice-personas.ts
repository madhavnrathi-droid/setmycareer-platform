// Custom AI-counsellor voice — the member picks WHO they talk to (a persona that
// shapes the AI's tone) and the VOICE it speaks in (any voice the device exposes
// through the Web Speech API). Both choices persist per browser. This is a real,
// device-native voice picker: no fabricated "voices", just what the OS/browser
// actually offers, so a preview speaks in exactly the voice they'll hear.

import { useEffect, useState } from "react"
import { useSyncExternalStore } from "react"

export interface CounsellorStyle {
  id: string
  /** the persona's name (the AI introduces itself as this) */
  name: string
  tagline: string
  /** a short tone instruction fed to the AI persona (shapes wording, not facts) */
  tone: string
  /** TTS prosody for the spoken reply */
  rate: number
  pitch: number
  /** auto-pick hints: preferred voice gender + language prefixes (best-effort) */
  prefer: { gender?: "female" | "male"; langs: string[] }
  /** a one-line accent/avatar tint */
  tint: string
}

export const COUNSELLOR_STYLES: CounsellorStyle[] = [
  {
    id: "aria", name: "Aria", tagline: "Warm & encouraging",
    tone: "Warm, encouraging and reassuring — affirm their effort, keep sentences gentle and human, and make them feel understood before guiding.",
    rate: 1.0, pitch: 1.06, prefer: { gender: "female", langs: ["en-IN", "en-GB", "en-AU", "en"] },
    tint: "from-mind-500 to-brand-600",
  },
  {
    id: "ravi", name: "Ravi", tagline: "Direct & practical",
    tone: "Direct, practical and concise — get to the point, give clear concrete next steps, and cut the fluff while staying kind.",
    rate: 1.06, pitch: 0.96, prefer: { gender: "male", langs: ["en-IN", "en-GB", "en"] },
    tint: "from-brand-600 to-well-600",
  },
  {
    id: "maya", name: "Maya", tagline: "Calm & reflective",
    tone: "Calm, thoughtful and reflective — speak unhurried, ask one gentle question at a time, and leave space for them to think.",
    rate: 0.95, pitch: 1.0, prefer: { gender: "female", langs: ["en-GB", "en-US", "en"] },
    tint: "from-mind-600 to-mind-400",
  },
  {
    id: "kabir", name: "Kabir", tagline: "Energetic & motivating",
    tone: "Energetic, upbeat and motivating — bring momentum and confidence, celebrate progress, and leave them fired up to act.",
    rate: 1.1, pitch: 1.04, prefer: { gender: "male", langs: ["en-IN", "en-US", "en"] },
    tint: "from-warn-500 to-brand-600",
  },
]

export const styleById = (id?: string | null): CounsellorStyle =>
  COUNSELLOR_STYLES.find((s) => s.id === id) ?? COUNSELLOR_STYLES[0]

// ── available device voices (Web Speech API) ─────────────────────────────────
// getVoices() is empty on first call in some browsers and fills asynchronously,
// signalled by the `voiceschanged` event — so we subscribe to it.
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined
    if (!synth) return
    const load = () => setVoices(synth.getVoices())
    load()
    synth.addEventListener?.("voiceschanged", load)
    return () => synth.removeEventListener?.("voiceschanged", load)
  }, [])
  return voices
}

/** English voices first (the product speaks English), then the rest — so the
 *  picker leads with what actually fits, but nothing is hidden. */
export function sortVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0
    if (/^en-IN/i.test(v.lang)) s += 4
    else if (/^en/i.test(v.lang)) s += 3
    if (v.localService) s += 1
    return -s
  }
  return [...voices].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name))
}

// crude gender hint from the voice name (best-effort; many voices encode it)
const FEMALE = /(female|woman|aria|maya|samantha|tessa|fiona|moira|karen|veena|rishi.*female|google uk english female|zira|heera|neerja|salli|joanna|kendra)/i
const MALE = /(male|man|ravi|kabir|daniel|alex|fred|rishi|prabhat|google uk english male|david|mark|guy|matthew)/i
const voiceGender = (v: SpeechSynthesisVoice): "female" | "male" | undefined =>
  FEMALE.test(v.name) ? "female" : MALE.test(v.name) ? "male" : undefined

/** Auto-pick the best device voice for a persona: honour the saved choice if it's
 *  still available, else match the persona's language + gender preference, else
 *  fall back to the first English voice, else the first voice at all. */
export function pickVoice(voices: SpeechSynthesisVoice[], style: CounsellorStyle, savedURI?: string | null): SpeechSynthesisVoice | undefined {
  if (!voices.length) return undefined
  if (savedURI) { const hit = voices.find((v) => v.voiceURI === savedURI); if (hit) return hit }
  for (const lang of style.prefer.langs) {
    const inLang = voices.filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()))
    if (!inLang.length) continue
    if (style.prefer.gender) {
      const byGender = inLang.find((v) => voiceGender(v) === style.prefer.gender)
      if (byGender) return byGender
    }
    return inLang[0]
  }
  return voices.find((v) => /^en/i.test(v.lang)) ?? voices[0]
}

// ── persisted preference (style + chosen voiceURI), reactive across the screen ──
export interface VoicePref { styleId: string; voiceURI: string | null }
const KEY = "smc.voice.pref"

function load(): VoicePref {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) { const v = JSON.parse(raw) as Partial<VoicePref>; if (v && typeof v.styleId === "string") return { styleId: v.styleId, voiceURI: typeof v.voiceURI === "string" ? v.voiceURI : null } }
  } catch { /* ignore */ }
  return { styleId: COUNSELLOR_STYLES[0].id, voiceURI: null }
}

let pref: VoicePref = load()
const listeners = new Set<() => void>()
function emit() { try { localStorage.setItem(KEY, JSON.stringify(pref)) } catch { /* quota */ } listeners.forEach((l) => l()) }

export function setVoiceStyle(styleId: string): void { pref = { ...pref, styleId, voiceURI: null }; emit() } // new style → re-auto-pick the voice
export function setVoiceURI(voiceURI: string | null): void { pref = { ...pref, voiceURI }; emit() }

export function useVoicePref(): VoicePref {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => { listeners.delete(cb) } },
    () => pref,
    () => pref,
  )
}

/** Speak a short sample in the given voice/prosody — used by the picker preview. */
export function previewVoice(voice: SpeechSynthesisVoice | undefined, style: CounsellorStyle, name?: string): void {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined
  if (!synth) return
  synth.cancel()
  const u = new SpeechSynthesisUtterance(`Hi${name ? " " + name : ""}, I'm ${style.name}, your SetMyCareer counsellor. Whenever you're ready, let's talk it through.`)
  if (voice) u.voice = voice
  u.rate = style.rate; u.pitch = style.pitch
  synth.speak(u)
}
