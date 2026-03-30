// BizPocket Icon System v1 — 12 custom feature icons
// Each icon is 40x40 with its own color identity

export function IconFireInvoice() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fia1" x1="10" y1="2" x2="30" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316"/><stop offset="1" stopColor="#EA580C"/>
        </linearGradient>
        <linearGradient id="fia2" x1="12" y1="30" x2="28" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FBBF24"/><stop offset="0.5" stopColor="#F97316"/><stop offset="1" stopColor="#DC2626"/>
        </linearGradient>
      </defs>
      <path d="M14 32c0 0 2 6 6 6s6-6 6-6c0 0-2 3-6 3s-6-3-6-3Z" fill="url(#fia2)" opacity="0.8"/>
      <path d="M16.5 33c0 0 1 4 3.5 4s3.5-4 3.5-4c0 0-1 2-3.5 2s-3.5-2-3.5-2Z" fill="#FDE68A"/>
      <rect x="10" y="4" width="20" height="28" rx="4" fill="url(#fia1)"/>
      <path d="M24 4v6h6" fill="#EA580C"/>
      <path d="M14.5 13h11" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
      <path d="M14.5 17h8" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      <path d="M14.5 21h9.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.4"/>
      <path d="M14.5 25h6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.3"/>
      <path d="M7 10h2M5 15h3M6 20h2.5" stroke="#FDBA74" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
      <circle cx="31" cy="8" r="4.5" fill="#16A34A"/>
      <path d="M29 8l1.5 1.5 3-3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconInvoiceTemplates() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="inv1" x1="6" y1="6" x2="30" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#818CF8"/><stop offset="1" stopColor="#4F46E5"/>
        </linearGradient>
      </defs>
      <rect x="5" y="8" width="18" height="24" rx="3" fill="#C7D2FE" opacity="0.5"/>
      <rect x="9" y="5" width="18" height="24" rx="3" fill="#A5B4FC" opacity="0.6"/>
      <rect x="13" y="2" width="18" height="24" rx="3" fill="url(#inv1)"/>
      <path d="M17 8h10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
      <path d="M17 12h7" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      <path d="M17 15.5h8.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.5"/>
      <path d="M17 19h5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity="0.35"/>
      <rect x="24" y="18" width="5" height="6" rx="1.5" fill="#E0E7FF" opacity="0.4"/>
    </svg>
  );
}

export function IconPocketChat() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="chat1" x1="3" y1="6" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#06B6D4"/><stop offset="1" stopColor="#0284C7"/>
        </linearGradient>
        <linearGradient id="chat2" x1="15" y1="14" x2="37" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5"/><stop offset="1" stopColor="#7C3AED"/>
        </linearGradient>
      </defs>
      <path d="M4 10a4 4 0 0 1 4-4h14a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H12l-5 4v-4H8a4 4 0 0 1-4-4v-8Z" fill="url(#chat1)"/>
      <path d="M14 15a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-1v3.5l-4.5-3.5H18a4 4 0 0 1-4-4v-7Z" fill="url(#chat2)"/>
      <circle cx="21" cy="18.5" r="1.3" fill="#fff"/><circle cx="25" cy="18.5" r="1.3" fill="#fff"/><circle cx="29" cy="18.5" r="1.3" fill="#fff"/>
    </svg>
  );
}

export function IconAIBriefing() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#FFF4E0"/>
      <rect x="16" y="16" width="26" height="34" rx="4" fill="#fff" stroke="#F0A830" strokeWidth="1.2"/>
      <rect x="21" y="24" width="16" height="2" rx="1" fill="#F0A830"/>
      <rect x="21" y="30" width="12" height="2" rx="1" fill="#F0A830" opacity="0.6"/>
      <rect x="21" y="36" width="14" height="2" rx="1" fill="#F0A830" opacity="0.35"/>
      <rect x="21" y="42" width="9" height="2" rx="1" fill="#F0A830" opacity="0.2"/>
      <path d="M48 22 L50.5 16 L53 22 L59 24.5 L53 27 L50.5 33 L48 27 L42 24.5 Z" fill="#F5A623"/>
      <path d="M38 42 L39.5 38 L41 42 L45 43.5 L41 45 L39.5 49 L38 45 L34 43.5 Z" fill="#F7BC5C"/>
      <circle cx="54" cy="38" r="1.8" fill="#F5A623" opacity="0.7"/>
      <circle cx="44" cy="15" r="1.2" fill="#F7BC5C" opacity="0.5"/>
    </svg>
  );
}

