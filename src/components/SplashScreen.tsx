'use client';

import { useState, useEffect } from 'react';
import { PocketChatMark, PocketMark, LogoWordmark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';

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
        className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-800 transition-opacity duration-300 ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
        style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
      >
        {isEvrywher ? (
          <>
            <div className="animate-pulse">
              <PocketChatMark size={80} />
            </div>
            <div className="mt-4">
              <EvryWherMark size="lg" />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-400">You bring the missing <span className="italic text-[#10B981]" style={{ fontFamily: "Georgia, serif" }}>e</span>. We bring the world.</p>
          </>
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
      <div className="invisible">{children}</div>
    </>
  );
}
