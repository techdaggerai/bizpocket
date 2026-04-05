'use client'

// ═══════════════════════════════════════════════════════════
// CorridorMilestoneToast — Celebrates first paid invoice on
// a new country corridor with flag animation + confetti
// Uses existing keyframes: flagWave, pointFlyUp, confettiBurst
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import Confetti from '@/components/ui/Confetti'

interface CorridorMilestoneToastProps {
  fromFlag: string
  toFlag: string
  label: string
  onDismiss: () => void
}

export default function CorridorMilestoneToast({
  fromFlag,
  toFlag,
  label,
  onDismiss,
}: CorridorMilestoneToastProps) {
  const [phase, setPhase] = useState(0)
  // 0: slide in
  // 1: flags wave + confetti
  // 2: text appears
  // 3: points fly up

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1200),
    ]
    // Auto-dismiss after 5 seconds
    const autoDismiss = setTimeout(onDismiss, 5000)
    return () => { timers.forEach(clearTimeout); clearTimeout(autoDismiss) }
  }, [onDismiss])

  return (
    <div
      className="fixed top-4 left-1/2 z-[110] w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 cursor-pointer"
      onClick={onDismiss}
      role="alert"
    >
      {/* Confetti burst */}
      <Confetti
        active={phase >= 1}
        particleCount={28}
        colors={['#4F46E5', '#F59E0B', '#10B981', '#818CF8', '#FCD34D', '#6EE7B7']}
        duration={2500}
      />

      {/* Toast card */}
      <div
        className="rounded-[20px] bg-slate-800/95 backdrop-blur-xl p-5 transition-all duration-500"
        style={{
          boxShadow: 'var(--glass-shadow), 0 8px 32px rgba(79, 70, 229, 0.15)',
          opacity: phase >= 0 ? 1 : 0,
          transform: phase >= 0 ? 'translateY(0)' : 'translateY(-20px)',
        }}
      >
        {/* Flags row */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <span
            className="text-4xl"
            style={{
              animation: phase >= 1 ? 'flagWave 800ms ease-out' : 'none',
              display: 'inline-block',
            }}
          >
            {fromFlag}
          </span>
          <span className="text-lg text-slate-300">{'\u2194'}</span>
          <span
            className="text-4xl"
            style={{
              animation: phase >= 1 ? 'flagWave 800ms ease-out 100ms' : 'none',
              display: 'inline-block',
            }}
          >
            {toFlag}
          </span>
        </div>

        {/* Title */}
        <div
          className="text-center transition-all duration-400"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          <p
            className="text-[17px] font-bold text-white mb-0.5"
            style={{ fontFamily: 'var(--font-display), Outfit, sans-serif' }}
          >
            {'\u{1F389}'} First deal on {label}!
          </p>
          <p className="text-sm text-slate-400">
            Corridor milestone unlocked {'\u{1F680}'}
          </p>
        </div>

        {/* Points fly-up */}
        {phase >= 3 && (
          <div className="flex justify-center mt-2">
            <span
              className="inline-block rounded-full bg-indigo-100 bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-600 text-indigo-300"
              style={{ animation: 'pointFlyUp 800ms ease-out' }}
            >
              +10 Trust
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
