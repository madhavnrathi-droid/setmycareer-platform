import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { LockIcon, BackIcon } from '../components/Icons'
import { uid, saveProfile, saveCareerProfile } from '../lib/store'
import { FREQ_OPTS } from '../lib/science'
import { gsap, isStatic } from '../lib/motion'
import { LogoMark } from '../brand/Logo'

const smooth = [0.2, 0.8, 0.2, 1]

// Cinematic first impression — the compass logomark assembles stroke-by-stroke,
// the Cambo wordmark rises from a mask. The action buttons animate TRANSFORM-ONLY
// (opacity stays 1) so navigation is never hidden, even mid-animation or if the
// motion subsystem stalls. Honors reduced-motion / e2e via isStatic().
function Intro({ onBegin, onSkip }) {
  const root = useRef(null)
  useEffect(() => {
    const el = root.current
    const q = gsap.utils.selector(el)
    if (isStatic()) { gsap.set(q('.intro-mark path'), { scale: 1, opacity: 1 }); return }
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      tl.from(q('.intro-mark'), { scale: 0.5, opacity: 0, rotate: -25, duration: 0.9, ease: 'elastic.out(1, 0.7)' })
        .from(q('.intro-mark path'), { scale: 0, transformOrigin: '50% 50%', stagger: 0.07, duration: 0.5, ease: 'back.out(2.2)' }, '-=0.7')
        .from(q('.intro-title'), { yPercent: 120, duration: 0.7 }, '-=0.3')
        .from(q('[data-rise]'), { y: 18, duration: 0.55, stagger: 0.08 }, '-=0.3') // transform-only → always visible
    }, el)
    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="col" style={{ alignItems: 'center', textAlign: 'center', gap: 16, width: '100%', maxWidth: 360 }}>
      <LogoMark size={88} className="intro-mark" style={{ color: 'var(--navy)' }} />
      <div style={{ overflow: 'hidden', padding: '0 4px' }}>
        <h1 className="intro-title serif" style={{ fontSize: 'clamp(40px,12vw,52px)', margin: 0, lineHeight: 1 }}>Setmycareer</h1>
      </div>
      <p className="brand-tag" data-rise style={{ fontSize: 13 }}>Find Your True North</p>
      <p className="muted" data-rise style={{ margin: '4px 0 0', fontSize: 16, lineHeight: 1.6 }}>
        Your meetings, conversations and reflections — recorded, understood, and turned into a living career Blueprint.
      </p>
      <div className="chip on" data-rise><LockIcon size={13} /> Your data, your control.</div>
      <div className="col" data-rise style={{ gap: 10, width: '100%', marginTop: 14 }}>
        <button className="btn primary block" onClick={onBegin}>Get started</button>
        <button className="btn ghost block" onClick={onSkip}>Skip for now</button>
      </div>
    </div>
  )
}

const slide = {
  initial: { opacity: 0, x: 32 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -24 },
  transition: { duration: 0.28, ease: smooth },
}

const Step = ({ children, k }) => (
  <motion.div key={k} {...slide} className="col" style={{ gap: 16, width: '100%', maxWidth: 360 }}>{children}</motion.div>
)

function Dots({ total, at }) {
  return (
    <div className="row" style={{ gap: 6, justifyContent: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <motion.span key={i} animate={{ width: i === at ? 22 : 6, opacity: i <= at ? 1 : 0.35 }}
          transition={{ duration: 0.25, ease: smooth }}
          style={{ height: 6, borderRadius: 99, background: 'var(--navy)', display: 'block' }} />
      ))}
    </div>
  )
}

const GOALS = ['Get promoted', 'Switch fields', 'Land a new role', 'Find direction', 'Grow my skills', 'Start something of my own', 'Better work–life balance']
const BASELINE = ['I’ve felt motivated and engaged at work', 'I’ve felt stretched too thin or stressed']

