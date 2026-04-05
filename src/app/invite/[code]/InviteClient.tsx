'use client';

import Link from 'next/link';
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

  return (
    <div className="min-h-screen bg-[var(--pm-surface-1)] flex flex-col items-center justify-center px-6 py-12">
      {/* Evrywher header */}
      <div className="flex items-center gap-2 mb-8">
        <span className="text-2xl">{'\u{1F30D}'}</span>
        <EvryWherMark size="md" />
      </div>

      {/* Invite card */}
      <div className="w-full max-w-sm">
        <GlassCard>
          <div className="space-y-5">
            <p className="text-center text-sm text-[var(--pm-text-secondary)]">You've been invited by</p>

            {/* Inviter profile */}
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

            {/* Corridors */}
            {corridors.length > 0 && (
              <div className="flex justify-center gap-2 flex-wrap">
                {corridors.map((c: any, i: number) => (
                  <CorridorBadge key={i} fromFlag={c.flag_from} toFlag={c.flag_to} from={c.from} to={c.to} variant="card" pulseStrength="gentle" />
                ))}
              </div>
            )}

            {/* Services */}
            {services.length > 0 && (
              <div className="flex justify-center gap-1.5 flex-wrap">
                {services.map((s: string, i: number) => (
                  <span key={i} className="text-[10px] bg-indigo-950/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-800">
                    {s}
                  </span>
                ))}
              </div>
            )}

            {/* Trust reward */}
            <GlassCard tier="starter" glow>
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{'\u{1F6E1}\uFE0F'}</span>
                <p className="text-sm text-[var(--pm-text-primary)]">
                  <span className="font-semibold text-amber-400">You both earn +15 Trust Score</span> when you publish your profile.
                </p>
              </div>
            </GlassCard>

            {/* CTA */}
            <Link href={`/signup?ref=${code}`} className="block no-underline">
              <Button variant="primary" size="xl" className="w-full">
                Join Evrywher {'\u2192'}
              </Button>
            </Link>
          </div>
        </GlassCard>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-[var(--pm-text-tertiary)]">Already have an account?</p>
        <Link href="/login" className="text-xs text-indigo-400 font-semibold no-underline hover:underline">Log in</Link>
      </div>
    </div>
  );
}
