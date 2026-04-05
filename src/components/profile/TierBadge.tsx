'use client';

import type { Tier } from '@/lib/tier-system';

interface TierBadgeProps {
  tier: Tier;
  trustScore?: number;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_CONFIG: Record<Tier, { emoji: string; label: string; bg: string; text: string; border: string; darkBg: string; darkText: string; darkBorder: string }> = {
  starter: {
    emoji: '\u{1F331}', label: 'New Business',
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    darkBg: 'dark:bg-amber-950/40', darkText: 'dark:text-amber-300', darkBorder: 'dark:border-amber-800',
  },
  growing: {
    emoji: '\u{1F33F}', label: 'Growing Business',
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200',
    darkBg: 'dark:bg-blue-950/40', darkText: 'dark:text-blue-300', darkBorder: 'dark:border-blue-800',
  },
  established: {
    emoji: '\u{1F333}', label: 'Established Business',
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    darkBg: 'dark:bg-emerald-950/40', darkText: 'dark:text-emerald-300', darkBorder: 'dark:border-emerald-800',
  },
};

const SIZE_CLASSES = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-3 py-1.5 gap-1.5',
  lg: 'text-base px-4 py-2 gap-2',
};

export default function TierBadge({ tier, trustScore, size = 'md' }: TierBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.starter;

  return (
    <span className={`inline-flex items-center font-semibold rounded-full border ${config.bg} ${config.text} ${config.border} ${config.darkBg} ${config.darkText} ${config.darkBorder} ${SIZE_CLASSES[size]}`}>
      <span>{config.emoji}</span>
      <span>{config.label}</span>
      {trustScore !== undefined && (
        <span className="opacity-70 font-normal ml-0.5">({trustScore})</span>
      )}
    </span>
  );
}
