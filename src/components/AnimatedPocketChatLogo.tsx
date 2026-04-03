'use client';

import { useState, useEffect } from 'react';

const greetings = [
  { left: 'Hi', right: 'やあ' },
  { left: 'Hi', right: 'Hola' },
  { left: 'Hi', right: 'مرحبا' },
  { left: 'Hi', right: 'নমস্কার' },
  { left: 'Hi', right: 'Olá' },
  { left: 'Hi', right: 'Salut' },
  { left: 'Hi', right: 'Hallo' },
  { left: 'Hi', right: 'سلام' },
  { left: 'Hi', right: 'Merhaba' },
  { left: 'Hi', right: '你好' },
  { left: 'Hi', right: 'Kumusta' },
  { left: 'Hi', right: 'Xin chào' },
];

interface Props {
  size?: number;
  isTranslating?: boolean;
}

export default function AnimatedPocketChatLogo({ size = 36, isTranslating = false }: Props) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (!isTranslating) { setIndex(0); setFade(true); return; }
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIndex(i => (i + 1) % greetings.length); setFade(true); }, 300);
    }, 1200);
    return () => clearInterval(interval);
  }, [isTranslating]);

  const g = greetings[index];
  const scale = size / 88;
  const leftSize = Math.max(8, Math.round(10 * scale));
  const rightSize = Math.max(7, Math.round(9.5 * scale));

  return (
    <svg width={size} height={size} viewBox="0 0 88 88" fill="none"
      style={{ filter: isTranslating ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' : 'none', transition: 'filter 0.3s ease' }}>
      <rect width="88" height="88" rx="20" fill="#4F46E5"/>
      <rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15"/>
      <path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
      <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/>
      <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B">
        {isTranslating && <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>}
      </path>
      {size >= 60 && <>
        <text x="32" y="68" fontSize={leftSize} fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif"
          style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{g.left}</text>
        <text x="55.5" y="72" fontSize={rightSize} fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif"
          style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{g.right}</text>
      </>}
    </svg>
  );
}
