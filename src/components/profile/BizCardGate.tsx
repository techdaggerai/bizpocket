'use client';

import type { Tier } from '@/lib/tier-system';

interface BizCardGateProps {
  currentTrust?: number;
  requiredTrust?: number;
  tier?: Tier;
  nextActions?: { action: string; points: number; icon: string }[];
  onSendInvoice?: () => void;
  onShareProfile?: () => void;
  onDismiss?: () => void;
  /** @deprecated Use currentTrust */
  trustScore?: number;
  /** @deprecated Use onDismiss */
  onClose?: () => void;
  /** @deprecated Use onShareProfile */
  onShareLink?: () => void;
  isPublished?: boolean;
}

function ProgressRing({ current, required }: { current: number; required: number }) {
  const size = 64;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, current / required);
  const offset = circ * (1 - pct);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="animate-[spin_20s_linear_infinite]"
        style={{ animationDirection: 'normal' }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="text-amber-200 dark:text-amber-900/40"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          className="text-amber-500"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-base font-bold text-amber-700 dark:text-amber-300"
        style={{ fontFamily: 'var(--font-display), sans-serif' }}
      >
        {current}
      </span>
    </div>
  );
}

export default function BizCardGate({
  currentTrust,
  requiredTrust = 60,
  tier,
  nextActions = [],
  onSendInvoice,
  onShareProfile,
  onDismiss,
  trustScore,
  onClose,
  onShareLink,
}: BizCardGateProps) {
  // Backward compat
  const trust = currentTrust ?? trustScore ?? 0;
  const dismiss = onDismiss ?? onClose;
  const shareProfile = onShareProfile ?? onShareLink;
  const remaining = Math.max(0, requiredTrust - trust);

  return (
    <div
      className="rounded-[20px] bg-amber-50/80 dark:bg-amber-950/20 backdrop-blur-[16px] border border-amber-200/60 dark:border-amber-800/40 p-5 space-y-4"
      style={{ boxShadow: '0 0 24px rgba(245,158,11,0.12)' }}
      role="status"
      aria-label="Business card sharing requires higher trust"
    >
      {/* Header row: ring + text */}
      <div className="flex items-center gap-4">
        <ProgressRing current={trust} required={requiredTrust} />
        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-semibold text-amber-900 dark:text-amber-200"
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            Build your trust to unlock
          </p>
          <p className="text-xs text-amber-700/70 dark:text-amber-400/60 mt-0.5">
            Business Cards require Trust {'\u2265'} {requiredTrust} + Growing tier
          </p>
          {remaining > 0 && (
            <p className="text-[10px] text-amber-600/60 dark:text-amber-400/40 mt-1">
              {remaining} more point{remaining !== 1 ? 's' : ''} to go
            </p>
          )}
        </div>
      </div>

      {/* Growth checklist */}
      {nextActions.length > 0 && (
        <div className="space-y-1.5">
          {nextActions.slice(0, 3).map((a, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 bg-white/60 dark:bg-gray-900/30 rounded-xl px-3 py-2.5"
            >
              <span className="text-sm shrink-0">{a.icon}</span>
              <span className="flex-1 text-xs text-amber-900 dark:text-amber-200">{a.action}</span>
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full animate-[pcBreathe_3s_ease-in-out_infinite]">
                +{a.points}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Alternative actions */}
      <div className="space-y-2.5">
        <p className="text-[11px] text-amber-700/60 dark:text-amber-400/50 text-center">
          Meanwhile, you can:
        </p>
        <div className="flex gap-2">
          {onSendInvoice && (
            <button
              onClick={() => { onSendInvoice(); dismiss?.(); }}
              className="flex-1 py-2.5 rounded-[20px] text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 active:scale-[0.97] transition-all duration-200"
            >
              Send Invoice
            </button>
          )}
          {shareProfile && (
            <button
              onClick={() => { shareProfile(); dismiss?.(); }}
              className="flex-1 py-2.5 rounded-[20px] text-xs font-semibold text-amber-600 dark:text-amber-400 border-2 border-amber-400 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/30 active:scale-[0.97] transition-all duration-200"
            >
              Share Profile Link
            </button>
          )}
        </div>
      </div>

      {/* Dismiss */}
      {dismiss && (
        <button
          onClick={dismiss}
          className="w-full py-2 text-[11px] text-amber-600/50 dark:text-amber-400/40 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
        >
          Close
        </button>
      )}
    </div>
  );
}
