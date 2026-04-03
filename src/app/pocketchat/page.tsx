'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PocketChatMark, PocketMark } from '@/components/Logo';
import HeroChatMockup from '@/components/HeroChatMockup';

const greetings = [
  { to: 'やあ', lang: 'Japanese' }, { to: 'Hola', lang: 'Spanish' },
  { to: 'مرحبا', lang: 'Arabic' }, { to: '你好', lang: 'Chinese' },
  { to: 'سلام', lang: 'Urdu' }, { to: 'Olá', lang: 'Portuguese' },
  { to: 'Bonjour', lang: 'French' }, { to: 'Merhaba', lang: 'Turkish' },
];

const FEATURES = [
  { title: 'Translated text chat', desc: 'Type in your language. They read in theirs. 13 languages, real-time. Nobody knows you don\'t speak their language.', color: '#4F46E5', bg: '#eef2ff', icon: 'M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z' },
  { title: 'Voice messages', desc: 'Record in English. They hear it in Japanese — in your voice. Tap to play the translation in any language.', color: '#F59E0B', bg: '#fef3c7', icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2' },
  { title: 'Live translated calls', desc: 'Call anyone in any language. You speak English, they hear Japanese. Real-time AI translation with live subtitles.', color: '#16a34a', bg: '#f0fdf4', icon: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72', badge: 'NEW' },
  { title: 'AI Bot auto-reply', desc: 'Create a bot that replies when you can\'t. Set rules in plain language. Always available for your customers.', color: '#7c3aed', bg: '#f5f3ff', icon: 'M3 11h18v10H3zM12 2a3 3 0 100 6M8 16h.01M16 16h.01' },
  { title: 'QR code sharing', desc: 'Generate a QR code for your business. Customers scan and start chatting — no app download, no signup required.', color: '#ec4899', bg: '#fdf2f8', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z' },
  { title: 'Photo translation', desc: 'Snap a photo of any menu, sign, or document. AI reads the text and translates it instantly — 13 languages.', color: '#0891b2', bg: '#ecfeff', icon: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z' },
];

export default function PocketChatLanding() {
  const [idx, setIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const interval = setInterval(() => {
      setFade(false);
      timeout = setTimeout(() => { setIdx(i => (i + 1) % greetings.length); setFade(true); }, 200);
    }, 2000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, []);

  const g = greetings[idx];

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Nav */}
      <nav className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex items-center gap-2">
          <PocketChatMark size={36} />
          <span className="text-lg font-bold text-[#111827]">Pocket<span className="text-[#F59E0B]">Chat</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#6b7280] hover:text-[#111827]">Log in</Link>
          <Link href="/signup?mode=pocketchat" className="rounded-lg bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4338ca]">Start chatting free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-[1100px] px-6 pb-16 pt-12">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2">
          {/* LEFT — Live Chat Mockup */}
          <div className="mx-auto w-full max-w-[400px] lg:mx-0" aria-hidden="true">
            <HeroChatMockup />
          </div>

          {/* RIGHT — Hero Text */}
          <div className="text-center lg:text-left">
            <span className="mb-4 inline-block rounded-full bg-[#eef2ff] px-4 py-1 text-xs font-semibold text-[#4F46E5]">13 LANGUAGES · REAL-TIME AI</span>
            <h1 className="mb-2 text-[clamp(36px,5vw,56px)] font-bold leading-[1.08] tracking-tight text-[#111827]">
              You say <span className="text-[#4F46E5]">Hi</span>.<br/>
              They hear{' '}
              <span className="text-[#F59E0B] transition-opacity duration-200" style={{ opacity: fade ? 1 : 0 }}>{g.to}</span>
              <span className="ml-2 text-base font-normal text-[#6b7280] transition-opacity duration-200" style={{ opacity: fade ? 1 : 0 }}>{g.lang}</span>
            </h1>
            <p className="mx-auto mb-8 max-w-[520px] text-lg leading-relaxed text-[#374151] lg:mx-0">
              The world&apos;s first messenger that translates everything. Text. Voice messages. Live calls. In your voice.
            </p>
            <div className="mb-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/signup?mode=pocketchat" className="rounded-[10px] bg-[#4F46E5] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#4338ca] transition-colors">Start chatting free</Link>
              <a href="#features" className="rounded-[10px] border border-[#e5e7eb] px-8 py-3.5 text-[15px] font-semibold text-[#374151] hover:border-[#d1d5db] transition-colors">See features</a>
            </div>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {['English', 'Japanese', 'Urdu', 'Arabic', 'Bengali', 'Portuguese', 'Filipino', 'Vietnamese', 'Turkish', 'Chinese', 'French', 'Dutch', 'Spanish'].map((l, i) => (
                <span key={i} className="rounded-full border border-[#e5e7eb] px-3 py-1 text-xs text-[#6b7280]">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-[#f9fafb] px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-10 text-center">
            <h2 className="text-[32px] font-bold text-[#111827]">Everything translates.</h2>
            <p className="mt-3 text-base text-[#374151]">Text, voice, photos, calls — all in 13 languages.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-6">
                {f.badge && <div className="absolute right-3 top-3 rounded-full bg-[#16a34a] px-2 py-0.5 text-[10px] font-bold text-white">{f.badge}</div>}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-[10px]" style={{ background: f.bg }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                </div>
                <h3 className="mb-1.5 text-[15px] font-semibold text-[#111827]">{f.title}</h3>
                <p className="text-[13px] leading-relaxed text-[#374151]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Promotion */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-3xl bg-[#eef2ff] p-[clamp(32px,5vw,56px)] text-center">
            <div className="mb-4 flex items-center justify-center gap-2">
              <PocketMark variant="sm" />
              <span className="text-sm font-bold text-[#4F46E5]">BIZPOCKET</span>
            </div>
            <h2 className="mb-3 text-[28px] font-bold text-[#111827]">PocketChat is built into BizPocket</h2>
            <p className="mx-auto mb-8 max-w-[560px] text-[15px] leading-relaxed text-[#374151]">
              The AI business operating system for foreigners in Japan. Invoices, cash flow, website builder, ops radar, accountant portal — and PocketChat for all your conversations.
            </p>
            <div className="mb-6 flex flex-wrap justify-center gap-2">
              {['Fire Invoice', 'Money View', 'AI Command Hub', 'Website Builder', 'Ops Radar', 'Accountant Portal'].map((f, i) => (
                <span key={i} className="rounded-full border border-[#c7d2fe] bg-white px-3 py-1 text-xs font-semibold text-[#4F46E5]">{f}</span>
              ))}
            </div>
            <a href="https://bizpocket.io" target="_blank" rel="noreferrer" className="inline-block rounded-[10px] bg-[#4F46E5] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#4338ca] transition-colors">
              Explore BizPocket
            </a>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-[#f3f4f6] bg-[#111827] px-6 py-20 text-center">
        <h2 className="mb-4 text-[32px] font-bold text-white">Ready to break the language barrier?</h2>
        <p className="mb-8 text-base text-[#d1d5db]">Free forever. No credit card. Set up in 30 seconds.</p>
        <Link href="/signup?mode=pocketchat" className="inline-block rounded-xl bg-[#F59E0B] px-10 py-4 text-base font-bold text-[#111827] hover:bg-[#d97706] transition-colors">
          Get PocketChat free
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#f3f4f6] bg-white">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-6 py-8">
          <a href="https://bizpocket.io" target="_blank" rel="noreferrer" className="flex items-center gap-2 no-underline">
            <PocketMark variant="sm" />
            <span className="text-[13px] text-[#6b7280]">Powered by <span className="font-semibold text-[#4F46E5]">BizPocket</span></span>
          </a>
          <div className="flex flex-wrap items-center gap-2">
            <a href="/privacy" className="text-xs text-[#6b7280] hover:text-[#111827]">Privacy</a>
            <span className="text-[#d1d5db]">&middot;</span>
            <a href="/terms" className="text-xs text-[#6b7280] hover:text-[#111827]">Terms</a>
            <span className="text-[#d1d5db]">&middot;</span>
            <span className="text-xs text-[#6b7280]">&copy; 2026 TechDagger Studio</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
