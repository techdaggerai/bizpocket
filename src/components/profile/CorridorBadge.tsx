'use client';

type CorridorType = 'trade' | 'services' | 'investment';
type Variant = 'inline' | 'card' | 'hero';
type PulseStrength = 'none' | 'gentle' | 'strong';

interface CorridorBadgeProps {
  fromFlag: string;
  toFlag: string;
  label?: string;
  type?: CorridorType;
  variant?: Variant;
  pulseStrength?: PulseStrength;
  /** @deprecated Use fromFlag/toFlag — kept for backward compat */
  from?: string;
  /** @deprecated Use fromFlag/toFlag — kept for backward compat */
  to?: string;
  /** @deprecated Use fromFlag — kept for backward compat */
  flagFrom?: string;
  /** @deprecated Use toFlag — kept for backward compat */
  flagTo?: string;
}

const TYPE_LABEL: Record<CorridorType, string> = {
  trade: 'Trade',
  services: 'Services',
  investment: 'Investment',
};

const PULSE_DURATION: Record<PulseStrength, string> = {
  none: '',
  gentle: '3s',
  strong: '1.5s',
};

export default function CorridorBadge({
  fromFlag,
  toFlag,
  label,
  type,
  variant = 'inline',
  pulseStrength = 'gentle',
  from,
  to,
  flagFrom,
  flagTo,
}: CorridorBadgeProps) {
  // Backward compat: old API used flagFrom/flagTo + from/to
  const resolvedFromFlag = fromFlag || flagFrom || '';
  const resolvedToFlag = toFlag || flagTo || '';
  const resolvedLabel = label || (from && to ? `${from} \u2194 ${to}` : undefined);

  const arrowAnimation = pulseStrength !== 'none'
    ? { animation: `corridorPulse ${PULSE_DURATION[pulseStrength]} ease-in-out infinite` }
    : {};

  /* ── INLINE: compact for chat headers ── */
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1" aria-label={resolvedLabel || `${resolvedFromFlag} to ${resolvedToFlag} corridor`}>
        <span className="text-base">{resolvedFromFlag}</span>
        <span className="text-xs text-[var(--pm-text-tertiary)]" style={arrowAnimation}>{'\u2194'}</span>
        <span className="text-base">{resolvedToFlag}</span>
      </span>
    );
  }

  /* ── CARD: pill with details ── */
  if (variant === 'card') {
    return (
      <div
        className="inline-flex items-center gap-2.5 rounded-full border border-dashed border-slate-700 bg-slate-800/50 px-3.5 py-2"
        aria-label={resolvedLabel || `${resolvedFromFlag} to ${resolvedToFlag} corridor`}
      >
        <span className="text-lg">{resolvedFromFlag}</span>
        <span className="text-sm text-[var(--pm-text-tertiary)]" style={arrowAnimation}>{'\u2194'}</span>
        <span className="text-lg">{resolvedToFlag}</span>
        {resolvedLabel && (
          <span className="text-xs font-medium text-[var(--pm-text-secondary)] ml-0.5">{resolvedLabel}</span>
        )}
        {type && (
          <span className="text-[10px] font-semibold text-indigo-600 text-indigo-400 bg-indigo-50 bg-indigo-950/40 px-2 py-0.5 rounded-full">
            {TYPE_LABEL[type]}
          </span>
        )}
      </div>
    );
  }

  /* ── HERO: large format for public profiles ── */
  return (
    <div className="flex flex-col items-center gap-2" aria-label={resolvedLabel || `${resolvedFromFlag} to ${resolvedToFlag} corridor`}>
      <div className="flex items-center gap-3">
        <span className="text-3xl">{resolvedFromFlag}</span>
        <span
          className="text-xl font-bold text-[var(--pm-text-tertiary)]"
          style={{
            ...arrowAnimation,
            letterSpacing: '0.1em',
          }}
        >
          {'\u2194'}
        </span>
        <span className="text-3xl">{resolvedToFlag}</span>
      </div>
      {resolvedLabel && (
        <span
          className="text-sm font-semibold text-[var(--pm-text-secondary)]"
          style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 600 }}
        >
          {resolvedLabel}
        </span>
      )}
      {type && (
        <span className="text-[11px] font-semibold text-indigo-600 text-indigo-400 bg-indigo-50 bg-indigo-950/40 px-2.5 py-1 rounded-full">
          {TYPE_LABEL[type]}
        </span>
      )}
    </div>
  );
}
