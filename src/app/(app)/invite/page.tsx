'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/lib/supabase-client';
import PageHeader from '@/components/ui/PageHeader';
import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';
import PocketAvatar from '@/components/ui/PocketAvatar';
import type { Tier } from '@/lib/tier-system';
import dynamic from 'next/dynamic';

const QRCodeCanvas = dynamic(
  () => import('qrcode.react').then((mod) => mod.QRCodeCanvas),
  { ssr: false }
);

export default function InvitePage() {
  const router = useRouter();
  const { user, profile, organization } = useAuth();
  const supabase = createClient();

  const [shareToken, setShareToken] = useState('');
  const [trustScore, setTrustScore] = useState(0);
  const [tier, setTier] = useState<Tier>('starter');
  const [corridors, setCorridors] = useState('');
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: gp } = await supabase
        .from('global_profiles')
        .select('share_token, trust_score, tier, operating_corridors')
        .eq('user_id', user.id)
        .single();

      if (gp) {
        setShareToken(gp.share_token || '');
        setTrustScore(gp.trust_score || 0);
        setTier((gp.tier || 'starter') as Tier);
        const corrs = (gp.operating_corridors || [])
          .map((c: any) => `${c.flag_from} ${c.from} \u2194 ${c.flag_to} ${c.to}`)
          .join('\n');
        setCorridors(corrs);
      }

      const { data: refs } = await supabase
        .from('referrals')
        .select('id, invitee_id, trust_awarded, published_at, created_at')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false });

      if (refs && refs.length > 0) {
        const inviteeIds = refs.map((r: any) => r.invitee_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, full_name, avatar_url')
          .in('user_id', inviteeIds);

        const profileMap = new Map(
          (profiles || []).map((p: any) => [p.user_id, p])
        );

        setReferrals(refs.map((r: any) => {
          const p = profileMap.get(r.invitee_id);
          return { ...r, name: p?.full_name || p?.name || 'User', avatar_url: p?.avatar_url };
        }));
      }

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const inviteUrl = shareToken ? `https://evrywher.io/invite/${shareToken}` : 'https://evrywher.io';
  const tierEmoji = tier === 'established' ? '\u{1F333}' : tier === 'growing' ? '\u{1F33F}' : '\u{1F331}';
  const tierLabel = tier === 'established' ? 'Established' : tier === 'growing' ? 'Growing' : 'New Business';

  const shareMessage = `\u{1F30D} I use Evrywher for cross-border business.

\u{1F6E1}\uFE0F Trust Score: ${trustScore} \u00B7 ${tierEmoji} ${tierLabel}
${corridors ? corridors + '\n' : ''}
Build your verified profile:
\u{1F517} ${inviteUrl}

We both get +15 Trust Score when you publish.`;

  function handleCopy() {
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  }

  function handleLINE() {
    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareMessage)}`, '_blank');
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const publishedCount = referrals.filter(r => r.trust_awarded).length;
  const pendingCount = referrals.filter(r => !r.trust_awarded).length;

  return (
    <div className="min-h-screen">
      <PageHeader title={'\u{1F4E4} Grow Your Network'} />

      <div className="px-4 py-4 pb-28 space-y-4">
        {/* No profile warning */}
        {!shareToken && (
          <GlassCard tier="starter" glow>
            <p className="text-sm text-amber-300">
              Build and publish your Global Profile first to get your invite link.
            </p>
            <Button variant="primary" size="sm" onClick={() => router.push('/profile/build')} className="mt-2">
              Build Profile →
            </Button>
          </GlassCard>
        )}

        {/* Trust reward */}
        <GlassCard tier="starter" glow>
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">{'\u{1F6E1}\uFE0F'}</span>
            <div>
              <p className="text-base font-bold text-[var(--pm-text-primary)]">+15 Trust Score Each</p>
              <p className="text-sm text-[var(--pm-text-secondary)] mt-1">
                You both earn +15 Trust Score when your invite publishes their profile.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Share buttons */}
        {shareToken && (
          <div className="space-y-2.5">
            <GlassCard onClick={handleWhatsApp} elevated>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
                {'\u{1F4F1}'} Share via WhatsApp
              </div>
            </GlassCard>

            <GlassCard onClick={handleLINE} elevated>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
                {'\u{1F4AC}'} Share via LINE
              </div>
            </GlassCard>

            <GlassCard onClick={handleCopy} elevated>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
                {'\u{1F4CB}'} {copied ? 'Copied!' : 'Copy Invite Link'}
              </div>
            </GlassCard>

            <GlassCard onClick={() => setShowQR(!showQR)} elevated>
              <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--pm-text-primary)]">
                {'\u{1F4F2}'} {showQR ? 'Hide QR Code' : 'Show QR Code'}
              </div>
            </GlassCard>
          </div>
        )}

        {/* QR Code */}
        {showQR && shareToken && (
          <GlassCard className="animate-[cardSlideUp_300ms_var(--ease-out)_both]">
            <div className="flex flex-col items-center py-2">
              <QRCodeCanvas value={inviteUrl} size={180} level="H" includeMargin />
              <p className="text-xs text-[var(--pm-text-tertiary)] mt-3 font-mono">{inviteUrl}</p>
            </div>
          </GlassCard>
        )}

        {/* Referrals list */}
        {referrals.length > 0 && (
          <GlassCard>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[var(--pm-text-primary)]">Your Referrals</h3>

              {/* Stats */}
              <p className="text-xs text-[var(--pm-text-tertiary)]">
                {'\u{1F4E9}'} {referrals.length} invite{referrals.length !== 1 ? 's' : ''} sent{' '}
                {'\u00B7'} {publishedCount + pendingCount} joined{' '}
                {'\u00B7'} {publishedCount} published
              </p>

              {/* List */}
              <div className="space-y-2">
                {referrals.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 py-2 border-b border-[var(--pm-surface-3)] last:border-0">
                    <PocketAvatar name={r.name} src={r.avatar_url} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-[var(--pm-text-primary)] truncate">{r.name}</p>
                      <p className="text-[10px] text-[var(--pm-text-tertiary)]">
                        {r.trust_awarded
                          ? '\u2705 Published \u00B7 +15 earned'
                          : '\u23F3 Signed up \u00B7 pending publish'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
