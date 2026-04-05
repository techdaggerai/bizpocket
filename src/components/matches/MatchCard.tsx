'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TierBadge from '@/components/profile/TierBadge'
import type { Tier } from '@/lib/tier-system'

interface MatchCardProps {
  match: any
  onConnect: (matchId: string) => Promise<void>
  onDismiss: (matchId: string) => Promise<void>
}

const DYNAMIC_LABELS: Record<string, { label: string; color: string }> = {
  peer: { label: 'Peer Match', color: 'text-blue-600 dark:text-blue-400' },
  mentorship: { label: 'Mentorship', color: 'text-purple-600 dark:text-purple-400' },
  partnership: { label: 'Partnership', color: 'text-emerald-600 dark:text-emerald-400' },
  high_value: { label: 'High Value', color: 'text-amber-600 dark:text-amber-400' },
}

export default function MatchCard({ match, onConnect, onDismiss }: MatchCardProps) {
  const router = useRouter()
  const [connecting, setConnecting] = useState(false)
  const [dismissing, setDismissing] = useState(false)
  const [connected, setConnected] = useState(false)
  const [slideOut, setSlideOut] = useState<'left' | 'right' | null>(null)
  const busy = connecting || dismissing // Lock out both buttons when either is in progress

  const tier = (match.matched_tier || match.tier || 'starter') as Tier
  const trustScore = match.matched_trust_score || match.trust_score || 0
  const displayName = match.display_name || 'Business Professional'
  const title = match.matched_title || match.title || ''
  const services = match.matched_services || match.services || []
  const badgeTier = match.matched_badge_tier || match.badge_tier || 'none'
  const matchScore = match.match_score || 0
  const corridorTag = match.corridor_tag || ''
  const reasons = match.match_reasons || []
  const dynamic = DYNAMIC_LABELS[match.tier_dynamic] || DYNAMIC_LABELS.peer
  const initial = displayName.charAt(0)?.toUpperCase() || '?'

  async function handleConnect() {
    if (busy) return
    setConnecting(true)
    try {
      await onConnect(match.id)
      setConnected(true)
      setSlideOut('right')
    } catch {
      setConnecting(false)
    }
  }

  async function handleDismiss() {
    if (busy) return
    setDismissing(true)
    setSlideOut('left')
    try {
      await onDismiss(match.id)
    } catch {
      setSlideOut(null)
      setDismissing(false)
    }
  }

  return (
    <div
      className={`bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 overflow-hidden transition-all duration-300 ${
        slideOut === 'left' ? '-translate-x-full opacity-0' :
        slideOut === 'right' ? 'translate-x-full opacity-0' : ''
      }`}
      style={{ minWidth: 320, maxWidth: 380 }}
    >
      {/* Corridor header */}
      {corridorTag && (
        <div className="bg-[#EEF2FF] dark:bg-indigo-950/30 px-4 py-2 text-center">
          <span className="text-sm font-medium text-[#4338CA] dark:text-indigo-300">{corridorTag}</span>
        </div>
      )}

      <div className="p-5 space-y-4">
        {/* Profile header */}
        <div className="flex items-start gap-3">
          {match.avatar_url ? (
            <img src={match.avatar_url} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-[#E5E5E5] dark:border-gray-600 flex-shrink-0" />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-xl font-bold text-[#4F46E5] flex-shrink-0">
              {initial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-[var(--text-1)] dark:text-white truncate">{displayName}</h3>
              {badgeTier === 'id_verified' && <span className="text-sm">{'\u2705'}</span>}
            </div>
            {title && <p className="text-xs text-[var(--text-2)] dark:text-gray-300 truncate">{title}</p>}
            <div className="flex items-center gap-2 mt-1.5">
              <TierBadge tier={tier} size="sm" />
              <span className={`text-[10px] font-semibold ${dynamic.color}`}>{dynamic.label}</span>
            </div>
          </div>
        </div>

        {/* Match score */}
        <div className="flex items-center justify-between bg-[#F9FAFB] dark:bg-gray-800 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-sm">{'\u{1F3AF}'}</span>
            <span className="text-lg font-bold text-[var(--text-1)] dark:text-white">{matchScore}%</span>
            <span className="text-xs text-[var(--text-3)] dark:text-gray-400">Match</span>
          </div>
          {/* Score bar */}
          <div className="w-20 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div className="h-full rounded-full bg-[#4F46E5] transition-all" style={{ width: `${matchScore}%` }} />
          </div>
        </div>

        {/* Reasons */}
        {reasons.length > 0 && (
          <p className="text-xs text-[var(--text-2)] dark:text-gray-300 leading-relaxed line-clamp-2">
            {reasons.slice(0, 2).join(' · ')}
          </p>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 text-xs text-[var(--text-3)] dark:text-gray-400">
          <span>{'\u{1F6E1}\uFE0F'} {trustScore}</span>
          {services.length > 0 && (
            <span className="truncate">{'\u{2699}\uFE0F'} {services.slice(0, 2).join(', ')}</span>
          )}
        </div>

        {/* Connected state */}
        {connected ? (
          <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl py-3.5 border border-emerald-200 dark:border-emerald-800">
            <span className="text-lg">{'\u{1F389}'}</span>
            <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Connected!</span>
          </div>
        ) : (
          /* Action buttons */
          <div className="flex gap-2.5">
            <button
              onClick={handleDismiss}
              disabled={busy}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-[var(--text-2)] dark:text-gray-300 bg-[#F9FAFB] dark:bg-gray-800 border border-[#E5E5E5] dark:border-gray-700 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              Not Now
            </button>
            <button
              onClick={handleConnect}
              disabled={busy}
              className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {connecting ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <>Connect {'\u2192'}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