export function IconHealthScore() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="health1" x1="4" y1="5" x2="36" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981"/><stop offset="1" stopColor="#059669"/>
        </linearGradient>
      </defs>
      <rect x="3" y="6" width="34" height="28" rx="5" fill="url(#health1)"/>
      <path d="M6 22h5l3-8 4 16 3.5-10 3 6 3-5 3.5 3H37" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6 22h5l3-8 4 16 3.5-10 3 6 3-5 3.5 3H37" stroke="#A7F3D0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
      <circle cx="32" cy="11" r="3" fill="#34D399"/><circle cx="32" cy="11" r="1.5" fill="#fff"/>
    </svg>
  );
}

export function IconCashFlow() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#E6F9F0"/>
      <rect x="14" y="20" width="28" height="20" rx="4" fill="#34C77B"/>
      <text x="28" y="33" textAnchor="middle" dominantBaseline="central" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="600" fontSize="14" fill="#fff">$</text>
      <rect x="18" y="26" width="28" height="20" rx="4" fill="#2AB86A" opacity="0.45"/>
      <circle cx="50" cy="50" r="11" fill="#1FA85E"/>
      <path d="M45.5 50 A4.5 4.5 0 1 1 54.5 50" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
      <polygon points="54.5,47.5 56.8,50 54.5,52.5" fill="#fff"/>
      <path d="M54.5 50 A4.5 4.5 0 1 1 45.5 50" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round"/>
      <polygon points="45.5,52.5 43.2,50 45.5,47.5" fill="#fff"/>
    </svg>
  );
}

export function IconSnapVault() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sv1" x1="2" y1="8" x2="38" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2DD4BF"/><stop offset="1" stopColor="#0D9488"/>
        </linearGradient>
        <linearGradient id="sv_lens" x1="14" y1="16" x2="26" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="#134E4A"/><stop offset="0.5" stopColor="#0F766E"/><stop offset="1" stopColor="#14B8A6"/>
        </linearGradient>
        <radialGradient id="sv_glass" cx="20" cy="23" r="5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#5EEAD4" stopOpacity="0.6"/><stop offset="1" stopColor="#0D9488" stopOpacity="0"/>
        </radialGradient>
      </defs>
      <rect x="2" y="11" width="36" height="25" rx="5" fill="url(#sv1)"/>
      <path d="M13 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" fill="#0D9488"/>
      <rect x="15" y="6" width="10" height="5" rx="1.5" fill="#115E59"/>
      <circle cx="20" cy="24" r="10" fill="#115E59"/>
      <circle cx="20" cy="24" r="8.5" stroke="#2DD4BF" strokeWidth="1" opacity="0.3"/>
      <circle cx="20" cy="24" r="7" fill="url(#sv_lens)"/>
      <circle cx="20" cy="24" r="5" fill="#0F766E" stroke="#2DD4BF" strokeWidth="0.6" opacity="0.4"/>
      <circle cx="20" cy="24" r="3.5" fill="#14B8A6"/>
      <circle cx="20" cy="24" r="3.5" fill="url(#sv_glass)"/>
      <circle cx="18" cy="22" r="1.5" fill="#fff" opacity="0.5"/>
      <circle cx="31" cy="14.5" r="2" fill="#5EEAD4" opacity="0.7"/>
      <circle cx="31" cy="14.5" r="1" fill="#fff" opacity="0.6"/>
      <circle cx="8" cy="14.5" r="1.5" fill="#EF4444"/>
    </svg>
  );
}

export function IconWorldClock() {
  return (
    <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="64" height="64" rx="16" fill="#E6F1FB"/>
      <circle cx="28" cy="28" r="16" fill="#fff" stroke="#4A9BE8" strokeWidth="1.3"/>
      <line x1="12" y1="28" x2="44" y2="28" stroke="#4A9BE8" strokeWidth="0.9" opacity="0.5"/>
      <line x1="15" y1="21" x2="41" y2="21" stroke="#4A9BE8" strokeWidth="0.7" opacity="0.3"/>
      <line x1="15" y1="35" x2="41" y2="35" stroke="#4A9BE8" strokeWidth="0.7" opacity="0.3"/>
      <ellipse cx="28" cy="28" rx="7" ry="16" fill="none" stroke="#4A9BE8" strokeWidth="0.8" opacity="0.4"/>
      <circle cx="46" cy="46" r="13" fill="#fff" stroke="#185FA5" strokeWidth="1.5"/>
      <line x1="46" y1="35.5" x2="46" y2="38" stroke="#185FA5" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="46" y1="54" x2="46" y2="56.5" stroke="#185FA5" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="35.5" y1="46" x2="38" y2="46" stroke="#185FA5" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="54" y1="46" x2="56.5" y2="46" stroke="#185FA5" strokeWidth="1.2" strokeLinecap="round"/>
      <line x1="46" y1="46" x2="41" y2="39" stroke="#185FA5" strokeWidth="2" strokeLinecap="round"/>
      <line x1="46" y1="46" x2="52" y2="40" stroke="#185FA5" strokeWidth="1.4" strokeLinecap="round"/>
      <circle cx="46" cy="46" r="1.5" fill="#185FA5"/>
    </svg>
  );
}

