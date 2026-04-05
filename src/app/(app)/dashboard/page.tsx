'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { useSearchParams } from 'next/navigation';
import { formatCurrency, getGreeting, getCurrentMonth, formatDateShort } from '@/lib/utils';
import GlobalSearch from '@/components/GlobalSearch';
import HealthScore from '@/components/HealthScore';
import Link from 'next/link';
import type { CashFlow, Invoice } from '@/types/database';
import dynamic from 'next/dynamic';
import GlassCard from '@/components/ui/GlassCard';
import TierBadge from '@/components/profile/TierBadge';
import TrustScoreBar from '@/components/profile/TrustScoreBar';
import CorridorBadge from '@/components/profile/CorridorBadge';
import MagicFAB from '@/components/ui/MagicFAB';
import GrowthCompanion from '@/components/ui/GrowthCompanion';
import type { Tier } from '@/lib/tier-system';
const PocketChatQR = dynamic(() => import('@/components/PocketChatQR'), { ssr: false });

const BRIEFING_CACHE_KEY = 'bizpocket_ai_briefing';
const BRIEFING_TTL = 4 * 60 * 60 * 1000; // 4 hours

interface CachedBriefing {
  text: string;
  ownerName: string;
  timestamp: number;
  orgId: string;
}

function getCachedBriefing(orgId: string): CachedBriefing | null {
  try {
    const raw = localStorage.getItem(BRIEFING_CACHE_KEY);
    if (!raw) return null;
    const cached: CachedBriefing = JSON.parse(raw);
    if (cached.orgId !== orgId) return null;
    if (Date.now() - cached.timestamp > BRIEFING_TTL) return null;
    return cached;
  } catch {
    return null;
  }
}

function setCachedBriefing(text: string, ownerName: string, orgId: string) {
  try {
    const data: CachedBriefing = { text, ownerName, timestamp: Date.now(), orgId };
    localStorage.setItem(BRIEFING_CACHE_KEY, JSON.stringify(data));
  } catch {}
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/`(.*?)`/g, '$1')
    .trim();
}

