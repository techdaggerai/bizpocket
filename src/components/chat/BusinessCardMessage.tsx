'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import TierBadge from '@/components/profile/TierBadge'
import TrustScoreBar from '@/components/profile/TrustScoreBar'
import type { Tier } from '@/lib/tier-system'

interface BusinessCardMessageProps {
  cardData: any
  isOwner: boolean
  timestamp: string
}

export default function BusinessCardMessage({ cardData, isOwner, timestamp }: BusinessCardMessageProps) {
  const router = useRouter()
  const [showQuoteForm, setShowQuoteForm] = useState(false)
  const [quoteText, setQuoteText] = useState('')

  if (!cardData) return null

  const tier = (cardData.tier || 'starter') as Tier
  const trustScore = cardData.trust_score || 20
  const displayName = cardData.display_name || 'Business Professional'
  const title = cardData.title || ''
  const companyName = cardData.company_name || ''
  const services = (cardData.services || []).slice(0, 3)
  const corridors = cardData.operating_corridors || []
  const badgeTier = cardData.badge_tier || 'none'
  const isVerified = badgeTier === 'id_verified'
  const deals = cardData.deals || 0
  const initial = displayName.charAt(0)?.toUpperCase() || '?'

  function handleRequestQuote() {
    setShowQuoteForm(true)
  }

  function handleSendInvoice() {
    router.push('/invoices/new')
  }

  return (
    <div className={`flex ${isOwner ? 'justify-end' : 'justify-start'}`}>
      <div className="w-[85%] max-w-[340px]">
        {!isOwner && <p className="text-[10px] text-[#A3A3A3] dark:text-gray-500 mb-1 ml-1">{cardData.sender_name || 'Contact'}</p>}

        <div className={`rounded-2xl overflow-hidden border ${isVerified ? 'border-emerald-300 dark:border-emerald-700' : 'border-[#E5E5E5] dark:border-gray-700'} ${isOwner ? 'bg-[#EEF2FF] dark:bg-indigo-950/30' : 'bg-white dark:bg-gray-900'}`}>
          {/* Corridor header */}
          {corridors.length > 0 && (
            <div className="bg-[#4F46E5]/5 dark:bg-indigo-950/50 px-4 py-1.5 text-center">
              <span className="text-xs text-[#4338CA] dark:text-indigo-300">
                {corridors.map((c: any) => `${c.flag_from} ${'\u2194'} ${c.flag_to}`).join(' · ')}
              </span>
            </div>
          )}

          <div className="p-4 space-y-3">
            {/* Profile header */}
            <div className="flex items-center gap-3">
              {cardData.avatar_url ? (
                <img src={cardData.avatar_url} alt="" className="w-11 h-11 rounded-full object-cover border border-[#E5E5E5] dark:border-gray-600" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-lg font-bold text-[#4F46E5]">
                  {initial}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-[var(--text-1)] dark:text-white truncate">{displayName}</span>
                  {isVerified && <span className="text-xs">{'\u2705'}</span>}
                </div>
                {title && <p className="text-[11px] text-[var(--text-2)] dark:text-gray-300 truncate">{title}</p>}
                {companyName && <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400 truncate">{companyName}</p>}
              </div>
              <TierBadge tier={tier} size="sm" />
            </div>

            {/* Services */}
            {services.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {services.map((s: string, i: number) => (
                  <span key={i} className="text-[10px] bg-[#4F46E5]/8 dark:bg-indigo-950/40 text-[#4338CA] dark:text-indigo-300 px-2 py-0.5 rounded-full border border-[#C7D2FE]/50 dark:border-indigo-800">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Trust score */}
            <div className="bg-[#F9FAFB] dark:bg-gray-800 rounded-xl p-3">
              <TrustScoreBar score={trustScore} tier={tier} />
            </div>

            {/* Stats */}
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-3)] dark:text-gray-400">
              {deals > 0 && <span>{'\u2705'} {deals} deals</span>}
              {corridors.length > 0 && (
                <span>{'\u{1F30D}'} {corridors.length} corridor{corridors.length !== 1 ? 's' : ''}</span>
              )}
              {badgeTier !== 'none' && (
                <span>{badgeTier === 'id_verified' ? '\u{1F6E1}\uFE0F ID Verified' : '\u{1F535} Activity Verified'}</span>
              )}
            </div>

            {/* Action buttons */}
            {!isOwner && (
              <div className="flex gap-2">
                <button
                  onClick={handleRequestQuote}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-[#4F46E5] dark:text-indigo-300 bg-white dark:bg-gray-900 border border-[#C7D2FE] dark:border-indigo-800 hover:bg-[#EEF2FF] dark:hover:bg-indigo-950/30 transition-colors"
                >
                  Request Quote
                </button>
                <button
                  onClick={handleSendInvoice}
                  className="flex-1 py-2 rounded-lg text-[11px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] transition-colors"
                >
                  Send Invoice
                </button>
              </div>
            )}

            {/* Quote form */}
            {showQuoteForm && (
              <div className="space-y-2">
                <input
                  value={quoteText}
                  onChange={(e) => setQuoteText(e.target.value)}
                  placeholder="What do you need a quote for?"
                  className="w-full text-xs border border-[#E5E5E5] dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-[var(--text-1)] dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  autoFocus
                />
                <button
                  onClick={() => {
                    if (cardData.onQuoteRequest && quoteText.trim()) {
                      cardData.onQuoteRequest(quoteText.trim())
                      setQuoteText('')
                      setShowQuoteForm(false)
                    }
                  }}
                  disabled={!quoteText.trim()}
                  className="w-full py-2 rounded-lg text-[11px] font-semibold text-white bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 transition-colors"
                >
                  Send Quote Request
                </button>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-[var(--text-3)] dark:text-gray-500">Shared via Evrywher</span>
              <span className="text-[9px] text-[var(--text-3)] dark:text-gray-500">{timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
