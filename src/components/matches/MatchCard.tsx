'use client';

import { useState, useEffect } from 'react';
import GlassCard from '@/components/ui/GlassCard';
import PocketAvatar from '@/components/ui/PocketAvatar';
import TierBadge from '@/components/profile/TierBadge';
import CorridorBadge from '@/components/profile/CorridorBadge';
import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';

interface MatchCardProps {
  match: any;
  index?: number;
  onConnect: (id: string) => Promise<void>;
  onDismiss: (id: string) => Promise<void>;
}

type ConnectPhase = 'idle' | 'connecting' | 'glowing' | 'connected' | 'done';

function scoreColor(score: number): string {
  if (score > 70) return 'text-emerald-600 dark:text-emerald-400';
  if (score > 50) return 'text-blue-600 dark:text-blue-400';
  return 'text-amber-600 dark:text-amber-400';
}

export default function MatchCard({ match, index = 0, onConnect, onDismiss }: MatchCardProps) {
  const [phase, setPhase] = useState<ConnectPhase>('idle');
  const [dismissing, setDismissing] = useState(false);
  const busy = phase !== 'idle' || dismissing;

  // Resolve fields — support both structured and raw DB objects
  const id: string = match.id;
  const tier = (match.matched_tier || match.tier || 'starter') as Tier;
  const badge = (match.matched_badge_tier || match.badge_tier || 'none') as BadgeTier;
  const trustScore: number = match.matched_trust_score || match.trust_score || 0;
  const displayName: string = match.display_name || 'Business Professional';
  const title: string = match.matched_title || match.title || '';
  const city: string = match.city || '';
  const avatarUrl: string | undefined = match.avatar_url;
  const matchScore: number = match.match_score || 0;
  const matchReason: string = match.match_reason || (match.match_reasons || []).slice(0, 2).join(' · ') || '';
  const languages: string[] = match.languages || [];
  const dealCount: number = match.deal_count || 0;
  const predictedValue: number | undefined = match.predicted_value;
  const corridorTag: string = match.corridor_tag || '';
  const corridorFrom: string = match.corridor?.fromFlag || '';
  const corridorTo: string = match.corridor?.toFlag || '';
  const corridorLabel: string = match.corridor?.label || '';

  const hasCorridorData = corridorFrom && corridorTo;
  const isHighPotential = matchScore > 80 && (predictedValue ?? 0) > 50000;

  // Connect flow
  async function handleConnect() {
    if (busy) return;
    setPhase('connecting');
    try {
      await onConnect(id);
      setPhase('glowing');
      setTimeout(() => setPhase('connected'), 500);
      setTimeout(() => setPhase('done'), 1500);
    } catch {
      setPhase('idle');
    }
  }

  async function handleDismiss() {
    if (busy) return;
    setDismissing(true);
    try {
      await onDismiss(id);
    } catch {
      setDismissing(false);
    }
  }

  // Glow border override
  const glowBorder = phase === 'glowing'
    ? { boxShadow: '0 0 20px rgba(79,70,229,0.5)', transition: 'box-shadow 500ms' }
    : {};

  return (
    <div
      className={[
        'animate-[cardSlideUp_500ms_var(--ease-spring)_both]',
        phase === 'done' ? 'opacity-50 scale-95 transition-all duration-500' : '',
        dismissing ? '-translate-x-full opacity-0 transition-all duration-300' : '',
      ].join(' ')}
      style={{
        animationDelay: `${index * 100}ms`,
        minWidth: 320,
        maxWidth: 380,
      }}
    >
      <GlassCard tier={tier} elevated style={glowBorder}>
        <div className="space-y-3.5">
          {/* 1. Corridor header */}
          {hasCorridorData ? (
            <CorridorBadge
              fromFlag={corridorFrom}
              toFlag={corridorTo}
              label={corridorLabel}
              variant="card"
              pulseStrength={matchScore > 70 ? 'strong' : 'gentle'}
            />
          ) : corridorTag ? (
            <div className="text-center">
              <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">{corridorTag}</span>
            </div>
          ) : null}

          {/* 2. Profile row */}
          <div className="flex items-start gap-3">
            <PocketAvatar
              src={avatarUrl}
              name={displayName}
              size="lg"
              tier={tier}
              badge={badge}
            />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-[var(--pm-text-primary)] truncate">
                {displayName}
              </h3>
              {title && (
                <p className="text-xs text-[var(--pm-text-secondary)] truncate">{title}</p>
              )}
              {city && (
                <p className="text-[11px] text-[var(--pm-text-tertiary)] mt-0.5">{city}</p>
              )}
              <div className="mt-1.5">
                <TierBadge tier={tier} trustScore={trustScore} badge={badge} size="sm" />
              </div>
            </div>
          </div>

          {/* 3. Match score */}
          <div className="flex items-center gap-2">
            <span className="text-sm">{'\u{1F3AF}'}</span>
            <span
              className={`text-xl font-bold ${scoreColor(matchScore)}`}
              style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700 }}
            >
              {matchScore}%
            </span>
            <span className="text-xs text-[var(--pm-text-tertiary)]">match</span>
          </div>

          {/* 4. Predicted deal value */}
          {predictedValue != null && (
            <div className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800 rounded-lg px-2.5 py-1">
              <span className="text-xs">{'\u{1F48E}'}</span>
              <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                Predicted value: {'\u00A5'}{predictedValue >= 1000 ? `${Math.round(predictedValue / 1000)}K` : predictedValue.toLocaleString()}
              </span>
            </div>
          )}

          {/* 5. AI reason */}
          {matchReason && (
            <p className="text-sm text-[var(--pm-text-secondary)] leading-relaxed line-clamp-2">
              {matchReason}
            </p>
          )}

          {/* 6. Quick stats */}
          <div className="flex items-center gap-3 text-xs text-[var(--pm-text-tertiary)]">
            <span>{'\u{1F6E1}\uFE0F'} {trustScore}</span>
            {languages.length > 0 && <span>{'\u{1F310}'} {languages.slice(0, 3).join(', ')}</span>}
            {dealCount > 0 && <span>{'\u2705'} {dealCount} deal{dealCount !== 1 ? 's' : ''}</span>}
          </div>

          {/* High Potential badge */}
          {isHighPotential && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full animate-[predictPulse_2s_infinite]">
              {'\u2728'} HIGH POTENTIAL
            </span>
          )}

          {/* 7. Buttons */}
          {phase === 'connected' || phase === 'done' ? (
            <div className="flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/30 rounded-[20px] h-10 border border-emerald-200 dark:border-emerald-800">
              <span>{'\u{1F389}'}</span>
              <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Connected!</span>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleDismiss}
                disabled={busy}
                className="flex-[0.5] h-10 rounded-[20px] text-sm font-medium border-2 border-gray-200 dark:border-gray-700 text-[var(--pm-text-secondary)] hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
              >
                Not Now
              </button>
              <button
                onClick={handleConnect}
                disabled={busy}
                className="flex-1 h-10 rounded-[20px] text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {phase === 'connecting' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : phase === 'glowing' ? (
                  <>{'\u{1F389}'} Connected!</>
                ) : (
                  <>Connect {'\u2192'}</>
                )}
              </button>
            </div>
          )}
        </div>
      </GlassCard>
    </div>
  );
}
