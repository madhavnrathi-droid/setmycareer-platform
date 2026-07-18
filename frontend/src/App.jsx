import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import Nav from './components/Nav'
import RecordingBar from './components/RecordingBar'
import Onboarding from './screens/Onboarding'
import Home from './screens/Home'
import Sessions from './screens/Sessions'
import SessionDetail from './screens/SessionDetail'
import Dashboard from './screens/Dashboard'
import MetricDetail from './screens/MetricDetail'
import Journal from './screens/Journal'
import Profile from './screens/Profile'
import Chat from './screens/Chat'
import { getProfile, getSessions, backfillIndexHistory } from './lib/store'
import { useRecorder } from './lib/recorder'
import SettingsSheet from './components/SettingsSheet'

export default function App() {
  const [profile, setProfile] = useState(undefined) // undefined = loading
  const [tab, setTab] = useState('home')
  const [sessions, setSessions] = useState([])
  const [openId, setOpenId] = useState(null)
  const [openMetric, setOpenMetric] = useState(null)
  const [homeMasked, setHomeMasked] = useState(false) // start sheet open → hide nav
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const rec = useRecorder()

  // One unified, career-first system — no personal/professional split, one user.
  const layer = 'both'

  const refresh = () => getSessions().then(setSessions)

  useEffect(() => {
    getProfile().then(setProfile)
    getSessions().then((s) => { setSessions(s); backfillIndexHistory(s) })
  }, [])

  // A finished recording (from Home or the top bar) lands on its detail view.
  async function handleSessionSaved(session) {
    await refresh()
    setTab('sessions')
    setOpenId(session.id)
  }

  if (profile === undefined) return null
  if (profile === null) {
    return <Onboarding onDone={setProfile} />
  }

  const open = sessions.find((s) => s.id === openId)
  // The top bar appears whenever a recording runs and Home isn't visible.
  const showBar = rec.active && (tab !== 'home' || openId)
  // Top-right profile/settings control — hidden over overlays and the start sheet.
  const showTopRight = profile && !homeMasked && !openMetric && !(openId && open) && !settingsOpen && !showBar

  return (
    <>
      <AnimatePresence>
        {showBar && (
          <RecordingBar key="recbar"
            onGoHome={() => { setOpenId(null); setTab('home') }}
            onSessionSaved={handleSessionSaved} />
        )}
      </AnimatePresence>

      <div className="app-shell">
      {openId && open ? (
        <div key={'detail' + openId} className={'pageIn ' + (showBar ? 'has-recbar' : '')}>
          <SessionDetail session={open} profile={profile}
            onBack={() => setOpenId(null)}
            onUpdated={() => refresh()}
            onDeleted={() => { setOpenId(null); refresh() }} />
        </div>
      ) : (
        <div key={tab} className={'pageIn ' + (showBar ? 'has-recbar' : '')}>
          {tab === 'home' && (
            <Home profile={profile} onSessionSaved={handleSessionSaved} onMask={setHomeMasked} />
          )}
          {tab === 'sessions' && (
            <Sessions sessions={sessions} profile={profile} onOpen={setOpenId} onRefresh={refresh} />
          )}
          {tab === 'dashboard' && (
            <Dashboard sessions={sessions} profile={profile} layer={layer} onOpen={(id) => setOpenId(id)}
              onOpenMetric={setOpenMetric} onRefresh={refresh} onOpenChat={() => setChatOpen(true)} />
          )}
          {tab === 'journal' && (
            <Journal profile={profile} />
          )}
          {tab === 'profile' && (
            <Profile profile={profile} sessions={sessions} onOpenChat={() => setChatOpen(true)}
              onWiped={() => { setProfile(null); setSessions([]); setTab('home') }} />
          )}
        </div>
      )}
      </div>

      {/* Metric deep-dive overlays the still-mounted dashboard so its score morphs
          up from the tapped tile (shared layoutId) and back down on close. */}
      <AnimatePresence>
        {openMetric && (
          <motion.div key={'metric' + openMetric} className={'metric-overlay ' + (showBar ? 'has-recbar' : '')}
            initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
            <MetricDetail metricKey={openMetric} sessions={sessions} profile={profile}
              onBack={() => setOpenMetric(null)} onUpdated={() => refresh()} />
          </motion.div>
        )}
      </AnimatePresence>

      {showTopRight && (
        <button className="top-right" aria-label="Profile and settings" onClick={() => setSettingsOpen(true)}>
          {(profile.name || '?').trim().charAt(0).toUpperCase()}
        </button>
      )}

      <AnimatePresence>
        {settingsOpen && (
          <SettingsSheet profile={profile}
            onClose={() => setSettingsOpen(false)}
            onOpenProfile={() => { setSettingsOpen(false); setOpenId(null); setOpenMetric(null); setTab('profile') }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {chatOpen && <Chat profile={profile} onClose={() => setChatOpen(false)} />}
      </AnimatePresence>

      <Nav tab={tab} hidden={homeMasked}
        onTab={(t) => { setOpenId(null); setOpenMetric(null); setHomeMasked(false); setTab(t) }} />
    </>
  )
}
