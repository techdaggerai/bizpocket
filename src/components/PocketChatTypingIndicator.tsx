'use client';

import { useState, useEffect } from 'react';

const languages = [
  { text: 'やあ', label: 'Japanese' },
  { text: 'Hola', label: 'Spanish' },
  { text: 'مرحبا', label: 'Arabic' },
  { text: '你好', label: 'Chinese' },
  { text: 'Olá', label: 'Portuguese' },
  { text: 'Salut', label: 'French' },
  { text: 'سلام', label: 'Urdu' },
  { text: 'Merhaba', label: 'Turkish' },
  { text: 'Xin chào', label: 'Vietnamese' },
  { text: 'Hallo', label: 'Dutch' },
  { text: 'Kumusta', label: 'Filipino' },
  { text: 'নমস্কার', label: 'Bengali' },
  { text: 'سلام', label: 'Pashto' },
  { text: 'سلام', label: 'Persian' },
  { text: 'नमस्ते', label: 'Hindi' },
  { text: '안녕', label: 'Korean' },
  { text: 'สวัสดี', label: 'Thai' },
  { text: 'Halo', label: 'Indonesian' },
  { text: 'नमस्कार', label: 'Nepali' },
  { text: 'ආයුබෝවන්', label: 'Sinhala' },
];

const SIZES = {
  sm: { logo: 40, dot: 5, dotGap: 3, composing: 'text-xs', greeting: 'text-[11px]', greetMin: 'min-w-[70px]', bar: 'h-[2px]', barTrack: 'w-[80px]', barFill: 'w-[24px]', gap: 2, colGap: 3, pad: 'gap-2 py-1.5 px-1', showDetail: false },
  md: { logo: 34, dot: 6, dotGap: 3, composing: 'text-[13px]', greeting: 'text-[11px]', greetMin: 'min-w-[70px]', bar: 'h-[2px]', barTrack: 'w-[100px]', barFill: 'w-[30px]', gap: 3, colGap: 5, pad: 'gap-3 py-2', showDetail: true },
  lg: { logo: 56, dot: 10, dotGap: 6, composing: 'text-xl', greeting: 'text-lg', greetMin: 'min-w-[90px]', bar: 'h-[4px]', barTrack: 'w-[140px]', barFill: 'w-[42px]', gap: 4, colGap: 8, pad: 'gap-4 py-3', showDetail: true },
};

interface Props { contactName: string; compact?: boolean; size?: 'sm' | 'md' | 'lg'; }

export default function PocketChatTypingIndicator({ contactName, compact = false, size }: Props) {
  const [langIndex, setLangIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => { setLangIndex(i => (i + 1) % languages.length); setFade(true); }, 400);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const lang = languages[langIndex];
  // size prop takes priority; if not set, fall back to compact logic
  const t = size ? SIZES[size] : (compact ? SIZES.sm : SIZES.md);

  return (
    <div className={`flex items-center ${t.pad}`}>
      <svg width={t.logo} height={t.logo} viewBox="0 0 88 88" fill="none" style={{ animation: 'pcBreathe 2.5s ease-in-out infinite', transformOrigin: 'center center', flexShrink: 0 }}>
        <rect width="88" height="88" rx="20" fill="#4F46E5" />
        {t.logo >= 34 && <><rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15" /><path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95" /></>}
        <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95" />
        <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
        </path>
        {t.logo >= 34 && <>
          <text x="32" y="68" fontSize="10" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">Hi</text>
          <text x="55.5" y="72" fontSize="9.5" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>{lang.text}</text>
        </>}
      </svg>

      <div className="flex flex-col" style={{ gap: t.colGap }}>
        <div className="flex items-center" style={{ gap: t.gap * 2 }}>
          <span className={`${t.composing} text-[#374151] font-semibold`}>{contactName} is composing</span>
          <div className="flex items-center" style={{ gap: t.dotGap }}>
            {[0, 1, 2].map(d => (
              <div key={d} className="rounded-full"
                style={{ width: t.dot, height: t.dot, background: d === 1 ? '#F59E0B' : '#4F46E5', animation: 'pcWave 1.8s ease-in-out infinite', animationDelay: `${d * 0.25}s` }} />
            ))}
          </div>
        </div>
        <div className="flex items-center" style={{ gap: t.gap * 2 }}>
          <span className={`${t.greeting} text-[#F59E0B] font-semibold ${t.greetMin}`} style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>{lang.label}</span>
          <div className={`${t.barTrack} ${t.bar} rounded-sm bg-[#f3f4f6] overflow-hidden`}>
            <div className={`${t.barFill} ${t.bar} rounded-sm bg-[#F59E0B]`} style={{ animation: 'pcProgress 3s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
