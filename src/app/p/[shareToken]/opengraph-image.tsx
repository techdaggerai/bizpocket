import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'edge'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

async function getProfile(shareToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  const supabase = createClient(url, key)

  const { data: profile } = await supabase
    .from('global_profiles')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_published', true)
    .single()

  if (!profile) return null

  const { data: bizProfile } = await supabase
    .from('profiles')
    .select('name, full_name, avatar_url')
    .eq('user_id', profile.user_id)
    .single()

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single()

  return {
    ...profile,
    display_name: bizProfile?.full_name || bizProfile?.name || 'Business Professional',
    avatar_url: bizProfile?.avatar_url || null,
    company_name: org?.name || '',
  }
}

export default async function OGImage({ params }: { params: { shareToken: string } }) {
  const { shareToken } = params
  const profile = await getProfile(shareToken)

  if (!profile) {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', backgroundColor: '#F8F9FC', fontFamily: 'system-ui' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <span style={{ fontSize: 48 }}>{'\u{1F30D}'}</span>
            <span style={{ fontSize: 24, color: '#999', marginTop: 16 }}>Profile Not Found</span>
          </div>
        </div>
      ),
      { ...size }
    )
  }

  // Truncation helper for OG image safety
  const trunc = (s: string, max: number) => s && s.length > max ? s.slice(0, max - 1) + '\u2026' : (s || '')

  const tier = profile.tier || 'starter'
  const tierEmoji = tier === 'established' ? '\u{1F333}' : tier === 'growing' ? '\u{1F33F}' : '\u{1F331}'
  const tierLabel = tier === 'established' ? 'Established Business' : tier === 'growing' ? 'Growing Business' : 'New Business'
  const tierColor = tier === 'established' ? '#059669' : tier === 'growing' ? '#2563EB' : '#D97706'
  const trustScore = profile.trust_score || 20
  const isVerified = trustScore >= 76
  const services = (profile.services || []).slice(0, 3).map((s: string) => trunc(s, 30))
  const corridors = (profile.operating_corridors || []).slice(0, 2)
  const tagline = trunc(profile.tagline || '', 80)
  const displayName = trunc(profile.display_name || 'Business Professional', 40)
  const displayTitle = trunc(profile.title || '', 50)
  const initial = displayName.charAt(0)?.toUpperCase() || '?'

  // Only render avatar if it's from our Supabase storage (safe domain)
  const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '')
  const avatarUrl = profile.avatar_url && profile.avatar_url.includes(supabaseHost) ? profile.avatar_url : null

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#FFFFFF',
          padding: 48,
          fontFamily: 'system-ui',
          position: 'relative',
        }}
      >
        {/* Top border accent */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: isVerified ? '#10B981' : '#4F46E5', display: 'flex' }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
          {/* Avatar */}
          {avatarUrl ? (
            <img
              src={avatarUrl}
              width={96}
              height={96}
              style={{ borderRadius: '50%', objectFit: 'cover', border: `3px solid ${isVerified ? '#10B981' : '#E5E5E5'}` }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 96,
                height: 96,
                borderRadius: '50%',
                backgroundColor: '#EEF2FF',
                fontSize: 40,
                fontWeight: 700,
                color: '#4F46E5',
              }}
            >
              {initial}
            </div>
          )}

          {/* Name + title */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#0A0A0A' }}>{displayName}</span>
              {isVerified && <span style={{ fontSize: 28 }}>{'\u2705'}</span>}
            </div>
            {displayTitle && (
              <span style={{ fontSize: 20, color: '#555', marginTop: 4 }}>{displayTitle}</span>
            )}
            {profile.company_name && (
              <span style={{ fontSize: 16, color: '#999', marginTop: 2 }}>{profile.company_name}</span>
            )}
          </div>

          {/* Trust score */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 16, padding: '16px 28px', border: `2px solid ${isVerified ? '#10B981' : '#E5E5E5'}` }}>
            <span style={{ fontSize: 14, color: '#999', fontWeight: 600 }}>TRUST</span>
            <span style={{ fontSize: 48, fontWeight: 700, color: '#0A0A0A' }}>{trustScore}</span>
          </div>
        </div>

        {/* Tier badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: `${tierColor}15`, border: `1px solid ${tierColor}40`, borderRadius: 20, padding: '6px 16px' }}>
            <span style={{ fontSize: 18 }}>{tierEmoji}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: tierColor }}>{tierLabel}</span>
          </div>
          {/* Corridors */}
          {corridors.map((c: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, backgroundColor: '#F9FAFB', borderRadius: 20, padding: '6px 14px', border: '1px solid #E5E5E5' }}>
              <span style={{ fontSize: 16 }}>{c.flag_from}</span>
              <span style={{ fontSize: 12, color: '#999' }}>{'\u2194'}</span>
              <span style={{ fontSize: 16 }}>{c.flag_to}</span>
              <span style={{ fontSize: 13, color: '#555' }}>{c.from} {'\u2194'} {c.to}</span>
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, gap: 6 }}>
          <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 6, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, trustScore)}%`, height: '100%', borderRadius: 6, backgroundColor: tierColor }} />
          </div>
        </div>

        {/* Tagline or services */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', marginTop: 20 }}>
          {tagline ? (
            <span style={{ fontSize: 22, color: '#333', fontStyle: 'italic' }}>{`"${tagline}"`}</span>
          ) : services.length > 0 ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {services.map((s: string, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#EEF2FF', color: '#4338CA', fontSize: 15, fontWeight: 500, padding: '6px 16px', borderRadius: 20, border: '1px solid #C7D2FE' }}>
                  {s}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{'\u{1F30D}'}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#4F46E5' }}>Evrywher</span>
          </div>
          <span style={{ fontSize: 14, color: '#999' }}>{`evrywher.io/p/${shareToken}`}</span>
        </div>
      </div>
    ),
    { ...size }
  )
}
