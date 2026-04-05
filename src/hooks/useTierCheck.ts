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
        // Only celebrate upgrades, not downgrades
        const TIER_ORDER: Record<string, number> = { starter: 0, growing: 1, established: 2 }
        const isUpgrade = (TIER_ORDER[data.newTier] ?? 0) > (TIER_ORDER[data.oldTier] ?? 0)
        if (!isUpgrade) return

        // Check localStorage to avoid re-showing after refresh
        const lastCelebrated = localStorage.getItem(CELEBRATED_KEY)
        if (lastCelebrated === data.newTier) return

        setTierUpgrade({
          from: data.oldTier,
          to: data.newTier,
          show: true,
        })
        localStorage.setItem(CELEBRATED_KEY, data.newTier)
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
