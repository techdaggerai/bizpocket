'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Invoice, InvoiceItem, InvoiceStatus, Customer } from '@/types/database';

const emptyItem: InvoiceItem = { description: '', quantity: 1, unit_price: 0, amount: 0 };

export default function InvoicesPage() {
  const { organization, user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<InvoiceStatus | 'all'>('all');

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([{ ...emptyItem }]);
  const [invoiceLang, setInvoiceLang] = useState('ja');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [invRes, custRes] = await Promise.all([
      supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('customers')
        .select('*')
        .eq('organization_id', organization.id),
    ]);
    setInvoices(invRes.data || []);
    setCustomers(custRes.data || []);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('new')) {
      setShowForm(true);
    }
  }, []);

  function updateItem(idx: number, field: keyof InvoiceItem, value: string | number) {
    const updated = [...items];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (updated[idx] as any)[field] = value;
    if (field === 'quantity' || field === 'unit_price') {
      updated[idx].amount = updated[idx].quantity * updated[idx].unit_price;
    }
    setItems(updated);
  }

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  async function handleSave(status: InvoiceStatus = 'draft') {
    setSaving(true);

    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);
    const num = String((count || 0) + 1).padStart(4, '0');
    const invoiceNumber = `BP-${num}`;

    let existingCustomer = customers.find((c) => c.name === customerName);
    if (!existingCustomer && customerName) {
      const { data } = await supabase
        .from('customers')
        .insert({ organization_id: organization.id, name: customerName, address: customerAddress, phone: '', email: '', notes: null })
        .select()
        .single();
      if (data) existingCustomer = data;
    }

    const { error } = await supabase.from('invoices').insert({
      organization_id: organization.id,
      invoice_number: invoiceNumber,
      customer_id: existingCustomer?.id || null,
      customer_name: customerName,
      customer_address: customerAddress,
      items: items.filter((i) => i.description),
      subtotal,
      tax,
      total,
      currency,
      status,
      language: invoiceLang,
      created_by: user.id,
    });

    setSaving(false);
    if (error) {
      toast(error.message, 'error');
    } else {
      toast('Invoice created', 'success');
      setShowForm(false);
      setCustomerName('');
      setCustomerAddress('');
      setItems([{ ...emptyItem }]);
      fetchData();
    }
  }

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuOpenId && listRef.current && !((e.target as HTMLElement).closest('[data-menu]'))) {
        setMenuOpenId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

  async function updateStatus(id: string, status: InvoiceStatus) {
    const updateData: Record<string, unknown> = { status };
    if (status === 'sent') updateData.sent_at = new Date().toISOString();
    if (status === 'paid') updateData.paid_at = new Date().toISOString();

    const { error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) toast(error.message, 'error');
    else { toast(`Marked as ${status}`, 'success'); fetchData(); }
  }

  async function handleDeleteInvoice(id: string) {
    // Delete line items first, then the invoice
    await supabase.from('invoice_items').delete().eq('invoice_id', id).eq('organization_id', organization.id);
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('organization_id', organization.id);
    if (error) {
      toast(`Delete failed: ${error.message}`, 'error');
    } else {
      toast('Invoice deleted', 'success');
      setInvoices((prev) => prev.filter((inv) => inv.id !== id));
    }
    setDeleteConfirmId(null);
  }

  const filtered = filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-[var(--bg-3)] text-[var(--text-3)] border-[var(--border-strong)]',
    sent: 'bg-[var(--accent-light)] text-[var(--accent)] border-[var(--accent)]/20',
    paid: 'bg-[var(--green-bg)] text-[var(--green)] border-[var(--green)]/20',
  };

  const inputClass = "w-full rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-3.5 py-2.5 text-base text-[var(--text-1)] placeholder-[var(--text-4)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]";

  return (
    <div className="space-y-4 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text-1)]">{t('invoices.title')}</h1>
          <p className="text-xs text-[var(--text-3)]">{t('invoices.subtitle')}</p>
        </div>
        <a
          href="/invoices/new"
          className="rounded-btn bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition-all hover:bg-[var(--accent-hover)] hover:-translate-y-px"
        >
          {t('invoices.new_invoice')}
        </a>
      </div>

      {/* Create Invoice Form */}
      {showForm && (
        <div className="space-y-4 rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-5">
          <h3 className="text-base font-medium text-[var(--text-1)]">{t('invoices.new_invoice')}</h3>

          {/* Customer */}
          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-3)]">{t('invoices.customer')}</label>
            <input
              list="customer-list"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                const found = customers.find((c) => c.name === e.target.value);
                if (found) setCustomerAddress(found.address);
              }}
              className={inputClass}
              placeholder="Customer name"
              required
            />
            <datalist id="customer-list">
              {customers.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
          </div>
          <input
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className={inputClass}
            placeholder="Customer address"
          />

          {/* Invoice Language */}
          <div>
            <label className="mb-1.5 block text-sm text-[var(--text-3)]">Invoice Language</label>
            <div className="flex gap-2">
              {['en', 'ja', 'ur'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setInvoiceLang(l)}
                  className={`rounded-btn border px-3 py-1.5 text-xs transition-colors ${
                    invoiceLang === l ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]' : 'border-[var(--border-strong)] text-[var(--text-3)]'
                  }`}
                >
                  {l === 'en' ? 'English' : l === 'ja' ? '日本語' : 'اردو'}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="mb-2 block text-sm text-[var(--text-3)]">{t('invoices.items')}</label>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-12 gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="col-span-5 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Qty"
                  className="col-span-2 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <input
                  type="number"
                  value={item.unit_price || ''}
                  onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                  className="col-span-3 rounded-input border border-[var(--border-strong)] bg-[var(--bg)] px-2.5 py-2 text-sm text-[var(--text-1)] placeholder-[var(--text-4)]"
                />
                <div className="col-span-2 flex items-center justify-end font-mono text-sm text-[var(--text-2)]">
                  {formatCurrency(item.amount, currency)}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems([...items, { ...emptyItem }])}
              className="mt-1 text-xs text-[var(--accent)] hover:text-[var(--accent-hover)]"
            >
              + {t('invoices.add_item')}
            </button>
          </div>

          {/* Totals */}
          <div className="space-y-1.5 border-t border-[var(--border)] pt-4">
            <div className="flex justify-between text-sm text-[var(--text-3)]">
              <span>{t('invoices.subtotal')}</span>
              <span className="font-mono">{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-[var(--text-3)]">
              <span>{t('invoices.tax')}</span>
              <span className="font-mono">{formatCurrency(tax, currency)}</span>
            </div>
            <div className="flex justify-between text-base font-medium text-[var(--text-1)]">
              <span>{t('invoices.total')}</span>
              <span className="font-mono">{formatCurrency(total, currency)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || !customerName}
              className="flex-1 rounded-btn border border-[var(--border-strong)] bg-[var(--bg-2)] py-2.5 text-sm font-medium text-[var(--text-2)] hover:text-[var(--text-1)] disabled:opacity-50"
            >
              {t('invoices.save_draft')}
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
      <div className="flex gap-2">
        {(['all', 'draft', 'sent', 'paid'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-btn px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-[var(--accent-light)] text-[var(--accent)]' : 'text-[var(--text-4)] hover:text-[var(--text-2)]'
            }`}
          >
            {f === 'all' ? 'All' : t(`invoices.${f}`)} ({f === 'all' ? invoices.length : invoices.filter((i) => i.status === f).length})
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-8 text-center">
          <p className="text-sm text-[var(--text-3)]">{t('invoices.no_invoices')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="rounded-card border border-[var(--card-border)] bg-[var(--card-bg)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-base font-medium text-[var(--text-1)]">{inv.customer_name}</p>
                  <p className="text-xs text-[var(--text-4)]">{inv.invoice_number} · {formatDate(inv.created_at)}</p>
                </div>
                <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="font-mono text-base font-medium text-[var(--text-1)]">{formatCurrency(inv.total, inv.currency)}</p>
                  <div className="flex items-center gap-1 justify-end">
                    {(inv as any).invoice_type && (inv as any).invoice_type !== 'commercial' && (
                      <span className="inline-block rounded-btn border border-[var(--accent)]/20 bg-[var(--accent-light)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                        {((inv as any).invoice_type as string).toUpperCase()}
                      </span>
                    )}
                    <span className={`inline-block rounded-btn border px-1.5 py-0.5 text-[10px] font-medium ${statusColors[inv.status]}`}>
                      {inv.status.toUpperCase()}
                    </span>
                  </div>
                </div>
                </div>
              </div>
              <div className="mt-2.5 flex items-center gap-2">
                {/* Status actions */}
                {inv.status === 'draft' && (
                  <button onClick={() => updateStatus(inv.id, 'sent')} className="rounded-btn bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--accent-hover)]">
                    Mark Sent
                  </button>
                )}
                {inv.status === 'sent' && (
                  <button onClick={() => updateStatus(inv.id, 'paid')} className="rounded-btn bg-[var(--green)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90">
                    Mark Paid
                  </button>
                )}

                {/* Edit — draft/sent only */}
                {inv.status !== 'paid' ? (
                  <a
                    href={`/invoices/new?edit=${inv.id}`}
                    className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                  >
                    Edit
                  </a>
                ) : (
                  <span className="flex items-center gap-1 rounded-btn border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-4)]" title="Paid invoices are locked">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                    </svg>
                    Locked
                  </span>
                )}

                {/* View */}
                <a
                  href={`/invoices/${inv.id}`}
                  className="rounded-btn border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-light)]"
                >
                  View
                </a>

                {/* 3-dot menu for delete */}
                <div className="relative ml-auto" data-menu>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === inv.id ? null : inv.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-4)] hover:bg-[var(--bg-2)]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                    </svg>
                  </button>
                  {menuOpenId === inv.id && (
                    <div className="absolute right-0 top-8 z-20 w-36 rounded-lg border border-[var(--border)] bg-white py-1 shadow-lg">
                      <a
                        href={`/invoices/${inv.id}`}
                        className="block px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                      >
                        View Detail
                      </a>
                      {inv.status !== 'paid' && (
                        <a
                          href={`/invoices/new?edit=${inv.id}`}
                          className="block px-3 py-2 text-xs text-[var(--text-2)] hover:bg-[var(--bg-2)]"
                        >
                          Edit Invoice
                        </a>
                      )}
                      {deleteConfirmId === inv.id ? (
                        <div className="flex items-center gap-1 px-3 py-2">
                          <button
                            onClick={() => { handleDeleteInvoice(inv.id); setMenuOpenId(null); }}
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
                          onClick={() => setDeleteConfirmId(inv.id)}
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
