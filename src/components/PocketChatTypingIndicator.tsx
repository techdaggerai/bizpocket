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
];

interface Props { contactName: string; compact?: boolean; }

export default function PocketChatTypingIndicator({ contactName, compact = false }: Props) {
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
  const s = compact ? 24 : 34;

  return (
    <div className={`flex items-center ${compact ? 'gap-2 py-1.5 px-1' : 'gap-3 py-2'}`}>
      <svg width={s} height={s} viewBox="0 0 88 88" fill="none" style={{ animation: 'pcBreathe 2.5s ease-in-out infinite' }}>
        <rect width="88" height="88" rx="20" fill="#4F46E5" />
        {!compact && <><rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15" /><path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95" /></>}
        <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95" />
        <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B">
          <animate attributeName="opacity" values="0.7;1;0.7" dur="2.5s" repeatCount="indefinite" />
        </path>
        <text x="32" y="68" fontSize="10" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif">Hi</text>
        <text x="55.5" y="72" fontSize="9.5" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>{lang.text}</text>
      </svg>

      <div className="flex flex-col" style={{ gap: compact ? 3 : 5 }}>
        <div className="flex items-center gap-2">
          <span className={`${compact ? 'text-xs' : 'text-[13px]'} text-[#374151] font-medium`}>{contactName} is composing</span>
          <div className="flex gap-[3px] items-center">
            {[0, 1, 2].map(d => (
              <div key={d} className={`${compact ? 'w-[5px] h-[5px]' : 'w-1.5 h-1.5'} rounded-full`}
                style={{ background: d === 1 ? '#F59E0B' : '#4F46E5', animation: 'pcWave 1.8s ease-in-out infinite', animationDelay: `${d * 0.25}s` }} />
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#F59E0B] font-medium min-w-[70px]" style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.4s ease-in-out' }}>{lang.label}</span>
          <div className="w-[100px] h-[2px] rounded-sm bg-[#f3f4f6] overflow-hidden">
            <div className="w-[30px] h-[2px] rounded-sm bg-[#F59E0B]" style={{ animation: 'pcProgress 3s ease-in-out infinite' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
