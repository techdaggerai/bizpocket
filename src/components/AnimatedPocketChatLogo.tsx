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

  return (
    <svg width={clampedSize} height={clampedSize} viewBox="0 0 88 88" fill="none"
      style={{ filter: isTranslating ? 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.4))' : 'none', transition: 'filter 0.3s ease', flexShrink: 0 }}>
      {/* Indigo rounded square background */}
      <rect width="88" height="88" rx="20" fill="#4F46E5"/>
      {/* Translucent pocket body — compact, upper third */}
      <rect x="14" y="10" width="60" height="32" rx="10" fill="white" opacity="0.15"/>
      {/* Curved pocket flap at top */}
      <path d="M14 10 Q44 -2 74 10" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
      {/* White chat bubble — LARGE, lower-left, matches PNG */}
      <path d="M2 48c0-11 9-20 20-20h18c11 0 20 9 20 20v4c0 11-9 20-20 20H28l-12 10v-10C7 69 2 61 2 52v-4z" fill="white" opacity="0.95"/>
      {/* Amber chat bubble — LARGE, lower-right, overlapping */}
      <path d="M34 54c0-11 9-20 20-20h12c11 0 20 9 20 20v4c0 11-9 20-20 20H62l-10 10v-10c-9-3-18-12-18-20v-4z" fill="#F59E0B">
        {isTranslating && <animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/>}
      </path>
      {/* "Hi" text — large, centered in white bubble */}
      <text x="28" y="62" fontSize="20" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif"
        style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{g.left}</text>
      {/* Translated text — large, centered in amber bubble */}
      <text x="62" y="66" fontSize="16" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif"
        style={{ opacity: fade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{g.right}</text>
    </svg>
  );
}