export default function Onboarding({ onDone }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [current, setCurrent] = useState('')
  const [target, setTarget] = useState('')
  const [goals, setGoals] = useState([])
  const [base, setBase] = useState([null, null])

  const toggle = (list, setList, v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

  async function commit(extra = {}) {
    const profile = {
      id: uid(), name: name.trim(), role: 'me', createdAt: Date.now(),
      intake: { wellbeing: base, at: Date.now() }, ...extra,
    }
    await saveProfile(profile)
    await saveCareerProfile({ current: current.trim(), target: target.trim(), goal: goals.join(', '), skills: [], riasec: [], momentum: null })
    onDone(profile)
  }
  const finish = () => commit()
  const skip = () => commit({ skipped: true })

  const TOTAL = 4
  return (
    <div className="screen onboard" style={{ position: 'relative' }}>
      {/* persistent onboarding nav — Back (left) · progress (center) · Skip (right) */}
      <div className="row between" style={{ position: 'absolute', top: 'max(20px, env(safe-area-inset-top))', left: 0, right: 0, padding: '0 18px', alignItems: 'center', zIndex: 2 }}>
        <div style={{ width: 72, display: 'flex' }}>
          {step > 0 && (
            <button className="btn ghost" style={{ minHeight: 36, padding: '6px 8px', gap: 4 }} onClick={() => setStep(step - 1)}>
              <BackIcon size={16} /> Back
            </button>
          )}
        </div>
        <Dots total={TOTAL} at={step} />
        <div style={{ width: 72, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn ghost" style={{ minHeight: 36, padding: '6px 8px', color: 'var(--ink-3)' }} onClick={skip}>Skip</button>
        </div>
      </div>

      <div className="onboard-center">
        <AnimatePresence mode="wait">

          {step === 0 && <Intro key="0" onBegin={() => setStep(1)} onSkip={skip} />}

          {step === 1 && (
            <Step k="1">
              <h2 className="display" style={{ textAlign: 'center' }}>What should we call you?</h2>
              <input autoFocus className="field" placeholder="Your first name"
                value={name} onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setStep(2)} />
              <p className="micro" style={{ textAlign: 'center', margin: 0 }}>
                You can change this anytime.
              </p>
              <button className="btn primary block" onClick={() => setStep(2)}>Continue</button>
            </Step>
          )}

          {step === 2 && (
            <Step k="2">
              <h2 className="display" style={{ textAlign: 'center' }}>Where are you headed?</h2>
              <p className="micro" style={{ textAlign: 'center', margin: '0 0 2px' }}>This grounds your Blueprint from day one. You can change it anytime.</p>
              <input className="field" placeholder="Where you are now — e.g. Marketing Associate"
                value={current} onChange={(e) => setCurrent(e.target.value)} />
              <input className="field" placeholder="Where you want to go — e.g. Product Manager"
                value={target} onChange={(e) => setTarget(e.target.value)} />
              <div>
                <p className="label" style={{ margin: '4px 2px 8px' }}>What matters most right now?</p>
                <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
                  {GOALS.map((g) => (
                    <button key={g} className={'opt' + (goals.includes(g) ? ' sel' : '')} onClick={() => toggle(goals, setGoals, g)}>{g}</button>
                  ))}
                </div>
              </div>
              <button className="btn primary block" onClick={() => setStep(3)}>Continue</button>
            </Step>
          )}

          {step === 3 && (
            <Step k="3">
              <h2 className="display" style={{ textAlign: 'center' }}>A quick baseline</h2>
              <p className="micro" style={{ textAlign: 'center', margin: 0 }}>
                Career growth and wellbeing move together — a light read helps Setmycareer notice when one is pulling on the other.
              </p>
              {BASELINE.map((qq, qi) => (
                <div key={qi} className="card" style={{ padding: 16 }}>
                  <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 600 }}>{qq}</p>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 7 }}>
                    {FREQ_OPTS.map((o, oi) => (
                      <button key={oi} className={'opt' + (base[qi] === oi ? ' sel' : '')}
                        onClick={() => { const v = [...base]; v[qi] = oi; setBase(v) }}>{o}</button>
                    ))}
                  </div>
                </div>
              ))}
              <button className="btn primary block" onClick={finish}>Start using Setmycareer</button>
              <p className="micro" style={{ textAlign: 'center', margin: 0 }}>
                <LockIcon size={11} style={{ verticalAlign: '-1px' }} /> Edit or erase any of this anytime.
              </p>
            </Step>
          )}

        </AnimatePresence>
      </div>
    </div>
  )
}
