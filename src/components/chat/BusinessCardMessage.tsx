'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import GlassCard from '@/components/ui/GlassCard';
import PocketAvatar from '@/components/ui/PocketAvatar';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';
import type { Tier } from '@/lib/tier-system';
import type { BadgeTier } from '@/lib/trust-score';

interface BusinessCardMessageProps {
  card?: {
    display_name: string;
    title?: string;
    company?: string;
    avatar_url?: string;
    city?: string;
    countries?: { flag: string; code: string }[];
    tier: Tier;
    badge: BadgeTier;
    trust_score: number;
    services?: string[];
    deal_count?: number;
    languages?: string[];
    compliance?: { flag: string; label: string; verified: boolean }[];
  };
  timestamp: string;
  isSelf?: boolean;
  onRequestQuote?: () => void;
  onSendInvoice?: () => void;
  /** @deprecated Use card prop */
  cardData?: any;
  /** @deprecated Use isSelf */
  isOwner?: boolean;
}

export default function BusinessCardMessage({
  card,
  timestamp,
  isSelf,
  onRequestQuote,
  onSendInvoice,
  cardData,
  isOwner,
}: BusinessCardMessageProps) {
  const router = useRouter();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState('');

  // Backward compat: resolve from card or cardData
  const raw = card || cardData;
  if (!raw) return null;

  const self = isSelf ?? isOwner ?? false;
  const tier = (raw.tier || 'starter') as Tier;
  const badge = (raw.badge || raw.badge_tier || 'none') as BadgeTier;
  const trustScore: number = raw.trust_score || 20;
  const displayName: string = raw.display_name || 'Business Professional';
  const title: string = raw.title || '';
  const company: string = raw.company || raw.company_name || '';
  const city: string = raw.city || '';
  const avatarUrl: string | undefined = raw.avatar_url;
  const services: string[] = (raw.services || []).slice(0, 3);
  const dealCount: number = raw.deal_count || raw.deals || 0;
  const languages: string[] = raw.languages || [];
  const compliance: { flag: string; label: string; verified: boolean }[] = raw.compliance || [];
  const countries: { flag: string; code: string }[] = raw.countries || [];
  const corridors = raw.operating_corridors || [];
  const isVerified = badge === 'id_verified';

  function handleRequestQuote() {
    if (onRequestQuote) {
      onRequestQuote();
    } else {
      setShowQuoteForm(true);
    }
  }

  function handleSendInvoice() {
    if (onSendInvoice) {
      onSendInvoice();
    } else {
      router.push('/invoices/new');
    }
  }

  // Card styling for id_verified
  const verifiedStyle: React.CSSProperties | undefined = isVerified
    ? { border: '2px solid', borderColor: 'var(--tier-established-border, #A7F3D0)', boxShadow: '0 0 16px rgba(16,185,129,0.25)' }
    : undefined;
  const verifiedClass = isVerified ? 'animate-[badgePulse_4s_infinite]' : '';

  return (
    <div className={`flex ${self ? 'justify-end' : 'justify-start'}`}>
      <div className="w-[85%] max-w-[340px] space-y-1">
        {!self && raw.sender_name && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">{raw.sender_name}</p>
        )}

        <div className={verifiedClass}>
          <GlassCard tier={isVerified ? 'established' : undefined} style={verifiedStyle}>
            <div className="space-y-3">
              {/* 1. Country flags */}
              {countries.length > 0 && (
                <div className="flex items-center gap-1 text-sm">
                  {countries.map((c, i) => (
                    <span key={i}>{c.flag}</span>
                  ))}
                </div>
              )}

              {/* Corridor header (backward compat) */}
              {corridors.length > 0 && countries.length === 0 && (
                <div className="text-center">
                  <span className="text-xs text-indigo-600 dark:text-indigo-400">
                    {corridors.map((c: any) => `${c.flag_from} \u2194 ${c.flag_to}`).join(' \u00B7 ')}
                  </span>
                </div>
              )}

              {/* 2. Profile */}
              <div className="flex items-center gap-3">
                <PocketAvatar
                  src={avatarUrl}
                  name={displayName}
                  size="md"
                  tier={tier}
                  badge={badge}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-[var(--pm-text-primary)] truncate">{displayName}</span>
                    <TierBadge tier={tier} size="sm" />
                  </div>
                  {title && <p className="text-[11px] text-[var(--pm-text-secondary)] truncate">{title}</p>}
                  {company && <p className="text-[10px] text-[var(--pm-text-tertiary)] truncate">{company}</p>}
                  {city && <p className="text-[10px] text-[var(--pm-text-tertiary)]">{city}</p>}
                </div>
              </div>

              {/* 3. Services */}
              {services.length > 0 && (
                <p className="text-xs text-[var(--pm-text-secondary)]">
                  {'\u{1F4BC}'} {services.join(' \u00B7 ')}
                </p>
              )}

              {/* 4. Trust box */}
              <div className="bg-indigo-50/80 dark:bg-indigo-950/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{'\u{1F6E1}\uFE0F'}</span>
                  <span className="text-xs text-[var(--pm-text-secondary)]">Trust:</span>
                  <span
                    className="text-sm font-bold text-[var(--pm-text-primary)]"
                    style={{ fontFamily: 'var(--font-display), sans-serif' }}
                  >
                    {trustScore}
                  </span>
                </div>
                <TrustScoreBar score={trustScore} tier={tier} size="sm" />
                <div className="flex items-center gap-1.5">
                  <TierBadge tier={tier} size="sm" />
                  {badge !== 'none' && (
                    <span className="text-[10px] text-[var(--pm-text-tertiary)]">
                      {badge === 'id_verified' ? '\u{1F7E2} ID Verified' : '\u{1F535} Activity Verified'}
                    </span>
                  )}
                </div>
              </div>

              {/* 5. Stats */}
              <div className="flex items-center gap-3 text-[10px] text-[var(--pm-text-tertiary)]">
                {dealCount > 0 && <span>{'\u2705'} {dealCount} deal{dealCount !== 1 ? 's' : ''}</span>}
                {languages.length > 0 && <span>{'\u{1F310}'} {languages.slice(0, 3).join(', ')}</span>}
              </div>

              {/* 6. Compliance badges */}
              {compliance.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {compliance.map((c, i) => (
                    <span key={i} className="text-[10px] text-[var(--pm-text-secondary)]">
                      {c.flag} {c.label} {c.verified ? '\u2713' : '\u2026'}
                    </span>
                  ))}
                </div>
              )}

              {/* 7. Action buttons */}
              {!self && (
                <div className="flex gap-2">
                  <button
                    onClick={handleRequestQuote}
                    className="flex-1 h-9 rounded-[20px] text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-[0.97] transition-all duration-200"
                  >
                    Request Quote
                  </button>
                  <button
                    onClick={handleSendInvoice}
                    className="flex-1 h-9 rounded-[20px] text-xs font-semibold text-indigo-600 dark:text-indigo-400 border-2 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:scale-[0.97] transition-all duration-200"
                  >
                    Send Invoice
                  </button>
                </div>
              )}

              {/* Quote form (backward compat) */}
              {showQuoteForm && (
                <div className="space-y-2">
                  <input
                    value={quoteText}
                    onChange={(e) => setQuoteText(e.target.value)}
                    placeholder="What do you need a quote for?"
                    className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 text-[var(--pm-text-primary)] focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      if (raw.onQuoteRequest && quoteText.trim()) {
                        raw.onQuoteRequest(quoteText.trim());
                        setQuoteText('');
                        setShowQuoteForm(false);
                      }
                    }}
                    disabled={!quoteText.trim()}
                    className="w-full h-9 rounded-[20px] text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    Send Quote Request
                  </button>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[var(--pm-text-tertiary)]">Shared via Evrywher</span>
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Timestamp */}
        <p className={`text-[11px] text-gray-400 ${self ? 'text-right' : 'text-left'}`}>
          {timestamp}{self && ' \u2713\u2713'}
        </p>
      </div>
    </div>
  );
}
