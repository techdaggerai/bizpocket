'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PocketMark, LogoWordmark } from '@/components/Logo';
import { FEATURES } from '@/components/FeatureIcons';

const LANG_OPTIONS = [
  { value: 'en', flag: '\u{1F1FA}\u{1F1F8}', label: 'English (US)' },
  { value: 'ja', flag: '\u{1F1EF}\u{1F1F5}', label: '\u65E5\u672C\u8A9E' },
  { value: 'ur', flag: '\u{1F1F5}\u{1F1F0}', label: '\u0627\u0631\u062F\u0648' },
  { value: 'ar', flag: '\u{1F1E6}\u{1F1EA}', label: '\u0627\u0644\u0639\u0631\u0628\u064A\u0629' },
  { value: 'bn', flag: '\u{1F1E7}\u{1F1E9}', label: '\u09AC\u09BE\u0982\u09B2\u09BE' },
  { value: 'pt', flag: '\u{1F1E7}\u{1F1F7}', label: 'Portugu\u00EAs' },
  { value: 'tl', flag: '\u{1F1F5}\u{1F1ED}', label: 'Filipino' },
  { value: 'vi', flag: '\u{1F1FB}\u{1F1F3}', label: 'Ti\u1EBFng Vi\u1EC7t' },
  { value: 'tr', flag: '\u{1F1F9}\u{1F1F7}', label: 'T\u00FCrk\u00E7e' },
  { value: 'zh', flag: '\u{1F1E8}\u{1F1F3}', label: '\u4E2D\u6587' },
  { value: 'fr', flag: '\u{1F1EB}\u{1F1F7}', label: 'Fran\u00E7ais' },
  { value: 'nl', flag: '\u{1F1F3}\u{1F1F1}', label: 'Nederlands' },
  { value: 'es', flag: '\u{1F1EA}\u{1F1F8}', label: 'Espa\u00F1ol' },
];

const WORLD_CLOCKS = [
  { flag: '\u{1F1EF}\u{1F1F5}', city: 'Tokyo', tz: 'Asia/Tokyo' },
  { flag: '\u{1F1F5}\u{1F1F0}', city: 'Karachi', tz: 'Asia/Karachi' },
  { flag: '\u{1F1E6}\u{1F1EA}', city: 'Dubai', tz: 'Asia/Dubai' },
  { flag: '\u{1F1EC}\u{1F1E7}', city: 'London', tz: 'Europe/London' },
  { flag: '\u{1F1FA}\u{1F1F8}', city: 'New York', tz: 'America/New_York' },
  { flag: '\u{1F1E8}\u{1F1F3}', city: 'Shanghai', tz: 'Asia/Shanghai' },
];

