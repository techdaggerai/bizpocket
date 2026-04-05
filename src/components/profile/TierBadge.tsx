'use client';

import { useEffect, useState, useRef } from 'react';
import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';
import GlassCard from '@/components/ui/GlassCard';

interface TierBadgeProps {
  tier: Tier;
  trustScore?: number;
  badge?: BadgeTier;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  upgrading?: boolean;
}

const TIER_DATA: Record<Tier, { emoji: string; label: string; color: string; textColor: string; maxScore: number }> = {
  starter: { emoji: '\u{1F331}', label: 'New Business', color: 'amber', textColor: 'text-amber-600 text-amber-400', maxScore: 40 },
  growing: { emoji: '\u{1F33F}', label: 'Growing Business', color: 'blue', textColor: 'text-blue-600 text-blue-400', maxScore: 75 },
  established: { emoji: '\u{1F333}', label: 'Established Business', color: 'emerald', textColor: 'text-emerald-600 text-emerald-400', maxScore: 100 },
};

const BADGE_ICON: Record<BadgeTier, string> = {
  none: '',
  activity_verified: '\u{1F535}',
  id_verified: '\u{1F7E2}',
};

/** Spring-physics count-up: overshoots ~8% then settles. */
function useSpringCount(target: number, enabled: boolean, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (!enabled) { setValue(target); return; }
    const start = performance.now();
    function tick(now: number) {
      const t = Math.min((now - start) / duration, 1);
      // Spring easing: overshoot then settle
      const spring = t < 1
        ? 1 - Math.pow(1 - t, 3) * Math.cos(t * Math.PI * 0.8)
        : 1;
      setValue(Math.round(target * spring));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, enabled, duration]);

  return value;
}

export default function TierBadge({
  tier,
  trustScore = 0,
  badge = 'none',
  size = 'md',
  animated = true,
  upgrading = false,
}: TierBadgeProps) {
  const data = TIER_DATA[tier];
  const displayScore = useSpringCount(trustScore, animated);
  const badgeIcon = BADGE_ICON[badge];

  const emojiAnimation = upgrading
    ? 'animate-[tierCelebrate_600ms_var(--ease-bounce)]'
    : 'animate-[emojiFloat_3s_ease-in-out_infinite]';

  /* ── SM: inline format ── */
  if (size === 'sm') {
    return (
      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${data.textColor}`}>
        <span className={emojiAnimation}>{data.emoji}</span>
        <span>{displayScore}</span>
        {badgeIcon && <span className="ml-0.5">{badgeIcon}</span>}
      </span>
    );
  }

  /* ── MD: match card format ── */
  if (size === 'md') {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className={emojiAnimation}>{data.emoji}</span>
          <span className={`text-sm font-semibold ${data.textColor}`}>{data.label}</span>
          {badgeIcon && <span>{badgeIcon}</span>}
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-[13px]">{'\u{1F6E1}\uFE0F'}</span>
          <span className={`font-bold ${data.textColor}`}>{displayScore}</span>
          <span className="text-[var(--pm-text-tertiary)] text-xs">/{data.maxScore}</span>
        </div>
      </div>
    );
  }

  /* ── LG: profile page with GlassCard ── */
  return (
    <GlassCard tier={tier} glow>
      <div className="space-y-3">
        {/* Header */}
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--pm-text-tertiary)]">
          {'\u{1F6E1}\uFE0F'} Trust Score
        </p>

        {/* Large score */}
        <div className="flex items-baseline gap-2">
          <span
            className={`text-3xl font-bold ${data.textColor}`}
            style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700 }}
          >
            {displayScore}
          </span>
          <span className="text-sm text-[var(--pm-text-tertiary)]">/ {data.maxScore}</span>
        </div>

        {/* Trust fill bar */}
        <TrustFill score={trustScore} maxScore={data.maxScore} tier={tier} animated={animated} />

        {/* Tier + badge row */}
        <div className="flex items-center gap-2 pt-1">
          <span className={`text-lg ${emojiAnimation}`}>{data.emoji}</span>
          <span className={`text-sm font-semibold ${data.textColor}`}>{data.label}</span>
          {badgeIcon && <span className="text-sm">{badgeIcon}</span>}
        </div>
      </div>
    </GlassCard>
  );
}

/** Inline trust fill bar for the LG badge */
function TrustFill({ score, maxScore, tier, animated }: { score: number; maxScore: number; tier: Tier; animated: boolean }) {
  const [width, setWidth] = useState(0);
  const pct = Math.min(100, (score / maxScore) * 100);

  useEffect(() => {
    if (!animated) { setWidth(pct); return; }
    const t = setTimeout(() => setWidth(pct), 50);
    return () => clearTimeout(t);
  }, [pct, animated]);

  const gradients: Record<Tier, string> = {
    starter: 'from-amber-300 to-amber-500',
    growing: 'from-blue-300 to-blue-500',
    established: 'from-emerald-300 to-emerald-500',
  };

  return (
    <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${gradients[tier]} transition-[width] duration-[1200ms] [transition-timing-function:var(--ease-out)]`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
