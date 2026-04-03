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
  { title: 'Translated Text Chat', desc: 'Type in your language. Your contact reads theirs. 13 languages, zero delay.', color: '#4F46E5', bg: '#eef2ff', icon: 'M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z' },
  { title: 'Voice Messages', desc: 'Record a voice message. PocketChat transcribes, translates, and speaks it in their language.', color: '#F59E0B', bg: '#fef3c7', icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2' },
  { title: 'Live Voice Calls', desc: 'Real-time translated phone calls. You speak English, they hear Japanese. Like magic.', color: '#16a34a', bg: '#f0fdf4', icon: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72', badge: 'NEW' },
  { title: 'Voice Cloning', desc: 'Your voice, their language. AI clones your voice and speaks the translation as YOU.', color: '#dc2626', bg: '#fef2f2', icon: 'M9 18V5l12-2v13M6 18a3 3 0 100-6M18 16a3 3 0 100-6' },
  { title: 'AI Bot / Auto-Reply', desc: 'Set up a personal AI agent. Custom rules, personality, auto-replies when you\'re busy.', color: '#7c3aed', bg: '#f5f3ff', icon: 'M3 11h18v10H3zM12 2a3 3 0 100 6M8 16h.01M16 16h.01' },
  { title: 'QR Code Sharing', desc: 'Share your PocketChat contact instantly. One scan, they\'re connected.', color: '#ec4899', bg: '#fdf2f8', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z' },
  { title: 'Website Widget', desc: 'Embed PocketChat on any website. Customers chat from your Instagram, website, anywhere.', color: '#0891b2', bg: '#ecfeff', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z' },
  { title: 'Photo Translation', desc: 'Snap a photo of Japanese text — menus, signs, documents. Instant translation.', color: '#ea580c', bg: '#fff7ed', icon: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z' },
  { title: 'Live Video Guide', desc: 'Point your camera at any screen or sign. AI gives you step-by-step guidance in your language.', color: '#4F46E5', bg: '#eef2ff', icon: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z', badge: 'COMING' },
  { title: 'Smart Typing Indicator', desc: 'Know when your contact is composing. Animated indicator with multilingual greetings.', color: '#F59E0B', bg: '#fef3c7', icon: 'M5 12h2m4 0h2m4 0h2' },
];

const LANGUAGES = [
  { name: 'English', native: 'English', flag: '🇬🇧' },
  { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { name: 'Filipino', native: 'Filipino', flag: '🇵🇭' },
  { name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { name: 'French', native: 'Français', flag: '🇫🇷' },
  { name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
  { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
];

const STEPS = [
  { num: '1', title: 'Sign up free', desc: '30 seconds. No credit card.', color: '#4F46E5', bg: '#eef2ff', icon: 'M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8z' },
  { num: '2', title: 'Add your contacts', desc: 'Share QR code or invite link.', color: '#F59E0B', bg: '#fef3c7', icon: 'M17 21v-2a4 4 0 00-3-3.87M9 7a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { num: '3', title: 'Start talking', desc: 'Type, speak, or call in any language.', color: '#16a34a', bg: '#f0fdf4', icon: 'M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z' },
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

      {/* 1. Navbar */}
      <nav className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div className="flex items-center gap-2">
          <PocketChatMark size={28} />
          <span className="text-[17px] font-bold text-[#111827]">Pocket<span className="text-[#F59E0B]">Chat</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#6b7280] hover:text-[#111827] transition-colors">Log in</Link>
          <Link href="/signup?mode=pocketchat" className="rounded-lg bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] transition-colors">Start Free</Link>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="mx-auto max-w-[1100px] px-6 pb-20 pt-12">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[420px] lg:mx-0" aria-hidden="true">
            <HeroChatMockup />
          </div>
          <div className="text-center lg:text-left">
            <span className="mb-5 inline-block rounded-full bg-[#eef2ff] px-4 py-1.5 text-xs font-semibold tracking-wide text-[#4F46E5]">13 LANGUAGES · REAL-TIME AI</span>
            <h1 className="mb-3 text-[clamp(36px,5vw,56px)] font-bold leading-[1.08] tracking-tight text-[#111827]">
              You say <span className="text-[#4F46E5]">Hi</span>.<br />
              They hear{' '}
              <span className="text-[#F59E0B] transition-opacity duration-200" style={{ opacity: fade ? 1 : 0 }}>{g.to}</span>
              <span className="ml-2 text-base font-normal text-[#6b7280] transition-opacity duration-200" style={{ opacity: fade ? 1 : 0 }}>{g.lang}</span>
            </h1>
            <p className="mx-auto mb-8 max-w-[520px] text-[17px] leading-relaxed text-[#374151] lg:mx-0">
              The world&apos;s first messenger that translates everything. Text. Voice. Video. In your voice.
            </p>
            <div className="mb-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <Link href="/signup?mode=pocketchat" className="rounded-[10px] bg-[#4F46E5] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#4338ca] transition-colors">Start chatting free</Link>
              <a href="#features" className="rounded-[10px] border border-[#e5e7eb] px-8 py-3.5 text-[15px] font-semibold text-[#374151] hover:border-[#d1d5db] transition-colors">See it in action</a>
            </div>
            <div className="flex flex-wrap justify-center gap-2 lg:justify-start">
              {['English', 'Japanese', 'Urdu', 'Arabic', 'Bengali', 'Portuguese', 'Filipino', 'Vietnamese', 'Turkish', 'Chinese', 'French', 'Dutch', 'Spanish'].map((l, i) => (
                <span key={i} className="rounded-full border border-[#e5e7eb] px-3 py-1 text-xs text-[#6b7280]">{l}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid — 10 features */}
      <section id="features" className="bg-[#f9fafb] px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <h2 className="text-[32px] font-bold text-[#111827]">Everything translates.</h2>
            <p className="mt-3 text-base text-[#374151]">Text, voice, photos, video, calls — all in 13 languages.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-sm">
                {f.badge && <div className="absolute right-3 top-3 rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ background: f.badge === 'COMING' ? '#fef3c7' : '#dcfce7', color: f.badge === 'COMING' ? '#92400e' : '#166534' }}>{f.badge}</div>}
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

      {/* 4. How It Works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <h2 className="text-[32px] font-bold text-[#111827]">Three steps. That&apos;s it.</h2>
            <p className="mt-3 text-base text-[#374151]">From zero to translated conversations in under a minute.</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: s.bg }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={s.icon} /></svg>
                </div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: s.color }}>Step {s.num}</div>
                <h3 className="mb-1 text-lg font-bold text-[#111827]">{s.title}</h3>
                <p className="text-sm text-[#374151]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Languages Section */}
      <section className="bg-[#f9fafb] px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <h2 className="text-[32px] font-bold text-[#111827]">13 languages. One chat.</h2>
            <p className="mt-3 text-base text-[#374151]">Every language pair works in both directions, in real-time.</p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {LANGUAGES.map((lang, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3">
                <span className="text-2xl">{lang.flag}</span>
                <div>
                  <p className="text-sm font-semibold text-[#111827]">{lang.native}</p>
                  <p className="text-[11px] text-[#6b7280]">{lang.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Cross-Promotion */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-3xl bg-[#eef2ff] p-[clamp(32px,5vw,56px)] text-center">
            <div className="mb-5 flex items-center justify-center">
              <PocketMark variant="lg" />
            </div>
            <h2 className="mb-3 text-[28px] font-bold text-[#111827]">PocketChat is built into BizPocket</h2>
            <p className="mx-auto mb-8 max-w-[560px] text-[15px] leading-relaxed text-[#374151]">
              The AI business autopilot — invoices, orders, website builder, operations radar, and more. Everything your business needs.
            </p>
            <div className="mb-8 flex flex-wrap justify-center gap-2">
              {['Fire Invoice', 'Money View', 'AI Command Hub', 'Website Builder', 'Ops Radar', 'Snap & Vault', 'Accountant Portal'].map((f, i) => (
                <span key={i} className="rounded-full border border-[#c7d2fe] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#4F46E5]">{f}</span>
              ))}
            </div>
            <a href="https://bizpocket.io" target="_blank" rel="noreferrer" className="inline-block rounded-[10px] bg-[#4F46E5] px-8 py-3.5 text-[15px] font-semibold text-white hover:bg-[#4338ca] transition-colors">
              Explore BizPocket &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* 7. CTA Banner */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-3xl bg-[#111827] px-8 py-16 text-center">
            <h2 className="mb-4 text-[clamp(24px,4vw,36px)] font-bold text-white">Ready to break the language barrier?</h2>
            <p className="mb-8 text-base text-[#d1d5db]">No credit card. Free forever. Upgrade anytime.</p>
            <Link href="/signup?mode=pocketchat" className="inline-block rounded-xl bg-[#F59E0B] px-10 py-4 text-base font-bold text-[#111827] hover:bg-[#d97706] transition-colors">
              Start chatting free
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer */}
      <footer className="bg-[#f9fafb]">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-2">
            <PocketChatMark size={24} />
            <span className="text-xs text-[#6b7280]">&copy; 2026 TechDagger Studio</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <a href="/privacy" className="text-xs text-[#6b7280] hover:text-[#111827] transition-colors">Privacy</a>
            <span className="text-[#d1d5db]">&middot;</span>
            <a href="/terms" className="text-xs text-[#6b7280] hover:text-[#111827] transition-colors">Terms</a>
            <span className="text-[#d1d5db]">&middot;</span>
            <a href="mailto:hello@bizpocket.io" className="text-xs text-[#6b7280] hover:text-[#111827] transition-colors">Contact</a>
          </div>
          <a href="https://bizpocket.io" target="_blank" rel="noreferrer" className="flex items-center gap-2 no-underline">
            <PocketMark variant="sm" />
            <span className="text-xs text-[#6b7280]">Powered by <span className="font-semibold text-[#4F46E5]">BizPocket</span></span>
          </a>
        </div>
      </footer>
    </div>
  );
}