export function IconAccountantPortal() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="acct1" x1="4" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6"/><stop offset="1" stopColor="#6D28D9"/>
        </linearGradient>
      </defs>
      <rect x="6" y="3" width="28" height="34" rx="4" fill="url(#acct1)"/>
      <rect x="10" y="8" width="20" height="4" rx="2" fill="#C4B5FD" opacity="0.3"/>
      <path d="M10 16h14" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <path d="M10 20h10" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
      <path d="M10 24h12" stroke="#DDD6FE" strokeWidth="1.5" strokeLinecap="round" opacity="0.35"/>
      <circle cx="30" cy="30" r="8" fill="#fff"/>
      <circle cx="30" cy="30" r="6.5" fill="#F5F3FF" stroke="#8B5CF6" strokeWidth="1.5"/>
      <circle cx="30" cy="28" r="2.5" fill="none" stroke="#6D28D9" strokeWidth="1.5"/>
      <path d="M25.5 34.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="#6D28D9" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export function IconPlanner() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="plan1" x1="4" y1="4" x2="36" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EC4899"/><stop offset="1" stopColor="#DB2777"/>
        </linearGradient>
      </defs>
      <rect x="4" y="6" width="32" height="30" rx="5" fill="url(#plan1)"/>
      <rect x="4" y="6" width="32" height="10" rx="5" fill="#BE185D"/>
      <path d="M12 3v6M28 3v6" stroke="#F9A8D4" strokeWidth="2.5" strokeLinecap="round"/>
      <path d="M4 16h32" stroke="#DB2777" strokeWidth="1"/>
      <rect x="8" y="19" width="6" height="5.5" rx="1.5" fill="#FDF2F8" opacity="0.3"/>
      <rect x="17" y="19" width="6" height="5.5" rx="1.5" fill="#FDF2F8" opacity="0.3"/>
      <rect x="26" y="19" width="6" height="5.5" rx="1.5" fill="#fff" opacity="0.9"/>
      <text x="29" y="23.5" fontSize="6" fontWeight="700" fill="#DB2777" fontFamily="DM Sans" textAnchor="middle">17</text>
      <rect x="8" y="27" width="6" height="5.5" rx="1.5" fill="#FDF2F8" opacity="0.2"/>
      <rect x="17" y="27" width="6" height="5.5" rx="1.5" fill="#FDF2F8" opacity="0.2"/>
      <text x="20" y="11.5" fontSize="7" fontWeight="700" fill="#fff" fontFamily="DM Sans" textAnchor="middle" opacity="0.9">MAR</text>
    </svg>
  );
}

export function IconCurrencies() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cur1" x1="2" y1="10" x2="22" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#16A34A"/><stop offset="1" stopColor="#15803D"/>
        </linearGradient>
        <linearGradient id="cur2" x1="16" y1="6" x2="38" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#4F46E5"/><stop offset="1" stopColor="#3730A3"/>
        </linearGradient>
        <linearGradient id="cur3" x1="10" y1="20" x2="30" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#DC2626"/><stop offset="1" stopColor="#B91C1C"/>
        </linearGradient>
      </defs>
      <circle cx="13" cy="18" r="11" fill="url(#cur1)"/>
      <text x="13" y="22" fontSize="12" fontWeight="700" fill="#fff" fontFamily="DM Sans" textAnchor="middle">$</text>
      <circle cx="27" cy="15" r="10" fill="url(#cur2)"/>
      <text x="27" y="19" fontSize="11" fontWeight="700" fill="#fff" fontFamily="DM Sans" textAnchor="middle">¥</text>
      <circle cx="22" cy="28" r="9" fill="url(#cur3)"/>
      <text x="22" y="32" fontSize="10" fontWeight="700" fill="#fff" fontFamily="DM Sans" textAnchor="middle">€</text>
      <circle cx="13" cy="18" r="11" stroke="#fff" strokeWidth="1.5" opacity="0.3"/>
      <circle cx="27" cy="15" r="10" stroke="#fff" strokeWidth="1.5" opacity="0.3"/>
      <circle cx="22" cy="28" r="9" stroke="#fff" strokeWidth="1.5" opacity="0.3"/>
    </svg>
  );
}

