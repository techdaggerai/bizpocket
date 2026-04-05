'use client'

// ═══════════════════════════════════════════════════════════
// DelightLayer — Renders active delight animations
// Sits at the app layout level, renders globally
// Uses existing Confetti component + CSS keyframes
// ═══════════════════════════════════════════════════════════

import Confetti from '@/components/ui/Confetti'
import type { DelightEvent, FlyingPoints } from '@/hooks/useDelightSequence'

interface DelightLayerProps {
  showConfetti: boolean
  showCoinRain: boolean
  flyingPoints: FlyingPoints | null
  activeDelight: DelightEvent | null
}

const COIN_POSITIONS = [15, 30, 45, 60, 75, 90]

export default function DelightLayer({
  showConfetti,
  showCoinRain,
  flyingPoints,
  activeDelight,
}: DelightLayerProps) {
  return (
    <>
      {/* Confetti */}
      <Confetti active={showConfetti} particleCount={30} duration={2500} />

      {/* Coin Rain */}
      {showCoinRain && (
        <div className="fixed inset-0 z-[190] pointer-events-none overflow-hidden" aria-hidden="true">
          {COIN_POSITIONS.map((left, i) => (
            <span
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${left}%`,
                top: '-30px',
                animation: `coinRain ${1200 + i * 150}ms ease-in forwards`,
                animationDelay: `${i * 80}ms`,
              }}
            >
              {'\u{1FA99}'}
            </span>
          ))}
        </div>
      )}

      {/* Flying Points */}
      {flyingPoints && flyingPoints.points > 0 && (
        <div className="fixed inset-0 z-[195] pointer-events-none flex items-center justify-center" aria-hidden="true">
          <span
            className="text-lg font-bold text-indigo-600 text-indigo-400"
            style={{
              fontFamily: 'var(--font-display), Outfit, sans-serif',
              animation: 'pointFlyUp 800ms ease-out forwards',
            }}
          >
            +{flyingPoints.points} Trust
          </span>
        </div>
      )}

      {/* Toast for delight events */}
      {activeDelight && activeDelight.type !== 'corridor_milestone' && (
        <DelightToast event={activeDelight} />
      )}
    </>
  )
}

// ─── Inline toast for delight events ─────────────────────

function DelightToast({ event }: { event: DelightEvent }) {
  const config = TOAST_CONFIG[event.type]
  if (!config) return null

  return (
    <div className="fixed bottom-24 left-1/2 z-[180] -translate-x-1/2 animate-[cardSlideUp_400ms_ease-out]">
      <div
        className="rounded-[16px] bg-slate-800/95 backdrop-blur-xl px-5 py-3 flex items-center gap-3 min-w-[240px]"
        style={{ boxShadow: 'var(--glass-shadow)' }}
      >
        <span className="text-2xl">{config.emoji}</span>
        <div>
          <p className="text-[14px] font-semibold text-white">
            {config.title}
          </p>
          {event.points && event.points > 0 && (
            <p className="text-[12px] text-indigo-600 text-indigo-400 font-medium">
              +{event.points} Trust Score
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const TOAST_CONFIG: Record<string, { emoji: string; title: string }> = {
  trust_earned: { emoji: '\u{1F6E1}\uFE0F', title: 'Trust earned!' },
  first_invoice: { emoji: '\u{1F9FE}', title: 'First invoice sent!' },
  first_paid: { emoji: '\u{1F4B0}', title: 'First payment received!' },
  referral_published: { emoji: '\u{1F389}', title: 'Referral bonus earned!' },
  profile_published: { emoji: '\u2728', title: 'Profile published!' },
  badge_earned: { emoji: '\u{1F3C5}', title: 'Badge earned!' },
}
