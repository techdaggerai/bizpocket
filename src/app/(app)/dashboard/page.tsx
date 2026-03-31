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
    if (cached) {
      setBriefing(cached.text);
      setBriefingLoading(false);
      return;
    }

    setBriefingLoading(true);
    try {
      const res = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: organization.id }),
      });
      const data = await res.json();
      if (data.briefing) {
        setBriefing(data.briefing);
        setCachedBriefing(data.briefing, data.ownerName || firstName, organization.id);
      }
    } catch {
      // Silently fail
    }
    setBriefingLoading(false);
  }, [organization.id, firstName]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10);
      const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const [flowRes, invRes, evtRes] = await Promise.all([
        supabase
          .from('cash_flows')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('date', month + '-01')
          .lte('date', month + '-31')
          .order('date', { ascending: false }),
        supabase
          .from('invoices')
          .select('*')
          .eq('organization_id', organization.id)
          .neq('status', 'paid'),
        supabase
          .from('planner_events')
          .select('*')
          .eq('organization_id', organization.id)
          .gte('event_date', today)
          .lte('event_date', nextWeek)
          .eq('status', 'pending')
          .order('event_date', { ascending: true })
          .limit(3),
      ]);
      setFlows(flowRes.data || []);
      setInvoices(invRes.data || []);
      setUpcomingEvents(evtRes.data || []);

      // Fetch active business cycle
      const { data: cycleData } = await supabase
        .from('business_cycles')
        .select('id, name, business_type')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (cycleData) {
        setActiveCycle(cycleData);
        const { data: stages } = await supabase
          .from('cycle_stages')
          .select('name, color, stage_order')
          .eq('cycle_id', cycleData.id)
          .order('stage_order', { ascending: true });
        setCycleStages(stages || []);

        const { count } = await supabase
          .from('cycle_items')
          .select('id', { count: 'exact', head: true })
          .eq('cycle_id', cycleData.id)
          .eq('status', 'active');
        setCycleItemCount(count || 0);
      } else {
        setActiveCycle(null);
        setCycleStages([]);
        setCycleItemCount(0);
      }

      setLoading(false);
    }
    load();
    fetchBriefing();
  }, [supabase, organization.id, month, fetchBriefing]);

  const totalIn = flows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const totalOut = flows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);
  const balance = totalIn - totalOut;
  const unpaidTotal = invoices.reduce((s, inv) => s + inv.total, 0);
  const recentFlows = flows.slice(0, 5);
  const recurringFlows = flows.filter((f) => (f as any).is_recurring);
  const recurringIn = recurringFlows.filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
  const recurringOut = recurringFlows.filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;
  const profileIncomplete = !org.address || !org.phone || !org.bank_name || !org.bank_account_number;

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {/* Global Search */}
      <GlobalSearch />

      {/* AI Morning Briefing */}
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-1)]">
          {getGreeting()}{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="mb-3 text-sm text-[var(--text-3)]">{organization.name}</p>

        {profileIncomplete && (
          <Link
            href="/settings/business-setup"
            className="mb-3 flex items-center gap-3 rounded-card border border-[#DC2626]/20 bg-[#DC2626]/5 p-3.5 transition-colors hover:bg-[#DC2626]/10"
          >
            <svg className="h-5 w-5 flex-shrink-0 text-[#DC2626]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-[#DC2626]">Complete your business profile</p>
              <p className="text-xs text-[#DC2626]/70">Required before you can fire invoices</p>
            </div>
            <svg className="h-4 w-4 text-[#DC2626]/50" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {briefingLoading ? (
          <div className="rounded-card border border-[#E5E5E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
              <span className="text-xs font-medium text-[#4F46E5]">AI Briefing</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 w-full animate-pulse rounded bg-[rgba(79,70,229,0.1)]" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-[rgba(79,70,229,0.1)]" />
              <div className="h-3 w-3/5 animate-pulse rounded bg-[rgba(79,70,229,0.1)]" />
            </div>
          </div>
        ) : briefing ? (
          <div className="rounded-card border border-[#E5E5E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
              </svg>
              <span className="text-xs font-medium text-[#4F46E5]">AI Briefing</span>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-2)]">
              {stripMarkdown(briefing)}
            </p>
          </div>
        ) : null}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.cash_balance')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#4F46E5]">
            {formatCurrency(balance, currency)}
          </p>
        </div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.unpaid_invoices')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#4F46E5]">
            {invoices.length > 0 ? `${invoices.length} (${formatCurrency(unpaidTotal, currency)})` : '0'}
          </p>
        </div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.monthly_income')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#16A34A]">{formatCurrency(totalIn, currency)}</p>
        </div>
        <div className="rounded-card border border-[#E5E5E5] bg-white p-4 transition-shadow hover:shadow-sm">
          <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A3A3A3]">{t('dashboard.monthly_expenses')}</p>
          <p className="mt-1.5 font-mono text-xl font-semibold text-[#DC2626]">{formatCurrency(totalOut, currency)}</p>
        </div>
      </div>

      {/* Business Health Score */}
      <HealthScore />

      {/* ═══ BUSINESS CYCLE — Active pipeline ═══ */}
      {activeCycle ? (
        <div className="rounded-[14px] border border-[#E5E5E5] bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" />
              </svg>
              <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">{activeCycle.name}</h2>
            </div>
            <span className="text-[10px] text-[var(--text-4)]">{cycleItemCount} items in pipeline</span>
          </div>
          <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1">
            {cycleStages.map((stage, i) => (
              <div key={i} className="flex items-center shrink-0">
                <div className="rounded-md px-2 py-1.5 text-center min-w-[60px]" style={{ backgroundColor: stage.color + '15', borderLeft: `2px solid ${stage.color}` }}>
                  <p className="text-[9px] font-bold" style={{ color: stage.color }}>{stage.stage_order}</p>
                  <p className="text-[8px] font-medium text-[var(--text-2)] whitespace-nowrap">{stage.name}</p>
                </div>
                {i < cycleStages.length - 1 && (
                  <svg className="h-3 w-3 text-[var(--text-4)] shrink-0 mx-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <Link href="/cycle-setup" className="flex-1 rounded-lg border border-[#E5E5E5] py-2 text-center text-[10px] font-medium text-[var(--text-3)] hover:bg-[var(--bg-2)] transition-colors">
              Edit Cycle
            </Link>
            <span className="flex-1 rounded-lg bg-[#4F46E5]/50 py-2 text-center text-[10px] font-medium text-white cursor-default" title="Ops Radar — coming soon">
              Ops Radar (Soon)
            </span>
          </div>
        </div>
      ) : (
        <Link href="/cycle-setup" className="block rounded-[14px] border border-dashed border-[#4F46E5]/30 bg-[#4F46E5]/[0.02] p-4 transition-all hover:bg-[#4F46E5]/[0.05]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]/10">
              <svg className="h-5 w-5 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)]">Set up your business cycle</p>
              <p className="text-[10px] text-[var(--text-3)]">AI creates your custom operations pipeline in 2 minutes</p>
            </div>
            <svg className="h-4 w-4 text-[var(--text-4)] shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>
      )}

      {/* ═══ UPGRADE BANNER — Free users only ═══ */}
      {(organization.plan === 'free' || !organization.plan) && (
        <Link
          href="/settings/upgrade"
          className="block rounded-[16px] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] p-4 transition-all hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20">
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">Unlock the full autopilot</p>
              <p className="text-xs text-white/70">Unlimited invoices, AI Briefing, 13 languages, and more</p>
            </div>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[#4F46E5]">Go Pro &rarr;</span>
          </div>
        </Link>
      )}

      {/* ═══ WORLD CLOCK — Compact grid ═══ */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">World Clock</h2>
        <div className="grid grid-cols-6 gap-1.5">
          {DEFAULT_CLOCKS.map((c) => {
            const formatted = new Intl.DateTimeFormat('en-US', { timeZone: c.tz, hour: 'numeric', minute: '2-digit', hour12: true }).format(now);
            const [time, period] = formatted.split(' ');
            return (
              <div key={c.tz} className="rounded-lg border border-[#E5E5E5] bg-white py-2 text-center">
                <p className="text-[10px] font-semibold text-[var(--text-3)]">{c.city.slice(0, 2).toUpperCase()}</p>
                <p className="font-mono text-sm font-bold text-[var(--text-1)]">{time}</p>
                <p className="text-[9px] text-[var(--text-4)]">{period}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ QUICK ACTIONS — Bold colors with descriptions ═══ */}
      <div>
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/invoices?new=1" className="flex items-center gap-3 rounded-[14px] border border-[#4F46E5]/15 bg-[#4F46E5]/5 p-3.5 transition-all hover:bg-[#4F46E5]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Fire Invoice</p><p className="text-[10px] text-[var(--text-3)]">Send in 60 seconds</p></div>
          </Link>
          <Link href="/cash-flow?new=1" className="flex items-center gap-3 rounded-[14px] border border-[#16A34A]/15 bg-[#16A34A]/5 p-3.5 transition-all hover:bg-[#16A34A]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Cash Flow</p><p className="text-[10px] text-[var(--text-3)]">Track money in & out</p></div>
          </Link>
          <Link href="/detect" className="flex items-center gap-3 rounded-[14px] border border-[#0EA5E9]/15 bg-[#0EA5E9]/5 p-3.5 transition-all hover:bg-[#0EA5E9]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">AI Detect</p><p className="text-[10px] text-[var(--text-3)]">Snap & translate docs</p></div>
          </Link>
          <Link href="/chat" className="flex items-center gap-3 rounded-[14px] border border-[#7C3AED]/15 bg-[#7C3AED]/5 p-3.5 transition-all hover:bg-[#7C3AED]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">PocketChat</p><p className="text-[10px] text-[var(--text-3)]">Chat in 13 languages</p></div>
          </Link>
          <Link href="/expenses" className="flex items-center gap-3 rounded-[14px] border border-[#EF4444]/15 bg-[#EF4444]/5 p-3.5 transition-all hover:bg-[#EF4444]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EF4444]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Expenses</p><p className="text-[10px] text-[var(--text-3)]">Plan & track spending</p></div>
          </Link>
          <Link href="/documents" className="flex items-center gap-3 rounded-[14px] border border-[#14B8A6]/15 bg-[#14B8A6]/5 p-3.5 transition-all hover:bg-[#14B8A6]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Snap & Vault</p><p className="text-[10px] text-[var(--text-3)]">Scan & store documents</p></div>
          </Link>
          <Link href="/planner" className="flex items-center gap-3 rounded-[14px] border border-[#EC4899]/15 bg-[#EC4899]/5 p-3.5 transition-all hover:bg-[#EC4899]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EC4899]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Planner</p><p className="text-[10px] text-[var(--text-3)]">Deadlines & reminders</p></div>
          </Link>
          <Link href="/contacts" className="flex items-center gap-3 rounded-[14px] border border-[#F59E0B]/15 bg-[#F59E0B]/5 p-3.5 transition-all hover:bg-[#F59E0B]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Contacts</p><p className="text-[10px] text-[var(--text-3)]">Manage your network</p></div>
          </Link>
          <Link href="/website-builder" className="flex items-center gap-3 rounded-[14px] border border-[#0F172A]/15 bg-[#0F172A]/5 p-3.5 transition-all hover:bg-[#0F172A]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F172A]"><svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5a17.92 17.92 0 0 1-8.716-2.247m0 0A8.966 8.966 0 0 1 3 12c0-1.264.26-2.466.732-3.558" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Build Website</p><p className="text-[10px] text-[var(--text-3)]">AI creates your site</p></div>
          </Link>
        </div>
      </div>

      {/* ═══ CONNECT CHANNELS — Coming Soon ═══ */}
      <div className="rounded-[14px] border border-[#E5E5E5] bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Connect Your Channels</h2>
          <span className="rounded-full bg-[#F59E0B]/10 px-2 py-0.5 text-[9px] font-bold text-[#F59E0B]">COMING SOON</span>
        </div>
        <p className="text-xs text-[var(--text-3)] mb-3">Message BizPocket from your favorite app — AI handles the rest.</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#25D366]/20 bg-[#25D366]/5 px-3 py-2.5">
            <span className="text-lg">💬</span>
            <div><p className="text-xs font-semibold text-[var(--text-1)]">WhatsApp</p><p className="text-[9px] text-[var(--text-4)]">Send invoices via chat</p></div>
          </div>
          <div className="flex-1 flex items-center gap-2 rounded-lg border border-[#0088CC]/20 bg-[#0088CC]/5 px-3 py-2.5">
            <span className="text-lg">✈️</span>
            <div><p className="text-xs font-semibold text-[var(--text-1)]">Telegram</p><p className="text-[9px] text-[var(--text-4)]">Run business by text</p></div>
          </div>
        </div>
      </div>

      {/* ═══ TRY IT NOW — For new users with zero data ═══ */}
      {recentFlows.length === 0 && invoices.length === 0 && (
        <div>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Try It Now</h2>
          <div className="space-y-2">
            <Link href="/invoices?new=1" className="flex items-center gap-3 rounded-[12px] border border-[#4F46E5]/10 bg-[#4F46E5]/[0.03] p-4 transition-all hover:bg-[#4F46E5]/[0.06]">
              <span className="text-lg">⚡</span>
              <div className="flex-1"><p className="text-sm font-medium text-[var(--text-1)]">Send your first invoice in 60 seconds</p><p className="text-[10px] text-[var(--text-3)]">Professional PDF, 5 templates, share instantly</p></div>
              <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
            <Link href="/detect" className="flex items-center gap-3 rounded-[12px] border border-[#0EA5E9]/10 bg-[#0EA5E9]/[0.03] p-4 transition-all hover:bg-[#0EA5E9]/[0.06]">
              <span className="text-lg">📸</span>
              <div className="flex-1"><p className="text-sm font-medium text-[var(--text-1)]">Snap a Japanese document — AI translates it</p><p className="text-[10px] text-[var(--text-3)]">Tax notices, contracts, forms — instant translation</p></div>
              <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
            <Link href="/chat" className="flex items-center gap-3 rounded-[12px] border border-[#7C3AED]/10 bg-[#7C3AED]/[0.03] p-4 transition-all hover:bg-[#7C3AED]/[0.06]">
              <span className="text-lg">💬</span>
              <div className="flex-1"><p className="text-sm font-medium text-[var(--text-1)]">Start a PocketChat conversation</p><p className="text-[10px] text-[var(--text-3)]">Message in English — they read it in Japanese</p></div>
              <svg className="h-4 w-4 text-[var(--text-4)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
            </Link>
          </div>
        </div>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">Upcoming</h2>
            <Link href="/planner" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">View planner</Link>
          </div>
          <div className="space-y-1.5">
            {upcomingEvents.map((evt: any) => {
              const dotColors: Record<string, string> = { incoming_payment: 'bg-[#16A34A]', upcoming_expense: 'bg-[#DC2626]', meeting: 'bg-[#0EA5E9]', shipment: 'bg-[#7C3AED]', invoice_due: 'bg-[#4F46E5]', tax_deadline: 'bg-[#F59E0B]' };
              const isEvtToday = evt.event_date === new Date().toISOString().slice(0, 10);
              const isTmr = evt.event_date === new Date(Date.now() + 86400000).toISOString().slice(0, 10);
              const label = isEvtToday ? 'Today' : isTmr ? 'Tomorrow' : new Date(evt.event_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
              return (
                <div key={evt.id} className="flex items-center gap-3 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-2.5">
                  <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${dotColors[evt.event_type] || 'bg-[#6B7280]'}`} />
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium text-[var(--text-1)] truncate">{evt.title}</p><p className="text-xs text-[var(--text-4)]">{label}{evt.event_time ? ` ${evt.event_time.slice(0, 5)}` : ''}</p></div>
                  {evt.amount && <span className="font-mono text-sm text-[var(--text-2)]">{formatCurrency(evt.amount, evt.currency || currency)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-widest text-[var(--text-4)]">{t('dashboard.recent_transactions')}</h2>
          <Link href="/cash-flow" className="text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]">View all</Link>
        </div>
        <div className="space-y-2">
          {recentFlows.length === 0 ? (
            <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-6 text-center">
              <p className="text-sm text-[var(--text-3)]">No transactions yet.</p>
              <Link href="/cash-flow?new=1" className="mt-1 inline-block text-xs font-medium text-[#4F46E5]">Add your first entry &rarr;</Link>
            </div>
          ) : (
            recentFlows.map((f) => (
              <div key={f.id} className="flex items-center justify-between rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${f.flow_type === 'IN' ? 'bg-[var(--green-bg)]' : 'bg-[var(--red-bg)]'}`}>
                    <svg className={`h-4 w-4 ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d={f.flow_type === 'IN' ? 'M12 19.5v-15m0 0-6.75 6.75M12 4.5l6.75 6.75' : 'M12 4.5v15m0 0 6.75-6.75M12 19.5l-6.75-6.75'} />
                    </svg>
                  </div>
                  <div><p className="text-base font-medium text-[var(--text-1)]">{f.category}</p><p className="text-xs text-[var(--text-4)]">{formatDateShort(f.date)}{f.from_to ? ` \u00B7 ${f.from_to}` : ''}</p></div>
                </div>
                <span className={`font-mono text-base font-medium ${f.flow_type === 'IN' ? 'text-[var(--green)]' : 'text-[var(--red)]'}`}>{f.flow_type === 'IN' ? '+' : '-'}{formatCurrency(f.amount, currency)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
