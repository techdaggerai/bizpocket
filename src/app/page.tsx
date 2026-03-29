'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PocketMark, LogoWordmark } from '@/components/Logo';

const LANG_OPTIONS = [
  { value: 'en', flag: '🇺🇸', label: 'English (US)' },
  { value: 'ja', flag: '🇯🇵', label: '日本語' },
  { value: 'ur', flag: '🇵🇰', label: 'اردو' },
  { value: 'ar', flag: '🇦🇪', label: 'العربية' },
  { value: 'bn', flag: '🇧🇩', label: 'বাংলা' },
  { value: 'pt', flag: '🇧🇷', label: 'Português' },
  { value: 'tl', flag: '🇵🇭', label: 'Filipino' },
  { value: 'vi', flag: '🇻🇳', label: 'Tiếng Việt' },
  { value: 'tr', flag: '🇹🇷', label: 'Türkçe' },
  { value: 'zh', flag: '🇨🇳', label: '中文' },
  { value: 'fr', flag: '🇫🇷', label: 'Français' },
  { value: 'nl', flag: '🇳🇱', label: 'Nederlands' },
  { value: 'es', flag: '🇪🇸', label: 'Español' },
];

const WORLD_CLOCKS = [
  { flag: '🇯🇵', city: 'Tokyo', tz: 'Asia/Tokyo' },
  { flag: '🇵🇰', city: 'Karachi', tz: 'Asia/Karachi' },
  { flag: '🇦🇪', city: 'Dubai', tz: 'Asia/Dubai' },
  { flag: '🇬🇧', city: 'London', tz: 'Europe/London' },
  { flag: '🇺🇸', city: 'New York', tz: 'America/New_York' },
  { flag: '🇨🇳', city: 'Shanghai', tz: 'Asia/Shanghai' },
];

