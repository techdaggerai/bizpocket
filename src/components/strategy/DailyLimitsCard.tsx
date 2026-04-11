'use client';

import GlassCard from '@/components/ui/GlassCard';

interface DailyLimitsProps {
  maxDailyLoss: number | null;
  maxDailyTrades: number | null;
  maxPositionSize: number | null;
  allowedHoursStart: string | null;
  allowedHoursEnd: string | null;
  onChange: (field: string, value: number | string | null) => void;
}

export default function DailyLimitsCard({
  maxDailyLoss,
  maxDailyTrades,
  maxPositionSize,
  allowedHoursStart,
  allowedHoursEnd,
  onChange,
}: DailyLimitsProps) {
  return (
    <GlassCard className="space-y-4">
      <h2 className="text-sm font-semibold text-[var(--pm-text-primary)] uppercase tracking-wide">
        Daily Limits
      </h2>

      <div className="grid grid-cols-2 gap-3">
        {/* Max Daily Loss */}
        <div className="space-y-1">
          <label className="text-[11px] text-[var(--pm-text-tertiary)] font-medium">Max Daily Loss ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxDailyLoss ?? ''}
            onChange={(e) => { const v = parseFloat(e.target.value); onChange('max_daily_loss', e.target.value ? (v < 0 ? 0 : v) : null); }}
            placeholder="500"
            className="w-full h-10 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--pm-text-primary)] placeholder:text-[var(--pm-text-tertiary)] outline-none focus:border-[#AB7B5A] transition-colors"
          />
        </div>

        {/* Max Daily Trades */}
        <div className="space-y-1">
          <label className="text-[11px] text-[var(--pm-text-tertiary)] font-medium">Max Daily Trades</label>
          <input
            type="number"
            min="0"
            step="1"
            value={maxDailyTrades ?? ''}
            onChange={(e) => { const v = parseInt(e.target.value); onChange('max_daily_trades', e.target.value ? (v < 0 ? 0 : v) : null); }}
            placeholder="5"
            className="w-full h-10 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--pm-text-primary)] placeholder:text-[var(--pm-text-tertiary)] outline-none focus:border-[#AB7B5A] transition-colors"
          />
        </div>

        {/* Max Position Size */}
        <div className="space-y-1">
          <label className="text-[11px] text-[var(--pm-text-tertiary)] font-medium">Max Position Size ($)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={maxPositionSize ?? ''}
            onChange={(e) => { const v = parseFloat(e.target.value); onChange('max_position_size', e.target.value ? (v < 0 ? 0 : v) : null); }}
            placeholder="10000"
            className="w-full h-10 px-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-sm text-[var(--pm-text-primary)] placeholder:text-[var(--pm-text-tertiary)] outline-none focus:border-[#AB7B5A] transition-colors"
          />
        </div>

        {/* Trading Hours */}
        <div className="space-y-1">
          <label className="text-[11px] text-[var(--pm-text-tertiary)] font-medium">Allowed Trading Hours</label>
          <div className="flex items-center gap-1.5">
            <input
              type="time"
              value={allowedHoursStart ?? ''}
              onChange={(e) => onChange('allowed_hours_start', e.target.value || null)}
              className="flex-1 h-10 px-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--pm-text-primary)] outline-none focus:border-[#AB7B5A] transition-colors [color-scheme:dark]"
            />
            <span className="text-[10px] text-[var(--pm-text-tertiary)]">to</span>
            <input
              type="time"
              value={allowedHoursEnd ?? ''}
              onChange={(e) => onChange('allowed_hours_end', e.target.value || null)}
              className="flex-1 h-10 px-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-xs text-[var(--pm-text-primary)] outline-none focus:border-[#AB7B5A] transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
      </div>
    </GlassCard>
  );
}
