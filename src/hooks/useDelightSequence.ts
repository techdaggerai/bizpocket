// ═══════════════════════════════════════════════════════════
// useDelightSequence — Centralized delight animation manager
// Manages confetti, coin rain, flying points, toasts
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react'

export type DelightType =
  | 'trust_earned'
  | 'first_invoice'
  | 'first_paid'
  | 'corridor_milestone'
  | 'referral_published'
  | 'badge_earned'
  | 'profile_published'

export interface DelightEvent {
  type: DelightType
  points?: number
  data?: any
}

export interface FlyingPoints {
  points: number
  x: number
  y: number
}

export function useDelightSequence() {
  const [activeDelight, setActiveDelight] = useState<DelightEvent | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showCoinRain, setShowCoinRain] = useState(false)
  const [flyingPoints, setFlyingPoints] = useState<FlyingPoints | null>(null)

  const trigger = useCallback((event: DelightEvent) => {
    setActiveDelight(event)

    switch (event.type) {
      case 'trust_earned':
        // Flying points only
        setFlyingPoints({ points: event.points || 0, x: 0, y: 0 })
        setTimeout(() => setFlyingPoints(null), 1000)
        break

      case 'first_invoice':
        // Confetti + points
        setShowConfetti(true)
        setFlyingPoints({ points: event.points || 3, x: 0, y: 0 })
        setTimeout(() => { setShowConfetti(false); setFlyingPoints(null) }, 2500)
        break

      case 'first_paid':
        // Coin rain + big points
        setShowCoinRain(true)
        setFlyingPoints({ points: event.points || 5, x: 0, y: 0 })
        setTimeout(() => { setShowCoinRain(false); setFlyingPoints(null) }, 2000)
        break

      case 'corridor_milestone':
        // Confetti + flying points (CorridorMilestoneToast handles its own display)
        setShowConfetti(true)
        setFlyingPoints({ points: 10, x: 0, y: 0 })
        setTimeout(() => { setShowConfetti(false); setFlyingPoints(null) }, 2500)
        break

      case 'referral_published':
        // Double confetti + big points
        setShowConfetti(true)
        setFlyingPoints({ points: event.points || 15, x: 0, y: 0 })
        setTimeout(() => { setShowConfetti(false); setFlyingPoints(null) }, 2500)
        break

      case 'profile_published':
        // Confetti burst
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 2500)
        break

      case 'badge_earned':
        // Toast only — badgePulse is CSS-driven on the badge itself
        break
    }

    // Auto-clear delight after 5s
    setTimeout(() => setActiveDelight(null), 5000)
  }, [])

  return {
    activeDelight,
    showConfetti,
    showCoinRain,
    flyingPoints,
    trigger,
  }
}
