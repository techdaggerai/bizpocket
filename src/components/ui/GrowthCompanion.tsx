'use client';

import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';

type Tier = 'starter' | 'growing' | 'established';

interface Suggestion {
  title: string;
  description: string;
  points: number;
  action: string;
  corridor?: { fromFlag: string; toFlag: string };
}

interface GrowthCompanionProps {
  suggestion: Suggestion;
  tier?: Tier;
  onAction: () => void;
  onDismiss: () => void;
}

const TIER_STYLE: Record<Tier, { bg: string; glow: string }> = {
  starter: {
    bg: 'bg-amber-500',
    glow: '0 0 16px rgba(245,158,11,0.35)',
  },
  growing: {
    bg: 'bg-blue-500',
    glow: '0 0 16px rgba(59,130,246,0.35)',
  },
  established: {
    bg: 'bg-emerald-500',
    glow: '0 0 20px rgba(16,185,129,0.45)',
  },
};

export default function GrowthCompanion({
  suggestion,
  tier = 'starter',
  onAction,
  onDismiss,
}: GrowthCompanionProps) {
  const [expanded, setExpanded] = useState(false);
  const style = TIER_STYLE[tier];

  /* ── COLLAPSED: tiny orb ── */
  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className={[
          'fixed bottom-[148px] right-4 z-40',
          'w-11 h-11 rounded-full flex items-center justify-center',
          style.bg, 'text-white',
          'animate-[companionAppear_500ms_var(--ease-spring)_both]',
        ].join(' ')}
        style={{ boxShadow: style.glow }}
        aria-label="Smart suggestion available"
      >
        <Sparkles size={18} />
      </button>
    );
  }

  /* ── EXPANDED: suggestion card ── */
  return (
    <div
      className={[
        'fixed bottom-[148px] right-4 z-40',
        'w-[300px] rounded-[20px]',
        'bg-white/[0.85] dark:bg-slate-900/[0.85]',
        'backdrop-blur-[24px]',
        'border border-white/60 dark:border-white/10',
        'p-4 space-y-3',
        'animate-[companionAppear_500ms_var(--ease-spring)_both]',
      ].join(' ')}
      style={{
        boxShadow: 'var(--glass-shadow)',
      }}
      role="status"
      aria-label="Smart suggestion"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-500" />
          <span className="text-[11px] font-semibold text-[var(--pm-text-tertiary)] uppercase tracking-wide">
            Smart suggestion
          </span>
        </div>
        <button
          onClick={() => { setExpanded(false); onDismiss(); }}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          aria-label="Dismiss suggestion"
        >
          <X size={14} className="text-[var(--pm-text-tertiary)]" />
        </button>
      </div>

      {/* Corridor */}
      {suggestion.corridor && (
        <div className="flex items-center gap-1 text-sm">
          <span>{suggestion.corridor.fromFlag}</span>
          <span className="text-[var(--pm-text-tertiary)] text-xs">{'\u2194'}</span>
          <span>{suggestion.corridor.toFlag}</span>
        </div>
      )}

      {/* Title + description */}
      <div>
        <p className="text-sm font-semibold text-[var(--pm-text-primary)]">
          {suggestion.title}
        </p>
        <p className="text-xs text-[var(--pm-text-secondary)] leading-relaxed mt-0.5">
          {suggestion.description}
        </p>
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => { onAction(); setExpanded(false); }}
          className="flex-1 h-9 rounded-[20px] bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-[0.97] transition-all duration-200 animate-[predictPulse_2s_infinite]"
        >
          {suggestion.action}
        </button>
        <span
          className="text-sm font-bold text-emerald-600 dark:text-emerald-400"
          style={{ fontFamily: 'var(--font-display), sans-serif' }}
        >
          +{suggestion.points}
        </span>
      </div>
    </div>
  );
}
