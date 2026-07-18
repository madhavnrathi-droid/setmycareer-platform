import { motion } from 'motion/react'
import { LockIcon, ChevronIcon } from './Icons'
import Logo from '../brand/Logo'

// Top-right Settings — one unified, career-first system, so no personal/professional
// toggle and no account-type switch. Just who you are, a link to data & privacy, and
// the honest line about what Setmycareer is.
export default function SettingsSheet({ profile, onClose, onOpenProfile }) {
  return (
    <>
      <motion.div className="sheet-back" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} />
      <motion.div className="sheet" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 360, damping: 36 }}>
        <div className="sheet-grab" />
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 14px' }}>
          <Logo variant="lockup" size={20} tagline />
        </div>
        <p className="muted" style={{ fontSize: 13.5, margin: '0 0 16px', textAlign: 'center' }}>
          Hi {profile?.name || 'there'} — your whole career, in one place.
        </p>

        <button className="lrow" style={{ borderBottom: 0 }} onClick={onOpenProfile}>
          <div style={{ width: 40, height: 40, borderRadius: 999, background: 'var(--accent-soft)', color: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            <LockIcon size={18} />
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontWeight: 600, fontSize: 14.5 }}>Your data &amp; privacy</div>
            <div className="micro">Everything stays on this device. Manage or export it.</div>
          </div>
          <ChevronIcon size={16} style={{ color: 'var(--ink-3)' }} />
        </button>

        <p className="micro" style={{ textAlign: 'center', margin: '14px 0 0' }}>
          Setmycareer is decision support — signals and suggestions to help you find your true north, never a guarantee.
        </p>
      </motion.div>
    </>
  )
}
