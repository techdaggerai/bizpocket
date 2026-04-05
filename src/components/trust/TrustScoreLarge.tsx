'use client';

import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';
import TierBadge from '@/components/profile/TierBadge';

interface TrustScoreLargeProps {
  score: number;
  tier: Tier;
  badgeTier?: BadgeTier;
  upgrading?: boolean;
}

/** LG profile format: GlassCard with full trust score display + fill bar */
export default function TrustScoreLarge({ score, tier, badgeTier = 'none', upgrading }: TrustScoreLargeProps) {
  return (
    <TierBadge
      tier={tier}
      trustScore={score}
      badge={badgeTier}
      size="lg"
      animated
      upgrading={upgrading}
    />
  );
}