export default function DashboardPage() {
  const { user, profile, organization } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [supabase] = useState(() => createClient());

  // Show upgrade success toast
  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') {
      toast('Plan upgraded successfully!', 'success');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawName = (profile as any).full_name || user.user_metadata?.full_name || profile.name || '';
  const firstName = rawName.split(' ')[0] || user.email?.split('@')[0] || '';

  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [hasGlobalProfile, setHasGlobalProfile] = useState<boolean | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [activeCycle, setActiveCycle] = useState<{ id: string; name: string; business_type: string } | null>(null);
  const [cycleStages, setCycleStages] = useState<{ name: string; color: string; stage_order: number }[]>([]);
  const [cycleItemCount, setCycleItemCount] = useState(0);
  const [globalProfile, setGlobalProfile] = useState<any>(null);
  const [actionsToday, setActionsToday] = useState(0);

  const DEFAULT_CLOCKS = [
    { flag: '\u{1F1EF}\u{1F1F5}', city: 'Tokyo', tz: 'Asia/Tokyo' },
    { flag: '\u{1F1F5}\u{1F1F0}', city: 'Karachi', tz: 'Asia/Karachi' },
    { flag: '\u{1F1E6}\u{1F1EA}', city: 'Dubai', tz: 'Asia/Dubai' },
    { flag: '\u{1F1EC}\u{1F1E7}', city: 'London', tz: 'Europe/London' },
    { flag: '\u{1F1FA}\u{1F1F8}', city: 'New York', tz: 'America/New_York' },
    { flag: '\u{1F1E8}\u{1F1F3}', city: 'Shanghai', tz: 'Asia/Shanghai' },
  ];

  const month = getCurrentMonth();
  const currency = organization.currency || 'JPY';

  // Auto-generate slug for existing orgs that don't have one
  useEffect(() => {
    try {
      if (!(organization as Record<string, unknown>).slug && organization.name) {
        const slug = organization.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').substring(0, 50) || 'my-business';
        supabase.from('organizations').update({ slug }).eq('id', organization.id).then(() => {});
      }
    } catch { /* ignore slug generation errors */ }
  }, [organization.id]); // eslint-disable-line

  const fetchBriefing = useCallback(async () => {
    const cached = getCachedBriefing(organization.id);
    if (cached) { setBriefing(cached.text); setBriefingLoading(false); return; }
    setBriefingLoading(true);
    try {
      const res = await fetch('/api/ai/briefing', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId: organization.id }) });
      const data = await res.json();
      if (data.briefing) { setBriefing(data.briefing); setCachedBriefing(data.briefing, data.ownerName || firstName, organization.id); }
    } catch {}
    setBriefingLoading(false);
  }, [organization.id, firstName]);

  useEffect(() => { const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const [flowRes, invRes, evtRes] = await Promise.all([
        supabase.from('cash_flows').select('*').eq('organization_id', organization.id).gte('date', month + '-01').lt('date', (() => { const [y,m] = month.split('-'); return new Date(Number(y), Number(m), 1).toISOString().slice(0, 10); })()).order('date', { ascending: false }),
        supabase.from('invoices').select('*').eq('organization_id', organization.id).neq('status', 'paid'),
        supabase.from('planner_events').select('*').eq('organization_id', organization.id).gte('event_date', today).lte('event_date', nextWeek).eq('status', 'pending').order('event_date', { ascending: true }).limit(3),
      ]);
      setFlows(flowRes.data || []); setInvoices(invRes.data || []); setUpcomingEvents(evtRes.data || []);
      const { data: cycleData } = await supabase.from('business_cycles').select('id, name, business_type').eq('organization_id', organization.id).eq('is_active', true).limit(1).maybeSingle();
      if (cycleData) {
        setActiveCycle(cycleData);
        const { data: stages } = await supabase.from('cycle_stages').select('name, color, stage_order').eq('cycle_id', cycleData.id).order('stage_order', { ascending: true });
        setCycleStages(stages || []);
        const { count } = await supabase.from('cycle_items').select('id', { count: 'exact', head: true }).eq('cycle_id', cycleData.id).eq('status', 'active');
        setCycleItemCount(count || 0);
      } else { setActiveCycle(null); setCycleStages([]); setCycleItemCount(0); }
      setLoading(false);
    }
    load(); fetchBriefing();
    // Check for global profile
    fetch('/api/profile/me').then(r => r.json()).then(d => { setHasGlobalProfile(!!d.profile); if (d.profile) setGlobalProfile(d.profile); }).catch(() => setHasGlobalProfile(false));
    // Count today's actions for energy meter
    const todayStr = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from('messages').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).gte('created_at', todayStr),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).gte('created_at', todayStr),
      supabase.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', organization.id).gte('created_at', todayStr),
    ]).then(([msgs, invs, docs]) => {
      setActionsToday((msgs.count || 0) + (invs.count || 0) + (docs.count || 0));
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id, month, fetchBriefing]);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const balance = totalIn - totalOut;
  const unpaidTotal = invoices.reduce((s, inv) => s + inv.total, 0);
  const recentFlows = flows.slice(0, 5);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;
  const profileIncomplete = !org.address || !org.phone || !org.bank_name || !org.bank_account_number;

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>;

  return (
    <div className="space-y-6 py-6">
      <GlobalSearch />

      {/* Greeting */}
      {(() => {
        const hour = new Date().getHours();
        const greeting = hour >= 5 && hour < 12 ? 'Good morning' : hour >= 12 && hour < 17 ? 'Good afternoon' : hour >= 17 && hour < 21 ? 'Good evening' : 'Working late';
        const emoji = hour >= 5 && hour < 12 ? '\u2600\uFE0F' : hour >= 12 && hour < 17 ? '\u{1F324}\uFE0F' : hour >= 17 && hour < 21 ? '\u{1F305}' : '\u{1F319}';
        const jaGreeting = hour >= 5 && hour < 12 ? '\u304A\u306F\u3088\u3046\u3054\u3056\u3044\u307E\u3059' : hour >= 12 && hour < 17 ? '\u3053\u3093\u306B\u3061\u306F' : hour >= 17 && hour < 21 ? '\u3053\u3093\u3070\u3093\u306F' : '\u304A\u75B2\u308C\u69D8\u3067\u3059';
        const showJa = profile?.country === 'JP' || (profile?.languages || []).includes('ja');
        return (
          <div>
            <h1 className="text-2xl text-[var(--pm-text-primary)]" style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 600 }}>
              {greeting}{firstName ? `, ${firstName}` : ''} {emoji}
            </h1>
            {showJa && <p className="text-sm text-[var(--pm-text-tertiary)] mt-0.5">{jaGreeting}</p>}
            <p className="text-sm text-[var(--pm-text-tertiary)] mt-0.5">{organization.name} {'\u00B7'} {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
        );
      })()}

      {/* Pocket Pulse Hero */}
      {globalProfile && (() => {
        const tier = (globalProfile.tier || 'starter') as Tier;
        const trustScore = globalProfile.trust_score || 0;
        const maxScore = tier === 'starter' ? 40 : tier === 'growing' ? 75 : 100;
        const pct = Math.min(100, (trustScore / maxScore) * 100);
        const energyLevel = actionsToday < 3 ? 'low' : actionsToday < 7 ? 'medium' : 'high';
        const energyLabel = energyLevel === 'low' ? 'Take it easy' : energyLevel === 'medium' ? 'Building momentum' : 'On fire! \u26A1';
        const energyColor = energyLevel === 'low' ? 'bg-gray-300' : energyLevel === 'medium' ? 'bg-amber-500' : 'bg-emerald-500';
        const energyPct = Math.min(100, (actionsToday / 10) * 100);
        const corridors = globalProfile.operating_corridors || [];
        const nextTierLabel = tier === 'starter' ? '\u{1F33F} Growing' : tier === 'growing' ? '\u{1F333} Established' : null;
        const nextTierMax = tier === 'starter' ? 40 : tier === 'growing' ? 75 : 100;

        const quickActions = tier === 'starter'
          ? [{ emoji: '\u{1F4F7}', label: '+2', href: '/settings' }, { emoji: '\u{1F4F1}', label: '+2', href: '/settings/business-setup' }, { emoji: '\u{1F9FE}', label: '+3', href: '/invoices/new' }, { emoji: '\u{1F4B0}', label: '+5', href: '/invoices/new' }]
          : tier === 'growing'
          ? [{ emoji: '\u{1F91D}', label: 'Match', href: '/opportunities' }, { emoji: '\u{1F9FE}', label: 'Status', href: '/invoices/new' }, { emoji: '\u{1F3F7}\uFE0F', label: '+3', href: '/settings/business-setup' }, { emoji: '\u{1F4E4}', label: 'Invite', href: '/invite' }]
          : [{ emoji: '\u{1F91D}', label: 'Deals', href: '/opportunities' }, { emoji: '\u{1F9FE}', label: 'Revenue', href: '/cash-flow' }, { emoji: '\u{1F4E4}', label: 'Network', href: '/invite' }, { emoji: '\u{1F6E1}\uFE0F', label: 'Verify', href: '/verification' }];

        return (
          <GlassCard tier={tier} glow>
            <div className="space-y-3">
              {/* Trust ring + info */}
              <div className="flex items-center gap-4">
                <div className="relative" style={{ width: 56, height: 56 }}>
                  <svg width="56" height="56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-gray-700" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 24} strokeDashoffset={2 * Math.PI * 24 * (1 - pct / 100)}
                      className={tier === 'starter' ? 'text-amber-500' : tier === 'growing' ? 'text-blue-500' : 'text-emerald-500'}
                      transform="rotate(-90 28 28)"
                      style={{ transition: 'stroke-dashoffset 1200ms var(--ease-out)' }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-base font-bold text-[var(--pm-text-primary)]" style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700 }}>
                    {trustScore}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="text-xs text-[var(--pm-text-tertiary)] uppercase tracking-wide font-semibold">Trust Score</p>
                  <TierBadge tier={tier} size="sm" />
                </div>
              </div>

              {/* Energy meter */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[var(--pm-text-secondary)]">{energyLabel}</span>
                  <span className="text-[10px] text-[var(--pm-text-tertiary)]">{actionsToday} action{actionsToday !== 1 ? 's' : ''} today</span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                  <div className={`h-full rounded-full ${energyColor} transition-[width] duration-[1200ms] [transition-timing-function:var(--ease-out)]`} style={{ width: `${energyPct}%` }} />
                </div>
              </div>

              {/* Next milestone */}
              {nextTierLabel && (
                <p className="text-sm text-[var(--pm-text-secondary)]">
                  Next: {nextTierLabel} ({trustScore}/{nextTierMax})
                </p>
              )}

              {/* Quick action chips */}
              <div className="flex gap-2">
                {quickActions.map((a, i) => (
                  <Link key={i} href={a.href} className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[var(--pm-surface-2)] text-xs font-medium text-[var(--pm-text-secondary)] hover:bg-[var(--pm-surface-3)] transition-colors no-underline ${i === 0 && tier === 'starter' ? 'animate-[predictPulse_2s_infinite]' : ''}`}>
                    <span>{a.emoji}</span><span>{a.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </GlassCard>
        );
      })()}

      {/* Smart Actions */}
      {globalProfile && (() => {
        const tier = (globalProfile.tier || 'starter') as Tier;
        const tiles = tier === 'starter'
          ? [{ emoji: '\u{1F9FE}', label: 'Invoice', sub: '+3', href: '/invoices/new', highlight: true }, { emoji: '\u{1F91D}', label: 'Matches', sub: '', href: '/opportunities' }, { emoji: '\u{1F4F7}', label: 'Camera', sub: '+2', href: '/detect' }, { emoji: '\u{1F4F1}', label: 'Add Phone', sub: '+2', href: '/settings/business-setup' }]
          : tier === 'growing'
          ? [{ emoji: '\u{1F91D}', label: 'Opportunities', sub: '', href: '/opportunities', highlight: true }, { emoji: '\u{1F9FE}', label: 'Invoice Status', sub: '', href: '/invoices/new' }, { emoji: '\u{1F3F7}\uFE0F', label: 'Add Tax', sub: '+3', href: '/settings/business-setup' }, { emoji: '\u{1F4E4}', label: 'Invite', sub: '', href: '/invite' }]
          : [{ emoji: '\u{1F91D}', label: 'Deals', sub: '', href: '/opportunities', highlight: true }, { emoji: '\u{1F9FE}', label: 'Revenue', sub: '', href: '/cash-flow' }, { emoji: '\u{1F4E4}', label: 'Network', sub: '', href: '/invite' }, { emoji: '\u{1F6E1}\uFE0F', label: 'Verify', sub: '', href: '/verification' }];
        return (
          <div className="flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: 'none' }}>
            {tiles.map((t, i) => (
              <Link key={i} href={t.href} className="no-underline shrink-0" style={{ width: 120 }}>
                <GlassCard elevated className={`text-center py-3 px-2 ${t.highlight ? 'animate-[predictPulse_2s_infinite]' : ''}`}>
                  <span className="text-lg">{t.emoji}</span>
                  <p className="text-[12px] font-semibold text-[var(--pm-text-primary)] mt-1">{t.label}</p>
                  {t.sub && <p className="text-[10px] text-[var(--pm-text-tertiary)]">{t.sub}</p>}
                </GlassCard>
              </Link>
            ))}
          </div>
        );
      })()}

      {/* Live Corridors */}
      {globalProfile?.operating_corridors?.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {globalProfile.operating_corridors.map((c: any, i: number) => (
            <CorridorBadge key={i} from={c.from} to={c.to} flagFrom={c.flag_from} flagTo={c.flag_to} variant="inline" pulseStrength="gentle" />
          ))}
        </div>
      )}

      {/* Profile incomplete warning */}
      {profileIncomplete && (
        <Link href="/settings/business-setup" className="flex items-center gap-3 rounded-xl border border-[#DC2626]/20 bg-[#DC2626]/5 p-3.5 transition-colors hover:bg-[#DC2626]/10">
          <svg className="h-5 w-5 flex-shrink-0 text-[#DC2626]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
          <div className="flex-1"><p className="text-sm font-medium text-[#DC2626]">Complete your business profile</p><p className="text-xs text-[#DC2626]/70">Required before you can fire invoices</p></div>
          <svg className="h-4 w-4 text-[#DC2626]/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
        </Link>
      )}

      {/* Setup Prompt */}
      {(!(organization as Record<string, unknown>).business_type || organization.name === 'My Business') && (
        <a href="/onboarding" className="flex items-center justify-between bg-gradient-to-r from-[#4F46E5] to-[#7c3aed] rounded-[14px] px-5 py-4 mb-5 text-white no-underline hover:opacity-95 transition-opacity">
          <div>
            <p className="text-[15px] font-semibold">Complete your business setup</p>
            <p className="text-[13px] text-white/80 mt-1">Add your business name, type, and details to unlock all features</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </a>
      )}

      {/* Public Order Link */}
      <div className="rounded-xl bg-[#eef2ff] border border-[#c7d2fe] p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-[13px] font-semibold text-[#4338ca]">Your public order page</p>
            <p className="text-sm text-[#374151] font-mono mt-1">bizpocket.io/order/{(organization as Record<string, unknown>).slug || organization.id}</p>
            <p className="text-xs text-[#6b7280] mt-1">Put this in your Instagram bio, WhatsApp status, or business card</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowQR(!showQR)}
              className="bg-white text-[#4F46E5] text-[13px] font-semibold px-4 py-2.5 rounded-lg border border-[#c7d2fe] whitespace-nowrap hover:bg-[#eef2ff] transition-colors">
              {showQR ? 'Hide QR' : 'Show QR'}
            </button>
            <button onClick={() => { navigator.clipboard.writeText(`https://www.bizpocket.io/order/${(organization as Record<string, unknown>).slug || organization.id}`); toast('Link copied!', 'success'); }}
              className="bg-[#4F46E5] text-white text-[13px] font-semibold px-5 py-2.5 rounded-lg whitespace-nowrap hover:bg-[#4338CA] transition-colors">
              Copy link
            </button>
          </div>
        </div>
        {showQR && (
          <div className="mt-4 pt-4 border-t border-[#c7d2fe]">
            <PocketChatQR url={`https://www.bizpocket.io/order/${(organization as Record<string, unknown>).slug || organization.id}`} name={organization.name || 'business'} size={200} />
          </div>
        )}
      </div>

      {/* Global Profile CTA */}
      {hasGlobalProfile === false && (
        <Link href="/profile/build" className="flex items-center gap-4 rounded-2xl bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] p-4 text-white no-underline hover:opacity-95 transition-opacity">
          <span className="text-3xl">{'\u{1F30D}'}</span>
          <div className="flex-1">
            <p className="text-[15px] font-semibold">Build Your Global Profile</p>
            <p className="text-[12px] text-white/80 mt-0.5">AI-powered professional profile from your real activity</p>
          </div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </Link>
      )}
      {hasGlobalProfile === true && (
        <div className="flex gap-2.5">
          <Link href="/profile/preview" className="flex-1 flex items-center gap-3 rounded-xl border border-[#C7D2FE] dark:border-indigo-800 bg-[#EEF2FF] dark:bg-indigo-950/30 p-3.5 transition-colors hover:bg-[#E0E7FF] dark:hover:bg-indigo-950/50">
            <span className="text-lg">{'\u{1F30D}'}</span>
            <p className="text-sm font-medium text-[#4338CA] dark:text-indigo-300">Profile</p>
            <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
          <Link href="/opportunities" className="flex-1 flex items-center gap-3 rounded-xl border border-[#FDE68A] dark:border-amber-800 bg-[#FFFBEB] dark:bg-amber-950/30 p-3.5 transition-colors hover:bg-[#FEF3C7] dark:hover:bg-amber-950/50">
            <span className="text-lg">{'\u{1F91D}'}</span>
            <p className="text-sm font-medium text-[#92400E] dark:text-amber-300">Matches</p>
            <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        </div>
      )}

      {/* 4 Quick Shortcuts */}
      <div className="grid grid-cols-4 gap-2">
        <Link href="/invoices/new" className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white p-3 transition-all hover:border-[#4F46E5]/30 hover:bg-[#4F46E5]/[0.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4F46E5]/[0.08]">
            <svg className="h-4 w-4 text-[#4F46E5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6"/></svg>
          </div>
          <span className="text-[11px] font-medium text-[#333]">Invoice</span>
        </Link>
        <Link href="/cash-flow?new=1" className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white p-3 transition-all hover:border-[#16A34A]/30 hover:bg-[#16A34A]/[0.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#16A34A]/[0.08]">
            <svg className="h-4 w-4 text-[#16A34A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="14" width="3.5" height="6" rx="1"/><rect x="10" y="8" width="3.5" height="12" rx="1"/><rect x="16" y="4" width="3.5" height="16" rx="1"/></svg>
          </div>
          <span className="text-[11px] font-medium text-[#333]">Cash Flow</span>
        </Link>
        <Link href="/chat" className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white p-3 transition-all hover:border-[#7C3AED]/30 hover:bg-[#7C3AED]/[0.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#7C3AED]/[0.08]">
            <svg className="h-4 w-4 text-[#7C3AED]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"/></svg>
          </div>
          <span className="text-[11px] font-medium text-[#333]">Chat</span>
        </Link>
        <Link href="/detect" className="flex flex-col items-center gap-1.5 rounded-xl border border-[#E5E5E5] bg-white p-3 transition-all hover:border-[#0EA5E9]/30 hover:bg-[#0EA5E9]/[0.02]">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0EA5E9]/[0.08]">
            <svg className="h-4 w-4 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="11" cy="11" r="4"/><path d="M15 15l4 4"/></svg>
          </div>
          <span className="text-[11px] font-medium text-[#333]">AI Detect</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">Balance</p>
          <p className="mt-2 font-mono text-xl font-bold text-[#0A0A0A]">{formatCurrency(balance, currency)}</p>
          <p className="mt-1 text-[10px] text-[#999]">Net this month</p>
        </div>
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">Unpaid</p>
          <p className="mt-2 font-mono text-xl font-bold text-[#DC2626]">{formatCurrency(unpaidTotal, currency)}</p>
          <p className="mt-1 text-[10px] text-[#999]">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''} pending</p>
        </div>
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">Income</p>
          <p className="mt-2 font-mono text-xl font-bold text-[#16A34A]">{formatCurrency(totalIn, currency)}</p>
          <p className="mt-1 text-[10px] text-[#999]">This month</p>
        </div>
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">Expenses</p>
          <p className="mt-2 font-mono text-xl font-bold text-[#DC2626]">{formatCurrency(totalOut, currency)}</p>
          <p className="mt-1 text-[10px] text-[#999]">This month</p>
        </div>
      </div>

      {/* AI Briefing */}
      {briefingLoading ? (
        <div className="rounded-xl border border-[#F59E0B]/20 border-l-4 border-l-[#F59E0B] bg-gradient-to-br from-[#F59E0B]/[0.03] to-[#EA580C]/[0.05] p-5">
          <div className="flex items-center gap-2 mb-3"><div className="h-4 w-4 animate-spin rounded-full border-2 border-[#F59E0B] border-t-transparent" /><span className="text-xs font-semibold text-[#F59E0B]">AI Briefing</span></div>
          <div className="space-y-2"><div className="h-3 w-full animate-pulse rounded bg-[#F59E0B]/10" /><div className="h-3 w-4/5 animate-pulse rounded bg-[#F59E0B]/10" /><div className="h-3 w-3/5 animate-pulse rounded bg-[#F59E0B]/10" /></div>
        </div>
      ) : briefing ? (
        <div className="rounded-xl border border-[#F59E0B]/20 border-l-4 border-l-[#F59E0B] bg-gradient-to-br from-[#F59E0B]/[0.03] to-[#EA580C]/[0.05] p-5">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-4 w-4 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
            <span className="text-xs font-semibold text-[#F59E0B]">AI Briefing</span>
          </div>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#333]">{stripMarkdown(briefing)}</p>
        </div>
      ) : null}

      <HealthScore />

      {/* Business Cycle */}
      {activeCycle ? (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-[#4F46E5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25a2.25 2.25 0 01-2.25-2.25v-2.25z" /></svg>
              <h2 className="text-sm font-semibold text-[#0A0A0A]">{activeCycle.name}</h2>
            </div>
            <span className="rounded-full bg-[#4F46E5]/[0.06] px-2.5 py-0.5 text-[10px] font-semibold text-[#4F46E5]">{cycleItemCount} items</span>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
            {cycleStages.map((stage, i) => (
              <div key={i} className="flex items-center shrink-0">
                <div className="rounded-lg px-4 py-3 text-center min-w-[90px] border" style={{ borderColor: stage.color + '40', backgroundColor: stage.color + '08' }}>
                  <p className="text-xs font-bold" style={{ color: stage.color }}>{stage.stage_order}</p>
                  <p className="text-[11px] font-medium text-[#666] whitespace-nowrap">{stage.name}</p>
                </div>
                {i < cycleStages.length - 1 && <svg className="h-4 w-4 text-[#CCC] shrink-0 mx-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Link href="/cycle-setup" className="flex-1 rounded-lg border border-[#E5E5E5] py-2.5 text-center text-[11px] font-medium text-[#666] hover:bg-[#FAFAFA]">Edit Cycle</Link>
            <Link href="/ops-radar" className="flex-1 rounded-lg bg-[#0A0A0A] py-2.5 text-center text-[11px] font-medium text-white hover:bg-[#333]">Ops Radar &rarr;</Link>
          </div>
        </div>
      ) : (
        <Link href="/cycle-setup" className="block rounded-xl border border-dashed border-[#4F46E5]/20 bg-[#4F46E5]/[0.02] p-5 transition-all hover:bg-[#4F46E5]/[0.04]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10">
              <svg className="h-5 w-5 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#0A0A0A]">Set up your business cycle</p>
              <p className="text-[11px] text-[#999]">AI creates your custom pipeline in 2 minutes</p>
            </div>
            <svg className="h-4 w-4 text-[#CCC]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </div>
        </Link>
      )}

      {/* Upgrade Banner */}
      {(organization.plan === 'free' || !organization.plan) && (
        <Link href="/settings/upgrade" className="block rounded-xl border border-[#E5E5E5] bg-white p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]/10">
              <svg className="h-5 w-5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#0A0A0A]">Unlock the full autopilot</p>
              <p className="text-xs text-[#999]">Unlimited invoices, AI Briefing, 21 languages</p>
            </div>
            <span className="rounded-full border border-[#F59E0B] px-3 py-1.5 text-xs font-bold text-[#F59E0B]">Go Pro &rarr;</span>
          </div>
        </Link>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">Upcoming</h2>
            <Link href="/planner" className="text-[11px] text-[#4F46E5] font-medium">View all</Link>
          </div>
          <div className="space-y-1.5">
            {upcomingEvents.map((evt) => {
              const dotColors: Record<string, string> = { incoming_payment: 'bg-[#16A34A]', upcoming_expense: 'bg-[#DC2626]', meeting: 'bg-[#0EA5E9]', shipment: 'bg-[#7C3AED]', invoice_due: 'bg-[#4F46E5]', tax_deadline: 'bg-[#F59E0B]' };
              const isEvtToday = evt.event_date === new Date().toISOString().slice(0, 10);
              const isTmr = evt.event_date === new Date(Date.now() + 86400000).toISOString().slice(0, 10);
              const label = isEvtToday ? 'Today' : isTmr ? 'Tomorrow' : new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={evt.id} className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-4 py-3">
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[evt.event_type] || 'bg-[#999]'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-[#0A0A0A] truncate">{evt.title}</p>
                    <p className="text-[10px] text-[#999]">{label}{evt.event_time ? ` ${evt.event_time.slice(0, 5)}` : ''}</p>
                  </div>
                  {evt.amount && <span className="font-mono text-[13px] font-medium text-[#333]">{formatCurrency(evt.amount, evt.currency || currency)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">Recent Activity</h2>
          <Link href="/cash-flow" className="text-[11px] text-[#4F46E5] font-medium">View all</Link>
        </div>
        {recentFlows.length === 0 ? (
          <div className="rounded-xl border border-[#E5E5E5] bg-white p-6 text-center">
            <p className="text-sm text-[#999]">No transactions yet.</p>
            <Link href="/cash-flow?new=1" className="mt-1 inline-block text-xs font-medium text-[#4F46E5]">Add your first entry &rarr;</Link>
          </div>
        ) : (
          <div className="space-y-1.5">
            {recentFlows.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-xl border border-[#E5E5E5] bg-white px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${f.flow_type === 'IN' ? 'bg-[#16A34A]/10' : 'bg-[#DC2626]/10'}`}>
                    <svg className={`h-4 w-4 ${f.flow_type === 'IN' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.flow_type === 'IN' ? 'M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75' : 'M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75'} />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[13px] font-medium text-[#0A0A0A]">{f.category}</p>
                    <p className="text-[10px] text-[#999]">{formatDateShort(f.date)}{f.from_to ? ` · ${f.from_to}` : ''}</p>
                  </div>
                </div>
                <span className={`font-mono text-[13px] font-semibold ${f.flow_type === 'IN' ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
                  {f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* World Clock */}
      <div>
        <h2 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#BBB]">World Clock</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {DEFAULT_CLOCKS.map((c) => {
            const formatted = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(now);
            const [time, period] = formatted.split(' ');
            return (
              <div key={c.tz} className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-center">
                <p className="text-[9px] font-semibold text-[#BBB]">{c.city.slice(0, 2).toUpperCase()}</p>
                <p className="font-mono text-sm font-bold text-[#0A0A0A]">{time}</p>
                <p className="text-[8px] text-[#CCC]">{period}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* MagicFAB */}
      <MagicFAB
        tier={(globalProfile?.tier || 'starter') as Tier}
        onInvoice={() => window.location.href = '/invoices/new'}
        onChat={() => window.location.href = '/chat'}
        onMatch={() => window.location.href = '/opportunities'}
        onCamera={() => window.location.href = '/detect'}
      />

      {/* GrowthCompanion */}
      {globalProfile && (() => {
        const tier = (globalProfile.tier || 'starter') as Tier;
        const showCompanion = tier === 'starter' || (tier === 'growing' && actionsToday >= 3) || tier === 'established';
        if (!showCompanion) return null;

        const suggestion = tier === 'starter'
          ? { title: 'Send your first invoice', description: 'Invoicing builds trust fast. Send one to earn +3 Trust Score.', points: 3, action: 'Create Invoice', corridor: globalProfile.operating_corridors?.[0] ? { fromFlag: globalProfile.operating_corridors[0].flag_from, toFlag: globalProfile.operating_corridors[0].flag_to } : undefined }
          : tier === 'growing'
          ? { title: 'You\'re building momentum!', description: `${actionsToday} actions today. Add your tax info to unlock +3 Trust.`, points: 3, action: 'Add Tax Info' }
          : { title: 'Close a deal', description: 'You have strong connections. Follow up on your latest matches.', points: 5, action: 'View Matches' };

        return (
          <GrowthCompanion
            suggestion={suggestion}
            tier={tier}
            onAction={() => {
              if (tier === 'starter') window.location.href = '/invoices/new';
              else if (tier === 'growing') window.location.href = '/settings/business-setup';
              else window.location.href = '/opportunities';
            }}
            onDismiss={() => {}}
          />
        );
      })()}
    </div>
  );
}
