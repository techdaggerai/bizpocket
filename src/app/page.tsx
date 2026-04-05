'use client';

import Link from 'next/link';
import { PocketMark } from '@/components/Logo';
import HeroChatMockup from '@/components/HeroChatMockup';
import InvoiceShowcase from '@/components/InvoiceShowcase';
import AnimatedPocketChatLogo from '@/components/AnimatedPocketChatLogo';
import EvryWherMark from '@/components/EvryWherMark';
import PocketChatTypingIndicator from '@/components/PocketChatTypingIndicator';
import LandingLanguageDropdown from '@/components/LandingLanguageDropdown';

import { LandingI18nProvider, useLandingI18n } from '@/lib/landing-i18n';

const PLANS = [
  {
    name: 'Starter',
    price: '¥0',
    period: '',
    desc: 'Start with a 14-day Pro trial',
    features: ['14-day free trial (full Pro)', 'Unlimited invoices', 'Unlimited Evrywher contacts', '3 AI translations/day', 'AI Document Detector', 'Cash Flow tracker', 'Basic website'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥980',
    priceAlt: '~$13 · ~€12',
    period: '/mo',
    desc: 'Your AI business autopilot',
    features: ['Unlimited invoices', 'AI Morning Briefing', 'Unlimited AI translations', 'Business Cycle Engine', 'Ops Radar dashboard', 'Accountant Portal', '5 languages'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '¥2,980',
    priceAlt: '~$33 · ~€30',
    period: '/mo',
    desc: 'Your entire office — automated',
    features: ['Everything in Pro', 'Up to 5 team members', 'Accountant Portal (full)', 'Voice translation', '21 languages', 'Japanese compliance toolkit', 'Custom branding', 'Includes Evrywher Business'],
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
  return (
    <LandingI18nProvider>
      <LandingPageInner />
    </LandingI18nProvider>
  );
}

function LandingPageInner() {
  const { t } = useLandingI18n();

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PocketMark variant="lg" />
            <span className="text-[15px] font-semibold tracking-tight text-white" style={{ fontFamily: 'var(--font-outfit)' }}>BizPocket</span>
          </Link>
          <div className="hidden sm:flex items-center gap-8">
            <a href="#features" className="text-[15px] font-medium text-slate-300 hover:text-white transition-colors">{t('nav_features')}</a>
            <a href="#pricing" className="text-[15px] font-medium text-slate-300 hover:text-white transition-colors">{t('nav_pricing')}</a>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-3">
              <LandingLanguageDropdown />
              <Link href="/login" className="text-[15px] font-medium text-slate-300 hover:text-white transition-colors">{t('nav_login')}</Link>
            </div>
            <Link href="/signup" className="rounded-[20px] bg-indigo-600 px-5 py-2.5 text-[13px] font-medium text-white hover:bg-indigo-700 transition-colors">
              {t('nav_signup')}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO — Split layout with Liquid Glass card */}
      <section className="pt-32 pb-16 px-6">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
          {/* LEFT — Text inside Liquid Glass card */}
          <div className="text-center lg:text-left rounded-[20px] bg-slate-800/[0.78] backdrop-blur-[24px] p-8" style={{ boxShadow: 'var(--glass-shadow)' }}>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-white/10 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
              <span className="text-[13px] text-slate-300 font-medium">{t('hero_badge')}</span>
            </div>
            <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-white" style={{ fontFamily: 'var(--font-outfit)' }}>
              {t('hero_title_1')}<br /><span className="text-indigo-400">{t('hero_title_2')}</span>
            </h1>
            <p className="mt-4 text-lg text-slate-300 max-w-[420px] mx-auto lg:mx-0 leading-relaxed" style={{ fontFamily: 'var(--font-dm-sans)' }}>
              {t('hero_subtitle')} <span className="text-[#F59E0B]">AI</span>.
            </p>
            <div className="mt-8 flex justify-center lg:justify-start gap-3 flex-wrap">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-7 h-14 rounded-[20px] text-[15px] font-semibold hover:bg-indigo-700 transition-colors">
                {t('hero_cta')}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
              <a href="#features" className="bg-white/10 text-gray-200 px-7 h-14 inline-flex items-center rounded-[20px] text-[15px] font-semibold border border-white/10 hover:border-white/20 transition-colors">
                {t('hero_cta2')}
              </a>
            </div>
            <div className="flex justify-center lg:justify-start gap-5 mt-6 flex-wrap">
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg><span className="text-xs text-slate-400 font-medium">{t('hero_stat_langs')}</span></div>
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg><span className="text-xs text-slate-400 font-medium">{t('hero_stat_ai')}</span></div>
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-xs text-slate-400 font-medium">{t('hero_stat_noapp')}</span></div>
            </div>
            <a href="#pocketchat" className="mt-6 inline-flex items-center gap-2 rounded-full bg-indigo-500/20 px-4 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/30 transition-colors">
              <AnimatedPocketChatLogo size={32} isTranslating={true} />
              {t('hero_evrywher_cta')}
            </a>
          </div>

          {/* RIGHT — Animated Chat Mockup */}
          <HeroChatMockup />
        </div>
      </section>

      {/* POCKETCHAT CALLOUT */}
      <section id="pocketchat" className="px-6 py-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-3xl border-l-4 border-[#F59E0B] bg-slate-800/60 p-[clamp(32px,5vw,56px)]">
            <div className="mb-8 text-center">
              <span className="inline-block rounded-full bg-amber-500/20 px-4 py-1.5 text-xs font-semibold text-amber-300 mb-4">{t('evrywher_badge')}</span>
              <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-white">Meet <EvryWherMark size="lg" /></h2>
              <p className="mt-3 max-w-[560px] mx-auto text-[15px] text-slate-300 leading-relaxed">{t('evrywher_subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              {/* LEFT — Live Typing Indicator */}
              <div className="flex justify-center">
                <div className="rounded-2xl border border-slate-700 bg-slate-800 p-6 shadow-sm">
                  <PocketChatTypingIndicator contactName="Customer" size="lg" />
                </div>
              </div>
              {/* RIGHT — Feature list */}
              <div className="space-y-4">
                {[
                  { icon: 'M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z', color: '#4F46E5', text: 'Translated text chat in 21 languages' },
                  { icon: 'M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3zM19 10v2a7 7 0 01-14 0v-2', color: '#F59E0B', text: 'Voice messages — record, translate, speak' },
                  { icon: 'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72', color: '#16a34a', text: 'Live translated voice calls' },
                  { icon: 'M9 18V5l12-2v13M6 18a3 3 0 100-6M18 16a3 3 0 100-6', color: '#dc2626', text: 'Voice cloning — your voice, their language' },
                  { icon: 'M3 11h18v10H3zM12 2a3 3 0 100 6M8 16h.01M16 16h.01', color: '#7c3aed', text: 'AI bot auto-reply when you\'re busy' },
                  { icon: 'M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2zM12 13a4 4 0 100-8 4 4 0 000 8z', color: '#0891b2', text: 'Photo translation — snap and read' },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ background: `${f.color}15` }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                    </div>
                    <span className="text-sm font-medium text-slate-300">{f.text}</span>
                  </div>
                ))}
                <Link href="/chat" className="mt-4 inline-flex items-center gap-2 rounded-[10px] bg-[#4F46E5] px-6 py-3 text-sm font-semibold text-white hover:bg-[#4338ca] transition-colors">
                  {t('evrywher_cta')}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POCKETCHAT STANDALONE BANNER */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-slate-800 rounded-2xl px-8 py-6 flex items-center justify-between flex-wrap gap-4 border border-slate-700">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <AnimatedPocketChatLogo size={40} isTranslating={true} />
                <EvryWherMark size="sm" />
              </div>
              <p className="text-sm text-slate-300">{t('evrywher_standalone')}</p>
            </div>
            <Link href="/signup?mode=pocketchat" className="bg-[#F59E0B] text-slate-50 px-6 py-2.5 rounded-[10px] text-sm font-semibold whitespace-nowrap hover:bg-[#d97706] transition-colors">
              {t('evrywher_standalone_cta')}
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid grid-cols-4 gap-[1px] bg-slate-700 rounded-2xl overflow-hidden">
            {[{ n: '30+', l: 'Pages deployed', c: '#4F46E5' }, { n: '9', l: 'AI features', c: '#F59E0B' }, { n: '21', l: 'Languages', c: '#e2e8f0' }, { n: '16', l: 'Currencies', c: '#e2e8f0' }].map((s, i) => (
              <div key={i} className="bg-slate-800 py-7 px-5 text-center">
                <p className="text-[32px] font-bold mb-1" style={{ color: s.c }}>{s.n}</p>
                <p className="text-[13px] text-[#6b7280]">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="px-6 pb-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-10">
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-white">{t('features_title')}</h2>
            <p className="text-base text-slate-300 mt-2">{t('features_subtitle')}</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { title: 'AI Morning Briefing', desc: 'Wake up to what happened overnight. AI tells you what to do today.', svg: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M4.93 4.93l1.41 1.41"/><path d="M17.66 17.66l1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="M6.34 17.66l-1.41 1.41"/><path d="M19.07 4.93l-1.41 1.41"/>', color: '#F59E0B' },
              { title: 'AI Document Detector', desc: 'Snap any Japanese document. Get instant English translation.', svg: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="11" cy="11" r="4"/><path d="M15 15l4 4"/>', color: '#F59E0B' },
              { title: 'AI Website Builder', desc: '7-step wizard builds your business website. Publish in minutes.', svg: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>', color: '#F59E0B' },
              { title: 'Ops Radar', desc: 'Your business command center. See bottlenecks before they cost you.', svg: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>', color: '#4F46E5' },
              { title: 'Cash Flow Tracker', desc: 'Log income and expenses. AI categorizes. See your real numbers.', svg: '<path d="M3 20h4l-1-4"/><path d="M9 20h4l-2-8"/><path d="M15 20h4l-3-12"/><line x1="4" y1="16" x2="20" y2="16" opacity="0.3"/>', color: '#4F46E5' },
              { title: 'AI Form Fill', desc: 'Upload any form in any language. AI fills it out for you field by field.', svg: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8"/><path d="M8 17h5"/>', color: '#F59E0B' },
              { title: 'Accountant Portal', desc: 'Your Japanese accountant gets read-only access. Monthly packages auto-generated.', svg: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>', color: '#4F46E5' },
              { title: 'Social Media AI', desc: 'AI generates posts, captions, and hashtags. Connect Instagram to orders.', svg: '<rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>', color: '#F59E0B' },
            ].map((f, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl border border-slate-700 p-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3" dangerouslySetInnerHTML={{ __html: f.svg }} />
                <h4 className="text-[15px] font-semibold text-white mb-1.5">{f.title}</h4>
                <p className="text-[13px] text-slate-300 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR YOU — Personas */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-10">
            <h2 className="text-[32px] font-bold text-white">{t('personas_title')}</h2>
            <p className="text-base text-slate-300 mt-3">{t('personas_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'The newcomer', desc: 'Just arrived in Japan. Starting a side business. Need to send your first invoice and read Japanese documents.', badge: 'Starter — Free', badgeBg: '#eef2ff', badgeColor: '#4F46E5', iconBg: '#eef2ff', iconColor: '#4F46E5', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', icon2: 'M12 7 a4 4 0 100 0.01', border: '1px solid #e5e7eb' },
              { title: 'The solo operator', desc: 'Running a real business. 10-50 transactions a month. Drowning in manual work. Need an autopilot.', badge: 'Pro — ¥980/mo', badgeBg: '#4F46E5', badgeColor: 'white', iconBg: '#eef2ff', iconColor: '#4F46E5', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', border: '2px solid #4F46E5', popular: true },
              { title: 'The growing team', desc: '2-5 team members. Has an accountant. Needs team access, role-based permissions, and compliance tools.', badge: 'Business — ¥2,980/mo', badgeBg: '#fef3c7', badgeColor: '#92400e', iconBg: '#fef3c7', iconColor: '#F59E0B', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', icon2: 'M9 7 a4 4 0 100 0.01', border: '1px solid #e5e7eb' },
              { title: 'The accounting firm', desc: 'Managing 10-50 foreign business clients. Need one dashboard for all of them. White-label everything.', badge: 'Enterprise — Custom', badgeBg: '#f3f4f6', badgeColor: '#374151', iconBg: '#f3f4f6', iconColor: '#374151', icon: 'M2 7h20v14H2z M16 7V5a4 4 0 00-8 0v2 M12 12v4', border: '1px solid #e5e7eb' },
            ].map((p, i) => (
              <div key={i} className="bg-slate-800 rounded-2xl p-6 relative" style={{ border: p.border }}>
                {p.popular && <div className="absolute -top-2.5 left-5 bg-[#4F46E5] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">Most popular</div>}
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ background: p.iconBg }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={p.icon} />{p.icon2 && <path d={p.icon2} />}</svg>
                </div>
                <h3 className="text-base font-bold text-slate-50 mb-1">{p.title}</h3>
                <p className="text-[13px] text-slate-300 leading-relaxed mb-3">{p.desc}</p>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: p.badgeBg, color: p.badgeColor }}>{p.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI BUSINESS CYCLE ENGINE */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-slate-800/60 rounded-3xl p-[clamp(32px,5vw,56px)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/20 text-xs font-semibold text-amber-300 mb-4">AI-POWERED</span>
              <h2 className="text-[28px] font-bold leading-[1.2] text-white mb-3">AI learns your business.<br />Builds your pipeline.<br /><span className="text-[#F59E0B]">Runs it for you.</span></h2>
              <p className="text-[15px] text-slate-300 leading-relaxed mb-6">No two businesses are the same. BizPocket AI interviews you, understands your operations, and creates a custom pipeline that adapts as your business grows.</p>
              <div className="space-y-2.5">
                {['AI interviews you in your language', 'Generates custom pipeline stages', 'Tracks every item through your cycle', 'Learns and improves over time', 'Morning briefing on bottlenecks'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-sm text-slate-300">{f}</span></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-[14px] border border-slate-700 p-4">
                <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-[#F59E0B] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg></div><div><p className="text-[13px] font-semibold text-slate-50">BizPocket AI</p><p className="text-[10px] text-[#F59E0B]">Setting up your business</p></div></div>
                <div className="space-y-2">
                  <div className="bg-slate-800 rounded-[12px_12px_12px_4px] px-3.5 py-2.5 max-w-[90%] border border-slate-700"><p className="text-[13px] text-slate-300 leading-relaxed">Tell me about your business. What do you sell or do?</p></div>
                  <div className="bg-[#4F46E5] rounded-[12px_12px_4px_12px] px-3.5 py-2.5 max-w-[90%] ml-auto"><p className="text-[13px] text-white leading-relaxed">I buy used cars from auctions, repair them, and export to Pakistan and UAE</p></div>
                  <div className="bg-slate-800 rounded-[12px_12px_12px_4px] px-3.5 py-2.5 max-w-[90%] border border-slate-700"><p className="text-[13px] text-slate-300 leading-relaxed">Got it! I&apos;ve created an 8-stage pipeline for your business:</p></div>
                </div>
              </div>
              <div className="bg-slate-800 rounded-[14px] border border-slate-700 p-4">
                <p className="text-[11px] font-semibold text-[#6b7280] uppercase tracking-wider mb-3">Auto-generated pipeline</p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {[{ n: 'Source', bg: '#eef2ff', c: '#4F46E5' }, { n: 'Inspect', bg: '#fef3c7', c: '#92400e' }, { n: 'Repair', bg: '#fff7ed', c: '#9a3412' }, { n: 'Photo', bg: '#fdf2f8', c: '#9d174d' }, { n: 'List', bg: '#f5f3ff', c: '#6b21a8' }, { n: 'Negotiate', bg: '#ecfeff', c: '#155e75' }, { n: 'Ship', bg: '#f0fdf4', c: '#166534' }, { n: 'Get Paid', bg: '#ecfdf5', c: '#065f46' }].map((s, i) => (
                    <span key={i} className="flex items-center gap-1"><span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: s.bg, color: s.c }}>{s.n}</span>{i < 7 && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FIRE INVOICE */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <InvoiceShowcase />
          <div>
            <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300 mb-4">CANVA-STYLE BUILDER</span>
            <h2 className="text-[28px] font-bold leading-[1.2] text-white mb-3">Invoice fired.<br />Before you leave<br /><span className="text-indigo-300">the parking lot.</span></h2>
            <p className="text-[15px] text-slate-300 leading-relaxed mb-6">Professional invoices in 60 seconds. Split-view live preview so you see exactly what your client sees. 10 templates. 16 currencies. E-signature. Share via link or PDF.</p>
            <div className="space-y-2.5">
              {['10 invoice templates', 'Split-view live preview (Canva-style)', 'E-signature capture', 'PDF download + share link', 'T-number for Japanese compliance (インボイス制度)', '16 currencies with auto tax calculation', 'Custom columns, discounts, attachments'].map((f, i) => (
                <div key={i} className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-sm text-slate-300">{f}</span></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INSTAGRAM → ORDERS */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-[#111827] rounded-3xl p-[clamp(32px,5vw,56px)] text-center text-white">
            <div className="flex items-center justify-center gap-2 mb-4">
              <PocketMark variant="xl" />
              <span className="text-xs font-semibold text-[#a5b4fc] tracking-widest">BIZPOCKET</span>
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#4F46E5]/20 text-xs font-semibold text-[#a5b4fc] mb-5">SOCIAL MEDIA → ORDERS → MONEY</span>
            <h2 className="text-[28px] font-bold leading-[1.3] mb-4" style={{ background: 'linear-gradient(to right, #a5b4fc, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>One link. Every platform.<br />Instant orders.</h2>
            <p className="text-[15px] text-gray-300 leading-relaxed max-w-[520px] mx-auto mb-10">Put your BizPocket link on Instagram, TikTok, Facebook, LINE, WhatsApp, your business card — anywhere. Customers tap it, see your catalog, and chat with you in their language.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 32, flexWrap: 'wrap' }}>
              {[
                { name: 'Instagram', bg: 'linear-gradient(135deg, #833AB4, #C13584, #E4405F)', text: '#fff' },
                { name: 'TikTok', bg: '#000000', text: '#fff' },
                { name: 'Facebook', bg: '#1877F2', text: '#fff' },
                { name: 'YouTube', bg: '#FF0000', text: '#fff' },
                { name: 'LINE', bg: '#06C755', text: '#fff' },
                { name: 'X', bg: '#000000', text: '#fff' },
                { name: 'WhatsApp', bg: '#128C7E', text: '#fff' },
                { name: 'QR Code', bg: '#92400e', text: '#fff' },
                { name: 'Email', bg: '#4F46E5', text: '#fff' },
              ].map((p, i) => (
                <span key={i} style={{ fontSize: 12, fontWeight: 600, color: p.text, padding: '5px 16px', borderRadius: 100, background: p.bg }}>{p.name}</span>
              ))}
            </div>
            <div className="flex justify-center items-center gap-3 flex-wrap mb-8">
              {[{ l: 'Social post', c: '#e879f9' }, { l: 'Customer taps link', c: '#60a5fa' }, { l: 'Sees your catalog', c: '#34d399' }, { l: 'Chats in Japanese', c: '#a5b4fc' }, { l: 'Order in pipeline', c: '#fbbf24' }].map((s, i) => (
                <span key={i} className="flex items-center gap-2"><span className="bg-[#1e293b] border border-[#334155] rounded-[14px] px-4 py-3 text-[11px] font-medium text-[#e2e8f0]" style={{ borderTop: `2px solid ${s.c}` }}>{s.l}</span>{i < 4 && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>}</span>
              ))}
            </div>
            <p className="text-sm text-gray-400">Works for any business — cake shop, car dealer, import-export, freelancer, restaurant.</p>
          </div>
        </div>
      </section>

      {/* BUSINESS JAPANESE — NEW */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 to-amber-500/10 p-[clamp(32px,5vw,56px)]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="inline-block rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 mb-4">LANGUAGE LEARNING</span>
                <h2 className="text-[clamp(24px,4vw,32px)] font-bold text-white leading-tight mb-4">
                  Business Japanese,<br />Finally.
                </h2>
                <p className="text-[15px] text-slate-300 leading-relaxed mb-6">
                  You&apos;ve been in Japan for 5 years running a business. You still can&apos;t read 確定申告 (tax return) on a form. BizPocket teaches you the accounting and business Japanese you actually need — from the invoices and forms you use every day.
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {[
                    { icon: '🧾', label: 'Invoice & Billing' },
                    { icon: '📊', label: 'Accounting Terms' },
                    { icon: '🏢', label: 'Business Registration' },
                    { icon: '📋', label: 'Tax Filing' },
                    { icon: '🤝', label: 'Client Keigo' },
                    { icon: '🏦', label: 'Business Banking' },
                  ].map((t, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-300">
                      <span>{t.icon}</span>{t.label}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[#6b7280] italic">&ldquo;Every invoice you create teaches you the Japanese your accountant wishes you knew.&rdquo;</p>
              </div>
              <div className="mx-auto max-w-[300px]">
                <div className="rounded-2xl bg-slate-800 border border-slate-700 p-5 shadow-lg">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-3">From your invoice</p>
                  <div className="space-y-3">
                    {[
                      { jp: '売上', reading: 'うりあげ', en: 'Sales revenue' },
                      { jp: '経費', reading: 'けいひ', en: 'Expenses' },
                      { jp: '消費税', reading: 'しょうひぜい', en: 'Consumption tax' },
                      { jp: '確定申告', reading: 'かくていしんこく', en: 'Tax return' },
                    ].map((w, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div>
                          <span className="text-base font-bold text-slate-50">{w.jp}</span>
                          <span className="text-xs text-[#9ca3af] ml-1">({w.reading})</span>
                        </div>
                        <span className="text-xs font-medium text-indigo-400">{w.en}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 rounded-lg bg-indigo-500/20 p-2 text-center">
                    <p className="text-[9px] text-indigo-400 font-medium">30 topic packs · Spaced repetition · AI practice</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EVRYWHER INSIDE — Cross-sell */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="rounded-3xl bg-indigo-500/10 p-[clamp(32px,5vw,48px)] text-center">
            <div className="mb-5 flex items-center justify-center gap-3">
              <AnimatedPocketChatLogo size={36} isTranslating={true} />
              <EvryWherMark size="md" />
            </div>
            <h2 className="mb-3 text-[28px] font-bold text-white"><EvryWherMark size="lg" /> Inside Every Plan</h2>
            <p className="mx-auto mb-6 max-w-[560px] text-[15px] leading-relaxed text-slate-300">
              Chat with Japanese clients, scan their documents, learn their language — all included. Every BizPocket plan comes with <EvryWherMark size="sm" /> at the matching tier.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              {['AI Translation Chat', 'Camera Translation', 'Voice Translation', 'Language Learning', 'Cultural Coach', 'Emergency Card', 'Business Card Scanner'].map((f, i) => (
                <span key={i} className="rounded-full border border-indigo-500/30 bg-slate-800 px-3.5 py-1.5 text-xs font-semibold text-indigo-300">{f}</span>
              ))}
            </div>
            <a href="/pocketchat" className="inline-block rounded-[10px] border-2 border-[#4F46E5] px-8 py-3 text-[15px] font-semibold text-indigo-400 hover:bg-[#4F46E5] hover:text-white transition-colors">
              Explore <EvryWherMark size="sm" /> &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-5 mb-6">
              <div className="flex items-center gap-1.5"><PocketMark variant="xl" /><span className="text-[13px] font-semibold text-slate-50">BizPocket</span></div>
              <span className="text-[13px] text-[#d1d5db]">+</span>
              <div className="flex items-center gap-1.5"><AnimatedPocketChatLogo size={32} isTranslating={true} /><EvryWherMark size="sm" /></div>
            </div>
            <h2 className="text-[32px] font-bold text-white">{t('pricing_title')}</h2>
            <p className="text-base text-slate-300 mt-3">{t('pricing_subtitle')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Starter', price: '¥0', sub: 'Free forever + 14-day Pro trial', color: '#22c55e', border: '1px solid #334155', features: ['Unlimited invoices', 'Unlimited Evrywher contacts', '3 AI translations/day', 'AI Document Detector', 'Cash Flow tracker', 'Basic website', '"Powered by BizPocket" branding'], cta: 'Start free trial', ctaBg: 'transparent', ctaColor: '#cbd5e1', ctaBorder: '1px solid #334155', href: '/signup' },
              { name: 'Pro', price: '¥980', sub: '~$7 · ~€6 /mo', color: '#4F46E5', border: '2px solid #4F46E5', popular: true, features: ['Everything in Starter', 'Unlimited AI translations', 'AI Morning Briefing', 'AI Form Fill (unlimited)', 'Social Media Assistant', 'Ops Radar dashboard', 'Business Cycle Engine', 'Accountant Portal', 'Remove BizPocket branding', '5 languages'], cta: 'Go Pro', ctaBg: '#4F46E5', ctaColor: 'white', ctaBorder: 'none', href: '/signup?plan=pro' },
              { name: 'Business', price: '¥2,980', sub: '~$20 · ~€18 /mo', color: '#F59E0B', border: '1px solid #334155', features: ['Everything in Pro', 'Up to 5 team members', 'Role-based access', 'Accountant Portal (full)', 'Voice translation', '21 languages', 'Japanese compliance toolkit', 'Team Hub', 'Custom branding', 'Priority support', 'Includes Evrywher Business'], cta: 'Go Business', ctaBg: 'transparent', ctaColor: '#fbbf24', ctaBorder: '1px solid #F59E0B', href: '/signup?plan=business' },
              { name: 'Enterprise', price: 'Custom', sub: 'For firms managing multiple clients', color: '#94a3b8', border: '1px solid #334155', bg: '#0f172a', features: ['Everything in Business', 'Multi-org dashboard', 'Unlimited staff', 'API access', 'White-label everything', 'Dedicated account manager', 'Custom onboarding'], cta: 'Contact us', ctaBg: 'transparent', ctaColor: '#94a3b8', ctaBorder: '1px solid #475569', href: 'mailto:hello@bizpocket.io' },
            ].map((p, i) => (
              <div key={i} className="rounded-[20px] p-7 flex flex-col relative" style={{ border: p.border, background: p.bg || '#1e293b' }}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">Most popular</div>}
                <p className="text-sm font-semibold mb-1" style={{ color: p.color }}>{p.name}</p>
                <p className="text-[32px] font-bold text-slate-50 mb-1">{p.price}</p>
                <p className="text-xs text-slate-400 mb-5">{p.sub}</p>
                <div className="space-y-2 flex-1 mb-6">
                  {p.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2" className="shrink-0 mt-0.5"><path d="M22 4L12 14.01l-3-3" /></svg><span className={`text-[13px] text-slate-200 ${j === 0 && i > 0 ? 'font-semibold' : ''}`}>{f}</span></div>
                  ))}
                </div>
                <Link href={p.href} className="block text-center py-3 rounded-[10px] text-sm font-semibold" style={{ background: p.ctaBg, color: p.ctaColor, border: p.ctaBorder }}>{p.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DOWNLOAD THE APP */}
      <section className="py-20 bg-slate-900">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center gap-12">
          {/* Phone mockup */}
          <div className="flex-1 flex justify-center">
            <div className="relative w-[280px] h-[560px] bg-slate-800 rounded-[3rem] border-4 border-slate-700 shadow-2xl overflow-hidden p-3">
              <div className="w-full h-full bg-slate-800 rounded-[2.25rem] overflow-hidden flex items-center justify-center">
                <div className="text-center p-6">
                  <div className="flex justify-center"><PocketMark variant="xl" /></div>
                  <p className="text-white font-semibold mt-4 text-lg">BizPocket</p>
                  <p className="text-slate-400 text-sm mt-1">AI Business Autopilot</p>
                </div>
              </div>
            </div>
          </div>
          {/* Content */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Take BizPocket Everywhere
            </h2>
            <p className="text-lg text-slate-300 mb-8 max-w-md">
              Your AI business autopilot in your pocket. Send invoices, track cash flow,
              and chat with clients — all from your phone.
            </p>
            {/* App Store badges */}
            <div className="flex gap-4 justify-center md:justify-start mb-6">
              <div className="flex items-center gap-3 bg-black text-white rounded-xl px-5 py-3 opacity-75 cursor-default">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wide opacity-70">Coming Soon on</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-black text-white rounded-xl px-5 py-3 opacity-75 cursor-default">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M3.18 23.79c.27.44.76.71 1.28.68.2-.01.39-.06.56-.15l17.25-9.78c.49-.28.79-.8.79-1.36s-.3-1.08-.79-1.36L5.02.04C4.85-.05 4.66-.1 4.46-.11c-.52-.03-1.01.24-1.28.68-.17.27-.26.59-.26.92V22.87c0 .33.09.65.26.92zM5.62 2.19L14.41 12l-8.79 9.81V2.19z"/></svg>
                <div className="text-left">
                  <p className="text-[10px] uppercase tracking-wide opacity-70">Coming Soon on</p>
                  <p className="text-sm font-semibold">Google Play</p>
                </div>
              </div>
            </div>
            {/* PWA install */}
            <div className="flex items-center gap-2 justify-center md:justify-start text-sm text-slate-400 mb-4">
              <span className="w-12 h-px bg-slate-600" />
              <span>or install now</span>
              <span className="w-12 h-px bg-slate-600" />
            </div>
            <Link href="/download" className="inline-flex items-center gap-2 text-indigo-400 font-medium hover:underline">
              Install as Web App →
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="border-t border-white/[0.06] bg-[#0A0A0A]">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-semibold tracking-tight text-white leading-tight">
            Your business deserves better tools.
          </h2>
          <p className="mt-4 text-[15px] text-[#d1d5db]">Join entrepreneurs across Japan who run their entire business from one app.</p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-[#4F46E5] px-8 py-3.5 text-[14px] font-medium text-white hover:bg-[#4338CA] transition-colors">
            Start your free trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/[0.06] bg-slate-900">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-center justify-center gap-6 pb-6">
            <div className="flex items-center gap-1.5"><PocketMark variant="xl" /><span className="text-xs font-semibold text-[#6b7280]">BizPocket</span></div>
            <div className="flex items-center gap-1.5"><AnimatedPocketChatLogo size={32} isTranslating={true} /><EvryWherMark size="xs" /></div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PocketMark variant="xl" />
              <span className="text-[13px] font-medium text-slate-300">BizPocket</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-[12px] text-[#6b7280] hover:text-white">Features</a>
              <a href="#pricing" className="text-[12px] text-[#6b7280] hover:text-white">Pricing</a>
              <Link href="/login" className="text-[12px] text-[#6b7280] hover:text-white">Log in</Link>
              <a href="https://pocketchat.co" className="text-[12px] text-[#6b7280] hover:text-white"><EvryWherMark size="xs" /></a>
              <span className="text-[#d1d5db]">&middot;</span>
              <a href="/privacy" className="text-[12px] text-[#6b7280] hover:text-white">Privacy</a>
              <span className="text-[#d1d5db]">&middot;</span>
              <a href="/terms" className="text-[12px] text-[#6b7280] hover:text-white">Terms</a>
            </div>
            <p className="text-[11px] text-[#9ca3af]">&copy; 2026 MS Dynamics LLC · TechDagger Studio</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