const PLANS = [
  {
    key: 'free',
    name: 'Starter',
    price: '\u00A50',
    period: '',
    desc: 'Get started',
    features: ['5 invoices/month', 'PocketChat (2 contacts)', '1 language', 'Basic cash flow'],
    cta: 'Open Your Pocket',
    highlight: false,
  },
  {
    key: 'pro',
    name: 'Pro',
    price: '\u00A52,980',
    priceAlt: '~$20 \u00B7 ~\u20AC18',
    period: '/mo',
    desc: 'For serious businesses',
    features: ['Unlimited invoices', 'PocketChat unlimited', '5 languages', 'AI Morning Briefing', 'Accountant Portal', 'All features'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    key: 'business',
    name: 'Business',
    price: '\u00A55,980',
    priceAlt: '~$40 \u00B7 ~\u20AC36',
    period: '/mo',
    desc: 'Scale your team',
    features: ['Everything in Pro', 'Voice translation', '13 languages', 'Document scan AI', 'Priority support', 'Multiple staff'],
    cta: 'Go Business',
    highlight: false,
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'Large organizations',
    features: ['Multiple organizations', 'API access', 'White label', 'Dedicated support'],
    cta: 'Contact Us',
    highlight: false,
  },
];

type Lang = 'en' | 'ja' | 'ur' | 'ar' | 'bn' | 'pt' | 'tl' | 'vi' | 'tr' | 'zh' | 'fr' | 'nl' | 'es';

const selectClass = "rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1.5 text-xs text-[var(--text-2)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center]";

function getTime(tz: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date());
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [now, setNow] = useState(new Date());
  const [priceCurrency, setPriceCurrency] = useState<'JPY' | 'USD' | 'EUR'>('JPY');

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Suppress unused var warning — now drives clock re-renders
  void now;

  const PRICE_MAP: Record<string, Record<string, string>> = {
    '\u00A50': { JPY: '\u00A50', USD: '$0', EUR: '\u20AC0' },
    '\u00A52,980': { JPY: '\u00A52,980', USD: '$20', EUR: '\u20AC18' },
    '\u00A55,980': { JPY: '\u00A55,980', USD: '$40', EUR: '\u20AC36' },
    'Custom': { JPY: 'Custom', USD: 'Custom', EUR: 'Custom' },
  };

  function getPrice(basePrice: string): string {
    return PRICE_MAP[basePrice]?.[priceCurrency] || basePrice;
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]" dir={lang === 'ur' || lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <PocketMark variant="xl" />
            <LogoWordmark />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className={selectClass}
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </select>
            <Link href="/login" className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="rounded-btn bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              Open Your Pocket
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-2)] px-3.5 py-1.5 text-xs text-[var(--text-3)]">
            13 languages &middot; 16 currencies &middot; Zero barriers
          </div>
          <h1 className="mb-3 text-3xl font-light text-[var(--text-1)] sm:text-[42px] sm:leading-[1.1]">
            Your AI Business{' '}
            <span className="font-semibold text-[var(--accent)]">Autopilot.</span>
          </h1>
          <p className="mb-6 text-md leading-relaxed text-[var(--text-3)]">
            Invoices. Cash flow. PocketChat with real-time translation in 13 languages. 16 currencies. All from your phone. AI runs your business while you sleep.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className="w-full rounded-btn bg-[var(--accent)] px-8 py-3 text-center text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px sm:w-auto">
              Open Your Pocket
            </Link>
            <a href="#pocketchat" className="w-full rounded-btn border border-[var(--border-strong)] bg-[var(--bg-2)] px-8 py-3 text-center text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text-1)] sm:w-auto">
              See PocketChat
            </a>
          </div>
        </div>
      </section>

      {/* Pain Points */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 space-y-10">
          <div className="text-center">
            <p className="text-md leading-relaxed text-[var(--text-1)]">
              Your customer speaks one language. Your supplier speaks another.{' '}
              Your accountant speaks a third.
            </p>
            <p className="mt-2 text-sm text-[var(--text-3)]">They all speak different languages. <span className="font-semibold text-[var(--accent)]">You shouldn&apos;t have to.</span></p>
          </div>
          <div className="text-center">
            <p className="text-md leading-relaxed text-[var(--text-1)]">
              You&apos;re always moving. Meetings. Deliveries. Clients. Deadlines.
            </p>
            <p className="mt-2 text-sm text-[var(--text-3)]">Your business doesn&apos;t stop. Your tools shouldn&apos;t either.</p>
          </div>
          <div className="text-center">
            <p className="text-md leading-relaxed text-[var(--text-1)]">
              Language barriers kill deals. Time zones kill momentum.
            </p>
            <p className="mt-2 text-sm font-semibold text-[var(--accent)]">BizPocket kills both.</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mx-auto max-w-5xl px-4 py-20">
        <div className="text-center mb-12">
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Everything in your pocket</p>
          <h2 className="mb-3 text-xl font-semibold text-[var(--text-1)] sm:text-2xl">One app to run your entire business.</h2>
          <p className="text-sm text-[var(--text-3)]">No extra tools. No spreadsheets. No extra hires. Just open your pocket.</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.key} className="group rounded-[16px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 transition-all hover:border-[var(--accent)]/20 hover:shadow-md hover:-translate-y-0.5">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--bg-2)] transition-colors group-hover:bg-[rgba(79,70,229,0.06)]">
                <f.Icon />
              </div>
              <h3 className="mb-1.5 text-sm font-semibold text-[var(--text-1)]">{f.name}</h3>
              <p className="text-xs leading-relaxed text-[var(--text-3)]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PocketChat */}
      <section id="pocketchat" className="bg-[#0A0A0A] text-white">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#818CF8]">PocketChat&trade;</p>
              <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl leading-tight">
                They speak Japanese.<br/>You speak English.<br/>Nobody notices the difference.
              </h2>
              <p className="text-sm leading-relaxed text-[#A1A1AA]">
                The world&apos;s first business messenger with real-time AI translation. Send messages, voice notes, photos and documents in your language. Your customer reads it in theirs. 13 languages. 16 currencies. Zero friction.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-4 py-2">
                <span className="text-sm">{'\u{1F1FA}\u{1F1F8} \u{1F1EF}\u{1F1F5} \u{1F1F5}\u{1F1F0} \u{1F1E6}\u{1F1EA} \u{1F1E7}\u{1F1E9} \u{1F1E7}\u{1F1F7} \u{1F1F5}\u{1F1ED} \u{1F1FB}\u{1F1F3} \u{1F1F9}\u{1F1F7} \u{1F1E8}\u{1F1F3} \u{1F1EB}\u{1F1F7} \u{1F1F3}\u{1F1F1} \u{1F1EA}\u{1F1F8}'}</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="rounded-[16px] border border-[#333] bg-[#141414] p-4 space-y-3">
                <div className="flex justify-start"><div className="rounded-[12px] bg-[#1C1C1C] px-3.5 py-2.5 max-w-[80%]"><p className="text-xs text-[#A1A1AA]">Customer</p><p className="text-sm text-white">{'\u304A\u8ECA\u306E\u4FA1\u683C\u3092\u6559\u3048\u3066\u304F\u3060\u3055\u3044'}</p><p className="text-[10px] text-[#525252] mt-1">{'\u{1F1EF}\u{1F1F5}'} Translated from Japanese</p></div></div>
                <div className="flex justify-end"><div className="rounded-[12px] bg-[#4F46E5] px-3.5 py-2.5 max-w-[80%]"><p className="text-sm text-white">The Toyota Hiace is $7,200 FOB Yokohama. Shall I send the invoice?</p><p className="text-[10px] text-white/50 mt-1">{'\u{1F1EC}\u{1F1E7}'} Auto-translated to Japanese for customer</p></div></div>
                <div className="flex justify-start"><div className="rounded-[12px] bg-[#1C1C1C] px-3.5 py-2.5 max-w-[80%]"><p className="text-sm text-white">{'\u306F\u3044\u3001\u8ACB\u6C42\u66F8\u3092\u304A\u9858\u3044\u3057\u307E\u3059'}</p><p className="text-[10px] text-[#525252] mt-1">{'\u{1F1EF}\u{1F1F5}'} &quot;Yes, please send the invoice&quot;</p></div></div>
                <div className="flex justify-center"><div className="rounded-full bg-[#059669]/20 px-3 py-1.5 text-[10px] text-[#34D399] font-medium">Invoice sent via PocketChat</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Command Hub */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="flex flex-col gap-8 sm:flex-row-reverse sm:items-center">
          <div className="flex-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">AI Command Hub</p>
            <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)] sm:text-2xl leading-tight">You slept.<br/>Your AI worked.</h2>
            <p className="text-sm leading-relaxed text-[var(--text-3)]">Wake up to your morning briefing. Overnight: invoices auto-sent, payments logged, accountant updated. Cash flow insights. Action recommendations. You just approve.</p>
          </div>
          <div className="flex-1 rounded-card border border-[var(--card-border)] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
              <span className="text-xs font-medium text-[#4F46E5]">AI Briefing</span>
            </div>
            <p className="text-sm text-[var(--text-2)] leading-relaxed mb-3">Good morning, Doc. While you slept:</p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2"><span className="text-[#16A34A]">{'\u2705'}</span><span className="text-[var(--text-2)]">2 invoices auto-sent</span></div>
              <div className="flex items-center gap-2"><span className="text-[#16A34A]">{'\u2705'}</span><span className="text-[var(--text-2)]">{'\u00A5'}340,000 payment received</span></div>
              <div className="flex items-center gap-2"><span className="text-[#DC2626]">{'\u26A0\uFE0F'}</span><span className="text-[var(--text-2)]">Cash gap predicted on Apr 15</span></div>
              <div className="flex items-center gap-2"><span className="text-[#4F46E5]">{'\u2192'}</span><span className="text-[var(--text-2)]">Recommend: sell white Prius first</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Document Detector */}
      <section className="border-t border-[var(--border)] bg-gradient-to-b from-[var(--bg-2)] to-[var(--bg)]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">AI Document Detector&trade;</p>
              <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)] sm:text-2xl leading-tight">
                Snap it.<br/>Understand it.<br/>
                <span className="text-[var(--accent)]">In your language.</span>
              </h2>
              <p className="mb-6 text-sm leading-relaxed text-[var(--text-3)]">
                Got a document in Japanese? A tax notice? A contract? A government form? Just take a picture. BizPocket AI detects what it is, translates it into your language, explains what it means, and suggests exactly what to do next.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">1</div>
                  <p className="text-sm text-[var(--text-2)]"><span className="font-semibold text-[var(--text-1)]">Snap</span> &mdash; Take a photo of any document</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">2</div>
                  <p className="text-sm text-[var(--text-2)]"><span className="font-semibold text-[var(--text-1)]">Detect</span> &mdash; AI identifies the document type instantly</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">3</div>
                  <p className="text-sm text-[var(--text-2)]"><span className="font-semibold text-[var(--text-1)]">Translate</span> &mdash; Full translation in your native language</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-xs font-bold text-white">4</div>
                  <p className="text-sm text-[var(--text-2)]"><span className="font-semibold text-[var(--text-1)]">Act</span> &mdash; AI suggests the response or next step</p>
                </div>
              </div>
            </div>
            <div className="flex-1">
              <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--accent)]/10">
                      <svg className="h-3.5 w-3.5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg>
                    </div>
                    <span className="text-xs font-medium text-[var(--text-2)]">Document Scanned</span>
                  </div>
                  <span className="rounded-full bg-[#16A34A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#16A34A]">DETECTED</span>
                </div>
                <div className="mb-3 rounded-lg bg-[#FAFAF9] border border-[#E7E5E4] p-3">
                  <p className="text-[11px] font-medium text-[#44403C] mb-1.5">{'\u{1F1EF}\u{1F1F5}'} Original &mdash; {'\u81EA\u52D5\u8ECA\u7A0E\u7D0D\u7A0E\u901A\u77E5\u66F8'}</p>
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#78716C]">{'\u7D0D\u7A0E\u7FA9\u52D9\u8005\uFF1A\u30D7\u30EC\u30DF\u30A2\u30E0\u30C9\u30E9\u30A4\u30D6\u5408\u540C\u4F1A\u793E'}</p>
                    <p className="text-[10px] text-[#78716C]">{'\u8AB2\u7A0E\u6A19\u6E96\u984D\uFF1A\u81EA\u52D5\u8ECA\u7A0E\u3000\u00A534,500'}</p>
                    <p className="text-[10px] text-[#78716C]">{'\u7D0D\u671F\u9650\uFF1A\u4EE4\u548C8\u5E744\u670830\u65E5'}</p>
                  </div>
                </div>
                <div className="mb-3 rounded-lg bg-[rgba(79,70,229,0.04)] border border-[rgba(79,70,229,0.1)] p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="h-3.5 w-3.5 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
                    <span className="text-[10px] font-semibold text-[#4F46E5]">AI Translation &mdash; English</span>
                  </div>
                  <p className="text-xs font-medium text-[var(--text-1)] mb-1">Vehicle Tax Payment Notice</p>
                  <p className="text-[11px] text-[var(--text-2)] leading-relaxed">Taxpayer: Premium Drives LLC. Vehicle tax amount: {'\u00A5'}34,500. Due date: April 30, 2026.</p>
                </div>
                <div className="rounded-lg bg-[#16A34A]/5 border border-[#16A34A]/15 p-3">
                  <p className="text-[10px] font-semibold text-[#16A34A] mb-1">{'\u{1F4A1}'} Suggested Action</p>
                  <p className="text-[11px] text-[var(--text-2)] leading-relaxed">Pay {'\u00A5'}34,500 at any convenience store or bank by April 30. Want me to add a reminder to your planner?</p>
                  <div className="mt-2.5 flex gap-2">
                    <span className="rounded-full bg-[#4F46E5] px-3 py-1 text-[10px] font-semibold text-white">Add to Planner</span>
                    <span className="rounded-full border border-[var(--border-strong)] px-3 py-1 text-[10px] font-medium text-[var(--text-3)]">Save to Vault</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Message Your BizPocket */}
      <section className="border-y border-[var(--border)] bg-[#0A0A0A] text-white">
        <div className="mx-auto max-w-3xl px-4 py-20">
          <div className="text-center mb-10">
            <div className="mb-5 inline-flex items-center rounded-full border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-3.5 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-widest text-[#818CF8]">The Vision</span>
            </div>
            <h2 className="mb-3 text-xl font-semibold text-white sm:text-2xl leading-tight">
              Message your BizPocket.<br/>
              <span className="text-[#818CF8]">Your business runs itself.</span>
            </h2>
            <p className="text-sm leading-relaxed text-[#71717A]">
              No employees. No translators. No accountant. No manager.<br/>Just you, your phone, and one message.
            </p>
            <div className="mt-5 flex justify-center gap-2">
              {['Telegram', 'WhatsApp', 'LINE'].map((app) => (
                <span key={app} className="rounded-full border border-[#27272A] px-3 py-1 text-[11px] font-semibold text-[#52525B]">{app}</span>
              ))}
            </div>
          </div>
          <div className="rounded-[16px] border border-[#262626] bg-[#141414] p-5 max-w-lg mx-auto">
            <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-[#1E1E1E]">
              <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] text-sm font-bold text-white">B</div>
              <div>
                <p className="text-[13px] font-semibold text-white">BizPocket AI</p>
                <p className="text-[10px] text-[#16A34A]">{'\u25CF'} Online &mdash; always</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-end"><div className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-[#4F46E5] px-3.5 py-2.5"><p className="text-[13px] text-white">Invoice Tanaka-san {'\u00A5'}850,000 for the Alphard</p><p className="mt-1 text-[9px] text-white/40">9:01 AM</p></div></div>
              <div className="flex justify-start"><div className="max-w-[85%] rounded-[14px] rounded-bl-[4px] border border-[#262626] bg-[#1C1C1C] px-3.5 py-2.5"><p className="text-[13px] text-[#D4D4D8]">Invoice #INV-0042 created and sent to Tanaka-san via PocketChat. Payment link included. PDF saved to Vault.</p><p className="mt-1 text-[9px] text-[#525252]">9:01 AM</p></div></div>
              <div className="flex justify-end"><div className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-[#4F46E5] px-3.5 py-2.5"><p className="text-[13px] text-white">How much did we spend this month?</p><p className="mt-1 text-[9px] text-white/40">9:02 AM</p></div></div>
              <div className="flex justify-start"><div className="max-w-[85%] rounded-[14px] rounded-bl-[4px] border border-[#262626] bg-[#1C1C1C] px-3.5 py-2.5"><p className="text-[13px] text-[#D4D4D8]">March expenses: {'\u00A5'}1,240,000. You&apos;re 12% under budget. Business Health: 74 &mdash; Good.</p><p className="mt-1 text-[9px] text-[#525252]">9:02 AM</p></div></div>
              <div className="flex justify-end"><div className="max-w-[85%] rounded-[14px] rounded-br-[4px] bg-[#4F46E5] px-3.5 py-2.5"><p className="text-[13px] text-white">Message Ali in Karachi &mdash; shipment arriving Thursday, send docs</p><p className="mt-1 text-[9px] text-white/40">9:03 AM</p></div></div>
              <div className="flex justify-start"><div className="max-w-[85%] rounded-[14px] rounded-bl-[4px] border border-[#262626] bg-[#1C1C1C] px-3.5 py-2.5"><p className="text-[13px] text-[#D4D4D8]">Sent to Ali (translated to Urdu). Export docs auto-attached from Vault.</p><p className="mt-1 text-[9px] text-[#525252]">9:03 AM</p></div></div>
            </div>
          </div>
          <div className="mt-10 flex justify-center gap-10 flex-wrap">
            {[
              { label: 'Replaces', value: '5 employees' },
              { label: 'Languages', value: '13' },
              { label: 'Response', value: '< 3 sec' },
              { label: 'Cost', value: '\u00A52,980/mo' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-mono text-lg font-bold text-white">{s.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-widest text-[#525252]">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* One App Five Roles */}
      <section className="mx-auto max-w-2xl px-4 py-20">
        <h2 className="mb-8 text-center text-xl font-semibold text-[var(--text-1)]">
          One app. Five roles. <span className="text-[var(--accent)]">Zero hires.</span>
        </h2>
        <div className="space-y-2">
          {[
            { role: 'Translator', replaced: 'PocketChat AI translates 13 languages in real-time' },
            { role: 'Accountant', replaced: 'AI tracks every yen, auto-categorizes, generates reports' },
            { role: 'Secretary', replaced: 'AI Briefing + Planner handles your schedule and reminders' },
            { role: 'Manager', replaced: 'Business Health Score monitors operations 24/7' },
            { role: 'IT Department', replaced: 'Snap & Vault, document management, all built in' },
          ].map((r) => (
            <div key={r.role} className="flex items-center gap-4 rounded-[12px] border border-[var(--card-border)] bg-[var(--card-bg)] px-5 py-3.5">
              <span className="min-w-[90px] text-sm font-bold text-[#DC2626] line-through">{r.role}</span>
              <span className="text-sm text-[var(--text-3)]">{'\u2192'}</span>
              <span className="text-sm text-[var(--text-2)]">{r.replaced}</span>
            </div>
          ))}
        </div>
      </section>

      {/* World Clock */}
      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Your business runs across time zones</p>
        <div className="flex justify-center gap-3 overflow-x-auto hide-scrollbar pb-1">
          {WORLD_CLOCKS.map((c) => (
            <div key={c.tz} className="flex-shrink-0 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3 text-center min-w-[100px]">
              <span className="text-lg">{c.flag}</span>
              <p className="font-mono text-lg font-semibold text-[var(--text-1)]">{getTime(c.tz)}</p>
              <p className="text-[10px] text-[var(--text-4)]">{c.city}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Pricing</p>
          <h2 className="mb-6 text-center text-xl font-semibold text-[var(--text-1)]">Simple, transparent pricing</h2>
          <div className="mb-10 flex justify-center">
            <div className="inline-flex rounded-[10px] border border-[var(--border-strong)] bg-[var(--bg-2)] p-1">
              {(['JPY', 'USD', 'EUR'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setPriceCurrency(c)}
                  className={`rounded-[8px] px-4 py-1.5 text-xs font-medium transition-colors ${
                    priceCurrency === c
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-3)] hover:text-[var(--text-1)]'
                  }`}
                >
                  {c === 'JPY' ? '\u00A5 JPY' : c === 'USD' ? '$ USD' : '\u20AC EUR'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-card-lg border p-7 transition-all ${
                  plan.highlight
                    ? 'border-[var(--accent)] bg-[var(--card-bg)] shadow-md ring-1 ring-[var(--accent)]/10'
                    : 'border-[var(--card-border)] bg-[var(--card-bg)] hover:shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-[var(--accent-light)] px-2.5 py-1 text-xs font-medium text-[var(--accent)]">
                    Most Popular
                  </div>
                )}
                <h4 className="text-md font-medium text-[var(--text-1)]">{plan.name}</h4>
                <p className="mb-4 text-sm text-[var(--text-3)]">{plan.desc}</p>
                <div className="mb-6">
                  <span className="font-mono text-2xl font-medium text-[var(--text-1)]">{getPrice(plan.price)}</span>
                  <span className="text-sm text-[var(--text-3)]">{plan.period}</span>
                  {priceCurrency !== 'JPY' && plan.price !== 'Custom' && plan.price !== '\u00A50' && (
                    <p className="text-[10px] text-[var(--text-4)] mt-0.5">{plan.price}/mo in JPY</p>
                  )}
                </div>
                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[var(--text-2)]">
                      <svg className="h-4 w-4 flex-shrink-0 text-[var(--green)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.key === 'enterprise' ? 'mailto:hello@bizpocket.jp' : `/signup?plan=${plan.key}`}
                  className={`block w-full rounded-btn py-2.5 text-center text-sm font-medium transition-all ${
                    plan.highlight
                      ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] hover:-translate-y-px'
                      : 'bg-[var(--bg-2)] border border-[var(--border-strong)] text-[var(--text-2)] hover:text-[var(--text-1)]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[var(--bg-2)]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)]">Ready to autopilot your business?</h2>
          <p className="mb-8 text-md text-[var(--text-3)]">Free forever. Pro when you need it. No credit card required.</p>
          <Link
            href="/signup"
            className="inline-block rounded-btn bg-[var(--accent)] px-10 py-3.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
          >
            Open Your Pocket
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2">
              <PocketMark variant="sm" />
              <LogoWordmark />
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[var(--text-4)]">
              <a href="#features" className="hover:text-[var(--text-2)] transition-colors">Features</a>
              <a href="#pocketchat" className="hover:text-[var(--text-2)] transition-colors">PocketChat</a>
              <a href="#pricing" className="hover:text-[var(--text-2)] transition-colors">Pricing</a>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className={selectClass + ' text-[var(--text-3)]'}
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>
          <div className="mt-6 text-center">
            <p className="text-xs text-[var(--text-4)]">A TechDagger Product &middot; MS Dynamics LLC &middot; bizpocket.jp</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
