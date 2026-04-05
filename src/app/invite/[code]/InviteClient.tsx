'use client'

import Link from 'next/link'
import TierBadge from '@/components/profile/TierBadge'
import type { Tier } from '@/lib/tier-system'

interface Props {
  inviter: any
  code: string
}

export default function InviteClient({ inviter, code }: Props) {
  const tier = (inviter.tier || 'starter') as Tier
  const initial = inviter.display_name?.charAt(0)?.toUpperCase() || '?'
  const corridors = inviter.operating_corridors || []
  const services = (inviter.services || []).slice(0, 3)

  return (
    <div className="min-h-screen bg-[#F8F9FC] flex flex-col items-center justify-center px-6 py-12">
      {/* Evrywher header */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-2xl">{'\u{1F30D}'}</span>
        <span className="text-xl font-bold text-[#4F46E5]">Evrywher</span>
      </div>

      {/* Invite card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-[#E5E5E5] p-6 space-y-5 shadow-sm">
        <p className="text-center text-sm text-[#555]">You've been invited by</p>

        {/* Inviter profile */}
        <div className="flex flex-col items-center text-center">
          {inviter.avatar_url ? (
            <img src={inviter.avatar_url} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[#E5E5E5] mb-3" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#4F46E5]/10 flex items-center justify-center text-3xl font-bold text-[#4F46E5] mb-3">
              {initial}
            </div>
          )}
          <h2 className="text-xl font-bold text-[#0A0A0A]">{inviter.display_name}</h2>
          {inviter.title && <p className="text-sm text-[#555] mt-0.5">{inviter.title}</p>}
          {inviter.company_name && <p className="text-xs text-[#999] mt-0.5">{inviter.company_name}</p>}
          <div className="mt-2">
            <TierBadge tier={tier} trustScore={inviter.trust_score} size="sm" />
          </div>
        </div>

        {/* Corridors */}
        {corridors.length > 0 && (
          <div className="flex justify-center gap-2 flex-wrap">
            {corridors.map((c: any, i: number) => (
              <span key={i} className="text-xs bg-[#F9FAFB] border border-[#E5E5E5] rounded-full px-2.5 py-1">
                {c.flag_from} {'\u2194'} {c.flag_to}
              </span>
            ))}
          </div>
        )}

        {/* Services */}
        {services.length > 0 && (
          <div className="flex justify-center gap-1.5 flex-wrap">
            {services.map((s: string, i: number) => (
              <span key={i} className="text-[10px] bg-[#EEF2FF] text-[#4338CA] px-2 py-0.5 rounded-full border border-[#C7D2FE]">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Trust reward */}
        <div className="bg-gradient-to-r from-[#EEF2FF] to-[#FEF3C7] rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">{'\u{1F6E1}\uFE0F'}</span>
            <p className="text-sm text-[#333]">
              <span className="font-semibold">You both earn +15 Trust Score</span> when you publish your profile.
            </p>
          </div>
        </div>

        {/* CTA */}
        <Link
          href={`/signup?ref=${code}`}
          className="block w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold text-center py-4 rounded-xl transition-colors no-underline"
        >
          Join Evrywher {'\u2192'}
        </Link>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-[#999]">Already have an account?</p>
        <Link href="/login" className="text-xs text-[#4F46E5] font-semibold no-underline hover:underline">Log in</Link>
      </div>
    </div>
  )
}
