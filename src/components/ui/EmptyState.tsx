'use client';

import GlassCard from '@/components/ui/GlassCard';
import Button from '@/components/ui/Button';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'outline' };
  secondary?: { label: string; onClick: () => void };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
}: EmptyStateProps) {
  return (
    <GlassCard className="text-center py-10 px-6">
      {/* Icon */}
      <div className="flex justify-center mb-4 text-[64px] leading-none">
        {icon}
      </div>

      {/* Title */}
      <h3
        className="text-lg font-semibold text-[var(--pm-text-primary)]"
        style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 600 }}
      >
        {title}
      </h3>

      {/* Description */}
      <p className="text-sm text-[var(--pm-text-secondary)] mt-2 max-w-xs mx-auto leading-relaxed">
        {description}
      </p>

      {/* Action */}
      <div className="mt-6">
        <Button
          variant={action.variant ?? 'primary'}
          size="lg"
          onClick={action.onClick}
          className="w-full"
        >
          {action.label}
        </Button>
      </div>

      {/* Secondary */}
      {secondary && (
        <button
          onClick={secondary.onClick}
          className="mt-3 text-sm font-medium text-[var(--pm-text-link)] hover:underline"
        >
          {secondary.label}
        </button>
      )}
    </GlassCard>
  );
}
