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
      <span className="text-[#0A0A0A]">Biz</span>
      <span className="text-[#4F46E5]">Pocket</span>
    </span>
  );
}

export function PocketChatMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none">
      <rect width="88" height="88" rx="20" fill="#4F46E5"/>
      <rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15"/>
      <path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
      <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/>
      <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B"/>
      <text x="32" y="68" fontSize="10" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">Hi</text>
      <text x="55.5" y="72" fontSize="9.5" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif">やあ</text>
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
