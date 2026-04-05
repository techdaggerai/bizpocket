'use client'

import { useState } from 'react'
import TierBadge from '@/components/profile/TierBadge'
import TrustScoreBar from '@/components/profile/TrustScoreBar'
import CorridorBadge from '@/components/profile/CorridorBadge'
import type { Tier } from '@/lib/tier-system'
import dynamic from 'next/dynamic'

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  { ssr: false }
)

interface Props {
  profile: any
  shareToken: string
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ur', label: '\u0627\u0631\u062F\u0648', flag: '\u{1F1F5}\u{1F1F0}' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\u{1F1E6}\u{1F1EA}' },
]

export default function PublicProfileClient({ profile, shareToken }: Props) {
  const [lang, setLang] = useState('en')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [copied, setCopied] = useState(false)

  const tier = (profile.tier || 'starter') as Tier
  const trustScore = profile.trust_score || 20
  const isVerified = trustScore >= 76
  const profileUrl = `https://evrywher.io/p/${shareToken}`
  const corridors = profile.operating_corridors || []
  const services = profile.services || []
  const va = profile.verified_activity || {}

  // Pick bio based on language
  const bio = lang === 'ja' ? (profile.bio_ja || profile.bio_en || '')
    : lang === profile.native_language ? (profile.bio_native || profile.bio_en || '')
    : (profile.bio_en || '')

  const shareText = profile.tagline
    ? `${profile.display_name} - ${profile.tagline}\n${profileUrl}`
    : `Check out ${profile.display_name}'s verified business profile\n${profileUrl}`

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-[#E5E5E5] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{'\u{1F30D}'}</span>
            <span className="text-lg font-bold text-[#4F46E5]" style={{ fontFamily: 'var(--font-dm-sans), system-ui' }}>Evrywher</span>
          </div>
          {/* Language dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 text-sm text-[#555] bg-[#F3F4F6] px-3 py-1.5 rounded-lg hover:bg-[#E5E7EB] transition-colors"
            >
              {LANGUAGES.find(l => l.code === lang)?.flag || '\u{1F310}'} {LANGUAGES.find(l => l.code === lang)?.label || 'English'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showLangPicker && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-[#E5E5E5] py-1 min-w-[140px] z-20">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowLangPicker(false) }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F3F4F6] flex items-center gap-2 ${lang === l.code ? 'text-[#4F46E5] font-semibold' : 'text-[#333]'}`}
                  >
                    {l.flag} {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* ─── Profile Card ─── */}
        <div className={`bg-white rounded-2xl border ${isVerified ? 'border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-[#E5E5E5]'} p-6`}>
          <div className="flex items-start gap-4">
            {/* Avatar */}
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name}
                className="w-20 h-20 rounded-full object-cover border-2 border-[#E5E5E5] flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-3xl font-bold text-[#4F46E5] flex-shrink-0">
                {profile.display_name?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-[#0A0A0A]">{profile.display_name}</h1>
                {isVerified && <span className="text-sm" title="ID Verified">{'\u2705'}</span>}
              </div>
              {profile.title && (
                <p className="text-sm text-[#555] mt-0.5">{profile.title}</p>
              )}
              {profile.company_name && (
                <p className="text-xs text-[#999] mt-0.5">{profile.company_name}</p>
              )}
              <div className="flex items-center gap-1.5 mt-2">
                <TierBadge tier={tier} size="sm" />
              </div>
            </div>
          </div>

          {/* Location */}
          {corridors.length > 0 && (
            <div className="flex items-center gap-2 mt-4 text-sm text-[#555]">
              <span>{'\u{1F4CD}'}</span>
              <span>
                {corridors.map((c: any) => `${c.flag_from} ${c.from}`).join(' \u00B7 ')}
              </span>
            </div>
          )}
        </div>

        {/* ─── Trust Score ─── */}
        <div className={`bg-white rounded-2xl border ${isVerified ? 'border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'border-[#E5E5E5]'} p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#0A0A0A]">Trust Score</h2>
            <span className="text-3xl font-bold text-[#0A0A0A]">{trustScore}</span>
          </div>
          <TrustScoreBar score={trustScore} tier={tier} showBreakdown />
          <p className="text-[11px] text-[#999] mt-3">Based on verified in-app activity</p>
        </div>

        {/* ─── Bio ─── */}
        {bio && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <h2 className="text-sm font-semibold text-[#0A0A0A] mb-2">About</h2>
            <p className="text-sm text-[#333] leading-relaxed whitespace-pre-wrap">{bio}</p>
          </div>
        )}

        {/* ─── Corridors ─── */}
        {corridors.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Operating Corridors</h2>
            <div className="flex flex-wrap gap-2">
              {corridors.map((c: any, i: number) => (
                <CorridorBadge key={i} from={c.from} to={c.to} flagFrom={c.flag_from} flagTo={c.flag_to} />
              ))}
            </div>
          </div>
        )}

        {/* ─── Services ─── */}
        {services.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
            <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Services</h2>
            <div className="flex flex-wrap gap-2">
              {services.map((s: string, i: number) => (
                <span key={i} className="bg-[#EEF2FF] text-[#4338CA] text-xs font-medium px-3 py-1.5 rounded-full border border-[#C7D2FE]">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ─── Verified Activity ─── */}
        <div className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
          <h2 className="text-sm font-semibold text-[#0A0A0A] mb-3">Verified Activity</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: va.deals || 0, label: 'Deals', icon: '\u{1F4B0}' },
              { value: va.payment_rate ? `${va.payment_rate}%` : '—', label: 'Payment Rate', icon: '\u2705' },
              { value: va.languages || 1, label: 'Languages', icon: '\u{1F30D}' },
              { value: va.days_active || 0, label: 'Days Active', icon: '\u{1F4C5}' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#F9FAFB] rounded-xl p-3 text-center">
                <span className="text-lg">{stat.icon}</span>
                <p className="text-xl font-bold text-[#0A0A0A] mt-1">{stat.value}</p>
                <p className="text-[11px] text-[#999]">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="space-y-2.5">
          <a
            href="https://evrywher.io"
            className="w-full flex items-center justify-center gap-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-3.5 rounded-xl transition-colors no-underline"
          >
            <span>{'\u{1F4AC}'}</span> Connect on Evrywher
          </a>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold py-3.5 rounded-xl transition-colors no-underline"
          >
            <span>{'\u{1F4E4}'}</span> Share via WhatsApp
          </a>

          <a
            href={`https://line.me/R/share?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05B34D] text-white font-semibold py-3.5 rounded-xl transition-colors no-underline"
          >
            <span>{'\u{1F4E4}'}</span> Share via LINE
          </a>

          <div className="flex gap-2.5">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-[#F3F4F6] text-[#333] font-semibold py-3 rounded-xl border border-[#E5E5E5] transition-colors"
            >
              {'\u{1F4CB}'} {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => setShowQR(!showQR)}
              className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-[#F3F4F6] text-[#333] font-semibold py-3 rounded-xl border border-[#E5E5E5] transition-colors"
            >
              {'\u{1F4F2}'} QR Code
            </button>
          </div>
        </div>

        {/* ─── QR Code ─── */}
        {showQR && (
          <div className="bg-white rounded-2xl border border-[#E5E5E5] p-6 flex flex-col items-center">
            <QRCodeCanvas value={profileUrl} size={180} level="H" includeMargin />
            <p className="text-xs text-[#999] mt-3 font-mono">{profileUrl}</p>
          </div>
        )}

        {/* ─── Footer ─── */}
        <div className="text-center space-y-2 pt-4 pb-8">
          <p className="text-[11px] text-[#999] max-w-xs mx-auto leading-relaxed">
            Trust Score is based on verified app activity, not self-reported claims.
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm">{'\u{1F30D}'}</span>
            <span className="text-xs text-[#999]">Powered by</span>
            <a href="https://evrywher.io" className="text-xs font-semibold text-[#4F46E5] no-underline hover:underline">Evrywher</a>
          </div>
        </div>
      </main>
    </div>
  )
}
