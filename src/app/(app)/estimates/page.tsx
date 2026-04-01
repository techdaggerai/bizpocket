'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { Customer } from '@/types/database';

interface LineItem { description: string; quantity: number; unit_price: number; tax_rate: number; }

const statusColors: Record<string, string> = {
  draft: 'bg-[#F5F5F5] text-[#666]', sent: 'bg-[#EEF2FF] text-[#4F46E5]',
  approved: 'bg-[#F0FDF4] text-[#16A34A]', declined: 'bg-[#FEF2F2] text-[#DC2626]',
  converted: 'bg-[#F5F3FF] text-[#7C3AED]',
};

export default function EstimatesPage() {
  const router = useRouter();
  const { organization, user } = useAuth();
  const { toast } = useToast();
  const supabase = createClient();
  const currency = organization.currency || 'JPY';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [estimates, setEstimates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10); });
  const [items, setItems] = useState<LineItem[]>([{ description: '', quantity: 1, unit_price: 0, tax_rate: 0.10 }]);
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState('none');
  const [discountValue, setDiscountValue] = useState('');

  const fetchEstimates = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('estimates').select('*').eq('organization_id', organization.id).order('created_at', { ascending: false });
    setEstimates(data || []);
    setLoading(false);
  }, [organization.id, supabase]);

  useEffect(() => { fetchEstimates(); supabase.from('customers').select('*').eq('organization_id', organization.id).order('name').then(({ data }) => setCustomers(data || [])); }, [fetchEstimates, organization.id, supabase]);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const taxTotal = items.reduce((s, i) => s + Math.round(i.quantity * i.unit_price * i.tax_rate), 0);
  const discountAmt = discountType === 'percentage' ? Math.round(subtotal * (parseFloat(discountValue) || 0) / 100) : discountType === 'fixed' ? (parseFloat(discountValue) || 0) : 0;
  const total = subtotal + taxTotal - discountAmt;

  async function handleSave() {
    if (!customerName.trim()) return;
    setSaving(true);
    const count = estimates.length + 1;
    const estNum = `EST/${organization.name?.slice(0, 3).toUpperCase() || 'BIZ'}/${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(count).padStart(4, '0')}`;
    const selectedCust = customers.find(c => c.id === selectedCustomerId);
    const { error } = await supabase.from('estimates').insert({
      organization_id: organization.id, estimate_number: estNum, customer_id: selectedCustomerId || null,
      customer_name: customerName, customer_address: selectedCust?.address || '', customer_email: selectedCust?.email || '',
      date, valid_until: validUntil, currency, items: items.filter(i => i.description.trim()),
      subtotal, tax_amount: taxTotal, discount_type: discountType, discount_value: parseFloat(discountValue) || 0,
      discount_amount: discountAmt, total, notes, status: 'draft', created_by: user.id,
    });
    if (error) toast('Failed: ' + error.message, 'error');
    else { toast('Estimate created!', 'success'); setShowForm(false); fetchEstimates(); }
    setSaving(false);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function convertToInvoice(est: any) {
    const params = new URLSearchParams({ from_estimate: est.id, customer_name: est.customer_name, customer_id: est.customer_id || '', items: JSON.stringify(est.items), notes: est.notes || '' });
    router.push(`/invoices/new?${params.toString()}`);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function sendEstimate(est: any) {
    await supabase.from('estimates').update({ status: 'sent' }).eq('id', est.id);
    const link = `${window.location.origin}/e/${est.share_token}`;
    await navigator.clipboard.writeText(link);
    toast('Link copied! Share with your client.', 'success');
    fetchEstimates();
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async function duplicateEstimate(est: any) {
    const count = estimates.length + 1;
    const estNum = `EST/${organization.name?.slice(0, 3).toUpperCase() || 'BIZ'}/${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(count).padStart(4, '0')}`;
    const { id, estimate_number, share_token, created_at, updated_at, ...rest } = est;
    await supabase.from('estimates').insert({ ...rest, estimate_number: estNum, status: 'draft' });
    toast('Duplicated!', 'success'); fetchEstimates();
  }
  async function deleteEstimate(id: string) {
    if (!confirm('Delete this estimate?')) return;
    await supabase.from('estimates').delete().eq('id', id);
    toast('Deleted', 'success'); fetchEstimates();
  }

  const inputClass = 'w-full rounded-lg border border-[#E5E5E5] bg-white px-3 py-2.5 text-sm text-[#0A0A0A] placeholder-[#999] focus:border-[#4F46E5] focus:outline-none';

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div><h1 className="text-xl font-semibold text-[#0A0A0A]">Estimates</h1><p className="text-xs text-[#999]">{estimates.length} total</p></div>
        <button onClick={() => setShowForm(!showForm)} className="rounded-lg bg-[#4F46E5] px-4 py-2 text-xs font-medium text-white">{showForm ? 'Cancel' : '+ New Estimate'}</button>
      </div>

      {showForm && (
        <div className="rounded-xl border border-[#E5E5E5] bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">New Estimate</h3>
          <select value={selectedCustomerId} onChange={e => { setSelectedCustomerId(e.target.value); const c = customers.find(c => c.id === e.target.value); if (c) setCustomerName(c.name); }} className={inputClass}>
            <option value="">Select customer...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" className={inputClass} />
          <div className="grid grid-cols-2 gap-2">
            <div><label className="text-[10px] text-[#999]">Date</label><input type="date" value={date} onChange={e => setDate(e.target.value)} className={inputClass} /></div>
            <div><label className="text-[10px] text-[#999]">Valid until</label><input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className={inputClass} /></div>
          </div>
          {items.map((item, i) => (
            <div key={i} className="flex gap-1.5">
              <input value={item.description} onChange={e => { const n = [...items]; n[i].description = e.target.value; setItems(n); }} placeholder="Description" className={inputClass + ' flex-1'} />
              <input type="number" value={item.quantity} onChange={e => { const n = [...items]; n[i].quantity = parseInt(e.target.value) || 0; setItems(n); }} placeholder="Qty" className={inputClass + ' w-16'} />
              <input type="number" value={item.unit_price} onChange={e => { const n = [...items]; n[i].unit_price = parseInt(e.target.value) || 0; setItems(n); }} placeholder="Price" className={inputClass + ' w-24'} />
              {items.length > 1 && <button onClick={() => setItems(items.filter((_, j) => j !== i))} className="text-[#DC2626] text-xs px-1">&times;</button>}
            </div>
          ))}
          <button onClick={() => setItems([...items, { description: '', quantity: 1, unit_price: 0, tax_rate: 0.10 }])} className="text-xs text-[#4F46E5] font-medium">+ Add item</button>
          <div className="flex gap-2">
            {['none', 'percentage', 'fixed'].map(d => (
              <button key={d} onClick={() => setDiscountType(d)} className={`flex-1 rounded-lg border py-1.5 text-[10px] font-medium ${discountType === d ? 'border-[#4F46E5] text-[#4F46E5]' : 'border-[#E5E5E5] text-[#999]'}`}>
                {d === 'none' ? 'No discount' : d === 'percentage' ? '% Off' : '¥ Off'}
              </button>
            ))}
          </div>
          {discountType !== 'none' && <input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} placeholder={discountType === 'percentage' ? '% off' : '¥ off'} className={inputClass} />}
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" rows={2} className={inputClass} />
          <div className="flex justify-between text-sm border-t pt-3"><span className="text-[#999]">Total</span><span className="font-semibold font-mono">{formatCurrency(total, currency)}</span></div>
          <button onClick={handleSave} disabled={saving || !customerName.trim()} className="w-full rounded-lg bg-[#4F46E5] py-2.5 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving...' : 'Create Estimate'}</button>
        </div>
      )}

      {loading ? <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-2 border-[#4F46E5] border-t-transparent" /></div>
      : estimates.length === 0 ? <div className="rounded-xl border border-dashed border-[#E5E5E5] p-8 text-center"><p className="text-sm text-[#999]">No estimates yet</p></div>
      : <div className="space-y-2">{estimates.map(est => (
          <div key={est.id} className="rounded-xl border border-[#E5E5E5] bg-white p-4">
            <div className="flex items-center justify-between mb-2">
              <div><p className="text-sm font-medium">{est.customer_name}</p><p className="text-[10px] text-[#999]">{est.estimate_number} &middot; {formatDate(est.date)}</p></div>
              <div className="text-right"><p className="text-sm font-mono font-medium">{formatCurrency(est.total, currency)}</p><span className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-medium ${statusColors[est.status] || ''}`}>{est.status}</span></div>
            </div>
            <div className="flex gap-1.5 mt-3">
              {est.status === 'draft' && <button onClick={() => sendEstimate(est)} className="flex-1 rounded-md bg-[#4F46E5] py-1.5 text-[10px] font-medium text-white">Send</button>}
              {['sent', 'approved'].includes(est.status) && !est.converted_invoice_id && <button onClick={() => convertToInvoice(est)} className="flex-1 rounded-md bg-[#16A34A] py-1.5 text-[10px] font-medium text-white">&rarr; Invoice</button>}
              <button onClick={() => duplicateEstimate(est)} className="rounded-md border border-[#E5E5E5] px-3 py-1.5 text-[10px] text-[#666]">Duplicate</button>
              <button onClick={() => deleteEstimate(est.id)} className="rounded-md border border-[#E5E5E5] px-3 py-1.5 text-[10px] text-[#DC2626]">Delete</button>
            </div>
          </div>
        ))}</div>}
    </div>
  );
}