export function IconVoiceTranslation() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="voice1" x1="10" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F43F5E"/><stop offset="1" stopColor="#E11D48"/>
        </linearGradient>
      </defs>
      <rect x="13" y="3" width="14" height="20" rx="7" fill="url(#voice1)"/>
      <rect x="17" y="8" width="6" height="1.5" rx="0.75" fill="#fff" opacity="0.5"/>
      <rect x="16" y="11.5" width="8" height="1.5" rx="0.75" fill="#fff" opacity="0.4"/>
      <rect x="17.5" y="15" width="5" height="1.5" rx="0.75" fill="#fff" opacity="0.3"/>
      <path d="M8 19c0 6.6 5.4 12 12 12s12-5.4 12-12" stroke="#FDA4AF" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 31v4.5M15 35.5h10" stroke="#E11D48" strokeWidth="2.2" strokeLinecap="round"/>
      <path d="M33 8c2 1.5 3.5 4.5 3.5 7.5" stroke="#FCA5A5" strokeWidth="1.8" strokeLinecap="round" opacity="0.5"/>
      <path d="M31 10.5c1.2 1 2 2.8 2 4.8" stroke="#FCA5A5" strokeWidth="1.8" strokeLinecap="round" opacity="0.7"/>
      <circle cx="8" cy="8" r="4" fill="#FECDD3"/>
      <text x="8" y="10" fontSize="5" fontWeight="700" fill="#E11D48" fontFamily="DM Sans" textAnchor="middle">あ</text>
    </svg>
  );
}

// Feature data with icon references
export const FEATURES = [
  { key: 'fire-invoice', name: 'Fire Invoice', desc: 'Professional invoices in 60 seconds. Fire from anywhere. Share via chat, LINE, or WhatsApp.', Icon: IconFireInvoice },
  { key: 'invoice-templates', name: 'Invoice Templates', desc: '5 stunning templates — Classic, Modern, Japanese, Compact, and Export. Your brand, your style.', Icon: IconInvoiceTemplates },
  { key: 'pocketchat', name: 'PocketChat', desc: 'Real-time AI translation across 13 languages. Text, voice notes, photos, and documents.', Icon: IconPocketChat },
  { key: 'ai-briefing', name: 'AI Briefing', desc: 'Wake up to an AI-generated intelligence report on your business. Every single morning.', Icon: IconAIBriefing },
  { key: 'health-score', name: 'Business Health', desc: 'One number that tells you everything. Cash flow, receivables, risk — monitored 24/7 by AI.', Icon: IconHealthScore },
  { key: 'cash-flow', name: 'Cash Flow', desc: 'Every yen tracked. Income and expenses auto-categorized. Real balance in real time.', Icon: IconCashFlow },
  { key: 'snap-vault', name: 'Snap & Vault', desc: 'Point your camera. Snap. Instant PDF. Receipts, contracts, and documents — organized.', Icon: IconSnapVault },
  { key: 'world-clock', name: 'World Clock', desc: "Live time zones for every contact. Know if it's business hours in Dubai, Lagos, or LA.", Icon: IconWorldClock },
  { key: 'accountant-portal', name: 'Accountant Portal', desc: 'Read-only access for your accountant. Full visibility. Zero back-and-forth.', Icon: IconAccountantPortal },
  { key: 'planner', name: 'Smart Planner', desc: 'Payment deadlines, meetings, shipments, tax dates — AI reminds you before it\'s too late.', Icon: IconPlanner },
  { key: 'currencies', name: '16 Currencies', desc: 'JPY, USD, EUR, GBP, and 12 more. Auto-formatted, auto-converted. One tap to switch.', Icon: IconCurrencies },
  { key: 'voice-translation', name: 'Voice Translation', desc: 'Record a voice note in your language. Your contact hears it in theirs.', Icon: IconVoiceTranslation },
];
