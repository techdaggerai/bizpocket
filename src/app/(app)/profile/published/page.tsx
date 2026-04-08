'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import TierBadge from '@/components/profile/TierBadge';
import Confetti from '@/components/ui/Confetti';
import type { Tier } from '@/lib/tier-system';
import dynamic from 'next/dynamic';

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  { ssr: false }
);

export default function ProfilePublishedPage() {
  const router = useRouter();
  const { user, profile } = useAuth();
  const [profileData, setProfileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile/me');
        const json = await res.json();
        if (json.profile) setProfileData(json.profile);
      } catch {}
      setLoading(false);
    }
    load();
    // Fire confetti on mount
    setConfettiActive(true);
    const t = setTimeout(() => setConfettiActive(false), 3000);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const tier = (profileData?.tier || 'starter') as Tier;
  const trustScore = profileData?.trust_score || 20;
  const tagline = profileData?.tagline || '';
  const shareToken = profileData?.share_token || user.id.slice(0, 8);
  const profileUrl = `https://evrywher.io/p/${shareToken}`;
  const displayName = profile.full_name || profile.name || '';
  const shareText = tagline
    ? `${displayName} - ${tagline}\n${profileUrl}`
    : `Check out my verified business profile on Evrywher\n${profileUrl}`;

  function handleCopy() {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  }

  function handleLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareText)}`, '_blank');
  }

  return (
    <div className="flex flex-col items-center px-6 py-8 min-h-[80vh]">
      <Confetti active={confettiActive} />

      {/* Celebration */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4 animate-[tierCelebrate_600ms_var(--ease-bounce)]">{'\u{1F389}'}</div>
        <h1
          className="text-3xl font-bold text-[var(--pm-text-primary)]"
          style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700 }}
        >
          Your profile is live!
        </h1>
        <p className="text-sm text-[var(--pm-text-secondary)] mt-2">
          The world can now find and verify your business.
        </p>
      </div>

      {/* Tier + Trust */}
      <div className="w-full mb-6">
        <TierBadge tier={tier} trustScore={trustScore} size="lg" />
      </div>

      {/* Share buttons */}
      <div className="w-full space-y-2.5 mb-6">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--pm-text-tertiary)] text-center">
          Share your profile
        </p>

        <GlassCard onClick={handleWhatsApp} elevated>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
            <span>{'\u{1F4F1}'}</span> Share via WhatsApp
          </div>
        </GlassCard>

        <GlassCard onClick={handleLINE} elevated>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
            <span>{'\u{1F4AC}'}</span> Share via LINE
          </div>
        </GlassCard>

        <GlassCard onClick={handleCopy} elevated>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
            <span>{'\u{1F4CB}'}</span> {copied ? 'Copied!' : 'Copy Link'}
          </div>
        </GlassCard>

        <GlassCard onClick={() => setShowQR(!showQR)} elevated>
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
            <span>{'\u{1F4F2}'}</span> {showQR ? 'Hide QR Code' : 'Show QR Code'}
          </div>
        </GlassCard>
      </div>

      {/* QR Code */}
      {showQR && (
        <GlassCard className="w-full mb-6">
          <div className="flex flex-col items-center py-2">
            <QRCodeCanvas value={profileUrl} size={200} level="H" includeMargin />
            <p className="text-xs text-[var(--pm-text-tertiary)] mt-3 font-mono">{profileUrl}</p>
          </div>
        </GlassCard>
      )}

      {/* Referral callout */}
      <GlassCard tier="starter" glow className="w-full mb-6">
        <div className="flex items-start gap-3">
          <span className="text-xl shrink-0">{'\u{1F6E1}\uFE0F'}</span>
          <p className="text-sm text-[var(--pm-text-primary)]">
            <span className="font-semibold text-amber-400">+15 Trust</span> when someone you invite publishes their profile.
          </p>
        </div>
      </GlassCard>

      {/* Navigation */}
      <div className="w-full space-y-2.5 mt-auto">
        <Button
          variant="primary"
          size="xl"
          onClick={() => router.push('/opportunities')}
          className="w-full"
        >
          Find Partners →
        </Button>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => router.push('/dashboard')}
          className="w-full"
        >
          Done
        </Button>
      </div>
    </div>
  );
}
