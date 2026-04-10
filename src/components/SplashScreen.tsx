'use client';

import { useState, useEffect } from 'react';
import { PocketMark, LogoWordmark } from '@/components/Logo';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';

export default function SplashScreen({ children, brand = 'evrywher' }: { children: React.ReactNode; brand?: string }) {
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const isEvrywher = brand === 'evrywher';

  useEffect(() => {
    // Only show on first load (not navigation)
    const shown = sessionStorage.getItem('splash_shown');
    if (shown) { setShow(false); return; }
    sessionStorage.setItem('splash_shown', '1');
    const timer = setTimeout(() => setFadeOut(true), 1200);
    const remove = setTimeout(() => setShow(false), 1500);
    return () => { clearTimeout(timer); clearTimeout(remove); };
  }, []);

  if (!show) return <>{children}</>;

  return (
    <>
      <div
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-[400ms] ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ background: '#0f172a', fontFamily: "'DM Sans', system-ui, sans-serif", animation: 'splash-fallback 5s forwards' }}
      >
        {isEvrywher ? (
          <div className="flex flex-col items-center">
            {/* Breathing logo */}
            <div style={{ animation: 'splash-breathe 3s ease-in-out infinite' }}>
              <AnimatedPocketChatLogo size={88} />
            </div>
            {/* Wordmark */}
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 28, marginTop: 16, animation: 'splash-text-breathe 3s ease-in-out infinite 0.5s' }}>
              <span style={{ color: '#818cf8' }}>Evry</span>
              <span style={{ color: '#f59e0b' }}>wher</span>
            </span>
            {/* Three dots */}
            <div className="flex items-center" style={{ gap: 6, marginTop: 12 }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 8, height: 8, borderRadius: '50%', backgroundColor: '#818cf8',
                    animation: `splash-dot-pulse 1.5s ease-in-out infinite ${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes splash-breathe {
                0%, 100% { transform: scale(1); opacity: 0.9; filter: drop-shadow(0 0 15px rgba(99,102,241,0.3)); }
                50% { transform: scale(1.05); opacity: 1; filter: drop-shadow(0 0 25px rgba(99,102,241,0.5)); }
              }
              @keyframes splash-text-breathe {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
              }
              @keyframes splash-dot-pulse {
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
