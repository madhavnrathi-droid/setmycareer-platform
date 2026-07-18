import { motion, AnimatePresence } from 'motion/react'
import { MicIcon, LayersIcon, PulseIcon, NotebookIcon, UserIcon } from './Icons'
import Logo from '../brand/Logo'

const TABS = [
  { id: 'home', icon: MicIcon, label: 'Capture' },
  { id: 'sessions', icon: LayersIcon, label: 'Sessions' },
  { id: 'dashboard', icon: PulseIcon, label: 'Blueprint' },
  { id: 'journal', icon: NotebookIcon, label: 'Notes' },
  { id: 'profile', icon: UserIcon, label: 'You' },
]

// Responsive nav: a floating pill on phones (the active tab expands to reveal
// its label, the dark bubble morphs between tabs via layoutId) and a fixed left
// sidebar on desktop (logo + vertical items) — CSS swaps which one is shown.
export default function Nav({ tab, onTab, hidden = false }) {
  return (
    <>
      {/* desktop sidebar */}
      <aside className="side">
        <div className="side-brand"><Logo variant="full" size={19} /></div>
        <nav className="side-nav">
          {TABS.map(({ id, icon: Icon, label }) => (
            <button key={id} className={'side-item' + (tab === id ? ' active' : '')}
              aria-current={tab === id ? 'page' : undefined} onClick={() => onTab(id)}>
              <span className="si-ic"><Icon size={20} /></span>{label}
            </button>
          ))}
        </nav>
      </aside>

      {/* mobile floating pill */}
      <motion.nav className="nav" initial={{ y: 80, opacity: 0 }}
        animate={{ y: hidden ? 110 : 0, opacity: hidden ? 0 : 1 }}
        style={{ pointerEvents: hidden ? 'none' : 'auto' }}
        transition={{ type: 'spring', stiffness: 360, damping: 32, delay: 0.05 }}>
        {TABS.map(({ id, icon: Icon, label }) => {
          const active = tab === id
          return (
            <motion.button key={id} layout
              className={'nav-item' + (active ? ' active' : '')}
              style={{ width: active ? 'auto' : 46, paddingLeft: active ? 14 : 0, paddingRight: active ? 14 : 0 }}
              transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              aria-label={label} onClick={() => onTab(id)}
              whileTap={{ scale: 0.96 }}>
              {active && (
                <motion.span layoutId="nav-bubble" className="nav-bubble"
                  transition={{ type: 'spring', stiffness: 520, damping: 38 }} />
              )}
              <span className="nav-content">
                <Icon size={18} />
                <AnimatePresence>
                  {active && (
                    <motion.span className="nav-label"
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -4 }}
                      transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}>
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </motion.button>
          )
        })}
      </motion.nav>
    </>
  )
}
