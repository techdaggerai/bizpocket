'use client';

import { useState, useEffect, useCallback } from 'react';
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
  }, [organization.id]);

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

    // Auto-generate invoice number
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization.id);
    const num = String((count || 0) + 1).padStart(4, '0');
    const invoiceNumber = `BP-${num}`;

    // Save customer if new
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

  async function updateStatus(id: string, status: InvoiceStatus) {
    const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
    if (error) toast(error.message, 'error');
    else { toast(`Marked as ${status}`, 'success'); fetchData(); }
  }

  const filtered = filter === 'all' ? invoices : invoices.filter((inv) => inv.status === filter);

  const statusColors: Record<InvoiceStatus, string> = {
    draft: 'bg-gray-500/10 text-gray-400 border-gray-600',
    sent: 'bg-blue-500/10 text-blue-400 border-blue-600',
    paid: 'bg-green-500/10 text-green-400 border-green-600',
  };

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">{t('invoices.title')}</h1>
          <p className="text-xs text-gray-400">{t('invoices.subtitle')}</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-gray-950 hover:bg-amber-400 transition-colors"
        >
          {showForm ? t('common.cancel') : t('invoices.new_invoice')}
        </button>
      </div>

      {/* Create Invoice Form */}
      {showForm && (
        <div className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <h3 className="text-sm font-semibold text-white">{t('invoices.new_invoice')}</h3>

          {/* Customer */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">{t('invoices.customer')}</label>
            <input
              list="customer-list"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                const found = customers.find((c) => c.name === e.target.value);
                if (found) setCustomerAddress(found.address);
              }}
              className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500"
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
            className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder-gray-500"
            placeholder="Customer address"
          />

          {/* Invoice Language */}
          <div>
            <label className="mb-1 block text-xs text-gray-400">Invoice Language</label>
            <div className="flex gap-2">
              {['en', 'ja', 'ur'].map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setInvoiceLang(l)}
                  className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                    invoiceLang === l ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-gray-700 text-gray-400'
                  }`}
                >
                  {l === 'en' ? 'English' : l === 'ja' ? '日本語' : 'اردو'}
                </button>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div>
            <label className="mb-2 block text-xs text-gray-400">{t('invoices.items')}</label>
            {items.map((item, idx) => (
              <div key={idx} className="mb-2 grid grid-cols-12 gap-2">
                <input
                  value={item.description}
                  onChange={(e) => updateItem(idx, 'description', e.target.value)}
                  placeholder="Description"
                  className="col-span-5 rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-white placeholder-gray-500"
                />
                <input
                  type="number"
                  value={item.quantity || ''}
                  onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                  placeholder="Qty"
                  className="col-span-2 rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-white placeholder-gray-500"
                />
                <input
                  type="number"
                  value={item.unit_price || ''}
                  onChange={(e) => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                  placeholder="Price"
                  className="col-span-3 rounded-lg border border-gray-700 bg-gray-800 px-2 py-2 text-sm text-white placeholder-gray-500"
                />
                <div className="col-span-2 flex items-center justify-end text-sm text-gray-300">
                  {formatCurrency(item.amount, currency)}
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems([...items, { ...emptyItem }])}
              className="mt-1 text-xs text-amber-400 hover:text-amber-300"
            >
              + {t('invoices.add_item')}
            </button>
          </div>

          {/* Totals */}
          <div className="space-y-1 border-t border-gray-700 pt-3">
            <div className="flex justify-between text-sm text-gray-400">
              <span>{t('invoices.subtotal')}</span>
              <span>{formatCurrency(subtotal, currency)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>{t('invoices.tax')}</span>
              <span>{formatCurrency(tax, currency)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-white">
              <span>{t('invoices.total')}</span>
              <span>{formatCurrency(total, currency)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => handleSave('draft')}
              disabled={saving || !customerName}
              className="flex-1 rounded-lg border border-gray-600 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-800 disabled:opacity-50"
            >
              {t('invoices.save_draft')}
            </button>
            <button
              onClick={() => handleSave('sent')}
              disabled={saving || !customerName}
              className="flex-1 rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-gray-950 hover:bg-amber-400 disabled:opacity-50"
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f ? 'bg-amber-500/20 text-amber-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {f === 'all' ? 'All' : t(`invoices.${f}`)} ({f === 'all' ? invoices.length : invoices.filter((i) => i.status === f).length})
          </button>
        ))}
      </div>

      {/* Invoice List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-gray-800 bg-gray-900/50 p-8 text-center text-sm text-gray-500">
          {t('invoices.no_invoices')}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => (
            <div key={inv.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-white">{inv.customer_name}</p>
                  <p className="text-xs text-gray-500">{inv.invoice_number} · {formatDate(inv.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(inv.total, inv.currency)}</p>
                  <span className={`inline-block rounded border px-1.5 py-0.5 text-[10px] ${statusColors[inv.status]}`}>
                    {inv.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                {inv.status === 'draft' && (
                  <button onClick={() => updateStatus(inv.id, 'sent')} className="text-xs text-blue-400 hover:text-blue-300">
                    Mark Sent
                  </button>
                )}
                {inv.status === 'sent' && (
                  <button onClick={() => updateStatus(inv.id, 'paid')} className="text-xs text-green-400 hover:text-green-300">
                    Mark Paid
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
