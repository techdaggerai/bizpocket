'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate, getCurrentMonth } from '@/lib/utils';
import Link from 'next/link';

interface TimeEntry {
  id: string;
  organization_id: string;
  description: string;
  date: string;
  duration_minutes: number;
  hourly_rate: number;
  amount: number;
  is_billable: boolean;
  is_invoiced: boolean;
  invoice_id: string | null;
  created_by: string;
  created_at: string;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function padZero(n: number): string {
  return n.toString().padStart(2, '0');
}

export default function TimeTrackingPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerDescription, setTimerDescription] = useState('');
  const [timerRate, setTimerRate] = useState('');
  const [timerBillable, setTimerBillable] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Manual entry state
  const [showManual, setShowManual] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().slice(0, 10));
  const [manualDescription, setManualDescription] = useState('');
  const [manualHours, setManualHours] = useState('');
  const [manualMinutes, setManualMinutes] = useState('');
  const [manualRate, setManualRate] = useState('');
  const [manualBillable, setManualBillable] = useState(true);
  const [savingManual, setSavingManual] = useState(false);

  // Entries state
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch entries for current month
  const fetchEntries = useCallback(async () => {
    const month = getCurrentMonth();
    const { data, error } = await supabase
      .from('time_entries')
      .select('*')
      .eq('organization_id', organization.id)
      .gte('date', month + '-01')
      .lt('date', (() => { const [y, m] = month.split('-').map(Number); const d = new Date(y, m, 1); return d.toISOString().slice(0, 10); })())
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      toast(error.message, 'error');
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Timer interval
  useEffect(() => {
    if (timerRunning) {
      intervalRef.current = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timerRunning]);

  const timerHH = padZero(Math.floor(timerSeconds / 3600));
  const timerMM = padZero(Math.floor((timerSeconds % 3600) / 60));
  const timerSS = padZero(timerSeconds % 60);

  async function handleTimerToggle() {
    if (!timerRunning) {
      // Start
      setTimerRunning(true);
    } else {
      // Stop & save
      setTimerRunning(false);
      const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));
      const rate = parseFloat(timerRate) || 0;
      const amount = (durationMinutes / 60) * rate;

      if (!timerDescription.trim()) {
        toast('Please add a description', 'error');
        return;
      }

      const { error } = await supabase.from('time_entries').insert({
        organization_id: organization.id,
        description: timerDescription.trim(),
        date: new Date().toISOString().slice(0, 10),
        duration_minutes: durationMinutes,
        hourly_rate: rate,
        amount: Math.round(amount * 100) / 100,
        is_billable: timerBillable,
        is_invoiced: false,
        invoice_id: null,
        created_by: user.id,
      });

      if (error) {
        toast(error.message, 'error');
        return;
      }

      toast('Time entry saved', 'success');
      setTimerSeconds(0);
      setTimerDescription('');
      setTimerRate('');
      setTimerBillable(true);
      fetchEntries();
    }
  }

  async function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    if (!manualDescription.trim()) return;

    const h = parseInt(manualHours) || 0;
    const m = parseInt(manualMinutes) || 0;
    const durationMinutes = h * 60 + m;
    if (durationMinutes <= 0) {
      toast('Duration must be greater than 0', 'error');
      return;
    }

    const rate = parseFloat(manualRate) || 0;
    const amount = (durationMinutes / 60) * rate;

    setSavingManual(true);
    const { error } = await supabase.from('time_entries').insert({
      organization_id: organization.id,
      description: manualDescription.trim(),
      date: manualDate,
      duration_minutes: durationMinutes,
      hourly_rate: rate,
      amount: Math.round(amount * 100) / 100,
      is_billable: manualBillable,
      is_invoiced: false,
      invoice_id: null,
      created_by: user.id,
    });

    setSavingManual(false);
    if (error) {
      toast(error.message, 'error');
      return;
    }

    toast('Time entry saved', 'success');
    setManualDescription('');
    setManualHours('');
    setManualMinutes('');
    setManualRate('');
    setManualBillable(true);
    setManualDate(new Date().toISOString().slice(0, 10));
    setShowManual(false);
    fetchEntries();
  }

  async function deleteEntry(id: string) {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) {
      toast(error.message, 'error');
      return;
    }
    toast('Entry deleted', 'success');
    fetchEntries();
  }

  // Summary calculations
  const totalMinutes = entries.reduce((s, e) => s + e.duration_minutes, 0);
  const totalBillable = entries
    .filter((e) => e.is_billable)
    .reduce((s, e) => s + e.amount, 0);
  const unbilledEntries = entries.filter((e) => e.is_billable && !e.is_invoiced);
  const unbilledTotal = unbilledEntries.reduce((s, e) => s + e.amount, 0);

  const inputClass =
    'w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] bg-white';
  const labelClass = 'block text-xs font-medium mb-1' as const;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <h1
          className="text-lg font-semibold"
          style={{ color: 'var(--text-1)' }}
        >
          Time Tracking
        </h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-3)' }}>
          Track billable hours and generate invoices
        </p>
      </div>

      <div className="px-4 pt-4 space-y-4 max-w-lg mx-auto">
        {/* Live Timer Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2
            className="text-sm font-semibold mb-3"
            style={{ color: 'var(--text-1)' }}
          >
            Live Timer
          </h2>

          {/* Clock display */}
          <div className="text-center mb-4">
            <div
              className="text-4xl font-mono font-bold tracking-wider"
              style={{ color: timerRunning ? '#4F46E5' : 'var(--text-1)' }}
            >
              {timerHH}:{timerMM}:{timerSS}
            </div>
          </div>

          {/* Description */}
          <input
            type="text"
            placeholder="What are you working on?"
            value={timerDescription}
            onChange={(e) => setTimerDescription(e.target.value)}
            className={inputClass + ' mb-3'}
            disabled={timerRunning}
          />

          {/* Rate + Billable row */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1">
              <input
                type="number"
                placeholder="Hourly rate"
                value={timerRate}
                onChange={(e) => setTimerRate(e.target.value)}
                className={inputClass}
                min="0"
                step="any"
                disabled={timerRunning}
              />
            </div>
            <button
              type="button"
              onClick={() => !timerRunning && setTimerBillable(!timerBillable)}
              className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
                timerBillable
                  ? 'bg-[#4F46E5] text-white border-[#4F46E5]'
                  : 'bg-gray-100 border-gray-200'
              }`}
              style={!timerBillable ? { color: 'var(--text-3)' } : undefined}
              disabled={timerRunning}
            >
              {timerBillable ? 'Billable' : 'Non-billable'}
            </button>
          </div>

          {/* Start / Stop button */}
          <button
            onClick={handleTimerToggle}
            className={`w-full py-3 rounded-xl text-sm font-semibold text-white transition-colors ${
              timerRunning
                ? 'bg-red-500 active:bg-red-600'
                : 'bg-[#4F46E5] active:bg-[#4338CA]'
            }`}
          >
            {timerRunning ? 'Stop & Save' : 'Start Timer'}
          </button>
        </div>

        {/* Manual Entry Toggle */}
        <button
          onClick={() => setShowManual(!showManual)}
          className="w-full bg-white rounded-xl border border-gray-200 p-3 text-sm font-medium flex items-center justify-between"
          style={{ color: 'var(--text-2)' }}
        >
          <span>Add Manual Entry</span>
          <svg
            className={`w-4 h-4 transition-transform ${showManual ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Manual Entry Form */}
        {showManual && (
          <form
            onSubmit={handleManualSave}
            className="bg-white rounded-xl border border-gray-200 p-4 space-y-3"
          >
            <div>
              <label className={labelClass} style={{ color: 'var(--text-3)' }}>
                Date
              </label>
              <input
                type="date"
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-3)' }}>
                Description
              </label>
              <input
                type="text"
                placeholder="What did you work on?"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelClass} style={{ color: 'var(--text-3)' }}>
                  Hours
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  className={inputClass}
                  min="0"
                />
              </div>
              <div className="flex-1">
                <label className={labelClass} style={{ color: 'var(--text-3)' }}>
                  Minutes
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  className={inputClass}
                  min="0"
                  max="59"
                />
              </div>
            </div>
            <div>
              <label className={labelClass} style={{ color: 'var(--text-3)' }}>
                Hourly Rate
              </label>
              <input
                type="number"
                placeholder="0"
                value={manualRate}
                onChange={(e) => setManualRate(e.target.value)}
                className={inputClass}
                min="0"
                step="any"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>
                Billable
              </span>
              <button
                type="button"
                onClick={() => setManualBillable(!manualBillable)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  manualBillable ? 'bg-[#4F46E5]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    manualBillable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <button
              type="submit"
              disabled={savingManual}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#4F46E5] active:bg-[#4338CA] disabled:opacity-50 transition-colors"
            >
              {savingManual ? 'Saving...' : 'Save Entry'}
            </button>
          </form>
        )}

        {/* Summary Bar */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Total Hours
              </p>
              <p
                className="text-lg font-semibold"
                style={{ color: 'var(--text-1)' }}
              >
                {formatDuration(totalMinutes)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Billable Amount
              </p>
              <p className="text-lg font-semibold" style={{ color: '#4F46E5' }}>
                {formatCurrency(totalBillable, currency)}
              </p>
            </div>
          </div>
          {unbilledEntries.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                Unbilled: {formatCurrency(unbilledTotal, currency)}
              </p>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600"
              >
                {unbilledEntries.length} {unbilledEntries.length === 1 ? 'entry' : 'entries'}
              </span>
            </div>
          )}
        </div>

        {/* Generate Invoice Button */}
        {unbilledEntries.length > 0 && (
          <Link
            href="/invoices/new?from_time=unbilled"
            className="block w-full text-center py-3 rounded-xl text-sm font-semibold text-white bg-[#4F46E5] active:bg-[#4338CA] transition-colors"
          >
            Generate Invoice from Unbilled Time
          </Link>
        )}

        {/* Time Log */}
        <div>
          <h2
            className="text-sm font-semibold mb-2"
            style={{ color: 'var(--text-1)' }}
          >
            This Month
          </h2>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <div className="w-6 h-6 border-2 border-[#4F46E5] border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : entries.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-sm" style={{ color: 'var(--text-3)' }}>
                No time entries this month
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white rounded-xl border border-gray-200 p-3 flex items-start gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p
                        className="text-sm font-medium truncate"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {entry.description}
                      </p>
                      {entry.is_billable && (
                        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#4F46E5]">
                          Billable
                        </span>
                      )}
                      {entry.is_invoiced && (
                        <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-50 text-green-600">
                          Invoiced
                        </span>
                      )}
                    </div>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--text-3)' }}
                    >
                      <span>{formatDate(entry.date)}</span>
                      <span className="w-1 h-1 rounded-full bg-gray-300" />
                      <span>{formatDuration(entry.duration_minutes)}</span>
                      {entry.hourly_rate > 0 && (
                        <>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span>
                            {formatCurrency(entry.hourly_rate, currency)}/hr
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.amount > 0 && (
                      <span
                        className="text-sm font-semibold"
                        style={{ color: 'var(--text-1)' }}
                      >
                        {formatCurrency(entry.amount, currency)}
                      </span>
                    )}
                    {!entry.is_invoiced && (
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors group"
                        title="Delete entry"
                      >
                        <svg
                          className="w-4 h-4 text-gray-400 group-hover:text-red-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
