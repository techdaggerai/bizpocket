'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase-client'
import dynamic from 'next/dynamic'

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  { ssr: false }
)

export default function InvitePage() {
  const router = useRouter()
  const { user, profile, organization } = useAuth()
  const supabase = createClient()

  const [shareToken, setShareToken] = useState('')
  const [trustScore, setTrustScore] = useState(0)
  const [tier, setTier] = useState('starter')
  const [tierEmoji, setTierEmoji] = useState('\u{1F331}')
  const [corridors, setCorridors] = useState('')
  const [referrals, setReferrals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [showQR, setShowQR] = useState(false)

  useEffect(() => {
    async function load() {
      // Get global profile for share token
      const { data: gp } = await supabase
        .from('global_profiles')
        .select('share_token, trust_score, tier, operating_corridors')
        .eq('user_id', user.id)
        .single()

      if (gp) {
        setShareToken(gp.share_token || '')
        setTrustScore(gp.trust_score || 0)
        setTier(gp.tier || 'starter')
        setTierEmoji(gp.tier === 'established' ? '\u{1F333}' : gp.tier === 'growing' ? '\u{1F33F}' : '\u{1F331}')
        const corrs = (gp.operating_corridors || [])
          .map((c: any) => `${c.flag_from} ${c.from} \u2194 ${c.flag_to} ${c.to}`)
          .join('\n')
        setCorridors(corrs)
      }

      // Get referrals
      const { data: refs } = await supabase
        .from('referrals')
        .select('id, invitee_id, trust_awarded, published_at, created_at')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false })

      if (refs && refs.length > 0) {
        // Get invitee names
        const inviteeIds = refs.map((r: any) => r.invitee_id)
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, full_name')
          .in('user_id', inviteeIds)

        const nameMap = new Map<string, string>(
          (profiles || []).map((p: any) => [p.user_id, p.full_name || p.name || 'User'])
        )

        setReferrals(refs.map((r: any) => ({
          ...r,
          name: nameMap.get(r.invitee_id) || 'User',
        })))
      }

      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const inviteUrl = shareToken ? `https://evrywher.io/invite/${shareToken}` : 'https://evrywher.io'

  const tierLabel = tier === 'established' ? 'Established' : tier === 'growing' ? 'Growing' : 'New Business'

  const shareMessage = `\u{1F30D} I use Evrywher for cross-border business.

\u{1F6E1}\uFE0F Trust Score: ${trustScore} \u00B7 ${tierEmoji} ${tierLabel}
${corridors ? corridors + '\n' : ''}
Build your verified profile:
\u{1F517} ${inviteUrl}

We both get +15 Trust Score when you publish.`

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank')
  }

  function handleLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareMessage)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
      </div>
    )
  }

  const publishedCount = referrals.filter(r => r.trust_awarded).length
  const pendingCount = referrals.filter(r => !r.trust_awarded).length

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 -ml-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-gray-800 transition-colors">
          <svg className="w-5 h-5 text-[var(--text-1)] dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <h1 className="text-lg font-bold text-[var(--text-1)] dark:text-white">{'\u{1F4E4}'} Grow Your Network</h1>
      </div>

      {/* No profile warning */}
      {!shareToken && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Build and publish your Global Profile first to get your invite link.
          </p>
          <button onClick={() => router.push('/profile/build')} className="mt-2 text-xs font-semibold text-[#4F46E5]">
            Build Profile {'\u2192'}
          </button>
        </div>
      )}

      {/* Trust reward */}
      <div className="bg-gradient-to-r from-[#EEF2FF] to-[#FEF3C7] dark:from-indigo-950/30 dark:to-amber-950/30 rounded-2xl border border-[#C7D2FE] dark:border-indigo-800 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl flex-shrink-0">{'\u{1F6E1}\uFE0F'}</span>
          <div>
            <p className="text-base font-bold text-[var(--text-1)] dark:text-white">+15 Trust Score Each</p>
            <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mt-1">
              You both earn +15 Trust Score when your invite publishes their profile.
            </p>
          </div>
        </div>
      </div>

      {/* Share buttons */}
      {shareToken && (
        <div className="space-y-2.5">
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            <span>{'\u{1F4F1}'}</span> Share via WhatsApp
          </button>

          <button
            onClick={handleLINE}
            className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05B34D] text-white font-semibold py-3.5 rounded-xl transition-colors"
          >
            <span>{'\u{1F4AC}'}</span> Share via LINE
          </button>

          <button
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 bg-[#F9FAFB] dark:bg-gray-800 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 text-[var(--text-1)] dark:text-gray-200 font-semibold py-3.5 rounded-xl border border-[#E5E5E5] dark:border-gray-700 transition-colors"
          >
            <span>{'\u{1F4CB}'}</span> {copied ? 'Copied!' : 'Copy Invite Link'}
          </button>

          <button
            onClick={() => setShowQR(!showQR)}
            className="w-full flex items-center justify-center gap-2 bg-[#F9FAFB] dark:bg-gray-800 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 text-[var(--text-1)] dark:text-gray-200 font-semibold py-3.5 rounded-xl border border-[#E5E5E5] dark:border-gray-700 transition-colors"
          >
            <span>{'\u{1F4F2}'}</span> {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </button>
        </div>
      )}

      {/* QR Code */}
      {showQR && shareToken && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-6 flex flex-col items-center">
          <QRCodeCanvas value={inviteUrl} size={180} level="H" includeMargin />
          <p className="text-xs text-[var(--text-3)] dark:text-gray-400 mt-3 font-mono">{inviteUrl}</p>
        </div>
      )}

      {/* Referrals list */}
      {referrals.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-3">
          <h3 className="text-sm font-semibold text-[var(--text-1)] dark:text-white">Your Referrals</h3>

          {/* Stats */}
          <div className="flex gap-3 text-xs text-[var(--text-3)] dark:text-gray-400">
            <span>{'\u{1F4E9}'} {referrals.length} invited</span>
            <span>{'\u2705'} {publishedCount} published</span>
            <span>{'\u23F3'} {pendingCount} pending</span>
          </div>

          {/* List */}
          <div className="space-y-2">
            {referrals.map((r) => (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6] dark:border-gray-800 last:border-0">
                <span className="text-sm">{r.trust_awarded ? '\u2705' : '\u23F3'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-1)] dark:text-gray-200 truncate">{r.name}</p>
                  <p className="text-[10px] text-[var(--text-3)] dark:text-gray-500">
                    {r.trust_awarded ? 'Published \u00B7 +15 earned' : 'Signed up \u00B7 pending publish'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
