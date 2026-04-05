'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { useAuth } from '@/lib/auth-context';
import { useI18n } from '@/lib/i18n';
import { useToast } from '@/components/ui/Toast';
import { useDelight } from '@/contexts/DelightContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import AIInvoiceHelper from '@/components/AIInvoiceHelper';
import PageHeader from '@/components/PageHeader';
import { TEMPLATES } from '@/components/InvoiceTemplates';
import type { InvoiceData } from '@/components/InvoiceTemplates';
import type { Customer, InvoiceLineItem, ItemTemplate, InvoiceStatus } from '@/types/database';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let html2pdf: any = null;
if (typeof window !== 'undefined') {
  import('html2pdf.js').then((mod) => { html2pdf = mod.default; });
}

const TAX_RATES = [
  { label: '10%', value: 0.10 },
  { label: '8%', value: 0.08 },
  { label: '0%', value: 0 },
];

const emptyLineItem = (): InvoiceLineItem => ({
  line_number: 1, description: '', quantity: 1, unit_price: 0,
  tax_rate: 0.10, tax_amount: 0, total_price: 0,
});

function calcLineItem(item: InvoiceLineItem): InvoiceLineItem {
  const lineSubtotal = item.quantity * item.unit_price;
  const discountAmount = item.discount_percent ? Math.round(lineSubtotal * item.discount_percent / 100) : 0;
  const afterDiscount = lineSubtotal - discountAmount;
  const tax_amount = Math.round(afterDiscount * item.tax_rate);
  return { ...item, tax_amount, total_price: afterDiscount + tax_amount };
}

