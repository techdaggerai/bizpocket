'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import TrustScoreBar from '@/components/profile/TrustScoreBar'
import type { Tier } from '@/lib/tier-system'

interface BizCardGateProps {
  trustScore: number
  tier: Tier
  isPublished?: boolean
  nextActions?: { action: string; points: number; icon: string }[]
  onClose: () => void
  onShareLink?: () => void
  onSendInvoice?: () => void
}

export default function BizCardGate({ trustScore, tier, isPublished = false, nextActions = [], onClose, onShareLink, onSendInvoice }: BizCardGateProps) {
  const router = useRouter()
  const required = 60
  const pct = Math.min(100, Math.round((trustScore / required) * 100))

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-t-2xl p-6 space-y-4 animate-in slide-in-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center">
          <span className="text-4xl">{'\u{1F331}'}</span>
          <h2 className="text-lg font-bold text-[var(--text-1)] dark:text-white mt-2">Build Your Trust to Unlock Business Cards</h2>
          <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mt-1">
            You need a Trust Score of {required}+, Growing tier, and a published profile to share business cards.
          </p>
        </div>

        {/* Progress */}
        <div className="bg-[#F9FAFB] dark:bg-gray-800 rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[var(--text-2)] dark:text-gray-300">Your Trust</span>
            <span className="font-bold text-[var(--text-1)] dark:text-white">{trustScore} / {required}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-[10px] text-[var(--text-3)] dark:text-gray-400 text-center">
            {required - trustScore} more points to unlock
          </p>
        </div>

        {/* Publish requirement */}
        {!isPublished && (
          <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
            <span className="text-lg">{'\u{1F30D}'}</span>
            <div>
              <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Publish your profile</p>
              <p className="text-[10px] text-indigo-600/70 dark:text-indigo-400/70">Go to Profile Builder and tap Publish & Go Live</p>
            </div>
          </div>
        )}

        {/* Tier requirement */}
        {tier === 'starter' && (
          <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
            <span className="text-lg">{'\u{1F33F}'}</span>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Reach Growing tier</p>
              <p className="text-[10px] text-amber-600/70 dark:text-amber-400/70">Send 11 invoices or add tax info</p>
            </div>
          </div>
        )}

        {/* Actions checklist */}
        {nextActions.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-[var(--text-3)] dark:text-gray-400 uppercase tracking-wide">Quick wins</p>
            {nextActions.slice(0, 3).map((a, i) => (
              <div key={i} className="flex items-center gap-2.5 bg-[#F9FAFB] dark:bg-gray-800 rounded-lg px-3 py-2.5">
                <span className="text-sm">{a.icon}</span>
                <span className="flex-1 text-xs text-[var(--text-1)] dark:text-gray-200">{a.action}</span>
                <span className="text-[10px] font-bold text-[#4F46E5] dark:text-indigo-300 bg-[#4F46E5]/10 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded-full">+{a.points}</span>
              </div>
            ))}
          </div>
        )}

        {/* Alternative actions */}
        <div className="space-y-2">
          <p className="text-xs text-[var(--text-3)] dark:text-gray-400 text-center">Meanwhile:</p>
          <div className="flex gap-2">
            <button
              onClick={() => { onSendInvoice?.(); onClose(); }}
              className="flex-1 py-3 rounded-xl text-xs font-semibold text-[#4F46E5] dark:text-indigo-300 bg-[#EEF2FF] dark:bg-indigo-950/30 border border-[#C7D2FE] dark:border-indigo-800 hover:bg-[#E0E7FF] dark:hover:bg-indigo-950/50 transition-colors"
            >
              Send Invoice Instead
            </button>
            <button
              onClick={() => { onShareLink?.(); onClose(); }}
              className="flex-1 py-3 rounded-xl text-xs font-semibold text-[var(--text-1)] dark:text-gray-200 bg-[#F9FAFB] dark:bg-gray-800 border border-[#E5E5E5] dark:border-gray-700 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 transition-colors"
            >
              Share Profile Link
            </button>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs text-[var(--text-3)] dark:text-gray-400 hover:text-[var(--text-1)] dark:hover:text-white transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  )
}
