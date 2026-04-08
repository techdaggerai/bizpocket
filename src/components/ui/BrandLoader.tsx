'use client';

import { getBrandMode } from '@/lib/brand';

// ─── Shared pocket SVG (indigo body, white flap) ───
function PocketIcon({ children }: { children?: React.ReactNode }) {
  return (
    <div className="brand-loader-pocket relative">
      {/* Pulse ring */}
      <div className="brand-loader-pulse absolute inset-[-12px] rounded-[24px] border-2 border-[#818CF8]" />
      <svg width="72" height="72" viewBox="0 0 72 72" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body */}
        <rect x="8" y="18" width="56" height="46" rx="12" fill="#4F46E5" />
        {/* Flap */}
        <path d="M8 30C8 23.373 13.373 18 20 18H52C58.627 18 64 23.373 64 30V32C64 34.209 62.209 36 60 36H12C9.791 36 8 34.209 8 32V30Z" fill="#6366F1" />
        {/* Flap curve highlight */}
        <path d="M16 28Q36 22 56 28" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
      {children}
    </div>
  );
}

// ─── Evrywher variant ───
function EvrywherLoader() {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center select-none">
      <div className="relative">
        <PocketIcon>
          {/* Chat bubble: "Hi" */}
          <div className="brand-loader-bubble-1 absolute -top-3 -left-2">
            <div className="bg-white rounded-xl rounded-bl-sm px-2.5 py-1 shadow-lg">
              <span className="text-[13px] font-bold text-[#4F46E5]">Hi</span>
            </div>
          </div>
          {/* Chat bubble: "やあ" */}
          <div className="brand-loader-bubble-2 absolute -top-1 -right-4">
            <div className="bg-[#F59E0B] rounded-xl rounded-br-sm px-2.5 py-1 shadow-lg">
              <span className="text-[13px] font-bold text-white">やあ</span>
            </div>
          </div>
        </PocketIcon>
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
    </div>
  );
}

// ─── BizPocket variant ───
function BizPocketLoader() {
  return (
    <div className="min-h-[100dvh] bg-slate-900 flex flex-col items-center justify-center select-none">
      <div className="relative">
        <PocketIcon>
          {/* Animated text lines inside pocket */}
          <div className="absolute top-[42px] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5">
            <div className="brand-loader-line-1 h-[3px] rounded-full bg-white/70" />
            <div className="brand-loader-line-2 h-[3px] rounded-full bg-white/50" />
          </div>
        </PocketIcon>
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
    </div>
  );
}

// ─── Main export ───
export default function BrandLoader() {
  const brand = getBrandMode();
  return brand === 'evrywher' ? <EvrywherLoader /> : <BizPocketLoader />;
}
