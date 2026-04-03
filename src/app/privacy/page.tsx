export default function PrivacyPage() {
  const section = { marginBottom: 32 } as const;
  const h2 = { fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#111827' } as const;
  const p = { fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 12px' } as const;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 40px' }}>Last updated: April 3, 2026</p>

      <div style={section}>
        <h2 style={h2}>Information We Collect</h2>
        <p style={p}>When you create an account, we collect your email address, name, and business information you provide. When you use PocketChat, we store messages, translations, and voice recordings you create. We also collect usage data such as pages visited and features used to improve our service.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>How We Use Your Information</h2>
        <p style={p}>We use your information to provide and improve BizPocket and PocketChat services, process invoices and payments, translate messages between languages, generate AI-powered business insights, and communicate service updates. We do not sell your personal data to third parties.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Data Storage</h2>
        <p style={p}>Your data is stored securely on Supabase servers located in Tokyo, Japan (ap-northeast-1). All data is encrypted in transit (TLS 1.2+) and at rest. Row-level security (RLS) ensures that each organization can only access its own data. Database backups are performed daily.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Voice Data</h2>
        <p style={p}>When you use voice features in PocketChat, voice recordings are processed by ElevenLabs for voice cloning and translation. Voice samples you provide for cloning are stored securely and used only to generate translations in your voice. You can delete your voice clone at any time from your settings.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Third-Party Services</h2>
        <p style={p}>BizPocket uses the following third-party services to operate:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li><strong>Supabase</strong> — Database, authentication, and file storage (Tokyo region)</li>
          <li><strong>Vercel</strong> — Application hosting and deployment</li>
          <li><strong>Stripe</strong> — Payment processing for subscriptions</li>
          <li><strong>Anthropic Claude</strong> — AI translations, business briefings, and document analysis</li>
          <li><strong>ElevenLabs</strong> — Voice cloning and text-to-speech</li>
        </ul>
        <p style={p}>Each service has its own privacy policy and data handling practices. We only share the minimum data required for each service to function.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Your Rights</h2>
        <p style={p}>You have the right to access, correct, or delete your personal data at any time. You can export your data from the Settings page. To delete your account and all associated data, contact us at the email below. We will process deletion requests within 30 days.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Contact</h2>
        <p style={p}>For privacy-related questions or requests, contact us at <a href="mailto:privacy@bizpocket.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>privacy@bizpocket.io</a>.</p>
      </div>

      <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginTop: 40 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>BizPocket and PocketChat are products of TechDagger Studio. Registered in Japan.</p>
      </footer>
    </div>
  );
}
