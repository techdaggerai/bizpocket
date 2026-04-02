// Landing page — server component
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
      <section className="pt-32 pb-16 px-6">
        <div className="mx-auto max-w-[1100px] text-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-[#E5E5E5] mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] inline-block" />
            <span className="text-[13px] text-[#6b7280] font-medium">World&apos;s first AI business messenger</span>
          </div>
          <h1 className="text-[clamp(2.25rem,5vw,3.5rem)] font-bold leading-[1.1] tracking-tight text-[#111827]">
            Your business speaks<br /><span className="text-[#4F46E5]">every language.</span>
          </h1>
          <p className="mt-4 text-lg text-[#6b7280] max-w-[540px] mx-auto leading-relaxed">
            You type English. They read Japanese. Nobody notices the difference.
            Invoices, chat, and your entire business — powered by <span className="text-[#F59E0B]">AI</span>.
          </p>
          <div className="mt-8 flex justify-center gap-3 flex-wrap">
            <Link href="/signup" className="inline-flex items-center gap-2 bg-[#4F46E5] text-white px-8 py-3.5 rounded-xl text-[15px] font-semibold hover:bg-[#4338CA] transition-colors">
              Start free — 14 days full access
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
            </Link>
            <a href="#features" className="bg-white text-[#374151] px-8 py-3.5 rounded-xl text-[15px] font-semibold border border-[#E5E5E5] hover:border-[#CCC] transition-colors">
              See all features
            </a>
          </div>

          {/* Chat Mockup */}
          <div className="max-w-[560px] mx-auto mt-12 bg-[#f9fafb] rounded-[20px] p-5">
            <div className="bg-white rounded-2xl border border-[#E5E5E5] overflow-hidden">
              <div className="px-4 py-3 border-b border-[#f3f4f6] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#4F46E5] to-[#7c3aed] flex items-center justify-center text-white text-sm font-semibold">TK</div>
                  <div><p className="text-sm font-semibold text-[#111827]">Tanaka CPA</p><p className="text-[11px] text-[#22c55e]">● Online</p></div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#eef2ff] text-[#4F46E5] font-semibold">EN</span>
                  <span className="text-[11px] text-[#d1d5db]">⇄</span>
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#fef3c7] text-[#92400e] font-semibold">JP</span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-3.5 min-h-[300px]">
                <div className="flex justify-end"><div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_4px_14px] bg-[#4F46E5]"><p className="text-sm text-white leading-relaxed">Hi Tanaka-san, I sent invoice #042 for the Alphard repair</p><p className="text-[10px] text-white/50 mt-1">You typed in English</p></div></div>
                <div className="flex justify-start"><div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-[#f3f4f6]"><p className="text-sm text-[#111827] leading-relaxed">受け取りました。金曜日までにお支払い処理します</p><p className="text-[10px] text-[#9ca3af] mt-1">🇯🇵 Tanaka typed in Japanese · translated for you</p></div></div>
                <div className="flex justify-end"><div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_4px_14px] bg-[#4F46E5]"><p className="text-sm text-white leading-relaxed">Perfect. Are March receipts ready for tax filing?</p><p className="text-[10px] text-white/50 mt-1">You typed in English</p></div></div>
                <div className="flex justify-start"><div className="max-w-[80%] px-3.5 py-2.5 rounded-[14px_14px_14px_4px] bg-[#f3f4f6]"><p className="text-sm text-[#111827] leading-relaxed">はい、Vaultにアップロード済みです。合計47枚の領収書</p><p className="text-[10px] text-[#9ca3af] mt-1">🇯🇵 Tanaka typed in Japanese · translated for you</p></div></div>
              </div>
              <div className="px-4 py-2.5 border-t border-[#f3f4f6] flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg border border-[#E5E5E5] text-xs text-[#6b7280]">🇬🇧 EN ▼</span>
                <span className="flex-1 px-3.5 py-2 rounded-[10px] border border-[#E5E5E5] text-[13px] text-[#9ca3af]">Type a message...</span>
                <div className="w-[34px] h-[34px] rounded-[10px] bg-[#4F46E5] flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg></div>
              </div>
            </div>
            <div className="flex justify-center gap-5 mt-4 flex-wrap">
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4F46E5" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg><span className="text-xs text-[#6b7280] font-medium">13 languages</span></div>
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg><span className="text-xs text-[#6b7280] font-medium">Real-time AI translation</span></div>
              <div className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><path d="M22 4L12 14.01l-3-3" /></svg><span className="text-xs text-[#6b7280] font-medium">No app needed for clients</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* POCKETCHAT CALLOUT */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="bg-[#111827] rounded-3xl p-[clamp(32px,5vw,60px)] grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-[#F59E0B]/15 text-xs font-semibold text-[#F59E0B] mb-4">POCKETCHAT</span>
              <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold leading-[1.2] text-white mb-4">
                They speak Japanese.<br />You speak English.<br /><span className="text-[#818cf8]">Nobody notices.</span>
              </h2>
              <p className="text-[15px] text-[#9ca3af] leading-relaxed mb-6">
                The world&apos;s first business messenger with real-time AI translation. Text, voice notes, photos, documents. Send in your language — they receive in theirs.
              </p>
              <div className="space-y-2.5">
                {['13 languages, real-time translation', 'Voice notes auto-translated', 'Connected to your invoices & pipeline', 'No app needed for your customers', 'Use inside BizPocket or as standalone app'].map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2"><path d="M22 4L12 14.01l-3-3" /></svg>
                    <span className="text-sm text-[#d1d5db]">{f}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { from: '🇬🇧', to: '🇯🇵', orig: '"Payment confirmed for the Alphard"', trans: '「アルファードの支払いを確認しました」', color: 'text-[#818cf8]' },
                { from: '🇵🇰', to: '🇦🇪', orig: '"آرڈر کی تصدیق ہو گئی"', trans: '「تم تأكيد الطلب」', color: 'text-[#F59E0B]' },
                { from: '🇧🇷', to: '🇨🇳', orig: '"Obrigado pelo pagamento rápido"', trans: '「感谢您的快速付款」', color: 'text-[#22c55e]' },
              ].map((item, i) => (
                <div key={i} className="bg-[#1f2937] rounded-2xl p-4 border border-[#374151]">
                  <div className="flex items-center gap-2 mb-2.5"><span className="text-lg">{item.from}</span><span className="text-[11px] text-[#9ca3af]">→</span><span className="text-lg">{item.to}</span></div>
                  <p className="text-[13px] text-[#e5e7eb]">{item.orig}</p>
                  <p className={`text-[13px] ${item.color} mt-1.5`}>{item.trans}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="features" className="px-6 pb-16">
        <div className="mx-auto max-w-[1100px]">
          <div className="text-center mb-10">
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-[#111827]">Everything your business needs.</h2>
            <p className="text-base text-[#6b7280] mt-2">9 AI features. 30+ pages. One pocket.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { icon: '☀️', title: 'AI Morning Briefing', desc: 'Wake up to what happened overnight. AI tells you what to do today.' },
              { icon: '📸', title: 'AI Document Detector', desc: 'Snap any Japanese document. Get instant English translation.' },
              { icon: '🌐', title: 'AI Website Builder', desc: '7-step wizard builds your business website. Publish in minutes.' },
              { icon: '📊', title: 'Ops Radar', desc: 'Your business command center. See bottlenecks before they cost you.' },
              { icon: '💰', title: 'Cash Flow Tracker', desc: 'Log income and expenses. AI categorizes. See your real numbers.' },
              { icon: '🧾', title: 'AI Form Fill', desc: 'Upload any form in any language. AI fills it out for you field by field.' },
              { icon: '👨‍💼', title: 'Accountant Portal', desc: 'Your Japanese accountant gets read-only access. Monthly packages auto-generated.' },
              { icon: '📱', title: 'Social Media AI', desc: 'AI generates posts, captions, and hashtags. Connect Instagram to orders.' },
            ].map((f, i) => (
              <div key={i} className="bg-white rounded-2xl border border-[#E5E5E5] p-5">
                <span className="text-2xl block mb-2.5">{f.icon}</span>
                <h4 className="text-[15px] font-semibold text-[#111827] mb-1.5">{f.title}</h4>
                <p className="text-[13px] text-[#6b7280] leading-relaxed">{f.desc}</p>
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
