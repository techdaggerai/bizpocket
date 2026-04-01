'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PocketMark, LogoWordmark } from '@/components/Logo';

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

type Lang = 'en' | 'ja' | 'ur' | 'ar' | 'bn' | 'pt' | 'tl' | 'vi' | 'tr' | 'zh' | 'fr' | 'nl' | 'es';

const PLANS = [
  {
    name: 'Starter',
    price: '¥0',
    period: '',
    desc: 'Start with a 14-day Pro trial',
    features: ['14-day free trial (full Pro)', '3 invoices/month', 'AI Document Detector', 'PocketChat (10 AI translations/day)', 'AI Website Builder', 'Business Health Score', 'Basic cash flow'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥2,980',
    period: '/mo',
    desc: 'Your AI business autopilot',
    features: ['Unlimited invoices', 'AI Morning Briefing', 'Unlimited AI translations', 'Expense Planner + AI', 'Ops Radar dashboard', 'Business Cycle Engine', 'Accountant Portal', '5 languages'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '¥5,980',
    period: '/mo',
    desc: 'Your entire office — automated',
    features: ['Everything in Pro', 'Up to 10 staff accounts', 'Accountant Portal (full)', 'Business Radar + AI insights', 'Voice translation', '13 languages', 'Custom branding', 'Social media integration'],
    cta: 'Go Business',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For firms managing multiple clients',
    features: ['Everything in Business', 'Multi-org dashboard', 'API access', 'White-label everything', 'Dedicated account manager'],
    cta: 'Contact Us',
    highlight: false,
  },
];

const FEATURES = [
  { name: 'Fire Invoice\u2122', desc: 'Professional invoices in 60 seconds. 5 templates. PDF export. 10 languages.' },
  { name: 'PocketChat\u2122', desc: 'Business messenger with real-time AI translation across 13 languages.' },
  { name: 'Money View', desc: 'Cash flow tracking with IN/OUT visualization and running balance.' },
  { name: 'AI Command Hub', desc: 'Morning briefings, action recommendations, and overnight summaries.' },
  { name: 'Snap & Vault\u2122', desc: 'Document scanner with cloud storage. Point, shoot, filed.' },
  { name: 'Accountant Portal\u2122', desc: 'Read-only access for your accountant. Tax data, reports, exports.' },
  { name: 'AI Website Builder', desc: 'Generate and publish a professional website in 60 seconds.' },
  { name: 'Ops Radar', desc: 'Pipeline tracking, bottleneck detection, and AI-powered business insights.' },
];

const AI_CARDS = [
  { title: 'Morning Briefing', desc: 'Wake up to a summary of overnight payments, new messages, and AI recommendations for the day.' },
  { title: 'Auto-Translate', desc: 'Every message, invoice, and document translated in real-time across 13 languages.' },
  { title: 'Smart Pipeline', desc: 'AI learns your business patterns and predicts bottlenecks before they happen.' },
];

const LANGUAGES = [
  'English (US)', '日本語', 'اردو', 'العربية', 'বাংলা', 'Português',
  'Filipino', 'Tiếng Việt', 'Türkçe', '中文', 'Français', 'Nederlands', 'Español',
];

const PRICE_MAP: Record<string, Record<string, string>> = {
  '¥0': { JPY: '¥0', USD: '$0', EUR: '€0' },
  '¥2,980': { JPY: '¥2,980', USD: '$20', EUR: '€18' },
  '¥5,980': { JPY: '¥5,980', USD: '$40', EUR: '€36' },
  'Custom': { JPY: 'Custom', USD: 'Custom', EUR: 'Custom' },
};

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en');
  const [heroEmail, setHeroEmail] = useState('');
  const [priceCurrency, setPriceCurrency] = useState<'JPY' | 'USD' | 'EUR'>('JPY');

  function getPrice(basePrice: string): string {
    return PRICE_MAP[basePrice]?.[priceCurrency] || basePrice;
  }

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]" dir={lang === 'ur' || lang === 'ar' ? 'rtl' : 'ltr'}>
      {/* ─── Frosted glass nav ─── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <PocketMark variant="xl" />
            <LogoWordmark />
          </div>
          <div className="flex items-center gap-3">
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1.5 text-xs text-[#525252] focus:border-[#4F46E5] focus:outline-none appearance-none pr-6 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_6px_center]"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </select>
            <Link href="/login" className="text-sm text-[#525252] hover:text-[#0A0A0A] transition-colors">
              Log in
            </Link>
            <Link href="/signup" className="rounded-full bg-[#0A0A0A] px-5 py-2 text-sm font-medium text-white transition-all hover:bg-[#1a1a1a]">
              Open account
            </Link>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <section className="mx-auto max-w-6xl px-5 pt-24 pb-20 text-center sm:pt-32 sm:pb-28">
        <h1 className="mx-auto max-w-3xl text-4xl font-semibold leading-[1.1] tracking-tight text-[#0A0A0A] sm:text-6xl">
          Run your business.{' '}
          <span className="bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] bg-clip-text text-transparent">
            From your pocket.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-[#737373]">
          Invoices. Cash flow. AI translation in 13 languages. Everything your business needs, all in one mobile-first app.
        </p>
        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <input
            type="email"
            placeholder="you@company.com"
            value={heroEmail}
            onChange={(e) => setHeroEmail(e.target.value)}
            className="w-full rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-sm text-[#0A0A0A] placeholder-[#A3A3A3] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/20 sm:w-72"
          />
          <Link
            href={heroEmail ? `/signup?email=${encodeURIComponent(heroEmail)}` : '/signup'}
            className="w-full rounded-full bg-[#4F46E5] px-8 py-3 text-center text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#4338CA] hover:shadow-md sm:w-auto"
          >
            Start free
          </Link>
        </div>

        {/* Fake browser — dashboard preview */}
        <div className="mx-auto mt-16 max-w-3xl">
          <div className="rounded-2xl border border-[#E5E5E5] bg-white shadow-2xl shadow-black/[0.08] overflow-hidden">
            <div className="flex items-center gap-2 bg-[#FAFAFA] px-4 py-2.5 border-b border-[#E5E5E5]">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
                <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
                <div className="w-3 h-3 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 text-center">
                <span className="inline-block rounded-md bg-white border border-[#E5E5E5] px-4 py-1 text-[11px] text-[#A3A3A3]">
                  app.bizpocket.io/dashboard
                </span>
              </div>
            </div>
            <div className="p-6 bg-[#FAFAFA]">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="rounded-xl bg-white border border-[#E5E5E5] p-3">
                  <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wider">Balance</p>
                  <p className="font-mono text-lg font-semibold text-[#4F46E5]">$42,800</p>
                </div>
                <div className="rounded-xl bg-white border border-[#E5E5E5] p-3">
                  <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wider">Unpaid</p>
                  <p className="font-mono text-lg font-semibold text-[#F59E0B]">3</p>
                </div>
                <div className="rounded-xl bg-white border border-[#E5E5E5] p-3">
                  <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wider">Income</p>
                  <p className="font-mono text-lg font-semibold text-[#16A34A]">$12,400</p>
                </div>
                <div className="rounded-xl bg-white border border-[#E5E5E5] p-3">
                  <p className="text-[9px] text-[#A3A3A3] uppercase tracking-wider">Expenses</p>
                  <p className="font-mono text-lg font-semibold text-[#DC2626]">$3,200</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-gradient-to-br from-[#4F46E5]/5 to-[#7C3AED]/10 border border-[#4F46E5]/10 p-3">
                  <p className="text-[9px] font-medium text-[#4F46E5] mb-1">AI Briefing</p>
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-[#4F46E5]/10" />
                    <div className="h-2 w-4/5 rounded bg-[#4F46E5]/10" />
                    <div className="h-2 w-3/5 rounded bg-[#4F46E5]/10" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-[#4F46E5] p-2.5 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-white/20" />
                    <p className="text-[8px] text-white font-medium">Invoice</p>
                  </div>
                  <div className="rounded-lg bg-[#16A34A] p-2.5 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-white/20" />
                    <p className="text-[8px] text-white font-medium">Cash Flow</p>
                  </div>
                  <div className="rounded-lg bg-[#7C3AED] p-2.5 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-white/20" />
                    <p className="text-[8px] text-white font-medium">Chat</p>
                  </div>
                  <div className="rounded-lg bg-[#0EA5E9] p-2.5 flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded bg-white/20" />
                    <p className="text-[8px] text-white font-medium">Detect</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Features header ─── */}
      <section className="border-t border-[#E5E5E5]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-[#0A0A0A] sm:text-4xl">
            Everything your business needs.{' '}
            <span className="text-[#A3A3A3]">All in one app.</span>
          </h2>

          {/* 8 features in two clean rows */}
          <div className="mt-16 grid grid-cols-2 sm:grid-cols-4">
            {FEATURES.map((f, i) => (
              <div
                key={f.name}
                className={`p-6 ${
                  i < 4 ? 'border-b border-[#E5E5E5]' : ''
                } ${i % 4 !== 3 ? 'border-r border-[#E5E5E5]' : ''}`}
              >
                <h3 className="text-sm font-semibold text-[#0A0A0A] mb-2">{f.name}</h3>
                <p className="text-xs leading-relaxed text-[#737373]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── AI Section ─── */}
      <section className="border-t border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-semibold tracking-tight text-[#0A0A0A] sm:text-4xl">
              Your business runs itself.{' '}
              <span className="text-[#4F46E5]">You just approve.</span>
            </h2>
            <p className="mt-4 text-base text-[#737373] max-w-lg mx-auto">
              AI handles translations, payments, briefings, and pipeline tracking while you focus on growing.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {AI_CARDS.map((card) => (
              <div key={card.title} className="rounded-2xl border border-[#E5E5E5] bg-white p-7">
                <h3 className="text-base font-semibold text-[#0A0A0A] mb-2">{card.title}</h3>
                <p className="text-sm leading-relaxed text-[#737373]">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Languages ─── */}
      <section className="border-t border-[#E5E5E5]">
        <div className="mx-auto max-w-6xl px-5 py-16 text-center">
          <p className="text-xs font-medium uppercase tracking-widest text-[#A3A3A3] mb-6">
            13 languages. 16 currencies. Zero barriers.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {LANGUAGES.map((lang) => (
              <span
                key={lang}
                className="rounded-full border border-[#E5E5E5] bg-white px-3.5 py-1.5 text-xs text-[#525252]"
              >
                {lang}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="border-t border-[#E5E5E5] bg-[#FAFAFA]">
        <div className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-center text-3xl font-semibold tracking-tight text-[#0A0A0A] sm:text-4xl mb-3">
            Simple, transparent pricing
          </h2>
          <p className="text-center text-sm text-[#737373] mb-10">Start free. Upgrade when you&apos;re ready. No surprises.</p>
          <div className="mb-10 flex justify-center">
            <div className="inline-flex rounded-full border border-[#E5E5E5] bg-white p-1">
              {(['JPY', 'USD', 'EUR'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setPriceCurrency(c)}
                  className={`rounded-full px-5 py-1.5 text-xs font-medium transition-colors ${
                    priceCurrency === c
                      ? 'bg-[#0A0A0A] text-white'
                      : 'text-[#737373] hover:text-[#0A0A0A]'
                  }`}
                >
                  {c === 'JPY' ? '¥ JPY' : c === 'USD' ? '$ USD' : '€ EUR'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl border p-7 transition-all ${
                  plan.highlight
                    ? 'border-[#4F46E5] bg-white shadow-lg ring-1 ring-[#4F46E5]/10'
                    : 'border-[#E5E5E5] bg-white hover:shadow-sm'
                }`}
              >
                {plan.highlight && (
                  <div className="mb-3 inline-block rounded-full bg-[#4F46E5]/10 px-3 py-1 text-xs font-medium text-[#4F46E5]">
                    Most Popular
                  </div>
                )}
                <h4 className="text-base font-semibold text-[#0A0A0A]">{plan.name}</h4>
                <p className="mb-4 text-xs text-[#737373]">{plan.desc}</p>
                <div className="mb-6">
                  <span className="font-mono text-3xl font-semibold text-[#0A0A0A]">{getPrice(plan.price)}</span>
                  <span className="text-sm text-[#A3A3A3]">{plan.period}</span>
                </div>
                <ul className="mb-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[#525252]">
                      <svg className="h-4 w-4 flex-shrink-0 mt-0.5 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block w-full rounded-full py-2.5 text-center text-sm font-medium transition-all ${
                    plan.highlight
                      ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]'
                      : 'bg-[#F5F5F5] text-[#525252] hover:bg-[#EBEBEB] hover:text-[#0A0A0A]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Dark CTA footer ─── */}
      <section className="bg-[#0A0A0A]">
        <div className="mx-auto max-w-6xl px-5 py-24 text-center">
          <h2 className="text-3xl font-semibold text-white sm:text-4xl tracking-tight">
            Ready to run your business from your pocket?
          </h2>
          <p className="mt-4 text-base text-[#737373]">Free forever. Pro when you need it. No credit card required.</p>
          <Link
            href="/signup"
            className="mt-8 inline-block rounded-full bg-white px-10 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:bg-[#F5F5F5]"
          >
            Open your free account
          </Link>
        </div>
      </section>

      {/* ─── Minimal footer ─── */}
      <footer className="border-t border-[#1a1a1a] bg-[#0A0A0A]">
        <div className="mx-auto max-w-6xl px-5 py-8">
          <div className="flex flex-col items-center gap-5 sm:flex-row sm:justify-between">
            <div className="flex items-center gap-2 opacity-60">
              <PocketMark variant="sm" />
              <span className="font-sans text-md font-bold">
                <span className="text-white">Biz</span>
                <span className="text-[#4F46E5]">Pocket</span>
              </span>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-[#525252]">
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <span className="text-[#333]">Privacy</span>
              <span className="text-[#333]">Terms</span>
            </div>
            <p className="text-[11px] text-[#525252]">A TechDagger Product</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
