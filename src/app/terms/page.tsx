'use client';

import { useRouter } from 'next/navigation';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f172a]">
      {/* Header */}
      <div className="sticky top-0 z-40 flex items-center h-14 px-2 bg-[#0f172a] border-b border-slate-700">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center min-w-[44px] min-h-[44px] -ml-1 rounded-full active:bg-slate-800 transition-colors"
          aria-label="Go back"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-200">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-[17px] font-semibold text-white ml-1">Terms of Service</h1>
      </div>

      {/* Content */}
      <div className="max-w-[700px] mx-auto px-6 py-8" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

        <p className="text-[14px] text-slate-500 mb-10">Last updated: April 2026</p>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">1. Acceptance of Terms</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">By accessing or using Evrywher, BizPocket, or any related services (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. The Service is operated by TechDagger Studio (MS Dynamics LLC), Miami Beach, FL, USA.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">2. Description of Service</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">Evrywher is a multilingual translation and communication app with AI-powered real-time translation across 21 languages. BizPocket is a mobile-first business management platform that includes Evrywher as its messaging feature. Together, they provide translated messaging, invoicing, cash flow tracking, document management, and AI-powered business tools.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">3. Account Registration</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">You must be at least 13 years old to create an account. One account per person — you are responsible for maintaining the security of your account credentials and for all activity under your account. You must provide accurate information during registration. You may not create multiple accounts to circumvent plan limitations.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">4. Free and Paid Plans</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">Evrywher offers a free tier with the following limitations:</p>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5 mb-3">
            <li>10 AI translations per day</li>
            <li>Basic features only</li>
            <li>Free tier limits may change with notice</li>
          </ul>
          <p className="text-[14px] text-slate-200 leading-[1.8]">Paid plans (Pro and Business) unlock additional features, higher limits, and priority support. All paid subscriptions are billed monthly via Stripe. You can cancel at any time — cancellation takes effect at the end of the current billing period. No refunds are provided for partial months. Plan features and pricing may change with 30 days written notice.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">5. AI Translation Disclaimer</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">Evrywher uses AI-powered translation (Anthropic Claude) to translate text, voice messages, and calls between languages. While we strive for high accuracy, AI translations are provided as-is and are not guaranteed to be 100% accurate. Translations should not be relied upon as a substitute for professional translation in:</p>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5 mb-3">
            <li>Legal documents or contracts</li>
            <li>Medical or healthcare communications</li>
            <li>Financial or regulatory filings</li>
            <li>Any situation where mistranslation could cause significant harm</li>
          </ul>
          <p className="text-[14px] text-slate-200 leading-[1.8]">For critical communications, use a certified human translator. We are not liable for errors, omissions, or misunderstandings arising from AI-generated translations.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">6. Acceptable Use</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">You agree not to use the Service to:</p>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5">
            <li>Send spam, bulk messages, or unsolicited communications</li>
            <li>Transmit illegal, harmful, threatening, abusive, or harassing content</li>
            <li>Impersonate another person or entity</li>
            <li>Attempt to access other users&apos; data or accounts</li>
            <li>Reverse-engineer, decompile, or exploit the Service</li>
            <li>Use AI features to generate misleading, fraudulent, or deceptive content</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Interfere with the operation or security of the Service</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">7. Content Ownership</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">You retain ownership of all content you create or upload, including messages, contacts, documents, and media. By using the Service, you grant us a limited license to process, store, and transmit your content solely for the purpose of providing the Service (including AI translation). We do not use your content for training AI models or for any purpose unrelated to delivering the Service to you.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">8. Intellectual Property</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">The Service, including its design, code, branding, logos, and features, is the property of TechDagger Studio. You may not copy, modify, distribute, or create derivative works based on the Service without written permission. &quot;Evrywher,&quot; &quot;BizPocket,&quot; &quot;Fire Invoice,&quot; and associated marks are trademarks of TechDagger Studio.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">9. Termination</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">You may delete your account at any time by contacting <a href="mailto:hello@evrywher.io" className="text-indigo-400 hover:underline">hello@evrywher.io</a>. We reserve the right to suspend or terminate accounts that violate these terms, without prior notice. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">10. Limitation of Liability</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the maximum extent permitted by law, TechDagger Studio (MS Dynamics LLC) shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to lost revenue, lost data, business interruption, or translation errors. Our total liability for any claim related to the Service is limited to the amount you paid us in the 12 months preceding the claim, or $100 USD, whichever is greater.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">11. Governing Law</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">These terms are governed by the laws of the State of Florida, USA, without regard to conflict of law principles. Any disputes arising from or relating to the Service shall first be attempted to be resolved informally by contacting us at <a href="mailto:hello@evrywher.io" className="text-indigo-400 hover:underline">hello@evrywher.io</a>. If informal resolution fails, disputes shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">12. Changes to These Terms</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">We may update these Terms from time to time. We will notify you of material changes via an in-app notification and by updating the &quot;Last updated&quot; date on this page. Continued use of the Service after changes constitutes acceptance of the updated terms.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">13. Contact</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">For questions about these terms, contact us at:</p>
          <p className="text-[14px] text-slate-200 leading-[1.8]">TechDagger Studio (MS Dynamics LLC)<br />Email: <a href="mailto:hello@evrywher.io" className="text-indigo-400 hover:underline">hello@evrywher.io</a></p>
        </section>

        <footer className="border-t border-slate-700 pt-6 mt-10">
          <p className="text-[13px] text-slate-500">BizPocket and Evrywher are products of TechDagger Studio (MS Dynamics LLC).</p>
        </footer>
      </div>
    </div>
  );
}
