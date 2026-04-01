'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';

type EstimateStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'converted';

interface EstimateItem {
  description: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  amount: number;
}

interface Estimate {
  id: string;
  organization_id: string;
  estimate_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_address: string;
  items: EstimateItem[];
  subtotal: number;
  discount_amount: number;
  tax: number;
  total: number;
  notes: string;
  status: EstimateStatus;
  validity_days: number;
  share_token: string | null;
  currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface Customer {
  id: string;
  name: string;
  address: string;
}

const emptyItem: EstimateItem = { description: '', quantity: 1, unit_price: 0, discount_percent: 0, amount: 0 };

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) token += chars.charAt(Math.floor(Math.random() * chars.length));
  return token;
}

export default function EstimatesPage() {
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<EstimateStatus | 'all'>('all');

  // Form state
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<EstimateItem[]>([{ ...emptyItem }]);
  const [notes, setNotes] = useState('');
  const [validityDays, setValidityDays] = useState(30);

  // UI state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [estRes, custRes] = await Promise.all([
      supabase
        .from('estimates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id),
    ]);
    setEstimates(estRes.data || []);
    setCustomers(custRes.data || []);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuOpenId && !(e.target as HTMLElement).closest('[data-menu]')) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  function updateItem(idx: number, field: keyof EstimateItem, value: string | number) {
    const updated = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[idx] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_percent') {
      const base = updated[idx].quantity * updated[idx].unit_price;
      const disc = updated[idx].discount_percent || 0;
      updated[idx].amount = Math.round(base * (1 - disc / 100));
    }
    setItems(updated);
  }

  function removeItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const discountAmount = items.reduce((s, i) => {
    const base = i.quantity * i.unit_price;
    return s + Math.round(base * (i.discount_percent || 0) / 100);
  }, 0);
  const afterDiscount = subtotal - discountAmount;
  const tax = Math.round(afterDiscount * 0.1);
  const total = afterDiscount + tax;

  function resetForm() {
    setCustomerId(null);
    setCustomerName('');
    setCustomerAddress('');
    setItems([{ ...emptyItem }]);
    setNotes('');
    setValidityDays(30);
  }

  async function handleSave(status: EstimateStatus = 'draft') {
    setSaving(true);

    const { count } = await supabase
      .from('estimates')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);
    const num = String((count || 0) + 1).padStart(4, '0');
    const estimateNumber = `EST-${num}`;

    // Auto-create customer if new
    let resolvedCustomerId = customerId;
    if (!resolvedCustomerId && customerName) {
      const existing = customers.find((c) => c.name === customerName);
      if (existing) {
        resolvedCustomerId = existing.id;
      } else {
        const { data } = await supabase
          .from('customers')
          .insert({ organization_id: organization.id, name: customerName, address: customerAddress, phone: '', email: '', notes: null })
          .select()
          .single();
        if (data) resolvedCustomerId = data.id;
      }
    }

    const shareToken = status === 'sent' ? generateToken() : null;

    const { error } = await supabase.from('estimates').insert({
      organization_id: organization.id,
      estimate_number: estimateNumber,
      customer_id: resolvedCustomerId,
      customer_name: customerName,
      customer_address: customerAddress,
      items: items.filter((i) => i.description),
      subtotal,
      discount_amount: discountAmount,
      tax,
      total,
      notes,
      status,
      validity_days: validityDays,
      share_token: shareToken,
      currency,
      created_by: user.id,
    });

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Estimate created', 'success');
      setShowForm(false);
      resetForm();
      fetchData();
    }
  }

  async function updateStatus(id: string, status: EstimateStatus) {
    const updateData: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'sent') updateData.share_token = generateToken();

    const { error } = await supabase
      .from('estimates')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) toast(error.message, 'error');
    else { toast(`Marked as ${status}`, 'success'); fetchData(); }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from('estimates')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) {
      toast(`Delete failed: ${error.message}`, 'error');
    } else {
      toast('Estimate deleted', 'success');
      setEstimates((prev) => prev.filter((e) => e.id !== id));
    }
    setDeleteConfirmId(null);
  }

  async function handleShareLink(est: Estimate) {
    let token = est.share_token;
    if (!token) {
      token = generateToken();
      await supabase
        .from('estimates')
        .update({ share_token: token, status: 'sent', updated_at: new Date().toISOString() })
        .eq('id', est.id)
        .eq('organization_id', organization.id);
      fetchData();
    }
    // Generate a shareable reference (public estimate page coming soon)
    const url = `${window.location.origin}/estimates?view=${token}`;
    await navigator.clipboard.writeText(url);
    toast('Estimate link copied — public view coming soon', 'success');
  }

  function handleDuplicate(est: Estimate) {
    setCustomerId(est.customer_id);
    setCustomerName(est.customer_name);
    setCustomerAddress(est.customer_address);
    setItems((est.items || []).map((i: EstimateItem) => ({ ...i })));
    setNotes(est.notes || '');
    setValidityDays(est.validity_days || 30);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const filtered = filter === 'all' ? estimates : estimates.filter((e) => e.status === filter);

  const statusColors: Record<EstimateStatus, string> = {
    draft: 'bg-[var(--bg-3)] text-[var(--text-3)] border-[var(--border-strong)]',
    sent: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/20',
    approved: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
    rejected: 'bg-red-50 text-red-600 border-red-200',
    converted: 'bg-purple-50 text-purple-600 border-purple-200',
  };

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">Estimates</h1>
          <p className="text-xs text-[var(--text-3)]">Create and manage quotes for your customers</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="rounded-btn bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
        >
          {showForm ? 'Cancel' : 'New Estimate'}
        </button>
      </div>

      {/* Create Estimate Form */}
      {showForm && (
        <div className="space-y-4 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="text-base font-medium text-[var(--text-1)]">New Estimate</h3>

          {/* Customer */}
          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-3)]">Customer</label>
            <input
              list="est-customer-list"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                const found = customers.find((c) => c.name === e.target.value);
                if (found) {
                  setCustomerId(found.id);
                  setCustomerAddress(found.address || '');
                } else {
                  setCustomerId(null);
                }
              }}
              className={inputClass}
              placeholder="Customer name"
              required
            />
            <datalist id="est-customer-list">
              {customers.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <input
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className={inputClass}
            placeholder="Customer address"
          />

          {/* Line Items */}
          <div>
            <label className="mb-2 block text-sm text-[var(--text-3)]">Line Items</label>
            {/* Column headers - hidden on small screens */}
            <div className="mb-1 hidden grid-cols-12 gap-2 text-[10px] font-medium uppercase tracking-wide text-[var(--text-4)] sm:grid">
              <span className="col-span-4">Description</span>
              <span className="col-span-2">Qty</span>
              <span className="col-span-2">Unit Price</span>
              <span className="col-span-2">Discount %</span>
              <span className="col-span-2 text-right">Amount</span>
            </div>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-12 gap-2 items-center">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="col-span-12 sm:col-span-4 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Qty"
                  className="col-span-3 sm:col-span-2 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <input
                  type="number"
                  value={item.unit_price || ''}
                  onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                  className="col-span-3 sm:col-span-2 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <input
                  type="number"
                  value={item.discount_percent || ''}
                  onChange={(e) => updateItem(idx, 'discount_percent', parseFloat(e.target.value) || 0)}
                  placeholder="Disc %"
                  min="0"
                  max="100"
                  className="col-span-3 sm:col-span-2 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <div className="col-span-3 sm:col-span-2 flex items-center justify-end gap-1">
                  <span className="font-mono text-sm text-[var(--text-2)]">
                    {formatCurrency(item.amount, currency)}
                  </span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[var(--text-4)] hover:bg-red-50 hover:text-red-500"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems([...items, { ...emptyItem }])}
              className="mt-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              + Add Item
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-3)]">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass + ' min-h-[80px] resize-y'}
              placeholder="Additional notes or terms..."
              rows={3}
            />
          </div>

          {/* Validity */}
          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-3)]">Valid for (days)</label>
            <input
              type="number"
              value={validityDays}
              onChange={(e) => setValidityDays(parseInt(e.target.value) || 30)}
              className={inputClass + ' max-w-[120px]'}
              min={1}
            />
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-t border-[var(--border)] pt-4">
            <div className="flex justify-between text-sm text-[var(--text-3)]">
              <span>Subtotal</span>
              <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-[var(--text-3)]">
                <span>Discount</span>
                <span className="font-mono text-red-500">-{formatCurrency(discountAmount, currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-[var(--text-3)]">
              <span>Tax (10%)</span>
              <span className="font-mono">{formatCurrency(tax, currency)}</span>
            </div>
            <div className="flex justify-between text-base font-medium text-[var(--text-1)]">
              <span>Total</span>
              <span className="font-mono">{formatCurrency(total, currency)}</span>
            </div>
          </div>

          {/* Save Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || !customerName}
              className="flex-1 rounded-btn border border-[var(--border-strong)] bg-[var(--bg-2)] py-2.5 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-50"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave('sent')}
              disabled={saving || !customerName}
              className="flex-1 rounded-btn bg-[var(--accent)] py-2.5 text-sm font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-50"
            >
              Save & Send
            </button>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {(['all', 'draft', 'sent', 'approved', 'rejected', 'converted'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`whitespace-nowrap rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-4)] hover:text-[var(--text-2)]'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? estimates.length : estimates.filter((e) => e.status === f).length})
          </button>
        ))}
      </div>

      {/* Estimate List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">No estimates yet</p>
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="mt-3 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            Create your first estimate
          </button>
        </div>
      ) : (
        <div ref={listRef} className="space-y-2">
          {filtered.map((est) => (
            <div key={est.id} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-medium text-[var(--text-1)]">{est.customer_name}</p>
                  <p className="text-xs text-[var(--text-4)]">
                    {est.estimate_number} · {formatDate(est.created_at)}
                    {est.validity_days && (
                      <span className="ml-1">· Valid {est.validity_days} days</span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-base font-medium text-[var(--text-1)]">{formatCurrency(est.total, est.currency)}</p>
                  <span className={`inline-block rounded-btn border px-1.5 py-0.5 text-[10px] font-medium ${statusColors[est.status]}`}>
                    {est.status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Discount / notes summary */}
              {(est.discount_amount > 0 || est.notes) && (
                <div className="mt-1.5 flex flex-wrap gap-2 text-[11px] text-[var(--text-4)]">
                  {est.discount_amount > 0 && (
                    <span>Discount: -{formatCurrency(est.discount_amount, est.currency)}</span>
                  )}
                  {est.notes && (
                    <span className="truncate max-w-[200px]">{est.notes}</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {/* Status transitions */}
                {est.status === 'draft' && (
                  <button
                    onClick={() => handleShareLink(est)}
                    className="rounded-btn bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    Send
                  </button>
                )}
                {est.status === 'sent' && (
                  <>
                    <button
                      onClick={() => updateStatus(est.id, 'approved')}
                      className="rounded-btn bg-[var(--green)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => updateStatus(est.id, 'rejected')}
                      className="rounded-btn border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </>
                )}
                {est.status === 'approved' && (
                  <a
                    href={`/invoices/new?from_estimate=${est.id}`}
                    className="rounded-btn bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700"
                  >
                    Convert to Invoice
                  </a>
                )}

                {/* Share link (always available except converted) */}
                {est.status !== 'converted' && (
                  <button
                    onClick={() => handleShareLink(est)}
                    className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                  >
                    <span className="flex items-center gap-1">
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.5 8.688" />
                      </svg>
                      Copy Link
                    </span>
                  </button>
                )}

                {/* Duplicate */}
                <button
                  onClick={() => handleDuplicate(est)}
                  className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                >
                  Duplicate
                </button>

                {/* 3-dot menu */}
                <div className="relative ml-auto" data-menu>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === est.id ? null : est.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-4)] hover:bg-[var(--bg-2)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                  </button>
                  {menuOpenId === est.id && (
                    <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg">
                      {est.status === 'draft' && (
                        <button
                          onClick={() => { updateStatus(est.id, 'sent'); setMenuOpenId(null); }}
                          className="block w-full px-3 py-2 text-left text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                        >
                          Mark as Sent
                        </button>
                      )}
                      {est.status === 'sent' && (
                        <>
                          <button
                            onClick={() => { updateStatus(est.id, 'approved'); setMenuOpenId(null); }}
                            className="block w-full px-3 py-2 text-left text-xs text-[var(--green)] hover:bg-[var(--bg-2)]"
                          >
                            Mark Approved
                          </button>
                          <button
                            onClick={() => { updateStatus(est.id, 'rejected'); setMenuOpenId(null); }}
                            className="block w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-[var(--bg-2)]"
                          >
                            Mark Rejected
                          </button>
                        </>
                      )}
                      {est.status === 'approved' && (
                        <a
                          href={`/invoices/new?from_estimate=${est.id}`}
                          className="block px-3 py-2 text-xs text-purple-600 hover:bg-[var(--bg-2)]"
                        >
                          Convert to Invoice
                        </a>
                      )}
                      <button
                        onClick={() => { handleDuplicate(est); setMenuOpenId(null); }}
                        className="block w-full px-3 py-2 text-left text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                      >
                        Duplicate
                      </button>
                      <button
                        onClick={() => { handleShareLink(est); setMenuOpenId(null); }}
                        className="block w-full px-3 py-2 text-left text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                      >
                        Copy Share Link
                      </button>
                      <div className="my-1 border-t border-[var(--border)]" />
                      {deleteConfirmId === est.id ? (
                        <div className="flex items-center gap-1 px-3 py-2">
                          <button
                            onClick={() => { handleDelete(est.id); setMenuOpenId(null); }}
                            className="rounded bg-[#DC2626] px-2 py-1 text-[10px] font-medium text-white"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-[10px] text-[var(--text-4)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(est.id)}
                          className="block w-full px-3 py-2 text-left text-xs text-[#DC2626] hover:bg-[var(--bg-2)]"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
