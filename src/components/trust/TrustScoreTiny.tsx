'use client'

import type { Tier } from '@/lib/tier-system'
import type { BadgeTier } from '@/lib/trust-score'

interface TrustScoreTinyProps {
  score: number
  tier: Tier
  badgeTier?: BadgeTier
}

const TIER_EMOJI: Record<Tier, string> = {
  starter: '\u{1F331}',
  growing: '\u{1F33F}',
  established: '\u{1F333}',
}

const TIER_COLOR: Record<Tier, string> = {
  starter: 'text-amber-600 dark:text-amber-400',
  growing: 'text-blue-600 dark:text-blue-400',
  established: 'text-emerald-600 dark:text-emerald-400',
}

const BADGE_INDICATOR: Record<string, string> = {
  none: '',
  activity_verified: '\u{1F535}',
  id_verified: '\u{1F7E2}',
}

export default function TrustScoreTiny({ score, tier, badgeTier = 'none' }: TrustScoreTinyProps) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${TIER_COLOR[tier]}`}>
      <span>{TIER_EMOJI[tier]}</span>
      <span>{score}</span>
      {badgeTier !== 'none' && <span className="ml-0.5">{BADGE_INDICATOR[badgeTier]}</span>}
    </span>
  )
}
