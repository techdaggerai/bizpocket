// ═══════════════════════════════════════════════════════════
// useTierCheck — Detects real tier changes and triggers celebration
// Calls /api/trust/check-tier, deduplicates via localStorage
// ═══════════════════════════════════════════════════════════

import { useState, useCallback } from 'react'

const CELEBRATED_KEY = 'bizpocket_lastCelebratedTier'

export interface TierUpgrade {
  from: string
  to: string
  show: boolean
}

export function useTierCheck() {
  const [tierUpgrade, setTierUpgrade] = useState<TierUpgrade | null>(null)

  const checkTier = useCallback(async () => {
    try {
      const res = await fetch('/api/trust/check-tier', { method: 'POST' })
      if (!res.ok) return
      const data = await res.json()

      if (data.tierChanged) {
        // Handle upgrades including multi-tier jumps (starter → established)
        const tierOrder = ['starter', 'growing', 'established']
        const lastCelebrated = localStorage.getItem(CELEBRATED_KEY)
        const lastIndex = tierOrder.indexOf(lastCelebrated || '')
        const newIndex = tierOrder.indexOf(data.newTier)

        // Only celebrate if new tier is higher than last celebrated
        if (newIndex > lastIndex) {
          setTierUpgrade({
            from: data.oldTier,
            to: data.newTier,
            show: true,
          })
          localStorage.setItem(CELEBRATED_KEY, data.newTier)
          localStorage.setItem('lastUpgradeTrustScore', String(data.newScore))
        }
      }
    } catch {
      // Silent fail — tier check is non-critical
    }
  }, [])

  const dismissUpgrade = useCallback(() => {
    setTierUpgrade(null)
  }, [])

  return { tierUpgrade, checkTier, dismissUpgrade }
}
