'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PocketMark, LogoWordmark } from '@/components/Logo';

const PAIN_POINTS = [
  { stat: '73%', text: 'of foreign business owners in Japan struggle with invoicing in Japanese' },
  { stat: '¥0', text: 'visibility into cash flow — most track expenses in spreadsheets or not at all' },
  { stat: '2hrs', text: 'per week wasted chasing accountants for document handoffs' },
];

const FEATURES = [
  {
    title: 'Fire Invoice',
    desc: 'Create and send professional invoices in Japanese, English, or Urdu in 60 seconds. 5 templates, PDF export, LINE/WhatsApp sharing.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: 'Money View',
    desc: 'Every yen in and out, categorized. Running balance always visible. Monthly breakdown with category insights.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'Log It',
    desc: 'Track expenses with receipt photos. Category breakdowns, planned vs actual budgets, monthly summaries.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l3-3m0 0l3 3m-3-3v8.25M3 6.75A2.25 2.25 0 015.25 4.5h13.5A2.25 2.25 0 0121 6.75v10.5A2.25 2.25 0 0118.75 19.5H5.25A2.25 2.25 0 013 17.25V6.75z" />
      </svg>
    ),
  },
  {
    title: 'Snap & Vault',
    desc: 'Snap receipts and documents. Organized by month, searchable, always accessible. Never lose a receipt again.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'Accountant Portal',
    desc: 'Give your accountant read-only access with one link. No more chasing for documents or monthly handoffs.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
    cta: 'Open Your Pocket',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥1,980',
    period: '/mo',
    desc: 'For serious businesses',
    features: ['Unlimited invoices', 'Snap & Vault', 'Accountant Portal', 'All 3 languages', 'AI Morning Briefing', 'Priority support'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Team',
    price: '¥3,980',
    period: '/mo',
    desc: 'Multiple users',
    features: ['Everything in Pro', 'Up to 5 team members', 'Shared cash flow', 'Role-based access', 'Data export'],
    cta: 'Go Pro',
    highlight: false,
  },
];

type Lang = 'en' | 'ja' | 'ur';

const HERO_TEXT: Record<Lang, { title1: string; title2: string; subtitle: string; cta: string }> = {
  en: {
    title1: 'Your Business',
    title2: 'in Your Pocket',
    subtitle: 'The mobile-first business toolkit for foreigners running businesses in Japan. Invoices, cash flow, expenses, and accountant sharing — all from your phone.',
    cta: 'Open Your Pocket',
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
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text-1)]" dir={lang === 'ur' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <PocketMark variant="xl" />
            <LogoWordmark />
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex rounded-input border border-[var(--border-strong)] bg-[var(--bg-2)] text-xs overflow-hidden">
              {(['en', 'ja', 'ur'] as Lang[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-2.5 py-1.5 transition-colors ${lang === l ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-3)] hover:text-[var(--text-1)]'}`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
            <Link href="/login" className="rounded-btn border border-[var(--border-strong)] px-3.5 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--text-4)] transition-colors">
              Log In
            </Link>
            <Link href="/signup" className="rounded-btn bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] transition-colors">
              {hero.cta}
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5 inline-flex items-center rounded-full border border-[var(--border-strong)] bg-[var(--bg-2)] px-3.5 py-1.5 text-xs text-[var(--text-3)]">
            Built for foreigners in Japan
          </div>
          <h1 className="mb-6 text-3xl font-light text-[var(--text-1)] sm:text-3xl">
            {hero.title1}{' '}
            <span className="font-semibold text-[var(--accent)]">
              {hero.title2}
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-md leading-relaxed text-[var(--text-3)]">
            {hero.subtitle}
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/signup"
              className="w-full rounded-btn bg-[var(--accent)] px-8 py-3 text-center text-sm font-medium text-white shadow-sm transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px sm:w-auto"
            >
              {hero.cta}
            </Link>
            <a
              href="#pricing"
              className="w-full rounded-btn border border-[var(--border-strong)] bg-[var(--bg-2)] px-8 py-3 text-center text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text-1)] sm:w-auto"
            >
              View Pricing
            </a>
          </div>
        </div>
      </section>

      {/* Problem Strip */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-5xl px-4 py-14">
          <p className="mb-8 text-center text-xs font-medium uppercase tracking-widest text-[var(--accent)]">The Problem</p>
          <div className="grid gap-6 sm:grid-cols-3">
            {PAIN_POINTS.map((p) => (
              <div key={p.stat} className="text-center">
                <p className="mb-2 font-mono text-2xl font-semibold text-[var(--accent)]">{p.stat}</p>
                <p className="text-sm leading-relaxed text-[var(--text-3)]">{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Features</p>
          <h2 className="mb-14 text-center text-xl font-semibold text-[var(--text-1)]">Everything you need to run your business</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-6 transition-all hover:shadow-md">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-btn bg-[var(--accent-light)] text-[var(--accent)]">
                  {f.icon}
                </div>
                <h4 className="mb-1.5 text-base font-medium text-[var(--text-1)]">{f.title}</h4>
                <p className="text-sm text-[var(--text-3)] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Accountant Portal Spotlight */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-[var(--accent-light)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent)]">
              Killer Feature
            </div>
            <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)]">Accountant Portal</h2>
            <p className="mb-8 text-md leading-relaxed text-[var(--text-3)]">
              Generate one link. Your accountant gets read-only access to everything — invoices, cash flow, expenses, receipts. Download monthly packages as ZIP. No login required. No more LINE messages at 11pm asking for receipts.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
                <p className="mb-1 font-mono text-2xl font-semibold text-[#16A34A]">1 link</p>
                <p className="text-sm text-[var(--text-3)]">Share with your accountant</p>
              </div>
              <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
                <p className="mb-1 font-mono text-2xl font-semibold text-[var(--accent)]">Read-only</p>
                <p className="text-sm text-[var(--text-3)]">They see everything, edit nothing</p>
              </div>
              <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
                <p className="mb-1 font-mono text-2xl font-semibold text-[#DC2626]">0 hours</p>
                <p className="text-sm text-[var(--text-3)]">Wasted on document chasing</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-5xl px-4 py-20">
        <p className="mb-2 text-center text-xs font-medium uppercase tracking-widest text-[var(--accent)]">Pricing</p>
        <h2 className="mb-14 text-center text-xl font-semibold text-[var(--text-1)]">Simple, transparent pricing</h2>
        <div className="grid gap-5 sm:grid-cols-3">
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
      </section>

      {/* Final CTA */}
      <section className="border-t border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-5xl px-4 py-20 text-center">
          <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)]">Ready to run your business from your pocket?</h2>
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
        <div className="mx-auto max-w-5xl px-4 py-8 text-center">
          <div className="mb-2 flex items-center justify-center gap-2">
            <PocketMark variant="sm" />
            <LogoWordmark />
          </div>
          <p className="text-xs text-[var(--text-4)]">A TechDagger Product &middot; MS Dynamics LLC</p>
        </div>
      </footer>
    </div>
  );
}
