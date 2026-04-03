// Landing page — server component
import Link from 'next/link';
import { PocketMark, PocketChatMark } from '@/components/Logo';
import HeroChatMockup from '@/components/HeroChatMockup';
import InvoiceShowcase from '@/components/InvoiceShowcase';

const PLANS = [
  {
    name: 'Starter',
    price: '¥0',
    period: '',
    desc: 'Start with a 14-day Pro trial',
    features: ['14-day free trial (full Pro)', 'Unlimited invoices', 'Unlimited PocketChat contacts', '3 AI translations/day', 'AI Document Detector', 'Cash Flow tracker', 'Basic website'],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '¥1,980',
    priceAlt: '~$13 · ~€12',
    period: '/mo',
    desc: 'Your AI business autopilot',
    features: ['Unlimited invoices', 'AI Morning Briefing', 'Unlimited AI translations', 'Business Cycle Engine', 'Ops Radar dashboard', 'Accountant Portal', '5 languages'],
    cta: 'Go Pro',
    highlight: true,
  },
  {
    name: 'Business',
    price: '¥4,980',
    priceAlt: '~$33 · ~€30',
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

  return (
    <div className="min-h-screen bg-white text-[#0A0A0A]">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <PocketMark variant="lg" />
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

      {/* HERO — Split layout */}
      <section className="pt-32 pb-16 px-6">
        <div className="mx-auto max-w-[1100px] grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-10 items-center">
          {/* LEFT — Text */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#E5E5E5] mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
              <span className="text-[13px] text-[#6b7280] font-medium">World&apos;s first AI business messenger</span>
            </div>
            <h1 className="text-[clamp(2.25rem,5vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.02em] text-[#111827]">
              Your business speaks<br /><span className="text-[#4F46E5]">every language.</span>
            </h1>
            <p className="mt-4 text-lg text-[#6b7280] max-w-[420px] mx-auto lg:mx-0 leading-relaxed">
              You type English. They read Japanese. Nobody notices the difference.
              Invoices, chat, and your entire business — powered by <span className="text-[#F59E0B]">AI</span>.
            </p>
            <div className="mt-8 flex justify-center lg:justify-start gap-3 flex-wrap">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-7 py-3.5 rounded-xl text-[15px] font-semibold hover:bg-[#4338CA] transition-colors">
                Start free — 14 days
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </Link>
              <a href="#features" className="bg-white text-[#374151] px-7 py-3.5 rounded-xl text-[15px] font-semibold border border-[#E5E5E5] hover:border-[#CCC] transition-colors">
                See all features
              </a>
            </div>
            <div className="flex justify-center lg:justify-start gap-5 mt-6 flex-wrap">
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg><span className="text-xs text-[#6b7280] font-medium">13 languages</span></div>
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg><span className="text-xs text-[#6b7280] font-medium">Real-time AI</span></div>
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-xs text-[#6b7280] font-medium">No app for clients</span></div>
            </div>
          </div>

          {/* RIGHT — Animated Chat Mockup */}
          <HeroChatMockup />
        </div>
      </section>

      {/* POCKETCHAT CALLOUT */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-[#111827] rounded-3xl p-[clamp(32px,5vw,60px)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <PocketChatMark size={48} />
                <span className="text-sm font-bold text-[#F59E0B] tracking-wide">POCKETCHAT</span>
              </div>
              <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.2] text-white mb-4">
                They speak Japanese.<br />You speak English.<br /><span className="text-[#a78bfa]">Nobody notices.</span>
              </h2>
              <p className="text-[15px] text-[#cbd5e1] leading-relaxed mb-6">
                The world&apos;s first business messenger with real-time AI translation. Text, voice notes, photos, documents. Send in your language — they receive in theirs.
              </p>
              <div className="space-y-2.5">
                {['13 languages, real-time translation', 'Voice notes auto-translated', 'Connected to your invoices & pipeline', 'No app needed for your customers', 'Use inside BizPocket or as standalone app'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 4L12 14.01l-3-3" /></svg>
                    <span className="text-sm text-[#f1f5f9]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { from: 'GB', to: 'JP', orig: '"Payment confirmed for the Alphard"', trans: '「アルファードの支払いを確認しました」', transColor: '#a5b4fc', origFont: undefined, transFont: undefined, origDir: undefined, transDir: undefined },
                { from: 'PK', to: 'AE', orig: '"آرڈر کی تصدیق ہو گئی"', trans: '「تم تأكيد الطلب」', transColor: '#fbbf24', origFont: "'Noto Sans Arabic', sans-serif", transFont: "'Noto Sans Arabic', sans-serif", origDir: 'rtl' as const, transDir: 'rtl' as const },
                { from: 'BR', to: 'CN', orig: '"Obrigado pelo pagamento rápido"', trans: '「感谢您的快速付款」', transColor: '#4ade80', origFont: undefined, transFont: "'Noto Sans SC', sans-serif", origDir: undefined, transDir: undefined },
              ].map((item, i) => (
                <div key={i} className="bg-[#1e293b] rounded-2xl p-4 border border-[#475569]">
                  <div className="flex items-center gap-2 mb-2.5">
                    <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>{item.from}</span>
                    <span style={{ color: '#94a3b8', fontSize: 11 }}>→</span>
                    <span style={{ color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>{item.to}</span>
                  </div>
                  <p style={{ color: '#ffffff', fontSize: item.origDir === 'rtl' ? 15 : 13, fontWeight: 500, margin: 0, fontFamily: item.origFont, direction: item.origDir, unicodeBidi: item.origDir === 'rtl' ? 'isolate' : undefined }}>{item.orig}</p>
                  <p style={{ color: item.transColor, fontSize: item.transDir === 'rtl' ? 15 : 13, marginTop: 6, fontFamily: item.transFont, direction: item.transDir, unicodeBidi: item.transDir === 'rtl' ? 'isolate' : undefined }}>{item.trans}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* POCKETCHAT STANDALONE BANNER */}
      <section className="px-6 pb-10">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-[#f9fafb] rounded-2xl px-8 py-6 flex items-center justify-between flex-wrap gap-4 border border-[#e5e7eb]">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <PocketChatMark size={40} />
                <span className="text-[15px] font-bold text-[#111827]">PocketChat</span>
              </div>
              <p className="text-sm text-[#374151]">Just need translation chat? No business setup required. Free forever.</p>
            </div>
            <Link href="/signup?mode=pocketchat" className="bg-[#F59E0B] text-white px-6 py-2.5 rounded-[10px] text-sm font-semibold whitespace-nowrap hover:bg-[#d97706] transition-colors">
              Get PocketChat free
            </Link>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="grid grid-cols-4 gap-[1px] bg-[#e5e7eb] rounded-2xl overflow-hidden">
            {[{ n: '30+', l: 'Pages deployed', c: '#4F46E5' }, { n: '9', l: 'AI features', c: '#F59E0B' }, { n: '13', l: 'Languages', c: '#111827' }, { n: '16', l: 'Currencies', c: '#111827' }].map((s, i) => (
              <div key={i} className="bg-white py-7 px-5 text-center">
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
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-[#111827]">Everything your business needs.</h2>
            <p className="text-base text-[#374151] mt-2">9 AI features. 30+ pages. One pocket.</p>
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
              <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={f.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3" dangerouslySetInnerHTML={{ __html: f.svg }} />
                <h4 className="text-[15px] font-semibold text-[#111827] mb-1.5">{f.title}</h4>
                <p className="text-[13px] text-[#374151] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUILT FOR YOU — Personas */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-10">
            <h2 className="text-[32px] font-bold text-[#111827]">Built for you.</h2>
            <p className="text-base text-[#374151] mt-3">Whether you just landed in Japan or manage 50 clients.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'The newcomer', desc: 'Just arrived in Japan. Starting a side business. Need to send your first invoice and read Japanese documents.', badge: 'Starter — Free', badgeBg: '#eef2ff', badgeColor: '#4F46E5', iconBg: '#eef2ff', iconColor: '#4F46E5', icon: 'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2', icon2: 'M12 7 a4 4 0 100 0.01', border: '1px solid #e5e7eb' },
              { title: 'The solo operator', desc: 'Running a real business. 10-50 transactions a month. Drowning in manual work. Need an autopilot.', badge: 'Pro — ¥1,980/mo', badgeBg: '#4F46E5', badgeColor: 'white', iconBg: '#eef2ff', iconColor: '#4F46E5', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8z', border: '2px solid #4F46E5', popular: true },
              { title: 'The growing team', desc: '2-10 staff. Has an accountant. Needs team access, role-based permissions, and compliance tools.', badge: 'Business — ¥4,980/mo', badgeBg: '#fef3c7', badgeColor: '#92400e', iconBg: '#fef3c7', iconColor: '#F59E0B', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', icon2: 'M9 7 a4 4 0 100 0.01', border: '1px solid #e5e7eb' },
              { title: 'The accounting firm', desc: 'Managing 10-50 foreign business clients. Need one dashboard for all of them. White-label everything.', badge: 'Enterprise — Custom', badgeBg: '#f3f4f6', badgeColor: '#374151', iconBg: '#f3f4f6', iconColor: '#374151', icon: 'M2 7h20v14H2z M16 7V5a4 4 0 00-8 0v2 M12 12v4', border: '1px solid #e5e7eb' },
            ].map((p, i) => (
              <div key={i} className="bg-white rounded-2xl p-6 relative" style={{ border: p.border }}>
                {p.popular && <div className="absolute -top-2.5 left-5 bg-[#4F46E5] text-white text-[11px] font-semibold px-3 py-0.5 rounded-full">Most popular</div>}
                <div className="w-10 h-10 rounded-[10px] flex items-center justify-center mb-4" style={{ background: p.iconBg }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={p.iconColor} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={p.icon} />{p.icon2 && <path d={p.icon2} />}</svg>
                </div>
                <h3 className="text-base font-bold text-[#111827] mb-1">{p.title}</h3>
                <p className="text-[13px] text-[#374151] leading-relaxed mb-3">{p.desc}</p>
                <span className="text-xs font-semibold px-3 py-1 rounded-full" style={{ background: p.badgeBg, color: p.badgeColor }}>{p.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI BUSINESS CYCLE ENGINE */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-[#faf9f7] rounded-3xl p-[clamp(32px,5vw,56px)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#fef3c7] text-xs font-semibold text-[#92400e] mb-4">AI-POWERED</span>
              <h2 className="text-[28px] font-bold leading-[1.2] text-[#111827] mb-3">AI learns your business.<br />Builds your pipeline.<br /><span className="text-[#F59E0B]">Runs it for you.</span></h2>
              <p className="text-[15px] text-[#374151] leading-relaxed mb-6">No two businesses are the same. BizPocket AI interviews you, understands your operations, and creates a custom pipeline that adapts as your business grows.</p>
              <div className="space-y-2.5">
                {['AI interviews you in your language', 'Generates custom pipeline stages', 'Tracks every item through your cycle', 'Learns and improves over time', 'Morning briefing on bottlenecks'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-sm text-[#374151]">{f}</span></div>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-white rounded-[14px] border border-[#e5e7eb] p-4">
                <div className="flex items-center gap-2 mb-3"><div className="w-7 h-7 rounded-lg bg-[#F59E0B] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg></div><div><p className="text-[13px] font-semibold text-[#111827]">BizPocket AI</p><p className="text-[10px] text-[#F59E0B]">Setting up your business</p></div></div>
                <div className="space-y-2">
                  <div className="bg-[#f9fafb] rounded-[12px_12px_12px_4px] px-3.5 py-2.5 max-w-[90%] border border-[#f3f4f6]"><p className="text-[13px] text-[#374151] leading-relaxed">Tell me about your business. What do you sell or do?</p></div>
                  <div className="bg-[#4F46E5] rounded-[12px_12px_4px_12px] px-3.5 py-2.5 max-w-[90%] ml-auto"><p className="text-[13px] text-white leading-relaxed">I buy used cars from auctions, repair them, and export to Pakistan and UAE</p></div>
                  <div className="bg-[#f9fafb] rounded-[12px_12px_12px_4px] px-3.5 py-2.5 max-w-[90%] border border-[#f3f4f6]"><p className="text-[13px] text-[#374151] leading-relaxed">Got it! I&apos;ve created an 8-stage pipeline for your business:</p></div>
                </div>
              </div>
              <div className="bg-white rounded-[14px] border border-[#e5e7eb] p-4">
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
            <span className="inline-block px-3 py-1 rounded-full bg-[#eef2ff] text-xs font-semibold text-[#4338ca] mb-4">CANVA-STYLE BUILDER</span>
            <h2 className="text-[28px] font-bold leading-[1.2] text-[#111827] mb-3">Invoice fired.<br />Before you leave<br /><span className="text-[#4F46E5]">the parking lot.</span></h2>
            <p className="text-[15px] text-[#374151] leading-relaxed mb-6">Professional invoices in 60 seconds. Split-view live preview so you see exactly what your client sees. 10 templates. 16 currencies. E-signature. Share via link or PDF.</p>
            <div className="space-y-2.5">
              {['10 invoice templates', 'Split-view live preview (Canva-style)', 'E-signature capture', 'PDF download + share link', 'T-number for Japanese compliance (インボイス制度)', '16 currencies with auto tax calculation', 'Custom columns, discounts, attachments'].map((f, i) => (
                <div key={i} className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-sm text-[#374151]">{f}</span></div>
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
              <PocketMark variant="sm" />
              <span className="text-xs font-semibold text-[#a5b4fc] tracking-widest">BIZPOCKET</span>
            </div>
            <span className="inline-block px-3 py-1 rounded-full bg-[#4F46E5]/20 text-xs font-semibold text-[#a5b4fc] mb-5">SOCIAL MEDIA → ORDERS → MONEY</span>
            <h2 className="text-[28px] font-bold leading-[1.3] mb-4" style={{ background: 'linear-gradient(to right, #a5b4fc, #f0abfc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>One link. Every platform.<br />Instant orders.</h2>
            <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[520px] mx-auto mb-10">Put your BizPocket link on Instagram, TikTok, Facebook, LINE, WhatsApp, your business card — anywhere. Customers tap it, see your catalog, and chat with you in their language.</p>
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
            <p className="text-sm text-[#64748b]">Works for any business — cake shop, car dealer, import-export, freelancer, restaurant.</p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 pb-20">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center gap-5 mb-6">
              <div className="flex items-center gap-1.5"><PocketMark variant="sm" /><span className="text-[13px] font-semibold text-[#111827]">BizPocket</span></div>
              <span className="text-[13px] text-[#d1d5db]">+</span>
              <div className="flex items-center gap-1.5"><PocketChatMark size={24} /><span className="text-[13px] font-semibold text-[#111827]">PocketChat</span></div>
            </div>
            <h2 className="text-[32px] font-bold text-[#111827]">Start free. Scale when ready.</h2>
            <p className="text-base text-[#374151] mt-3">Every plan starts with a 14-day free trial of Pro. No credit card needed.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { name: 'Starter', price: '¥0', sub: 'Free forever + 14-day Pro trial', color: '#22c55e', border: '1px solid #e5e7eb', features: ['Unlimited invoices', 'Unlimited PocketChat contacts', '3 AI translations/day', 'AI Document Detector', 'Cash Flow tracker', 'Basic website', '"Powered by BizPocket" branding'], cta: 'Start free trial', ctaBg: 'transparent', ctaColor: '#374151', ctaBorder: '1px solid #e5e7eb', href: '/signup' },
              { name: 'Pro', price: '¥1,980', sub: '~$13 · ~€12 /mo', color: '#4F46E5', border: '2px solid #4F46E5', popular: true, features: ['Everything in Starter', 'Unlimited AI translations', 'AI Morning Briefing', 'AI Form Fill (unlimited)', 'Social Media Assistant', 'Ops Radar dashboard', 'Business Cycle Engine', 'Accountant Portal', 'Remove BizPocket branding', '5 languages'], cta: 'Go Pro', ctaBg: '#4F46E5', ctaColor: 'white', ctaBorder: 'none', href: '/signup?plan=pro' },
              { name: 'Business', price: '¥4,980', sub: '~$33 · ~€30 /mo', color: '#F59E0B', border: '1px solid #e5e7eb', features: ['Everything in Pro', 'Up to 10 staff accounts', 'Role-based access', 'Accountant Portal (full)', 'Voice translation', '13 languages', 'Japanese compliance toolkit', 'Team Hub', 'Custom branding', 'Priority support'], cta: 'Go Business', ctaBg: 'transparent', ctaColor: '#92400e', ctaBorder: '1px solid #F59E0B', href: '/signup?plan=business' },
              { name: 'Enterprise', price: 'Custom', sub: 'For firms managing multiple clients', color: '#374151', border: '1px solid #e5e7eb', bg: '#f9fafb', features: ['Everything in Business', 'Multi-org dashboard', 'Unlimited staff', 'API access', 'White-label everything', 'Dedicated account manager', 'Custom onboarding'], cta: 'Contact us', ctaBg: 'transparent', ctaColor: '#374151', ctaBorder: '1px solid #d1d5db', href: 'mailto:hello@bizpocket.io' },
            ].map((p, i) => (
              <div key={i} className="rounded-[20px] p-7 flex flex-col relative" style={{ border: p.border, background: p.bg || 'white' }}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#4F46E5] text-white text-xs font-semibold px-4 py-1 rounded-full whitespace-nowrap">Most popular</div>}
                <p className="text-sm font-semibold mb-1" style={{ color: p.color }}>{p.name}</p>
                <p className="text-[32px] font-bold text-[#111827] mb-1">{p.price}</p>
                <p className="text-xs text-[#6b7280] mb-5">{p.sub}</p>
                <div className="space-y-2 flex-1 mb-6">
                  {p.features.map((f, j) => (
                    <div key={j} className="flex items-start gap-2"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={p.color} strokeWidth="2" className="shrink-0 mt-0.5"><path d="M22 4L12 14.01l-3-3" /></svg><span className={`text-[13px] text-[#374151] ${j === 0 && i > 0 ? 'font-semibold' : ''}`}>{f}</span></div>
                  ))}
                </div>
                <Link href={p.href} className="block text-center py-3 rounded-[10px] text-sm font-semibold" style={{ background: p.ctaBg, color: p.ctaColor, border: p.ctaBorder }}>{p.cta}</Link>
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
          <p className="mt-4 text-[15px] text-[#d1d5db]">Join entrepreneurs across Japan who run their entire business from one app.</p>
          <Link href="/signup" className="mt-8 inline-block rounded-full bg-[#4F46E5] px-8 py-3.5 text-[14px] font-medium text-white hover:bg-[#4338CA] transition-colors">
            Start your free trial
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#F0F0F0] bg-white">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <div className="flex items-center justify-center gap-6 pb-6">
            <div className="flex items-center gap-1.5"><PocketMark variant="sm" /><span className="text-xs font-semibold text-[#6b7280]">BizPocket</span></div>
            <div className="flex items-center gap-1.5"><PocketChatMark size={24} /><span className="text-xs font-semibold text-[#6b7280]">PocketChat</span></div>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <PocketMark variant="sm" />
              <span className="text-[13px] font-medium text-[#0A0A0A]">BizPocket</span>
            </div>
            <div className="flex items-center gap-6">
              <a href="#features" className="text-[12px] text-[#6b7280] hover:text-[#0A0A0A]">Features</a>
              <a href="#pricing" className="text-[12px] text-[#6b7280] hover:text-[#0A0A0A]">Pricing</a>
              <Link href="/login" className="text-[12px] text-[#6b7280] hover:text-[#0A0A0A]">Log in</Link>
              <a href="/privacy" className="text-[12px] text-[#6b7280] hover:text-[#0A0A0A]">Privacy</a>
              <span className="text-[#d1d5db]">&middot;</span>
              <a href="/terms" className="text-[12px] text-[#6b7280] hover:text-[#0A0A0A]">Terms</a>
            </div>
            <p className="text-[11px] text-[#9ca3af]">&copy; 2026 TechDagger Inc.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
