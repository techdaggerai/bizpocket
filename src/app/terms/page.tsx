import { PocketMark } from '@/components/Logo';

export default function TermsPage() {
  const section = { marginBottom: 32 } as const;
  const h2 = { fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#111827' } as const;
  const p = { fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 12px' } as const;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}><PocketMark variant="lg" /></div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 40px' }}>Last updated: April 3, 2026</p>

      <div style={section}>
        <h2 style={h2}>Acceptance of Terms</h2>
        <p style={p}>By accessing or using BizPocket and Evrywyre, you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use our services. We may update these terms from time to time, and continued use constitutes acceptance of any changes.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Description of Service</h2>
        <p style={p}>BizPocket is a mobile-first business management platform designed for foreigners running businesses in Japan. Evrywyre is our built-in multilingual messenger with real-time AI translation. Together, they provide invoicing, cash flow tracking, expense management, document storage, AI-powered business insights, and translated communication across 21 languages.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Account Registration</h2>
        <p style={p}>You must be at least 18 years old to create an account. You are responsible for maintaining the security of your account credentials. Each account is linked to one organization. You must provide accurate business information during registration.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Subscription and Payments</h2>
        <p style={p}>BizPocket offers free and paid subscription plans. All prices are listed in Japanese Yen (JPY). Paid subscriptions are billed monthly via Stripe. You can cancel your subscription at any time from your Settings page — cancellation takes effect at the end of the current billing period. No refunds are provided for partial months. Plan features and pricing may change with 30 days notice.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>AI Translation Disclaimer</h2>
        <p style={p}>Evrywyre uses AI-powered translation (Anthropic Claude) to translate text, voice messages, and live calls between languages. While we strive for accuracy, AI translations are not 100% accurate and should not be relied upon for legal documents, medical communications, financial contracts, or any situation where mistranslation could cause harm. For critical communications, please use a certified human translator.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Acceptable Use</h2>
        <p style={p}>You agree not to use BizPocket or Evrywyre to send spam or unsolicited messages, transmit illegal or harmful content, impersonate others, attempt to access other users&apos; data, reverse-engineer or exploit our systems, or use AI features to generate misleading or fraudulent content. We reserve the right to suspend accounts that violate these terms.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Limitation of Liability</h2>
        <p style={p}>BizPocket and Evrywyre are provided &quot;as is&quot; without warranties of any kind. TechDagger Studio is not liable for any indirect, incidental, or consequential damages arising from your use of the service, including but not limited to lost revenue, data loss, or business interruption. Our total liability is limited to the amount you paid for the service in the 12 months preceding the claim.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Contact</h2>
        <p style={p}>For questions about these terms, contact us at <a href="mailto:support@bizpocket.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>support@bizpocket.io</a>.</p>
      </div>

      <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginTop: 40 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>BizPocket and Evrywyre are products of TechDagger Studio. Registered in Japan.</p>
      </footer>
    </div>
  );
}
