'use client'

// ═══════════════════════════════════════════════════════════
// DelightProvider — Client wrapper for app layout
// Combines useDelightSequence hook + DelightContext + DelightLayer
// ═══════════════════════════════════════════════════════════

import { useDelightSequence } from '@/hooks/useDelightSequence'
import { DelightContextProvider } from '@/contexts/DelightContext'
import DelightLayer from '@/components/ui/DelightLayer'

export default function DelightProvider({ children }: { children: React.ReactNode }) {
  const { activeDelight, showConfetti, showCoinRain, flyingPoints, trigger } = useDelightSequence()

  return (
    <DelightContextProvider value={{ trigger }}>
      {children}
      <DelightLayer
        showConfetti={showConfetti}
        showCoinRain={showCoinRain}
        flyingPoints={flyingPoints}
        activeDelight={activeDelight}
      />
    </DelightContextProvider>
  )
}
