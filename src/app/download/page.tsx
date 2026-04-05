'use client';

import { useState, useEffect } from 'react';
import { PocketChatMark } from '@/components/Logo';
import EvryWherMark from '@/components/EvryWherMark';
import { getBrandMode } from '@/lib/brand';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function DownloadPage() {
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPocketChat] = useState(() => getBrandMode() === 'evrywher');
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsAndroid(/Android/.test(navigator.userAgent));
    setInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }

  const appName = isPocketChat ? 'Evrywher' : 'BizPocket';

  return (
    <div className="min-h-screen bg-slate-900">
      <PageHeader title="Download" backPath="/" />
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <PocketChatMark size={32} />
          <EvryWherMark size="sm" />
        </Link>
        <Link href="/login" className="text-sm text-indigo-400 font-medium hover:underline">Log in</Link>
      </nav>

      {/* Hero */}
      <section className="px-6 pt-12 pb-8 text-center max-w-lg mx-auto">
        <div className="mx-auto mb-6">
          <PocketChatMark size={80} />
        </div>
        <h1 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-white leading-tight">
          Get {appName} on your phone
        </h1>
        <p className="mt-3 text-[15px] text-slate-200 leading-relaxed">
          Install {appName} as a real app — no app store needed.
          It works offline, sends notifications, and feels native.
        </p>
        {installed && (
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></svg>
            Already installed!
          </div>
        )}
      </section>

      {/* Install sections */}
      <section className="px-6 pb-12 max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* iPhone */}
          <div className={`rounded-2xl border p-6 space-y-4 ${isIOS ? 'border-[#4F46E5] bg-[#4F46E5]/[0.02] ring-1 ring-[#4F46E5]/20' : 'border-slate-700 bg-slate-800'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">📱</span>
              <h2 className="text-[15px] font-bold text-slate-50">iPhone / iPad</h2>
              {isIOS && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4F46E5] text-white">YOUR DEVICE</span>}
            </div>

            <div className="space-y-3">
              <Step n={1} title="Open in Safari">
                Make sure you&apos;re using <strong>Safari</strong> (not Chrome or other browsers)
              </Step>
              <Step n={2} title="Tap the Share button">
                <span className="inline-flex items-center gap-1">
                  Tap the
                  <svg className="inline -mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  icon at the bottom
                </span>
              </Step>
              <Step n={3} title='Tap "Add to Home Screen"'>
                Scroll down in the share menu to find it
              </Step>
              <Step n={4} title='Tap "Add"'>
                The app icon appears on your home screen — done!
              </Step>
            </div>
          </div>

          {/* Android */}
          <div className={`rounded-2xl border p-6 space-y-4 ${isAndroid ? 'border-[#4F46E5] bg-[#4F46E5]/[0.02] ring-1 ring-[#4F46E5]/20' : 'border-slate-700 bg-slate-800'}`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">🤖</span>
              <h2 className="text-[15px] font-bold text-slate-50">Android</h2>
              {isAndroid && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4F46E5] text-white">YOUR DEVICE</span>}
            </div>

            {deferredPrompt ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">One tap to install — no app store required.</p>
                <button
                  onClick={handleInstall}
                  className="w-full rounded-xl bg-[#4F46E5] py-3 text-sm font-semibold text-white hover:bg-[#4338CA] transition-colors"
                >
                  Install {appName}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <Step n={1} title="Open in Chrome">
                  Use <strong>Chrome</strong> for the best experience
                </Step>
                <Step n={2} title='Tap the "⋮" menu'>
                  Top-right corner of Chrome
                </Step>
                <Step n={3} title='Tap "Install app" or "Add to Home Screen"'>
                  The app installs instantly
                </Step>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <section className="px-6 pb-8 text-center">
        <p className="text-xs text-slate-300 font-medium uppercase tracking-wider mb-4">Coming soon</p>
        <div className="flex justify-center gap-4">
          <div className="rounded-xl bg-slate-800 border border-slate-600 px-5 py-3 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#CBD5E1"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            <span className="text-sm font-medium text-slate-300">App Store</span>
          </div>
          <div className="rounded-xl bg-slate-800 border border-slate-600 px-5 py-3 flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#CBD5E1"><path d="M3.18 23.48L14.31 12 3.18.52c-.18.18-.3.42-.3.7v21.56c0 .28.12.52.3.7zm1.2.82l12.38-7.15L5.04.7l-.66-.38 12.38 7.15-12.38 7.15.66-.38-12.38 7.15zm13.55-7.83l-3.38-1.95L3.18 23.48l14.75-6.51zm0-8.94L3.18.52l11.37 8.96 3.38-1.95z"/></svg>
            <span className="text-sm font-medium text-slate-300">Google Play</span>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 pb-16 max-w-lg mx-auto">
        <h3 className="text-sm font-bold text-white mb-4">FAQ</h3>
        <div className="space-y-4">
          <FAQ q="Is this a real app?" a={`Yes! ${appName} is a Progressive Web App (PWA). It installs on your phone like a regular app — with its own icon, full-screen mode, and push notifications. No app store download needed.`} />
          <FAQ q="Does it work offline?" a="Core features work offline. Messages and data sync automatically when you reconnect." />
          <FAQ q="Is it safe?" a={`Absolutely. ${appName} runs in your browser's secure sandbox. Your data is encrypted end-to-end with Supabase.`} />
          <FAQ q="How do I uninstall?" a="Same as any app — long-press the icon and delete. On iPhone, you can also remove it from Settings." />
        </div>
      </section>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-indigo-400 text-[11px] font-bold">{n}</div>
      <div>
        <p className="text-[13px] font-semibold text-white">{title}</p>
        <p className="text-[12px] text-slate-200 mt-0.5 leading-relaxed">{children}</p>
      </div>
    </div>
  );
}

function FAQ({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800 transition-colors">
        <span className="text-[13px] font-medium text-white">{q}</span>
        <svg className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-[12px] text-slate-200 leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}
