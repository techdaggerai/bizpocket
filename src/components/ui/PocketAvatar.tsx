'use client';

import Image from 'next/image';

type Tier = 'starter' | 'growing' | 'established';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
type Badge = 'none' | 'activity_verified' | 'id_verified';
type ActivityLevel = 'low' | 'medium' | 'high';

interface PocketAvatarProps {
  src?: string;
  name: string;
  size: Size;
  tier?: Tier;
  badge?: Badge;
  online?: boolean;
  activityLevel?: ActivityLevel;
}

const sizeConfig: Record<Size, { px: number; text: string; ring: string; badge: number }> = {
  xs: { px: 28, text: 'text-[10px]', ring: '1.5px', badge: 7 },
  sm: { px: 36, text: 'text-xs', ring: '2px', badge: 8 },
  md: { px: 44, text: 'text-sm', ring: '2px', badge: 9 },
  lg: { px: 64, text: 'text-lg', ring: '2.5px', badge: 10 },
  xl: { px: 96, text: 'text-2xl', ring: '3px', badge: 12 },
};

const tierColor: Record<Tier, string> = {
  starter: '#FBBF24',
  growing: '#3B82F6',
  established: '#10B981',
};

const tierBgClass: Record<Tier, string> = {
  starter: 'bg-amber-500',
  growing: 'bg-blue-500',
  established: 'bg-emerald-500',
};

const activityGlow: Record<ActivityLevel, string> = {
  low: 'inset 0 0 4px rgba(255,255,255,0.1)',
  medium: 'inset 0 0 8px rgba(255,255,255,0.2)',
  high: 'inset 0 0 12px rgba(255,255,255,0.3)',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

export default function PocketAvatar({
  src,
  name,
  size,
  tier,
  badge = 'none',
  online,
  activityLevel,
}: PocketAvatarProps) {
  const cfg = sizeConfig[size];
  const ringColor = tier ? tierColor[tier] : undefined;

  const containerStyle: React.CSSProperties = {
    width: cfg.px,
    height: cfg.px,
    minWidth: cfg.px,
  };

  const ringStyle: React.CSSProperties = ringColor
    ? { boxShadow: `0 0 0 ${cfg.ring} ${ringColor}, inset 0 0 6px ${ringColor}33` }
    : {};

  const innerShadow = activityLevel ? activityGlow[activityLevel] : undefined;

  return (
    <div
      className="relative inline-flex shrink-0"
      style={containerStyle}
      aria-label={`${name}'s avatar`}
    >
      {/* Avatar circle */}
      <div
        className={[
          'rounded-full overflow-hidden w-full h-full flex items-center justify-center',
          !src ? (tier ? tierBgClass[tier] : 'bg-gray-400') : '',
        ].join(' ')}
        style={{
          ...ringStyle,
          ...(innerShadow ? { boxShadow: [ringStyle.boxShadow, innerShadow].filter(Boolean).join(', ') } : {}),
        }}
      >
        {src ? (
          <Image
            src={src}
            alt={name}
            width={cfg.px}
            height={cfg.px}
            className="w-full h-full object-cover"
          />
        ) : (
          <span
            className={`${cfg.text} font-semibold text-white select-none`}
            style={{ fontFamily: 'var(--font-display), sans-serif' }}
          >
            {getInitials(name)}
          </span>
        )}
      </div>

      {/* Online indicator — top-right */}
      {online && (
        <span
          className="absolute top-0 right-0 rounded-full bg-emerald-400 border-2 border-white dark:border-slate-900 animate-[heartbeat_2s_infinite]"
          style={{ width: cfg.badge, height: cfg.badge }}
          aria-label="Online"
        />
      )}

      {/* Badge dot — bottom-right */}
      {badge !== 'none' && (
        <span
          className={[
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-slate-900',
            badge === 'activity_verified' ? 'bg-blue-500' : '',
            badge === 'id_verified' ? 'bg-emerald-500 animate-[badgePulse_2s_infinite]' : '',
          ].join(' ')}
          style={{ width: cfg.badge, height: cfg.badge }}
          aria-label={badge === 'id_verified' ? 'ID verified' : 'Activity verified'}
        />
      )}
    </div>
  );
}
