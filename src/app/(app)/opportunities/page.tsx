'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import MatchCard from '@/components/matches/MatchCard'
import Link from 'next/link'

export default function OpportunitiesPage() {
  const router = useRouter()
  const { user } = useAuth()

  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [hasProfile, setHasProfile] = useState<boolean | null>(null)
  const [remaining, setRemaining] = useState<string | number>('—')
  const [tipVisible, setTipVisible] = useState(false)
  const [emptyMessage, setEmptyMessage] = useState('')
  const [loadError, setLoadError] = useState(false)

  // Check profile + fetch matches
  useEffect(() => {
    async function load() {
      try {
        // Check for global profile
        const profileRes = await fetch('/api/profile/me')
        if (!profileRes.ok) throw new Error('Profile fetch failed')
        const profileJson = await profileRes.json()

        if (!profileJson.profile) {
          setHasProfile(false)
          setLoading(false)
          return
        }
        setHasProfile(true)

        // Fetch existing matches
        const matchRes = await fetch('/api/matches/list')
        if (matchRes.ok) {
          const matchJson = await matchRes.json()
          setMatches(matchJson.matches || [])
        }
      } catch {
        setLoadError(true)
      }
      setLoading(false)
    }
    load()
  }, [])

  const generateMatches = useCallback(async () => {
    if (generating) return // guard against double-tap
    setGenerating(true)
    setEmptyMessage('')
    try {
      const res = await fetch('/api/matches/generate', { method: 'POST' })
      const json = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setEmptyMessage(json.upgradeHint || 'Daily match limit reached. Check back tomorrow!')
        } else {
          setEmptyMessage(json.error || 'Failed to generate matches')
        }
        setGenerating(false)
        return
      }

      if (json.matches?.length > 0) {
        setMatches((prev) => [...json.matches, ...prev])
        setRemaining(json.remaining)
      } else {
        setEmptyMessage(json.message || 'No new matches found. Check back later!')
      }
    } catch {
      setEmptyMessage('Something went wrong. Please try again.')
    }
    setGenerating(false)
  }, [])

  async function handleConnect(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}/connect`, { method: 'POST' })
    const json = await res.json()

    if (!res.ok) throw new Error(json.error)

    // Show tip banner briefly
    setTipVisible(true)
    setTimeout(() => {
      setTipVisible(false)
      // Navigate to conversation
      if (json.conversation_id) {
        router.push('/chat')
      }
    }, 2000)

    // Remove from list
    setMatches((prev) => prev.filter((m) => m.id !== matchId))
  }

  async function handleDismiss(matchId: string) {
    const res = await fetch(`/api/matches/${matchId}/dismiss`, { method: 'POST' })
    if (!res.ok) {
      const json = await res.json()
      throw new Error(json.error)
    }
    // Remove from list after animation
    setTimeout(() => {
      setMatches((prev) => prev.filter((m) => m.id !== matchId))
    }, 100)
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    )
  }

  // Load error
  if (loadError) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header />
        <div className="flex flex-col items-center text-center py-12">
          <span className="text-4xl mb-3">{'\u26A0\uFE0F'}</span>
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mb-4">Failed to load. Please check your connection.</p>
          <button onClick={() => window.location.reload()} className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">
            Retry
          </button>
        </div>
      </div>
    )
  }

  // No profile
  if (hasProfile === false) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Header />
        <div className="flex flex-col items-center text-center py-12">
          <span className="text-5xl mb-4">{'\u{1F30D}'}</span>
          <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white mb-2">Build Your Profile First</h2>
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300 max-w-xs mb-6">
            Create your global professional profile so AI can match you with the right partners.
          </p>
          <Link
            href="/profile/build"
            className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-6 py-3 rounded-xl transition-colors no-underline"
          >
            Build My Profile {'\u2192'}
          </Link>
        </div>
      </div>
    )
  }

  const pendingMatches = matches.filter((m) => m.status === 'pending')
  const connectedMatches = matches.filter((m) => m.status === 'connected')

  return (
    <div className="px-4 py-6 space-y-6">
      <Header />

      {/* Tip banner */}
      {tipVisible && (
        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-top">
          <span>{'\u{1F4A1}'}</span>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">Share your Business Card to build trust faster</p>
        </div>
      )}

      {/* Subtitle */}
      {pendingMatches.length > 0 && (
        <p className="text-sm text-[var(--text-2)] dark:text-gray-300">
          {'\u{1F916}'} AI found <span className="font-semibold text-[var(--text-1)] dark:text-white">{pendingMatches.length}</span> potential partner{pendingMatches.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Match cards */}
      {pendingMatches.length > 0 ? (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory -mx-4 px-4" style={{ scrollbarWidth: 'none' }}>
          {pendingMatches.map((match) => (
            <div key={match.id} className="snap-center flex-shrink-0" style={{ width: 'min(85vw, 380px)' }}>
              <MatchCard
                match={match}
                onConnect={handleConnect}
                onDismiss={handleDismiss}
              />
            </div>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="flex flex-col items-center text-center py-8">
          <span className="text-4xl mb-3">{generating ? '\u{1F50D}' : '\u{1F91D}'}</span>
          {generating ? (
            <>
              <p className="text-sm font-semibold text-[var(--text-1)] dark:text-white mb-1">Finding your matches...</p>
              <p className="text-xs text-[var(--text-3)] dark:text-gray-400">AI is analyzing profiles now</p>
              <div className="mt-4 flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#4F46E5]" style={{ animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </>
          ) : emptyMessage ? (
            <>
              <p className="text-sm text-[var(--text-2)] dark:text-gray-300 max-w-xs mb-4">{emptyMessage}</p>
              <button
                onClick={generateMatches}
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                Try Again
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-[var(--text-2)] dark:text-gray-300 max-w-xs mb-4">
                No matches yet. Let AI find business partners for you.
              </p>
              <button
                onClick={generateMatches}
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
              >
                Find Partners {'\u2192'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Scroll dots indicator */}
      {pendingMatches.length > 1 && (
        <div className="flex justify-center gap-1.5">
          {pendingMatches.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]/30" />
          ))}
        </div>
      )}

      {/* Stats section */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Your Network</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center bg-[#F9FAFB] dark:bg-gray-800 rounded-xl p-3">
            <p className="text-xl font-bold text-[var(--text-1)] dark:text-white">{connectedMatches.length}</p>
            <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400">Connections</p>
          </div>
          <div className="text-center bg-[#F9FAFB] dark:bg-gray-800 rounded-xl p-3">
            <p className="text-xl font-bold text-[var(--text-1)] dark:text-white">{pendingMatches.length}</p>
            <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400">Pending</p>
          </div>
          <div className="text-center bg-[#F9FAFB] dark:bg-gray-800 rounded-xl p-3">
            <p className="text-xl font-bold text-[var(--text-1)] dark:text-white">{typeof remaining === 'number' ? remaining : '\u221E'}</p>
            <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400">Remaining</p>
          </div>
        </div>

        {/* Generate more */}
        <button
          onClick={generateMatches}
          disabled={generating}
          className="w-full py-3 rounded-xl text-sm font-semibold text-[#4F46E5] dark:text-indigo-300 bg-[#EEF2FF] dark:bg-indigo-950/30 border border-[#C7D2FE] dark:border-indigo-800 hover:bg-[#E0E7FF] dark:hover:bg-indigo-950/50 transition-colors disabled:opacity-50"
        >
          {generating ? 'Finding...' : `Find More Partners ${'\u2192'}`}
        </button>
      </div>

      {/* Invite CTA */}
      <Link
        href="/invite"
        className="flex items-center gap-4 bg-gradient-to-r from-[#EEF2FF] to-[#FEF3C7] dark:from-indigo-950/30 dark:to-amber-950/30 rounded-2xl border border-[#C7D2FE] dark:border-indigo-800 p-4 no-underline hover:opacity-90 transition-opacity"
      >
        <span className="text-2xl">{'\u{1F4E4}'}</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Grow Your Network</p>
          <p className="text-xs text-[var(--text-2)] dark:text-gray-300">Invite contacts and both earn +15 Trust</p>
        </div>
        <svg className="w-5 h-5 text-[var(--text-3)] dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      <style jsx>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function Header() {
  const router = useRouter()
  return (
    <div className="flex items-center gap-3">
      <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-gray-800 transition-colors">
        <svg className="w-5 h-5 text-[var(--text-1)] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
      </button>
      <h1 className="text-lg font-bold text-[var(--text-1)] dark:text-white">{'\u{1F91D}'} Opportunities</h1>
    </div>
  )
}
