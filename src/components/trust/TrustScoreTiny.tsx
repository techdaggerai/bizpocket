'use client';

import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';
import TierBadge from '@/components/profile/TierBadge';

interface TrustScoreTinyProps {
  score: number;
  tier: Tier;
  badgeTier?: BadgeTier;
  upgrading?: boolean;
}

/** SM inline format: 🌱 28  |  🌿 62 🔵  |  🌳 91 🟢 */
export default function TrustScoreTiny({ score, tier, badgeTier = 'none', upgrading }: TrustScoreTinyProps) {
  return (
    <TierBadge
      tier={tier}
      trustScore={score}
      badge={badgeTier}
      size="sm"
      animated={false}
      upgrading={upgrading}
    />
  );
}
