'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import type { PlannerEvent, PlannerEventType } from '@/types/database';

const EVENT_TYPES: { value: PlannerEventType; label: string; dot: string }[] = [
  { value: 'incoming_payment', label: 'Incoming Payment', dot: 'bg-[#16A34A]' },
  { value: 'upcoming_expense', label: 'Upcoming Expense', dot: 'bg-[#DC2626]' },
  { value: 'meeting', label: 'Meeting', dot: 'bg-[#0EA5E9]' },
  { value: 'shipment', label: 'Shipment', dot: 'bg-[#7C3AED]' },
  { value: 'invoice_due', label: 'Invoice Due', dot: 'bg-[#4F46E5]' },
  { value: 'tax_deadline', label: 'Tax Deadline', dot: 'bg-[#F59E0B]' },
  { value: 'recurring', label: 'Recurring', dot: 'bg-[#8B5CF6]' },
  { value: 'other', label: 'Other', dot: 'bg-[#6B7280]' },
];

const DOT_MAP: Record<string, string> = Object.fromEntries(EVENT_TYPES.map((t) => [t.value, t.dot]));

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diff));
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(monday);
    dd.setDate(monday.getDate() + i);
    return dd;
  });
}

function getMonthDates(date: Date): Date[] {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const dates: Date[] = [];
  for (let i = -startOffset; i <= lastDay.getDate() + (6 - (lastDay.getDay() === 0 ? 6 : lastDay.getDay() - 1)); i++) {
    dates.push(new Date(year, month, i + 1));
  }
  return dates;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isToday(d: Date): boolean {
  return dateStr(d) === dateStr(new Date());
}

const emptyForm = {
  title: '',
  event_type: 'other' as PlannerEventType,
  amount: '',
  event_date: new Date().toISOString().slice(0, 10),
  event_time: '',
  notes: '',
  is_recurring: false,
  recurring_frequency: 'monthly',
};

export default function PlannerPage() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const dates = view === 'week' ? getWeekDates(currentDate) : getMonthDates(currentDate);
    const start = dateStr(dates[0]);
    const end = dateStr(dates[dates.length - 1]);

    const { data, error } = await supabase
      .from('planner_events')
      .select('*')
      .eq('organization_id', organization.id)
      .gte('event_date', start)
      .lte('event_date', end)
      .order('event_date', { ascending: true });

    if (error) toast(error.message, 'error');
    else setEvents(data || []);
    setLoading(false);
  }, [organization.id, supabase, view, currentDate, toast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Fetch AI summary for current week
  const fetchAiSummary = useCallback(async () => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return;
    setAiLoading(true);
    try {
      const weekDates = getWeekDates(currentDate);
      const start = dateStr(weekDates[0]);
      const end = dateStr(weekDates[6]);

      const { data: weekEvents } = await supabase
        .from('planner_events')
        .select('*')
        .eq('organization_id', organization.id)
        .gte('event_date', start)
        .lte('event_date', end)
        .order('event_date', { ascending: true });

      const { data: flows } = await supabase
        .from('cash_flows')
        .select('amount, flow_type')
        .eq('organization_id', organization.id)
        .gte('date', new Date().toISOString().slice(0, 7) + '-01')
        .lte('date', new Date().toISOString().slice(0, 7) + '-31');

      const totalIn = (flows || []).filter((f) => f.flow_type === 'IN').reduce((s, f) => s + f.amount, 0);
      const totalOut = (flows || []).filter((f) => f.flow_type === 'OUT').reduce((s, f) => s + f.amount, 0);

      if (!weekEvents || weekEvents.length === 0) {
        setAiSummary('No events planned this week. Add events to get AI-powered insights.');
        setAiLoading(false);
        return;
      }

      const expectedIn = weekEvents.filter((e) => e.event_type === 'incoming_payment').reduce((s, e) => s + (e.amount || 0), 0);
      const expectedOut = weekEvents.filter((e) => ['upcoming_expense', 'tax_deadline'].includes(e.event_type)).reduce((s, e) => s + (e.amount || 0), 0);

      const lines = [
        `This week: ${weekEvents.length} event${weekEvents.length !== 1 ? 's' : ''}`,
        expectedIn > 0 ? `Expected in: ${formatCurrency(expectedIn, currency)}` : null,
        expectedOut > 0 ? `Going out: ${formatCurrency(expectedOut, currency)}` : null,
        expectedIn > 0 || expectedOut > 0 ? `Net this week: ${expectedIn - expectedOut >= 0 ? '+' : ''}${formatCurrency(expectedIn - expectedOut, currency)}` : null,
        `Current month balance: ${formatCurrency(totalIn - totalOut, currency)}`,
      ].filter(Boolean);

      setAiSummary(lines.join('\n'));
    } catch {
      setAiSummary(null);
    }
    setAiLoading(false);
  }, [currentDate, organization.id, supabase, currency]);

  useEffect(() => { fetchAiSummary(); }, [fetchAiSummary]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);

    const payload = {
      organization_id: organization.id,
      title: form.title.trim(),
      event_type: form.event_type,
      amount: form.amount ? parseInt(form.amount) : null,
      currency,
      event_date: form.event_date,
      event_time: form.event_time || null,
      notes: form.notes || null,
      is_recurring: form.is_recurring,
      recurring_frequency: form.is_recurring ? form.recurring_frequency : null,
      reminder_date: form.event_date ? new Date(new Date(form.event_date).getTime() - 86400000).toISOString().slice(0, 10) : null,
      status: 'pending',
    };

    const { error } = await supabase.from('planner_events').insert(payload);
    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Event added', 'success');
      setForm(emptyForm);
      setShowForm(false);
      fetchEvents();
      fetchAiSummary();
    }
  }

  async function updateEventStatus(id: string, status: string) {
    await supabase.from('planner_events').update({ status }).eq('id', id);
    fetchEvents();
  }

  async function deleteEvent(id: string) {
    await supabase.from('planner_events').delete().eq('id', id);
    toast('Event deleted', 'success');
    fetchEvents();
  }

  function navigate(dir: -1 | 1) {
    const d = new Date(currentDate);
    if (view === 'week') d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  }

  const weekDates = getWeekDates(currentDate);
  const monthDates = getMonthDates(currentDate);
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const eventsByDate = events.reduce<Record<string, PlannerEvent[]>>((acc, e) => {
    const d = e.event_date;
    if (!acc[d]) acc[d] = [];
    acc[d].push(e);
    return acc;
  }, {});

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">Planner</h1>
          <p className="text-xs text-[var(--text-3)]">Command Calendar</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-btn bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
        >
          {showForm ? 'Cancel' : 'Add Event'}
        </button>
      </div>

      {/* AI Summary */}
      {aiLoading ? (
        <div className="rounded-card border border-[#E5E5E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" />
            <span className="text-xs font-medium text-[#4F46E5]">AI Planner Summary</span>
          </div>
        </div>
      ) : aiSummary ? (
        <div className="rounded-card border border-[#E5E5E5] bg-gradient-to-br from-[rgba(79,70,229,0.04)] to-[rgba(79,70,229,0.08)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <svg className="h-4 w-4 text-[#4F46E5]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
            </svg>
            <span className="text-xs font-medium text-[#4F46E5]">AI Planner Summary</span>
          </div>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--text-2)]">{aiSummary}</p>
        </div>
      ) : null}

      {/* View Toggle + Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button onClick={() => setView('week')} className={`rounded-btn px-3 py-1.5 text-xs font-medium ${view === 'week' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>Week</button>
          <button onClick={() => setView('month')} className={`rounded-btn px-3 py-1.5 text-xs font-medium ${view === 'month' ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>Month</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 hover:bg-[var(--bg-2)]">
            <svg className="h-4 w-4 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={() => setCurrentDate(new Date())} className="rounded-btn border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text-2)]">Today</button>
          <button onClick={() => navigate(1)} className="rounded-full p-1.5 hover:bg-[var(--bg-2)]">
            <svg className="h-4 w-4 text-[var(--text-3)]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>

      {/* Add Event Form */}
      {showForm && (
        <form onSubmit={handleSave} className="space-y-3 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="text-base font-medium text-[var(--text-1)]">New Event</h3>

          <div className="grid grid-cols-4 gap-1.5">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm({ ...form, event_type: t.value })}
                className={`flex items-center gap-1.5 rounded-btn border px-2 py-1.5 text-[11px] transition-colors ${
                  form.event_type === t.value
                    ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]'
                    : 'border-[var(--border)] text-[var(--text-3)]'
                }`}
              >
                <div className={`h-2 w-2 rounded-full ${t.dot}`} />
                {t.label.split(' ')[0]}
              </button>
            ))}
          </div>

          <input
            placeholder="Event title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={inputClass}
            required
          />

          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} className={inputClass} required />
            <input type="time" value={form.event_time} onChange={(e) => setForm({ ...form, event_time: e.target.value })} className={inputClass} />
          </div>

          <input
            type="number"
            inputMode="numeric"
            placeholder="Amount (optional)"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className={inputClass}
          />

          <input
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className={inputClass}
          />

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => setForm({ ...form, is_recurring: !form.is_recurring })}
              className={`relative h-6 w-11 rounded-full transition-colors ${form.is_recurring ? 'bg-[var(--accent)]' : 'bg-[var(--bg-3)]'}`}
            >
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${form.is_recurring ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-sm text-[var(--text-2)]">Recurring</span>
          </label>

          <button type="submit" disabled={saving} className="w-full rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Event'}
          </button>
        </form>
      )}

      {/* Calendar */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : view === 'week' ? (
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--text-2)]">
            {weekDates[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {weekDates[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="space-y-2">
            {weekDates.map((d, i) => {
              const ds = dateStr(d);
              const dayEvents = eventsByDate[ds] || [];
              const today = isToday(d);
              return (
                <div key={ds} className={`rounded-card border p-3 ${today ? 'border-[var(--accent)] bg-[rgba(79,70,229,0.03)]' : 'border-[var(--card-border)] bg-[var(--card-bg)]'}`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${today ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}>{dayNames[i]}</span>
                      <span className={`font-mono text-sm ${today ? 'font-bold text-[var(--accent)]' : 'text-[var(--text-1)]'}`}>{d.getDate()}</span>
                    </div>
                    {today && <span className="rounded-btn bg-[var(--accent)] px-1.5 py-0.5 text-[10px] font-medium text-white">Today</span>}
                  </div>
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-[var(--text-4)]">No events</p>
                  ) : (
                    <div className="space-y-1.5">
                      {dayEvents.map((evt) => (
                        <div key={evt.id} className="flex items-center justify-between rounded-lg bg-white p-2 border border-[var(--border)]">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${DOT_MAP[evt.event_type] || 'bg-[#6B7280]'}`} />
                            <div className="min-w-0">
                              <p className={`text-sm truncate ${evt.status === 'completed' ? 'line-through text-[var(--text-4)]' : 'text-[var(--text-1)]'}`}>{evt.title}</p>
                              <div className="flex items-center gap-2">
                                {evt.event_time && <span className="text-[10px] text-[var(--text-4)]">{evt.event_time.slice(0, 5)}</span>}
                                {evt.amount && <span className="font-mono text-[10px] text-[var(--text-3)]">{formatCurrency(evt.amount, evt.currency || currency)}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            {evt.status === 'pending' && (
                              <button onClick={() => updateEventStatus(evt.id, 'completed')} className="text-[10px] text-[var(--green)] hover:opacity-80">Done</button>
                            )}
                            <button onClick={() => deleteEvent(evt.id)} className="text-[10px] text-[var(--text-4)] hover:text-[var(--red)]">Del</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div>
          <p className="mb-3 text-sm font-medium text-[var(--text-2)]">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <div className="grid grid-cols-7 gap-px bg-[var(--border)] rounded-card overflow-hidden border border-[var(--border)]">
            {dayNames.map((d) => (
              <div key={d} className="bg-[var(--bg-2)] py-1.5 text-center text-[10px] font-medium text-[var(--text-4)]">{d}</div>
            ))}
            {monthDates.map((d) => {
              const ds = dateStr(d);
              const dayEvents = eventsByDate[ds] || [];
              const today = isToday(d);
              const isCurrentMonth = d.getMonth() === currentDate.getMonth();
              return (
                <div
                  key={ds}
                  className={`min-h-[60px] bg-white p-1 ${!isCurrentMonth ? 'opacity-40' : ''}`}
                >
                  <span className={`text-[11px] ${today ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)] text-white font-bold' : 'text-[var(--text-2)]'}`}>
                    {d.getDate()}
                  </span>
                  {dayEvents.slice(0, 2).map((evt) => (
                    <div key={evt.id} className="mt-0.5 flex items-center gap-0.5">
                      <div className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_MAP[evt.event_type] || 'bg-[#6B7280]'}`} />
                      <span className="truncate text-[9px] text-[var(--text-3)]">{evt.title}</span>
                    </div>
                  ))}
                  {dayEvents.length > 2 && (
                    <span className="text-[9px] text-[var(--text-4)]">+{dayEvents.length - 2}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
