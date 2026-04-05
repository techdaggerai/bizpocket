'use client'

// ═══════════════════════════════════════════════════════════
// TierUpgradeOverlay — Full-screen tier upgrade celebration
// Uses existing keyframes: tierCelebrate, tierColorWash
// Uses existing Confetti component for particle effects
// ═══════════════════════════════════════════════════════════

import { useState, useEffect } from 'react'
import Confetti from '@/components/ui/Confetti'

interface TierUpgradeOverlayProps {
  from: string
  to: string
  onDismiss: () => void
}

const TIER_META: Record<string, {
  emoji: string
  label: string
  color: string
  confettiColors: string[]
}> = {
  starter: {
    emoji: '\u{1F331}',
    label: 'Starter',
    color: '#F59E0B',
    confettiColors: ['#F59E0B', '#FCD34D', '#FBBF24', '#FDE68A'],
  },
  growing: {
    emoji: '\u{1F33F}',
    label: 'Growing Business',
    color: '#3B82F6',
    confettiColors: ['#3B82F6', '#60A5FA', '#818CF8', '#4F46E5', '#93C5FD'],
  },
  established: {
    emoji: '\u{1F333}',
    label: 'Established Business',
    color: '#10B981',
    confettiColors: ['#10B981', '#6EE7B7', '#34D399', '#059669', '#A7F3D0'],
  },
}

const UNLOCKS: Record<string, string[]> = {
  'starter->growing': [
    '\u2705 5 matches per day',
    '\u2705 Business Card sharing unlocked',
    '\u2705 Full compliance templates',
    '\u2705 All invoice templates',
  ],
  'growing->established': [
    '\u2705 Unlimited daily matches',
    '\u2705 Boosted visibility in search',
    '\u2705 Priority matching',
    '\u2705 Green badge eligible',
  ],
}

export default function TierUpgradeOverlay({ from, to, onDismiss }: TierUpgradeOverlayProps) {
  const [phase, setPhase] = useState(0)
  // 0: overlay fade in
  // 1: old emoji spins out
  // 2: new emoji celebrates in + confetti + color wash
  // 3: text + unlocks stagger in
  // 4: buttons appear

  const fromMeta = TIER_META[from] || TIER_META.starter
  const toMeta = TIER_META[to] || TIER_META.growing
  const unlockKey = `${from}->${to}`
  const unlocks = UNLOCKS[unlockKey] || UNLOCKS['starter->growing']

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 600),
      setTimeout(() => setPhase(3), 1400),
      setTimeout(() => setPhase(4), 2200),
    ]
    return () => timers.forEach(clearTimeout)
  }, [])

  const handleShare = async () => {
    const text = `I just grew to ${toMeta.emoji} ${toMeta.label} on BizPocket! Building trust, one invoice at a time.`
    if (navigator.share) {
      try {
        await navigator.share({ title: 'BizPocket Tier Upgrade', text })
      } catch { /* cancelled */ }
    }
    // Award share trust event
    fetch('/api/trust/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: 'referral_published', metadata: { source: 'tier_upgrade_share' } }),
    }).catch(() => {})
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500"
        style={{ opacity: phase >= 0 ? 1 : 0 }}
      />

      {/* Color wash */}
      {phase >= 2 && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 40%, ${toMeta.color}40 0%, transparent 70%)`,
            animation: 'tierColorWash 1200ms ease-out forwards',
          }}
        />
      )}

      {/* Confetti */}
      <Confetti
        active={phase >= 2}
        particleCount={36}
        colors={toMeta.confettiColors}
        duration={3000}
      />

      {/* Content card */}
      <div
        className="relative z-10 mx-4 w-full max-w-[340px] rounded-[24px] bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl p-8 text-center transition-all duration-500"
        style={{
          boxShadow: 'var(--glass-shadow)',
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        }}
      >
        {/* Old emoji spinning out */}
        {phase >= 1 && phase < 2 && (
          <div
            className="text-6xl mb-4"
            style={{
              animation: 'spin 300ms ease-in forwards',
              opacity: 1,
            }}
          >
            {fromMeta.emoji}
          </div>
        )}

        {/* New emoji celebrating in */}
        {phase >= 2 && (
          <div
            className="text-7xl mb-4"
            style={{ animation: 'tierCelebrate 800ms ease-out' }}
          >
            {toMeta.emoji}
          </div>
        )}

        {/* Title + tier label */}
        {phase >= 3 && (
          <div
            className="transition-all duration-500"
            style={{
              opacity: phase >= 3 ? 1 : 0,
              transform: phase >= 3 ? 'translateY(0)' : 'translateY(12px)',
            }}
          >
            <h2
              className="text-2xl font-bold text-gray-900 dark:text-white mb-1"
              style={{ fontFamily: 'var(--font-display), Outfit, sans-serif' }}
            >
              You&apos;ve Grown!
            </h2>
            <p
              className="text-lg font-semibold mb-4"
              style={{ color: toMeta.color }}
            >
              {toMeta.emoji} {toMeta.label}
            </p>

            {/* Unlocks list with stagger */}
            <div className="text-left space-y-2 mb-6">
              {unlocks.map((item, i) => (
                <div
                  key={i}
                  className="text-[14px] text-gray-700 dark:text-gray-200 transition-all duration-300"
                  style={{
                    opacity: phase >= 3 ? 1 : 0,
                    transform: phase >= 3 ? 'translateX(0)' : 'translateX(-12px)',
                    transitionDelay: `${i * 150}ms`,
                  }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Buttons */}
        {phase >= 4 && (
          <div
            className="space-y-3 transition-all duration-400"
            style={{
              opacity: phase >= 4 ? 1 : 0,
              transform: phase >= 4 ? 'translateY(0)' : 'translateY(8px)',
            }}
          >
            <button
              onClick={handleShare}
              className="w-full rounded-[16px] bg-indigo-600 px-6 py-3 text-[15px] font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              Share your growth! (+15 Trust)
            </button>
            <button
              onClick={onDismiss}
              className="w-full rounded-[16px] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 px-6 py-3 text-[15px] font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              Continue &rarr;
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
