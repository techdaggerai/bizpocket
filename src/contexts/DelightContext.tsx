'use client'

// ═══════════════════════════════════════════════════════════
// DelightContext — Provides delight trigger function to all
// components in the app tree. Any component can import
// useDelight() and call trigger() to fire animations.
// ═══════════════════════════════════════════════════════════

import { createContext, useContext } from 'react'
import type { DelightEvent } from '@/hooks/useDelightSequence'

interface DelightContextValue {
  trigger: (event: DelightEvent) => void
}

const DelightContext = createContext<DelightContextValue>({
  trigger: () => {},
})

export const DelightContextProvider = DelightContext.Provider

export function useDelight() {
  return useContext(DelightContext)
}
