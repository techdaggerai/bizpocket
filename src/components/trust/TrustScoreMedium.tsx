'use client';

import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';

interface TrustScoreMediumProps {
  score: number;
  tier: Tier;
  badgeTier?: BadgeTier;
  upgrading?: boolean;
}

const TIER_MAX: Record<Tier, number> = {
  starter: 40,
  growing: 75,
  established: 100,
};

/** MD card format: emoji + label + badge, bar underneath */
export default function TrustScoreMedium({ score, tier, badgeTier = 'none', upgrading }: TrustScoreMediumProps) {
  return (
    <div className="space-y-2">
      <TierBadge
        tier={tier}
        trustScore={score}
        badge={badgeTier}
        size="md"
        animated
        upgrading={upgrading}
      />
      <TrustScoreBar
        score={score}
        maxScore={TIER_MAX[tier]}
        tier={tier}
        size="md"
        animated
      />
    </div>
  );
}
