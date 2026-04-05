'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';
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
  const [tierInfo, setTierInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [celebrationDone, setCelebrationDone] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/profile/me');
        const json = await res.json();
        if (json.profile) {
          setProfileData(json.profile);
          setTierInfo(json.tierInfo);
        }
      } catch {
        // Profile fetch failed — continue with defaults
      } finally {
        setLoading(false);
      }
    }
    load();
    // Celebration animation timer
    setTimeout(() => setCelebrationDone(true), 2000);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
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
      {/* Celebration */}
      <div className={`text-center mb-6 transition-all duration-700 ${celebrationDone ? 'scale-100 opacity-100' : 'scale-110 opacity-0'}`}>
        <div className="text-6xl mb-4">{'\u{1F389}'}</div>
        <h1 className="text-2xl font-bold text-[var(--text-1)] dark:text-white">Your profile is live!</h1>
        <p className="text-sm text-[var(--text-2)] dark:text-gray-300 mt-2">The world can now find and verify your business.</p>
      </div>

      {/* Tier + Trust */}
      <div className="w-full bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-5 space-y-4 mb-4">
        <div className="flex items-center justify-center">
          <TierBadge tier={tier} trustScore={trustScore} size="lg" />
        </div>
        <TrustScoreBar score={trustScore} tier={tier} />
      </div>

      {/* Share buttons */}
      <div className="w-full space-y-2.5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-3)] dark:text-gray-400 text-center">Share your profile</p>

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
          <span>{'\u{1F4CB}'}</span> {copied ? 'Copied!' : 'Copy Link'}
        </button>

        <button
          onClick={() => setShowQR(!showQR)}
          className="w-full flex items-center justify-center gap-2 bg-[#F9FAFB] dark:bg-gray-800 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 text-[var(--text-1)] dark:text-gray-200 font-semibold py-3.5 rounded-xl border border-[#E5E5E5] dark:border-gray-700 transition-colors"
        >
          <span>{'\u{1F4F2}'}</span> {showQR ? 'Hide QR Code' : 'Show QR Code'}
        </button>
      </div>

      {/* QR Code */}
      {showQR && (
        <div className="w-full flex flex-col items-center bg-white dark:bg-gray-900 rounded-2xl border border-[#E5E5E5] dark:border-gray-700 p-6 mb-6">
          <QRCodeCanvas value={profileUrl} size={200} level="H" includeMargin />
          <p className="text-xs text-[var(--text-3)] dark:text-gray-400 mt-3 font-mono">{profileUrl}</p>
        </div>
      )}

      {/* Referral callout */}
      <div className="w-full bg-gradient-to-r from-[#EEF2FF] to-[#FEF3C7] dark:from-indigo-950/30 dark:to-amber-950/30 rounded-2xl border border-[#C7D2FE] dark:border-indigo-800 p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-xl flex-shrink-0">{'\u{1F6E1}\uFE0F'}</span>
          <p className="text-sm text-[var(--text-1)] dark:text-gray-200">
            <span className="font-semibold">You both earn +15 Trust Score</span> when someone you invite publishes their profile.
          </p>
        </div>
      </div>

      {/* Navigation buttons */}
      <div className="w-full space-y-2.5 mt-auto">
        <button
          onClick={() => router.push('/matches')}
          className="w-full bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold py-4 rounded-xl transition-colors active:scale-[0.98]"
        >
          Find Partners {'\u2192'}
        </button>
        <button
          onClick={() => router.push('/dashboard')}
          className="w-full bg-[#F9FAFB] dark:bg-gray-800 hover:bg-[#F3F4F6] dark:hover:bg-gray-700 text-[var(--text-1)] dark:text-gray-200 font-semibold py-3.5 rounded-xl border border-[#E5E5E5] dark:border-gray-700 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
