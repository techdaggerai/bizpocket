'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PocketMark, LogoWordmark } from '@/components/Logo';

const PAIN_POINTS = [
  { stat: '73%', text: 'of foreign business owners struggle with language barriers in Japan' },
  { stat: '¥0', text: 'visibility into cash flow — most track expenses in spreadsheets' },
  { stat: '2hrs', text: 'per week wasted chasing accountants for documents' },
];

const FEATURES = [
  {
    title: 'Fire Invoice\u2122',
    desc: 'Professional invoices in 60 seconds. 5 templates. PDF export. Share via PocketChat instantly.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
  },
  {
    title: 'PocketChat\u2122',
    desc: 'The world\'s first business messenger with real-time AI translation. Messages, voice notes, photos, documents. 10 languages. Zero friction.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
  },
  {
    title: 'Money View',
    desc: 'Every yen in, every yen out. AI predicts cash flow gaps 30 days ahead. Monthly summaries. Zero spreadsheets.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'AI Command Hub',
    desc: 'Wake up to your business briefing. Overnight: invoices auto-sent, payments logged, accountant updated. You just approve.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
  },
  {
    title: 'Snap & Vault\u2122',
    desc: 'Camera \u2192 PDF \u2192 Filed. Receipt photos auto-categorized. Accountant-ready every month.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
      </svg>
    ),
  },
  {
    title: 'Accountant Portal\u2122',
    desc: 'Give your accountant live read-only access with one link. Monthly package auto-generated. No more chasing documents.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
      </svg>
    ),
  },
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
    period: '/mo',
    desc: 'For serious businesses',
    features: ['Unlimited invoices', 'PocketChat unlimited', '5 languages', 'AI Morning Briefing', 'Accountant Portal', 'All features'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '¥5,980',
    period: '/mo',
    desc: 'Scale your team',
    features: ['Everything in Pro', 'Voice translation', '10 languages', 'Document scan AI', 'Priority support', 'Multiple staff'],
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

type Lang = 'en' | 'ja' | 'ur';

const HERO_TEXT: Record<Lang, { title1: string; title2: string; subtitle: string; cta: string }> = {
  en: {
    title1: 'Your AI Business',
    title2: 'Autopilot.',
    subtitle: 'Invoices. Cash flow. PocketChat with real-time translation in 10 languages. All from your phone. AI runs your business while you sleep.',
    cta: 'Open Your Pocket',
  },
  ja: {
    title1: 'AIビジネス',
    title2: 'オートパイロット',
    subtitle: '請求書、キャッシュフロー、10言語リアルタイム翻訳のPocketChat。すべてスマホから。あなたが寝ている間にAIがビジネスを回す。',
    cta: '無料で始める',
  },
  ur: {
    title1: 'AI بزنس',
    title2: 'آٹو پائلٹ',
    subtitle: 'انوائس، کیش فلو، 10 زبانوں میں ریئل ٹائم ترجمہ PocketChat۔ سب فون سے۔ آپ سوئیں، AI کاروبار چلائے۔',
    cta: 'مفت شروع کریں',
  },
};

const LANG_OPTIONS = [
  { value: 'en', flag: '🇬🇧', label: 'EN' },
  { value: 'ja', flag: '🇯🇵', label: 'JP' },
  { value: 'ur', flag: '🇵🇰', label: 'UR' },
];

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
          <div className="flex items-center gap-2">
            {/* Language dropdown */}
            <select
              value={lang}
              onChange={(e) => setLang(e.target.value as Lang)}
              className="rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1.5 text-xs text-[var(--text-2)] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5] appearance-none pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center]"
            >
              {LANG_OPTIONS.map((l) => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </select>
            <Link href="/login" className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-sm text-[var(--text-2)] hover:text-[var(--text-1)] transition-colors">
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
            AI-powered business toolkit &middot; 10 languages
          </div>
          <h1 className="mb-3 text-3xl font-light text-[var(--text-1)] sm:text-[42px] sm:leading-[1.1]">
            {hero.title1}{' '}
            <span className="font-semibold text-[var(--accent)]">
              {hero.title2}
            </span>
          </h1>
          <p className="mb-2 text-sm font-medium text-[var(--text-3)]">Built for entrepreneurs in Japan.</p>
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
              href="#pocketchat"
              className="w-full rounded-btn border border-[var(--border-strong)] bg-[var(--bg-2)] px-8 py-3 text-center text-sm font-medium text-[var(--text-2)] transition-colors hover:text-[var(--text-1)] sm:w-auto"
            >
              See PocketChat
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

      {/* PocketChat Spotlight — Dark Section */}
      <section id="pocketchat" className="bg-[#0A0A0A] text-white">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-[#4F46E5]/20 px-3.5 py-1.5 text-xs font-medium text-[#818CF8]">
              PocketChat\u2122
            </div>
            <h2 className="mb-3 text-2xl font-semibold text-white sm:text-3xl">Business Chat. Reimagined.</h2>
            <p className="mb-12 text-md leading-relaxed text-[#A1A1AA]">
              The first messenger where language is never a barrier.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#4F46E5]/20">
                <span className="text-2xl">💬</span>
              </div>
              <p className="text-sm text-white font-medium mb-1">Type in English.</p>
              <p className="text-sm text-[#A1A1AA]">Customer reads in Japanese.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#4F46E5]/20">
                <span className="text-2xl">🎤</span>
              </div>
              <p className="text-sm text-white font-medium mb-1">Send voice note in Urdu.</p>
              <p className="text-sm text-[#A1A1AA]">They hear it in Chinese.</p>
            </div>
            <div className="text-center">
              <div className="mb-4 mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#4F46E5]/20">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-sm text-white font-medium mb-1">Share invoice in chat.</p>
              <p className="text-sm text-[#A1A1AA]">Customer pays. AI logs it.</p>
            </div>
          </div>

          <div className="mt-14 text-center">
            <div className="inline-flex items-center gap-3 rounded-full border border-[#4F46E5]/30 bg-[#4F46E5]/10 px-5 py-2.5">
              <span className="text-sm">🇬🇧 🇯🇵 🇵🇰 🇸🇦 🇧🇩 🇧🇷 🇵🇭 🇻🇳 🇹🇷 🇨🇳</span>
              <span className="text-xs font-medium text-[#818CF8]">10 languages. Real-time.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Accountant Portal Spotlight */}
      <section className="border-y border-[var(--border)] bg-[var(--bg-2)]">
        <div className="mx-auto max-w-5xl px-4 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center rounded-full bg-[var(--accent-light)] px-3.5 py-1.5 text-xs font-medium text-[var(--accent)]">
              Accountant Portal\u2122
            </div>
            <h2 className="mb-4 text-xl font-semibold text-[var(--text-1)]">Your accountant. Always updated.</h2>
            <p className="mb-8 text-md leading-relaxed text-[var(--text-3)]">
              Generate one link. Your accountant gets live read-only access to everything — invoices, cash flow, expenses, receipts. Monthly packages auto-generated. Integrated with PocketChat for seamless communication.
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
              className="rounded-[8px] border border-[rgba(0,0,0,0.12)] bg-white px-2.5 py-1.5 text-xs text-[var(--text-3)] focus:border-[#4F46E5] focus:outline-none appearance-none pr-7 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2210%22%20height%3D%2210%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23A3A3A3%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E')] bg-no-repeat bg-[right_8px_center]"
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
