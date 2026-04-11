'use client';

import { useState, useEffect } from 'react';
import { PocketMark, LogoWordmark } from '@/components/Logo';

const langPairs = [
  { left: 'Hi', right: 'やあ' },
  { left: 'Hola', right: 'مرحبا' },
  { left: 'Bonjour', right: '你好' },
  { left: '안녕', right: 'Olá' },
  { left: 'Ciao', right: 'नमस्ते' },
  { left: 'Hej', right: 'สวัสดี' },
];

export default function SplashScreen({ children, brand = 'evrywher' }: { children: React.ReactNode; brand?: string }) {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const isEvrywher = brand === 'evrywher';

  // Cycling language pairs
  const [pairIndex, setPairIndex] = useState(0);
  const [textFade, setTextFade] = useState(true);

  useEffect(() => {
    // Only show on first load (not navigation)
    const shown = sessionStorage.getItem('splash_shown');
    if (shown) { setShow(false); return; }
    sessionStorage.setItem('splash_shown', '1');
    const timer = setTimeout(() => setFadeOut(true), 1200);
    const remove = setTimeout(() => setShow(false), 1500);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, []);

  useEffect(() => {
    if (!show || !isEvrywher) return;
    const interval = setInterval(() => {
      setTextFade(false);
      setTimeout(() => {
        setPairIndex(i => (i + 1) % langPairs.length);
        setTextFade(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [show, isEvrywher]);

  if (!show) return <>{children}</>;

  const pair = langPairs[pairIndex];

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[400ms] ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: '#0f172a', fontFamily: "'DM Sans', system-ui, sans-serif", animation: 'splash-fallback 5s forwards' }}
      >
        {isEvrywher ? (
          <div className="flex flex-col items-center">
            {/* LOCKED master logo SVG — do NOT modify paths */}
            <div style={{ animation: 'splashBreathe 3s ease-in-out infinite' }}>
              <svg viewBox="0 0 88 88" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: 100, height: 100 }}>
                <rect width="88" height="88" rx="20" fill="#4F46E5"/>
                <rect x="16" y="16" width="56" height="38" rx="10" fill="white" opacity="0.15"/>
                <path d="M16 16 Q44 4 72 16" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.95"/>
                <path d="M18 58c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H32l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="white" opacity="0.95"/>
                <path d="M40 62c0-5 4-9 9-9h12c5 0 9 4 9 9v4c0 5-4 9-9 9H54l-7 6v-6c-4-1.5-7-5-7-9v-4z" fill="#F59E0B"/>
                <text x="32" y="68" fontSize="10" fontWeight="800" fill="#4338ca" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif"
                  style={{ opacity: textFade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{pair.left}</text>
                <text x="55.5" y="72" fontSize="9.5" fontWeight="700" fill="white" textAnchor="middle" fontFamily="sans-serif"
                  style={{ opacity: textFade ? 1 : 0, transition: 'opacity 0.3s ease-in-out' }}>{pair.right}</text>
              </svg>
            </div>
            {/* Wordmark */}
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 28, marginTop: 16, animation: 'splashTextBreathe 3s ease-in-out infinite 0.5s' }}>
              <span style={{ color: '#818cf8' }}>Evry</span>
              <span style={{ color: '#f59e0b' }}>wher</span>
            </span>
            {/* Three dots */}
            <div className="flex items-center" style={{ gap: 6, marginTop: 12 }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', backgroundColor: i === 1 ? '#f59e0b' : '#818cf8',
                    animation: `splashDotPulse 1.5s ease-in-out infinite ${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes splashBreathe {
                0%, 100% { transform: scale(1); filter: drop-shadow(0 0 15px rgba(79,70,229,0.3)); }
                50% { transform: scale(1.05); filter: drop-shadow(0 0 30px rgba(79,70,229,0.5)); }
              }
              @keyframes splashTextBreathe {
                0%, 100% { opacity: 0.85; }
                50% { opacity: 1; }
              }
              @keyframes splashDotPulse {
                0%, 100% { opacity: 0.3; transform: scale(0.8); }
                50% { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
        ) : (
          <>
            <div className="animate-pulse">
              <PocketMark variant="lg" />
            </div>
            <div className="mt-4">
              <LogoWordmark className="text-xl" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-400">Your AI Business Autopilot</p>
          </>
        )}
      </div>
      <div>{children}</div>
    </>
  );
}
