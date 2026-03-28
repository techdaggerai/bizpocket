'use client';

import { useState } from 'react';
import Link from 'next/link';

const FEATURES = [
  {
    title: 'Professional Invoices',
    desc: 'Create and send invoices in Japanese, English, or Urdu in 60 seconds.',
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: 'Cash Flow Tracking',
    desc: 'Every yen in and out, categorized. Running balance always visible.',
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'Document Vault',
    desc: 'Snap receipts and documents. Organized by month, always accessible.',
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'Accountant Sharing',
    desc: 'Give your accountant read-only access. No more chasing for documents.',
    icon: (
      <svg className="h-8 w-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '¥0',
    period: '',
    desc: 'Get started',
    features: ['5 invoices/month', 'Basic cash flow', '1 language', 'Single user'],
    cta: 'Start Free',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥1,980',
    period: '/mo',
    desc: 'For serious businesses',
    features: ['Unlimited invoices', 'Document scanner', 'Accountant sharing', 'All 3 languages', 'Priority support'],
    cta: 'Start Pro Trial',
    highlight: true,
  },
  {
    name: 'Team',
    price: '¥3,980',
    period: '/mo',
    desc: 'Multiple users',
    features: ['Everything in Pro', 'Up to 5 team members', 'Shared cash flow', 'Role-based access', 'Data export'],
    cta: 'Start Team Trial',
    highlight: false,
  },
];

type Lang = 'en' | 'ja' | 'ur';

const HERO_TEXT: Record<Lang, { title1: string; title2: string; subtitle: string; cta: string }> = {
  en: {
    title1: 'Your Business',
    title2: 'in Your Pocket',
    subtitle: 'The mobile-first business toolkit for foreigners running businesses in Japan. Invoices, cash flow, expenses, and accountant sharing — all from your phone.',
    cta: 'Start Free Trial',
  },
  ja: {
    title1: 'ビジネスを',
    title2: 'ポケットに',
    subtitle: '日本でビジネスを運営する外国人のためのモバイルファースト・ビジネスツールキット。請求書、キャッシュフロー、経費、会計士共有 — すべてスマホから。',
    cta: '無料で始める',
  },
  ur: {
    title1: 'آپ کا کاروبار',
    title2: 'آپ کی جیب میں',
    subtitle: 'جاپان میں کاروبار چلانے والے غیر ملکیوں کے لیے موبائل فرسٹ ٹول کٹ۔ انوائس، کیش فلو، اخراجات، اور اکاؤنٹنٹ شیئرنگ — سب فون سے۔',
    cta: 'مفت شروع کریں',
  },
};

const LANG_LABELS: Record<Lang, string> = { en: 'EN', ja: '日本語', ur: 'اردو' };

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>('en');
  const hero = HERO_TEXT[lang];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      {/* Top Bar */}
      <header className="sticky top-0 z-50 border-b border-gray-800/50 bg-gray-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 font-bold text-gray-950 text-sm">
              BP
            </div>
            <span className="font-semibold text-white">BizPocket</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-gray-700 bg-gray-900 text-xs overflow-hidden">
              {(['en', 'ja', 'ur'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 transition-colors ${lang === l ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400 hover:text-white'}`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            <Link href="/login" className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-300 hover:border-gray-500 hover:text-white transition-colors">
              Log In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 py-16 text-center sm:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
            Built for foreigners in Japan
          </div>
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            {hero.title1}<br />
            <span className="bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent">
              {hero.title2}
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-400">
            {hero.subtitle}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-3.5 text-center font-semibold text-gray-950 shadow-lg shadow-amber-500/20 transition-all hover:shadow-amber-500/40 sm:w-auto"
            >
              {hero.cta}
            </Link>
            <a
              href="#pricing"
              className="w-full rounded-xl border border-gray-700 px-8 py-3.5 text-center font-medium text-gray-300 transition-colors hover:border-gray-500 hover:text-white sm:w-auto"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-amber-400">Features</h2>
        <h3 className="mb-12 text-center text-3xl font-bold text-white">Everything you need to run your business</h3>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-gray-800 bg-gray-900/50 p-6 transition-colors hover:border-gray-700">
              <div className="mb-4">{f.icon}</div>
              <h4 className="mb-2 font-semibold text-white">{f.title}</h4>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="mb-2 text-center text-sm font-semibold uppercase tracking-wider text-amber-400">Pricing</h2>
        <h3 className="mb-12 text-center text-3xl font-bold text-white">Simple, transparent pricing</h3>
        <div className="grid gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 transition-colors ${
                plan.highlight
                  ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                  : 'border-gray-800 bg-gray-900/50 hover:border-gray-700'
              }`}
            >
              {plan.highlight && (
                <div className="mb-3 inline-block rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                  Most Popular
                </div>
              )}
              <h4 className="text-lg font-semibold text-white">{plan.name}</h4>
              <p className="mb-4 text-sm text-gray-400">{plan.desc}</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">{plan.price}</span>
                <span className="text-gray-400">{plan.period}</span>
              </div>
              <ul className="mb-6 space-y-2">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                    <svg className="h-4 w-4 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`block w-full rounded-lg py-2.5 text-center text-sm font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-amber-500 text-gray-950 hover:bg-amber-400'
                    : 'bg-gray-800 text-white hover:bg-gray-700'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-amber-400 to-amber-600 text-xs font-bold text-gray-950">
              BP
            </div>
            <span className="text-sm font-medium text-gray-400">BizPocket Japan</span>
          </div>
          <p className="text-xs text-gray-500">A TechDagger Product &middot; MS Dynamics LLC</p>
        </div>
      </footer>
    </div>
  );
}
