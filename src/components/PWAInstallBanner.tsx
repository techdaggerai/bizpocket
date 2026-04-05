'use client';

import { useState, useEffect, useCallback } from 'react';
import { getBrandMode } from '@/lib/brand';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'pwa_banner_dismissed';
const IOS_DISMISS_KEY = 'pwa_ios_dismissed_at';
const IOS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function useDetect() {
  const [ready, setReady] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsAndroid(/Android/.test(navigator.userAgent));
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
    );
    setReady(true);
  }, []);

  return { ready, isIOS, isAndroid, isStandalone };
}

function IOSInstructions({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-slate-800 rounded-t-2xl p-5 pb-8 space-y-5 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-slate-50">Add to Home Screen</h3>
          <button onClick={onClose} className="p-1 text-[#9CA3AF] hover:text-slate-300 hover:text-white">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Step 1 */}
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white text-xs font-bold">1</div>
          <div>
            <p className="text-sm font-medium text-slate-50">Tap the Share button</p>
            <p className="text-xs text-slate-400 mt-0.5">
              In Safari, tap the{' '}
              <svg className="inline-block -mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              {' '}icon at the bottom of the screen
            </p>
          </div>
        </div>

        {/* Step 2 */}
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white text-xs font-bold">2</div>
          <div>
            <p className="text-sm font-medium text-slate-50">Scroll down and tap &quot;Add to Home Screen&quot;</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Look for the{' '}
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-700 rounded text-[10px] font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 8v8M8 12h8"/></svg>
                Add to Home Screen
              </span>
              {' '}option
            </p>
          </div>
        </div>

        {/* Step 3 */}
        <div className="flex items-start gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#4F46E5] text-white text-xs font-bold">3</div>
          <div>
            <p className="text-sm font-medium text-slate-50">Tap &quot;Add&quot; — done!</p>
            <p className="text-xs text-slate-400 mt-0.5">The app icon will appear on your home screen</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PWAInstallBanner() {
  const { ready, isIOS, isAndroid, isStandalone } = useDetect();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [showIOSSheet, setShowIOSSheet] = useState(false);
  const [isPocketChat] = useState(() => getBrandMode() === 'evrywher');

  // Listen for Android install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Determine visibility
  useEffect(() => {
    if (!ready || isStandalone) return;

    // Desktop — don't show
    if (!isIOS && !isAndroid) return;

    // Android: permanently dismissed?
    if (isAndroid && localStorage.getItem(DISMISS_KEY) === '1') return;

    // iOS: dismissed within cooldown?
    if (isIOS) {
      const ts = localStorage.getItem(IOS_DISMISS_KEY);
      if (ts && Date.now() - Number(ts) < IOS_COOLDOWN_MS) return;
    }

    // Small delay so it doesn't flash on load
    const t = setTimeout(() => setVisible(true), 2000);
    return () => clearTimeout(t);
  }, [ready, isIOS, isAndroid, isStandalone]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (isAndroid) localStorage.setItem(DISMISS_KEY, '1');
    if (isIOS) localStorage.setItem(IOS_DISMISS_KEY, String(Date.now()));
  }, [isAndroid, isIOS]);

  async function handleAndroidInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      localStorage.setItem(DISMISS_KEY, '1');
      setVisible(false);
    }
    setDeferredPrompt(null);
  }

  if (!visible) return showIOSSheet ? <IOSInstructions onClose={() => setShowIOSSheet(false)} /> : null;

  const appName = isPocketChat ? 'Evrywher' : 'BizPocket';

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
        <div className="mx-auto max-w-lg rounded-t-xl bg-[#4F46E5] px-4 py-3.5 text-white shadow-lg">
          <div className="flex items-center gap-3">
            <span className="text-xl shrink-0">📱</span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold leading-snug">
                {isIOS ? `Add ${appName} to your Home Screen` : `Install ${appName}`}
              </p>
              <p className="text-[11px] text-white/70 mt-0.5">Get the full app experience</p>
            </div>
            {isIOS ? (
              <button
                onClick={() => { setShowIOSSheet(true); dismiss(); }}
                className="shrink-0 rounded-lg bg-slate-800 px-3.5 py-2 text-[12px] font-bold text-[#4F46E5] hover:bg-slate-800/90 transition-colors"
              >
                Show Me How
              </button>
            ) : (
              <button
                onClick={handleAndroidInstall}
                className="shrink-0 rounded-lg bg-slate-800 px-3.5 py-2 text-[12px] font-bold text-[#4F46E5] hover:bg-slate-800/90 transition-colors"
              >
                Install
              </button>
            )}
            <button onClick={dismiss} className="p-1 shrink-0 text-white/50 hover:text-white" aria-label="Dismiss">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
      </div>
      {showIOSSheet && <IOSInstructions onClose={() => setShowIOSSheet(false)} />}
    </>
  );
}
