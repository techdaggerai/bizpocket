import { PocketMark } from '@/components/Logo';

export default function PrivacyPage() {
  const section = { marginBottom: 32 } as const;
  const h2 = { fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#111827' } as const;
  const p = { fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 12px' } as const;
  const li = { fontSize: 15, color: '#4b5563', lineHeight: 1.8, marginBottom: 6 } as const;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}><PocketMark variant="lg" /></div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 40px' }}>Last updated: April 4, 2026</p>

      <div style={section}>
        <h2 style={h2}>Who We Are</h2>
        <p style={p}>Evrywher and BizPocket are products of TechDagger Studio, operated by MS Dynamics LLC, Miami Beach, FL, USA. This policy applies to the Evrywher mobile app, web app, and all related services.</p>
        <p style={p}>Contact: <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a></p>
      </div>

      <div style={section}>
        <h2 style={h2}>Information We Collect</h2>
        <p style={p}>We collect the following personal data when you use Evrywher:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}><strong>Account information</strong> — email address and display name you provide at signup</li>
          <li style={li}><strong>Messages</strong> — text messages, voice messages, and media you send through the app</li>
          <li style={li}><strong>Contacts</strong> — contact names, phone numbers, and metadata you add to your contact list</li>
          <li style={li}><strong>Translations</strong> — translated versions of your messages stored for instant retrieval</li>
          <li style={li}><strong>Voice data</strong> — voice recordings used for voice messaging and optional voice cloning</li>
          <li style={li}><strong>Usage data</strong> — pages visited, features used, device type, and IP address for analytics and service improvement</li>
        </ul>
        <p style={p}>We do not collect location data, phone contacts, or camera/microphone data beyond what you explicitly provide through app features.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>How We Use Your Information</h2>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}>Provide real-time AI translation of messages between 21 languages</li>
          <li style={li}>Deliver and store messages between you and your contacts</li>
          <li style={li}>Generate AI-powered features (bot responses, business briefings, document detection)</li>
          <li style={li}>Process payments for paid subscription plans</li>
          <li style={li}>Send service-related notifications (not marketing)</li>
          <li style={li}>Improve the quality and accuracy of translations</li>
        </ul>
        <p style={p}><strong>We do not sell your personal data to third parties.</strong> We do not use your data for advertising or profiling.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>AI Processing and Translation</h2>
        <p style={p}>When you send a message that requires translation, the message text is sent to Anthropic&apos;s Claude API for processing. Anthropic processes the text to generate a translation and does not retain your data for training purposes. Translated text is stored in our database so you can view it instantly on future visits.</p>
        <p style={p}>Voice messages may be processed by ElevenLabs for voice cloning and text-to-speech features. Voice samples are stored securely and used only to generate translations in your voice. You can delete your voice clone at any time from Settings.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Data Storage and Security</h2>
        <p style={p}>Your data is stored on Supabase servers in Tokyo, Japan (ap-northeast-1 region). All data is encrypted in transit using HTTPS/TLS 1.2+ and encrypted at rest. Row-level security (RLS) ensures each user can only access their own data. Database backups are performed daily.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Third-Party Services</h2>
        <p style={p}>We use the following third-party services:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}><strong>Supabase</strong> — database, authentication, and file storage (Tokyo, Japan)</li>
          <li style={li}><strong>Vercel</strong> — application hosting and deployment</li>
          <li style={li}><strong>Stripe</strong> — payment processing for subscriptions</li>
          <li style={li}><strong>Anthropic Claude</strong> — AI translation and assistant features</li>
          <li style={li}><strong>ElevenLabs</strong> — voice cloning and text-to-speech</li>
        </ul>
        <p style={p}>We share only the minimum data required for each service to function. Each service operates under its own privacy policy.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Data Retention</h2>
        <p style={p}>We retain your account data and messages for as long as your account is active. If you delete your account, all personal data including messages, contacts, translations, and voice data will be permanently deleted within 30 days. Anonymized usage statistics may be retained for service improvement.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Your Rights</h2>
        <p style={p}>Under the EU General Data Protection Regulation (GDPR) and Japan&apos;s Act on the Protection of Personal Information (APPI), you have the right to:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}><strong>Access</strong> — request a copy of your personal data</li>
          <li style={li}><strong>Rectification</strong> — correct inaccurate personal data</li>
          <li style={li}><strong>Erasure</strong> — request deletion of your personal data and account</li>
          <li style={li}><strong>Portability</strong> — export your data in a machine-readable format</li>
          <li style={li}><strong>Restriction</strong> — limit processing of your personal data</li>
          <li style={li}><strong>Objection</strong> — object to processing of your personal data</li>
        </ul>
        <p style={p}>To exercise any of these rights, contact us at <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a>. We will respond within 30 days.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Account Deletion</h2>
        <p style={p}>You can request deletion of your account and all associated data at any time by contacting <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a>. Upon request, we will permanently delete your account, profile, messages, contacts, translations, voice data, and any uploaded files within 30 days. This action is irreversible.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Children&apos;s Privacy</h2>
        <p style={p}>Evrywher is not intended for use by children under 16. We do not knowingly collect personal data from children. If we learn that we have collected data from a child under 16, we will delete it immediately.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Changes to This Policy</h2>
        <p style={p}>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the &quot;Last updated&quot; date. Continued use of the service after changes constitutes acceptance.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>Contact Us</h2>
        <p style={p}>For privacy-related questions, data requests, or concerns, contact us at:</p>
        <p style={p}>TechDagger Studio (MS Dynamics LLC)<br />Email: <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a></p>
      </div>

      <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginTop: 40 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>BizPocket and Evrywher are products of TechDagger Studio (MS Dynamics LLC).</p>
      </footer>
    </div>
  );
}
