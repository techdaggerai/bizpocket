'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PocketMark } from '@/components/Logo';

const PLANS = [
  {
    name: 'Starter',
    price: '¥0',
    period: '',
    desc: 'Start with a 14-day Pro trial',
    features: ['14-day free trial (full Pro)', '3 invoices/month', 'AI Document Detector', 'PocketChat (10 translations/day)', 'AI Website Builder', 'Business Health Score'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥2,980',
    priceAlt: '~$20',
    period: '/mo',
    desc: 'Your AI business autopilot',
    features: ['Unlimited invoices', 'AI Morning Briefing', 'Unlimited AI translations', 'Business Cycle Engine', 'Ops Radar dashboard', 'Accountant Portal', '5 languages'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '¥5,980',
    priceAlt: '~$40',
    period: '/mo',
    desc: 'Your entire office — automated',
    features: ['Everything in Pro', 'Up to 10 staff accounts', 'Accountant Portal (full)', 'Voice translation', '13 languages', 'Japanese compliance toolkit', 'Custom branding'],
    cta: 'Go Business',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    desc: 'For firms managing multiple clients',
    features: ['Everything in Business', 'Multi-org dashboard', 'API access', 'White-label', 'Dedicated account manager'],
    cta: 'Contact us',
    highlight: false,
  },
];

export default function LandingPage() {
  const [email, setEmail] = useState('');

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PocketMark className="h-7 w-7" />
            <span className="text-[15px] font-semibold tracking-tight text-[#0A0A0A]">BizPocket</span>
          </Link>
          <div className="hidden sm:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-[#666] hover:text-[#0A0A0A] transition-colors">Features</a>
            <a href="#pricing" className="text-[13px] text-[#666] hover:text-[#0A0A0A] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-[#666] hover:text-[#0A0A0A] transition-colors">Log in</Link>
            <Link href="/signup" className="rounded-full bg-[#0A0A0A] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#333] transition-colors">
              Open account
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-32 pb-20 px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-[clamp(2.5rem,6vw,4.5rem)] font-semibold leading-[1.05] tracking-tight text-[#0A0A0A]">
            Run your business.<br />From your pocket.
          </h1>
          <p className="mt-6 text-lg text-[#666] leading-relaxed max-w-xl mx-auto">
            AI-powered invoices, translated chat, operations tracking, and a website for your business &mdash; all from one app.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-sm text-[#0A0A0A] placeholder-[#999] focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
            <Link
              href={email ? `/signup?email=${encodeURIComponent(email)}` : '/signup'}
              className="rounded-full bg-[#4F46E5] px-6 py-3 text-sm font-medium text-white hover:bg-[#4338CA] transition-colors whitespace-nowrap"
            >
              Start free
            </Link>
          </div>
          <p className="mt-4 text-[11px] text-[#BBB]">14-day free trial &middot; No credit card required</p>
        </div>
      </section>

      {/* PRODUCT PREVIEW */}
      <section className="px-6 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] p-2 sm:p-3">
            <div className="rounded-xl bg-white border border-[#E5E5E5] overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[#F0F0F0] bg-[#FAFAFA]">
                <div className="flex gap-1.5">
                  <div className="w-[10px] h-[10px] rounded-full bg-[#FF5F57]" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#FEBC2E]" />
                  <div className="w-[10px] h-[10px] rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-[11px] text-[#BBB]">bizpocket.io</span>
                </div>
              </div>
              <div className="p-6 sm:p-8">
                <div className="flex items-center gap-2 mb-6">
                  <div className="h-8 w-8 rounded-lg bg-[#4F46E5] flex items-center justify-center">
                    <PocketMark className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#0A0A0A]">Dashboard</span>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="rounded-lg bg-[#FAFAFA] p-4">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Balance</p>
                    <p className="text-xl font-semibold mt-1 font-mono">&yen;4,280,500</p>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] p-4">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">This month</p>
                    <p className="text-xl font-semibold mt-1 text-[#16A34A] font-mono">+&yen;1,200,000</p>
                  </div>
                  <div className="rounded-lg bg-[#FAFAFA] p-4">
                    <p className="text-[10px] text-[#999] uppercase tracking-wider">Health</p>
                    <p className="text-xl font-semibold mt-1 text-[#4F46E5]">92</p>
                  </div>
                </div>
                <div className="h-[1px] bg-[#F0F0F0] mb-4" />
                <div className="flex gap-3">
                  {['Invoice sent \u2014 \u00A5440,000', 'AI Briefing ready', 'New order from Instagram'].map((item, i) => (
                    <div key={i} className="flex-1 rounded-lg border border-[#F0F0F0] p-3">
                      <p className="text-[11px] text-[#666]">{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TAGLINE */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-[clamp(1.5rem,4vw,2.8rem)] font-semibold leading-[1.15] tracking-tight">
            Everything your business needs.<br />
            <span className="text-[#999]">All in one app.</span>
          </h2>
        </div>
      </section>

      {/* FEATURES ROW 1 */}
      <section id="features" className="border-t border-[#F0F0F0]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Fire Invoice', desc: 'Professional invoices in 60 seconds. 5 templates. PDF export. Share via link, LINE, or WhatsApp.' },
              { title: 'PocketChat', desc: 'Message anyone in 13 languages. AI translates in real-time. Voice messages. Photo sharing.' },
              { title: 'AI Document Detector', desc: 'Snap any Japanese document. AI detects the type, translates it, explains it, suggests next steps.' },
              { title: 'Cash Flow', desc: 'Track every yen in and out. Monthly summaries. Expense categories. Know your numbers instantly.' },
            ].map((f, i) => (
              <div key={i} className={`p-6 ${i > 0 ? 'sm:border-l border-t sm:border-t-0 border-[#F0F0F0]' : ''}`}>
                <h3 className="text-[15px] font-semibold text-[#0A0A0A] mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#666] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI SECTION */}
      <section className="border-t border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="max-w-2xl">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#4F46E5] mb-4">Built on AI</p>
            <h2 className="text-[clamp(1.5rem,3.5vw,2.5rem)] font-semibold leading-[1.15] tracking-tight mb-6">
              Your business runs itself.<br />You just approve.
            </h2>
            <p className="text-[15px] text-[#666] leading-relaxed mb-10">
              Wake up to your AI morning briefing. Overnight: invoices tracked, cash flow updated, action items ready. AI creates your social media posts, builds your website, and learns your business every day.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: 'AI Business Cycle', desc: 'Tell AI about your business in 2 minutes. It creates a custom pipeline \u2014 cars, cakes, consulting, anything.' },
              { title: 'Ops Radar', desc: 'Your command center. Every item tracked, every bottleneck detected, every cost visible in real time.' },
              { title: 'AI Gets Smarter', desc: 'The longer you use it, the smarter it gets. After a month, it predicts problems before they happen.' },
            ].map((f, i) => (
              <div key={i} className="rounded-xl border border-[#E5E5E5] bg-white p-6">
                <h3 className="text-[14px] font-semibold text-[#0A0A0A] mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#666] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES ROW 2 */}
      <section className="border-t border-[#F0F0F0]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { title: 'Website Builder', desc: 'AI generates a professional website for your business. Pick a style, publish in one click. Live instantly.' },
              { title: 'Social Media', desc: 'Upload a photo, AI writes the perfect caption and 15 hashtags. Best time to post. Story ideas included.' },
              { title: 'Accountant Portal', desc: 'Monthly reports, tax estimates, CSV export. Share with your accountant or generate AI reports instantly.' },
              { title: 'Online Orders', desc: 'Customers order from your Instagram bio link. Orders flow into your pipeline automatically.' },
            ].map((f, i) => (
              <div key={i} className={`p-6 ${i > 0 ? 'sm:border-l border-t sm:border-t-0 border-[#F0F0F0]' : ''}`}>
                <h3 className="text-[15px] font-semibold text-[#0A0A0A] mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#666] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LANGUAGES */}
      <section className="border-t border-[#F0F0F0] bg-[#FAFAFA]">
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <p className="text-[13px] text-[#999] mb-3">Built for entrepreneurs who do business in Japan</p>
          <h2 className="text-[clamp(1.3rem,3vw,2rem)] font-semibold tracking-tight">
            13 languages. 16 currencies. One app.
          </h2>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {['English', '\u65E5\u672C\u8A9E', '\u0627\u0631\u062F\u0648', '\u0627\u0644\u0639\u0631\u0628\u064A\u0629', '\u09AC\u09BE\u0982\u09B2\u09BE', 'Portugu\u00EAs', 'Filipino', 'Ti\u1EBFng Vi\u1EC7t', 'T\u00FCrk\u00E7e', '\u4E2D\u6587', 'Fran\u00E7ais', 'Nederlands', 'Espa\u00F1ol'].map((lang) => (
              <span key={lang} className="rounded-full border border-[#E5E5E5] bg-white px-4 py-1.5 text-[12px] text-[#666]">{lang}</span>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="border-t border-[#F0F0F0]">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-[clamp(1.5rem,3vw,2.2rem)] font-semibold tracking-tight">Simple, transparent pricing</h2>
            <p className="mt-2 text-[14px] text-[#666]">Start free. Upgrade when you&apos;re ready.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => (
              <div key={plan.name} className={`rounded-xl p-6 ${plan.highlight ? 'border-2 border-[#4F46E5] bg-white shadow-sm' : 'border border-[#E5E5E5] bg-white'}`}>
                {plan.highlight && (
                  <span className="inline-block mb-3 rounded-full bg-[#4F46E5]/10 px-3 py-1 text-[11px] font-medium text-[#4F46E5]">Most popular</span>
                )}
                <h3 className="text-[16px] font-semibold text-[#0A0A0A]">{plan.name}</h3>
                <p className="text-[12px] text-[#999] mt-1">{plan.desc}</p>
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-semibold text-[#0A0A0A] font-mono">{plan.price}</span>
                  <span className="text-[13px] text-[#999]">{plan.period}</span>
                  {plan.priceAlt && <p className="text-[11px] text-[#BBB] mt-0.5">{plan.priceAlt}/mo</p>}
                </div>
                <Link href="/signup" className={`block w-full rounded-full py-2.5 text-center text-[13px] font-medium transition-colors ${plan.highlight ? 'bg-[#4F46E5] text-white hover:bg-[#4338CA]' : 'bg-[#0A0A0A] text-white hover:bg-[#333]'}`}>
                  {plan.cta}
                </Link>
                <ul className="mt-5 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-[12px] text-[#666]">
                      <svg className="h-3.5 w-3.5 text-[#4F46E5] mt-0.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-[#F0F0F0] bg-[#0A0A0A]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-tight text-white leading-tight">
            Your business deserves better tools.
          </h2>
          <p className="mt-4 text-[15px] text-[#999]">Join entrepreneurs across Japan who run their entire business from one app.</p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-[#4F46E5] px-8 py-3.5 text-[14px] font-medium text-white hover:bg-[#4338CA] transition-colors">
            Start your free trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#F0F0F0] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PocketMark className="h-5 w-5" />
              <span className="text-[13px] font-medium text-[#0A0A0A]">BizPocket</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-[12px] text-[#999] hover:text-[#0A0A0A]">Features</a>
              <a href="#pricing" className="text-[12px] text-[#999] hover:text-[#0A0A0A]">Pricing</a>
              <Link href="/login" className="text-[12px] text-[#999] hover:text-[#0A0A0A]">Log in</Link>
            </div>
            <p className="text-[11px] text-[#CCC]">&copy; 2026 TechDagger Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
