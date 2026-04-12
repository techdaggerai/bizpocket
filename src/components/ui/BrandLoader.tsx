'use client';

import { getBrandMode } from '@/lib/brand';

// ─── Evrywher variant — uses LOCKED master SVG (same as SplashScreen) ───
function EvrywherLoader() {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center select-none">
      {/* LOCKED master logo SVG — must match SplashScreen exactly */}
      <div style={{ animation: 'splashBreathe 3s ease-in-out infinite' }}>
        <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 100, height: 100 }}>
          <rect width="88" height="88" rx="20" fill="#4F46E5"/>
          <rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15"/>
          <path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
          <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/>
          <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B"/>
          <text x="32" y="68" fontSize="10" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">Hi</text>
          <text x="55.5" y="72" fontSize="9.5" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif">やあ</text>
        </svg>
      </div>

      {/* Wordmark */}
      <p className="mt-6 text-xl font-semibold" style={{ fontFamily: "'Outfit', 'DM Sans', sans-serif", fontWeight: 600 }}>
        <span className="text-[#818CF8]">Evry</span>
        <span className="text-[#F59E0B]">wher</span>
      </p>

      {/* Bouncing dots */}
      <div className="flex items-center gap-1.5 mt-4">
        <div className="brand-loader-dot w-2 h-2 rounded-full bg-[#4F46E5]" style={{ animationDelay: '0ms' }} />
        <div className="brand-loader-dot w-2 h-2 rounded-full bg-[#F59E0B]" style={{ animationDelay: '150ms' }} />
        <div className="brand-loader-dot w-2 h-2 rounded-full bg-[#4F46E5]" style={{ animationDelay: '300ms' }} />
      </div>

      <style>{`
        @keyframes splashBreathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(79,70,229,0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(79,70,229,0.5)); }
        }
      `}</style>
    </div>
  );
}

// ─── BizPocket variant ───
function BizPocketLoader() {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center select-none">
      <div style={{ animation: 'splashBreathe 3s ease-in-out infinite' }}>
        <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 100, height: 100 }}>
          <rect width="88" height="88" rx="20" fill="#4F46E5"/>
          <rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15"/>
          <path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
          <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/>
          <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B"/>
        </svg>
      </div>

      {/* Wordmark */}
      <p className="mt-6 text-xl" style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700 }}>
        <span className="text-white">Biz</span>
        <span className="text-[#4F46E5]">Pocket</span>
      </p>

      {/* Bouncing dots */}
      <div className="flex items-center gap-1.5 mt-4">
        <div className="brand-loader-dot w-2 h-2 rounded-full bg-[#4F46E5]" style={{ animationDelay: '0ms' }} />
        <div className="brand-loader-dot w-2 h-2 rounded-full bg-[#818CF8]" style={{ animationDelay: '150ms' }} />
        <div className="brand-loader-dot w-2 h-2 rounded-full bg-[#4F46E5]" style={{ animationDelay: '300ms' }} />
      </div>

      <style>{`
        @keyframes splashBreathe {
          0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(79,70,229,0.3)); }
          50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(79,70,229,0.5)); }
        }
      `}</style>
    </div>
  );
}

// ─── Main export ───
export default function BrandLoader() {
  const brand = getBrandMode();
  return brand === 'evrywher' ? <EvrywherLoader /> : <BizPocketLoader />;
}