export default function NewInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const { organization, user } = useAuth();
  const { t } = useI18n();
  const { toast } = useToast();
  const { trigger: triggerDelight } = useDelight();
  const [supabase] = useState(() => createClient());
  const currency = organization.currency || 'JPY';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const org = organization as any;

  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [invoiceType, setInvoiceType] = useState('commercial');
  const [transportFields, setTransportFields] = useState({ vessel: '', port_loading: '', port_discharge: '', shipping_terms: 'FOB', container_no: '', bill_of_lading: '' });

  // Customer
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomer, setShowNewCustomer] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', company: '', phone: '', email: '', address: '', fax: '' });

  // Details
  const [invoiceDate, setInvoiceDate] = useState(formatDate(new Date().toISOString()));
  const [dueDate, setDueDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 30); return formatDate(d.toISOString()); });
  const [invoiceLang, setInvoiceLang] = useState('ja');
  const [invoiceNotes, setInvoiceNotes] = useState('');

  // Line Items
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([calcLineItem(emptyLineItem())]);
  const [templates, setTemplates] = useState<ItemTemplate[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const touchStartX = useRef(0);
  const [swipingIdx, setSwipingIdx] = useState<number | null>(null);

  // Bank
  const [bankName, setBankName] = useState((org.bank_name as string) || '');
  const [bankBranch, setBankBranch] = useState((org.bank_branch as string) || '');
  const [bankAccountName, setBankAccountName] = useState((org.bank_account_name as string) || '');
  const [bankAccountNumber, setBankAccountNumber] = useState((org.bank_account_number as string) || '');
  const [bankAccountType, setBankAccountType] = useState((org.bank_account_type as string) || 'Futsu');
  const [paymentMethod, setPaymentMethod] = useState((org.default_payment_method as string) || 'bank_transfer');
  const [disclaimer, setDisclaimer] = useState((org.invoice_disclaimer as string) || '');
  const [tNumber, setTNumber] = useState((org.t_number as string) || '');

  // Discount
  const [discountType, setDiscountType] = useState<'none' | 'percent' | 'fixed'>('none');
  const [discountValue, setDiscountValue] = useState(0);
  const [editOriginalStatus, setEditOriginalStatus] = useState<InvoiceStatus | null>(null);
  const [saving, setSaving] = useState(false);

  // Attachments
  const [attachments, setAttachments] = useState<{name: string; url: string; type: string}[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // UI
  const [showTemplatePicker, setShowTemplatePicker] = useState(!editId);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [customColumns, setCustomColumns] = useState<string[]>((org.custom_invoice_columns as string[]) || []);
  const [showAddColumn, setShowAddColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [cycleItems, setCycleItems] = useState<{ name: string; purchase_price: number; sale_price: number; category: string }[]>([]);

  // Computed
  const itemDiscountTotal = lineItems.reduce((s, i) => { const ls = i.quantity * i.unit_price; return s + (i.discount_percent ? Math.round(ls * i.discount_percent / 100) : 0); }, 0);
  const subtotal = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const afterItemDiscounts = subtotal - itemDiscountTotal;
  const rawOverallDiscount = discountType === 'percent' ? Math.round(afterItemDiscounts * discountValue / 100) : discountType === 'fixed' ? discountValue : 0;
  const overallDiscountAmount = Math.min(rawOverallDiscount, afterItemDiscounts);
  const afterAllDiscounts = Math.max(0, afterItemDiscounts - overallDiscountAmount);
  const lineTaxTotal = lineItems.reduce((s, i) => s + i.tax_amount, 0);
  const taxReductionRatio = subtotal > 0 && overallDiscountAmount > 0 ? (afterAllDiscounts + itemDiscountTotal) / subtotal : 1;
  const taxTotal = overallDiscountAmount > 0 ? Math.round(lineTaxTotal * taxReductionRatio) : lineTaxTotal;
  const grandTotal = afterAllDiscounts + taxTotal;
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
  const filteredCustomers = customerSearch ? customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.email && c.email.toLowerCase().includes(customerSearch.toLowerCase()))) : customers;

  async function addCustomColumn() {
    if (!newColumnName.trim()) return;
    const updated = [...new Set([...customColumns, newColumnName.trim()])];
    setCustomColumns(updated);
    const { error } = await supabase.from('organizations').update({ custom_invoice_columns: updated }).eq('id', organization.id);
    if (error) toast('Failed to save column', 'error');
    setNewColumnName(''); setShowAddColumn(false);
  }

  // Fetch
  const fetchData = useCallback(async () => {
    const [custRes, tplRes, cycleRes] = await Promise.all([
      supabase.from('customers').select('*').eq('organization_id', organization.id).order('name'),
      supabase.from('item_templates').select('*').eq('organization_id', organization.id).order('name'),
      supabase.from('cycle_items').select('name, purchase_price, sale_price, category').eq('organization_id', organization.id).eq('status', 'active'),
    ]);
    setCustomers(custRes.data || []); setTemplates(tplRes.data || []); setCycleItems(cycleRes.data || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organization.id]);
  useEffect(() => { fetchData(); }, [fetchData]);

  // Edit mode
  useEffect(() => {
    if (!editId || !organization.id) return;
    async function loadInvoice() {
      const { data: inv } = await supabase.from('invoices').select('*').eq('id', editId).eq('organization_id', organization.id).single();
      if (!inv) return;
      const { data: items } = await supabase.from('invoice_items').select('*').eq('invoice_id', editId).order('line_number', { ascending: true });
      setEditOriginalStatus(inv.status);
      if (inv.discount_type) setDiscountType(inv.discount_type);
      if (inv.discount_value) setDiscountValue(inv.discount_value);
      setSelectedTemplate(inv.template || 'classic'); setInvoiceType(inv.invoice_type || 'commercial');
      setSelectedCustomerId(inv.customer_id); setCustomerSearch(inv.customer_name || '');
      setInvoiceDate(inv.created_at ? formatDate(inv.created_at) : invoiceDate);
      setInvoiceNotes(inv.notes || ''); setInvoiceLang(inv.language || 'ja');
      setBankName(inv.bank_name ?? ''); setBankBranch(inv.bank_branch ?? '');
      setBankAccountName(inv.bank_account_name ?? ''); setBankAccountNumber(inv.bank_account_number ?? '');
      setBankAccountType(inv.bank_account_type ?? 'Futsu'); setPaymentMethod(inv.payment_method ?? 'bank_transfer');
      setDisclaimer(inv.disclaimer ?? '');
      if (inv.invoice_type === 'transport') setTransportFields({ vessel: inv.vessel || '', port_loading: inv.port_loading || '', port_discharge: inv.port_discharge || '', shipping_terms: inv.shipping_terms || 'FOB', container_no: inv.container_no || '', bill_of_lading: inv.bill_of_lading || '' });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (items && items.length > 0) setLineItems(items.map((item: any) => calcLineItem({ line_number: item.line_number, description: item.description, quantity: item.quantity, unit_price: item.unit_price, tax_rate: item.tax_rate, tax_amount: 0, total_price: 0, chassis_no: item.chassis_no || undefined, discount_percent: item.discount_percent || 0 })));
      if (inv.attachments && Array.isArray(inv.attachments)) setAttachments(inv.attachments);
      setShowTemplatePicker(false);
    }
    loadInvoice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, organization.id]);

  // Import from estimate
  const fromEstimate = searchParams.get('from_estimate');
  useEffect(() => {
    if (!fromEstimate || !organization.id) return;
    async function loadEstimate() {
      const { data: est } = await supabase.from('estimates').select('*').eq('id', fromEstimate).eq('organization_id', organization.id).single();
      if (!est) return;
      setSelectedCustomerId(est.customer_id); setCustomerSearch(est.customer_name || ''); setInvoiceNotes(est.notes || '');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (est.items && Array.isArray(est.items)) setLineItems(est.items.map((item: any, i: number) => calcLineItem({ ...emptyLineItem(), line_number: i + 1, description: item.description || '', quantity: item.quantity || 1, unit_price: item.unit_price || 0, discount_percent: item.discount_percent || 0 })));
      setShowTemplatePicker(false);
    }
    loadEstimate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromEstimate, organization.id]);

  // Import from time
  const fromTime = searchParams.get('from_time');
  const [importedTimeEntryIds, setImportedTimeEntryIds] = useState<string[]>([]);
  useEffect(() => {
    if (fromTime !== 'unbilled' || !organization.id) return;
    async function loadTimeEntries() {
      const { data: entries } = await supabase.from('time_entries').select('*').eq('organization_id', organization.id).eq('is_billable', true).eq('is_invoiced', false).order('date', { ascending: true });
      if (!entries || entries.length === 0) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setImportedTimeEntryIds(entries.map((e: any) => e.id));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setLineItems(entries.map((entry: any, i: number) => calcLineItem({ ...emptyLineItem(), line_number: i + 1, description: `${entry.description || 'Time entry'} (${Math.round(entry.duration_minutes / 60 * 10) / 10}h)`, quantity: Math.round(entry.duration_minutes / 60 * 100) / 100, unit_price: entry.hourly_rate || 0 })));
      setShowTemplatePicker(false);
    }
    loadTimeEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromTime, organization.id]);

  // Helpers
  async function handleSaveCustomer() {
    if (!newCustomer.name.trim()) return;
    setSavingCustomer(true);
    const { data, error } = await supabase.from('customers').insert({ organization_id: organization.id, name: newCustomer.name.trim(), address: [newCustomer.company, newCustomer.address].filter(Boolean).join('\n'), phone: newCustomer.phone, email: newCustomer.email, notes: newCustomer.fax ? `FAX: ${newCustomer.fax}` : null }).select().single();
    setSavingCustomer(false);
    if (error) toast(error.message, 'error');
    else if (data) { setCustomers(prev => [...prev, data]); setSelectedCustomerId(data.id); setShowNewCustomer(false); setNewCustomer({ name: '', company: '', phone: '', email: '', address: '', fax: '' }); setCustomerSearch(data.name); toast('Customer saved', 'success'); }
  }

  function updateLineItem(idx: number, field: keyof InvoiceLineItem, value: string | number) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLineItems(prev => { const u = [...prev]; (u[idx] as any)[field] = value; u[idx] = calcLineItem(u[idx]); return u; });
  }
  function removeLineItem(idx: number) { setLineItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx).map((item, i) => ({ ...item, line_number: i + 1 }))); }
  function addLineItem() { setLineItems(prev => [...prev, calcLineItem({ ...emptyLineItem(), line_number: prev.length + 1 })]); }
  function addFromTemplate(tpl: ItemTemplate) { setLineItems(prev => [...prev, calcLineItem({ line_number: prev.length + 1, description: tpl.description || tpl.name, quantity: 1, unit_price: tpl.default_price, tax_rate: tpl.default_tax_rate, tax_amount: 0, total_price: 0 })]); setShowTemplates(false); }
  function handleTouchStart(e: React.TouchEvent, idx: number) { touchStartX.current = e.touches[0].clientX; setSwipingIdx(idx); }
  function handleTouchEnd(e: React.TouchEvent, idx: number) { if (touchStartX.current - e.changedTouches[0].clientX > 80) removeLineItem(idx); setSwipingIdx(null); }

  async function handleAttachmentUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const path = `${organization.id}/invoices/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from('documents').upload(path, file);
      if (error) { toast('Upload failed', 'error'); return; }
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(path);
      setAttachments(prev => [...prev, { name: file.name, url: urlData.publicUrl, type: file.type }]);
      toast('Attached!', 'success');
    } catch { toast('Upload failed', 'error'); }
    finally { setUploadingAttachment(false); }
  }

  async function generateInvoiceNumber(): Promise<string> {
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('organization_id', organization.id);
    return `INV/${organization.name?.slice(0, 3).toUpperCase() || 'BIZ'}/${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String((count || 0) + 1).padStart(4, '0')}`;
  }

  async function handleSave(status: InvoiceStatus = editOriginalStatus || 'draft') {
    if (!selectedCustomer) { toast('Please select a customer', 'error'); return; }
    setSaving(true);
    const invoiceNumber = editId ? undefined : await generateInvoiceNumber();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsJson = lineItems.filter(i => i.description).map(i => { const ls = i.quantity * i.unit_price; const disc = i.discount_percent ? Math.round(ls * i.discount_percent / 100) : 0; return { description: i.description, quantity: i.quantity, unit_price: i.unit_price, discount_percent: i.discount_percent || 0, amount: ls - disc, ...customColumns.reduce((acc, col) => ({ ...acc, [col]: (i as any)[col] || '' }), {}) }; });
    const invoicePayload = {
      organization_id: organization.id, ...(invoiceNumber ? { invoice_number: invoiceNumber } : {}),
      customer_id: selectedCustomer.id, customer_name: selectedCustomer.name, customer_address: selectedCustomer.address,
      items: itemsJson, subtotal, tax: taxTotal, total: grandTotal, tax_rate: 0.10, tax_amount: taxTotal, grand_total: grandTotal, notes: invoiceNotes || null,
      ...(paymentMethod === 'bank_transfer' ? { bank_name: bankName || null, bank_branch: bankBranch || null, bank_account_name: bankAccountName || null, bank_account_number: bankAccountNumber || null, bank_account_type: bankAccountType || 'Futsu' } : { bank_name: null, bank_branch: null, bank_account_name: null, bank_account_number: null, bank_account_type: null }),
      payment_method: paymentMethod, disclaimer: disclaimer || null,
      discount_type: discountType !== 'none' ? discountType : null, discount_value: discountType !== 'none' ? discountValue : null, discount_amount: overallDiscountAmount + itemDiscountTotal,
      ...(fromEstimate ? { source_estimate_id: fromEstimate } : {}),
      invoice_prefix: 'INV', template: selectedTemplate, invoice_type: invoiceType,
      ...(invoiceType === 'transport' ? { vessel: transportFields.vessel || null, port_loading: transportFields.port_loading || null, port_discharge: transportFields.port_discharge || null, shipping_terms: transportFields.shipping_terms || null, container_no: transportFields.container_no || null, bill_of_lading: transportFields.bill_of_lading || null } : {}),
      currency, status, language: invoiceLang, created_by: user.id,
      attachments: attachments.length > 0 ? attachments : null,
      ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
    };
    let invoice, error;
    if (editId) { const res = await supabase.from('invoices').update(invoicePayload).eq('id', editId).eq('organization_id', organization.id).select().single(); invoice = res.data; error = res.error; }
    else { const res = await supabase.from('invoices').insert(invoicePayload).select().single(); invoice = res.data; error = res.error; }
    if (error) { setSaving(false); toast(error.message, 'error'); return; }
    if (invoice) {
      if (editId) await supabase.from('invoice_items').delete().eq('invoice_id', invoice.id);
      const dbItems = lineItems.filter(i => i.description).map((i, idx) => ({ organization_id: organization.id, invoice_id: invoice.id, line_number: idx + 1, description: i.description, chassis_no: i.chassis_no || null, quantity: i.quantity, unit_price: i.unit_price, tax_rate: i.tax_rate, tax_amount: i.tax_amount, total_price: i.total_price, discount_percent: i.discount_percent || 0, is_manual_entry: true }));
      if (dbItems.length > 0) { const { error: ie } = await supabase.from('invoice_items').insert(dbItems); if (ie) { toast('Invoice saved but items failed: ' + ie.message, 'error'); setSaving(false); return; } }
    }
    const orgUpdates: Record<string, unknown> = {};
    if (disclaimer !== (org.invoice_disclaimer as string || '')) orgUpdates.invoice_disclaimer = disclaimer || null;
    if (tNumber !== (org.t_number as string || '')) orgUpdates.t_number = tNumber || null;
    if (paymentMethod !== (org.default_payment_method as string || 'bank_transfer')) orgUpdates.default_payment_method = paymentMethod;
    if (Object.keys(orgUpdates).length > 0) await supabase.from('organizations').update(orgUpdates).eq('id', organization.id);
    if (fromTime === 'unbilled' && invoice && importedTimeEntryIds.length > 0 && status !== 'draft') await supabase.from('time_entries').update({ is_invoiced: true, invoice_id: invoice.id }).in('id', importedTimeEntryIds);
    if (fromEstimate && invoice) await supabase.from('estimates').update({ status: 'converted' }).eq('id', fromEstimate).eq('organization_id', organization.id);
    // ─── Trust event: first_invoice ─────────────────────
    if (!editId && invoice) {
      fetch('/api/trust/log-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: 'first_invoice' }),
      }).then(r => r.json()).then(res => {
        if (!res.skipped) triggerDelight({ type: 'first_invoice', points: 3 })
      }).catch(() => {})
    }
    setSaving(false); toast(status === 'draft' ? 'Invoice saved as draft' : 'Invoice sent', 'success'); router.push('/invoices');
  }

  async function handleDownloadPDF() {
    const el = document.getElementById('invoice-preview');
    if (!el || !html2pdf) { toast('PDF engine loading...', 'error'); return; }
    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    await html2pdf().set({ margin: 10, filename: `BizPocket_INV-${prefix}-${invoiceDate.replace(/-/g, '')}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } }).from(el).save();
    toast('PDF downloaded', 'success');
  }

  async function handleShare() {
    const el = document.getElementById('invoice-preview');
    if (!el || !html2pdf) { toast('Could not generate PDF', 'error'); return; }
    const prefix = organization.name?.slice(0, 3).toUpperCase() || 'BIZ';
    const fileName = `BizPocket_INV-${prefix}-${invoiceDate.replace(/-/g, '')}.pdf`;
    const blob: Blob = await html2pdf().set({ margin: 10, filename: fileName, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const } }).from(el).outputPdf('blob');
    const file = new File([blob], fileName, { type: 'application/pdf' });
    if (navigator.share && navigator.canShare({ files: [file] })) { try { await navigator.share({ title: `Invoice — ${selectedCustomer?.name || 'Customer'}`, text: `Invoice from ${organization.name} — ${formatCurrency(grandTotal, currency)}`, files: [file] }); } catch (err) { if ((err as Error).name !== 'AbortError') toast('Share cancelled', 'info'); } }
    else handleDownloadPDF();
  }

  // Live preview data
  const liveInvoiceData: InvoiceData = {
    invoice_number: editId ? 'INV/...' : `INV/${organization.name?.slice(0, 3).toUpperCase() || 'BIZ'}/...`,
    date: invoiceDate, due_date: dueDate, company_name: organization.name || 'Your Business',
    company_address: (org.address as string) || '', company_phone: (org.phone as string) || '', company_email: user?.email || '', t_number: tNumber || undefined,
    bank_name: paymentMethod === 'bank_transfer' ? bankName : undefined, bank_branch: paymentMethod === 'bank_transfer' ? bankBranch : undefined,
    bank_account_name: paymentMethod === 'bank_transfer' ? bankAccountName : undefined, bank_account_number: paymentMethod === 'bank_transfer' ? bankAccountNumber : undefined,
    customer_name: selectedCustomer?.name || 'Customer Name', customer_address: selectedCustomer?.address || '', customer_phone: selectedCustomer?.phone || '',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: lineItems.filter(i => i.description).length > 0 ? lineItems.filter(i => i.description).map(i => ({ description: i.description + customColumns.map(col => (i as any)[col] ? ` | ${col}: ${(i as any)[col]}` : '').join(''), quantity: i.quantity, unit_price: i.unit_price, total: i.total_price })) : [{ description: 'Your items appear here', quantity: 1, unit_price: 0, total: 0 }],
    subtotal, tax_rate: lineItems[0]?.tax_rate || 0.10, tax_amount: taxTotal, grand_total: grandTotal, currency, notes: invoiceNotes || undefined, status: 'draft',
  };

  const TemplateComponent = (TEMPLATES[selectedTemplate] || TEMPLATES.classic).Component;
  const inputClass = "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-[#4F46E5] focus:outline-none focus:ring-1 focus:ring-[#4F46E5]";

  return (
    <>
      <PageHeader title="New Invoice" backPath="/invoices" />
      {/* Template Picker Modal */}
      {showTemplatePicker && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl max-w-[95vw] w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-4">
              <div><h2 className="text-xl font-bold text-white">Choose Your Template</h2><p className="text-sm text-slate-400">Select a template for your invoice</p></div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowTemplatePicker(false)} className="rounded-lg bg-[#4F46E5] px-5 py-2 text-sm font-medium text-white hover:bg-[#4338CA]">Use {TEMPLATES[selectedTemplate]?.name || 'Classic'}</button>
                <button onClick={() => { setShowTemplatePicker(false); router.back(); }} className="text-slate-400 hover:text-white p-1">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Object.entries(TEMPLATES).map(([key, tpl]) => (
                <button key={key} onClick={() => setSelectedTemplate(key)} onDoubleClick={() => { setSelectedTemplate(key); setShowTemplatePicker(false); }}
                  className={`relative rounded-xl border-2 overflow-hidden min-h-[320px] text-left transition-all ${selectedTemplate === key ? 'border-[#4F46E5] ring-2 ring-[#4F46E5]/20' : 'border-slate-700 hover:border-[#CCC]'}`}>
                  <div className="absolute inset-0 origin-top-left pointer-events-none" style={{ transform: 'scale(0.42)', width: '238%', height: '238%' }}>
                    <tpl.Component data={liveInvoiceData} />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900 via-slate-900/95 to-transparent pt-10 pb-3 px-3">
                    <p className="text-sm font-semibold text-white">{tpl.name}</p>
                    <p className="text-[10px] text-slate-400">{tpl.description}</p>
                  </div>
                  {selectedTemplate === key && <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-[#4F46E5] flex items-center justify-center"><svg className="h-3 w-3 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg></div>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Preview Modal */}
      {showMobilePreview && (
        <div className="fixed inset-0 z-50 bg-slate-800 lg:hidden overflow-y-auto">
          <div className="sticky top-0 bg-slate-800 border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Live Preview</h3>
            <button onClick={() => setShowMobilePreview(false)} className="text-sm text-indigo-400 font-medium">Close</button>
          </div>
          <div className="p-4"><div id="invoice-preview-mobile"><TemplateComponent data={liveInvoiceData} /></div></div>
        </div>
      )}

      {/* Split View */}
      <div className="flex gap-4 py-4 -mx-4 lg:-mx-8 px-4 lg:px-8">
        {/* LEFT: Form */}
        <div className="flex-1 min-w-0 space-y-3 lg:max-w-[480px]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{editId ? 'Edit Invoice' : 'Fire New Invoice'}</h1>
              <button onClick={() => setShowTemplatePicker(true)} className="text-xs text-indigo-400 font-medium hover:underline mt-0.5">Template: {TEMPLATES[selectedTemplate]?.name || 'Classic'} — Change</button>
            </div>
            <button onClick={() => router.push('/invoices')} className="text-sm text-slate-400">Cancel</button>
          </div>

          {/* Customer */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2.5">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Customer</h3>
            <div className="relative">
              <input value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Search or type customer name..." className={inputClass + ' pl-9'} />
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            </div>
            {customerSearch && !selectedCustomer && filteredCustomers.length > 0 && (
              <div className="max-h-[160px] overflow-y-auto rounded-lg border border-slate-700 divide-y divide-[#F0F0F0]">
                {filteredCustomers.map(c => (<button key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className="w-full px-3 py-2 text-left hover:bg-slate-800"><p className="text-sm font-medium text-white">{c.name}</p>{c.email && <p className="text-[10px] text-slate-400">{c.email}</p>}</button>))}
              </div>
            )}
            {selectedCustomer && (
              <div className="flex items-center justify-between rounded-lg bg-[#4F46E5]/5 border border-[#4F46E5]/20 px-3 py-2">
                <div><p className="text-sm font-medium text-white">{selectedCustomer.name}</p>{selectedCustomer.email && <p className="text-[10px] text-slate-400">{selectedCustomer.email}</p>}</div>
                <button onClick={() => { setSelectedCustomerId(null); setCustomerSearch(''); }} className="text-[10px] text-[#DC2626]">Change</button>
              </div>
            )}
            <button onClick={() => setShowNewCustomer(!showNewCustomer)} className="text-xs text-indigo-400 font-medium">{showNewCustomer ? 'Cancel' : '+ Add New Customer'}</button>
            {showNewCustomer && (
              <div className="space-y-2 border-t border-[var(--border)] pt-2">
                <input value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} placeholder="Name *" className={inputClass} />
                <input value={newCustomer.company} onChange={e => setNewCustomer({...newCustomer, company: e.target.value})} placeholder="Company" className={inputClass} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} placeholder="Email" className={inputClass} />
                  <input value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} placeholder="Phone" className={inputClass} />
                </div>
                <input value={newCustomer.address} onChange={e => setNewCustomer({...newCustomer, address: e.target.value})} placeholder="Address" className={inputClass} />
                <button onClick={handleSaveCustomer} disabled={savingCustomer} className="w-full rounded-lg bg-[#0A0A0A] py-2 text-xs font-medium text-white disabled:opacity-50">{savingCustomer ? 'Saving...' : 'Save Customer'}</button>
              </div>
            )}
            <div className="border-t border-[var(--border)] pt-2.5 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] text-slate-400">Issue Date</label><input type="date" value={invoiceDate} onChange={e => setInvoiceDate(e.target.value)} className={inputClass} /></div>
                <div><label className="text-[10px] text-slate-400">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className={inputClass} /></div>
              </div>
              <div>
                <label className="text-[10px] text-slate-400">Language</label>
                <div className="flex gap-1.5 mt-1">{[{k:'en',l:'EN'},{k:'ja',l:'JP'},{k:'ur',l:'UR'},{k:'ar',l:'AR'},{k:'zh',l:'CN'}].map(({k,l}) => (<button key={k} onClick={() => setInvoiceLang(k)} className={`rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors ${invoiceLang === k ? 'bg-[#4F46E5] text-white' : 'border border-slate-700 text-slate-400'}`}>{l}</button>))}</div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Items</h3>
              {(templates.length > 0 || cycleItems.length > 0) && <button onClick={() => setShowTemplates(!showTemplates)} className="text-[10px] text-indigo-400 font-medium">From Saved</button>}
            </div>
            {showTemplates && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {templates.map(tpl => (<button key={tpl.id} onClick={() => addFromTemplate(tpl)} className="shrink-0 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] hover:bg-slate-800">{tpl.name} — {formatCurrency(tpl.default_price, currency)}</button>))}
                {cycleItems.map((ci, i) => (<button key={`ci-${i}`} onClick={() => { setLineItems(prev => [...prev, calcLineItem({ ...emptyLineItem(), line_number: prev.length + 1, description: ci.name, unit_price: ci.sale_price || ci.purchase_price || 0 })]); }} className="shrink-0 rounded-lg border border-[#4F46E5]/20 bg-[#4F46E5]/5 px-2.5 py-1.5 text-[10px] text-indigo-400">{ci.name}</button>))}
              </div>
            )}
            {lineItems.map((item, i) => (
              <div key={i} className="space-y-1.5 pb-3 border-b border-[var(--border)] last:border-0 last:pb-0" onTouchStart={e => handleTouchStart(e, i)} onTouchEnd={e => handleTouchEnd(e, i)}>
                <input value={item.description} onChange={e => updateLineItem(i, 'description', e.target.value)} placeholder="Item description" className={inputClass} />
                {customColumns.length > 0 && (
                  <div className="flex gap-1.5">
                    {customColumns.map(col => (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      <input key={col} placeholder={col} value={(item as any)[col] || ''} onChange={e => { const u = [...lineItems]; (u[i] as any)[col] = e.target.value; setLineItems(u); }} className={inputClass + ' flex-1'} />
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-12 gap-1.5 items-center">
                  <div className="col-span-2"><input type="number" inputMode="numeric" value={item.quantity} onChange={e => updateLineItem(i, 'quantity', parseInt(e.target.value) || 0)} placeholder="Qty" className={inputClass} /></div>
                  <div className="col-span-5"><input type="number" inputMode="numeric" value={item.unit_price || ''} onChange={e => updateLineItem(i, 'unit_price', parseInt(e.target.value) || 0)} placeholder="Price" className={inputClass} /></div>
                  <div className="col-span-2"><select value={item.tax_rate} onChange={e => updateLineItem(i, 'tax_rate', parseFloat(e.target.value))} className={inputClass + ' text-[10px]'}>{TAX_RATES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}</select></div>
                  <div className="col-span-3 text-right"><p className="font-mono text-sm font-semibold text-white">{formatCurrency(item.total_price, currency)}</p></div>
                </div>
                {lineItems.length > 1 && <button onClick={() => removeLineItem(i)} className="text-[10px] text-[#DC2626]">Remove</button>}
              </div>
            ))}
            <div className="flex items-center gap-4 pt-1">
              <button onClick={addLineItem} className="text-xs text-indigo-400 font-medium">+ Add Item</button>
              <button onClick={() => setShowAddColumn(!showAddColumn)} className="text-xs text-[#F59E0B] font-medium">+ Add Column</button>
              <label className="text-xs text-[#0EA5E9] font-medium cursor-pointer">
                + Attach Photo/File
                <input type="file" className="hidden" accept="image/*,.pdf,.doc,.docx" onChange={handleAttachmentUpload} disabled={uploadingAttachment} />
              </label>
              {uploadingAttachment && <span className="text-[10px] text-slate-400">Uploading...</span>}
            </div>
            {attachments.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {attachments.map((att, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1">
                    {att.type.startsWith('image/') ? (
                      <img src={att.url} alt={att.name} className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <svg className="h-4 w-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"/></svg>
                    )}
                    <span className="text-[10px] text-slate-400 max-w-[80px] truncate">{att.name}</span>
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))} className="text-[10px] text-[#DC2626]">✕</button>
                  </div>
                ))}
              </div>
            )}
            {customColumns.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[9px] text-slate-400">Custom:</span>
                {customColumns.map(col => (
                  <button key={col} onClick={() => { const u = customColumns.filter(c => c !== col); setCustomColumns(u); supabase.from('organizations').update({ custom_invoice_columns: u }).eq('id', organization.id); }}
                    className="rounded-full bg-[#F59E0B]/10 border border-[#F59E0B]/20 px-2.5 py-0.5 text-[10px] font-medium text-[#92400E] hover:bg-[#F59E0B]/20">{col} ✕</button>
                ))}
              </div>
            )}
            {showAddColumn && (
              <div className="flex gap-2">
                <input value={newColumnName} onChange={e => setNewColumnName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomColumn(); }}}
                  placeholder="Column name (e.g. Chassis #, Color, Model)" className={inputClass + ' flex-1'} autoFocus />
                <button onClick={addCustomColumn} className="rounded-lg bg-[#4F46E5] px-3 py-2 text-xs text-white">Add</button>
              </div>
            )}
            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex gap-1.5 mb-2">{(['none','percent','fixed'] as const).map(d => (<button key={d} onClick={() => setDiscountType(d)} className={`rounded-md px-2.5 py-1 text-[10px] font-medium ${discountType === d ? 'bg-[#4F46E5] text-white' : 'border border-slate-700 text-slate-400'}`}>{d === 'none' ? 'No discount' : d === 'percent' ? '% Off' : currency + ' Off'}</button>))}</div>
              {discountType !== 'none' && <input type="number" value={discountValue || ''} onChange={e => setDiscountValue(parseInt(e.target.value) || 0)} placeholder={discountType === 'percent' ? 'Discount %' : 'Discount amount'} className={inputClass} />}
            </div>
            <div className="border-t border-[var(--border)] pt-3 space-y-1">
              <div className="flex justify-between text-sm text-slate-400"><span>Subtotal</span><span className="font-mono">{formatCurrency(subtotal, currency)}</span></div>
              {overallDiscountAmount > 0 && <div className="flex justify-between text-sm text-[#16A34A]"><span>Discount</span><span className="font-mono">-{formatCurrency(overallDiscountAmount, currency)}</span></div>}
              <div className="flex justify-between text-sm text-slate-400"><span>Tax</span><span className="font-mono">{formatCurrency(taxTotal, currency)}</span></div>
              <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-[#0A0A0A]"><span>Total</span><span className="font-mono">{formatCurrency(grandTotal, currency)}</span></div>
            </div>
          </div>

          {/* Payment & Notes */}
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-3 space-y-3">
            <h3 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Payment & Notes</h3>
            <div className="flex gap-1.5">
              {[{k:'bank_transfer',l:'Bank Transfer'},{k:'cash',l:'Cash'},{k:'credit_card',l:'Card'}].map(({k,l}) => (
                <button key={k} onClick={() => setPaymentMethod(k)} className={`flex-1 rounded-md py-2 text-[11px] font-medium transition-colors ${paymentMethod === k ? 'bg-[#4F46E5] text-white' : 'border border-slate-700 text-slate-400'}`}>{l}</button>
              ))}
            </div>
            {paymentMethod === 'bank_transfer' && (
              <div className="space-y-2 rounded-lg bg-slate-800 p-3">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Bank Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Bank name" className={inputClass} />
                  <input value={bankBranch} onChange={e => setBankBranch(e.target.value)} placeholder="Branch" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input value={bankAccountName} onChange={e => setBankAccountName(e.target.value)} placeholder="Account holder name" className={inputClass} />
                  <input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} placeholder="Account number" className={inputClass} />
                </div>
                <select value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} className={inputClass}>
                  <option value="Futsu">Futsu (普通)</option>
                  <option value="Touza">Touza (当座)</option>
                  <option value="Savings">Savings</option>
                  <option value="Checking">Checking</option>
                </select>
                <div className="flex items-center gap-2 pt-1">
                  <button type="button" onClick={() => {
                    const field = prompt('Add payment field (e.g. SWIFT Code, IBAN, Routing Number, ACH):');
                    if (field) setInvoiceNotes(prev => prev ? prev + '\n' + field + ': ' : field + ': ');
                  }} className="text-[10px] text-indigo-400 font-medium">+ Add SWIFT / IBAN / ACH</button>
                </div>
              </div>
            )}
            <div>
              <label className="text-[10px] text-slate-400">T-Number (インボイス制度)</label>
              <input type="text" value={tNumber} onChange={e => setTNumber(e.target.value)} placeholder="T1234567890123" className={inputClass} />
            </div>
            <div className="space-y-2">
              <textarea value={invoiceNotes} onChange={e => setInvoiceNotes(e.target.value)} placeholder="Notes (optional)" rows={2} className={inputClass} />
              <textarea value={disclaimer} onChange={e => setDisclaimer(e.target.value)} placeholder="Disclaimer / Policy (saved for future invoices)" rows={2} className={inputClass} />
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <div className="flex gap-2">
              {editId && editOriginalStatus === 'paid' ? (
                <button onClick={() => handleSave()} disabled={saving} className="flex-1 rounded-xl bg-[#4F46E5] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
              ) : (
                <>
                  <button onClick={() => handleSave('draft')} disabled={saving} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-sm font-medium text-slate-400 disabled:opacity-50">{saving ? 'Saving...' : 'Save for Later'}</button>
                  <button onClick={() => handleSave('sent')} disabled={saving} className="flex-1 rounded-xl bg-[#4F46E5] py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Sending...' : 'Send to Client'}</button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={handleDownloadPDF} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-medium text-slate-400">Download PDF</button>
              <button onClick={handleShare} className="flex-1 rounded-xl border border-slate-700 py-2.5 text-xs font-medium text-slate-400">Share Link</button>
            </div>
          </div>
        </div>

        {/* RIGHT: Live Preview (desktop) */}
        <div className="hidden lg:block flex-1 shrink-0">
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.1em]">Live Preview</p>
              <button onClick={() => setShowTemplatePicker(true)} className="text-[10px] text-indigo-400 font-medium">Change Template</button>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-800 overflow-hidden shadow-sm">
              <div id="invoice-preview" className="origin-top-left h-full" style={{ transform: 'scale(0.85)', width: '118%', transformOrigin: 'top left' }}>
                <TemplateComponent data={liveInvoiceData} />
              </div>
            </div>
            {disclaimer && <div className="mt-2 rounded-lg bg-[#F5F5F5] px-3 py-2 text-[9px] text-slate-400">{disclaimer}</div>}
          </div>
        </div>
      </div>

      {/* Mobile: Floating preview button */}
      <button onClick={() => setShowMobilePreview(true)} className="fixed bottom-24 right-4 z-30 lg:hidden flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-4 py-2.5 text-xs font-medium text-white shadow-lg">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>
        Preview
      </button>

      <AIInvoiceHelper onSuggestion={(data) => {
        if (data.items) { const ni = data.items.map((item, i) => calcLineItem({ ...emptyLineItem(), line_number: lineItems.length + i + 1, description: item.description, quantity: item.quantity, unit_price: item.unit_price })); setLineItems(prev => [...prev, ...ni]); }
        if (data.disclaimer) setDisclaimer(data.disclaimer);
        if (data.payment_method) setPaymentMethod(data.payment_method);
        if (data.notes) setInvoiceNotes(data.notes);
        if (data.customer_name) setCustomerSearch(data.customer_name);
      }} />
    </>
  );
}
