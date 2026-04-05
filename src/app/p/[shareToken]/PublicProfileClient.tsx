'use client';

import { useState } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import PocketAvatar from '@/components/ui/PocketAvatar';
import Button from '@/components/ui/Button';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';
import CorridorBadge from '@/components/profile/CorridorBadge';
import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';
import dynamic from 'next/dynamic';
import EvryWherMark from '@/components/EvryWherMark';

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  { ssr: false }
);

interface Props {
  profile: any;
  shareToken: string;
}

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'ja', label: '\u65E5\u672C\u8A9E', flag: '\u{1F1EF}\u{1F1F5}' },
  { code: 'ur', label: '\u0627\u0631\u062F\u0648', flag: '\u{1F1F5}\u{1F1F0}' },
  { code: 'ar', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', flag: '\u{1F1E6}\u{1F1EA}' },
];

export default function PublicProfileClient({ profile, shareToken }: Props) {
  const [lang, setLang] = useState('en');
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const tier = (profile.tier || 'starter') as Tier;
  const badge = (profile.badge_tier || 'none') as BadgeTier;
  const trustScore = profile.trust_score || 20;
  const isVerified = badge === 'id_verified';
  const profileUrl = `https://evrywher.io/p/${shareToken}`;
  const corridors = profile.operating_corridors || [];
  const services = profile.services || [];
  const va = profile.verified_activity || {};
  const compliance = profile.compliance || [];

  const bio = lang === 'ja' ? (profile.bio_ja || profile.bio_en || '')
    : lang === profile.native_language ? (profile.bio_native || profile.bio_en || '')
    : (profile.bio_en || '');

  const shareText = profile.tagline
    ? `${profile.display_name} - ${profile.tagline}\n${profileUrl}`
    : `Check out ${profile.display_name}'s verified business profile\n${profileUrl}`;

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[var(--pm-surface-1)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--pm-surface-0)] backdrop-blur-[20px] border-b border-[var(--pm-surface-3)] px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">{'\u{1F30D}'}</span>
            <EvryWherMark size="sm" />
          </div>
          {/* Language dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowLangPicker(!showLangPicker)}
              className="flex items-center gap-1.5 text-sm text-[var(--pm-text-secondary)] bg-[var(--pm-surface-2)] px-3 py-1.5 rounded-lg hover:bg-[var(--pm-surface-3)] transition-colors"
            >
              {LANGUAGES.find(l => l.code === lang)?.flag || '\u{1F310}'} {LANGUAGES.find(l => l.code === lang)?.label || 'English'}
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M19 9l-7 7-7-7" /></svg>
            </button>
            {showLangPicker && (
              <div className="absolute right-0 top-full mt-1 bg-[var(--pm-surface-0)] rounded-lg shadow-lg border border-[var(--pm-surface-3)] py-1 min-w-[140px] z-20">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    onClick={() => { setLang(l.code); setShowLangPicker(false); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-[var(--pm-surface-2)] flex items-center gap-2 ${lang === l.code ? 'text-indigo-600 font-semibold' : 'text-[var(--pm-text-primary)]'}`}
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
        <GlassCard
          tier={isVerified ? 'established' : undefined}
          glow={isVerified}
          style={isVerified ? { border: '2px solid var(--tier-established-border)', boxShadow: '0 0 16px rgba(16,185,129,0.25)' } : undefined}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <PocketAvatar
                src={profile.avatar_url}
                name={profile.display_name || 'BP'}
                size="xl"
                tier={tier}
                badge={badge}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[var(--pm-text-primary)]">{profile.display_name}</h1>
                </div>
                {profile.title && (
                  <p className="text-sm text-[var(--pm-text-secondary)] mt-0.5">{profile.title}</p>
                )}
                {profile.company_name && (
                  <p className="text-xs text-[var(--pm-text-tertiary)] mt-0.5">{profile.company_name}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <TierBadge tier={tier} trustScore={trustScore} badge={badge} size="sm" />
                </div>
              </div>
            </div>

            {/* Location */}
            {corridors.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-[var(--pm-text-secondary)]">
                <span>{'\u{1F4CD}'}</span>
                <span>{corridors.map((c: any) => `${c.flag_from} ${c.from}`).join(' \u00B7 ')}</span>
              </div>
            )}
          </div>
        </GlassCard>

        {/* ─── Trust Score ─── */}
        <GlassCard
          tier={isVerified ? 'established' : tier}
          glow={isVerified}
          style={isVerified ? { boxShadow: '0 0 16px rgba(16,185,129,0.25)' } : undefined}
        >
          <TierBadge tier={tier} trustScore={trustScore} badge={badge} size="lg" animated />
        </GlassCard>

        {/* ─── Bio ─── */}
        {bio && (
          <GlassCard>
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-[var(--pm-text-primary)]">About</h2>
              <p className="text-sm text-[var(--pm-text-secondary)] leading-relaxed whitespace-pre-wrap">{bio}</p>
            </div>
          </GlassCard>
        )}

        {/* ─── Corridors ─── */}
        {corridors.length > 0 && (
          <GlassCard>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--pm-text-primary)]">Operating Corridors</h2>
              <div className="flex flex-col items-center gap-3">
                {corridors.map((c: any, i: number) => (
                  <CorridorBadge
                    key={i}
                    from={c.from}
                    to={c.to}
                    flagFrom={c.flag_from}
                    flagTo={c.flag_to}
                    variant="hero"
                    pulseStrength="gentle"
                  />
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* ─── Services ─── */}
        {services.length > 0 && (
          <GlassCard>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--pm-text-primary)]">Services</h2>
              <div className="flex flex-wrap gap-2">
                {services.map((s: string, i: number) => (
                  <span key={i} className="bg-indigo-950/30 text-indigo-300 text-xs font-medium px-3 py-1.5 rounded-full border border-indigo-800">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* ─── Verified Activity ─── */}
        <GlassCard>
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-[var(--pm-text-primary)]">Verified Activity</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: va.deals || 0, label: 'Deals', icon: '\u{1F4B0}' },
                { value: va.payment_rate ? `${va.payment_rate}%` : '\u2014', label: 'Payment Rate', icon: '\u2705' },
                { value: va.languages || 1, label: 'Languages', icon: '\u{1F30D}' },
                { value: va.days_active || 0, label: 'Days Active', icon: '\u{1F4C5}' },
              ].map((stat, i) => (
                <div key={i} className="bg-[var(--pm-surface-2)] rounded-xl p-3 text-center">
                  <span className="text-lg">{stat.icon}</span>
                  <p
                    className="text-xl font-bold text-[var(--pm-text-primary)] mt-1"
                    style={{ fontFamily: 'var(--font-display), sans-serif' }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-[11px] text-[var(--pm-text-tertiary)]">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* ─── Compliance ─── */}
        {compliance.length > 0 && (
          <GlassCard>
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-[var(--pm-text-primary)]">Compliance</h2>
              <div className="flex flex-wrap gap-2">
                {compliance.map((c: any, i: number) => (
                  <span key={i} className="text-xs text-[var(--pm-text-secondary)]">
                    {c.flag} {c.label} {c.verified ? '\u2713' : '\u2026'}
                  </span>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* ─── Action Buttons ─── */}
        <div className="space-y-2.5">
          <a href="https://evrywher.io" className="block no-underline">
            <Button variant="primary" size="xl" className="w-full">
              {'\u{1F4AC}'} Connect on Evrywher
            </Button>
          </a>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block no-underline"
          >
            <Button variant="primary" size="lg" className="w-full bg-[#25D366] hover:bg-[#20BD5A]">
              {'\u{1F4E4}'} Share via WhatsApp
            </Button>
          </a>

          <a
            href={`https://line.me/R/share?text=${encodeURIComponent(shareText)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block no-underline"
          >
            <Button variant="primary" size="lg" className="w-full bg-[#06C755] hover:bg-[#05B34D]">
              {'\u{1F4E4}'} Share via LINE
            </Button>
          </a>

          <div className="flex gap-2.5">
            <GlassCard onClick={handleCopy} elevated className="flex-1">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
                {'\u{1F4CB}'} {copied ? 'Copied!' : 'Copy Link'}
              </div>
            </GlassCard>
            <GlassCard onClick={() => setShowQR(!showQR)} elevated className="flex-1">
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
                {'\u{1F4F2}'} QR Code
              </div>
            </GlassCard>
          </div>
        </div>

        {/* ─── QR Code ─── */}
        {showQR && (
          <GlassCard className="animate-[cardSlideUp_300ms_var(--ease-out)_both]">
            <div className="flex flex-col items-center py-2">
              <QRCodeCanvas value={profileUrl} size={180} level="H" includeMargin />
              <p className="text-xs text-[var(--pm-text-tertiary)] mt-3 font-mono">{profileUrl}</p>
            </div>
          </GlassCard>
        )}

        {/* ─── Footer ─── */}
        <div className="text-center space-y-2 pt-4 pb-8">
          <p className="text-[11px] text-[var(--pm-text-tertiary)] max-w-xs mx-auto leading-relaxed">
            Trust Score is based on verified app activity, not self-reported claims.
          </p>
          <div className="flex items-center justify-center gap-1.5">
            <span className="text-sm">{'\u{1F30D}'}</span>
            <span className="text-xs text-[var(--pm-text-tertiary)]">Powered by</span>
            <a href="https://evrywher.io" className="text-xs font-semibold text-indigo-400 no-underline hover:underline">Evrywher</a>
          </div>
        </div>
      </main>
    </div>
  );
}
