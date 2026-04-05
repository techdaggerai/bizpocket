'use client'

import { useEffect, useState } from 'react'
import type { Tier } from '@/lib/tier-system'
import type { BadgeTier, TrustBreakdown } from '@/lib/trust-score'

interface TrustScoreLargeProps {
  score: number
  tier: Tier
  badgeTier?: BadgeTier
  breakdown?: TrustBreakdown
  showBreakdown?: boolean
}

const TIER_CONFIG: Record<Tier, { emoji: string; label: string; bar: string; track: string; accent: string; border: string }> = {
  starter: {
    emoji: '\u{1F331}', label: 'New Business',
    bar: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-950/50',
    accent: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800',
  },
  growing: {
    emoji: '\u{1F33F}', label: 'Growing Business',
    bar: 'bg-blue-500', track: 'bg-blue-100 dark:bg-blue-950/50',
    accent: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
  },
  established: {
    emoji: '\u{1F333}', label: 'Established Business',
    bar: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-950/50',
    accent: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
}

const BADGE_INFO: Record<string, { icon: string; label: string; color: string; glow: string }> = {
  none: { icon: '', label: '', color: '', glow: '' },
  activity_verified: {
    icon: '\u{1F535}', label: 'Activity Verified',
    color: 'text-blue-600 dark:text-blue-400',
    glow: 'shadow-[0_0_12px_rgba(59,130,246,0.2)]',
  },
  id_verified: {
    icon: '\u2705', label: 'ID Verified',
    color: 'text-emerald-600 dark:text-emerald-400',
    glow: 'shadow-[0_0_12px_rgba(16,185,129,0.2)]',
  },
}

const BREAKDOWN_LABELS: { key: keyof TrustBreakdown; label: string; icon: string; max: number }[] = [
  { key: 'base', label: 'Base', icon: '\u{1F30D}', max: 20 },
  { key: 'photo', label: 'Photo', icon: '\u{1F4F7}', max: 2 },
  { key: 'phone', label: 'Phone', icon: '\u{1F4F1}', max: 2 },
  { key: 'address', label: 'Address', icon: '\u{1F4CD}', max: 2 },
  { key: 'bio', label: 'Bio', icon: '\u270F\uFE0F', max: 2 },
  { key: 'contacts', label: 'Contacts', icon: '\u{1F465}', max: 2 },
  { key: 'messages', label: 'Messages', icon: '\u{1F4AC}', max: 2 },
  { key: 'invoices', label: 'First Invoice', icon: '\u{1F9FE}', max: 3 },
  { key: 'paidFirst', label: 'First Payment', icon: '\u{1F4B0}', max: 5 },
  { key: 'paidRepeat', label: 'Repeat Payments', icon: '\u{1F4B3}', max: 15 },
  { key: 'taxInfo', label: 'Tax Info', icon: '\u{1F3F7}\uFE0F', max: 3 },
  { key: 'referrals', label: 'Referrals', icon: '\u{1F91D}', max: 9 },
  { key: 'idVerified', label: 'ID Verified', icon: '\u{1F6E1}\uFE0F', max: 5 },
]

export default function TrustScoreLarge({ score, tier, badgeTier = 'none', breakdown, showBreakdown = true }: TrustScoreLargeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const config = TIER_CONFIG[tier]
  const badge = BADGE_INFO[badgeTier] || BADGE_INFO.none
  const pct = Math.min(100, Math.max(0, score))

  useEffect(() => {
    const duration = 800
    const start = performance.now()
    const from = 0
    function animate(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setAnimatedScore(Math.round(from + (score - from) * eased))
      if (progress < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score])

  return (
    <div className={`space-y-4 ${badge.glow}`}>
      {/* Score + tier */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-3)] dark:text-gray-400">Trust Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-4xl font-bold text-[var(--text-1)] dark:text-white">{animatedScore}</span>
            <span className="text-sm text-[var(--text-3)] dark:text-gray-400">/100</span>
          </div>
        </div>
        <div className="text-right">
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border ${config.accent} ${config.border} bg-white/50 dark:bg-gray-900/50`}>
            {config.emoji} {config.label}
          </span>
          {badge.icon && (
            <p className={`text-xs font-medium mt-1.5 ${badge.color}`}>
              {badge.icon} {badge.label}
            </p>
          )}
        </div>
      </div>

      {/* Main bar */}
      <div className={`h-3 rounded-full overflow-hidden ${config.track}`}>
        <div
          className={`h-full rounded-full ${config.bar} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Tier thresholds */}
      <div className="flex justify-between text-[10px] text-[var(--text-3)] dark:text-gray-500 px-0.5">
        <span>{'\u{1F331}'} 0</span>
        <span>{'\u{1F33F}'} 45</span>
        <span>{'\u{1F333}'} 76</span>
        <span>100</span>
      </div>

      {/* Breakdown */}
      {showBreakdown && breakdown && (
        <div className="space-y-2 pt-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] dark:text-gray-400">Score Breakdown</p>
          <div className="space-y-1.5">
            {BREAKDOWN_LABELS.map((item) => {
              const value = breakdown[item.key] as number
              if (item.key === 'base') return null // skip base — always 20
              const filled = item.max > 0 ? (value / item.max) * 100 : 0
              return (
                <div key={item.key} className="flex items-center gap-2">
                  <span className="text-xs w-4 text-center">{item.icon}</span>
                  <span className={`text-xs w-28 truncate ${value > 0 ? 'text-[var(--text-1)] dark:text-gray-200' : 'text-[var(--text-3)] dark:text-gray-500'}`}>
                    {item.label}
                  </span>
                  <div className="flex-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${value > 0 ? config.bar : ''}`}
                      style={{ width: `${filled}%` }}
                    />
                  </div>
                  <span className={`text-xs font-mono w-8 text-right ${value > 0 ? 'text-[var(--text-1)] dark:text-gray-200 font-semibold' : 'text-[var(--text-3)] dark:text-gray-500'}`}>
                    +{value}
                  </span>
                </div>
              )
            })}
          </div>
          {/* Raw vs clamped */}
          {breakdown.raw !== breakdown.clamped && (
            <p className="text-[10px] text-[var(--text-3)] dark:text-gray-500 italic">
              Raw score: {breakdown.raw} (clamped to {tier} tier range)
            </p>
          )}
        </div>
      )}
    </div>
  )
}
