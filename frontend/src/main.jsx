import React from 'react'
import { createRoot } from 'react-dom/client'
import { MotionGlobalConfig } from 'motion/react'
import App from './App'
import './styles.css'

// Test hook: ?e2e=1 makes animations resolve instantly (headless browsers
// without requestAnimationFrame would otherwise freeze transitions).
if (new URLSearchParams(location.search).has('e2e')) {
  MotionGlobalConfig.skipAnimations = true
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
