'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import PageHeader from '@/components/PageHeader';
import type { Customer } from '@/types/database';

export default function TimeTrackingPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [entries, setEntries] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Timer
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerProject, setTimerProject] = useState('');
  const [timerCustomerId, setTimerCustomerId] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Form
  const [form, setForm] = useState({
    customer_id: '', project_name: '', description: '', date: new Date().toISOString().slice(0, 10),
    duration_minutes: '', hourly_rate: '', is_billable: true,
  });

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('time_entries').select('*').eq('organization_id', organization.id).order('date', { ascending: false }).limit(50);
    setEntries(data || []);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => {
    fetchEntries();
    supabase.from('customers').select('*').eq('organization_id', organization.id).order('name').then(({ data }) => setCustomers(data || []));
  }, [fetchEntries, organization.id, supabase]);

  // Timer functions
  function startTimer() {
    setTimerRunning(true);
    setTimerSeconds(0);
    timerRef.current = setInterval(() => setTimerSeconds(s => s + 1), 1000);
  }

  async function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerRunning(false);
    const minutes = Math.ceil(timerSeconds / 60);
    const rate = parseInt(form.hourly_rate) || 0;
    const total = Math.round(rate * minutes / 60);

    const { error } = await supabase.from('time_entries').insert({
      organization_id: organization.id, customer_id: timerCustomerId || null,
      project_name: timerProject || 'Untitled', description: `Timer: ${formatTimer(timerSeconds)}`,
      date: new Date().toISOString().slice(0, 10), duration_minutes: minutes,
      hourly_rate: rate, total_amount: total, is_billable: true, created_by: user.id,
    });

    if (error) toast('Failed: ' + error.message, 'error');
    else { toast(`${minutes} min logged!`, 'success'); fetchEntries(); }
    setTimerSeconds(0);
  }

  function formatTimer(s: number) {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }

  async function handleSave() {
    if (!form.duration_minutes) return;
    setSaving(true);
    const mins = parseInt(form.duration_minutes) || 0;
    const rate = parseInt(form.hourly_rate) || 0;
    const total = Math.round(rate * mins / 60);

    const { error } = await supabase.from('time_entries').insert({
      organization_id: organization.id, customer_id: form.customer_id || null,
      project_name: form.project_name, description: form.description,
      date: form.date, duration_minutes: mins, hourly_rate: rate,
      total_amount: total, is_billable: form.is_billable, created_by: user.id,
    });

    if (error) toast('Failed: ' + error.message, 'error');
    else { toast('Time logged!', 'success'); setShowForm(false); fetchEntries(); }
    setSaving(false);
  }

  async function generateInvoice() {
    const billable = entries.filter(e => e.is_billable && !e.is_invoiced);
    if (billable.length === 0) { toast('No billable time to invoice', 'error'); return; }
    const items = billable.map(e => ({
      description: `${e.project_name || 'Work'}: ${e.description || ''} (${e.duration_minutes} min)`,
      quantity: 1, unit_price: e.total_amount, tax_rate: 0.10,
    }));
    const params = new URLSearchParams({ items: JSON.stringify(items), from_time: 'true' });
    window.location.href = `/invoices/new?${params.toString()}`;
  }

  const totalBillable = entries.filter(e => e.is_billable && !e.is_invoiced).reduce((s, e) => s + (e.total_amount || 0), 0);
  const totalMinutes = entries.filter(e => e.is_billable && !e.is_invoiced).reduce((s, e) => s + (e.duration_minutes || 0), 0);
  const inputClass = 'w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] placeholder-[#999] focus:border-[#4F46E5] focus:outline-none';

  return (
    <div className="space-y-4">
      <PageHeader title="Time Tracking" backPath="/dashboard" />
      <div className="flex items-center justify-between px-4">
        <div><h1 className="text-xl font-semibold text-[#0A0A0A]">Time Tracking</h1><p className="text-xs text-[#999]">{totalMinutes} min unbilled &middot; {formatCurrency(totalBillable, currency)}</p></div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-medium text-white">{showForm ? 'Cancel' : '+ Log Time'}</button>
      </div>

      {/* Live Timer */}
      <div className="rounded-xl border border-[#E5E5E5] bg-white p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-[#999] uppercase tracking-wider">Live Timer</span>
          <span className="font-mono text-2xl font-semibold text-[#0A0A0A]">{formatTimer(timerSeconds)}</span>
        </div>
        {!timerRunning ? (
          <div className="space-y-2">
            <input value={timerProject} onChange={e => setTimerProject(e.target.value)} placeholder="What are you working on?" className={inputClass} />
            <div className="grid grid-cols-2 gap-2">
              <select value={timerCustomerId} onChange={e => setTimerCustomerId(e.target.value)} className={inputClass}>
                <option value="">Client (optional)</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} placeholder="Rate/hr" type="number" className={inputClass} />
            </div>
            <button onClick={startTimer} className="w-full rounded-lg bg-[#16A34A] py-2.5 text-sm font-medium text-white">Start Timer</button>
          </div>
        ) : (
          <button onClick={stopTimer} className="w-full rounded-lg bg-[#DC2626] py-2.5 text-sm font-medium text-white animate-pulse">Stop &amp; Log</button>
        )}
      </div>

      {/* Manual Entry */}
      {showForm && (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Log Time Manually</h3>
          <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} placeholder="Project name" className={inputClass} />
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="What did you do?" className={inputClass} />
          <div className="grid grid-cols-3 gap-2">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className={inputClass} />
            <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} placeholder="Minutes" className={inputClass} />
            <input type="number" value={form.hourly_rate} onChange={e => setForm({ ...form, hourly_rate: e.target.value })} placeholder="Rate/hr" className={inputClass} />
          </div>
          <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className={inputClass}>
            <option value="">Client (optional)</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Log Time'}</button>
        </div>
      )}

      {/* Generate Invoice from Time */}
      {totalBillable > 0 && (
        <button onClick={generateInvoice} className="w-full rounded-xl border-2 border-[#16A34A] bg-[#16A34A]/5 py-3 text-sm font-medium text-[#16A34A]">
          Generate Invoice from {Math.round(totalMinutes / 60 * 10) / 10}h unbilled time ({formatCurrency(totalBillable, currency)})
        </button>
      )}

      {/* Entries */}
      {loading ? <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /></div>
      : entries.length === 0 ? <div className="rounded-xl border border-dashed border-[#E5E5E5] p-8 text-center"><p className="text-sm text-[#999]">No time entries yet</p></div>
      : <div className="space-y-1.5">{entries.map(e => (
          <div key={e.id} className="flex items-center justify-between rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-[#0A0A0A]">{e.project_name || 'Work'}</p>
              <p className="text-[10px] text-[#999]">{e.date} &middot; {e.duration_minutes} min{e.is_invoiced ? ' &middot; Invoiced' : ''}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-medium">{formatCurrency(e.total_amount, currency)}</p>
              <span className={`text-[9px] ${e.is_billable ? 'text-[#16A34A]' : 'text-[#999]'}`}>{e.is_billable ? 'Billable' : 'Non-billable'}</span>
            </div>
          </div>
        ))}</div>}
    </div>
  );
}
