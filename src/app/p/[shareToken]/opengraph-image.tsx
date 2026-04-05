import { ImageResponse } from 'next/og';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const TIER_COLOR: Record<string, string> = {
  starter: '#D97706',
  growing: '#2563EB',
  established: '#059669',
};

const TIER_EMOJI: Record<string, string> = {
  starter: '\u{1F331}',
  growing: '\u{1F33F}',
  established: '\u{1F333}',
};

const TIER_LABEL: Record<string, string> = {
  starter: 'New Business',
  growing: 'Growing Business',
  established: 'Established Business',
};

async function getProfile(shareToken: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const supabase = createClient(url, key);

  const { data: profile } = await supabase
    .from('global_profiles')
    .select('*')
    .eq('share_token', shareToken)
    .eq('is_published', true)
    .single();

  if (!profile) return null;

  const { data: bizProfile } = await supabase
    .from('profiles')
    .select('name, full_name, avatar_url')
    .eq('user_id', profile.user_id)
    .single();

  const { data: org } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', profile.organization_id)
    .single();

  return {
    ...profile,
    display_name: bizProfile?.full_name || bizProfile?.name || 'Business Professional',
    avatar_url: bizProfile?.avatar_url || null,
    company_name: org?.name || '',
  };
}

function trunc(s: string, max: number) {
  return s && s.length > max ? s.slice(0, max - 1) + '\u2026' : (s || '');
}

export default async function OGImage({ params }: { params: { shareToken: string } }) {
  const { shareToken } = params;
  const profile = await getProfile(shareToken);

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
    );
  }

  const tier = profile.tier || 'starter';
  const tierColor = TIER_COLOR[tier] || TIER_COLOR.starter;
  const tierEmoji = TIER_EMOJI[tier] || TIER_EMOJI.starter;
  const tierLabel = TIER_LABEL[tier] || TIER_LABEL.starter;
  const trustScore = profile.trust_score || 20;
  const badge = profile.badge_tier || 'none';
  const isVerified = badge === 'id_verified';
  const services = (profile.services || []).slice(0, 3).map((s: string) => trunc(s, 30));
  const corridors = (profile.operating_corridors || []).slice(0, 2);
  const tagline = trunc(profile.tagline || '', 80);
  const displayName = trunc(profile.display_name || 'Business Professional', 40);
  const displayTitle = trunc(profile.title || '', 50);
  const initial = displayName.charAt(0)?.toUpperCase() || '?';
  const borderColor = isVerified ? '#10B981' : tierColor;

  // Only render avatar if it's from our Supabase storage
  const supabaseHost = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '');
  const avatarUrl = profile.avatar_url && profile.avatar_url.includes(supabaseHost) ? profile.avatar_url : null;

  // Trust ring SVG
  const ringR = 36;
  const ringCirc = 2 * Math.PI * ringR;
  const trustPct = Math.min(1, trustScore / 100);
  const ringOffset = ringCirc * (1 - trustPct);

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
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, backgroundColor: borderColor, display: 'flex' }} />

        {/* ID Verified side glow */}
        {isVerified && (
          <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 6, backgroundColor: '#10B981', display: 'flex' }} />
        )}

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 28 }}>
          {/* Avatar with trust ring */}
          <div style={{ display: 'flex', position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                width={80}
                height={80}
                style={{ borderRadius: '50%', objectFit: 'cover', position: 'absolute', top: 8, left: 8 }}
              />
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  backgroundColor: `${tierColor}20`,
                  fontSize: 36,
                  fontWeight: 700,
                  color: tierColor,
                  position: 'absolute',
                  top: 8,
                  left: 8,
                }}
              >
                {initial}
              </div>
            )}
            {/* Trust ring arc */}
            <svg width="96" height="96" style={{ position: 'absolute', top: 0, left: 0 }}>
              <circle cx="48" cy="48" r={ringR} fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle
                cx="48"
                cy="48"
                r={ringR}
                fill="none"
                stroke={tierColor}
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={ringCirc}
                strokeDashoffset={ringOffset}
                transform="rotate(-90 48 48)"
              />
            </svg>
          </div>

          {/* Name + title */}
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 36, fontWeight: 700, color: '#111827' }}>{displayName}</span>
              {isVerified && <span style={{ fontSize: 28 }}>{'\u2705'}</span>}
            </div>
            {displayTitle && (
              <span style={{ fontSize: 20, color: '#6B7280', marginTop: 4 }}>{displayTitle}</span>
            )}
            {profile.company_name && (
              <span style={{ fontSize: 16, color: '#9CA3AF', marginTop: 2 }}>{profile.company_name}</span>
            )}
            {/* Location flags */}
            {corridors.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                {corridors.map((c: any, i: number) => (
                  <span key={i} style={{ fontSize: 14, color: '#6B7280' }}>
                    {c.flag_from} {c.from} {'\u2194'} {c.flag_to} {c.to}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Trust score box */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            backgroundColor: '#F9FAFB',
            borderRadius: 16,
            padding: '16px 28px',
            border: `2px solid ${borderColor}`,
          }}>
            <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, letterSpacing: 1 }}>TRUST</span>
            <span style={{ fontSize: 48, fontWeight: 700, color: '#111827' }}>{trustScore}</span>
            {badge !== 'none' && (
              <span style={{ fontSize: 11, color: isVerified ? '#059669' : '#2563EB', fontWeight: 600, marginTop: 2 }}>
                {isVerified ? 'ID VERIFIED' : 'ACTIVE'}
              </span>
            )}
          </div>
        </div>

        {/* Tier + services row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: `${tierColor}15`, border: `1px solid ${tierColor}40`, borderRadius: 20, padding: '6px 16px' }}>
            <span style={{ fontSize: 18 }}>{tierEmoji}</span>
            <span style={{ fontSize: 16, fontWeight: 600, color: tierColor }}>{tierLabel}</span>
          </div>
          {services.map((s: string, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', backgroundColor: '#EEF2FF', color: '#4338CA', fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 20, border: '1px solid #C7D2FE' }}>
              {s}
            </div>
          ))}
        </div>

        {/* Trust bar */}
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24, gap: 6 }}>
          <div style={{ display: 'flex', width: '100%', height: 10, borderRadius: 5, backgroundColor: '#F3F4F6', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, trustScore)}%`, height: '100%', borderRadius: 5, background: `linear-gradient(90deg, ${tierColor}88, ${tierColor})` }} />
          </div>
        </div>

        {/* Tagline */}
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', marginTop: 20 }}>
          {tagline ? (
            <span style={{ fontSize: 22, color: '#374151', fontStyle: 'italic' }}>{`\u201C${tagline}\u201D`}</span>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 24 }}>{'\u{1F30D}'}</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#4F46E5' }}>Evrywher</span>
            <span style={{ fontSize: 14, color: '#9CA3AF', marginLeft: 8 }}>Connect on Evrywher {'\u2192'} evrywher.io</span>
          </div>
          <span style={{ fontSize: 13, color: '#9CA3AF' }}>{`evrywher.io/p/${shareToken}`}</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
