'use client';

import { useEffect, useState } from 'react';
import type { Tier } from '@/lib/tier-system';

interface TrustScoreBarProps {
  score: number;
  maxScore?: number;
  tier: Tier;
  animated?: boolean;
  showNumber?: boolean;
  showMilestones?: boolean;
  showBreakdown?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_GRADIENT: Record<Tier, string> = {
  starter: 'from-amber-300 to-amber-500',
  growing: 'from-blue-300 to-blue-500',
  established: 'from-emerald-300 to-emerald-500',
};

const TIER_TEXT: Record<Tier, string> = {
  starter: 'text-amber-600 dark:text-amber-400',
  growing: 'text-blue-600 dark:text-blue-400',
  established: 'text-emerald-600 dark:text-emerald-400',
};

const SIZE_H: Record<string, string> = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2',
};

const MILESTONES = [
  { pct: 40, label: 'Starter ceiling' },
  { pct: 50, label: 'Badge threshold' },
  { pct: 75, label: 'Growing ceiling' },
];

export default function TrustScoreBar({
  score,
  maxScore = 100,
  tier,
  animated = true,
  showNumber = false,
  showMilestones = false,
  size = 'md',
}: TrustScoreBarProps) {
  const [fillWidth, setFillWidth] = useState(0);
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));

  useEffect(() => {
    if (!animated) { setFillWidth(pct); return; }
    const t = setTimeout(() => setFillWidth(pct), 50);
    return () => clearTimeout(t);
  }, [pct, animated]);

  return (
    <div className="space-y-1" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={maxScore} aria-label={`Trust score: ${score} out of ${maxScore}`}>
      {/* Number display */}
      {showNumber && size !== 'sm' && (
        <div className="flex items-baseline justify-between">
          <span
            className={`text-sm font-bold ${TIER_TEXT[tier]}`}
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            {score}
          </span>
          <span className="text-xs text-gray-400">/{maxScore}</span>
        </div>
      )}

      {/* Bar */}
      <div className={`relative ${SIZE_H[size]} rounded-full bg-gray-200 dark:bg-gray-700 overflow-visible`}>
        <div
          className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${TIER_GRADIENT[tier]} transition-[width] duration-[1200ms] [transition-timing-function:var(--ease-out)]`}
          style={{ width: `${fillWidth}%` }}
        />

        {/* Milestones */}
        {showMilestones && MILESTONES.map((m) => (
          <div
            key={m.pct}
            className="absolute top-0 bottom-0 w-px bg-gray-400/40 dark:bg-gray-500/40"
            style={{ left: `${m.pct}%` }}
            title={m.label}
          />
        ))}
      </div>
    </div>
  );
}
