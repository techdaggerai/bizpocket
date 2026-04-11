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

  // Enforce minimum size of 32 for readability
  const clampedSize = Math.max(32, size);
  const g = greetings[index];
  const scale = clampedSize / 88;
  // Font sizes tuned to fill bubbles — matches the PNG app icon proportions
  const leftSize = Math.max(14, Math.round(15 * scale));
  const rightSize = Math.max(12, Math.round(13 * scale));

  return (
    <svg width={clampedSize} height={clampedSize} viewBox="0 0 88 88" fill="none"
      style={{ filter: isTranslating ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' : 'none', transition: 'filter 0.3s ease', flexShrink: 0 }}>
      {/* Indigo rounded square background */}
      <rect width="88" height="88" rx="20" fill="#4F46E5"/>
      {/* Translucent pocket body */}
      <rect x="14" y="12" width="60" height="36" rx="10" fill="white" opacity="0.15"/>
      {/* Curved pocket flap at top */}
      <path d="M14 12 Q44 0 74 12" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
      {/* White chat bubble (left, larger) */}
      <path d="M10 50c0-7 6-13 13-13h16c7 0 13 6 13 13v6c0 7-6 13-13 13H29l-9 8v-8c-6-2-10-7-10-13v-6z" fill="white" opacity="0.95"/>
      {/* Amber chat bubble (right, overlapping) */}
      <path d="M36 56c0-7 6-13 13-13h16c7 0 13 6 13 13v6c0 7-6 13-13 13H58l-9 8v-8c-6-2-10-7-10-13v-6z" fill="#F59E0B">
        {isTranslating && <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>}
      </path>
      {/* "Hi" text in white bubble */}
      <text x="29" y="64" fontSize={leftSize} fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif"
        style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{g.left}</text>
      {/* Translated text in amber bubble */}
      <text x="58" y="68" fontSize={rightSize} fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif"
        style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{g.right}</text>
    </svg>
  );
}
