'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import EvryWherMark from '@/components/EvryWherMark';

export default function DownloadPage() {
  const [apkSize, setApkSize] = useState<string | null>(null);

  useEffect(() => {
    // Fetch APK file size via HEAD request
    fetch('/downloads/evrywher.apk', { method: 'HEAD' })
      .then(res => {
        if (res.ok) {
          const bytes = Number(res.headers.get('content-length'));
          if (bytes > 0) {
            const mb = (bytes / (1024 * 1024)).toFixed(1);
            setApkSize(`${mb} MB`);
          }
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Hero */}
      <section className="px-6 pt-16 pb-8 text-center max-w-[400px] mx-auto">
        <div className="flex justify-center mb-4">
          <AnimatedPocketChatLogo size={72} isTranslating />
        </div>
        <EvryWherMark size="lg" className="justify-center mb-4" />
        <h1 className="text-[28px] font-bold text-slate-100 leading-tight">
          Get Evrywher
        </h1>
        <p className="mt-2 text-[14px] text-slate-400">
          Chat with anyone, in any language
        </p>
      </section>

      {/* Cards */}
      <section className="px-6 pb-8 max-w-[400px] mx-auto space-y-4">

        {/* ANDROID CARD */}
        <div className="rounded-2xl border border-green-500/20 bg-slate-800 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#16a34a">
                <path d="M6 18c0 .55.45 1 1 1h1v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h2v3.5c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5V19h1c.55 0 1-.45 1-1V7H6v11zM3.5 7C2.67 7 2 7.67 2 8.5v7c0 .83.67 1.5 1.5 1.5S5 16.33 5 15.5v-7C5 7.67 4.33 7 3.5 7zm17 0c-.83 0-1.5.67-1.5 1.5v7c0 .83.67 1.5 1.5 1.5s1.5-.67 1.5-1.5v-7c0-.83-.67-1.5-1.5-1.5zm-4.97-5.84l1.3-1.3c.2-.2.2-.51 0-.71-.2-.2-.51-.2-.71 0l-1.48 1.48C13.85.55 12.95.25 12 .25c-.95 0-1.85.3-2.64.88L7.88.15c-.2-.2-.51-.2-.71 0-.2.2-.2.51 0 .71l1.31 1.31C6.97 3.26 6 5.01 6 7h12c0-1.99-.97-3.75-2.47-4.84zM10 5H9V4h1v1zm5 0h-1V4h1v1z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-white">Download for Android</h2>
              <p className="text-[13px] text-slate-400">Direct install — no Google Play needed</p>
            </div>
          </div>

          <a
            href="/downloads/evrywher.apk"
            download
            className="block w-full rounded-[14px] bg-[#16a34a] hover:bg-[#15803d] transition-colors py-3.5 text-center text-[15px] font-semibold text-white"
          >
            Download APK
          </a>

          {apkSize && (
            <div className="mt-3 flex justify-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-700/60 px-3 py-1 text-[11px] text-slate-300">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {apkSize}
              </span>
            </div>
          )}

          <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
            After download, tap the file to install. You may need to allow &quot;Install from unknown sources&quot; in your phone settings.
          </p>
        </div>

        {/* iPHONE CARD */}
        <div className="rounded-2xl border border-blue-500/20 bg-slate-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <svg width="20" height="24" viewBox="0 0 17 20" fill="#2563eb">
                <path d="M13.34 10.17c-.01-2.07 1.7-3.07 1.77-3.12-.97-1.41-2.47-1.6-3-1.63-1.27-.13-2.49.75-3.14.75-.65 0-1.65-.73-2.72-.71-1.39.02-2.68.81-3.4 2.06-1.45 2.52-.37 6.25 1.04 8.3.69 1 1.52 2.12 2.6 2.08 1.04-.04 1.44-.67 2.7-.67 1.26 0 1.62.67 2.73.65 1.12-.02 1.84-.97 2.52-1.97.8-1.16 1.12-2.29 1.14-2.35-.02-.01-2.19-.84-2.21-3.34zM11.28 3.55c.56-.69.94-1.64.84-2.59-.81.03-1.8.54-2.38 1.22-.52.6-.97 1.56-.85 2.49.9.07 1.82-.46 2.39-1.12z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-[18px] font-bold text-white">Install on iPhone</h2>
              <p className="text-[13px] text-slate-400">Add to Home Screen — works like a native app</p>
            </div>
          </div>

          <div className="space-y-4 mb-5">
            <Step n={1} icon="safari" label="Open evrywher.io in Safari" />
            <Step n={2} icon="share" label="Tap the Share button at the bottom of the screen" />
            <Step n={3} icon="plus" label={'Scroll down and tap "Add to Home Screen"'} />
            <Step n={4} icon="check" label={'Turn on "Open as Web App" if prompted, then tap "Add"'} />
          </div>

          <a
            href="https://www.evrywher.io"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full rounded-[14px] bg-[#2563eb] hover:bg-[#1d4ed8] transition-colors py-3.5 text-center text-[15px] font-semibold text-white"
          >
            Open evrywher.io
          </a>
          <p className="mt-2 text-[11px] text-slate-500 leading-relaxed text-center">
            Safari works best for this — other browsers may not show the &quot;Add to Home Screen&quot; option.
          </p>
        </div>
      </section>

      {/* Coming soon */}
      <section className="px-6 pb-8 text-center max-w-[400px] mx-auto">
        <p className="text-[12px] text-slate-500 uppercase tracking-wider mb-4">Coming soon on</p>
        <div className="flex justify-center gap-3">
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-2.5 flex items-center gap-2 opacity-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
            <span className="text-[13px] font-medium text-slate-500">App Store</span>
          </div>
          <div className="rounded-xl bg-slate-800/60 border border-slate-700 px-4 py-2.5 flex items-center gap-2 opacity-50">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8"><path d="M3.18 23.79c.27.44.76.71 1.28.68.2-.01.39-.06.56-.15l17.25-9.78c.49-.28.79-.8.79-1.36s-.3-1.08-.79-1.36L5.02.04C4.85-.05 4.66-.1 4.46-.11c-.52-.03-1.01.24-1.28.68-.17.27-.26.59-.26.92V22.87c0 .33.09.65.26.92zM5.62 2.19L14.41 12l-8.79 9.81V2.19z"/></svg>
            <span className="text-[13px] font-medium text-slate-500">Google Play</span>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[13px] text-slate-500">
            Or use the web app:{' '}
            <Link href="/" className="text-indigo-400 font-medium hover:underline">
              evrywher.io
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}

/* ---- Step component for iPhone guide ---- */

function Step({ n, icon, label }: { n: number; icon: 'safari' | 'share' | 'plus' | 'check'; label: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-[12px] font-bold text-indigo-400">
        {n}
      </div>
      <div className="flex items-center gap-2 pt-0.5">
        <StepIcon type={icon} />
        <p className="text-[13px] text-slate-200 leading-relaxed">{label}</p>
      </div>
    </div>
  );
}

function StepIcon({ type }: { type: 'safari' | 'share' | 'plus' | 'check' }) {
  const cls = "w-4 h-4 shrink-0";
  switch (type) {
    case 'safari':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
      );
    case 'share':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
        </svg>
      );
    case 'plus':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
      );
    case 'check':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      );
  }
}
