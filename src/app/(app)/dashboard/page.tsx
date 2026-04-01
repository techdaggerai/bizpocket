'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { formatCurrency, getGreeting, getCurrentMonth, formatDateShort } from '@/lib/utils';
import GlobalSearch from '@/components/GlobalSearch';
import HealthScore from '@/components/HealthScore';
import Link from 'next/link';
import type { CashFlow, Invoice } from '@/types/database';

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
  const supabase = createClient();
  const rawName = profile.full_name || user.user_metadata?.full_name || profile.name || '';
  const firstName = rawName.split(' ')[0] || user.email?.split('@')[0] || '';

  const [flows, setFlows] = useState<CashFlow[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [activeCycle, setActiveCycle] = useState<{ id: string; name: string; business_type: string } | null>(null);
  const [cycleStages, setCycleStages] = useState<{ name: string; color: string; stage_order: number }[]>([]);
  const [cycleItemCount, setCycleItemCount] = useState(0);

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
        supabase.from('cash_flows').select('*').eq('organization_id', organization.id).gte('date', month + '-01').lte('date', month + '-31').order('date', { ascending: false }),
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
  }, [supabase, organization.id, month, fetchBriefing]);

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
    <div className="space-y-6 py-4">
      <GlobalSearch />

      {/* Greeting + Briefing */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-1)]">{getGreeting()}{firstName ? `, ${firstName}` : ''}</h1>
        <p className="mb-3 text-sm text-[var(--text-3)]">{organization.name}</p>
        {profileIncomplete && (
          <Link href="/settings/business-setup" className="mb-3 flex items-center gap-3 rounded-card border border-[#DC2626]/20 bg-[#DC2626]/5 p-3.5 transition-colors hover:bg-[#DC2626]/10">
            <svg className="h-5 w-5 flex-shrink-0 text-[#DC2626]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" /></svg>
            <div className="flex-1"><p className="text-sm font-medium text-[#DC2626]">Complete your business profile</p><p className="text-xs text-[#DC2626]/70">Required before you can fire invoices</p></div>
            <svg className="h-4 w-4 text-[#DC2626]/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </Link>
        )}
        {briefingLoading ? (
          <div className="rounded-card border border-[#E5E5E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3"><div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /><span className="text-xs font-medium text-[#4F46E5]">AI Briefing</span></div>
            <div className="space-y-2"><div className="h-3 w-full animate-pulse rounded bg-[rgba(79,70,229,0.1)]" /><div className="h-3 w-4/5 animate-pulse rounded bg-[rgba(79,70,229,0.1)]" /><div className="h-3 w-3/5 animate-pulse rounded bg-[rgba(79,70,229,0.1)]" /></div>
          </div>
        ) : briefing ? (
          <div className="rounded-card border border-[#E5E5E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" /></svg>
              <span className="text-xs font-medium text-[#4F46E5]">AI Briefing</span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-2)]">{stripMarkdown(briefing)}</p>
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.cash_balance')}</p><p className="mt-1.5 font-mono text-xl font-semibold text-[#4F46E5]">{formatCurrency(balance, currency)}</p></div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.unpaid_invoices')}</p><p className="mt-1.5 font-mono text-xl font-semibold text-[#4F46E5]">{invoices.length > 0 ? `${invoices.length} (${formatCurrency(unpaidTotal, currency)})` : '0'}</p></div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.monthly_income')}</p><p className="mt-1.5 font-mono text-xl font-semibold text-[#16A34A]">{formatCurrency(totalIn, currency)}</p></div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm"><p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.monthly_expenses')}</p><p className="mt-1.5 font-mono text-xl font-semibold text-[#DC2626]">{formatCurrency(totalOut, currency)}</p></div>
      </div>

      <HealthScore />

      {/* Business Cycle */}
      {activeCycle ? (
        <div className="rounded-[14px] border border-[#E5E5E5] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2"><svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" /></svg><h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">{activeCycle.name}</h2></div>
            <span className="text-[10px] text-[var(--text-4)]">{cycleItemCount} items in pipeline</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {cycleStages.map((stage, i) => (<div key={i} className="flex items-center shrink-0"><div className="rounded-md px-2 py-1.5 text-center min-w-[60px]" style={{ backgroundColor: stage.color + '15', borderLeft: `2px solid ${stage.color}` }}><p className="text-[9px] font-bold" style={{ color: stage.color }}>{stage.stage_order}</p><p className="text-[8px] font-medium text-[var(--text-2)] whitespace-nowrap">{stage.name}</p></div>{i < cycleStages.length - 1 && <svg className="h-3 w-3 text-[var(--text-4)] shrink-0 mx-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>}</div>))}
          </div>
          <div className="mt-3 flex gap-2"><Link href="/cycle-setup" className="flex-1 rounded-lg border border-[#E5E5E5] py-2 text-center text-[10px] font-medium text-[var(--text-3)] hover:bg-[var(--bg-2)] transition-colors">Edit Cycle</Link><Link href="/ops-radar" className="flex-1 rounded-lg bg-[#4F46E5] py-2 text-center text-[10px] font-medium text-white hover:bg-[#4338CA] transition-colors">Ops Radar &rarr;</Link></div>
        </div>
      ) : (
        <Link href="/cycle-setup" className="block rounded-[14px] border border-dashed border-[#4F46E5]/30 bg-[#4F46E5]/[0.02] p-4 transition-all hover:bg-[#4F46E5]/[0.05]">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10"><svg className="h-5 w-5 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg></div><div><p className="text-sm font-semibold text-[var(--text-1)]">Set up your business cycle</p><p className="text-[10px] text-[var(--text-3)]">AI creates your custom operations pipeline in 2 minutes</p></div><svg className="h-4 w-4 text-[var(--text-4)] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg></div>
        </Link>
      )}

      {/* Upgrade Banner */}
      {(organization.plan === 'free' || !organization.plan) && (
        <Link href="/settings/upgrade" className="block rounded-[16px] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] p-4 transition-all hover:shadow-lg hover:-translate-y-0.5">
          <div className="flex items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg></div><div className="flex-1"><p className="text-sm font-semibold text-white">Unlock the full autopilot</p><p className="text-xs text-white/70">Unlimited invoices, AI Briefing, 13 languages, and more</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#4F46E5]">Go Pro &rarr;</span></div>
        </Link>
      )}

      {/* World Clock */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">World Clock</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {DEFAULT_CLOCKS.map((c) => { const formatted = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(now); const [time, period] = formatted.split(' '); return (<div key={c.tz} className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-center"><p className="text-[10px] font-semibold text-[var(--text-3)]">{c.city.slice(0, 2).toUpperCase()}</p><p className="font-mono text-sm font-bold text-[var(--text-1)]">{time}</p><p className="text-[9px] text-[var(--text-4)]">{period}</p></div>); })}
        </div>
      </div>

      {/* ═══ QUICK ACTIONS — Mercury monochrome ═══ */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-[6px]">
          <Link href="/invoices?new=1" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M14 2v6h6M8 13h8M8 17h5"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Invoice</p><p className="text-[10px] text-[var(--text-4)]">Send in 60 sec</p></div>
          </Link>
          <Link href="/cash-flow?new=1" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="4" y="14" width="3.5" height="6" rx="1"/><rect x="10" y="8" width="3.5" height="12" rx="1"/><rect x="16" y="4" width="3.5" height="16" rx="1"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Cash Flow</p><p className="text-[10px] text-[var(--text-4)]">Track money</p></div>
          </Link>
          <Link href="/detect" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="11" cy="11" r="4"/><path d="M15 15l4 4"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">AI Detect</p><p className="text-[10px] text-[var(--text-4)]">Snap & translate</p></div>
          </Link>
          <Link href="/chat" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 12c0 4.97-4.03 9-9 9-1.5 0-2.9-.37-4.14-1.02L3 21l1.02-4.86A8.94 8.94 0 013 12c0-4.97 4.03-9 9-9s9 4.03 9 9z"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Chat</p><p className="text-[10px] text-[var(--text-4)]">13 languages</p></div>
          </Link>
          <Link href="/expenses" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Expenses</p><p className="text-[10px] text-[var(--text-4)]">Plan spending</p></div>
          </Link>
          <Link href="/documents" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 7h10M7 11h7M7 15h4"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Snap & Vault</p><p className="text-[10px] text-[var(--text-4)]">Scan & store</p></div>
          </Link>
          <Link href="/planner" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 2v4M16 2v4"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Planner</p><p className="text-[10px] text-[var(--text-4)]">Deadlines</p></div>
          </Link>
          <Link href="/contacts" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Contacts</p><p className="text-[10px] text-[var(--text-4)]">Your network</p></div>
          </Link>
          <Link href="/website-builder" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a16 16 0 014 10 16 16 0 01-4 10 16 16 0 01-4-10A16 16 0 0112 2z"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Website</p><p className="text-[10px] text-[var(--text-4)]">Build & publish</p></div>
          </Link>
          <Link href="/items" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Pipeline</p><p className="text-[10px] text-[var(--text-4)]">Track items</p></div>
          </Link>
          <Link href="/social-media" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="12" cy="12" r="4.5"/><circle cx="17" cy="7" r="1.2"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Social</p><p className="text-[10px] text-[var(--text-4)]">Create posts</p></div>
          </Link>
          <Link href="/accountant" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2z"/><path d="M17 4v16"/><path d="M5 8h5M5 11h4M5 14h6"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Accountant</p><p className="text-[10px] text-[var(--text-4)]">Reports & tax</p></div>
          </Link>
          <Link href="/ops-radar" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5" opacity="0.4"/><circle cx="12" cy="12" r="1" opacity="0.4"/><path d="M12 3v6"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Ops Radar</p><p className="text-[10px] text-[var(--text-4)]">Command center</p></div>
          </Link>
          <Link href="/estimates" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 12h6M9 16h6M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/><path d="M13 2v6h6"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Estimates</p><p className="text-[10px] text-[var(--text-4)]">Quotes & proposals</p></div>
          </Link>
          <Link href="/time-tracking" className="flex items-center gap-3 rounded-[12px] border border-[#E5E5E5] bg-white p-3 transition-all hover:bg-[#FAFAFA]">
            <svg className="h-[18px] w-[18px] shrink-0 text-[var(--text-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <div><p className="text-[13px] font-medium text-[var(--text-1)]">Time Track</p><p className="text-[10px] text-[var(--text-4)]">Billable hours</p></div>
          </Link>
        </div>
      </div>

      {/* Connect Channels */}
      <div className="rounded-[14px] border border-[#E5E5E5] bg-white p-4">
        <div className="flex items-center justify-between mb-3"><h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Connect Your Channels</h2><span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-bold text-[#F59E0B]">COMING SOON</span></div>
        <p className="text-xs text-[var(--text-3)] mb-3">Message BizPocket from your favorite app &mdash; AI handles the rest.</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#25D366]/20 bg-[#25D366]/5 px-3 py-2.5"><span className="text-lg">{'\uD83D\uDCAC'}</span><div><p className="text-xs font-semibold text-[var(--text-1)]">WhatsApp</p><p className="text-[9px] text-[var(--text-4)]">Send invoices via chat</p></div></div>
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#0088CC]/20 bg-[#0088CC]/5 px-3 py-2.5"><span className="text-lg">{'\u2708\uFE0F'}</span><div><p className="text-xs font-semibold text-[var(--text-1)]">Telegram</p><p className="text-[9px] text-[var(--text-4)]">Run business by text</p></div></div>
        </div>
      </div>

      {/* Try It Now */}
      {recentFlows.length === 0 && invoices.length === 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Try It Now</h2>
          <div className="space-y-2">
            <Link href="/invoices?new=1" className="flex items-center gap-3 rounded-[12px] border border-[#4F46E5]/10 bg-[#4F46E5]/[0.03] p-4 transition-all hover:bg-[#4F46E5]/[0.06]"><span className="text-lg">{'\u26A1'}</span><div className="flex-1"><p className="text-sm font-medium text-[var(--text-1)]">Send your first invoice in 60 seconds</p><p className="text-[10px] text-[var(--text-3)]">Professional PDF, 5 templates, share instantly</p></div><svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg></Link>
            <Link href="/detect" className="flex items-center gap-3 rounded-[12px] border border-[#0EA5E9]/10 bg-[#0EA5E9]/[0.03] p-4 transition-all hover:bg-[#0EA5E9]/[0.06]"><span className="text-lg">{'\uD83D\uDCF8'}</span><div className="flex-1"><p className="text-sm font-medium text-[var(--text-1)]">Snap a Japanese document &mdash; AI translates it</p><p className="text-[10px] text-[var(--text-3)]">Tax notices, contracts, forms &mdash; instant translation</p></div><svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg></Link>
            <Link href="/chat" className="flex items-center gap-3 rounded-[12px] border border-[#7C3AED]/10 bg-[#7C3AED]/[0.03] p-4 transition-all hover:bg-[#7C3AED]/[0.06]"><span className="text-lg">{'\uD83D\uDCAC'}</span><div className="flex-1"><p className="text-sm font-medium text-[var(--text-1)]">Start a PocketChat conversation</p><p className="text-[10px] text-[var(--text-3)]">Message in English &mdash; they read it in Japanese</p></div><svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg></Link>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Upcoming</h2><Link href="/planner" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">View planner</Link></div>
          <div className="space-y-1.5">
            {upcomingEvents.map((evt: any) => { const dotColors: Record<string, string> = { incoming_payment: 'bg-[#16A34A]', upcoming_expense: 'bg-[#DC2626]', meeting: 'bg-[#0EA5E9]', shipment: 'bg-[#7C3AED]', invoice_due: 'bg-[#4F46E5]', tax_deadline: 'bg-[#F59E0B]' }; const isEvtToday = evt.event_date === new Date().toISOString().slice(0, 10); const isTmr = evt.event_date === new Date(Date.now() + 86400000).toISOString().slice(0, 10); const label = isEvtToday ? 'Today' : isTmr ? 'Tomorrow' : new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); return (<div key={evt.id} className="flex items-center gap-3 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5"><div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[evt.event_type] || 'bg-[#6B7280]'}`} /><div className="min-w-0 flex-1"><p className="text-sm font-medium text-[var(--text-1)] truncate">{evt.title}</p><p className="text-xs text-[var(--text-4)]">{label}{evt.event_time ? ` ${evt.event_time.slice(0, 5)}` : ''}</p></div>{evt.amount && <span className="font-mono text-sm text-[var(--text-2)]">{formatCurrency(evt.amount, evt.currency || currency)}</span>}</div>); })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="mb-3 flex items-center justify-between"><h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">{t('dashboard.recent_transactions')}</h2><Link href="/cash-flow" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">View all</Link></div>
        <div className="space-y-2">
          {recentFlows.length === 0 ? (<div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center"><p className="text-sm text-[var(--text-3)]">No transactions yet.</p><Link href="/cash-flow?new=1" className="mt-1 inline-block text-xs font-medium text-[#4F46E5]">Add your first entry &rarr;</Link></div>) : (
            recentFlows.map((f) => (<div key={f.id} className="flex items-center justify-between rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3"><div className="flex items-center gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-full ${f.flow_type === 'IN' ? 'bg-[var(--green-bg)]' : 'bg-[var(--red-bg)]'}`}><svg className={`h-4 w-4 ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d={f.flow_type === 'IN' ? 'M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75' : 'M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75'} /></svg></div><div><p className="text-base font-medium text-[var(--text-1)]">{f.category}</p><p className="text-xs text-[var(--text-4)]">{formatDateShort(f.date)}{f.from_to ? ` \u00B7 ${f.from_to}` : ''}</p></div></div><span className={`font-mono text-base font-medium ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}</span></div>))
          )}
        </div>
      </div>
    </div>
  );
}
