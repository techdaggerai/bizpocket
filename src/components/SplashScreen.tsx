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
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-800 transition-opacity duration-300 ${fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif", animation: 'splash-fallback 5s forwards' }}
      >
        {isEvrywher ? (
          <div className="flex flex-col items-center gap-3">
            <AnimatedPocketChatLogo size={72} />
            <span style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 600, fontSize: 28 }}>
              <span style={{ color: '#818cf8' }}>Evry</span>
              <span style={{ color: '#f59e0b' }}>wher</span>
            </span>
            <div className="flex gap-1.5 items-center">
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="h-2 w-2 rounded-full bg-indigo-400"
                  style={{ animation: `splash-dot 1s infinite ${i * 0.2}s` }}
                />
              ))}
            </div>
            <style>{`@keyframes splash-dot { 0%,80%,100%{opacity:.3;transform:scale(.8)} 40%{opacity:1;transform:scale(1)} }`}</style>
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
