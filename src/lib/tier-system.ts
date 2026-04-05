// ═══════════════════════════════════════════════════════════
// Spaceship — Tier Classification System (pure logic, no AI)
// ═══════════════════════════════════════════════════════════

export type Tier = 'starter' | 'growing' | 'established'

export interface TierInfo {
  tier: Tier
  label: string
  emoji: string
  color: string
  trustFloor: number
  trustCeiling: number
  matchesPerDay: number
}

const TIERS: Record<Tier, TierInfo> = {
  established: {
    tier: 'established',
    label: 'Established Business',
    emoji: '🌳',
    color: 'emerald',
    trustFloor: 76,
    trustCeiling: 100,
    matchesPerDay: 5,
  },
  growing: {
    tier: 'growing',
    label: 'Growing Business',
    emoji: '🌿',
    color: 'blue',
    trustFloor: 45,
    trustCeiling: 75,
    matchesPerDay: 5,
  },
  starter: {
    tier: 'starter',
    label: 'New Business',
    emoji: '🌱',
    color: 'amber',
    trustFloor: 20,
    trustCeiling: 40,
    matchesPerDay: 3,
  },
}

export function detectTier(data: {
  invoices_sent: number
  has_tax_id: boolean
  has_basic_tax_info: boolean
}): TierInfo {
  if (data.invoices_sent >= 50 && data.has_tax_id) {
    return TIERS.established
  }
  if (data.invoices_sent >= 11 || data.has_basic_tax_info) {
    return TIERS.growing
  }
  return TIERS.starter
}

export function getMatchLimit(
  daysSinceSignup: number,
  tier: TierInfo,
  plan: string
): number {
  if (daysSinceSignup <= 7) return 999 // first week unlimited
  if (plan === 'pro' || plan === 'business') {
    return tier.tier === 'starter' ? 5 : 999
  }
  return tier.matchesPerDay
}

export function canShareBizCard(
  tier: Tier,
  trustScore: number,
  isPublished: boolean
): boolean {
  return tier !== 'starter' && trustScore >= 60 && isPublished
}

export function getTierByName(tier: Tier): TierInfo {
  return TIERS[tier]
}
