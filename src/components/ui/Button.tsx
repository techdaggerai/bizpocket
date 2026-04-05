'use client';

import { forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'tier';
type Size = 'sm' | 'md' | 'lg' | 'xl';
type Tier = 'starter' | 'growing' | 'established';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  tier?: Tier;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-[14px] gap-2',
  lg: 'h-12 px-6 text-[15px] gap-2.5',
  xl: 'h-14 px-8 text-[16px] gap-3',
};

const iconSize: Record<Size, number> = {
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600',
  secondary: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900',
  outline: 'border-2 border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400',
  ghost: 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950',
  tier: '',
};

const tierBgClasses: Record<Tier, string> = {
  starter: 'bg-amber-500 text-white hover:bg-amber-600',
  growing: 'bg-blue-500 text-white hover:bg-blue-600',
  established: 'bg-emerald-500 text-white hover:bg-emerald-600',
};

function Spinner({ size }: { size: number }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', tier, loading, icon, disabled, children, className = '', ...props }, ref) => {
    const isDisabled = disabled || loading;
    const isTier = variant === 'tier' && tier;
    const variantCls = isTier ? tierBgClasses[tier] : variantClasses[variant];
    const iSize = iconSize[size];

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={[
          'inline-flex items-center justify-center font-medium rounded-[20px]',
          'transition-all duration-200 active:scale-[0.97]',
          'disabled:opacity-50 disabled:pointer-events-none',
          'select-none whitespace-nowrap',
          sizeClasses[size],
          variantCls,
          className,
        ].join(' ')}
        {...props}
      >
        {loading ? (
          <Spinner size={iSize} />
        ) : icon ? (
          <span className="shrink-0 flex items-center" style={{ width: iSize, height: iSize }}>
            {icon}
          </span>
        ) : null}
        <span className={loading ? 'opacity-60' : ''}>{children}</span>
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

/* ── LOCKED preset buttons ── */

export function InviteButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-[20px] border-2 border-amber-500 text-amber-500 text-[13px] font-medium py-[7px] px-[14px] transition-all duration-200 active:scale-[0.97] hover:bg-amber-50 dark:hover:bg-amber-950"
    >
      {children}
    </button>
  );
}

export function NewChatButton({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center rounded-[20px] border-2 border-indigo-600 text-indigo-600 text-[13px] font-medium py-[7px] px-[14px] transition-all duration-200 active:scale-[0.97] hover:bg-indigo-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950"
    >
      {children}
    </button>
  );
}