const PLANS = [
  {
    name: 'Starter',
    price: '¥0',
    period: '',
    desc: 'Get started',
    features: ['5 invoices/month', 'PocketChat (2 contacts)', '1 language', 'Basic cash flow'],
    cta: 'Open Your Pocket',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥2,980',
    priceAlt: '~$20 · ~€18',
    period: '/mo',
    desc: 'For serious businesses',
    features: ['Unlimited invoices', 'PocketChat unlimited', '5 languages', 'AI Morning Briefing', 'Accountant Portal', 'All features'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '¥5,980',
    priceAlt: '~$40 · ~€36',
    period: '/mo',
    desc: 'Scale your team',
    features: ['Everything in Pro', 'Voice translation', '13 languages', 'Document scan AI', 'Priority support', 'Multiple staff'],
    cta: 'Go Business',
    highlight: false,
  },
  {
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

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Suppress unused var warning — now drives clock re-renders
  void now;

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

      {/* Pain Points — Bold Statements */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-3xl px-4 py-16 space-y-10">
          <div className="text-center">
            <p className="text-md leading-relaxed text-[var(--text-1)]">
              Your customer speaks <span className="font-semibold text-[var(--accent)]">Japanese</span>.{' '}
              Your supplier speaks <span className="font-semibold text-[var(--accent)]">Urdu</span>.{' '}
              Your accountant speaks <span className="font-semibold text-[var(--accent)]">English</span>.
            </p>
            <p className="mt-2 text-sm text-[var(--text-3)]">You speak all three — or you lose deals.</p>
          </div>
          <div className="text-center">
            <p className="text-md leading-relaxed text-[var(--text-1)]">
              You&apos;re always moving. Auctions. Yards. Ports. Airports.
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

      {/* Feature 1 — Fire Invoice */}
      <section className="mx-auto max-w-5xl px-4 py-20">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
          <div className="flex-1">
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Fire Invoice™</p>
            <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)] sm:text-2xl leading-tight">Invoice fired.<br/>Before you leave the parking lot.</h2>
            <p className="text-sm leading-relaxed text-[var(--text-3)]">Professional invoices in 60 seconds. 5 templates. PDF export. Share via PocketChat, LINE, or WhatsApp. 10 languages. Bank details auto-filled.</p>
          </div>
          <div className="flex-1 rounded-[14px] border border-[#E5E5E5] bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-semibold text-[#0A0A0A]">BIZPOCKET CO.</p>
                <p className="text-[10px] text-[#A3A3A3]">Invoice #INV/BIZ/260330-0001</p>
              </div>
              <span className="rounded-full bg-[#16A34A]/10 px-2 py-0.5 text-[10px] font-semibold text-[#16A34A]">PAID</span>
            </div>
            <div className="mb-3 text-[10px] text-[#737373]">
              <span className="font-medium text-[#0A0A0A]">Bill To:</span> Al-Rashid Motors LLC
            </div>
            <div className="border-t border-[#E5E5E5] pt-2 mb-2">
              <div className="flex justify-between text-[10px] text-[#737373] mb-1">
                <span>Toyota Alphard 2025</span>
                <span className="font-mono text-[#0A0A0A]">¥850,000</span>
              </div>
              <div className="flex justify-between text-[10px] text-[#737373]">
                <span>Tax (10%)</span>
                <span className="font-mono text-[#0A0A0A]">¥85,000</span>
              </div>
            </div>
            <div className="flex justify-between border-t border-[#0A0A0A] pt-2">
              <span className="text-xs font-semibold text-[#0A0A0A]">Total</span>
              <span className="font-mono text-sm font-bold text-[#4F46E5]">¥935,000</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2 — PocketChat (BIG dark section) */}
      <section id="pocketchat" className="bg-[#0A0A0A] text-white">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#818CF8]">PocketChat™</p>
              <h2 className="mb-4 text-xl font-semibold text-white sm:text-2xl leading-tight">
                They speak Japanese.<br/>You speak English.<br/>Nobody notices the difference.
              </h2>
              <p className="text-sm leading-relaxed text-[#A1A1AA]">
                The world&apos;s first business messenger with real-time AI translation. Send messages, voice notes, photos and documents in your language. Your customer reads it in theirs. 13 languages. 16 currencies. Zero friction.
              </p>
              <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-4 py-2">
                <span className="text-sm">🇺🇸 🇯🇵 🇵🇰 🇸🇦 🇧🇩 🇧🇷 🇵🇭 🇻🇳 🇹🇷 🇨🇳 🇫🇷 🇳🇱 🇪🇸</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="rounded-[16px] border border-[#333] bg-[#141414] p-4 space-y-3">
                {/* Mock chat bubbles */}
                <div className="flex justify-start"><div className="rounded-[12px] bg-[#1C1C1C] px-3.5 py-2.5 max-w-[80%]"><p className="text-xs text-[#A1A1AA]">Customer</p><p className="text-sm text-white">お車の価格を教えてください</p><p className="text-[10px] text-[#525252] mt-1">🇯🇵 Translated from Japanese</p></div></div>
                <div className="flex justify-end"><div className="rounded-[12px] bg-[#4F46E5] px-3.5 py-2.5 max-w-[80%]"><p className="text-sm text-white">The Toyota Hiace is $7,200 FOB Yokohama. Shall I send the invoice?</p><p className="text-[10px] text-white/50 mt-1">🇬🇧 Auto-translated to Japanese for customer</p></div></div>
                <div className="flex justify-start"><div className="rounded-[12px] bg-[#1C1C1C] px-3.5 py-2.5 max-w-[80%]"><p className="text-sm text-white">はい、請求書をお願いします</p><p className="text-[10px] text-[#525252] mt-1">🇯🇵 &quot;Yes, please send the invoice&quot;</p></div></div>
                <div className="flex justify-center"><div className="rounded-full bg-[#059669]/20 px-3 py-1.5 text-[10px] text-[#34D399] font-medium">Invoice sent via PocketChat</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3 — AI Command Hub */}
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
              <div className="flex items-center gap-2"><span className="text-[#16A34A]">✅</span><span className="text-[var(--text-2)]">2 invoices auto-sent</span></div>
              <div className="flex items-center gap-2"><span className="text-[#16A34A]">✅</span><span className="text-[var(--text-2)]">¥340,000 payment received</span></div>
              <div className="flex items-center gap-2"><span className="text-[#DC2626]">⚠️</span><span className="text-[var(--text-2)]">Cash gap predicted on Apr 15</span></div>
              <div className="flex items-center gap-2"><span className="text-[#4F46E5]">→</span><span className="text-[var(--text-2)]">Recommend: sell white Prius first</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features 4-6 Grid */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Money View */}
            <div className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Money View</p>
              <h3 className="mb-3 text-base font-semibold text-[var(--text-1)]">Know your numbers.</h3>
              <div className="rounded-lg bg-[var(--bg-2)] p-3 mb-3">
                <p className="text-[10px] text-[#A3A3A3] uppercase">Cash Balance</p>
                <p className="font-mono text-lg font-bold text-[#4F46E5]">¥4,280,500</p>
              </div>
              <div className="flex items-end gap-1 h-10">
                {[65, 40, 80, 55, 90, 70].map((h, i) => (
                  <div key={i} className="flex-1 flex flex-col gap-0.5">
                    <div className="rounded-sm bg-[#16A34A]/20" style={{ height: `${h * 0.4}px` }} />
                    <div className="rounded-sm bg-[#DC2626]/20" style={{ height: `${(100 - h) * 0.25}px` }} />
                  </div>
                ))}
              </div>
            </div>
            {/* Snap & Vault */}
            <div className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Snap & Vault™</p>
              <h3 className="mb-3 text-base font-semibold text-[var(--text-1)]">Point. Shoot. Filed.</h3>
              <div className="grid grid-cols-3 gap-1.5">
                {['Mar 28', 'Mar 25', 'Mar 20'].map((date) => (
                  <div key={date} className="rounded-lg bg-[var(--bg-2)] p-2 text-center">
                    <div className="h-10 mb-1.5 rounded bg-[var(--border)] flex items-center justify-center">
                      <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m.75 12 3 3m0 0 3-3m-3 3v-6m-1.5-9H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg>
                    </div>
                    <p className="text-[9px] text-[var(--text-4)]">{date}</p>
                  </div>
                ))}
              </div>
            </div>
            {/* Accountant Portal */}
            <div className="rounded-[14px] border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Accountant Portal™</p>
              <h3 className="mb-3 text-base font-semibold text-[var(--text-1)]">Always the full picture.</h3>
              <div className="rounded-lg bg-[var(--bg-2)] p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-[var(--text-1)]">Client Overview</span>
                  <span className="rounded-full bg-[#DC2626]/10 px-1.5 py-0.5 text-[9px] font-bold text-[#DC2626]">READ ONLY</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><p className="text-[9px] text-[#A3A3A3]">Income</p><p className="font-mono text-xs font-bold text-[#16A34A]">¥2.1M</p></div>
                  <div><p className="text-[9px] text-[#A3A3A3]">Expenses</p><p className="font-mono text-xs font-bold text-[#DC2626]">¥890K</p></div>
                  <div><p className="text-[9px] text-[#A3A3A3]">Net</p><p className="font-mono text-xs font-bold text-[#4F46E5]">¥1.2M</p></div>
                </div>
              </div>
            </div>
          </div>
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
          <h2 className="mb-14 text-center text-xl font-semibold text-[var(--text-1)]">Simple, transparent pricing</h2>
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
                  <span className="font-mono text-2xl font-medium text-[var(--text-1)]">{plan.price}</span>
                  <span className="text-sm text-[var(--text-3)]">{plan.period}</span>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {(plan as any).priceAlt && <p className="text-xs text-[var(--text-4)] mt-0.5">{(plan as any).priceAlt}</p>}
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
                  href="/signup"
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
