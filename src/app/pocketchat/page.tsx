'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { PocketMark } from '@/components/Logo';
import HeroChatMockup from '@/components/HeroChatMockup';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import PocketChatTypingIndicator from '@/components/PocketChatTypingIndicator';
import AnimatedTagline from '@/components/AnimatedTagline';
import EvryWherMark from '@/components/EvryWherMark';

const greetings = [
  { to: 'やあ', lang: 'Japanese' }, { to: 'Hola', lang: 'Spanish' },
  { to: 'مرحبا', lang: 'Arabic' }, { to: '你好', lang: 'Chinese' },
  { to: 'سلام', lang: 'Urdu' }, { to: 'Olá', lang: 'Portuguese' },
  { to: 'Bonjour', lang: 'French' }, { to: 'Merhaba', lang: 'Turkish' },
];

const FAQ_ITEMS = [
  { q: 'Is it really free?', a: 'Yes — unlimited chat with your contacts is free forever. You get 10 AI translations per day on the free plan. Need more? Pro starts at just $6.99/month.' },
  { q: 'How accurate are the translations?', a: "Powered by Claude AI by Anthropic — one of the most advanced language models in the world. It understands context, tone, and cultural nuance, not just literal word-for-word translation." },
  { q: 'Is my data safe?', a: 'All messages are encrypted in transit and at rest. Data is stored on servers in Japan (Supabase Tokyo). We never read your messages, never sell your data, and never share it with third parties.' },
  { q: 'What languages are supported?', a: 'Currently 21: English, Japanese, Arabic, Korean, Chinese, Hindi, Portuguese, Spanish, French, Urdu, Bengali, Turkish, Filipino, Vietnamese, Persian, Pashto, Thai, Indonesian, Nepali, Sinhala, and Dutch.' },
  { q: 'How is this different from Duolingo?', a: "Duolingo teaches you random sentences. Evrywher teaches you words from the bank form you just scanned, the message your landlord just sent, the menu you just photographed. Every translation is a lesson from YOUR real life." },
  { q: 'Can I use it for my business?', a: 'Absolutely. Pro and Business plans unlock unlimited translations, voice translation, AI conversation practice, and priority support. Every BizPocket plan includes Evrywher.' },
];

