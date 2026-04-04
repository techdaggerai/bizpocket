'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PocketMark } from '@/components/Logo';
import HeroChatMockup from '@/components/HeroChatMockup';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import PocketChatTypingIndicator from '@/components/PocketChatTypingIndicator';
import AnimatedTagline from '@/components/AnimatedTagline';

const greetings = [
  { to: 'やあ', lang: 'Japanese' }, { to: 'Hola', lang: 'Spanish' },
  { to: 'مرحبا', lang: 'Arabic' }, { to: '你好', lang: 'Chinese' },
  { to: 'سلام', lang: 'Urdu' }, { to: 'Olá', lang: 'Portuguese' },
  { to: 'Bonjour', lang: 'French' }, { to: 'Merhaba', lang: 'Turkish' },
];

const FEATURES = [
  { title: 'Translated Text Chat', desc: 'Type in your language. Your contact reads theirs. 21 languages, zero delay.', color: '#4F46E5', bg: '#eef2ff', icon: 'M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z' },
  { title: 'Voice Messages', desc: 'Record a voice message. Evrywher transcribes, translates, and speaks it in their language.', color: '#F59E0B', bg: '#fef3c7', icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2' },
  { title: 'Live Voice Calls', desc: 'Real-time translated phone calls. You speak English, they hear Japanese. Like magic.', color: '#16a34a', bg: '#f0fdf4', icon: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72', badge: 'NEW' },
  { title: 'Voice Cloning', desc: 'Your voice, their language. AI clones your voice and speaks the translation as YOU.', color: '#dc2626', bg: '#fef2f2', icon: 'M9 18V5l12-2v13M6 18a3 3 0 100-6M18 16a3 3 0 100-6' },
  { title: 'AI Bot / Auto-Reply', desc: 'Set up a personal AI agent. Custom rules, personality, auto-replies when you\'re busy.', color: '#7c3aed', bg: '#f5f3ff', icon: 'M3 11h18v10H3zM12 2a3 3 0 100 6M8 16h.01M16 16h.01' },
  { title: 'QR Code Sharing', desc: 'Share your Evrywher contact instantly. One scan, they\'re connected.', color: '#ec4899', bg: '#fdf2f8', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM17 14h1v1h-1zM14 17h1v1h-1zM20 17h1v1h-1zM17 20h1v1h-1z' },
  { title: 'Website Widget', desc: 'Embed Evrywher on any website. Customers chat from your Instagram, website, anywhere.', color: '#0891b2', bg: '#ecfeff', icon: 'M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z' },
  { title: 'Photo Translation', desc: 'Snap a photo of Japanese text — menus, signs, documents. Instant translation.', color: '#ea580c', bg: '#fff7ed', icon: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z' },
  { title: 'Live Video Guide', desc: 'Point your camera at any screen or sign. AI gives you step-by-step guidance in your language.', color: '#4F46E5', bg: '#eef2ff', icon: 'M23 7l-7 5 7 5V7zM14 5H3a2 2 0 00-2 2v10a2 2 0 002 2h11a2 2 0 002-2V7a2 2 0 00-2-2z', badge: 'COMING' },
  { title: 'Smart Typing Indicator', desc: 'Know when your contact is composing. Animated indicator with multilingual greetings.', color: '#F59E0B', bg: '#fef3c7', icon: 'M5 12h2m4 0h2m4 0h2' },
];

const LANGUAGES = [
  { name: 'English', native: 'English', flag: '🇬🇧' },
  { name: 'Japanese', native: '日本語', flag: '🇯🇵' },
  { name: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { name: 'Chinese', native: '中文', flag: '🇨🇳' },
  { name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { name: 'Spanish', native: 'Español', flag: '🇪🇸' },
  { name: 'Korean', native: '한국어', flag: '🇰🇷' },
  { name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { name: 'French', native: 'Français', flag: '🇫🇷' },
  { name: 'Bengali', native: 'বাংলা', flag: '🇧🇩' },
  { name: 'Urdu', native: 'اردو', flag: '🇵🇰' },
  { name: 'Turkish', native: 'Türkçe', flag: '🇹🇷' },
  { name: 'Filipino', native: 'Filipino', flag: '🇵🇭' },
  { name: 'Vietnamese', native: 'Tiếng Việt', flag: '🇻🇳' },
  { name: 'Persian', native: 'فارسی', flag: '🇮🇷' },
  { name: 'Pashto', native: 'پښتو', flag: '🇦🇫' },
  { name: 'Thai', native: 'ไทย', flag: '🇹🇭' },
  { name: 'Indonesian', native: 'Bahasa', flag: '🇮🇩' },
  { name: 'Nepali', native: 'नेपाली', flag: '🇳🇵' },
  { name: 'Sinhala', native: 'සිංහල', flag: '🇱🇰' },
  { name: 'Dutch', native: 'Nederlands', flag: '🇳🇱' },
];



const FAQ_ITEMS = [
  {
    q: 'Is it really free?',
    a: 'Yes — unlimited chat with your contacts is free forever. You get 3 AI-powered translations per day on the free plan. Need more? Pro plans start at ¥1,980/month.',
  },
  {
    q: 'How accurate are the translations?',
    a: "Powered by Claude AI by Anthropic — one of the most advanced language models in the world. It understands context, tone, and cultural nuance, not just literal word-for-word translation.",
  },
  {
    q: 'Is my data safe?',
    a: 'All messages are encrypted in transit and at rest. Data is stored on servers in Japan (Supabase Tokyo). We never read your messages, never sell your data, and never share it with third parties.',
  },
  {
    q: 'What languages are supported?',
    a: 'Currently 21: English, Japanese, Arabic, Korean, Chinese, Hindi, Portuguese, Spanish, French, Urdu, Bengali, Turkish, Filipino, Vietnamese, Persian, Pashto, Thai, Indonesian, Nepali, Sinhala, and Dutch. More coming.',
  },
  {
    q: 'Can I use Evrywher for my business?',
    a: 'Absolutely. Pro and Business plans unlock unlimited AI translations, voice message translation, group chat, the AI auto-reply bot, and priority support. Perfect for international teams, customer service, and client communication.',
  },
];

function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="px-6 py-20 bg-white">
      <div className="mx-auto max-w-[720px]">
        <div className="mb-10 text-center">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Got questions?</p>
          <h2 className="text-[clamp(24px,4vw,34px)] font-bold text-[#111827]">Frequently asked</h2>
        </div>
        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f9fafb]"
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                aria-expanded={open === i}
              >
                <span className="text-[15px] font-semibold text-[#111827]">{item.q}</span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#4F46E5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 transition-transform duration-200"
                  style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
              {open === i && (
                <div className="border-t border-[#e5e7eb] px-6 py-4">
                  <p className="text-[14px] leading-relaxed text-[#374151]">{item.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

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
          <AnimatedPocketChatLogo size={32} isTranslating={true} />
          <span className="text-[17px] font-bold text-[#111827]"><span className="text-[#0A0A0A]">Evry</span><span className="text-[#F59E0B]">wher</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#6b7280] hover:text-[#111827] transition-colors">Log in</Link>
          <Link href="/signup?mode=pocketchat" className="rounded-lg bg-[#4F46E5] px-5 py-2 text-sm font-semibold text-white hover:bg-[#4338ca] transition-colors">Start Free</Link>
        </div>
      </nav>

      {/* Brand Showcase — Full Typing Indicator as Hero */}
      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-6 flex justify-center">
            <PocketChatTypingIndicator contactName="Evrywher" size="lg" />
          </div>
          <h2 className="text-4xl font-bold text-[#0A0A0A]" style={{ fontFamily: "'DM Sans', sans-serif" }}><span className="text-[#0A0A0A]">Evry</span><span className="text-[#F59E0B]">wher</span></h2>
          <p className="mt-3 text-lg text-[#6b7280]">Chat in 21 languages — AI translates in real-time</p>
          <AnimatedTagline />
        </div>
      </section>

      {/* 2. Hero Section */}
      <section className="mx-auto max-w-[1100px] px-6 pb-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="mx-auto w-full max-w-[420px] lg:mx-0" aria-hidden="true">
            <HeroChatMockup />
          </div>
          <div className="text-center lg:text-left">
            <span className="mb-5 inline-block rounded-full bg-[#eef2ff] px-4 py-1.5 text-xs font-semibold tracking-wide text-[#4F46E5]">21 LANGUAGES · REAL-TIME AI</span>
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
              {['English', 'Japanese', 'Hindi', 'Chinese', 'Arabic', 'Spanish', 'Korean', 'Portuguese', 'French', 'Bengali', 'Urdu', 'Turkish', 'Filipino', 'Vietnamese', 'Persian', 'Pashto', 'Thai', 'Indonesian', 'Nepali', 'Sinhala', 'Dutch'].map((l, i) => (
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
            <p className="mt-3 text-base text-[#374151]">Text, voice, photos, video, calls — all in 21 languages.</p>
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
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">

            {/* Step 1 */}
            <div className="rounded-2xl border border-[#f3f4f6] bg-white p-8 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#eef2ff] overflow-visible">
                <AnimatedPocketChatLogo size={48} isTranslating={true} />
              </div>
              <div className="mb-2 text-sm font-semibold text-[#4F46E5]">STEP 1</div>
              <h3 className="mb-1 text-xl font-bold text-[#111827]">Sign up free</h3>
              <p className="text-sm text-[#6b7280]">30 seconds. No credit card.</p>
            </div>

            {/* Step 2 */}
            <div className="rounded-2xl border border-[#f3f4f6] bg-white p-8 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#fef3c7]">
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
                  <rect x="4" y="4" width="16" height="16" rx="3" stroke="#4F46E5" strokeWidth="2"/>
                  <rect x="8" y="8" width="8" height="8" rx="1" fill="#4F46E5"/>
                  <rect x="28" y="4" width="16" height="16" rx="3" stroke="#4F46E5" strokeWidth="2"/>
                  <rect x="32" y="8" width="8" height="8" rx="1" fill="#4F46E5"/>
                  <rect x="4" y="28" width="16" height="16" rx="3" stroke="#4F46E5" strokeWidth="2"/>
                  <rect x="8" y="32" width="8" height="8" rx="1" fill="#4F46E5"/>
                  <rect x="28" y="28" width="4" height="4" fill="#F59E0B"/>
                  <rect x="36" y="28" width="8" height="4" fill="#F59E0B"/>
                  <rect x="28" y="36" width="4" height="8" fill="#F59E0B"/>
                  <rect x="36" y="40" width="8" height="4" fill="#F59E0B"/>
                </svg>
              </div>
              <div className="mb-2 text-sm font-semibold text-[#d97706]">STEP 2</div>
              <h3 className="mb-1 text-xl font-bold text-[#111827]">Add your contacts</h3>
              <p className="text-sm text-[#6b7280]">Share QR code or invite link.</p>
            </div>

            {/* Step 3 */}
            <div className="rounded-2xl border border-[#f3f4f6] bg-white p-8 text-center shadow-sm transition-shadow duration-300 hover:shadow-md">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#eef2ff]">
                <svg viewBox="0 0 48 48" width="48" height="48" fill="none">
                  <rect x="2" y="6" width="28" height="20" rx="6" fill="#4F46E5"/>
                  <text x="16" y="20" textAnchor="middle" fontSize="10" fontWeight="700" fill="white">Hi!</text>
                  <rect x="18" y="22" width="28" height="20" rx="6" fill="#F59E0B"/>
                  <text x="32" y="36" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">やあ!</text>
                </svg>
              </div>
              <div className="mb-2 text-sm font-semibold text-[#4F46E5]">STEP 3</div>
              <h3 className="mb-1 text-xl font-bold text-[#111827]">Start talking</h3>
              <p className="text-sm text-[#6b7280]">Type, speak, or call in any language.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Languages Section */}
      <section className="bg-[#f9fafb] px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <h2 className="text-[32px] font-bold text-[#111827]">21 languages. One chat.</h2>
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
            <h2 className="mb-3 text-[28px] font-bold text-[#111827]">Evrywher is built into BizPocket</h2>
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

      {/* 8. Testimonials */}
      <section className="px-6 py-20 bg-white">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Real people. Real conversations.</p>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827]">Trusted by expats worldwide</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                quote: "Finally someone who understands that すみません doesn't just mean sorry",
                name: 'Yuki',
                location: 'Tokyo',
                flag: '🇯🇵',
                avatar: 'Y',
                color: '#F43F5E',
              },
              {
                quote: "My Pakistani family and Japanese in-laws can actually talk now",
                name: 'Ahmed',
                location: 'Osaka',
                flag: '🇵🇰',
                avatar: 'A',
                color: '#F59E0B',
              },
              {
                quote: "The cultural notes are a game changer for business meetings",
                name: 'Sarah',
                location: 'Nagoya',
                flag: '🇬🇧',
                avatar: 'S',
                color: '#4F46E5',
              },
            ].map((t, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-[#f9fafb] p-6">
                {/* Stars */}
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="flex-1 text-[15px] leading-relaxed text-[#374151]">&ldquo;{t.quote}&rdquo;</p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold text-white"
                    style={{ background: t.color }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#111827]">{t.name} {t.flag}</p>
                    <p className="text-[12px] text-[#6b7280]">{t.location}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 9. Comparison */}
      <section className="bg-[#f9fafb] px-6 py-20">
        <div className="mx-auto max-w-[680px]">
          <div className="mb-10 text-center">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Why Evrywher</p>
            <h2 className="text-[clamp(24px,4vw,34px)] font-bold text-[#111827]">Evrywher vs Google Translate</h2>
            <p className="mt-3 text-[15px] text-[#6b7280]">Translate is a tool. Evrywher is a conversation.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#e5e7eb] bg-white shadow-sm">
            {/* Header row */}
            <div className="grid grid-cols-3 border-b border-[#e5e7eb] bg-[#f9fafb] px-6 py-3">
              <div />
              <div className="text-center text-[13px] font-bold text-[#4F46E5]">Evrywher</div>
              <div className="text-center text-[13px] font-semibold text-[#9ca3af]">Google Translate</div>
            </div>
            {/* Feature rows */}
            {[
              { label: 'Cultural context', us: true, them: false },
              { label: 'Real-time chat', us: true, them: false },
              { label: 'Voice messages', us: true, them: false },
              { label: 'Group translation', us: true, them: false },
              { label: 'Keigo detection', us: true, them: false },
            ].map((row, i, arr) => (
              <div
                key={i}
                className={`grid grid-cols-3 items-center px-6 py-4 ${i < arr.length - 1 ? 'border-b border-[#f3f4f6]' : ''}`}
              >
                <span className="text-[14px] font-medium text-[#374151]">{row.label}</span>
                <div className="flex justify-center">
                  {row.us ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d1fae5]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#fee2e2]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </span>
                  )}
                </div>
                <div className="flex justify-center">
                  {row.them ? (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d1fae5]">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    </span>
                  ) : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f3f4f6]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. FAQ */}
      <FaqSection />

      {/* 11. Final CTA */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-[560px]">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Get started today</p>
          <h2 className="mb-4 text-[clamp(28px,5vw,44px)] font-black leading-tight text-[#111827]">
            Start chatting in<br />
            <span className="text-[#4F46E5]">21 languages</span>
          </h2>
          <p className="mb-2 text-[16px] text-[#6b7280]">Free forever. No credit card.</p>
          <p className="mb-10 text-[14px] text-[#9ca3af]">No download. Works on any phone.</p>
          <Link
            href="/signup?mode=pocketchat"
            className="inline-block rounded-xl bg-[#4F46E5] px-12 py-4 text-[17px] font-bold text-white shadow-lg shadow-[#4F46E5]/30 hover:bg-[#4338ca] transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
            Start Free →
          </Link>
          <p className="mt-6 text-[13px] italic text-[#9ca3af]">
            You bring the missing E. We bring the world.
          </p>
        </div>
      </section>

      {/* 12. Footer */}
      <footer className="bg-[#f9fafb]">
        <div className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-4 px-6 py-8">
          <div className="flex items-center gap-2">
            <AnimatedPocketChatLogo size={32} isTranslating={true} />
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
            <PocketMark variant="xl" />
            <span className="text-xs text-[#6b7280]">Powered by <span className="font-semibold text-[#4F46E5]">BizPocket</span></span>
          </a>
        </div>
      </footer>
    </div>
  );
}
