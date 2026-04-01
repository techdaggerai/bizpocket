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
            <Link href="/ops-radar" className="flex-1 rounded-lg bg-[#4F46E5] py-2 text-center text-[10px] font-medium text-white hover:bg-[#4338CA] transition-colors">
              Ops Radar &rarr;
            </Link>
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
          {/* Invoice — filled document */}
          <Link href="/invoices?new=1" className="flex items-center gap-3 rounded-[14px] border border-[#4F46E5]/15 bg-[#4F46E5]/5 p-3.5 transition-all hover:bg-[#4F46E5]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4F46E5]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V8.25L14.25 1.5H5.625ZM14.25 3.75v3.375c0 .621.504 1.125 1.125 1.125H18.75M8.25 15h7.5M8.25 18h4.5" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Fire Invoice</p><p className="text-[10px] text-[var(--text-3)]">Send in 60 seconds</p></div>
          </Link>
          {/* Cash Flow — growth bars with trend line */}
          <Link href="/cash-flow?new=1" className="flex items-center gap-3 rounded-[14px] border border-[#16A34A]/15 bg-[#16A34A]/5 p-3.5 transition-all hover:bg-[#16A34A]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M4 19h2V9H4v10Zm4 0h2V5H8v14Zm4 0h2v-7h-2v7Zm4 0h2V11h-2v8Zm4 0h2V7h-2v12Z" /><path d="M2 17l5-5 4 2 5-6 4 3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Cash Flow</p><p className="text-[10px] text-[var(--text-3)]">Track money in & out</p></div>
          </Link>
          {/* AI Detect — scanner with magnifying glass */}
          <Link href="/detect" className="flex items-center gap-3 rounded-[14px] border border-[#0EA5E9]/15 bg-[#0EA5E9]/5 p-3.5 transition-all hover:bg-[#0EA5E9]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M4 4h16v2H4V4Zm0 14h16v2H4v-2Zm0-4.5h10v1.5H4v-1.5Zm0-5h10v1.5H4V8.5Z" /><circle cx="18" cy="13" r="3" /><path d="M20.1 15.1l2.4 2.4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">AI Detect</p><p className="text-[10px] text-[var(--text-3)]">Snap & translate docs</p></div>
          </Link>
          {/* PocketChat — filled speech bubble with dots */}
          <Link href="/chat" className="flex items-center gap-3 rounded-[14px] border border-[#7C3AED]/15 bg-[#7C3AED]/5 p-3.5 transition-all hover:bg-[#7C3AED]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 5.813 2 10.5c0 2.685 1.488 5.074 3.813 6.618L4.5 21.5l4.1-2.05A11.48 11.48 0 0 0 12 20c5.523 0 10-3.813 10-8.5S17.523 2 12 2Z" /><circle cx="8" cy="10.5" r="1.25" fill="#7C3AED" /><circle cx="12" cy="10.5" r="1.25" fill="#7C3AED" /><circle cx="16" cy="10.5" r="1.25" fill="#7C3AED" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">PocketChat</p><p className="text-[10px] text-[var(--text-3)]">Chat in 13 languages</p></div>
          </Link>
          {/* Expenses — filled credit card */}
          <Link href="/expenses" className="flex items-center gap-3 rounded-[14px] border border-[#EF4444]/15 bg-[#EF4444]/5 p-3.5 transition-all hover:bg-[#EF4444]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EF4444]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M2 6.5A2.5 2.5 0 0 1 4.5 4h15A2.5 2.5 0 0 1 22 6.5V9H2V6.5ZM2 11h20v6.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5V11Zm4 3a1 1 0 0 0 0 2h4a1 1 0 1 0 0-2H6Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Expenses</p><p className="text-[10px] text-[var(--text-3)]">Plan & track spending</p></div>
          </Link>
          {/* Snap & Vault — filled document grid */}
          <Link href="/documents" className="flex items-center gap-3 rounded-[14px] border border-[#14B8A6]/15 bg-[#14B8A6]/5 p-3.5 transition-all hover:bg-[#14B8A6]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M3 3h7v9H3V3Zm11 0h7v6h-7V3ZM3 14h7v7H3v-7Zm11-2h7v9h-7v-9Z" /><rect x="4.5" y="4.5" width="4" height="2" rx="0.5" fill="#14B8A6" opacity="0.4" /><rect x="4.5" y="15.5" width="4" height="2" rx="0.5" fill="#14B8A6" opacity="0.4" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Snap & Vault</p><p className="text-[10px] text-[var(--text-3)]">Scan & store documents</p></div>
          </Link>
          {/* Planner — filled calendar */}
          <Link href="/planner" className="flex items-center gap-3 rounded-[14px] border border-[#EC4899]/15 bg-[#EC4899]/5 p-3.5 transition-all hover:bg-[#EC4899]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EC4899]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M8 2v2H6a3 3 0 0 0-3 3v13a3 3 0 0 0 3 3h12a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-2V2h-2v2h-4V2H8ZM5 10h14v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V10Zm2 3h3v3H7v-3Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Planner</p><p className="text-[10px] text-[var(--text-3)]">Deadlines & reminders</p></div>
          </Link>
          {/* Contacts — filled people */}
          <Link href="/contacts" className="flex items-center gap-3 rounded-[14px] border border-[#F59E0B]/15 bg-[#F59E0B]/5 p-3.5 transition-all hover:bg-[#F59E0B]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F59E0B]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="7" r="3.5" /><path d="M2 19c0-3.314 3.134-6 7-6s7 2.686 7 6v1H2v-1Z" /><circle cx="17.5" cy="8.5" r="2.5" /><path d="M21 19h-3c0-2.186-1.07-4.133-2.73-5.39A6.48 6.48 0 0 1 17.5 13c2.761 0 5 1.79 5 4v1h-1.5V19Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Contacts</p><p className="text-[10px] text-[var(--text-3)]">Manage your network</p></div>
          </Link>
          {/* Website — browser with colored dots */}
          <Link href="/website-builder" className="flex items-center gap-3 rounded-[14px] border border-[#0F172A]/15 bg-[#0F172A]/5 p-3.5 transition-all hover:bg-[#0F172A]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0F172A]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="3" width="20" height="18" rx="3" /><rect x="2" y="3" width="20" height="5" rx="3" fill="white" opacity="0.2" /><circle cx="5.5" cy="5.5" r="1" fill="#FF5F57" /><circle cx="8.5" cy="5.5" r="1" fill="#FEBC2E" /><circle cx="11.5" cy="5.5" r="1" fill="#28C840" /><rect x="5" y="11" width="6" height="2" rx="1" fill="white" opacity="0.3" /><rect x="5" y="14.5" width="14" height="1.5" rx="0.75" fill="white" opacity="0.15" /><rect x="5" y="17.5" width="10" height="1.5" rx="0.75" fill="white" opacity="0.15" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Build Website</p><p className="text-[10px] text-[var(--text-3)]">AI creates your site</p></div>
          </Link>
          {/* Pipeline — 4 squares grid */}
          <Link href="/items" className="flex items-center gap-3 rounded-[14px] border border-[#6366F1]/15 bg-[#6366F1]/5 p-3.5 transition-all hover:bg-[#6366F1]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#6366F1]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Pipeline Items</p><p className="text-[10px] text-[var(--text-3)]">Track your inventory</p></div>
          </Link>
          {/* Social — Instagram shape */}
          <Link href="/social-media" className="flex items-center gap-3 rounded-[14px] border border-[#EC4899]/15 bg-[#EC4899]/5 p-3.5 transition-all hover:bg-[#EC4899]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#EC4899]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="6" /><circle cx="12" cy="12" r="4.5" fill="#EC4899" stroke="white" strokeWidth="1.5" /><circle cx="17.5" cy="6.5" r="1.5" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Social Post</p><p className="text-[10px] text-[var(--text-3)]">AI creates your posts</p></div>
          </Link>
          {/* Accountant — ledger book */}
          <Link href="/accountant" className="flex items-center gap-3 rounded-[14px] border border-[#14B8A6]/15 bg-[#14B8A6]/5 p-3.5 transition-all hover:bg-[#14B8A6]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#14B8A6]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M6 2a3 3 0 0 0-3 3v14a3 3 0 0 0 3 3h13V2H6Zm0 2h2v16H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Zm4 3h7v1.5h-7V7Zm0 3.5h7V12h-7v-1.5Zm0 3.5h5v1.5h-5V14Z" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Accountant</p><p className="text-[10px] text-[var(--text-3)]">Reports & tax data</p></div>
          </Link>
          {/* Ops Radar — radar sweep with green blip */}
          <Link href="/ops-radar" className="flex items-center gap-3 rounded-[14px] border border-[#16A34A]/15 bg-[#16A34A]/5 p-3.5 transition-all hover:bg-[#16A34A]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#16A34A]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" opacity="0.2" /><circle cx="12" cy="12" r="6.5" opacity="0.15" /><circle cx="12" cy="12" r="3" opacity="0.15" /><path d="M12 2v10l6.93-4A10 10 0 0 0 12 2Z" opacity="0.5" /><circle cx="15" cy="8" r="1.5" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Ops Radar</p><p className="text-[10px] text-[var(--text-3)]">Track operations</p></div>
          </Link>
          {/* Estimates — filled document with checkmark */}
          <Link href="/estimates" className="flex items-center gap-3 rounded-[14px] border border-[#7C3AED]/15 bg-[#7C3AED]/5 p-3.5 transition-all hover:bg-[#7C3AED]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C3AED]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V8.25L14.25 1.5H5.625ZM9 12h6M9 15h4" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Estimates</p><p className="text-[10px] text-[var(--text-3)]">Quotes & proposals</p></div>
          </Link>
          {/* Time Tracking — clock */}
          <Link href="/time-tracking" className="flex items-center gap-3 rounded-[14px] border border-[#0EA5E9]/15 bg-[#0EA5E9]/5 p-3.5 transition-all hover:bg-[#0EA5E9]/10">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0EA5E9]"><svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" /></svg></div>
            <div><p className="text-sm font-semibold text-[var(--text-1)]">Time Track</p><p className="text-[10px] text-[var(--text-3)]">Billable hours</p></div>
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
