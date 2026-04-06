'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import GlassCard from '@/components/ui/GlassCard';
import PocketAvatar from '@/components/ui/PocketAvatar';
import Button from '@/components/ui/Button';
import TierBadge from '@/components/profile/TierBadge';
import CorridorBadge from '@/components/profile/CorridorBadge';
import type { Tier } from '@/lib/tier-system';
import EvryWherMark from '@/components/EvryWherMark';

interface Props {
  inviter: any;
  code: string;
}

export default function InviteClient({ inviter, code }: Props) {
  const tier = (inviter.tier || 'starter') as Tier;
  const corridors = inviter.operating_corridors || [];
  const services = (inviter.services || []).slice(0, 3);
  const router = useRouter();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setIsLoggedIn(true);
    });
  }, []);

  async function handleAccept() {
    setAccepting(true);
    setError('');
    try {
      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.success) {
        setAccepted(true);
        setTimeout(() => router.push('/chat'), 1500);
      } else if (data.already_connected) {
        setError('You are already connected!');
        setTimeout(() => router.push('/chat'), 1500);
      } else {
        setError(data.error || 'Failed to connect');
      }
    } catch {
      setError('Network error — try again');
    }
    setAccepting(false);
  }

  return (
    <div className="min-h-screen bg-[var(--pm-surface-1)] flex flex-col items-center justify-center px-6 py-12">
      <div className="flex items-center gap-2 mb-8">
        <span className="text-2xl">{'\u{1F30D}'}</span>
        <EvryWherMark size="md" />
      </div>

      <div className="w-full max-w-sm">
        <GlassCard>
          <div className="space-y-5">
            <p className="text-center text-sm text-[var(--pm-text-secondary)]">You've been invited by</p>

            <div className="flex flex-col items-center text-center">
              <PocketAvatar
                src={inviter.avatar_url}
                name={inviter.display_name || 'BP'}
                size="xl"
                tier={tier}
              />
              <h2 className="text-xl font-bold text-[var(--pm-text-primary)] mt-3">{inviter.display_name}</h2>
              {inviter.title && <p className="text-sm text-[var(--pm-text-secondary)] mt-0.5">{inviter.title}</p>}
              {inviter.company_name && <p className="text-xs text-[var(--pm-text-tertiary)] mt-0.5">{inviter.company_name}</p>}
              <div className="mt-2">
                <TierBadge tier={tier} trustScore={inviter.trust_score} size="sm" />
              </div>
            </div>

            {corridors.length > 0 && (
              <div className="flex justify-center gap-2 flex-wrap">
                {corridors.map((c: any, i: number) => (
                  <CorridorBadge key={i} fromFlag={c.flag_from} toFlag={c.flag_to} from={c.from} to={c.to} variant="card" pulseStrength="gentle" />
                ))}
              </div>
            )}

            {services.length > 0 && (
              <div className="flex justify-center gap-1.5 flex-wrap">
                {services.map((s: string, i: number) => (
                  <span key={i} className="text-[10px] bg-indigo-950/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                    {s}
                  </span>
                ))}
              </div>
            )}

            <GlassCard tier="starter" glow>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{'\u{1F6E1}\uFE0F'}</span>
                <p className="text-sm text-[var(--pm-text-primary)]">
                  <span className="font-semibold text-amber-400">You both earn +15 Trust Score</span> when you publish your profile.
                </p>
              </div>
            </GlassCard>

            {/* CTA — different for logged-in vs. new users */}
            {error && (
              <p className="text-center text-sm text-amber-400">{error}</p>
            )}

            {accepted ? (
              <div className="text-center py-2">
                <p className="text-sm font-semibold text-[#16A34A]">Connected! Redirecting to chat...</p>
              </div>
            ) : isLoggedIn ? (
              <Button variant="primary" size="xl" className="w-full" onClick={handleAccept} disabled={accepting}>
                {accepting ? 'Connecting...' : 'Add to Contacts'}
              </Button>
            ) : (
              <Link href={`/signup?ref=${code}`} className="block no-underline">
                <Button variant="primary" size="xl" className="w-full">
                  Join Evrywher {'\u2192'}
                </Button>
              </Link>
            )}
          </div>
        </GlassCard>
      </div>

      {!isLoggedIn && (
        <div className="mt-8 text-center">
          <p className="text-xs text-[var(--pm-text-tertiary)]">Already have an account?</p>
          <Link href="/login" className="text-xs text-indigo-400 font-semibold no-underline hover:underline">Log in</Link>
        </div>
      )}
    </div>
  );
}
