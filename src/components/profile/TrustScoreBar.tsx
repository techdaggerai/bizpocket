'use client';

import { useEffect, useState } from 'react';
import type { Tier } from '@/lib/tier-system';

interface TrustScoreBarProps {
  score: number;
  maxScore?: number;
  tier: Tier;
  showBreakdown?: boolean;
}

const TIER_COLORS: Record<Tier, { bar: string; track: string }> = {
  starter: { bar: 'bg-amber-500', track: 'bg-amber-100 dark:bg-amber-950/50' },
  growing: { bar: 'bg-blue-500', track: 'bg-blue-100 dark:bg-blue-950/50' },
  established: { bar: 'bg-emerald-500', track: 'bg-emerald-100 dark:bg-emerald-950/50' },
};

export default function TrustScoreBar({ score, maxScore = 100, tier, showBreakdown }: TrustScoreBarProps) {
  const [animatedWidth, setAnimatedWidth] = useState(0);
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const colors = TIER_COLORS[tier] || TIER_COLORS.starter;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedWidth(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-2)] dark:text-gray-300">Trust Score</span>
        <span className="text-sm font-bold text-[var(--text-1)] dark:text-white">{score}<span className="text-xs font-normal text-[var(--text-3)] dark:text-gray-400">/{maxScore}</span></span>
      </div>
      <div className={`h-2.5 rounded-full overflow-hidden ${colors.track}`}>
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
          style={{ width: `${animatedWidth}%` }}
        />
      </div>
      {showBreakdown && (
        <div className="flex justify-between text-[10px] text-[var(--text-3)] dark:text-gray-500 px-0.5">
          <span>0</span>
          <span>20</span>
          <span>45</span>
          <span>76</span>
          <span>100</span>
        </div>
      )}
    </div>
  );
}