/* ─── Fade-in on scroll hook ─────────────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold: 0.15 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, className: `transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}` };
}

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
            <div key={i} className="overflow-hidden rounded-xl border border-[#e5e7eb] bg-[#f9fafb]">
              <button onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left" aria-expanded={open === i}>
                <span className="text-[15px] font-semibold text-[#111827]">{item.q}</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 transition-transform duration-200" style={{ transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}><path d="m6 9 6 6 6-6" /></svg>
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

/* ─── Wave Divider ────────────────────────────────────────────────────────── */
function WaveDivider({ flip, color }: { flip?: boolean; color: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''}`}>
      <svg viewBox="0 0 1200 80" preserveAspectRatio="none" className="w-full h-[40px] sm:h-[60px]">
        <path d="M0,40 C300,80 900,0 1200,40 L1200,80 L0,80 Z" fill={color} />
      </svg>
    </div>
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

  const s1 = useFadeIn(), s2 = useFadeIn(), s3 = useFadeIn(), s4 = useFadeIn(), s5 = useFadeIn(), s6 = useFadeIn(), s7 = useFadeIn(), s8 = useFadeIn(), s9 = useFadeIn();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900 dark:text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* ═══ NAVBAR ════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-black/[0.04] dark:border-white/[0.06]">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <AnimatedPocketChatLogo size={32} isTranslating={true} />
            <EvryWherMark size="md" />
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <a href="#features" className="text-[13px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Features</a>
            <a href="#learn" className="text-[13px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Learn</a>
            <a href="#pricing" className="text-[13px] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">Log in</Link>
            <Link href="/signup?mode=pocketchat" className="rounded-[20px] bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">Start Free</Link>
          </div>
        </div>
      </nav>

      {/* ═══ 1. HERO ══════════════════════════════════════════════════════ */}
      <section className="pt-24 pb-16 bg-gradient-to-b from-indigo-50 via-white to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-900">
        <div className="mx-auto max-w-[1100px] px-6">
          {/* Brand */}
          <div className="text-center pt-8 pb-6">
            <div className="mb-4 flex justify-center"><PocketChatTypingIndicator contactName="Evrywher" size="lg" /></div>
            <EvryWherMark size="hero" />
            <AnimatedTagline />
          </div>

          {/* Hero split */}
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 mt-8">
            <div className="mx-auto w-full max-w-[420px] lg:mx-0 order-2 lg:order-1" aria-hidden="true">
              <HeroChatMockup />
            </div>
            <div className="text-center lg:text-left order-1 lg:order-2 rounded-[20px] bg-white/[0.78] dark:bg-white/[0.06] backdrop-blur-[24px] p-8" style={{ boxShadow: 'var(--glass-shadow)' }}>
              <span className="mb-5 inline-block rounded-full bg-indigo-50 dark:bg-indigo-500/20 px-4 py-1.5 text-xs font-semibold tracking-wide text-indigo-600 dark:text-indigo-300">TRANSLATE · CHAT · LEARN</span>
              <h1 className="mb-4 text-[clamp(32px,5vw,52px)] font-bold leading-[1.1] tracking-tight text-gray-900 dark:text-white" style={{ fontFamily: 'var(--font-outfit)' }}>
                Break Every<br />Language <span className="text-indigo-600 dark:text-indigo-400">Barrier</span>
              </h1>
              <p className="mx-auto mb-6 max-w-[480px] text-[16px] leading-relaxed text-gray-600 dark:text-gray-300 lg:mx-0" style={{ fontFamily: 'var(--font-dm-sans)' }}>
                Translate. Chat. Learn. All from your real life in Japan. The only app where every translation becomes a lesson.
              </p>
              <div className="mb-6 flex flex-wrap justify-center gap-3 lg:justify-start">
                <Link href="/signup?mode=pocketchat" className="rounded-[20px] bg-indigo-600 px-8 h-14 inline-flex items-center text-[15px] font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-700 transition-all hover:-translate-y-0.5">Get Started Free</Link>
                <a href="#features" className="rounded-[20px] border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 px-8 h-14 inline-flex items-center text-[15px] font-semibold text-gray-700 dark:text-gray-200 hover:border-gray-300 dark:hover:border-white/20 transition-colors">See Features</a>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">No download needed. No credit card. Works on any phone.</p>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="#f9fafb" />

      {/* ═══ 2. CAMERA TRANSLATION — "See It. Scan It." ═══════════════════ */}
      <section id="features" className="bg-[#f9fafb] px-6 py-20">
        <div ref={s1.ref} className={`mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${s1.className}`}>
          {/* Phone mockup */}
          <div className="mx-auto max-w-[320px]">
            <div className="rounded-[32px] border-[6px] border-[#1a1a2e] bg-white p-4 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-amber-50 p-6 text-center">
                <div className="text-5xl mb-3">📸</div>
                <div className="rounded-xl bg-white p-3 shadow-sm text-left space-y-2">
                  <p className="text-[10px] font-bold text-[#4F46E5] uppercase tracking-wider">Detected: Bank Form</p>
                  <div className="flex justify-between text-xs"><span className="text-[#6b7280]">振込先</span><span className="font-medium">Transfer destination</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#6b7280]">口座番号</span><span className="font-medium">Account number</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#6b7280]">金額</span><span className="font-medium">Amount</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#6b7280]">手数料</span><span className="font-medium">Transfer fee</span></div>
                </div>
                <p className="mt-3 text-[9px] text-[#9ca3af]">+ cultural context + what to write in each field</p>
              </div>
            </div>
          </div>
          {/* Content */}
          <div>
            <span className="inline-block rounded-full bg-[#4F46E5]/10 px-3 py-1 text-xs font-bold text-[#4F46E5] mb-4">CAMERA TRANSLATION</span>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827] leading-tight mb-4">See It. Scan It.<br />Understand It.</h2>
            <p className="text-[15px] text-[#374151] leading-relaxed mb-6">
              Walk into any bank in Japan. Point your camera. Know exactly what every field means — and what to write. Works on signs, menus, forms, receipts, letters.
            </p>
            <div className="space-y-2">
              {['Camera scan to instant translation', 'Form field guide — tells you what to write', 'Cultural context, not just words', 'Works on signs, menus, receipts, documents', 'Scan history — reference forever'].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#16A34A]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                  <span className="text-sm text-[#374151]">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="white" flip />

      {/* ═══ 3. CHAT — "Chat in Any Language" ═════════════════════════════ */}
      <section className="px-6 py-20 bg-white">
        <div ref={s2.ref} className={`mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${s2.className}`}>
          <div className="order-2 lg:order-1">
            <span className="inline-block rounded-full bg-[#F59E0B]/10 px-3 py-1 text-xs font-bold text-[#92400E] mb-4">AI CHAT</span>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827] leading-tight mb-4">Chat in Any Language</h2>
            <p className="text-[15px] text-[#374151] leading-relaxed mb-6">
              Your landlord texts in Japanese. You reply in English. The AI handles everything in between — including the politeness your message needs.
            </p>
            <div className="space-y-2">
              {['AI cultural translation — not just words, but tone and context', '21 languages, zero delay', 'Group chat — everyone sees their own language', 'Voice messages with automatic translation', 'Cultural Coach warns before you say something wrong'].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#16A34A]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                  <span className="text-sm text-[#374151]">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto w-full max-w-[420px] order-1 lg:order-2">
            <HeroChatMockup />
          </div>
        </div>
      </section>

      <WaveDivider color="#f9fafb" />

      {/* ═══ 4. VOICE — "Speak and Be Understood" ═════════════════════════ */}
      <section className="bg-[#f9fafb] px-6 py-20">
        <div ref={s3.ref} className={`mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${s3.className}`}>
          <div className="mx-auto max-w-[320px]">
            <div className="rounded-[32px] border-[6px] border-[#1a1a2e] bg-white p-4 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 p-6 text-center">
                <div className="text-5xl mb-3">🎙️</div>
                <div className="rounded-xl bg-white p-4 shadow-sm space-y-3">
                  <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-[#4F46E5] flex items-center justify-center text-xs text-white font-bold">EN</div><div className="flex-1 h-6 rounded-full bg-indigo-100 flex items-center px-2"><div className="flex gap-0.5">{[3,5,8,4,7,6,3,5,8,4].map((h,i)=><div key={i} className="w-1 rounded-full bg-[#4F46E5]" style={{height:h*2}}/>)}</div></div></div>
                  <div className="text-xs text-[#6b7280]">AI translating...</div>
                  <div className="flex items-center gap-2"><div className="h-8 w-8 rounded-full bg-[#F59E0B] flex items-center justify-center text-xs text-white font-bold">JP</div><div className="flex-1 h-6 rounded-full bg-amber-100 flex items-center px-2"><div className="flex gap-0.5">{[5,3,7,4,6,8,3,5,4,7].map((h,i)=><div key={i} className="w-1 rounded-full bg-[#F59E0B]" style={{height:h*2}}/>)}</div></div></div>
                </div>
                <p className="mt-3 text-[9px] text-[#9ca3af]">Natural voice powered by ElevenLabs</p>
              </div>
            </div>
          </div>
          <div>
            <span className="inline-block rounded-full bg-[#16A34A]/10 px-3 py-1 text-xs font-bold text-[#166534] mb-4">VOICE TRANSLATION</span>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827] leading-tight mb-4">Speak and<br />Be Understood</h2>
            <p className="text-[15px] text-[#374151] leading-relaxed mb-6">
              At the doctor&apos;s office? Speak English. Your phone speaks Japanese. Like having a personal interpreter — for $6.99/month.
            </p>
            <div className="space-y-2">
              {['Speak in your language, AI plays audio in theirs', 'Pass the phone back and forth for real conversation', 'Natural voice — not robotic', 'Works for medical, legal, and business situations'].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#16A34A]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                  <span className="text-sm text-[#374151]">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="white" flip />

      {/* ═══ 5. LANGUAGE LEARNING — THE DUOLINGO KILLER ═══════════════════ */}
      <section id="learn" className="px-6 py-24 bg-white">
        <div ref={s4.ref} className={`mx-auto max-w-[1100px] ${s4.className}`}>
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-[#7C3AED]/10 px-3 py-1 text-xs font-bold text-[#7C3AED] mb-4">LANGUAGE LEARNING</span>
            <h2 className="text-[clamp(28px,5vw,44px)] font-bold text-[#111827] leading-tight">
              Duolingo teaches you<br />&ldquo;the cat is on the table.&rdquo;
            </h2>
            <p className="mt-4 text-[clamp(20px,3vw,28px)] font-bold text-[#4F46E5]">
              We teach you the word from the bank form you just scanned.
            </p>
          </div>

          {/* THEM vs US comparison cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-[700px] mx-auto mb-12">
            {/* THEM — gray, dull */}
            <div className="rounded-2xl border-2 border-gray-200 bg-gray-50 p-6 text-center opacity-60">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">THEM</p>
              <div className="text-4xl mb-2">🐱</div>
              <p className="text-lg font-medium text-gray-500">The cat is on the table</p>
              <div className="mt-4 flex justify-center gap-1">{[1,2,3].map(i=><div key={i} className="h-4 w-4 rounded-full bg-gray-300"/>)}</div>
              <p className="mt-2 text-xs text-gray-400">+5 XP</p>
              <p className="mt-3 text-[10px] text-gray-400 italic">Random sentence. No context. No relevance.</p>
            </div>
            {/* US — vibrant, real */}
            <div className="rounded-2xl border-2 border-[#4F46E5] bg-white p-6 text-center shadow-lg shadow-indigo-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-[#4F46E5] mb-3">EVRYWHER</p>
              <div className="text-4xl mb-2">🏦</div>
              <p className="text-2xl font-bold text-[#111827]">振込</p>
              <p className="text-sm text-[#6b7280]">furikomi</p>
              <p className="text-base font-semibold text-[#4F46E5] mt-1">bank transfer</p>
              <div className="mt-3 rounded-lg bg-indigo-50 px-3 py-1.5 inline-block">
                <p className="text-[10px] text-[#4F46E5] font-medium">from your bank form scan at Mizuho Bank</p>
              </div>
              <p className="mt-3 text-[10px] text-[#16A34A] font-semibold">+10 XP · Real context</p>
            </div>
          </div>

          <div className="text-center mb-10">
            <p className="text-[17px] text-[#374151] max-w-[600px] mx-auto leading-relaxed">
              Every translation becomes a lesson. Every lesson comes from <strong>YOUR</strong> real life. Not a textbook.
            </p>
          </div>

          {/* Learning features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-[900px] mx-auto">
            {[
              { icon: '📸', title: 'Learn from camera scans', desc: 'Scan a bank form, learn banking words automatically' },
              { icon: '💬', title: 'Learn from chat translations', desc: 'Every translated message adds to your vocabulary' },
              { icon: '📖', title: '30 topic packs for Japan', desc: 'Konbini, bank, doctor, landlord, train, and more' },
              { icon: '🤖', title: 'AI conversation practice', desc: 'Chat with AI tutor in Japanese about real scenarios' },
              { icon: '🎯', title: 'Spaced repetition', desc: 'Words you struggle with come back more often' },
              { icon: '🔥', title: 'Streak + XP', desc: 'Subtle gamification that keeps you coming back' },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-[#e5e7eb] bg-[#f9fafb] p-4">
                <span className="text-xl">{f.icon}</span>
                <p className="text-sm font-semibold text-[#111827] mt-2">{f.title}</p>
                <p className="text-xs text-[#6b7280] mt-1">{f.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/signup?mode=pocketchat" className="inline-block rounded-xl bg-[#4F46E5] px-8 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-indigo-500/20 hover:bg-[#4338ca] transition-all">
              Start Learning Free &rarr;
            </Link>
          </div>
        </div>
      </section>

      <WaveDivider color="#111827" />

      {/* ═══ 6. CULTURAL COACH — "Say It Right" ══════════════════════════ */}
      <section className="bg-[#111827] px-6 py-20">
        <div ref={s5.ref} className={`mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${s5.className}`}>
          <div>
            <span className="inline-block rounded-full bg-[#F59E0B]/20 px-3 py-1 text-xs font-bold text-[#F59E0B] mb-4">CULTURAL COACH</span>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-white leading-tight mb-4">Say It Right.<br />Every Time.</h2>
            <p className="text-[15px] text-[#9ca3af] leading-relaxed mb-6">
              About to tell your Japanese boss &ldquo;I need tomorrow off&rdquo;? The AI suggests the polite form — because in Japan, <em>how</em> you ask matters more than <em>what</em> you ask.
            </p>
            <div className="space-y-2">
              {['Warns before you send something too direct', 'Suggests polite alternatives (keigo)', 'Explains cultural context behind phrases', 'Adapts to business vs casual situations'].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#F59E0B]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                  <span className="text-sm text-[#d1d5db]">{f}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mx-auto max-w-[340px]">
            <div className="rounded-2xl bg-[#1f2937] border border-[#374151] p-5 space-y-3">
              <div className="rounded-xl bg-[#374151] p-3">
                <p className="text-xs text-[#9ca3af] mb-1">You typed:</p>
                <p className="text-sm text-white">&ldquo;I need tomorrow off&rdquo;</p>
              </div>
              <div className="rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/20 p-3">
                <p className="text-xs text-[#F59E0B] font-bold mb-1">Cultural Coach</p>
                <p className="text-xs text-[#fbbf24]">This may sound too direct for your boss. Try:</p>
                <p className="text-sm text-white mt-2 font-medium">お忙しいところ恐れ入りますが、明日お休みをいただけないでしょうか</p>
                <p className="text-[10px] text-[#9ca3af] mt-1 italic">&ldquo;I&apos;m sorry to bother you when you&apos;re busy, but would it be possible to take tomorrow off?&rdquo;</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="#fef3c7" flip />

      {/* ═══ 7. EMERGENCY CARD — "Your Safety Net" ═══════════════════════ */}
      <section className="bg-[#fef3c7] px-6 py-20">
        <div ref={s6.ref} className={`mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${s6.className}`}>
          <div className="mx-auto max-w-[300px] order-2 lg:order-1">
            <div className="rounded-[32px] border-[6px] border-[#DC2626] bg-white p-4 shadow-2xl">
              <div className="rounded-2xl bg-gradient-to-b from-red-50 to-white p-5 text-center">
                <div className="text-5xl mb-2">🆘</div>
                <p className="text-sm font-bold text-[#DC2626] mb-3">Emergency Card</p>
                <div className="space-y-2">
                  {['Call an ambulance', 'I need help', 'I am allergic to...'].map((p, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2">
                      <span className="text-sm">🔊</span>
                      <span className="text-xs font-medium text-[#991B1B]">{p}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[9px] text-[#DC2626]/60 font-bold">WORKS 100% OFFLINE</p>
              </div>
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-block rounded-full bg-[#DC2626]/10 px-3 py-1 text-xs font-bold text-[#DC2626] mb-4">EMERGENCY</span>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827] leading-tight mb-4">Your Safety Net.<br />Works Offline.</h2>
            <p className="text-[15px] text-[#374151] leading-relaxed mb-6">
              One tap: &ldquo;Call an ambulance&rdquo; plays in Japanese through your speaker. Pre-loaded with every phrase you might need in an emergency. No internet required.
            </p>
            <div className="space-y-2">
              {['Works completely offline — no internet needed', 'Medical, police, and disaster phrases', 'One-tap audio playback (loud, clear)', 'Your personal info (blood type, allergies, contacts)', 'Japan emergency numbers: 110, 119, 118'].map((f, i) => (
                <div key={i} className="flex items-center gap-2">
                  <svg className="h-4 w-4 shrink-0 text-[#DC2626]" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                  <span className="text-sm text-[#374151]">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <WaveDivider color="white" flip />

      {/* ═══ 8. BUSINESS CARD SCANNER — quick section ════════════════════ */}
      <section className="px-6 py-16 bg-white">
        <div ref={s7.ref} className={`mx-auto max-w-[800px] text-center ${s7.className}`}>
          <span className="text-4xl">📇</span>
          <h2 className="mt-4 text-[clamp(22px,3vw,30px)] font-bold text-[#111827]">Scan Any Business Card</h2>
          <p className="mt-3 text-[15px] text-[#374151] max-w-[560px] mx-auto">
            Someone hands you their meishi. You can&apos;t read it. Until now. Scan any Japanese business card — name, title, company, phone — all extracted and saved as a contact in seconds.
          </p>
        </div>
      </section>

      {/* ═══ 9. PRICING ══════════════════════════════════════════════════ */}
      <section id="pricing" className="bg-[#f9fafb] px-6 py-20">
        <div ref={s8.ref} className={`mx-auto max-w-[1100px] ${s8.className}`}>
          <div className="text-center mb-12">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Simple pricing</p>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827]">Your first 10 translations are free. Every day. Forever.</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-[900px] mx-auto">
            {[
              { name: 'Free', price: '$0', period: 'forever', features: ['10 AI translations/day', 'Unlimited contacts', 'Camera translation', 'Emergency Card', '1 topic pack (Learn)'], highlight: false },
              { name: 'Pro', price: '$6.99', period: '/month', features: ['Unlimited translations', 'Voice-to-voice translation', 'AI conversation practice', 'All 30 topic packs', 'Cultural Coach', 'Business Card Scanner', 'Includes BizPocket Pro'], highlight: true },
              { name: 'Business', price: '$19.99', period: '/month', features: ['Everything in Pro', 'Team vocabulary sharing', 'Up to 5 team members', 'Priority support', 'Custom AI bot', 'Includes BizPocket Business'], highlight: false },
            ].map((plan, i) => (
              <div key={i} className={`rounded-2xl p-6 ${plan.highlight ? 'bg-[#4F46E5] text-white shadow-xl shadow-indigo-500/20 scale-[1.02]' : 'bg-white border border-[#e5e7eb]'}`}>
                <p className={`text-sm font-bold ${plan.highlight ? 'text-indigo-200' : 'text-[#4F46E5]'}`}>{plan.name}</p>
                <p className="mt-2"><span className="text-3xl font-bold">{plan.price}</span><span className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-[#6b7280]'}`}>{plan.period}</span></p>
                <div className="mt-5 space-y-2">
                  {plan.features.map((f, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <svg className={`h-4 w-4 shrink-0 ${plan.highlight ? 'text-indigo-200' : 'text-[#16A34A]'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                      <span className={`text-xs ${plan.highlight ? 'text-indigo-100' : 'text-[#374151]'}`}>{f}</span>
                    </div>
                  ))}
                </div>
                <Link href="/signup?mode=pocketchat" className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-bold transition-colors ${plan.highlight ? 'bg-white text-[#4F46E5] hover:bg-indigo-50' : 'bg-[#4F46E5] text-white hover:bg-[#4338ca]'}`}>
                  {plan.name === 'Free' ? 'Get Started' : `Go ${plan.name}`}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 10. FOUNDER STORY ═══════════════════════════════════════════ */}
      <section className="px-6 py-20 bg-white">
        <div ref={s9.ref} className={`mx-auto max-w-[680px] text-center ${s9.className}`}>
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-3xl text-white font-bold">B</div>
          <p className="text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5] mb-3">From a Fellow Foreigner</p>
          <p className="text-[17px] leading-relaxed text-[#374151] italic">
            &ldquo;I built Evrywher because after years in Japan, I still couldn&apos;t read my own bank statement. I went to language school. They taught me &lsquo;the cat is on the table.&rsquo; I needed &lsquo;account number&rsquo; and &lsquo;transfer fee.&rsquo; So I built an app that learns from your actual life — not a textbook.&rdquo;
          </p>
          <p className="mt-4 text-sm font-semibold text-[#111827]">Dr. Bilal</p>
          <p className="text-xs text-[#6b7280]">Founder, Evrywher · Tokyo, Japan</p>
        </div>
      </section>

      {/* ═══ 11. TESTIMONIALS ════════════════════════════════════════════ */}
      <section className="bg-[#f9fafb] px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="mb-12 text-center">
            <p className="mb-3 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Real people. Real conversations.</p>
            <h2 className="text-[clamp(26px,4vw,36px)] font-bold text-[#111827]">Trusted by expats worldwide</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { quote: "Finally someone who understands that すみません doesn't just mean sorry", name: 'Yuki', location: 'Tokyo', flag: '🇯🇵', avatar: 'Y', color: '#F43F5E' },
              { quote: "My Pakistani family and Japanese in-laws can actually talk now", name: 'Ahmed', location: 'Osaka', flag: '🇵🇰', avatar: 'A', color: '#F59E0B' },
              { quote: "The language learning from my real conversations is a game changer", name: 'Sarah', location: 'Nagoya', flag: '🇬🇧', avatar: 'S', color: '#4F46E5' },
            ].map((t, i) => (
              <div key={i} className="flex flex-col gap-4 rounded-2xl border border-[#e5e7eb] bg-white p-6">
                <div className="flex gap-0.5">{[...Array(5)].map((_, s) => <svg key={s} width="16" height="16" viewBox="0 0 24 24" fill="#F59E0B"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}</div>
                <p className="flex-1 text-[15px] leading-relaxed text-[#374151]">&ldquo;{t.quote}&rdquo;</p>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold text-white" style={{ background: t.color }}>{t.avatar}</div>
                  <div><p className="text-[13px] font-semibold text-[#111827]">{t.name} {t.flag}</p><p className="text-[12px] text-[#6b7280]">{t.location}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 12. FAQ ═════════════════════════════════════════════════════ */}
      <FaqSection />

      {/* ═══ 13. FINAL CTA ══════════════════════════════════════════════ */}
      <section className="px-6 py-24 text-center bg-gradient-to-b from-white to-indigo-50/30">
        <div className="mx-auto max-w-[560px]">
          <p className="mb-4 text-[13px] font-semibold uppercase tracking-widest text-[#4F46E5]">Translation. Communication. Education. One app.</p>
          <h2 className="mb-4 text-[clamp(28px,5vw,44px)] font-black leading-tight text-[#111827]">
            Start translating.<br />Start <span className="text-[#4F46E5]">learning</span>.
          </h2>
          <p className="mb-2 text-[16px] text-[#6b7280]">Your first 10 translations are free. Every day. Forever.</p>
          <p className="mb-10 text-[14px] text-[#9ca3af]">No download. No credit card. Open on your phone and go.</p>
          <Link href="/signup?mode=pocketchat" className="inline-block rounded-xl bg-[#4F46E5] px-12 py-4 text-[17px] font-bold text-white shadow-lg shadow-[#4F46E5]/30 hover:bg-[#4338ca] transition-all hover:-translate-y-0.5 active:translate-y-0">
            Get Started Free &rarr;
          </Link>
          <p className="mt-6 text-[13px] font-medium text-[#6B7280]">
            You bring the missing <span className="italic text-[#10B981]" style={{ fontFamily: "Georgia, serif" }}>e</span>. We bring the world.
          </p>
        </div>
      </section>

      {/* ═══ FOOTER ═════════════════════════════════════════════════════ */}
      <footer className="bg-[#111827] text-white">
        <div className="mx-auto max-w-[1100px] px-6 py-12">
          <div className="flex flex-wrap items-start justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AnimatedPocketChatLogo size={28} isTranslating={true} />
                <EvryWherMark size="sm" />
              </div>
              <p className="text-xs text-[#6b7280] max-w-[260px]">The only language app that learns from YOUR life, not a textbook.</p>
            </div>
            <div className="flex gap-12">
              <div>
                <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Product</p>
                <div className="space-y-2">
                  <a href="#features" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">Features</a>
                  <a href="#learn" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">Language Learning</a>
                  <a href="#pricing" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">Pricing</a>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Legal</p>
                <div className="space-y-2">
                  <a href="/privacy" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">Privacy Policy</a>
                  <a href="/terms" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">Terms of Service</a>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wider mb-3">Also</p>
                <div className="space-y-2">
                  <a href="https://bizpocket.io" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">BizPocket</a>
                  <a href="mailto:hello@evrywher.io" className="block text-sm text-[#d1d5db] hover:text-white transition-colors">Contact</a>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-[#1f2937] flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs text-[#6b7280]">&copy; 2026 MS Dynamics LLC · TechDagger Studio</p>
            <p className="text-xs text-[#6b7280]">Made with love in Japan 🇯🇵</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
