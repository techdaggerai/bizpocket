'use client';

import { useEffect, useRef } from 'react';

type Tier = 'starter' | 'growing' | 'established';

interface GlassCardProps {
  tier?: Tier;
  glow?: boolean;
  elevated?: boolean;
  adaptiveRefraction?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  children: React.ReactNode;
}

const tierBorderClass: Record<Tier, string> = {
  starter: 'border-amber-200/60',
  growing: 'border-blue-200/60',
  established: 'border-emerald-200/60',
};

const tierGlowStyle: Record<Tier, string> = {
  starter: '0 0 16px rgba(245,158,11,0.35)',
  growing: '0 0 16px rgba(59,130,246,0.35)',
  established: '0 0 20px rgba(16,185,129,0.45)',
};

function getGlassAngle(): number {
  const hour = new Date().getHours();
  if (hour < 12) return 120;
  if (hour < 17) return 160;
  return 200;
}

export default function GlassCard({
  tier,
  glow,
  elevated,
  adaptiveRefraction,
  className = '',
  style: styleProp,
  onClick,
  children,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!adaptiveRefraction || !ref.current) return;
    ref.current.style.setProperty('--glass-angle', `${getGlassAngle()}deg`);
  }, [adaptiveRefraction]);

  const borderClass = tier ? tierBorderClass[tier] : 'border-white/[0.65] dark:border-white/[0.12]';
  const glowShadow = tier && glow ? tierGlowStyle[tier] : undefined;

  return (
    <div
      ref={ref}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Interactive card' : undefined}
      onClick={onClick}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={[
        'rounded-[20px] p-5 border',
        'bg-white/[0.78] dark:bg-slate-900/[0.82]',
        'backdrop-blur-[24px]',
        'supports-[not(backdrop-filter:blur(1px))]:bg-white/[0.95] supports-[not(backdrop-filter:blur(1px))]:dark:bg-slate-900/[0.95]',
        'transition-all duration-[400ms] [transition-timing-function:var(--ease-spring)]',
        borderClass,
        elevated ? 'hover:-translate-y-0.5' : '',
        onClick ? 'cursor-pointer' : '',
        className,
      ].filter(Boolean).join(' ')}
      style={{
        backgroundImage: 'var(--glass-refraction)',
        boxShadow: [
          'var(--glass-shadow)',
          glowShadow,
        ].filter(Boolean).join(', '),
        ...styleProp,
      }}
    >
      {children}
    </div>
  );
}
