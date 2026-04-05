'use client'

import type { Tier } from '@/lib/tier-system'
import type { BadgeTier } from '@/lib/trust-score'

interface TrustScoreMediumProps {
  score: number
  tier: Tier
  badgeTier?: BadgeTier
  showLabel?: boolean
}

const TIER_CONFIG: Record<Tier, { emoji: string; label: string; bar: string; bg: string; text: string }> = {
  starter: {
    emoji: '\u{1F331}', label: 'New Business',
    bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
  },
  growing: {
    emoji: '\u{1F33F}', label: 'Growing',
    bar: 'bg-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
  },
  established: {
    emoji: '\u{1F333}', label: 'Established',
    bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
}

const BADGE_LABEL: Record<string, { icon: string; label: string; color: string }> = {
  none: { icon: '', label: '', color: '' },
  activity_verified: { icon: '\u{1F535}', label: 'Activity Verified', color: 'text-blue-600 dark:text-blue-400' },
  id_verified: { icon: '\u{1F7E2}', label: 'ID Verified', color: 'text-emerald-600 dark:text-emerald-400' },
}

export default function TrustScoreMedium({ score, tier, badgeTier = 'none', showLabel = true }: TrustScoreMediumProps) {
  const config = TIER_CONFIG[tier]
  const badge = BADGE_LABEL[badgeTier] || BADGE_LABEL.none
  const pct = Math.min(100, Math.max(0, score))

  return (
    <div className="space-y-1.5">
      {/* Line 1: Score + tier + badge */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-bold text-[var(--text-1)] dark:text-white">{score}</span>
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
          {config.emoji} {showLabel && config.label}
        </span>
        {badge.icon && (
          <span className={`text-xs font-medium ${badge.color}`}>
            {badge.icon} {badge.label}
          </span>
        )}
      </div>
      {/* Line 2: Bar */}
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        <div className={`h-full rounded-full ${config.bar} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
