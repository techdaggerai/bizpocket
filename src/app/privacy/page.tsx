'use client';

import { useRouter } from 'next/navigation';

export default function PrivacyPage() {
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
        <h1 className="text-[17px] font-semibold text-white ml-1">Privacy Policy</h1>
      </div>

      {/* Content */}
      <div className="max-w-[700px] mx-auto px-6 py-8" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>

        <p className="text-[14px] text-slate-500 mb-10">Last updated: April 2026</p>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Who We Are</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">Evrywher and BizPocket are products of TechDagger Studio, operated by MS Dynamics LLC, Miami Beach, FL, USA. This policy applies to the Evrywher mobile app, web app, and all related services.</p>
          <p className="text-[14px] text-slate-200 leading-[1.8]">Contact: <a href="mailto:hello@evrywher.io" className="text-indigo-400 hover:underline">hello@evrywher.io</a></p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Information We Collect</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">We collect the following personal data when you use Evrywher:</p>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5 mb-3">
            <li><strong className="text-slate-100">Account information</strong> — name, email address, and phone number you provide at signup</li>
            <li><strong className="text-slate-100">Messages</strong> — text messages, voice messages, and media you send through the app</li>
            <li><strong className="text-slate-100">Contacts</strong> — contact names, phone numbers, and metadata you add to your contact list</li>
            <li><strong className="text-slate-100">Translations</strong> — translated versions of your messages stored for instant retrieval</li>
            <li><strong className="text-slate-100">Camera scans</strong> — images captured through the camera translation and document scanner features</li>
            <li><strong className="text-slate-100">Voice data</strong> — voice recordings used for voice messaging and voice translation only</li>
            <li><strong className="text-slate-100">Usage data</strong> — pages visited, features used, device type, and IP address for analytics</li>
          </ul>
          <p className="text-[14px] text-slate-200 leading-[1.8]">We do not collect location data, phone contacts, or camera/microphone data beyond what you explicitly provide through app features.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">How We Use Your Information</h2>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5">
            <li>Provide real-time AI translation of messages between 21 languages</li>
            <li>Deliver and store messages between you and your contacts</li>
            <li>Generate AI-powered features (bot responses, business briefings, document detection)</li>
            <li>Process payments for paid subscription plans</li>
            <li>Send service-related notifications (not marketing)</li>
            <li>Improve the quality and accuracy of translations</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">What We Don&apos;t Do</h2>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5">
            <li><strong className="text-slate-100">We do not sell your data</strong> to third parties — ever</li>
            <li><strong className="text-slate-100">We do not share personal messages</strong> with advertisers</li>
            <li><strong className="text-slate-100">We do not use your chat content</strong> for training AI models without your explicit consent</li>
            <li><strong className="text-slate-100">We do not profile you</strong> for advertising purposes</li>
          </ul>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">AI Processing and Translation</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">When you send a message that requires translation, the message text is sent to Anthropic&apos;s Claude API for processing. Anthropic processes the text to generate a translation and does not retain your data for training purposes. Translated text is stored in our database so you can view it instantly on future visits.</p>
          <p className="text-[14px] text-slate-200 leading-[1.8]">Voice messages may be processed by ElevenLabs for voice cloning and text-to-speech features. Voice samples are stored securely and used only to generate translations in your voice. You can delete your voice clone at any time from Settings.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Data Storage and Security</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">Your data is stored on Supabase servers in Tokyo, Japan (ap-northeast-1 region). All data is encrypted in transit using HTTPS/TLS 1.2+ and encrypted at rest. Row-level security (RLS) ensures each user can only access their own data. Database backups are performed daily.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Third-Party Services</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">We use the following third-party services:</p>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5">
            <li><strong className="text-slate-100">Anthropic (Claude)</strong> — AI translation and assistant features</li>
            <li><strong className="text-slate-100">ElevenLabs</strong> — voice cloning and text-to-speech</li>
            <li><strong className="text-slate-100">Stripe</strong> — payment processing for subscriptions</li>
            <li><strong className="text-slate-100">Supabase</strong> — database, authentication, and file storage (Tokyo, Japan)</li>
            <li><strong className="text-slate-100">Vercel</strong> — application hosting and deployment</li>
          </ul>
          <p className="text-[14px] text-slate-200 leading-[1.8] mt-3">We share only the minimum data required for each service to function. Each service operates under its own privacy policy.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Data Retention</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">We retain your account data and messages for as long as your account is active. If you delete your account, all personal data including messages, contacts, translations, and voice data will be permanently deleted within 30 days. Anonymized usage statistics may be retained for service improvement.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Your Rights</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">You have the right to:</p>
          <ul className="text-[14px] text-slate-200 leading-[1.8] pl-5 list-disc space-y-1.5">
            <li><strong className="text-slate-100">Access</strong> — view and request a copy of your personal data</li>
            <li><strong className="text-slate-100">Export</strong> — export your data in a machine-readable format</li>
            <li><strong className="text-slate-100">Delete</strong> — request deletion of your account and all personal data</li>
            <li><strong className="text-slate-100">Opt out</strong> — opt out of analytics and non-essential data collection</li>
            <li><strong className="text-slate-100">Rectification</strong> — correct inaccurate personal data</li>
          </ul>
          <p className="text-[14px] text-slate-200 leading-[1.8] mt-3">To exercise any of these rights, contact us at <a href="mailto:hello@evrywher.io" className="text-indigo-400 hover:underline">hello@evrywher.io</a>. We will respond within 30 days.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Children&apos;s Privacy</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">Evrywher is not intended for use by children under 13. We do not knowingly collect personal data from children under 13. If we learn that we have collected data from a child under 13, we will delete it immediately.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Changes to This Policy</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8]">We may update this Privacy Policy from time to time. We will notify you of material changes via an in-app notification and by updating the &quot;Last updated&quot; date on this page. Continued use of the service after changes constitutes acceptance.</p>
        </section>

        <section className="mb-6">
          <h2 className="text-[18px] font-bold text-slate-100 mb-3">Contact Us</h2>
          <p className="text-[14px] text-slate-200 leading-[1.8] mb-3">For privacy-related questions, data requests, or concerns, contact us at:</p>
          <p className="text-[14px] text-slate-200 leading-[1.8]">TechDagger Studio (MS Dynamics LLC)<br />Email: <a href="mailto:hello@evrywher.io" className="text-indigo-400 hover:underline">hello@evrywher.io</a></p>
        </section>

        <footer className="border-t border-slate-700 pt-6 mt-10">
          <p className="text-[13px] text-slate-500">BizPocket and Evrywher are products of TechDagger Studio (MS Dynamics LLC).</p>
        </footer>
      </div>
    </div>
  );
}
