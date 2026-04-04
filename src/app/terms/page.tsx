import { PocketMark } from '@/components/Logo';

export default function TermsPage() {
  const section = { marginBottom: 32 } as const;
  const h2 = { fontSize: 20, fontWeight: 700, margin: '0 0 12px', color: '#111827' } as const;
  const p = { fontSize: 15, color: '#4b5563', lineHeight: 1.8, margin: '0 0 12px' } as const;
  const li = { fontSize: 15, color: '#4b5563', lineHeight: 1.8, marginBottom: 6 } as const;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '60px 24px', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 20 }}><PocketMark variant="lg" /></div>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: '0 0 8px' }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: '#9ca3af', margin: '0 0 40px' }}>Last updated: April 4, 2026</p>

      <div style={section}>
        <h2 style={h2}>1. Acceptance of Terms</h2>
        <p style={p}>By accessing or using Evrywher, BizPocket, or any related services (&quot;the Service&quot;), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service. The Service is operated by TechDagger Studio (MS Dynamics LLC), Miami Beach, FL, USA.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>2. Description of Service</h2>
        <p style={p}>Evrywher is a multilingual messaging application with AI-powered real-time translation across 21 languages. BizPocket is a mobile-first business management platform that includes Evrywher as its messaging feature. Together, they provide translated messaging, invoicing, cash flow tracking, document management, and AI-powered business tools.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>3. Account Registration</h2>
        <p style={p}>You must be at least 16 years old to create an account. You are responsible for maintaining the security of your account credentials and for all activity under your account. You must provide accurate information during registration. Each account is linked to one organization. You may not create multiple accounts to circumvent plan limitations.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>4. Free and Paid Plans</h2>
        <p style={p}>Evrywher offers a free tier with the following limitations:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}>Limited number of AI translations per day</li>
          <li style={li}>Limited contact storage</li>
          <li style={li}>Basic features only</li>
        </ul>
        <p style={p}>Paid plans (Pro, Business, Enterprise) unlock additional features, higher limits, and priority support. All prices are listed in Japanese Yen (JPY). Paid subscriptions are billed monthly via Stripe. You can cancel at any time from your Settings page — cancellation takes effect at the end of the current billing period. No refunds are provided for partial months. Plan features and pricing may change with 30 days written notice.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>5. AI Translation Disclaimer</h2>
        <p style={p}>Evrywher uses AI-powered translation (Anthropic Claude) to translate text, voice messages, and calls between languages. While we strive for high accuracy, AI translations are not guaranteed to be 100% accurate. Translations should not be relied upon for:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}>Legal documents or contracts</li>
          <li style={li}>Medical or healthcare communications</li>
          <li style={li}>Financial or regulatory filings</li>
          <li style={li}>Any situation where mistranslation could cause significant harm</li>
        </ul>
        <p style={p}>For critical communications, use a certified human translator. We are not liable for errors, omissions, or misunderstandings arising from AI-generated translations.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>6. Acceptable Use</h2>
        <p style={p}>You agree not to use the Service to:</p>
        <ul style={{ ...p, paddingLeft: 20 }}>
          <li style={li}>Send spam, bulk messages, or unsolicited communications</li>
          <li style={li}>Transmit illegal, harmful, threatening, abusive, or harassing content</li>
          <li style={li}>Impersonate another person or entity</li>
          <li style={li}>Attempt to access other users&apos; data or accounts</li>
          <li style={li}>Reverse-engineer, decompile, or exploit the Service</li>
          <li style={li}>Use AI features to generate misleading, fraudulent, or deceptive content</li>
          <li style={li}>Violate any applicable laws or regulations</li>
          <li style={li}>Interfere with the operation or security of the Service</li>
        </ul>
        <p style={p}>We reserve the right to suspend or terminate accounts that violate these terms, without prior notice.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>7. User Content</h2>
        <p style={p}>You retain ownership of all content you create or upload (&quot;User Content&quot;), including messages, contacts, documents, and media. By using the Service, you grant us a limited license to process, store, and transmit your User Content solely for the purpose of providing the Service (including AI translation). We do not use your content for training AI models or for any purpose unrelated to delivering the Service to you.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>8. Intellectual Property</h2>
        <p style={p}>The Service, including its design, code, branding, logos, and features, is the property of TechDagger Studio. You may not copy, modify, distribute, or create derivative works based on the Service without written permission. &quot;Evrywher,&quot; &quot;BizPocket,&quot; &quot;Fire Invoice,&quot; and associated marks are trademarks of TechDagger Studio.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>9. Service Availability</h2>
        <p style={p}>The Service is provided &quot;as is&quot; and &quot;as available.&quot; We do not guarantee uninterrupted or error-free operation. We may perform maintenance, updates, or modifications that temporarily affect availability. We will make reasonable efforts to notify users of planned downtime in advance.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>10. Limitation of Liability</h2>
        <p style={p}>To the maximum extent permitted by law, TechDagger Studio (MS Dynamics LLC) shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service, including but not limited to lost revenue, lost data, business interruption, or translation errors. Our total liability for any claim related to the Service is limited to the amount you paid us in the 12 months preceding the claim, or $100 USD, whichever is greater.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>11. Indemnification</h2>
        <p style={p}>You agree to indemnify and hold harmless TechDagger Studio, its officers, employees, and affiliates from any claims, damages, or expenses arising from your use of the Service, your violation of these terms, or your violation of any third-party rights.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>12. Account Termination</h2>
        <p style={p}>You may delete your account at any time by contacting <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a>. We may suspend or terminate your account if you violate these terms or if your account has been inactive for more than 12 months. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>13. Dispute Resolution</h2>
        <p style={p}>Any disputes arising from or relating to the Service shall first be attempted to be resolved informally by contacting us at <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a>. If informal resolution fails within 30 days, disputes shall be resolved through binding arbitration administered under the rules of the American Arbitration Association. The arbitration shall be conducted in English. Each party shall bear its own costs. Class action claims are waived to the extent permitted by law.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>14. Governing Law</h2>
        <p style={p}>These terms are governed by the laws of the State of Florida, USA, without regard to conflict of law principles. For users in the European Union, nothing in these terms affects your rights under mandatory EU consumer protection laws.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>15. Changes to These Terms</h2>
        <p style={p}>We may update these Terms from time to time. We will notify you of material changes by posting the updated terms on this page and updating the &quot;Last updated&quot; date. Continued use of the Service after changes constitutes acceptance of the updated terms. If you disagree with changes, you may close your account.</p>
      </div>

      <div style={section}>
        <h2 style={h2}>16. Contact</h2>
        <p style={p}>For questions about these terms, contact us at:</p>
        <p style={p}>TechDagger Studio (MS Dynamics LLC)<br />Email: <a href="mailto:hello@evrywher.io" style={{ color: '#4F46E5', textDecoration: 'none' }}>hello@evrywher.io</a></p>
      </div>

      <footer style={{ borderTop: '1px solid #e5e7eb', paddingTop: 24, marginTop: 40 }}>
        <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>BizPocket and Evrywher are products of TechDagger Studio (MS Dynamics LLC).</p>
      </footer>
    </div>
  );
}
