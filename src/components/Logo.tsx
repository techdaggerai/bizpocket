/**
 * BizPocket Pocket Mark — official logo v1.0
 * Sizes: sm (20), xl (32), lg (48)
 */

type LogoSize = 'sm' | 'xl' | 'lg';

const sizeMap: Record<LogoSize, { size: number; rx: number }> = {
  sm: { size: 20, rx: 5 },
  xl: { size: 32, rx: 8 },
  lg: { size: 48, rx: 12 },
};

export function PocketMark({ variant = 'xl', className = '' }: { variant?: LogoSize; className?: string }) {
  const { size, rx } = sizeMap[variant];
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none" className={className}>
      <rect width="88" height="88" rx="20" fill="#4F46E5" />
      <rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15" />
      <path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95" />
      <rect x="24" y="66" width="40" height="4" rx="2" fill="white" opacity="0.9" />
      <rect x="24" y="76" width="28" height="4" rx="2" fill="white" opacity="0.9" />
    </svg>
  );
}

export function LogoWordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-sans text-md font-bold ${className}`}>
      <span className="text-white">Biz</span>
      <span className="text-[#4F46E5]">Pocket</span>
    </span>
  );
}

export function PocketChatMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect width="88" height="88" rx="20" fill="#4F46E5"/>
      <rect x="14" y="10" width="60" height="32" rx="10" fill="white" opacity="0.15"/>
      <path d="M14 10 Q44 -2 74 10" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
      <path d="M2 48c0-11 9-20 20-20h18c11 0 20 9 20 20v4c0 11-9 20-20 20H28l-12 10v-10C7 69 2 61 2 52v-4z" fill="white" opacity="0.95"/>
      <path d="M34 54c0-11 9-20 20-20h12c11 0 20 9 20 20v4c0 11-9 20-20 20H62l-10 10v-10c-9-3-18-12-18-20v-4z" fill="#F59E0B"/>
      <text x="28" y="62" fontSize="20" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">Hi</text>
      <text x="62" y="66" fontSize="16" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif">やあ</text>
    </svg>
  );
}

export function LogoFull({ size = 'xl', className = '' }: { size?: LogoSize; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PocketMark variant={size} />
      <LogoWordmark />
    </div>
  );
}
